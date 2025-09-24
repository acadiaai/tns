package repository

import (
	"fmt"
	"time"
	"gorm.io/gorm"
	"therapy-navigation-system/internal/logger"
	"github.com/sirupsen/logrus"
)

// Migration tracks applied migrations
type Migration struct {
	ID        string    `gorm:"primaryKey"`
	AppliedAt time.Time
}

// MigrationFunc is a migration function
type MigrationFunc func(*gorm.DB) error

// MigrationEntry represents a single migration
type MigrationEntry struct {
	ID   string
	Name string
	Func MigrationFunc
}

// RunMigrations runs all database migrations in order
func RunMigrations(db *gorm.DB) error {
	// Create migrations table if it doesn't exist
	if err := db.AutoMigrate(&Migration{}); err != nil {
		return fmt.Errorf("failed to create migrations table: %w", err)
	}

	// Define all migrations in order
	migrations := []MigrationEntry{
		{ID: "001", Name: "initial_users", Func: migrate001Users},
		{ID: "002", Name: "brainspotting_phases", Func: migrate002Phases},
		{ID: "003", Name: "phase_transitions", Func: migrate003PhaseTransitions},
		{ID: "004", Name: "phase_data_requirements", Func: migrate004PhaseData},
		// NOTE: migrations 005 and 006 for dynamic MCP tools were removed - simplified MCP layer
		{ID: "007", Name: "therapy_prompts", Func: migrate007Prompts},
	}

	// Run each migration if not already applied
	for _, migration := range migrations {
		var applied Migration
		result := db.Where("id = ?", migration.ID).First(&applied)

		if result.Error == gorm.ErrRecordNotFound {
			// Migration not applied yet
			logger.AppLogger.WithFields(logrus.Fields{
				"migration_id":   migration.ID,
				"migration_name": migration.Name,
			}).Info("Running migration")

			if err := migration.Func(db); err != nil {
				return fmt.Errorf("migration %s (%s) failed: %w", migration.ID, migration.Name, err)
			}

			// Mark as applied
			db.Create(&Migration{
				ID:        migration.ID,
				AppliedAt: time.Now(),
			})

			logger.AppLogger.WithFields(logrus.Fields{
				"migration_id":   migration.ID,
				"migration_name": migration.Name,
			}).Info("Migration completed")
		}
	}

	return nil
}
