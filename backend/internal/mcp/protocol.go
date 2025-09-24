package mcp

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"therapy-navigation-system/internal/repository"
	"time"
)

// Note: The embed path is relative to the package location
// protocolJSON contains the embedded protocol configuration
var protocolJSON = []byte(`{
  "id": "brainspotting_8_stage_v1",
  "description": "Complete 8-stage brainspotting workflow with dynamic decision-making",
  "phases": [
    {
      "id": "issue_decision",
      "description": "Help the user decide on the issue to be worked on",
      "type": "instruction_based",
      "duration_sec": 300,
      "required_fields": ["selected_issue", "issue_clarity"],
      "prompts": [
        "What would you like to work on today?",
        "Is there a particular issue or feeling that's been on your mind?",
        "What's been coming up for you lately that feels important to address?"
      ],
      "advance_criteria": "user_readiness_and_clarity",
      "auto_advance": {"any": [{"fields_present": ["selected_issue", "issue_clarity"]}]}
    },
    {
      "id": "information_gathering",
      "description": "Gather essential information on issue history, current status, desired outcome",
      "type": "instruction_based",
      "duration_sec": 600,
      "required_fields": [
        "issue_history_when_started", "issue_history_got_worse", "issue_history_how",
        "current_life_impact", "current_worst_part", "current_what_done", "current_what_worked", "current_persistent",
        "desired_outcome_if_resolved"
      ],
      "prompts": [
        "When did this first start for you?",
        "When did it get worse, and how did that happen?",
        "How is this affecting your life right now?",
        "What's the worst part about this situation?", 
        "What have you tried to address this?",
        "What has worked, even a little bit?",
        "What persists despite your efforts?",
        "What would be different if this issue was completely resolved?"
      ],
      "advance_criteria": "sufficient_context_gathered",
      "auto_advance": {"any": [{"fields_present": ["issue_history_when_started", "current_life_impact", "desired_outcome_if_resolved"]}]}
    },
    {
      "id": "activation_and_setup",
      "description": "Two steps: activate the issue, then set up brainspot (SUDS + body location + eye position)",
      "type": "instruction_based",
      "duration_sec": 600,
      "steps": [
        {
          "step": "activation",
          "description": "Ask user to step into the issue so its effect can be embodied",
          "required_fields": ["issue_activated", "embodied_sensation"],
          "prompts": [
            "I'd like you to step into this issue now - think about it directly",
            "Let yourself feel whatever comes up when you connect with this",
            "Notice what happens in your body as you think about this situation"
          ]
        },
        {
          "step": "brainspot_setup", 
          "description": "Establish SUDS + body location + eye position",
          "required_fields": ["suds_level", "body_location", "eye_position"],
          "prompts": [
            "On a scale of 0-10, how intense is this feeling right now?",
            "Where do you feel this in your body?",
            "Let your eyes find a spot that feels connected to this feeling"
          ]
        }
      ],
      "advance_criteria": "brainspot_established",
      "auto_advance": {"any": [{"fields_present": ["issue_activated", "suds_level", "body_location", "eye_position"]}]}
    },
    {
      "id": "focused_mindfulness",
      "description": "Stay with brainspot, observe passively with no analysis or control",
      "type": "timed_with_checkins",
      "duration_sec": 900,
      "check_in_interval_sec": 180,
      "max_duration_sec": 1200,
      "instructions": [
        "Stay with the brainspot - the SUDS, body location, and eye position",
        "Only observe and allow all that comes freely and passively",
        "No analysis, no assertion of control, no filtering",
        "Don't look for something logical or that makes sense",
        "Just notice and allow whatever wants to happen"
      ],
      "prompts": [
        "Just stay with that spot and notice whatever comes up",
        "Allow whatever wants to happen to happen",
        "You don't need to do anything - just observe"
      ],
      "advance_criteria": "time_elapsed_or_natural_transition",
      "auto_advance": {"any": [{"time_elapsed_sec": 300}]}
    },
    {
      "id": "status_check_loop",
      "description": "Check-in every 3-5 minutes for status report and SUDS - may loop for 20min total",
      "type": "assessment_loop",
      "duration_sec": 900,
      "check_in_interval_sec": 240,
      "max_total_duration_sec": 1200,
      "required_fields": ["observed_experience", "current_suds"],
      "prompts": [
        "What are you noticing now?",
        "How intense is the feeling on that 0-10 scale?",
        "What's happening in your body?",
        "Just describe whatever you're experiencing"
      ],
      "decision_criteria": {
        "continue_mindfulness": "suds_decreasing_or_stable_and_time_remaining",
        "micro_reprocessing": "suds_above_0_after_20min", 
        "squeeze_lemon": "suds_equals_0"
      },
      "auto_advance": {
        "any": [
          {"time_elapsed_sec": 1200}, 
          {"suds_threshold": {"op": "<=", "value": 0}}
        ]
      }
    },
    {
      "id": "micro_reprocessing",
      "description": "De-escalation, re-orientation, relaxation tasks when SUDS >0 after 20min",
      "type": "intervention_based",
      "duration_sec": 300,
      "interventions": ["grounding", "reorientation", "relaxation", "resource_access"],
      "required_fields": ["intervention_applied", "post_intervention_suds"],
      "prompts": [
        "Let's try a grounding exercise to help settle your system",
        "Take a moment to orient yourself to the room around you",
        "Let's access a positive resource or memory",
        "Notice your feet on the floor and your breath"
      ],
      "return_to": "focused_mindfulness",
      "advance_criteria": "intervention_complete_return_to_mindfulness",
      "auto_advance": {"any": [{"time_elapsed_sec": 600}, {"fields_present": ["intervention_applied"]}]}
    },
    {
      "id": "squeeze_lemon",
      "description": "Re-expose to detailed original stress events until SUDS=0 confirmed",
      "type": "exposure_based",
      "duration_sec": 600,
      "required_fields": ["original_stress_exposure", "final_suds_confirmation"],
      "prompts": [
        "Think back to the original situation that created this stress",
        "Go into the details of what happened",
        "Notice what comes up as you revisit those details",
        "How are you feeling now with that memory?",
        "Is there any activation left around this original event?"
      ],
      "advance_criteria": "suds_confirmed_zero",
      "auto_advance": {"any": [{"fields_present": ["final_suds_confirmation"]}, {"suds_threshold": {"op": "<=", "value": 0}}]}
    },
    {
      "id": "expansion",
      "description": "Carry no-activation state into all life spaces",
      "type": "integration_based",
      "duration_sec": 300,
      "required_fields": ["life_integration_plan", "state_generalization"],
      "prompts": [
        "How does this peaceful state feel?",
        "Imagine taking this calm feeling into your daily life",
        "What would be different in your work with this new state?",
        "How would your relationships change if you carried this feeling forward?",
        "What would you do differently in your day-to-day activities?"
      ],
      "advance_criteria": "integration_complete",
      "auto_advance": {"any": [{"time_elapsed_sec": 600}, {"fields_present": ["life_integration_plan", "state_generalization"]}]}
    },
    {
      "id": "complete",
      "description": "Session completion and grounding",
      "type": "completion",
      "duration_sec": 180,
      "required_fields": ["session_summary", "client_feedback"],
      "prompts": [
        "Let's take a moment to ground and close",
        "How are you feeling right now?",
        "What stands out most from this session?",
        "Is there anything you need before we finish?"
      ],
      "auto_advance": {"any": [{"time_elapsed_sec": 300}]}
    }
  ]
}`)

// Phase represents a therapy session phase
type Phase struct {
	ID                  string            `json:"id"`
	DurationSec         int               `json:"duration_sec"`
	RequiredFields      []string          `json:"required_fields"`
	CheckInIntervalSec  int               `json:"check_in_interval_sec"`
	Prompts             []string          `json:"prompts"`
	AutoAdvance         map[string]interface{} `json:"auto_advance"`
}

// Protocol represents the complete therapy protocol
type Protocol struct {
	ID     string  `json:"id"`
	Phases []Phase `json:"phases"`
}

// ProtocolService manages therapy protocol configuration
type ProtocolService struct {
	protocol *Protocol
	phaseMap map[string]*Phase
}

// NewProtocolService creates and initializes a protocol service
func NewProtocolService() (*ProtocolService, error) {
	var protocol Protocol
	if err := json.Unmarshal(protocolJSON, &protocol); err != nil {
		return nil, fmt.Errorf("failed to parse protocol JSON: %w", err)
	}

	// Validate protocol
	if protocol.ID == "" {
		return nil, fmt.Errorf("protocol ID is required")
	}
	if len(protocol.Phases) == 0 {
		return nil, fmt.Errorf("protocol must have at least one phase")
	}

	// Build phase map for quick lookup
	phaseMap := make(map[string]*Phase)
	for i := range protocol.Phases {
		phase := &protocol.Phases[i]
		if phase.ID == "" {
			return nil, fmt.Errorf("phase at index %d has no ID", i)
		}
		if phase.DurationSec <= 0 {
			return nil, fmt.Errorf("phase %s has invalid duration: %d", phase.ID, phase.DurationSec)
		}
		phaseMap[phase.ID] = phase
	}

	return &ProtocolService{
		protocol: &protocol,
		phaseMap: phaseMap,
	}, nil
}

// GetPhase returns a phase by ID
func (s *ProtocolService) GetPhase(phaseID string) (*Phase, error) {
	phase, exists := s.phaseMap[phaseID]
	if !exists {
		return nil, fmt.Errorf("phase %s not found", phaseID)
	}
	return phase, nil
}

// GetPhaseDuration returns the duration for a phase
func (s *ProtocolService) GetPhaseDuration(phaseID string) (time.Duration, error) {
	phase, err := s.GetPhase(phaseID)
	if err != nil {
		return 0, err
	}
	return time.Duration(phase.DurationSec) * time.Second, nil
}

// GetCheckInInterval returns the check-in interval for a phase
func (s *ProtocolService) GetCheckInInterval(phaseID string) (time.Duration, error) {
	phase, err := s.GetPhase(phaseID)
	if err != nil {
		return 0, err
	}
	if phase.CheckInIntervalSec == 0 {
		return 0, nil // No check-ins for this phase
	}
	return time.Duration(phase.CheckInIntervalSec) * time.Second, nil
}

// GetRequiredFields returns the required fields for a phase
func (s *ProtocolService) GetRequiredFields(phaseID string) ([]string, error) {
	phase, err := s.GetPhase(phaseID)
	if err != nil {
		return nil, err
	}
	return phase.RequiredFields, nil
}

// GetPhasePrompts returns the prompts for a phase
func (s *ProtocolService) GetPhasePrompts(phaseID string) ([]string, error) {
	phase, err := s.GetPhase(phaseID)
	if err != nil {
		return nil, err
	}
	return phase.Prompts, nil
}

// GetNextPhase determines the next phase based on current phase
func (s *ProtocolService) GetNextPhase(currentPhaseID string) (string, error) {
	// Find current phase index
	currentIndex := -1
	for i, phase := range s.protocol.Phases {
		if phase.ID == currentPhaseID {
			currentIndex = i
			break
		}
	}

	if currentIndex == -1 {
		return "", fmt.Errorf("current phase %s not found", currentPhaseID)
	}

	// Return next phase if available
	if currentIndex+1 < len(s.protocol.Phases) {
		return s.protocol.Phases[currentIndex+1].ID, nil
	}

	return "", nil // No next phase (session complete)
}

// GetAllPhases returns all phases in order
func (s *ProtocolService) GetAllPhases() []Phase {
	return s.protocol.Phases
}

// ValidatePhaseTransition checks if a transition is valid
func (s *ProtocolService) ValidatePhaseTransition(fromPhase, toPhase string) error {
	// Load phases from database instead of hardcoded protocol
	var dbPhases []repository.Phase
	if err := repository.DB.Find(&dbPhases).Error; err == nil && len(dbPhases) > 0 {
		// Check if phases exist in database
		fromValid := false
		toValid := false
		for _, phase := range dbPhases {
			if phase.ID == fromPhase {
				fromValid = true
			}
			if phase.ID == toPhase {
				toValid = true
			}
		}
		if !fromValid {
			return fmt.Errorf("invalid source phase: phase %s not found in database", fromPhase)
		}
		if !toValid {
			return fmt.Errorf("invalid target phase: phase %s not found in database", toPhase)
		}
		return nil
	}

	// Fallback to protocol if database is empty
	if _, err := s.GetPhase(fromPhase); err != nil {
		return fmt.Errorf("invalid source phase: %w", err)
	}
	if _, err := s.GetPhase(toPhase); err != nil {
		return fmt.Errorf("invalid target phase: %w", err)
	}
	return nil
}