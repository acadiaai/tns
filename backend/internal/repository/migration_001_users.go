package repository

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// migrate001Users creates initial user data
func migrate001Users(db *gorm.DB) error {
	// Seed test users with fixed IDs for Quick Coach Session compatibility
	client := Client{
		ID:        "3b9e936b-476b-4dd7-93bc-357943438334", // Fixed ID for Quick Coach
		Name:      "Test Client",
		Email:     "client@test.com",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	db.FirstOrCreate(&client, Client{Email: "client@test.com"})

	therapist := Therapist{
		ID:        "5b69a8ad-eeda-48ef-9a97-80725c88308a", // Fixed ID for Quick Coach
		Name:      "Test Therapist",
		Email:     "therapist@test.com",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	db.FirstOrCreate(&therapist, Therapist{Email: "therapist@test.com"})

	return nil
}