package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"therapy-navigation-system/internal/logger"
	"therapy-navigation-system/internal/repository"

	"github.com/go-chi/chi/v5"
)

// Build metadata - set at compile time via -ldflags
var (
	BuildTime = "development"
	GitCommit = "unknown"
)

// HealthHandler returns service health status
func HealthHandler(w http.ResponseWriter, r *http.Request) {
	health := map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now(),
		"database":  repository.DB != nil,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(health)
}

// VersionHandler returns build version
func VersionHandler(w http.ResponseWriter, r *http.Request) {
	response := map[string]interface{}{
		"build_time": BuildTime,
		"git_commit": GitCommit,
		"timestamp":  time.Now(),
		"status":     "healthy",
		"service":    "therapy-navigation-system",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetTherapistsHandler returns all therapists
func GetTherapistsHandler(w http.ResponseWriter, r *http.Request) {
	var therapists []repository.Therapist
	if err := repository.DB.Find(&therapists).Error; err != nil {
		logger.AppLogger.WithError(err).Error("Failed to fetch therapists")
		http.Error(w, "Failed to fetch therapists", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(therapists)
}

// GetClientsHandler returns all clients
func GetClientsHandler(w http.ResponseWriter, r *http.Request) {
	var clients []repository.Client
	if err := repository.DB.Find(&clients).Error; err != nil {
		logger.AppLogger.WithError(err).Error("Failed to fetch clients")
		http.Error(w, "Failed to fetch clients", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(clients)
}

// GetSessionsHandler returns all sessions
func GetSessionsHandler(w http.ResponseWriter, r *http.Request) {
	var sessions []repository.Session
	if err := repository.DB.Preload("Client").Preload("Therapist").Find(&sessions).Error; err != nil {
		logger.AppLogger.WithError(err).Error("Failed to fetch sessions")
		http.Error(w, "Failed to fetch sessions", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sessions)
}

// CreateSessionHandler creates a new therapy session
func CreateSessionHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ClientID    string `json:"client_id"`
		TherapistID string `json:"therapist_id"`
		StartTime   string `json:"start_time"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	startTime, err := time.Parse(time.RFC3339, req.StartTime)
	if err != nil {
		http.Error(w, "Invalid start time format", http.StatusBadRequest)
		return
	}

	session := repository.Session{
		ClientID:    req.ClientID,
		TherapistID: req.TherapistID,
		Status:      "scheduled",
		Phase:       "pre_session",
		StartTime:   startTime,
	}

	if err := repository.DB.Create(&session).Error; err != nil {
		logger.AppLogger.WithError(err).Error("Failed to create session")
		http.Error(w, "Failed to create session", http.StatusInternalServerError)
		return
	}

	// Load with relations
	repository.DB.Preload("Client").Preload("Therapist").First(&session, "id = ?", session.ID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(session)
}

// GetSessionHandler returns a specific session
func GetSessionHandler(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "sessionId")

	var session repository.Session
	if err := repository.DB.Preload("Client").Preload("Therapist").First(&session, "id = ?", sessionID).Error; err != nil {
		http.Error(w, "Session not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(session)
}

// GetMessagesHandler returns messages for a session
func GetMessagesHandler(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "sessionId")

	var messages []repository.Message
	if err := repository.DB.Where("session_id = ?", sessionID).Order("created_at ASC").Find(&messages).Error; err != nil {
		logger.AppLogger.WithError(err).Error("Failed to fetch messages")
		http.Error(w, "Failed to fetch messages", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

// CreateMessageHandler creates a new message
func CreateMessageHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		SessionID string `json:"session_id"`
		Role      string `json:"role"`
		Content   string `json:"content"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	message := repository.Message{
		ID:        fmt.Sprintf("msg_%d", time.Now().UnixNano()),
		SessionID: req.SessionID,
		Role:      req.Role,
		Content:   req.Content,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	if err := repository.DB.Create(&message).Error; err != nil {
		logger.AppLogger.WithError(err).Error("Failed to create message")
		http.Error(w, "Failed to create message", http.StatusInternalServerError)
		return
	}

	// Message count tracking is now handled by simple validation in state machine

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(message)
}