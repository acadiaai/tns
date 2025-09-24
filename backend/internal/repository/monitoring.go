package repository

import (
	"time"
	
	"gorm.io/gorm"
)

// PromptLog stores prompt history for monitoring
type PromptLog struct {
	ID         string    `gorm:"primaryKey" json:"id"`
	SessionID  string    `gorm:"index" json:"session_id"`
	AgentType  string    `gorm:"index" json:"agent_type"`
	Prompt     string    `gorm:"type:text" json:"prompt"`
	Response   string    `gorm:"type:text" json:"response"`
	TokenCount int       `json:"token_count"`
	Model      string    `json:"model"`
	Timestamp  time.Time `gorm:"index" json:"timestamp"`
	CreatedAt  time.Time `json:"created_at"`
}

// EmbeddingLog stores embedding generation history
type EmbeddingLog struct {
	ID           string    `gorm:"primaryKey" json:"id"`
	SessionID    string    `gorm:"index" json:"session_id"`
	Type         string    `gorm:"index" json:"type"` // message, entity, relationship
	Text         string    `gorm:"type:text" json:"text"`
	Dimension    int       `json:"dimension"`
	VectorSample string    `gorm:"type:text" json:"vector_sample"` // JSON array of first 20 values
	Timestamp    time.Time `gorm:"index" json:"timestamp"`
	CreatedAt    time.Time `json:"created_at"`
}

// KnowledgeEntity stores extracted entities
type KnowledgeEntity struct {
	ID          string                 `gorm:"primaryKey" json:"id"`
	SessionID   string                 `gorm:"index" json:"session_id"`
	Name        string                 `json:"name"`
	Type        string                 `json:"type"`
	Description string                 `gorm:"type:text" json:"description"`
	Attributes  string                 `gorm:"type:text" json:"attributes"` // JSON
	Confidence  float64                `json:"confidence"`
	ExtractedAt time.Time              `json:"extracted_at"`
	CreatedAt   time.Time              `json:"created_at"`
}

// KnowledgeRelationship stores relationships between entities
type KnowledgeRelationship struct {
	ID          string    `gorm:"primaryKey" json:"id"`
	SessionID   string    `gorm:"index" json:"session_id"`
	SourceID    string    `json:"source_id"`
	TargetID    string    `json:"target_id"`
	Type        string    `json:"type"`
	Description string    `gorm:"type:text" json:"description"`
	Confidence  float64   `json:"confidence"`
	ExtractedAt time.Time `json:"extracted_at"`
	CreatedAt   time.Time `json:"created_at"`
}

// AutoMigrate creates monitoring tables
func AutoMigrateMonitoring(db *gorm.DB) error {
	return db.AutoMigrate(
		&PromptLog{},
		&EmbeddingLog{},
		&KnowledgeEntity{},
		&KnowledgeRelationship{},
	)
}