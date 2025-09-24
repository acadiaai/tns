package services

import (
	"context"
	"fmt"
	"therapy-navigation-system/internal/config"
	"therapy-navigation-system/internal/repository"
	"time"

	"google.golang.org/genai"
)

// GeminiService handles AI responses using Google Gemini
type GeminiService struct {
	client *genai.Client
	model  string
}

// NewGeminiService creates a Gemini service using Google GenAI SDK
func NewGeminiService(cfg *config.Config) (*GeminiService, error) {
	ctx := context.Background()

	// Use ADC with Vertex AI backend
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		Backend:  genai.BackendVertexAI,
		Project:  cfg.GCPProjectID,
		Location: cfg.GCPRegion,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create GenAI client: %w", err)
	}

	return &GeminiService{
		client: client,
		model:  cfg.AIModel,
	}, nil
}

// GetClient returns the underlying genai client
func (s *GeminiService) GetClient() *genai.Client {
	return s.client
}

// GetModelName returns the configured default model name
func (s *GeminiService) GetModelName() string {
	if s.model == "" {
		return "gemini-2.0-flash"
	}
	return s.model
}

// GenerateIntakeResponse generates a structured response for therapy sessions - temporarily simplified
func (s *GeminiService) GenerateIntakeResponse(ctx context.Context, session *repository.Session, messages []repository.Message) (*repository.Message, error) {
	// Temporary implementation while updating API
	message := &repository.Message{
		SessionID: session.ID,
		Role:      "therapist",
		Content:   "I understand. Can you tell me more about what brought you here today?",
		CreatedAt: time.Now(),
	}

	return message, nil
}

// GenerateStructuredResponse generates a response with custom structured output
func (s *GeminiService) GenerateStructuredResponse(ctx context.Context, prompt string, responseSchema *genai.Schema) (string, error) {
	startTime := time.Now()

	// Use GenAI API with Gemini Pro for better reasoning
	parts := []*genai.Part{{Text: prompt}}
	content := &genai.Content{
		Parts: parts,
		Role:  "user",
	}

	// Using Pro for therapy - better reasoning and context handling
	resp, err := s.client.Models.GenerateContent(ctx, "gemini-2.0-pro", []*genai.Content{content}, nil)
	duration := time.Since(startTime)

	if err != nil {
		// Still report metrics for failed requests
		if updateGeminiMetricsCallback != nil {
			updateGeminiMetricsCallback("structured", 0, duration)
		}
		return "", fmt.Errorf("failed to generate response: %w", err)
	}

	if len(resp.Candidates) == 0 || len(resp.Candidates[0].Content.Parts) == 0 {
		if updateGeminiMetricsCallback != nil {
			updateGeminiMetricsCallback("structured", 0, duration)
		}
		return "", fmt.Errorf("no response generated")
	}

	// Calculate approximate token count (rough estimate: 4 chars per token)
	responseText := resp.Candidates[0].Content.Parts[0].Text
	promptTokens := len(prompt) / 4
	responseTokens := len(responseText) / 4
	totalTokens := promptTokens + responseTokens

	// Report metrics
	if updateGeminiMetricsCallback != nil {
		updateGeminiMetricsCallback("structured", totalTokens, duration)
	}

	return responseText, nil
}
