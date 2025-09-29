package repository

import (
	"time"
	"gorm.io/gorm"
)

// migrate002Phases creates the brainspotting workflow with pre-session
func migrate002Phases(db *gorm.DB) error {
	// Complete workflow including pre-session
	phases := []Phase{
		// Pre-Session: Consent and rapport
		{
			ID:                         "pre_session",
			DisplayName:                "Pre-Session",
			Description:                "Build rapport and obtain consent",
			Position:                   1,
			MinimumTurns:               1,
			RecommendedDurationSeconds: 120, // 2 minutes
			Icon:                       "Hand",
			Color:                      "#9E9E9E",
		},
		// Stage 1: Deciding an Issue
		{
			ID:                         "stage_1_deciding_issue",
			DisplayName:                "Deciding an Issue",
			Description:                "What troubles you? What needs improvement? What's difficult to achieve?",
			Position:                   2,
			MinimumTurns:               2,
			RecommendedDurationSeconds: 180, // 3 minutes
			Icon:                       "Target",
			Color:                      "#4CAF50",
		},
		// Stage 2: Information Gathering
		{
			ID:                         "stage_2_information_gathering",
			DisplayName:                "Information Gathering",
			Description:                "History (when started/worsened), current status (impacts), desired outcome",
			Position:                   3,
			MinimumTurns:               3,
			RecommendedDurationSeconds: 300, // 5 minutes
			Icon:                       "BarChart2",
			Color:                      "#2196F3",
		},
		// Stage 3: Activating & Setup (SUDs + Body + Eye)
		{
			ID:                         "stage_3_activating_setup",
			DisplayName:                "Activating & Setup",
			Description:                "Activate issue, rate SUDs (0-10), find body location, locate eye position",
			Position:                   4,
			MinimumTurns:               3,
			RecommendedDurationSeconds: 240, // 4 minutes
			Icon:                       "Eye",
			Color:                      "#FF9800",
		},
		// Stage 4: Focused Mindfulness (TIMED WAITING)
		{
			ID:                         "stage_4_focused_mindfulness",
			DisplayName:                "Focused Mindfulness",
			Description:                "Stay with brainspot, observe freely, no analysis or control",
			Position:                   5,
			MinimumTurns:               0, // No conversation - it's a waiting phase!
			RecommendedDurationSeconds: 180, // 3 minutes per cycle
			Icon:                       "Brain",
			Color:                      "#9C27B0",
		},
		// Stage 5: Checking In
		{
			ID:                         "stage_5_checking_in",
			DisplayName:                "Checking In",
			Description:                "What did you observe? Current SUDs? Continue or transition?",
			Position:                   6,
			MinimumTurns:               2,
			RecommendedDurationSeconds: 120, // 2 minutes
			Icon:                       "TrendingUp",
			Color:                      "#00BCD4",
		},
		// Stage 6: Micro-reprocessing (if needed after 20 min)
		{
			ID:                         "stage_6_micro_reprocessing",
			DisplayName:                "Micro-reprocessing",
			Description:                "De-escalate, reorient, or relax if SUDs persists after 20 minutes",
			Position:                   7,
			MinimumTurns:               2,
			RecommendedDurationSeconds: 180, // 3 minutes
			Icon:                       "Heart",
			Color:                      "#FFEB3B",
		},
		// Stage 7: Squeeze Lemon/Confirm Zero
		{
			ID:                         "stage_7_squeeze_lemon",
			DisplayName:                "Squeeze Lemon",
			Description:                "Expose to detailed events to confirm SUDs = 0",
			Position:                   8,
			MinimumTurns:               2,
			RecommendedDurationSeconds: 180, // 3 minutes
			Icon:                       "CheckCircle2",
			Color:                      "#8BC34A",
		},
		// Stage 8: Expansion
		{
			ID:                         "stage_8_expansion",
			DisplayName:                "Expansion",
			Description:                "Integrate zero activation state into all life spaces",
			Position:                   9,
			MinimumTurns:               3,
			RecommendedDurationSeconds: 240, // 4 minutes
			Icon:                       "Sparkles",
			Color:                      "#E91E63",
		},
		// Completion: Session wrap-up and next steps
		{
			ID:                         "completion",
			DisplayName:                "Session Complete",
			Description:                "Wrap up the session, discuss insights, and plan next steps",
			Position:                   10,
			MinimumTurns:               2,
			RecommendedDurationSeconds: 180, // 3 minutes
			Icon:                       "CheckCircle",
			Color:                      "#4CAF50",
		},
	}

	for _, phase := range phases {
		phase.CreatedAt = time.Now()
		phase.UpdatedAt = time.Now()
		db.FirstOrCreate(&phase, Phase{ID: phase.ID})
	}

	return nil
}