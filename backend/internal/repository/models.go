package repository

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ============================================================================
// CORE ENTITIES
// ============================================================================

// Client represents a simplified therapy client
type Client struct {
	ID        string    `gorm:"type:uuid;primary_key;" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	Email     string    `gorm:"unique;not null" json:"email"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Relationships
	Sessions []Session `gorm:"foreignKey:ClientID" json:"sessions,omitempty"`
}

// Therapist represents a simplified therapist
type Therapist struct {
	ID        string    `gorm:"type:uuid;primary_key;" json:"id"`
	Name      string    `gorm:"not null" json:"name"`
	Email     string    `gorm:"unique;not null" json:"email"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Relationships
	Sessions []Session `gorm:"foreignKey:TherapistID" json:"sessions,omitempty"`
}

// Session represents a therapy session - simplified to essentials
type Session struct {
	ID          string    `gorm:"type:uuid;primary_key;" json:"id"`
	ClientID    string    `gorm:"type:uuid;not null" json:"client_id"`
	TherapistID string    `gorm:"type:uuid;not null" json:"therapist_id"`
	Status      string    `gorm:"default:scheduled" json:"status"` // scheduled, active, completed
	Phase       string    `gorm:"default:pre_session" json:"phase"`
	StartTime   time.Time `json:"start_time"`
	EndTime     *time.Time `json:"end_time,omitempty"`
	Notes       string    `gorm:"type:text" json:"notes,omitempty"`

	// Phase tracking
	PhaseStartTime       time.Time `json:"phase_start_time"`
	PhaseTransitionCount int       `json:"phase_transition_count" gorm:"default:0"`

	// Mindfulness tracking for Stage 4/5 loops
	TotalMindfulnessSeconds int    `json:"total_mindfulness_seconds" gorm:"default:0"`
	MindfulnessLoopCount    int    `json:"mindfulness_loop_count" gorm:"default:0"`
	LastSudsValue           int    `json:"last_suds_value" gorm:"default:-1"`
	PhaseHistory            string `json:"phase_history" gorm:"type:text"` // JSON array of phase timings

	// Timestamps
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Relationships
	Client       Client                `json:"client,omitempty" gorm:"foreignKey:ClientID"`
	Therapist    Therapist             `json:"therapist,omitempty" gorm:"foreignKey:TherapistID"`
	Messages     []Message             `json:"messages,omitempty" gorm:"foreignKey:SessionID"`
	FieldValues  []SessionFieldValue   `json:"field_values,omitempty" gorm:"foreignKey:SessionID"`
}

// Message represents a chat message in a therapy session
type Message struct {
	ID          string    `json:"id" gorm:"type:uuid;primary_key;"`
	SessionID   string    `json:"session_id" gorm:"type:uuid;not null"`
	Role        string    `json:"role" gorm:"not null"` // patient, coach, system
	Content     string    `json:"content" gorm:"type:text;not null"`
	MessageType string    `json:"message_type" gorm:"default:conversation"` // conversation, tool_call, tool_result
	Metadata    string    `json:"metadata,omitempty" gorm:"type:text"` // JSON string for tool calls/results
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// Relationships
	Session Session `json:"session,omitempty" gorm:"foreignKey:SessionID"`
}

// ============================================================================
// PHASE SYSTEM (Database-Driven Requirements)
// ============================================================================

// Phase represents a workflow phase with database-driven requirements
type Phase struct {
	ID              string    `json:"id" gorm:"primaryKey"`
	DisplayName     string    `json:"display_name" gorm:"not null"`
	Description     string    `json:"description" gorm:"type:text"`
	Position                   int       `json:"position" gorm:"not null"` // Order of phases
	MinimumTurns               int       `json:"minimum_turns" gorm:"default:1"` // Required conversation exchanges
	RecommendedDurationSeconds int       `json:"recommended_duration_seconds" gorm:"default:60"` // Recommended time for phase
	Icon                       string    `json:"icon" gorm:"type:text"`
	Color                      string    `json:"color" gorm:"type:text"`
	DurationSeconds            int       `json:"duration_seconds"`

	// Phase type fields for timed waiting periods
	Type                string `json:"type" gorm:"type:varchar(50);default:'conversational'"` // conversational or timed_waiting
	WaitDurationSeconds int    `json:"wait_duration_seconds" gorm:"default:0"` // Duration for timed_waiting phases
	PreWaitMessage      string `json:"pre_wait_message" gorm:"type:text"` // Message shown before waiting
	PostWaitPrompt      string `json:"post_wait_prompt" gorm:"type:text"` // Prompt shown after waiting
	VisualizationType   string `json:"visualization_type" gorm:"type:varchar(50)"` // breathing_circle, ocean_waves, etc.

	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`

	// Relationships
	PhaseData         []PhaseData         `json:"phase_data,omitempty" gorm:"foreignKey:PhaseID"`
	PhaseConstraints  []PhaseConstraint   `json:"phase_constraints,omitempty" gorm:"foreignKey:PhaseID"`
	TransitionsFrom   []PhaseTransition   `json:"transitions_from,omitempty" gorm:"foreignKey:FromPhaseID"`
	TransitionsTo     []PhaseTransition   `json:"transitions_to,omitempty" gorm:"foreignKey:ToPhaseID"`
	PhaseTools        []PhaseTool         `json:"phase_tools,omitempty" gorm:"foreignKey:PhaseID"`
}

// PhaseData defines what fields are required/optional for each phase
type PhaseData struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	PhaseID     string    `json:"phase_id" gorm:"not null"`
	Name        string    `json:"name" gorm:"not null"` // e.g., "selected_issue", "suds_level"
	Required    bool      `json:"required" gorm:"default:false"`
	Optional    bool      `json:"optional" gorm:"default:true"`
	Schema      string    `json:"schema" gorm:"type:text"` // JSON Schema for validation
	Description string    `json:"description" gorm:"type:text"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// Relationships
	Phase Phase `json:"phase,omitempty" gorm:"foreignKey:PhaseID"`
}

// PhaseConstraint defines timing and engagement requirements for each phase
type PhaseConstraint struct {
	ID             string    `json:"id" gorm:"primaryKey"`
	PhaseID        string    `json:"phase_id" gorm:"not null"`
	ConstraintType string    `json:"constraint_type" gorm:"not null"` // "minimum_exchanges", "minimum_duration_seconds", "minimum_processing_time"
	Value          int       `json:"value" gorm:"not null"`          // The constraint value (e.g., 3 exchanges, 60 seconds)
	BehaviorType   string    `json:"behavior_type" gorm:"default:advisory"` // "blocking", "advisory", "warning"
	Description    string    `json:"description" gorm:"type:text"`
	IsActive       bool      `json:"is_active" gorm:"default:true"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`

	// Relationships
	Phase Phase `json:"phase,omitempty" gorm:"foreignKey:PhaseID"`
}

// PhaseTransition defines allowed transitions between phases
type PhaseTransition struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	FromPhaseID string    `json:"from_phase_id" gorm:"not null"`
	ToPhaseID   string    `json:"to_phase_id" gorm:"not null"`
	Condition   string    `json:"condition,omitempty"` // Optional condition for this transition
	Priority    int       `json:"priority" gorm:"default:0"`
	IsActive    bool      `json:"is_active" gorm:"default:true"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// Relationships
	FromPhase Phase `json:"from_phase,omitempty" gorm:"foreignKey:FromPhaseID"`
	ToPhase   Phase `json:"to_phase,omitempty" gorm:"foreignKey:ToPhaseID"`
}

// ============================================================================
// DYNAMIC FIELD STORAGE
// ============================================================================

// SessionFieldValue stores any field collected during the session
type SessionFieldValue struct {
	ID         string    `gorm:"type:uuid;primary_key" json:"id"`
	SessionID  string    `gorm:"type:uuid;not null;index" json:"session_id"`
	PhaseID    string    `gorm:"index" json:"phase_id"` // Which phase it was collected in
	FieldName  string    `gorm:"not null;index" json:"field_name"`
	FieldValue string    `gorm:"type:text" json:"field_value"`
	FieldType  string    `json:"field_type"` // string, int, bool, json
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`

	// Relationships
	Session Session `json:"session,omitempty" gorm:"foreignKey:SessionID"`
	Phase   Phase   `json:"phase,omitempty" gorm:"foreignKey:PhaseID"`
}

// ============================================================================
// TOOL SYSTEM (MCP Integration)
// ============================================================================

// Tool represents a therapeutic tool that can be called by the AI
type Tool struct {
	ID          string    `gorm:"type:uuid;primary_key;" json:"id"`
	Name        string    `gorm:"not null;unique" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	InputSchema string    `gorm:"type:text" json:"input_schema"` // JSON schema
	HandlerFunc string    `json:"handler_func"`
	IsActive    bool      `gorm:"default:true" json:"is_active"`
	Version     int       `gorm:"default:1" json:"version"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// Relationships
	PhaseTools []PhaseTool `json:"phase_tools,omitempty" gorm:"foreignKey:ToolID"`
}

// PhaseTool defines which tools are available in which phases
type PhaseTool struct {
	ID       string `gorm:"type:uuid;primary_key;" json:"id"`
	PhaseID  string `gorm:"not null" json:"phase_id"`
	ToolID   string `gorm:"type:uuid;not null" json:"tool_id"`
	IsActive bool   `gorm:"default:true" json:"is_active"`

	// Relationships
	Phase Phase `json:"phase,omitempty" gorm:"foreignKey:PhaseID"`
	Tool  Tool  `json:"tool,omitempty" gorm:"foreignKey:ToolID"`
}

// ============================================================================
// CONTENT SYSTEM
// ============================================================================

// Prompt represents a therapeutic prompt template
type Prompt struct {
	ID            string    `gorm:"type:uuid;primary_key;" json:"id"`
	Name          string    `gorm:"not null;unique" json:"name"`
	Description   string    `gorm:"type:text" json:"description"`
	Category      string    `gorm:"not null" json:"category"` // system, user, tool
	Content       string    `gorm:"type:text;not null" json:"content"`
	Version       int       `gorm:"default:1" json:"version"`
	Variables     string    `gorm:"type:text" json:"variables,omitempty"` // JSON array
	Parameters    string    `json:"parameters" gorm:"type:jsonb"` // JSON object for template vars
	IsActive      bool      `gorm:"default:true" json:"is_active"`
	IsSystem      bool      `gorm:"default:false" json:"is_system"`
	WorkflowPhase string    `json:"workflow_phase,omitempty"` // Links to phases
	UsageCount    int       `json:"usage_count" gorm:"default:0"`
	CreatedBy     string    `json:"created_by" gorm:"type:text"`
	UpdatedBy     string    `json:"updated_by" gorm:"type:text"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// PromptCategory represents prompt categories
type PromptCategory string

const (
	PromptCategorySystem   PromptCategory = "system"
	PromptCategoryPhase    PromptCategory = "phase"
	PromptCategoryTool     PromptCategory = "tool"
	PromptCategoryContext  PromptCategory = "context"
)

// PromptUsage tracks prompt usage
type PromptUsage struct {
	ID         string    `json:"id" gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
	PromptID   string    `json:"prompt_id" gorm:"not null;index"`
	SessionID  string    `json:"session_id" gorm:"not null;index"`
	UsedAt     time.Time `json:"used_at"`
	TokenCount int       `json:"token_count"`
	CreatedAt  time.Time `json:"created_at"`
}

// PromptAddendum is an editable addendum scoped to a session+phase
type PromptAddendum struct {
	ID        string    `json:"id" gorm:"type:uuid;primary_key;"`
	SessionID string    `json:"session_id" gorm:"type:uuid;not null"`
	Phase     string    `json:"phase" gorm:"not null"`
	Content   string    `json:"content" gorm:"type:text;not null"`
	Version   int       `json:"version" gorm:"default:1"`
	UpdatedBy string    `json:"updated_by" gorm:"type:text"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ============================================================================
// STATE TRACKING
// ============================================================================

// SessionState represents the current state machine state for a session
type SessionState struct {
	SessionID      string    `json:"session_id" gorm:"type:uuid;primary_key"`
	CurrentPhase   string    `json:"current_phase"`
	MissingFields  string    `json:"missing_fields" gorm:"type:text"` // JSON array
	CanTransition  bool      `json:"can_transition"`
	LastValidation time.Time `json:"last_validation"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// SessionPhaseState tracks engagement and timing state for each phase within a session
type SessionPhaseState struct {
	ID                    string    `json:"id" gorm:"type:uuid;primary_key"`
	SessionID             string    `json:"session_id" gorm:"type:uuid;not null;index"`
	PhaseID               string    `json:"phase_id" gorm:"not null;index"`
	MessageCount          int       `json:"message_count" gorm:"default:0"`
	PhaseStartTime        time.Time `json:"phase_start_time"`
	PhaseEndTime          *time.Time `json:"phase_end_time,omitempty"`
	DurationSeconds       int       `json:"duration_seconds" gorm:"default:0"`
	RequirementsMet       bool      `json:"requirements_met" gorm:"default:false"`
	MinimumTurnsMet       bool      `json:"minimum_turns_met" gorm:"default:false"`
	CanTransition         bool      `json:"can_transition" gorm:"default:false"`
	LastMessageTime       time.Time `json:"last_message_time"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`

	// Relationships
	Session Session `json:"session,omitempty" gorm:"foreignKey:SessionID"`
	Phase   Phase   `json:"phase,omitempty" gorm:"foreignKey:PhaseID"`
}

// ============================================================================
// UUID GENERATION HOOKS
// ============================================================================

// BeforeCreate hook for Client
func (c *Client) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}

// BeforeCreate hook for Therapist
func (t *Therapist) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.New().String()
	}
	return nil
}

// BeforeCreate hook for Session
func (s *Session) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	s.PhaseStartTime = time.Now()
	return nil
}

// BeforeCreate hook for Message
func (m *Message) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}
	return nil
}

// BeforeCreate hook for SessionFieldValue
func (sfv *SessionFieldValue) BeforeCreate(tx *gorm.DB) error {
	if sfv.ID == "" {
		sfv.ID = uuid.New().String()
	}
	return nil
}

// BeforeCreate hook for Tool
func (t *Tool) BeforeCreate(tx *gorm.DB) error {
	if t.ID == "" {
		t.ID = uuid.New().String()
	}
	return nil
}

// BeforeCreate hook for PhaseTool
func (pt *PhaseTool) BeforeCreate(tx *gorm.DB) error {
	if pt.ID == "" {
		pt.ID = uuid.New().String()
	}
	return nil
}

// BeforeCreate hook for Prompt
func (p *Prompt) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	return nil
}

// BeforeCreate hook for PromptAddendum
func (pa *PromptAddendum) BeforeCreate(tx *gorm.DB) error {
	if pa.ID == "" {
		pa.ID = uuid.New().String()
	}
	return nil
}

// BeforeCreate hook for SessionPhaseState
func (sps *SessionPhaseState) BeforeCreate(tx *gorm.DB) error {
	if sps.ID == "" {
		sps.ID = uuid.New().String()
	}
	if sps.PhaseStartTime.IsZero() {
		sps.PhaseStartTime = time.Now()
	}
	if sps.LastMessageTime.IsZero() {
		sps.LastMessageTime = time.Now()
	}
	return nil
}