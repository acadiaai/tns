package repository

import (
	"log"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func migration007SessionPhaseVisits(db *gorm.DB) error {
	log.Println("🔄 Running migration 007: Session Phase Visits (Dynamic Workflow Graph)")

	// Auto-migrate the new SessionPhaseVisit table
	if err := db.AutoMigrate(&SessionPhaseVisit{}); err != nil {
		return err
	}

	// Add current_visit_id column to sessions table
	if !db.Migrator().HasColumn(&Session{}, "current_visit_id") {
		if err := db.Migrator().AddColumn(&Session{}, "current_visit_id"); err != nil {
			return err
		}
	}

	// Populate initial visit nodes for existing sessions
	var sessions []Session
	if err := db.Find(&sessions).Error; err != nil {
		return err
	}

	for _, session := range sessions {
		// Skip if session already has visits
		var existingCount int64
		db.Model(&SessionPhaseVisit{}).Where("session_id = ?", session.ID).Count(&existingCount)
		if existingCount > 0 {
			continue
		}

		// Create initial visit node for current phase
		if session.Phase != "" {
			visitID := uuid.New().String()
			visit := SessionPhaseVisit{
				ID:                 visitID,
				SessionID:          session.ID,
				PhaseID:            session.Phase,
				VisitNumber:        1,
				EnteredAt:          session.CreatedAt,
				IsCurrent:          true,
				EnteredFromVisitID: nil, // First visit has no predecessor
				CollectedData:      "{}",
				CreatedAt:          time.Now(),
				UpdatedAt:          time.Now(),
			}

			if err := db.Create(&visit).Error; err != nil {
				log.Printf("⚠️ Failed to create initial visit for session %s: %v", session.ID, err)
				continue
			}

			// Update session to point to this visit
			if err := db.Model(&Session{}).Where("id = ?", session.ID).Update("current_visit_id", visitID).Error; err != nil {
				log.Printf("⚠️ Failed to update session %s current_visit_id: %v", session.ID, err)
			}
		}
	}

	log.Println("✅ Migration 007 complete: Session Phase Visits created")
	return nil
}
