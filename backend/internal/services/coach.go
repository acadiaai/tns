package services

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	contextbuilder "therapy-navigation-system/internal/context"
	"therapy-navigation-system/internal/logger"

	"github.com/sirupsen/logrus"
	"google.golang.org/genai"
)

// CoachService handles AI coaching responses using Context Builder
type CoachService struct {
	geminiService *GeminiService
}

// NewCoachService creates a new coach service
func NewCoachService(geminiService *GeminiService) *CoachService {
	return &CoachService{
		geminiService: geminiService,
	}
}

// CoachResponse represents a response from the brainspotting coach
type CoachResponse struct {
	Message   string      `json:"message"`
	ToolCalls []ToolCall  `json:"tool_calls,omitempty"`
}

// ToolCall represents a function call the coach wants to make
type ToolCall struct {
	Name      string                 `json:"name"`
	Arguments map[string]interface{} `json:"arguments"`
}

// GenerateResponse creates a therapeutic response using Context Builder and phase-specific prompts
func (cs *CoachService) GenerateResponse(ctx context.Context, sessionID string, userMessage string, currentPhase string) (*CoachResponse, error) {
	startTime := time.Now()
	
	// Use Context Builder for proper prompt construction (IMPLEMENTATION_PLAN.md)
	logger.AppLogger.WithFields(logrus.Fields{
		"session_id":    sessionID,
		"current_phase": currentPhase,
	}).Info("[COACH_DEBUG] Calling Context Builder")
	
	bundle, err := contextbuilder.BuildTurnContext(sessionID, currentPhase)
	if err != nil {
		logger.AppLogger.WithFields(logrus.Fields{
			"session_id":    sessionID,
			"current_phase": currentPhase,
			"error":         err.Error(),
		}).Error("[COACH_DEBUG] Context Builder failed")
		return nil, err
	}
	
	logger.AppLogger.WithFields(logrus.Fields{
		"session_id":     sessionID,
		"prompt_length":  len(bundle.ConstructedPrompt),
		"token_report":   bundle.TokenReport,
	}).Info("[COACH_DEBUG] Context Builder succeeded")
	
	logger.AppLogger.WithField("session_id", sessionID).Info("[COACH_DEBUG] Building final prompt from Context Builder result")

	logger.AppLogger.WithFields(map[string]interface{}{
		"session_id": sessionID,
		"bundle_nil": bundle == nil,
		"prompt_len": func() int {
			if bundle == nil { return -1 }
			return len(bundle.ConstructedPrompt)
		}(),
	}).Info("[COACH_DEBUG] Checking Context Builder bundle")

	// [PROMPT_LOGGER] Log complete prompt (critical for iteration)
	logger.AppLogger.WithFields(map[string]interface{}{
		"session_id":         sessionID,
		"current_phase":      currentPhase,
		"constructed_prompt": bundle.ConstructedPrompt,
		"user_message":       userMessage,
		"prompt_length":      len(bundle.ConstructedPrompt),
		"token_budget":       bundle.TokenReport,
	}).Info("[PROMPT_LOGGER] === COMPLETE PROMPT TO GEMINI ===")
	
	// Simple raw prompt logging for analysis
	if file, err := os.OpenFile("logs/prompts.jsonl", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644); err == nil {
		promptEntry := map[string]interface{}{
			"timestamp":    time.Now(),
			"session_id":   sessionID,
			"turn_type":    "REQUEST",
			"phase":        currentPhase,
			"user_message": userMessage,
			"prompt":       bundle.ConstructedPrompt,
			"prompt_hash":  bundle.PromptHash,
			"token_total":  bundle.TokenReport.Total,
			// TODO: Add prompt version tracking - need to get versions from Context Builder
		}
		json.NewEncoder(file).Encode(promptEntry)
		file.Close()
	}

	logger.AppLogger.WithField("session_id", sessionID).Info("[COACH_DEBUG] Building final prompt string")

	// Build final prompt combining context + user message
	var finalPrompt string
	if userMessage == "" {
		// Initial greeting - no patient message yet
		finalPrompt = bundle.ConstructedPrompt + "\n\n[This is the beginning of a new session. Greet the patient warmly and ask how they're doing today.]\n\nCOACH:"
	} else {
		// Normal conversation flow
		finalPrompt = bundle.ConstructedPrompt + "\n\nPATIENT: " + userMessage + "\n\nCOACH:"
	}
	
	logger.AppLogger.WithFields(map[string]interface{}{
		"session_id":     sessionID,
		"final_prompt_length": len(finalPrompt),
	}).Info("[COACH_DEBUG] Final prompt built successfully")
	promptContent := &genai.Content{
		Parts: []*genai.Part{{Text: finalPrompt}},
		Role:  "user",
	}

	// Tools are provided by the context builder (no fallbacks, no DB queries)
	logger.AppLogger.WithField("session_id", sessionID).Info("[COACH_DEBUG] Getting tools from context bundle")
	allowedTools, err := cs.parseToolsFromBundle(bundle.Tools)
	if err != nil {
		return nil, fmt.Errorf("failed to parse tools from context bundle: %w", err)
	}

	logger.AppLogger.WithFields(map[string]interface{}{
		"session_id":   sessionID,
		"tools_count":  len(allowedTools),
		"tools_list":   bundle.Tools,
	}).Info("[COACH_DEBUG] Tools loaded from context bundle, calling Gemini API")
	
	// Generate response with proper Google function calling
	cfg := &genai.GenerateContentConfig{
		Tools:       []*genai.Tool{{FunctionDeclarations: allowedTools}},
		Temperature: genai.Ptr(float32(0.7)), // Warm but focused
		// Note: Go SDK doesn't have FunctionCallingConfig, but auto-transition will handle it
	}

	logger.AppLogger.WithField("session_id", sessionID).Info("[COACH_DEBUG] About to call Gemini GenerateContent")
	
	resp, err := cs.geminiService.GetClient().Models.GenerateContent(
		ctx, 
		"gemini-2.0-flash", 
		[]*genai.Content{promptContent}, 
		cfg,
	)
	
	logger.AppLogger.WithField("session_id", sessionID).Info("[COACH_DEBUG] Gemini GenerateContent completed")
	if err != nil {
		logger.AppLogger.WithError(err).Error("Failed to generate coach response")
		return nil, err
	}

	responseTime := time.Since(startTime)

	if len(resp.Candidates) == 0 {
		return nil, fmt.Errorf("no response generated")
	}

	candidate := resp.Candidates[0]
	
	// Parse response using Google's proper function calling format
	var responseText string
	var toolCalls []ToolCall

	for _, part := range candidate.Content.Parts {
		if part.FunctionCall != nil {
			// Function call detected
			funcCall := part.FunctionCall
			args := make(map[string]interface{})
			for k, v := range funcCall.Args {
				args[k] = v
			}
			toolCalls = append(toolCalls, ToolCall{
				Name:      funcCall.Name,
				Arguments: args,
			})
			
			logger.AppLogger.WithFields(logrus.Fields{
				"function_name": funcCall.Name,
				"session_id":    sessionID,
				"phase":         currentPhase,
			}).Info("[COACH] Function call detected")
		} else if part.Text != "" {
			responseText += part.Text
		}
	}

	// [PROMPT_LOGGER] Log complete response (critical for iteration)
	logger.AppLogger.WithFields(logrus.Fields{
		"session_id":        sessionID,
		"current_phase":     currentPhase,
		"response_text":     responseText,
		"tool_calls_count":  len(toolCalls),
		"response_time_ms":  responseTime.Milliseconds(),
		"response_length":   len(responseText),
	}).Info("[PROMPT_LOGGER] === COMPLETE RESPONSE FROM GEMINI ===")
	
	// Log raw response to same prompt log file
	if file, err := os.OpenFile("logs/prompts.jsonl", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644); err == nil {
		responseEntry := map[string]interface{}{
			"timestamp":      time.Now(),
			"session_id":     sessionID,
			"turn_type":      "RESPONSE", 
			"phase":          currentPhase,
			"response_text":  responseText,
			"function_calls": toolCalls,
			"response_time_ms": responseTime.Milliseconds(),
		}
		json.NewEncoder(file).Encode(responseEntry)
		file.Close()
	}

	return &CoachResponse{
		Message:   responseText,
		ToolCalls: toolCalls,
	}, nil
}

// parseToolsFromBundle converts tool strings from context builder into Gemini function declarations
func (cs *CoachService) parseToolsFromBundle(toolStrings []string) ([]*genai.FunctionDeclaration, error) {
	if len(toolStrings) == 0 {
		return nil, fmt.Errorf("no tools provided by context builder - this is a configuration error")
	}

	var tools []*genai.FunctionDeclaration

	for _, toolString := range toolStrings {
		// Extract tool name from strings like "therapy_session_transition(session_id, target_phase, reason)"
		toolName := cs.extractToolName(toolString)
		if toolName == "" {
			return nil, fmt.Errorf("failed to extract tool name from: %s", toolString)
		}

		tool := cs.getToolDeclaration(toolName, "")
		if tool == nil {
			return nil, fmt.Errorf("unknown tool declaration for: %s", toolName)
		}

		tools = append(tools, tool)
	}

	if len(tools) == 0 {
		return nil, fmt.Errorf("no valid tools found - this is a configuration error")
	}

	return tools, nil
}

// extractToolName extracts the tool name from a tool string
func (cs *CoachService) extractToolName(toolString string) string {
	if idx := strings.Index(toolString, "("); idx > 0 {
		return toolString[:idx]
	}
	return toolString
}

// getToolDeclaration returns the Gemini function declaration for a tool
func (cs *CoachService) getToolDeclaration(toolName string, sessionID string) *genai.FunctionDeclaration {
	// Handle our single universal MCP tool
	if toolName == "collect_structured_data" {
		return &genai.FunctionDeclaration{
			Name:        "collect_structured_data",
			Description: "Collect and store data as defined by the current phase requirements. Only collect data that has been explicitly provided in the conversation.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"session_id": {
						Type:        genai.TypeString,
						Description: "The session ID",
					},
					"data": {
						Type:        genai.TypeObject,
						Description: "Key-value pairs of data collected based on phase requirements",
					},
				},
				Required: []string{"session_id", "data"},
			},
		}
	}

	// Unknown tool
	return nil
}

// convertToGeminiSchema converts JSON schema to Gemini schema
func (cs *CoachService) convertToGeminiSchema(jsonSchema map[string]interface{}) *genai.Schema {
	schema := &genai.Schema{
		Type: genai.TypeObject,
		Properties: make(map[string]*genai.Schema),
	}

	// Extract properties
	if props, ok := jsonSchema["properties"].(map[string]interface{}); ok {
		for name, prop := range props {
			if propMap, ok := prop.(map[string]interface{}); ok {
				propSchema := &genai.Schema{}

				// Set type
				if t, ok := propMap["type"].(string); ok {
					switch t {
					case "string":
						propSchema.Type = genai.TypeString
					case "integer", "number":
						propSchema.Type = genai.TypeNumber
					case "boolean":
						propSchema.Type = genai.TypeBoolean
					case "object":
						propSchema.Type = genai.TypeObject
					case "array":
						propSchema.Type = genai.TypeArray
					}
				}

				// Set description
				if desc, ok := propMap["description"].(string); ok {
					propSchema.Description = desc
				}

				schema.Properties[name] = propSchema
			}
		}
	}

	// Extract required fields
	if required, ok := jsonSchema["required"].([]interface{}); ok {
		for _, req := range required {
			if reqStr, ok := req.(string); ok {
				schema.Required = append(schema.Required, reqStr)
			}
		}
	}

	return schema
}
