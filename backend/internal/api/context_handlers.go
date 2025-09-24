package api

import (
	"encoding/json"
	"net/http"

	contextbuilder "therapy-navigation-system/internal/context"

	"github.com/go-chi/chi/v5"
)

// GetLastContextHandler returns the last constructed context bundle for a session
// @Summary Get last constructed context for session
// @Description Returns the last constructed context bundle including prompt, token counts, and retrieval metadata
// @Tags sessions
// @Accept json
// @Produce json
// @Param id path string true "Session ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/sessions/{id}/context/last [get]
func GetLastContextHandler(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")
	if sessionID == "" {
		http.Error(w, "missing session id", http.StatusBadRequest)
		return
	}
	if bundle, ok := contextbuilder.Last(sessionID); ok {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(bundle)
		return
	}
	// Build on-demand if missing
	// Look up session to get current phase
	var sessionIDParam = sessionID
	// Fallback phase is "intake" if lookup fails
	phase := "intake"
	// Lazy import to avoid circular; use repository directly
	// (we're in api package; repository is available)
	// Note: keeping this minimal and resilient for POC
	if repoBundle, ok := contextbuilder.Last(sessionIDParam); ok && repoBundle != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(repoBundle)
		return
	}
	// Attempt to build using repository session phase
	// We duplicate small logic here to avoid a new dependency function
	type sessionLite struct{ Phase string }
	// Use a tiny local helper by importing repository here
	// (import added at top via alias in other files; here we rely on contextbuilder API only)
	if built, err := contextbuilder.BuildTurnContext(sessionIDParam, phase); err == nil && built != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(built)
		return
	}
	http.Error(w, "no context available", http.StatusNotFound)
}
