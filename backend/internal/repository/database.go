package repository

import (
	"fmt"
	"os"
	"therapy-navigation-system/internal/logger"

	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// DB is the global database connection (GORM singleton pattern)
var DB *gorm.DB

// Database wraps the gorm.DB connection for additional methods
type Database struct {
	conn *gorm.DB
}

// GlobalDB provides a Database wrapper for the global DB connection
var GlobalDB *Database

// InitDatabase initializes the database connection and runs migrations
func InitDatabase() error {
	var db *gorm.DB
	var err error

	// Check if we're in production (Cloud SQL) or development (SQLite)
	if databaseURL := os.Getenv("DATABASE_URL"); databaseURL != "" {
		// Production: Use PostgreSQL via DATABASE_URL
		logger.AppLogger.Info("Connecting to PostgreSQL database")
		db, err = gorm.Open(postgres.Open(databaseURL), &gorm.Config{
			Logger: logger.NewGormLogger(),
		})
	} else {
		// Development: Use local SQLite
		logger.AppLogger.Info("Connecting to local SQLite database")
		db, err = gorm.Open(sqlite.Open("therapy.db"), &gorm.Config{
			Logger: logger.NewGormLogger(),
		})
	}

	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	// Set global database instance (singleton)
	DB = db

	// Create Database wrapper for additional methods
	GlobalDB = &Database{conn: db}

	// Auto-migrate core models
	if err := db.AutoMigrate(
		// Core entities
		&Client{},
		&Therapist{},
		&Session{},
		&Message{},
		// Phase system (database-driven)
		&Phase{},
		&PhaseData{},
		&PhaseConstraint{},
		&PhaseTransition{},
		&SessionFieldValue{},
		// Tool system
		&Tool{},
		&PhaseTool{},
		// Content system
		&Prompt{},
		&PromptAddendum{},
		// State tracking
		&SessionState{},
		&SessionPhaseState{},
	); err != nil {
		return fmt.Errorf("auto-migration failed: %w", err)
	}

	// Run migrations to populate the database
	if err := RunMigrations(db); err != nil {
		return fmt.Errorf("running migrations: %w", err)
	}

	return nil
}

// Connection returns the underlying gorm.DB connection
func (db *Database) Connection() *gorm.DB {
	return db.conn
}