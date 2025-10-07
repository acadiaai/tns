package repository

import (
	"time"
	"gorm.io/gorm"
)

// migrate003PhaseTransitions creates Quan's 8-stage workflow transitions with loops
func migrate003PhaseTransitions(db *gorm.DB) error {
	transitions := []PhaseTransition{
		// Pre-session to Stage 1
		{FromPhaseID: "pre_session", ToPhaseID: "stage_1_deciding_issue"},

		// Linear progression for first 3 stages
		{FromPhaseID: "stage_1_deciding_issue", ToPhaseID: "stage_2_information_gathering"},
		{FromPhaseID: "stage_2_information_gathering", ToPhaseID: "stage_3_activating_setup"},
		{FromPhaseID: "stage_3_activating_setup", ToPhaseID: "stage_4_focused_mindfulness"},

		// Stage 4 (Mindfulness) always goes to Stage 5 (Check-in)
		{FromPhaseID: "stage_4_focused_mindfulness", ToPhaseID: "stage_5_checking_in"},

		// Stage 5 (Check-in) decision tree based on SUDs:
		// - Back to Stage 4 if SUDs > 0 (priority 1 - checked first)
		{FromPhaseID: "stage_5_checking_in", ToPhaseID: "stage_4_focused_mindfulness", Condition: "suds_current > 0", Priority: 1},
		// - To Stage 6 if SUDs > 0 and time >= 20 min (DISABLED for speedrunning - time-based logic not implemented yet)
		{FromPhaseID: "stage_5_checking_in", ToPhaseID: "stage_6_micro_reprocessing", Condition: "", Priority: 0, IsActive: false},
		// - To Stage 7 if SUDs = 0 (priority 2)
		{FromPhaseID: "stage_5_checking_in", ToPhaseID: "stage_7_squeeze_lemon", Condition: "suds_current = 0", Priority: 2},

		// Stage 6 (Micro-reprocessing) decision tree:
		// - Back to Stage 4 if SUDs > 0 after intervention (priority 1)
		{FromPhaseID: "stage_6_micro_reprocessing", ToPhaseID: "stage_4_focused_mindfulness", Condition: "suds_current > 0", Priority: 1},
		// - To Stage 7 if SUDs = 0 (priority 2)
		{FromPhaseID: "stage_6_micro_reprocessing", ToPhaseID: "stage_7_squeeze_lemon", Condition: "suds_current = 0", Priority: 2},

		// Stage 7 (Squeeze Lemon) to Stage 8 (Expansion)
		{FromPhaseID: "stage_7_squeeze_lemon", ToPhaseID: "stage_8_expansion"},

		// Stage 8 (Expansion) to Completion
		{FromPhaseID: "stage_8_expansion", ToPhaseID: "completion"},
	}

	for _, trans := range transitions {
		// Create a copy to avoid modifying the loop variable
		transition := PhaseTransition{
			ID:          trans.FromPhaseID + "_to_" + trans.ToPhaseID,
			FromPhaseID: trans.FromPhaseID,
			ToPhaseID:   trans.ToPhaseID,
			Condition:   trans.Condition,
			Priority:    trans.Priority,
			IsActive:    trans.IsActive,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}

		// If IsActive is not explicitly set to false, default to true
		if !trans.IsActive && trans.Condition == "" && trans.Priority == 0 {
			// This is a default transition (no explicit IsActive set)
			transition.IsActive = true
		}

		if err := db.FirstOrCreate(&transition, PhaseTransition{
			FromPhaseID: transition.FromPhaseID,
			ToPhaseID:   transition.ToPhaseID,
		}).Error; err != nil {
			return err
		}
	}

	return nil
}