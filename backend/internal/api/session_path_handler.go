package api

import (
	"encoding/json"
	"net/http"
	"therapy-navigation-system/internal/repository"
	"github.com/go-chi/chi/v5"
)

// VisitNode represents a single visit in the session path
type VisitNode struct {
	ID                 string                 `json:"id"`
	PhaseID            string                 `json:"phase_id"`
	PhaseName          string                 `json:"phase_name"`
	VisitNumber        int                    `json:"visit_number"`
	EnteredAt          string                 `json:"entered_at"`
	ExitedAt           *string                `json:"exited_at"`
	IsCurrent          bool                   `json:"is_current"`
	CollectedData      map[string]interface{} `json:"collected_data"`
	EnteredFromVisitID *string                `json:"entered_from_visit_id"`
	ExitTransitionID   *string                `json:"exit_transition_id"`
	ExitCondition      *string                `json:"exit_condition,omitempty"`
}

// SessionPathResponse represents the complete path taken by a session
type SessionPathResponse struct {
	SessionID string      `json:"session_id"`
	Visits    []VisitNode `json:"visits"`
}

// GetSessionPathHandler returns the session path as a linked list of visits
// @Summary Get session path
// @Description Returns the complete path of phase visits for a session
// @Tags sessions
// @Produce json
// @Param sessionId path string true "Session ID"
// @Success 200 {object} SessionPathResponse
// @Router /api/sessions/{sessionId}/path [get]
func GetSessionPathHandler(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "sessionId")

	// Get all visits for this session, ordered by entry time
	var visits []repository.SessionPhaseVisit
	if err := repository.DB.
		Where("session_id = ?", sessionID).
		Order("entered_at ASC").
		Preload("Phase").
		Preload("ExitTransition").
		Find(&visits).Error; err != nil {
		http.Error(w, "Failed to load session path", http.StatusInternalServerError)
		return
	}

	// Convert to response format
	visitNodes := make([]VisitNode, len(visits))
	for i, visit := range visits {
		// Parse collected data
		var collectedData map[string]interface{}
		if err := json.Unmarshal([]byte(visit.CollectedData), &collectedData); err != nil {
			collectedData = make(map[string]interface{})
		}

		// Get phase name
		phaseName := visit.PhaseID
		if visit.Phase.DisplayName != "" {
			phaseName = visit.Phase.DisplayName
		}

		// Format exited_at
		var exitedAtStr *string
		if visit.ExitedAt != nil {
			str := visit.ExitedAt.Format("2006-01-02T15:04:05Z07:00")
			exitedAtStr = &str
		}

		// Get exit condition if transition exists
		var exitCondition *string
		if visit.ExitTransition != nil && visit.ExitTransition.Condition != "" {
			exitCondition = &visit.ExitTransition.Condition
		}

		visitNodes[i] = VisitNode{
			ID:                 visit.ID,
			PhaseID:            visit.PhaseID,
			PhaseName:          phaseName,
			VisitNumber:        visit.VisitNumber,
			EnteredAt:          visit.EnteredAt.Format("2006-01-02T15:04:05Z07:00"),
			ExitedAt:           exitedAtStr,
			IsCurrent:          visit.IsCurrent,
			CollectedData:      collectedData,
			EnteredFromVisitID: visit.EnteredFromVisitID,
			ExitTransitionID:   visit.ExitTransitionID,
			ExitCondition:      exitCondition,
		}
	}

	response := SessionPathResponse{
		SessionID: sessionID,
		Visits:    visitNodes,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
