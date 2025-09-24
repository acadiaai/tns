package api

import (
	"encoding/json"
	"net/http"
	"therapy-navigation-system/internal/logger"
	"therapy-navigation-system/internal/repository"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"
)

// UpdatePhaseRequest represents the request body for updating a phase
type UpdatePhaseRequest struct {
	DisplayName          string `json:"display_name"`
	Description          string `json:"description"`
	Color                string `json:"color,omitempty"`
	Icon                 string `json:"icon,omitempty"`
	MinTurns             int    `json:"min_turns"`
	RecommendedDuration  int    `json:"recommended_duration"`
	MaxDuration          int    `json:"max_duration"`
}

// UpdatePhaseHandler updates phase configuration
// @Summary Update phase configuration
// @Description Update phase display name, description, colors, icons, and timing requirements
// @Tags phases
// @Accept json
// @Produce json
// @Param id path string true "Phase ID"
// @Param phase body UpdatePhaseRequest true "Phase update request"
// @Success 200 {object} repository.Phase
// @Router /api/phases/{id} [put]
func UpdatePhaseHandler(w http.ResponseWriter, r *http.Request) {
	phaseID := chi.URLParam(r, "id")

	var req UpdatePhaseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "Invalid request body"})
		return
	}

	// Find the phase
	var phase repository.Phase
	if err := repository.DB.First(&phase, "id = ?", phaseID).Error; err != nil {
		render.Status(r, http.StatusNotFound)
		render.JSON(w, r, map[string]string{"error": "Phase not found"})
		return
	}

	// Update the phase fields
	phase.DisplayName = req.DisplayName
	phase.Description = req.Description
	if req.Color != "" {
		phase.Color = req.Color
	}
	if req.Icon != "" {
		phase.Icon = req.Icon
	}
	phase.MinimumTurns = req.MinTurns
	phase.RecommendedDurationSeconds = req.RecommendedDuration
	phase.DurationSeconds = req.MaxDuration

	// Save the updated phase
	if err := repository.DB.Save(&phase).Error; err != nil {
		logger.AppLogger.WithError(err).Error("Failed to update phase")
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": "Failed to update phase"})
		return
	}

	logger.AppLogger.WithField("phase_id", phaseID).Info("Phase updated successfully")
	render.JSON(w, r, phase)
}

// GetPhaseDataHandler returns phase data fields for a specific phase
// @Summary Get phase data fields
// @Description Get all data fields configured for a specific phase
// @Tags phases
// @Produce json
// @Param phaseId path string true "Phase ID"
// @Success 200 {array} repository.PhaseData
// @Router /api/phase-data/{phaseId} [get]
func GetPhaseDataHandler(w http.ResponseWriter, r *http.Request) {
	phaseID := chi.URLParam(r, "phaseId")

	var phaseData []repository.PhaseData
	if err := repository.DB.Where("phase_id = ?", phaseID).Find(&phaseData).Error; err != nil {
		logger.AppLogger.WithError(err).Error("Failed to fetch phase data")
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": "Failed to fetch phase data"})
		return
	}

	render.JSON(w, r, phaseData)
}

// GetAllPhaseDataHandler returns all phase data fields
// @Summary Get all phase data fields
// @Description Get all data fields configured across all phases
// @Tags phases
// @Produce json
// @Success 200 {array} repository.PhaseData
// @Router /api/phase-data [get]
func GetAllPhaseDataHandler(w http.ResponseWriter, r *http.Request) {
	var phaseData []repository.PhaseData
	if err := repository.DB.Find(&phaseData).Error; err != nil {
		logger.AppLogger.WithError(err).Error("Failed to fetch phase data")
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": "Failed to fetch phase data"})
		return
	}

	render.JSON(w, r, phaseData)
}

// GetWorkflowPromptsHandler returns all active prompts for workflow studio
// @Summary Get all active prompts
// @Description Get all currently active prompts for all phases
// @Tags prompts
// @Produce json
// @Success 200 {array} repository.Prompt
// @Router /api/workflow/prompts [get]
func GetWorkflowPromptsHandler(w http.ResponseWriter, r *http.Request) {
	// Map phase prompts from the prompts table
	type PromptWithPhase struct {
		ID            string `json:"id"`
		PhaseID       string `json:"phase_id"`
		Content       string `json:"content"`
		Version       int    `json:"version"`
		WorkflowPhase string `json:"workflow_phase"`
		UpdatedAt     string `json:"updated_at"`
		CreatedAt     string `json:"created_at"`
	}

	var prompts []repository.Prompt
	if err := repository.DB.Where("category = ? AND is_active = ?", "phase", true).Find(&prompts).Error; err != nil {
		logger.AppLogger.WithError(err).Error("Failed to fetch prompts")
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": "Failed to fetch prompts"})
		return
	}

	// Convert to phase-mapped structure
	result := []PromptWithPhase{}
	for _, p := range prompts {
		if p.WorkflowPhase != "" {
			result = append(result, PromptWithPhase{
				ID:            p.ID,
				PhaseID:       p.WorkflowPhase,
				Content:       p.Content,
				Version:       p.Version,
				WorkflowPhase: p.WorkflowPhase,
				UpdatedAt:     p.UpdatedAt.Format("2006-01-02T15:04:05Z"),
				CreatedAt:     p.CreatedAt.Format("2006-01-02T15:04:05Z"),
			})
		}
	}

	render.JSON(w, r, result)
}

// GetPromptHistoryHandler returns the version history for a phase's prompts
// @Summary Get prompt version history
// @Description Get all versions of prompts for a specific phase
// @Tags prompts
// @Produce json
// @Param phaseId path string true "Phase ID"
// @Success 200 {array} repository.Prompt
// @Router /api/prompts/history/{phaseId} [get]
func GetPromptHistoryHandler(w http.ResponseWriter, r *http.Request) {
	phaseID := chi.URLParam(r, "phaseId")

	var versions []repository.Prompt
	if err := repository.DB.Where("phase_id = ?", phaseID).
		Order("version DESC").
		Find(&versions).Error; err != nil {
		logger.AppLogger.WithError(err).Error("Failed to fetch prompt history")
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": "Failed to fetch prompt history"})
		return
	}

	render.JSON(w, r, versions)
}

// UpdatePromptRequest represents the request body for updating a prompt
type UpdatePromptRequest struct {
	PhaseID string `json:"phase_id"`
	Content string `json:"content"`
}

// UpdatePromptHandler updates or creates a prompt for a phase
// @Summary Update prompt
// @Description Create a new version of an existing prompt
// @Tags prompts
// @Accept json
// @Produce json
// @Param id path string true "Prompt ID"
// @Param prompt body UpdatePromptRequest true "Prompt content"
// @Success 200 {object} repository.Prompt
// @Router /api/prompts/{id} [put]
func UpdatePromptHandler(w http.ResponseWriter, r *http.Request) {
	promptID := chi.URLParam(r, "id")

	var req UpdatePromptRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "Invalid request body"})
		return
	}

	// Find the prompt
	var prompt repository.Prompt
	if err := repository.DB.First(&prompt, "id = ?", promptID).Error; err != nil {
		render.Status(r, http.StatusNotFound)
		render.JSON(w, r, map[string]string{"error": "Prompt not found"})
		return
	}

	// Update prompt content and increment version
	prompt.Content = req.Content
	prompt.Version = prompt.Version + 1

	// Save updated prompt
	if err := repository.DB.Save(&prompt).Error; err != nil {
		logger.AppLogger.WithError(err).Error("Failed to update prompt")
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": "Failed to create prompt version"})
		return
	}

	logger.AppLogger.WithField("prompt_id", promptID).Info("Prompt updated with new version")
	render.JSON(w, r, prompt)
}

// CreatePromptHandler creates a new prompt for a phase
// @Summary Create prompt
// @Description Create a new prompt for a phase
// @Tags prompts
// @Accept json
// @Produce json
// @Param prompt body UpdatePromptRequest true "Prompt content"
// @Success 201 {object} repository.Prompt
// @Router /api/prompts [post]
func CreatePromptHandler(w http.ResponseWriter, r *http.Request) {
	var req UpdatePromptRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "Invalid request body"})
		return
	}

	// Check if a prompt already exists for this phase
	var existingCount int64
	repository.DB.Model(&repository.Prompt{}).
		Where("phase_id = ? AND is_active = ?", req.PhaseID, true).
		Count(&existingCount)

	if existingCount > 0 {
		// Deactivate existing prompts
		repository.DB.Model(&repository.Prompt{}).
			Where("phase_id = ? AND is_active = ?", req.PhaseID, true).
			Update("is_active", false)
	}

	// Create new prompt
	newPrompt := repository.Prompt{
		ID:            "prompt_" + req.PhaseID,
		Name:          "Phase " + req.PhaseID + " Prompt",
		Category:      "phase",
		Content:       req.Content,
		WorkflowPhase: req.PhaseID,
		Version:       1,
		IsActive:      true,
	}

	if err := repository.DB.Create(&newPrompt).Error; err != nil {
		logger.AppLogger.WithError(err).Error("Failed to create prompt")
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": "Failed to create prompt"})
		return
	}

	logger.AppLogger.WithField("phase_id", req.PhaseID).Info("Prompt created successfully")
	render.Status(r, http.StatusCreated)
	render.JSON(w, r, newPrompt)
}

// RevertPromptVersionHandler reverts to a specific prompt version
// @Summary Revert prompt version
// @Description Revert a prompt to a previous version
// @Tags prompts
// @Produce json
// @Param id path string true "Prompt ID"
// @Param versionId path string true "Version ID"
// @Success 200 {object} repository.Prompt
// @Router /api/prompts/{id}/revert/{versionId} [put]
func RevertPromptVersionHandler(w http.ResponseWriter, r *http.Request) {
	_ = chi.URLParam(r, "id") // promptID - not used in this version
	versionID := chi.URLParam(r, "versionId")

	// Find the version to revert to
	var targetVersion repository.Prompt
	if err := repository.DB.First(&targetVersion, "id = ?", versionID).Error; err != nil {
		render.Status(r, http.StatusNotFound)
		render.JSON(w, r, map[string]string{"error": "Version not found"})
		return
	}

	// Simply update the prompt with reverted content
	targetVersion.Version++
	targetVersion.IsActive = true

	if err := repository.DB.Save(&targetVersion).Error; err != nil {
		logger.AppLogger.WithError(err).Error("Failed to revert prompt version")
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": "Failed to revert version"})
		return
	}

	logger.AppLogger.WithField("version_id", versionID).Info("Prompt reverted to previous version")
	render.JSON(w, r, targetVersion)
}