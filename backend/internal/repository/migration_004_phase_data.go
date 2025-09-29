package repository

import (
	"time"
	"gorm.io/gorm"
)

// migrate004PhaseData creates phase data requirements for each phase
func migrate004PhaseData(db *gorm.DB) error {
	requirements := []PhaseData{
		// Pre-session
		{ID: "consent_given", PhaseID: "pre_session", Name: "consent_given", Required: true,
			Description: "Explicit consent to begin session",
			Schema: `{"type": "boolean", "description": "Explicit consent to begin session"}`},

		// Stage 1: Deciding an issue
		{ID: "selected_issue", PhaseID: "stage_1_deciding_issue", Name: "selected_issue", Required: true,
			Description: "The issue to work on",
			Schema: `{"type": "string", "description": "The issue to work on"}`},
		{ID: "issue_intensity", PhaseID: "stage_1_deciding_issue", Name: "issue_intensity", Required: true,
			Description: "Initial intensity (0-10)",
			Schema: `{"type": "integer", "min": 0, "max": 10, "description": "Initial intensity"}`},

		// Stage 2: Information gathering
		{ID: "initial_suds", PhaseID: "stage_2_information_gathering", Name: "suds_level", Required: true,
			Description: "Subjective Units of Distress (0-10)",
			Schema: `{"type": "integer", "min": 0, "max": 10, "description": "Subjective Units of Distress"}`},
		{ID: "history", PhaseID: "stage_2_information_gathering", Name: "history", Required: false,
			Description: "When issue started",
			Schema: `{"type": "string", "description": "When issue started"}`},
		{ID: "negative_cognition", PhaseID: "stage_2_information_gathering", Name: "negative_cognition", Required: false,
			Description: "Negative belief about self",
			Schema: `{"type": "string", "description": "Negative belief about self"}`},

		// Stage 3: Activating & Setup (includes body scan and eye position)
		{ID: "body_location", PhaseID: "stage_3_activating_setup", Name: "body_location", Required: true,
			Description: "Where activation is felt in body",
			Schema: `{"type": "string", "description": "Where activation is felt in body"}`},
		{ID: "sensation_quality", PhaseID: "stage_3_activating_setup", Name: "sensation_quality", Required: false,
			Description: "Quality of sensation",
			Schema: `{"type": "string", "description": "Quality of sensation"}`},
		{ID: "activation_level", PhaseID: "stage_3_activating_setup", Name: "activation_level", Required: true,
			Description: "Body activation level (0-10)",
			Schema: `{"type": "integer", "min": 0, "max": 10, "description": "Body activation level"}`},

		// Stage 3 continued: Eye position
		{ID: "brainspot_x", PhaseID: "stage_3_activating_setup", Name: "brainspot_x", Required: true,
			Description: "Horizontal eye position (-1 to 1)",
			Schema: `{"type": "number", "min": -1, "max": 1, "description": "Horizontal eye position"}`},
		{ID: "brainspot_y", PhaseID: "stage_3_activating_setup", Name: "brainspot_y", Required: true,
			Description: "Vertical eye position (-1 to 1)",
			Schema: `{"type": "number", "min": -1, "max": 1, "description": "Vertical eye position"}`},
		{ID: "spot_type", PhaseID: "stage_3_activating_setup", Name: "spot_type", Required: false,
			Description: "Type of brainspot (activation or resource)",
			Schema: `{"type": "string", "enum": ["activation", "resource"], "description": "Type of brainspot"}`},

		// Stage 4: Focused mindfulness
		{ID: "processing_time", PhaseID: "stage_4_focused_mindfulness", Name: "processing_time_minutes", Required: true,
			Description: "Processing duration in minutes",
			Schema: `{"type": "integer", "min": 1, "max": 30, "description": "Processing duration in minutes"}`},
		{ID: "observations", PhaseID: "stage_4_focused_mindfulness", Name: "processing_observations", Required: false,
			Description: "Key observations during processing",
			Schema: `{"type": "string", "description": "Key observations during processing"}`},
		{ID: "shifts_noted", PhaseID: "stage_4_focused_mindfulness", Name: "shifts_noted", Required: false,
			Description: "Shifts or changes observed",
			Schema: `{"type": "string", "description": "Shifts or changes observed"}`},

		// Stage 5: Checking In
		{ID: "current_suds", PhaseID: "stage_5_checking_in", Name: "suds_current", Required: true,
			Description: "Current SUDS level (0-10)",
			Schema: `{"type": "integer", "min": 0, "max": 10, "description": "Current SUDS level"}`},
		{ID: "next_action", PhaseID: "stage_5_checking_in", Name: "next_action", Required: true,
			Description: "Next phase to transition to",
			Schema: `{"type": "string", "enum": ["continue_processing", "micro_reprocessing", "squeeze_lemon"], "description": "Next phase to transition to"}`},
		{ID: "check_in_observations", PhaseID: "stage_5_checking_in", Name: "observations", Required: false,
			Description: "What did you observe during processing?",
			Schema: `{"type": "string", "description": "Observations from processing"}`},

		// Stage 6: Micro-reprocessing
		{ID: "micro_technique", PhaseID: "stage_6_micro_reprocessing", Name: "technique_used", Required: true,
			Description: "De-escalation technique applied",
			Schema: `{"type": "string", "enum": ["bilateral_sound", "breathing", "grounding", "resource_spot"], "description": "Technique used for de-escalation"}`},
		{ID: "micro_effectiveness", PhaseID: "stage_6_micro_reprocessing", Name: "effectiveness", Required: false,
			Description: "How effective was the technique?",
			Schema: `{"type": "string", "description": "Effectiveness of the technique"}`},

		// Stage 7: Squeeze Lemon
		{ID: "detailed_exposure", PhaseID: "stage_7_squeeze_lemon", Name: "detailed_events", Required: true,
			Description: "Detailed exposure to confirm zero activation",
			Schema: `{"type": "string", "description": "Description of detailed exposure"}`},
		{ID: "final_activation", PhaseID: "stage_7_squeeze_lemon", Name: "activation_level", Required: true,
			Description: "Final activation level (should be 0)",
			Schema: `{"type": "integer", "min": 0, "max": 10, "description": "Final activation level"}`},

		// Stage 8: Expansion
		{ID: "positive_cognition", PhaseID: "stage_8_expansion", Name: "positive_cognition", Required: true,
			Description: "Positive belief to install",
			Schema: `{"type": "string", "description": "Positive belief about self"}`},
		{ID: "voc_rating", PhaseID: "stage_8_expansion", Name: "voc_rating", Required: true,
			Description: "Validity of Cognition (1-7)",
			Schema: `{"type": "integer", "min": 1, "max": 7, "description": "How true does the positive cognition feel?"}`},
		{ID: "future_template", PhaseID: "stage_8_expansion", Name: "future_template", Required: false,
			Description: "Future situations to imagine with new state",
			Schema: `{"type": "string", "description": "Future scenarios to integrate"}`},

		// Completion phase
		{ID: "final_suds", PhaseID: "completion", Name: "final_suds", Required: true,
			Description: "Final SUDS level (0-10)",
			Schema: `{"type": "integer", "min": 0, "max": 10, "description": "Final SUDS level"}`},
		{ID: "session_notes", PhaseID: "completion", Name: "session_notes", Required: false,
			Description: "Session summary and notes",
			Schema: `{"type": "string", "description": "Session summary and notes"}`},
	}

	for _, req := range requirements {
		req.CreatedAt = time.Now()
		req.UpdatedAt = time.Now()
		db.FirstOrCreate(&req, PhaseData{ID: req.ID})
	}

	return nil
}
