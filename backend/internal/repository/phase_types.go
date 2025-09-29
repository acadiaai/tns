package repository

// PhaseType represents the type of interaction in a phase
type PhaseType string

const (
	// PhaseTypeConversational is a normal interactive phase with AI responses
	PhaseTypeConversational PhaseType = "conversational"

	// PhaseTypeTimedWaiting is a non-interactive waiting period
	PhaseTypeTimedWaiting PhaseType = "timed_waiting"

	// Could add more types in the future:
	// PhaseTypeGuidedMeditation
	// PhaseTypeAssessment
	// PhaseTypeVisualization
)

// IsInteractive returns whether this phase type allows user interaction
func (pt PhaseType) IsInteractive() bool {
	return pt == PhaseTypeConversational
}

// RequiresTimer returns whether this phase type needs a countdown timer
func (pt PhaseType) RequiresTimer() bool {
	return pt == PhaseTypeTimedWaiting
}

// VisualizationType represents the type of calming visualization during waiting
type VisualizationType string

const (
	VisualizationNone           VisualizationType = ""
	VisualizationBreathingCircle VisualizationType = "breathing_circle"
	VisualizationOceanWaves     VisualizationType = "ocean_waves"
	VisualizationFocusPoint     VisualizationType = "focus_point"
)