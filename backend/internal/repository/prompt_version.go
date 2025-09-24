package repository

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// PromptVersion stores historical versions of prompts
type PromptVersion struct {
	ID          string    `gorm:"type:uuid;primary_key;" json:"id"`
	PromptID    string    `gorm:"type:uuid;not null;index" json:"prompt_id"`
	Version     int       `gorm:"not null" json:"version"`
	Content     string    `gorm:"type:text" json:"content"`
	Category    string    `json:"category"`
	Phase       string    `json:"phase"`
	Description string    `json:"description"`
	Author      string    `json:"author"` // Who made the change
	ChangeNotes string    `json:"change_notes"`
	IsActive    bool      `gorm:"default:false" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (pv *PromptVersion) BeforeCreate(tx *gorm.DB) error {
	if pv.ID == "" {
		pv.ID = uuid.New().String()
	}
	return nil
}

// GetPromptVersions returns all versions for a prompt
func GetPromptVersions(promptID string) ([]PromptVersion, error) {
	var versions []PromptVersion
	err := DB.Where("prompt_id = ?", promptID).Order("version DESC").Find(&versions).Error
	return versions, err
}

// GetActivePromptVersion returns the currently active version
func GetActivePromptVersion(promptID string) (*PromptVersion, error) {
	var version PromptVersion
	err := DB.Where("prompt_id = ? AND is_active = ?", promptID, true).First(&version).Error
	if err != nil {
		return nil, err
	}
	return &version, nil
}

// CreatePromptVersion creates a new version of a prompt
func CreatePromptVersion(promptID string, content string, author string, changeNotes string) (*PromptVersion, error) {
	// Get the latest version number
	var maxVersion int
	DB.Model(&PromptVersion{}).Where("prompt_id = ?", promptID).Select("MAX(version)").Scan(&maxVersion)

	// Deactivate all previous versions
	DB.Model(&PromptVersion{}).Where("prompt_id = ?", promptID).Update("is_active", false)

	// Get prompt details
	var prompt Prompt
	if err := DB.First(&prompt, "id = ?", promptID).Error; err != nil {
		return nil, err
	}

	// Create new version
	version := &PromptVersion{
		PromptID:    promptID,
		Version:     maxVersion + 1,
		Content:     content,
		Category:    string(prompt.Category),
		Phase:       prompt.WorkflowPhase,
		Description: prompt.Description,
		Author:      author,
		ChangeNotes: changeNotes,
		IsActive:    true,
	}

	if err := DB.Create(version).Error; err != nil {
		return nil, err
	}

	// Update the main prompt with new content
	prompt.Content = content
	DB.Save(&prompt)

	return version, nil
}

// RevertToVersion reverts a prompt to a specific version
func RevertToVersion(promptID string, versionID string) error {
	// Get the version to revert to
	var targetVersion PromptVersion
	if err := DB.First(&targetVersion, "id = ?", versionID).Error; err != nil {
		return err
	}

	// Deactivate all versions
	DB.Model(&PromptVersion{}).Where("prompt_id = ?", promptID).Update("is_active", false)

	// Activate target version
	targetVersion.IsActive = true
	DB.Save(&targetVersion)

	// Update main prompt
	var prompt Prompt
	if err := DB.First(&prompt, "id = ?", promptID).Error; err != nil {
		return err
	}
	prompt.Content = targetVersion.Content
	DB.Save(&prompt)

	return nil
}