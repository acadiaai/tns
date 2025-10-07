package services

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
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

	// Generate conversational response only (no tool calling)
	// Data extraction happens separately after response is sent
	cfg := &genai.GenerateContentConfig{
		Temperature: genai.Ptr(float32(0.7)), // Warm but focused
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

	// Extract text response only (no tool calling in new architecture)
	var responseText string
	for _, part := range candidate.Content.Parts {
		if part.Text != "" {
			responseText += part.Text
		}
	}

	// [PROMPT_LOGGER] Log complete response (critical for iteration)
	logger.AppLogger.WithFields(logrus.Fields{
		"session_id":        sessionID,
		"current_phase":     currentPhase,
		"response_text":     responseText,
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
			"response_time_ms": responseTime.Milliseconds(),
		}
		json.NewEncoder(file).Encode(responseEntry)
		file.Close()
	}

	return &CoachResponse{
		Message:   responseText,
		ToolCalls: []ToolCall{}, // Empty - extraction happens separately
	}, nil
}

