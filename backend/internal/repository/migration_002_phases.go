package repository

import (
	"time"
	"gorm.io/gorm"
)

// migrate002Phases creates all 10 brainspotting phases
func migrate002Phases(db *gorm.DB) error {
	phases := []Phase{
		// Phase 1: Pre-Session
		{
			ID:                         "pre_session",
			DisplayName:                "Pre-Session",
			Description:                "Build rapport and prepare for session",
			Position:                   1,
			MinimumTurns:               1,
			RecommendedDurationSeconds: 120, // 2 minutes
			Icon:                       "Hand",
			Color:                      "#0096FF", // Blue
		},
		// Phase 2: Issue Selection
		{
			ID:                         "issue_decision",
			DisplayName:                "Issue Selection",
			Description:                "Identify and select focus area",
			Position:                   2,
			MinimumTurns:               3,
			RecommendedDurationSeconds: 300, // 5 minutes
			Icon:                       "Target",
			Color:                      "#635BFF", // Stripe purple
		},
		// Phase 3: Information Gathering
		{
			ID:                         "information_gathering",
			DisplayName:                "Information Gathering",
			Description:                "Gather details about the issue",
			Position:                   3,
			MinimumTurns:               4,
			RecommendedDurationSeconds: 300, // 5 minutes
			Icon:                       "BarChart2",
			Color:                      "#00D4FF", // Cyan blue
		},
		// Phase 4: Body Scan
		{
			ID:                         "body_scan",
			DisplayName:                "Body Scan",
			Description:                "Identify body sensations and activation",
			Position:                   4,
			MinimumTurns:               3,
			RecommendedDurationSeconds: 180, // 3 minutes
			Icon:                       "User",
			Color:                      "#FF5E00", // Deep orange
		},
		// Phase 5: Eye Position
		{
			ID:                         "eye_position",
			DisplayName:                "Eye Position",
			Description:                "Find the brainspot",
			Position:                   5,
			MinimumTurns:               3,
			RecommendedDurationSeconds: 240, // 4 minutes
			Icon:                       "Eye",
			Color:                      "#E91E63", // Pink
		},
		// Phase 6: Focused Mindfulness
		{
			ID:                         "focused_mindfulness",
			DisplayName:                "Focused Mindfulness",
			Description:                "Processing and integration",
			Position:                   6,
			MinimumTurns:               5,
			RecommendedDurationSeconds: 600, // 10 minutes (longer processing)
			Icon:                       "Brain",
			Color:                      "#00BFA5", // Teal
		},
		// Phase 7: Status Check
		{
			ID:                         "status_check",
			DisplayName:                "Status Check",
			Description:                "Check progress and determine next steps",
			Position:                   7,
			MinimumTurns:               2,
			RecommendedDurationSeconds: 120, // 2 minutes
			Icon:                       "TrendingUp",
			Color:                      "#00E676", // Green
		},
		// Phase 8: Squeeze Hug
		{
			ID:                         "squeeze_hug",
			DisplayName:                "Squeeze Hug",
			Description:                "Bilateral stimulation for integration",
			Position:                   8,
			MinimumTurns:               3,
			RecommendedDurationSeconds: 180, // 3 minutes
			Icon:                       "Heart",
			Color:                      "#FF6B35", // Warm orange
		},
		// Phase 9: Positive Installation
		{
			ID:                         "positive_installation",
			DisplayName:                "Positive Installation",
			Description:                "Install positive beliefs and resources",
			Position:                   9,
			MinimumTurns:               3,
			RecommendedDurationSeconds: 240, // 4 minutes
			Icon:                       "Sparkles",
			Color:                      "#7C4DFF", // Deep purple
		},
		// Phase 10: Complete
		{
			ID:                         "complete",
			DisplayName:                "Session Wrap-Up",
			Description:                "Closure and integration of session work",
			Position:                   10,
			MinimumTurns:               2,
			RecommendedDurationSeconds: 120, // 2 minutes
			Icon:                       "CheckCircle2",
			Color:                      "#10b981", // Bright green
		},
	}

	for _, phase := range phases {
		phase.CreatedAt = time.Now()
		phase.UpdatedAt = time.Now()
		db.FirstOrCreate(&phase, Phase{ID: phase.ID})
	}

	return nil
}