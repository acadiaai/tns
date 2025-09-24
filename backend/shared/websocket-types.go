// Package shared contains types shared between backend and frontend via code generation
package shared

import "time"

// WebSocketMessage represents the top-level WebSocket message wrapper
type WebSocketMessage struct {
	Type      string      `json:"type"`
	Data      interface{} `json:"data,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
}

// Message types as constants for type safety
const (
	// Inbound message types (frontend -> backend)
	MessageTypeGetWorkflowStatus   = "get_workflow_status"
	MessageTypeToolCall            = "tool_call"
	MessageTypePauseTimer          = "pause_timer"
	MessageTypeResumeTimer         = "resume_timer"
	MessageTypeStopTimer           = "stop_timer"

	// Outbound message types (backend -> frontend)
	MessageTypeWorkflowUpdate      = "workflow_update"
	MessageTypeTherapySessionUpdate = "therapy_session_update"
	MessageTypeTimerUpdate         = "timer_update"
	MessageTypePhaseTimerStarted   = "phase_timer_started"
	MessageTypePhaseTimerStopped   = "phase_timer_stopped"
	MessageTypePhaseTimerPaused    = "phase_timer_paused"
	MessageTypePhaseTimerResumed   = "phase_timer_resumed"
	MessageTypePhaseTimerCompleted = "phase_timer_completed"
	MessageTypePhaseTimerCheckin   = "phase_timer_checkin"
)

// TherapySessionUpdate represents a real-time update for therapy sessions
// This is the primary WebSocket message structure for all session updates
type TherapySessionUpdate struct {
	Type            string                 `json:"type"`                         // Message type (initial_state, session_updated, workflow_update, etc.)
	Phase           string                 `json:"phase,omitempty"`              // Current phase ID
	SessionStatus   string                 `json:"session_status,omitempty"`     // Session status (scheduled, active, completed)
	PhaseDataValues map[string]interface{} `json:"phase_data_values,omitempty"`  // Collected data values
	Phases          []Phase                `json:"phases,omitempty"`             // All phases with their schemas (sent in initial_state)
	RecentMessages  []Message              `json:"recent_messages,omitempty"`    // Recent chat messages (sent in initial_state)
	Message         *Message               `json:"message,omitempty"`            // New message (for message events)
	Metadata        map[string]interface{} `json:"metadata,omitempty"`           // For timer_update and other special events that need custom data
	Timestamp       time.Time              `json:"timestamp"`
}

// WorkflowStatusResponse represents the current workflow status
type WorkflowStatusResponse struct {
	CurrentState     string                       `json:"current_state"`
	SessionID        string                       `json:"session_id"`
	Phase            string                       `json:"phase"`
	PhaseDescription string                       `json:"phase_description"`
	PhaseData        []PhaseDataField             `json:"phase_data"`
	PhaseDataValues  map[string]interface{}       `json:"phase_data_values"`
	AvailableTools   []string                     `json:"available_tools"`
	Transitions      []TransitionOption           `json:"transitions"`
	SUDsLevel        int                          `json:"suds_level"`
	BodyLocation     string                       `json:"body_location"`
	EyePosition      string                       `json:"eye_position"`
	TimeInPhase      int                          `json:"time_in_phase_seconds"`
	NextActions      []string                     `json:"next_actions"`
	TimerState       *TimerStatus                 `json:"timer_state,omitempty"`
	Timestamp        time.Time                    `json:"timestamp"`
}

// TimerStatus represents the current timer state
type TimerStatus struct {
	Phase     string     `json:"phase"`
	State     TimerState `json:"state"`
	Elapsed   int        `json:"elapsed"`
	Remaining int        `json:"remaining"`
	Total     int        `json:"total"`
	Active    bool       `json:"active"`
}

// TimerEvent represents a timer-related event
type TimerEvent struct {
	Type       string           `json:"type"`
	SessionID  string           `json:"session_id"`
	Phase      string           `json:"phase"`
	State      TimerState       `json:"state"`
	StopReason *TimerStopReason `json:"stop_reason,omitempty"`
	Elapsed    int              `json:"elapsed"`
	Remaining  int              `json:"remaining"`
	Total      int              `json:"total"`
	Timestamp  time.Time        `json:"timestamp"`
}

// TimerState represents the current state of a timer
type TimerState string

const (
	TimerStateIdle      TimerState = "idle"       // Not started (pre-session)
	TimerStateRunning   TimerState = "running"    // Actively counting
	TimerStatePaused    TimerState = "paused"     // Temporarily paused
	TimerStateStopped   TimerState = "stopped"    // Stopped (any reason)
	TimerStateCompleted TimerState = "completed"  // Duration reached naturally
	TimerStateExpired   TimerState = "expired"    // Exceeded max duration
)

// TimerStopReason explains why a timer was stopped
type TimerStopReason string

const (
	StopReasonManual          TimerStopReason = "manual"           // User clicked stop
	StopReasonPhaseTransition TimerStopReason = "phase_transition" // Moving to next phase
	StopReasonSessionEnd      TimerStopReason = "session_end"      // Session terminated
	StopReasonTimeout         TimerStopReason = "timeout"          // Exceeded max duration
	StopReasonError           TimerStopReason = "error"            // Error occurred
	StopReasonCompleted       TimerStopReason = "completed"        // Natural completion
)

// Phase represents a therapy phase with its schema
type Phase struct {
	ID          string           `json:"id"`
	DisplayName string           `json:"display_name"`
	Description string           `json:"description"`
	Color       string           `json:"color,omitempty"`
	Icon        string           `json:"icon,omitempty"`
	PhaseData   []PhaseDataField `json:"phase_data"` // Schema for this phase
}

// PhaseDataField represents a data field required or optional for a phase
type PhaseDataField struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Required    bool   `json:"required"`
	DataType    string `json:"data_type"`
}

// TransitionOption represents an available phase transition
type TransitionOption struct {
	ToPhase     string `json:"to_phase"`
	Description string `json:"description"`
	Position    int    `json:"position"`
}

// Message represents a therapy session message
type Message struct {
	ID           string    `json:"id"`
	SessionID    string    `json:"session_id"`
	Content      string    `json:"content"`
	Role         string    `json:"role"` // "user", "assistant", "system"
	MessageType  string    `json:"message_type"`
	Metadata     string    `json:"metadata"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// ToolCallRequest represents an inbound tool call from frontend
type ToolCallRequest struct {
	ToolName  string                 `json:"tool_name"`
	Arguments map[string]interface{} `json:"arguments"`
}

// ToolCallResponse represents the response to a tool call
type ToolCallResponse struct {
	Success bool                   `json:"success"`
	Result  map[string]interface{} `json:"result,omitempty"`
	Error   string                 `json:"error,omitempty"`
}