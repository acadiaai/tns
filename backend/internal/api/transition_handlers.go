package api

import (
	"encoding/json"
	"net/http"

	"therapy-navigation-system/internal/logger"
	"therapy-navigation-system/internal/repository"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"
)

// TransitionRequest represents a create/update transition request
type TransitionRequest struct {
	FromPhaseID string `json:"from_phase_id"`
	ToPhaseID   string `json:"to_phase_id"`
	Condition   string `json:"condition"`
	Priority    int    `json:"priority"`
}

// GetTransitionsHandler returns all transitions for a specific phase
// @Summary Get phase transitions
// @Description Retrieve all transitions FROM a specific phase
// @Tags transitions
// @Produce json
// @Param phaseId path string true "Phase ID"
// @Success 200 {array} repository.PhaseTransition
// @Router /api/phases/{phaseId}/transitions [get]
func GetTransitionsHandler(w http.ResponseWriter, r *http.Request) {
	phaseID := chi.URLParam(r, "phaseId")

	var transitions []repository.PhaseTransition
	if err := repository.DB.
		Where("from_phase_id = ? AND is_active = ?", phaseID, true).
		Preload("ToPhase").
		Order("priority ASC").
		Find(&transitions).Error; err != nil {
		logger.AppLogger.WithError(err).Error("Failed to fetch transitions")
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": "Failed to fetch transitions"})
		return
	}

	render.JSON(w, r, transitions)
}

// CreateTransitionHandler creates a new phase transition
// @Summary Create phase transition
// @Description Create a new transition between phases
// @Tags transitions
// @Accept json
// @Produce json
// @Param request body TransitionRequest true "Transition data"
// @Success 201 {object} repository.PhaseTransition
// @Router /api/transitions [post]
func CreateTransitionHandler(w http.ResponseWriter, r *http.Request) {
	var req TransitionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "Invalid request body"})
		return
	}

	// Validate that both phases exist
	var fromPhase, toPhase repository.Phase
	if err := repository.DB.First(&fromPhase, "id = ?", req.FromPhaseID).Error; err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "From phase not found"})
		return
	}
	if err := repository.DB.First(&toPhase, "id = ?", req.ToPhaseID).Error; err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "To phase not found"})
		return
	}

	transition := repository.PhaseTransition{
		FromPhaseID: req.FromPhaseID,
		ToPhaseID:   req.ToPhaseID,
		Condition:   req.Condition,
		Priority:    req.Priority,
		IsActive:    true,
	}

	if err := repository.DB.Create(&transition).Error; err != nil {
		logger.AppLogger.WithError(err).Error("Failed to create transition")
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": "Failed to create transition"})
		return
	}

	// Reload with ToPhase preloaded
	repository.DB.Preload("ToPhase").First(&transition, transition.ID)

	render.Status(r, http.StatusCreated)
	render.JSON(w, r, transition)
}

// UpdateTransitionHandler updates an existing phase transition
// @Summary Update phase transition
// @Description Update an existing transition's condition or priority
// @Tags transitions
// @Accept json
// @Produce json
// @Param id path string true "Transition ID"
// @Param request body TransitionRequest true "Updated transition data"
// @Success 200 {object} repository.PhaseTransition
// @Router /api/transitions/{id} [put]
func UpdateTransitionHandler(w http.ResponseWriter, r *http.Request) {
	transitionID := chi.URLParam(r, "id")

	var transition repository.PhaseTransition
	if err := repository.DB.First(&transition, "id = ?", transitionID).Error; err != nil {
		render.Status(r, http.StatusNotFound)
		render.JSON(w, r, map[string]string{"error": "Transition not found"})
		return
	}

	var req TransitionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "Invalid request body"})
		return
	}

	// Update fields
	transition.Condition = req.Condition
	transition.Priority = req.Priority

	if err := repository.DB.Save(&transition).Error; err != nil {
		logger.AppLogger.WithError(err).Error("Failed to update transition")
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": "Failed to update transition"})
		return
	}

	// Reload with ToPhase preloaded
	repository.DB.Preload("ToPhase").First(&transition, transition.ID)

	render.JSON(w, r, transition)
}

// DeleteTransitionHandler soft-deletes a phase transition
// @Summary Delete phase transition
// @Description Soft-delete a transition by setting is_active to false
// @Tags transitions
// @Param id path string true "Transition ID"
// @Success 204 "No Content"
// @Router /api/transitions/{id} [delete]
func DeleteTransitionHandler(w http.ResponseWriter, r *http.Request) {
	transitionID := chi.URLParam(r, "id")

	var transition repository.PhaseTransition
	if err := repository.DB.First(&transition, "id = ?", transitionID).Error; err != nil {
		render.Status(r, http.StatusNotFound)
		render.JSON(w, r, map[string]string{"error": "Transition not found"})
		return
	}

	// Soft delete by setting is_active to false
	transition.IsActive = false
	if err := repository.DB.Save(&transition).Error; err != nil {
		logger.AppLogger.WithError(err).Error("Failed to delete transition")
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": "Failed to delete transition"})
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
