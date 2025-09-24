package repository

import (
	"time"
	"gorm.io/gorm"
)

// migrate003PhaseTransitions creates the workflow transitions
func migrate003PhaseTransitions(db *gorm.DB) error {
	transitions := []PhaseTransition{
		// Linear progression path
		{FromPhaseID: "pre_session", ToPhaseID: "issue_decision"},
		{FromPhaseID: "issue_decision", ToPhaseID: "information_gathering"},
		{FromPhaseID: "information_gathering", ToPhaseID: "body_scan"},
		{FromPhaseID: "body_scan", ToPhaseID: "eye_position"},
		{FromPhaseID: "eye_position", ToPhaseID: "focused_mindfulness"},
		{FromPhaseID: "focused_mindfulness", ToPhaseID: "status_check"},

		// Status check can branch to multiple places (controlled by next_action field)
		{FromPhaseID: "status_check", ToPhaseID: "focused_mindfulness"},
		{FromPhaseID: "status_check", ToPhaseID: "squeeze_hug"},
		{FromPhaseID: "status_check", ToPhaseID: "positive_installation"},
		{FromPhaseID: "status_check", ToPhaseID: "complete"},

		// Squeeze hug transitions
		{FromPhaseID: "squeeze_hug", ToPhaseID: "status_check"},

		// Positive installation leads to completion
		{FromPhaseID: "positive_installation", ToPhaseID: "complete"},
	}

	for _, trans := range transitions {
		// Create a copy to avoid modifying the loop variable
		transition := PhaseTransition{
			ID:          trans.FromPhaseID + "_to_" + trans.ToPhaseID,
			FromPhaseID: trans.FromPhaseID,
			ToPhaseID:   trans.ToPhaseID,
			IsActive:    true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
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