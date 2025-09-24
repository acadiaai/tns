package api

import (
	"encoding/json"
	"net/http"
	"therapy-navigation-system/internal/logger"
	"therapy-navigation-system/internal/repository"
	"time"
	
	"github.com/go-chi/chi/v5"
)

// MonitoringStats represents overall monitoring statistics
type MonitoringStats struct {
	TotalPrompts    int                    `json:"total_prompts"`
	TotalEmbeddings int                    `json:"total_embeddings"`
	TotalTokens     int                    `json:"total_tokens"`
	ActiveSessions  int                    `json:"active_sessions"`
	ByAgent         map[string]AgentStats  `json:"by_agent"`
}

// AgentStats represents statistics for a specific agent
type AgentStats struct {
	PromptCount  int `json:"prompt_count"`
	TotalTokens  int `json:"total_tokens"`
	AvgTokens    int `json:"avg_tokens"`
}

// PromptRecord represents a stored prompt
type PromptRecord struct {
	ID          string    `json:"id"`
	SessionID   string    `json:"session_id"`
	AgentType   string    `json:"agent_type"`
	Prompt      string    `json:"prompt"`
	Response    string    `json:"response"`
	TokenCount  int       `json:"token_count"`
	Model       string    `json:"model"`
	Timestamp   time.Time `json:"timestamp"`
}

// EmbeddingRecord represents a stored embedding
type EmbeddingRecord struct {
	ID           string    `json:"id"`
	SessionID    string    `json:"session_id"`
	Type         string    `json:"type"` // message, entity, relationship
	Text         string    `json:"text"`
	Dimension    int       `json:"dimension"`
	VectorSample []float32 `json:"vector_sample"` // First 20 values for visualization
	Timestamp    time.Time `json:"timestamp"`
}

// GetPromptsHandler returns recent prompts
func GetPromptsHandler(w http.ResponseWriter, r *http.Request) {
	logger.AppLogger.Info("Fetching prompts for monitoring")
	
	// Get filters from query params
	sessionID := r.URL.Query().Get("session_id")
	agentType := r.URL.Query().Get("agent_type")
	timeRange := r.URL.Query().Get("time_range")
	
	// Calculate time filter
	var since time.Time
	switch timeRange {
	case "1h":
		since = time.Now().Add(-1 * time.Hour)
	case "7d":
		since = time.Now().Add(-7 * 24 * time.Hour)
	default: // 24h
		since = time.Now().Add(-24 * time.Hour)
	}
	
	// Query prompts from database
	var prompts []PromptRecord
	query := repository.DB.Table("prompt_logs").Where("timestamp >= ?", since)
	
	if sessionID != "" {
		query = query.Where("session_id = ?", sessionID)
	}
	if agentType != "" {
		query = query.Where("agent_type = ?", agentType)
	}
	
	query.Order("timestamp DESC").Limit(100).Find(&prompts)
	
	// Get total count
	var totalCount int64
	repository.DB.Table("prompt_logs").Count(&totalCount)
	
	response := map[string]interface{}{
		"prompts":     prompts,
		"total_count": totalCount,
		"filters": map[string]string{
			"session_id":  sessionID,
			"agent_type":  agentType,
			"time_range":  timeRange,
		},
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetEmbeddingsHandler returns recent embeddings
func GetEmbeddingsHandler(w http.ResponseWriter, r *http.Request) {
	logger.AppLogger.Info("Fetching embeddings for monitoring")
	
	// Get filters
	embeddingType := r.URL.Query().Get("type")
	sessionID := r.URL.Query().Get("session_id")
	
	// Query embeddings
	var embeddings []EmbeddingRecord
	query := repository.DB.Table("embedding_logs")
	
	if embeddingType != "" {
		query = query.Where("type = ?", embeddingType)
	}
	if sessionID != "" {
		query = query.Where("session_id = ?", sessionID)
	}
	
	query.Order("timestamp DESC").Limit(100).Find(&embeddings)
	
	// Get total count
	var totalCount int64
	repository.DB.Table("embedding_logs").Count(&totalCount)
	
	response := map[string]interface{}{
		"embeddings":  embeddings,
		"total_count": totalCount,
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetUsageStatsHandler returns token usage statistics
func GetUsageStatsHandler(w http.ResponseWriter, r *http.Request) {
	logger.AppLogger.Info("Calculating usage statistics")
	
	// Aggregate by agent type
	type AgentUsage struct {
		AgentType   string
		PromptCount int
		TotalTokens int
	}
	
	var agentUsages []AgentUsage
	repository.DB.Table("prompt_logs").
		Select("agent_type, COUNT(*) as prompt_count, SUM(token_count) as total_tokens").
		Group("agent_type").
		Scan(&agentUsages)
	
	// Build response
	byAgent := make(map[string]AgentStats)
	totalTokens := 0
	
	for _, usage := range agentUsages {
		avgTokens := 0
		if usage.PromptCount > 0 {
			avgTokens = usage.TotalTokens / usage.PromptCount
		}
		
		byAgent[usage.AgentType] = AgentStats{
			PromptCount: usage.PromptCount,
			TotalTokens: usage.TotalTokens,
			AvgTokens:   avgTokens,
		}
		
		totalTokens += usage.TotalTokens
	}
	
	response := map[string]interface{}{
		"total_tokens": totalTokens,
		"by_agent":     byAgent,
		"cost_estimate": map[string]float64{
			"total_usd": float64(totalTokens) / 1000000 * 0.15, // $0.15 per million tokens
		},
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetKnowledgeGraphHandler returns knowledge graph for a session
func GetKnowledgeGraphHandler(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "sessionId")
	logger.AppLogger.WithField("session_id", sessionID).Info("Fetching knowledge graph")
	
	// Get entities
	var entities []map[string]interface{}
	repository.DB.Table("knowledge_entities").
		Where("session_id = ?", sessionID).
		Find(&entities)
	
	// Get relationships
	var relationships []map[string]interface{}
	repository.DB.Table("knowledge_relationships").
		Where("session_id = ?", sessionID).
		Find(&relationships)
	
	response := map[string]interface{}{
		"session_id":     sessionID,
		"entities":       entities,
		"relationships":  relationships,
		"entity_count":   len(entities),
		"relation_count": len(relationships),
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

