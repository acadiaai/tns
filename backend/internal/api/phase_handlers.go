package api

import (
	"encoding/json"
	"net/http"
	"time"

	"therapy-navigation-system/internal/logger"
	"therapy-navigation-system/internal/repository"
	"therapy-navigation-system/shared"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/render"
)

// PhaseResponse wraps a phase with additional metadata
type PhaseResponse struct {
	*repository.Phase
	Tools       []string                       `json:"tools"`
	Transitions []repository.PhaseTransition   `json:"transitions"`
}

// GetPhasesHandler returns all phases
// @Summary Get all phases
// @Description Retrieve all workflow phases with their metadata
// @Tags phases
// @Produce json
// @Success 200 {array} PhaseResponse
// @Router /api/phases [get]
func GetPhasesHandler(w http.ResponseWriter, r *http.Request) {
	// Get phases from database with phase data preloaded
	var phases []repository.Phase
	if err := repository.DB.Preload("PhaseData").Find(&phases).Error; err != nil {
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": "Failed to fetch phases"})
		return
	}

	responses := make([]PhaseResponse, len(phases))
	for i, phase := range phases {
		responses[i] = PhaseResponse{
			Phase:       &phase,
			Tools:       []string{}, // TODO: Implement database-driven tool lookup
			Transitions: []repository.PhaseTransition{}, // TODO: Implement database-driven transitions
		}
	}

	render.JSON(w, r, responses)
}

// GetPhaseHandler returns a single phase
// @Summary Get phase by ID
// @Description Retrieve a specific phase with its metadata
// @Tags phases
// @Produce json
// @Param id path string true "Phase ID"
// @Success 200 {object} PhaseResponse
// @Router /api/phases/{id} [get]
func GetPhaseHandler(w http.ResponseWriter, r *http.Request) {
	phaseID := chi.URLParam(r, "id")

	// Get phase from database
	var phase repository.Phase
	if err := repository.DB.First(&phase, "id = ?", phaseID).Error; err != nil {
		render.Status(r, http.StatusNotFound)
		render.JSON(w, r, map[string]string{"error": "Phase not found"})
		return
	}

	response := PhaseResponse{
		Phase:       &phase,
		Tools:       []string{}, // TODO: Implement database-driven tool lookup
		Transitions: []repository.PhaseTransition{}, // TODO: Implement database-driven transitions
	}

	render.JSON(w, r, response)
}

// PhaseTransitionRequest represents a request to transition phases
type PhaseTransitionRequest struct {
	SessionID   string                 `json:"session_id"`
	ToPhaseID   string                 `json:"to_phase_id"`
	SessionData map[string]interface{} `json:"session_data,omitempty"`
}

// TransitionPhaseHandler handles phase transitions
// @Summary Transition to a new phase
// @Description Request a phase transition for a session
// @Tags phases
// @Accept json
// @Produce json
// @Param request body PhaseTransitionRequest true "Transition request"
// @Success 200 {object} map[string]interface{}
// @Router /api/phases/transition [post]
func TransitionPhaseHandler(w http.ResponseWriter, r *http.Request) {
	var req PhaseTransitionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]string{"error": "Invalid request"})
		return
	}

	// Get current session
	var session repository.Session
	if err := repository.DB.First(&session, "id = ?", req.SessionID).Error; err != nil {
		render.Status(r, http.StatusNotFound)
		render.JSON(w, r, map[string]string{"error": "Session not found"})
		return
	}

	// Check if target phase exists
	var targetPhase repository.Phase
	if err := repository.DB.First(&targetPhase, "id = ?", req.ToPhaseID).Error; err != nil {
		render.Status(r, http.StatusBadRequest)
		render.JSON(w, r, map[string]interface{}{
			"error":   "Invalid transition",
			"reason":  "Target phase not found",
			"current": session.Phase,
			"target":  req.ToPhaseID,
		})
		return
	}

	// Update session phase
	oldPhase := session.Phase
	session.Phase = req.ToPhaseID
	if err := repository.DB.Save(&session).Error; err != nil {
		logger.AppLogger.WithError(err).Error("Failed to update session phase")
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": "Failed to update session"})
		return
	}

	// Log the transition
	logger.AppLogger.WithFields(map[string]interface{}{
		"session_id": session.ID,
		"from_phase": oldPhase,
		"to_phase":   req.ToPhaseID,
		"phase_type": targetPhase.Type,
	}).Info("Phase transition completed")

	// Check if entering a timed waiting phase
	if targetPhase.Type == "timed_waiting" && targetPhase.WaitDurationSeconds > 0 {
		logger.AppLogger.WithFields(map[string]interface{}{
			"session_id": session.ID,
			"phase_id":   targetPhase.ID,
			"wait_duration": targetPhase.WaitDurationSeconds,
		}).Info("Entering timed waiting phase - starting countdown")

		// Send pre-wait message
		if targetPhase.PreWaitMessage != "" {
			broadcastSessionUpdate(session.ID, shared.TherapySessionUpdate{
				Type:      "waiting_phase_started",
				Phase:     targetPhase.ID,
				Metadata: map[string]interface{}{
					"wait_duration_seconds": targetPhase.WaitDurationSeconds,
					"pre_wait_message": targetPhase.PreWaitMessage,
					"visualization_type": targetPhase.VisualizationType,
				},
				Timestamp: time.Now(),
			})
		}

		// Start countdown timer
		go handleWaitingPhase(session.ID, targetPhase)
	}

	// State machine manages timer: Start timer when leaving pre-session
	if oldPhase == "pre_session" && req.ToPhaseID != "pre_session" {
		// Starting active session phases - start the timer
		logger.AppLogger.WithField("session_id", session.ID).Info("Starting session timer - transitioning out of pre-session")
		go startSessionTimer(session.ID, session.StartTime)
	}

	// Stop timer when returning to pre-session or completing
	if (oldPhase != "pre_session" && req.ToPhaseID == "pre_session") || req.ToPhaseID == "complete" {
		// Stop the timer
		stopSessionTimer(session.ID)
		logger.AppLogger.WithField("session_id", session.ID).Info("Stopping session timer")
	}

	// Broadcast the update via WebSocket
	broadcastSessionUpdate(session.ID, shared.TherapySessionUpdate{
		Type:      "phase_transition",
		Phase:     req.ToPhaseID,
		Metadata: map[string]interface{}{
			"from_phase": oldPhase,
			"to_phase":   req.ToPhaseID,
		},
		Timestamp: session.UpdatedAt,
	})

	// Return success with new phase info
	render.JSON(w, r, map[string]interface{}{
		"success":   true,
		"from":      oldPhase,
		"to":        req.ToPhaseID,
		"phase":     targetPhase,
		"tools":     []string{}, // TODO: Implement database-driven tool lookup
	})
}

// GetPhaseToolsHandler returns tools available for a phase
// @Summary Get phase tools
// @Description Retrieve MCP tools available for a specific phase
// @Tags phases
// @Produce json
// @Param id path string true "Phase ID"
// @Success 200 {array} repository.Tool
// @Router /api/phases/{id}/tools [get]
func GetPhaseToolsHandler(w http.ResponseWriter, r *http.Request) {
	phaseID := chi.URLParam(r, "id")

	// Get tools for this phase from database via PhaseTools relationship
	var tools []repository.Tool
	if err := repository.DB.
		Joins("JOIN phase_tools ON tools.id = phase_tools.tool_id").
		Where("phase_tools.phase_id = ?", phaseID).
		Find(&tools).Error; err != nil {
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": "Failed to fetch phase tools"})
		return
	}

	render.JSON(w, r, tools)
}

// GetToolsHandler returns all available tools
// @Summary Get all tools
// @Description Retrieve all MCP tools available in the system
// @Tags tools
// @Produce json
// @Success 200 {array} repository.Tool
// @Router /api/tools [get]
func GetToolsHandler(w http.ResponseWriter, r *http.Request) {
	var tools []repository.Tool
	if err := repository.DB.Find(&tools).Error; err != nil {
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": "Failed to fetch tools"})
		return
	}

	render.JSON(w, r, tools)
}

// GetPhaseRequirementsHandler returns structured data requirements for a phase
// @Summary Get phase requirements
// @Description Retrieve structured data requirements for a specific phase
// @Tags phases
// @Produce json
// @Param id path string true "Phase ID"
// @Success 200 {array} repository.PhaseData
// @Router /api/phases/{id}/requirements [get]
func GetPhaseRequirementsHandler(w http.ResponseWriter, r *http.Request) {
	phaseID := chi.URLParam(r, "id")

	var phaseDataItems []repository.PhaseData
	if err := repository.DB.Where("phase_id = ?", phaseID).Find(&phaseDataItems).Error; err != nil {
		render.Status(r, http.StatusInternalServerError)
		render.JSON(w, r, map[string]string{"error": "Failed to fetch phase data"})
		return
	}

	render.JSON(w, r, phaseDataItems)
}

// CheckAutoAdvanceHandler checks if a phase should auto-advance
// @Summary Check auto-advance
// @Description Check if a session should auto-advance to next phase
// @Tags phases
// @Accept json
// @Produce json
// @Param session_id path string true "Session ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/phases/auto-advance/{session_id} [get]
func CheckAutoAdvanceHandler(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "session_id")

	// Get session
	var session repository.Session
	if err := repository.DB.First(&session, "id = ?", sessionID).Error; err != nil {
		render.Status(r, http.StatusNotFound)
		render.JSON(w, r, map[string]string{"error": "Session not found"})
		return
	}

	// TODO: Implement database-driven auto-advance logic
	shouldAdvance := false // Placeholder for now
	var nextPhase *repository.Phase // Placeholder for now

	render.JSON(w, r, map[string]interface{}{
		"should_advance": shouldAdvance,
		"current_phase":  session.Phase,
		"next_phase":     nextPhase,
	})
}

// handleWaitingPhase manages the timed waiting period for non-interactive phases
func handleWaitingPhase(sessionID string, phase repository.Phase) {
	waitDuration := time.Duration(phase.WaitDurationSeconds) * time.Second
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	startTime := time.Now()

	// Send countdown updates every second
	for elapsed := time.Duration(0); elapsed < waitDuration; elapsed = time.Since(startTime) {
		select {
		case <-ticker.C:
			remaining := int(waitDuration.Seconds() - elapsed.Seconds())
			if remaining < 0 {
				remaining = 0
			}

			// Send countdown update
			broadcastSessionUpdate(sessionID, shared.TherapySessionUpdate{
				Type:      "waiting_phase_countdown",
				Phase:     phase.ID,
				Metadata: map[string]interface{}{
					"elapsed_seconds":   int(elapsed.Seconds()),
					"remaining_seconds": remaining,
					"total_seconds":     phase.WaitDurationSeconds,
				},
				Timestamp: time.Now(),
			})

			if remaining <= 0 {
				break
			}
		}
	}

	// Waiting period complete - send post-wait prompt
	logger.AppLogger.WithFields(map[string]interface{}{
		"session_id": sessionID,
		"phase_id":   phase.ID,
		"duration":   phase.WaitDurationSeconds,
	}).Info("Waiting phase completed")

	// Send completion message with post-wait prompt
	broadcastSessionUpdate(sessionID, shared.TherapySessionUpdate{
		Type:      "waiting_phase_completed",
		Phase:     phase.ID,
		Metadata: map[string]interface{}{
			"post_wait_prompt": phase.PostWaitPrompt,
		},
		Timestamp: time.Now(),
	})

	// Auto-transition to next phase (Stage 5 - Checking In)
	// This is hardcoded for now but could be made data-driven
	if phase.ID == "stage_4_focused_mindfulness" {
		// Transition to Stage 5
		var session repository.Session
		if err := repository.DB.First(&session, "id = ?", sessionID).Error; err == nil {
			session.Phase = "stage_5_checking_in"
			if err := repository.DB.Save(&session).Error; err == nil {
				logger.AppLogger.WithField("session_id", sessionID).Info("Auto-transitioned to Stage 5 after waiting")

				broadcastSessionUpdate(sessionID, shared.TherapySessionUpdate{
					Type:      "phase_transition",
					Phase:     "stage_5_checking_in",
					Metadata: map[string]interface{}{
						"from_phase": phase.ID,
						"to_phase":   "stage_5_checking_in",
						"reason":     "Automatic transition after timed waiting",
					},
					Timestamp: time.Now(),
				})
			}
		}
	}
}