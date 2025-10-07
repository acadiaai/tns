package services

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"therapy-navigation-system/internal/logger"
	"therapy-navigation-system/internal/repository"

	"github.com/sirupsen/logrus"
	"google.golang.org/genai"
)

// ExtractionAttempt represents a single extraction attempt
type ExtractionAttempt struct {
	SessionID      string                 `json:"session_id"`
	Timestamp      time.Time              `json:"timestamp"`
	Phase          string                 `json:"phase"`
	UserMessage    string                 `json:"user_message"`
	CoachContext   string                 `json:"coach_context"`
	RequiredFields []string               `json:"required_fields"`
	Prompt         string                 `json:"prompt"`
	RawResponse    string                 `json:"raw_response"`
	ExtractedData  map[string]interface{} `json:"extracted_data"`
	NormalizedData map[string]interface{} `json:"normalized_data"`
}

// ExtractionHistory stores extraction attempts in memory
var (
	extractionHistory = make(map[string][]ExtractionAttempt) // sessionID -> attempts
	historyMutex      sync.RWMutex
)

// GetExtractionHistory returns all extraction attempts for a session
func GetExtractionHistory(sessionID string) []ExtractionAttempt {
	historyMutex.RLock()
	defer historyMutex.RUnlock()
	return extractionHistory[sessionID]
}

// DataExtractor extracts structured data from conversation turns
type DataExtractor struct {
	geminiService *GeminiService
}

// NewDataExtractor creates a new data extractor
func NewDataExtractor(geminiService *GeminiService) *DataExtractor {
	return &DataExtractor{
		geminiService: geminiService,
	}
}

// ExtractDataFromTurn analyzes a conversation turn and extracts required data
func (e *DataExtractor) ExtractDataFromTurn(
	ctx context.Context,
	sessionID string,
	userMessage string,
	coachResponse string,
	currentPhase string,
	phaseState string, // "pre_wait", "post_wait", or "" for non-timed phases
) (map[string]interface{}, error) {
	// Get required fields for current phase, filtered by phase_state
	var requiredFields []repository.PhaseData
	query := repository.DB.Where("phase_id = ? AND required = ?", currentPhase, true)
	if phaseState != "" {
		// For timed_waiting phases, only get fields matching the phase_state
		query = query.Where("phase_state = ? OR phase_state IS NULL OR phase_state = ''", phaseState)
	} else {
		// For non-timed phases, exclude fields with phase_state
		query = query.Where("phase_state IS NULL OR phase_state = ''")
	}
	if err := query.Find(&requiredFields).Error; err != nil {
		return nil, fmt.Errorf("failed to get required fields: %w", err)
	}

	logger.AppLogger.WithFields(logrus.Fields{
		"session_id":       sessionID,
		"phase":            currentPhase,
		"phase_state":      phaseState,
		"required_count":   len(requiredFields),
		"required_fields":  requiredFields,
	}).Info("[EXTRACTOR] DEBUG: Query returned required fields")

	if len(requiredFields) == 0 {
		// No requirements for this phase
		logger.AppLogger.WithFields(logrus.Fields{
			"session_id":  sessionID,
			"phase":       currentPhase,
			"phase_state": phaseState,
		}).Warn("[EXTRACTOR] DEBUG: No required fields found for this phase/state!")
		return map[string]interface{}{}, nil
	}

	// Filter out already-collected fields to prevent overwrites
	var collectedFields []repository.SessionFieldValue
	repository.DB.Where("session_id = ?", sessionID).Find(&collectedFields)

	collectedMap := make(map[string]bool)
	for _, cf := range collectedFields {
		// Check if this field belongs to current phase
		for _, rf := range requiredFields {
			if cf.FieldName == rf.Name {
				collectedMap[cf.FieldName] = true
				break
			}
		}
	}

	// Filter to only missing required fields
	var missingFields []repository.PhaseData
	for _, field := range requiredFields {
		if !collectedMap[field.Name] {
			missingFields = append(missingFields, field)
		}
	}

	if len(missingFields) == 0 {
		logger.AppLogger.WithFields(logrus.Fields{
			"session_id": sessionID,
			"phase":      currentPhase,
		}).Info("[EXTRACTOR] All required fields already collected, skipping extraction")
		return map[string]interface{}{}, nil
	}

	logger.AppLogger.WithFields(logrus.Fields{
		"session_id":     sessionID,
		"phase":          currentPhase,
		"missing_count":  len(missingFields),
		"total_required": len(requiredFields),
	}).Info("[EXTRACTOR] Starting data extraction for missing fields only")

	// Use LLM extraction for missing fields only (prevents overwrites)
	extracted, prompt, rawResponse, err := e.llmExtraction(ctx, missingFields, userMessage, coachResponse)
	if err != nil {
		logger.AppLogger.WithError(err).Error("[EXTRACTOR] LLM extraction failed")
		return map[string]interface{}{}, nil // Don't fail the conversation
	}

	// Normalize extracted values using extractor_hints from schema
	normalized := e.normalizeExtractedData(extracted, missingFields)

	logger.AppLogger.WithFields(logrus.Fields{
		"session_id": sessionID,
		"extracted":  extracted,
		"normalized": normalized,
		"method":     "llm",
	}).Info("[EXTRACTOR] LLM extraction succeeded")

	// Record this extraction attempt
	fieldNames := make([]string, len(missingFields))
	for i, f := range missingFields {
		fieldNames[i] = f.Name
	}

	attempt := ExtractionAttempt{
		SessionID:      sessionID,
		Timestamp:      time.Now(),
		Phase:          currentPhase,
		UserMessage:    userMessage,
		CoachContext:   coachResponse,
		RequiredFields: fieldNames,
		Prompt:         prompt,
		RawResponse:    rawResponse,
		ExtractedData:  extracted,
		NormalizedData: normalized,
	}

	historyMutex.Lock()
	extractionHistory[sessionID] = append(extractionHistory[sessionID], attempt)
	historyMutex.Unlock()

	return normalized, nil
}

// ruleBasedExtraction uses simple regex/pattern matching for common fields
func (e *DataExtractor) ruleBasedExtraction(
	requiredFields []repository.PhaseData,
	userMessage string,
	coachResponse string,
) map[string]interface{} {
	extracted := make(map[string]interface{})

	for _, field := range requiredFields {
		switch field.Name {
		case "consent_given":
			// Only match explicit consent phrases
			if regexp.MustCompile(`(?i)\b(yes,?\s+i\s+consent|i\s+consent|i\s+agree)\b`).MatchString(userMessage) {
				extracted["consent_given"] = true
			}

		case "issue_intensity", "suds_level", "suds_current":
			// Match numbers 0-10
			re := regexp.MustCompile(`\b([0-9]|10)\b`)
			if matches := re.FindStringSubmatch(userMessage); len(matches) > 0 {
				if num, err := strconv.Atoi(matches[1]); err == nil && num >= 0 && num <= 10 {
					extracted[field.Name] = num
				}
			}

		case "selected_issue":
			// Look for issue descriptions after certain patterns
			// "struggling with X", "anxiety about X", "problem with X"
			patterns := []string{
				`struggling with (.+?)(?:\.|,|$)`,
				`anxiety (?:about|at|with) (.+?)(?:\.|,|$)`,
				`(?:problem|issue|trouble) (?:with|about) (.+?)(?:\.|,|$)`,
			}
			for _, pattern := range patterns {
				re := regexp.MustCompile(`(?i)` + pattern)
				if matches := re.FindStringSubmatch(userMessage); len(matches) > 1 {
					extracted["selected_issue"] = strings.TrimSpace(matches[1])
					break
				}
			}

		// Add more rule-based extractions as needed
		}
	}

	return extracted
}

// llmExtraction uses LLM to extract complex data
// Returns: extracted data, prompt, raw response, error
func (e *DataExtractor) llmExtraction(
	ctx context.Context,
	requiredFields []repository.PhaseData,
	userMessage string,
	coachResponse string,
) (map[string]interface{}, string, string, error) {
	prompt := e.buildExtractionPrompt(requiredFields, userMessage, coachResponse)

	logger.AppLogger.WithField("prompt", prompt).Info("[EXTRACTOR] LLM extraction prompt")

	content := &genai.Content{
		Parts: []*genai.Part{{Text: prompt}},
		Role:  "user",
	}

	resp, err := e.geminiService.GetClient().Models.GenerateContent(
		ctx,
		"gemini-2.0-flash", // Use fast model for extraction
		[]*genai.Content{content},
		&genai.GenerateContentConfig{
			Temperature: genai.Ptr(float32(0.0)), // Deterministic extraction
		},
	)

	if err != nil {
		return nil, prompt, "", err
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, prompt, "", fmt.Errorf("no response from LLM")
	}

	responseText := resp.Candidates[0].Content.Parts[0].Text
	rawResponse := responseText // Keep original for logging

	logger.AppLogger.WithField("response", responseText).Info("[EXTRACTOR] LLM extraction response")

	// Strip markdown code fences if present (Gemini sometimes wraps JSON in ```json ... ```)
	responseText = strings.TrimSpace(responseText)
	responseText = strings.TrimPrefix(responseText, "```json")
	responseText = strings.TrimPrefix(responseText, "```")
	responseText = strings.TrimSuffix(responseText, "```")
	responseText = strings.TrimSpace(responseText)

	// Parse JSON response
	var extracted map[string]interface{}
	if err := json.Unmarshal([]byte(responseText), &extracted); err != nil {
		logger.AppLogger.WithFields(logrus.Fields{
			"response": responseText,
			"error":    err.Error(),
		}).Error("[EXTRACTOR] Failed to parse JSON response")
		return nil, prompt, rawResponse, fmt.Errorf("failed to parse extraction response: %w", err)
	}

	return extracted, prompt, rawResponse, nil
}

// buildExtractionPrompt creates the prompt for LLM extraction
func (e *DataExtractor) buildExtractionPrompt(
	requiredFields []repository.PhaseData,
	userMessage string,
	coachResponse string,
) string {
	var fieldDescriptions []string
	for _, field := range requiredFields {
		description := fmt.Sprintf("- %s: %s", field.Name, field.Description)

		// Parse schema to check for extractor_hints or enum values
		var schemaInfo map[string]interface{}
		if err := json.Unmarshal([]byte(field.Schema), &schemaInfo); err == nil {
			// Add enum values if present
			if enumVals, ok := schemaInfo["enum"].([]interface{}); ok {
				var enumStrs []string
				for _, v := range enumVals {
					if str, ok := v.(string); ok {
						enumStrs = append(enumStrs, str)
					}
				}
				if len(enumStrs) > 0 {
					description += fmt.Sprintf(" (valid values: %s)", strings.Join(enumStrs, ", "))
				}
			}

			// Add extractor_hints if present
			if hints, ok := schemaInfo["extractor_hints"].(map[string]interface{}); ok {
				var hintKeys []string
				for key := range hints {
					hintKeys = append(hintKeys, key)
				}
				if len(hintKeys) > 0 {
					description += fmt.Sprintf(" (acceptable answers: %s)", strings.Join(hintKeys, ", "))
				}
			}
		}

		fieldDescriptions = append(fieldDescriptions, description)
	}

	return fmt.Sprintf(`You are a data extraction assistant for a therapy session.

Your task: Extract data that is explicitly stated OR clearly provided in the patient's answer to the coach's question.

Required fields:
%s

Conversation:
Coach: %s
Patient: %s

Rules:
1. Extract data that is explicitly stated OR clearly provided as an answer to the coach's question
2. When the coach explains how to interpret an answer (e.g., "if you say X, that means Y"), use that mapping
3. "ready" is NOT consent - only "I consent" or "yes, I consent" counts
4. For numbers, only extract if clearly stated
5. If no data provided, return {}

Output valid JSON with field names as keys, or {} if nothing provided.

Examples:
Input: "I'm ready" → Output: {}
Input: "Yes, I consent" → Output: {"consent_given": true}
Input: "7 or 8" → Output: {"field_name": 8}
Input: Coach explains "if X then field=value1, if Y then field=value2", Patient says "X" → Output: {"field": "value1"}

Output:`, strings.Join(fieldDescriptions, "\n"), coachResponse, userMessage)
}

// normalizeExtractedData uses extractor_hints to convert natural language to proper types
func (e *DataExtractor) normalizeExtractedData(
	extracted map[string]interface{},
	fields []repository.PhaseData,
) map[string]interface{} {
	normalized := make(map[string]interface{})

	for key, value := range extracted {
		// Find the field schema
		var fieldSchema map[string]interface{}
		for _, field := range fields {
			if field.Name == key {
				if err := json.Unmarshal([]byte(field.Schema), &fieldSchema); err == nil {
					break
				}
			}
		}

		// If no schema found or no extractor_hints, keep original value
		if fieldSchema == nil {
			normalized[key] = value
			continue
		}

		hints, hasHints := fieldSchema["extractor_hints"].(map[string]interface{})
		if !hasHints {
			normalized[key] = value
			continue
		}

		// Convert value to lowercase string for matching
		strValue := strings.ToLower(strings.TrimSpace(fmt.Sprintf("%v", value)))

		// Check if value matches any hint key
		if hintValue, exists := hints[strValue]; exists {
			normalized[key] = hintValue
			logger.AppLogger.WithFields(logrus.Fields{
				"field":          key,
				"original_value": value,
				"normalized_to":  hintValue,
			}).Info("[EXTRACTOR] Normalized value using extractor_hints")
		} else {
			// No match found, keep original value
			normalized[key] = value
		}
	}

	return normalized
}
