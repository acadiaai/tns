package services

import (
	"encoding/json"
	"therapy-navigation-system/internal/logger"
	"therapy-navigation-system/internal/repository"
	"time"
)

// MonitoringService handles logging and metrics
type MonitoringService struct{}

// NewMonitoringService creates a new monitoring service
func NewMonitoringService() *MonitoringService {
	return &MonitoringService{}
}

// LogPrompt logs a prompt to the monitoring database AND updates metrics
func (m *MonitoringService) LogPrompt(sessionID, agentType, prompt, response string, tokenCount int, model string) {
	// 1. Store 100% of prompts for traceability (REQUIRED)
	record := repository.PromptLog{
		ID:         generateMonitoringID("prompt"),
		SessionID:  sessionID,
		AgentType:  agentType,
		Prompt:     prompt,
		Response:   response,
		TokenCount: tokenCount,
		Model:      model,
		Timestamp:  time.Now(),
		CreatedAt:  time.Now(),
	}
	
	if err := repository.DB.Create(&record).Error; err != nil {
		logger.AppLogger.WithError(err).Error("Failed to log prompt")
		return
	}
	
	// 2. Update Prometheus metrics for monitoring dashboard
	if updateGeminiMetricsCallback != nil {
		updateGeminiMetricsCallback(agentType, tokenCount, 0) // 0 duration since we don't track it here
	}
	
	logger.AppLogger.WithFields(map[string]interface{}{
		"session_id": sessionID,
		"agent_type": agentType,
		"tokens": tokenCount,
		"model": model,
	}).Info("Logged prompt for traceability and updated metrics")
}

// LogEmbedding logs an embedding to the monitoring database
func (m *MonitoringService) LogEmbedding(sessionID, embedType, text string, dimension int, vectorSample []float32) {
	// Convert vector sample to JSON
	sampleJSON, _ := json.Marshal(vectorSample)
	
	record := repository.EmbeddingLog{
		ID:           generateMonitoringID("embed"),
		SessionID:    sessionID,
		Type:         embedType,
		Text:         text,
		Dimension:    dimension,
		VectorSample: string(sampleJSON),
		Timestamp:    time.Now(),
		CreatedAt:    time.Now(),
	}
	
	if err := repository.DB.Create(&record).Error; err != nil {
		logger.AppLogger.WithError(err).Error("Failed to log embedding")
	}
}

func generateMonitoringID(prefix string) string {
	return prefix + "_" + time.Now().Format("20060102150405") + "_" + generateRandomString(6)
}

func generateRandomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(b)
}