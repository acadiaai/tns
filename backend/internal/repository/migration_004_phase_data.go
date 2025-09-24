package repository

import (
	"time"
	"gorm.io/gorm"
)

// migrate004PhaseData creates phase data requirements for each phase
func migrate004PhaseData(db *gorm.DB) error {
	requirements := []PhaseData{
		// Pre-session
		{ID: "pre_session_consent_given", PhaseID: "pre_session", Name: "consent_given", Required: true,
			Description: "Explicit consent to begin session",
			Schema: `{"type": "boolean", "description": "Explicit consent to begin session"}`},

		// Issue decision
		{ID: "issue_decision_selected_issue", PhaseID: "issue_decision", Name: "selected_issue", Required: true,
			Description: "The issue to work on",
			Schema: `{"type": "string", "description": "The issue to work on"}`},
		{ID: "issue_decision_issue_intensity", PhaseID: "issue_decision", Name: "issue_intensity", Required: true,
			Description: "Initial intensity (0-10)",
			Schema: `{"type": "integer", "min": 0, "max": 10, "description": "Initial intensity"}`},
		{ID: "issue_decision_activation_present", PhaseID: "issue_decision", Name: "activation_present", Required: false,
			Description: "Whether activation is present",
			Schema: `{"type": "boolean", "description": "Whether activation is present"}`},

		// Information gathering
		{ID: "information_gathering_suds_level", PhaseID: "information_gathering", Name: "suds_level", Required: true,
			Description: "Subjective Units of Distress (0-10)",
			Schema: `{"type": "integer", "min": 0, "max": 10, "description": "Subjective Units of Distress"}`},
		{ID: "information_gathering_history", PhaseID: "information_gathering", Name: "history", Required: false,
			Description: "When issue started",
			Schema: `{"type": "string", "description": "When issue started"}`},
		{ID: "information_gathering_negative_cognition", PhaseID: "information_gathering", Name: "negative_cognition", Required: false,
			Description: "Negative belief about self",
			Schema: `{"type": "string", "description": "Negative belief about self"}`},

		// Body scan
		{ID: "body_scan_body_location", PhaseID: "body_scan", Name: "body_location", Required: true,
			Description: "Where activation is felt in body",
			Schema: `{"type": "string", "description": "Where activation is felt in body"}`},
		{ID: "body_scan_sensation_quality", PhaseID: "body_scan", Name: "sensation_quality", Required: false,
			Description: "Quality of sensation",
			Schema: `{"type": "string", "description": "Quality of sensation"}`},
		{ID: "body_scan_activation_level", PhaseID: "body_scan", Name: "activation_level", Required: true,
			Description: "Body activation level (0-10)",
			Schema: `{"type": "integer", "min": 0, "max": 10, "description": "Body activation level"}`},

		// Eye position
		{ID: "eye_position_brainspot_x", PhaseID: "eye_position", Name: "brainspot_x", Required: true,
			Description: "Horizontal eye position (-1 to 1)",
			Schema: `{"type": "number", "min": -1, "max": 1, "description": "Horizontal eye position"}`},
		{ID: "eye_position_brainspot_y", PhaseID: "eye_position", Name: "brainspot_y", Required: true,
			Description: "Vertical eye position (-1 to 1)",
			Schema: `{"type": "number", "min": -1, "max": 1, "description": "Vertical eye position"}`},
		{ID: "eye_position_spot_type", PhaseID: "eye_position", Name: "spot_type", Required: false,
			Description: "Type of brainspot (activation or resource)",
			Schema: `{"type": "string", "enum": ["activation", "resource"], "description": "Type of brainspot"}`},

		// Focused mindfulness
		{ID: "focused_mindfulness_processing_time", PhaseID: "focused_mindfulness", Name: "processing_time_minutes", Required: true,
			Description: "Processing duration in minutes",
			Schema: `{"type": "integer", "min": 1, "max": 30, "description": "Processing duration in minutes"}`},
		{ID: "focused_mindfulness_observations", PhaseID: "focused_mindfulness", Name: "processing_observations", Required: false,
			Description: "Key observations during processing",
			Schema: `{"type": "string", "description": "Key observations during processing"}`},
		{ID: "focused_mindfulness_shifts", PhaseID: "focused_mindfulness", Name: "shifts_noted", Required: false,
			Description: "Shifts or changes observed",
			Schema: `{"type": "string", "description": "Shifts or changes observed"}`},

		// Status check
		{ID: "status_check_suds_current", PhaseID: "status_check", Name: "suds_current", Required: true,
			Description: "Current SUDS level (0-10)",
			Schema: `{"type": "integer", "min": 0, "max": 10, "description": "Current SUDS level"}`},
		{ID: "status_check_next_action", PhaseID: "status_check", Name: "next_action", Required: true,
			Description: "Next phase to transition to",
			Schema: `{"type": "string", "enum": ["focused_mindfulness", "squeeze_hug", "positive_installation", "complete"], "description": "Next phase to transition to"}`},

		// Squeeze hug (bilateral stimulation)
		{ID: "squeeze_hug_bilateral_completed", PhaseID: "squeeze_hug", Name: "bilateral_completed", Required: true,
			Description: "Bilateral stimulation completed",
			Schema: `{"type": "boolean", "description": "Bilateral stimulation completed"}`},
		{ID: "squeeze_hug_bilateral_effect", PhaseID: "squeeze_hug", Name: "bilateral_effect", Required: false,
			Description: "Effect of bilateral stimulation",
			Schema: `{"type": "string", "description": "Effect of bilateral stimulation"}`},
		{ID: "squeeze_hug_suds_after", PhaseID: "squeeze_hug", Name: "suds_after_bilateral", Required: false,
			Description: "SUDS after bilateral (0-10)",
			Schema: `{"type": "integer", "min": 0, "max": 10, "description": "SUDS after bilateral"}`},

		// Positive installation
		{ID: "positive_installation_positive_belief", PhaseID: "positive_installation", Name: "positive_belief", Required: true,
			Description: "Positive belief to install",
			Schema: `{"type": "string", "description": "Positive belief to install"}`},
		{ID: "positive_installation_voc_rating", PhaseID: "positive_installation", Name: "voc_rating", Required: false,
			Description: "Validity of Cognition (1-7)",
			Schema: `{"type": "integer", "min": 1, "max": 7, "description": "Validity of Cognition"}`},

		// Complete
		{ID: "complete_final_suds", PhaseID: "complete", Name: "final_suds", Required: true,
			Description: "Final SUDS level (0-10)",
			Schema: `{"type": "integer", "min": 0, "max": 10, "description": "Final SUDS level"}`},
		{ID: "complete_session_notes", PhaseID: "complete", Name: "session_notes", Required: false,
			Description: "Session summary and notes",
			Schema: `{"type": "string", "description": "Session summary and notes"}`},
		{ID: "complete_future_focus", PhaseID: "complete", Name: "future_focus", Required: false,
			Description: "Future template or focus",
			Schema: `{"type": "string", "description": "Future template or focus"}`},
	}

	for _, req := range requirements {
		req.CreatedAt = time.Now()
		req.UpdatedAt = time.Now()
		db.FirstOrCreate(&req, PhaseData{ID: req.ID})
	}

	return nil
}
