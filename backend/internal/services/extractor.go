package services

import (
	"context"
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"therapy-navigation-system/internal/logger"
	"therapy-navigation-system/internal/repository"

	"github.com/sirupsen/logrus"
	"google.golang.org/genai"
)

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
) (map[string]interface{}, error) {
	// Get required fields for current phase
	var requiredFields []repository.PhaseData
	if err := repository.DB.Where("phase_id = ? AND required = ?", currentPhase, true).Find(&requiredFields).Error; err != nil {
		return nil, fmt.Errorf("failed to get required fields: %w", err)
	}

	if len(requiredFields) == 0 {
		// No requirements for this phase
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
	extracted, err := e.llmExtraction(ctx, missingFields, userMessage, coachResponse)
	if err != nil {
		logger.AppLogger.WithError(err).Error("[EXTRACTOR] LLM extraction failed")
		return map[string]interface{}{}, nil // Don't fail the conversation
	}

	logger.AppLogger.WithFields(logrus.Fields{
		"session_id": sessionID,
		"extracted":  extracted,
		"method":     "llm",
	}).Info("[EXTRACTOR] LLM extraction succeeded")

	return extracted, nil
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
func (e *DataExtractor) llmExtraction(
	ctx context.Context,
	requiredFields []repository.PhaseData,
	userMessage string,
	coachResponse string,
) (map[string]interface{}, error) {
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
		return nil, err
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("no response from LLM")
	}

	responseText := resp.Candidates[0].Content.Parts[0].Text

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
		return nil, fmt.Errorf("failed to parse extraction response: %w", err)
	}

	return extracted, nil
}

// buildExtractionPrompt creates the prompt for LLM extraction
func (e *DataExtractor) buildExtractionPrompt(
	requiredFields []repository.PhaseData,
	userMessage string,
	coachResponse string,
) string {
	var fieldDescriptions []string
	for _, field := range requiredFields {
		fieldDescriptions = append(fieldDescriptions, fmt.Sprintf("- %s: %s", field.Name, field.Description))
	}

	return fmt.Sprintf(`You are a data extraction assistant for a therapy session.

Your task: Extract ONLY explicitly stated data from the patient's message. Do NOT infer or assume.

Required fields:
%s

Conversation:
Coach: %s
Patient: %s

Rules:
1. Only extract data EXPLICITLY stated by the patient
2. "ready" is NOT consent - only "I consent" or "yes, I consent" counts
3. For numbers, only extract if clearly stated
4. If no data provided, return {}

Output valid JSON with field names as keys, or {} if nothing provided.

Examples:
Input: "I'm ready" → Output: {}
Input: "Yes, I consent" → Output: {"consent_given": true}
Input: "anxiety about presenting, maybe 7 or 8" → Output: {"selected_issue": "anxiety about presenting", "issue_intensity": 8}

Output:`, strings.Join(fieldDescriptions, "\n"), coachResponse, userMessage)
}
