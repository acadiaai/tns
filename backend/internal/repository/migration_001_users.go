package repository

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// migrate001Users creates initial user data
func migrate001Users(db *gorm.DB) error {
	// Seed test users
	client := Client{
		ID:        uuid.New().String(),
		Name:      "Test Client",
		Email:     "client@test.com",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	db.FirstOrCreate(&client, Client{Email: "client@test.com"})

	therapist := Therapist{
		ID:        uuid.New().String(),
		Name:      "Test Therapist",
		Email:     "therapist@test.com",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	db.FirstOrCreate(&therapist, Therapist{Email: "therapist@test.com"})

	return nil
}