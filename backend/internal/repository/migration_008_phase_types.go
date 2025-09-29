package repository

import (
	"gorm.io/gorm"
)

// migrate008PhaseTypes adds phase type fields for timed waiting periods
func migrate008PhaseTypes(db *gorm.DB) error {
	// Add new columns to phases table
	if err := db.Exec(`
		ALTER TABLE phases ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'conversational';
	`).Error; err != nil {
		// Column might already exist, try to proceed
		_ = err
	}

	if err := db.Exec(`
		ALTER TABLE phases ADD COLUMN IF NOT EXISTS wait_duration_seconds INTEGER DEFAULT 0;
	`).Error; err != nil {
		_ = err
	}

	if err := db.Exec(`
		ALTER TABLE phases ADD COLUMN IF NOT EXISTS pre_wait_message TEXT;
	`).Error; err != nil {
		_ = err
	}

	if err := db.Exec(`
		ALTER TABLE phases ADD COLUMN IF NOT EXISTS post_wait_prompt TEXT;
	`).Error; err != nil {
		_ = err
	}

	if err := db.Exec(`
		ALTER TABLE phases ADD COLUMN IF NOT EXISTS visualization_type VARCHAR(50);
	`).Error; err != nil {
		_ = err
	}

	// Update existing phases to set appropriate types
	// Most phases remain conversational, but we can set some as examples

	// Example: Set "processing" phase as a timed_waiting phase
	if err := db.Exec(`
		UPDATE phases
		SET type = 'timed_waiting',
		    wait_duration_seconds = 180,
		    pre_wait_message = 'Take a moment to focus on the sensations in your body. Notice what comes up without trying to change anything.',
		    post_wait_prompt = 'What did you notice during that time? What shifted or changed?',
		    visualization_type = 'breathing_circle'
		WHERE name = 'processing';
	`).Error; err != nil {
		// Phase might not exist, that's ok
		_ = err
	}

	// Example: Set "integration" phase to have a short pause
	if err := db.Exec(`
		UPDATE phases
		SET type = 'timed_waiting',
		    wait_duration_seconds = 60,
		    pre_wait_message = 'Let''s take a moment to integrate what we''ve discovered.',
		    post_wait_prompt = 'How are you feeling now? What feels different?',
		    visualization_type = 'ocean_waves'
		WHERE name = 'integration';
	`).Error; err != nil {
		// Phase might not exist, that's ok
		_ = err
	}

	return nil
}