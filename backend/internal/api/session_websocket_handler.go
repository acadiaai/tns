package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"therapy-navigation-system/internal/logger"
	"therapy-navigation-system/internal/repository"
	"therapy-navigation-system/internal/mcp"
	"therapy-navigation-system/internal/services"
	"therapy-navigation-system/shared"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// int64Ptr is a helper function to create a pointer to an int64
func int64Ptr(i int64) *int64 {
	return &i
}

// Converter functions to map GORM repository types to shared WebSocket types
func convertPhases(repoPhases []repository.Phase) []shared.Phase {
	phases := make([]shared.Phase, len(repoPhases))
	for i, p := range repoPhases {
		// Default to conversational if not set
		phaseType := p.Type
		if phaseType == "" {
			phaseType = string(repository.PhaseTypeConversational)
		}

		phases[i] = shared.Phase{
			ID:                  p.ID,
			DisplayName:         p.DisplayName,
			Description:         p.Description,
			Color:               p.Color,
			Icon:                p.Icon,
			PhaseData:           convertPhaseData(nil), // Will be populated separately if needed
			Type:                phaseType,
			WaitDurationSeconds: p.WaitDurationSeconds,
			PreWaitMessage:      p.PreWaitMessage,
			PostWaitPrompt:      p.PostWaitPrompt,
			VisualizationType:   p.VisualizationType,
		}
	}
	return phases
}

func convertPhaseData(repoData []repository.PhaseData) []shared.PhaseDataField {
	fields := make([]shared.PhaseDataField, len(repoData))
	for i, pd := range repoData {
		// Extract type from schema JSON if available
		dataType := "string" // default
		if pd.Schema != "" {
			var schema map[string]interface{}
			if err := json.Unmarshal([]byte(pd.Schema), &schema); err == nil {
				if t, ok := schema["type"].(string); ok {
					dataType = t
				}
			}
		}

		fields[i] = shared.PhaseDataField{
			Name:        pd.Name,
			Description: pd.Description,
			Required:    pd.Required,
			DataType:    dataType,
		}
	}
	return fields
}

func convertMessages(repoMessages []repository.Message) []shared.Message {
	messages := make([]shared.Message, len(repoMessages))
	for i, m := range repoMessages {
		messages[i] = shared.Message{
			ID:          m.ID,
			SessionID:   m.SessionID,
			Content:     m.Content,
			Role:        m.Role,
			MessageType: m.MessageType,
			Metadata:    m.Metadata,
			CreatedAt:   m.CreatedAt,
			UpdatedAt:   m.UpdatedAt,
		}
	}
	return messages
}

func convertMessage(m *repository.Message) *shared.Message {
	if m == nil {
		return nil
	}
	return &shared.Message{
		ID:          m.ID,
		SessionID:   m.SessionID,
		Content:     m.Content,
		Role:        m.Role,
		MessageType: m.MessageType,
		Metadata:    m.Metadata,
		CreatedAt:   m.CreatedAt,
		UpdatedAt:   m.UpdatedAt,
	}
}

// MCP client for WebSocket tool execution
// safeConn wraps websocket.Conn with a mutex for thread-safe writes
type safeConn struct {
	conn *websocket.Conn
	mu   sync.Mutex
}

func (s *safeConn) WriteJSON(v interface{}) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.conn.WriteJSON(v)
}

func (s *safeConn) ReadMessage() (messageType int, p []byte, err error) {
	return s.conn.ReadMessage()
}

func (s *safeConn) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.conn.Close()
}

var wsMCPClient *mcp.MCPClient

func getWSMCPClient(authToken string) *mcp.MCPClient {
	if wsMCPClient == nil {
		wsMCPClient = mcp.NewMCPClientFromEnv()
		_ = wsMCPClient.Initialize(context.Background())
	}
	// Update auth token for this request
	wsMCPClient.SetAuthToken(authToken)
	return wsMCPClient
}

var (
	sessionWebSocketUpgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true // Allow all origins for development
		},
		EnableCompression: false,
	}

	// WebSocket connection with mutex for thread-safe writes
	sessionConnections = make(map[string]*safeConn)
	sessionConnMutex   sync.RWMutex

	// Track active conversations to prevent duplicates
	activeConversations = make(map[string]bool)
	activeConvMutex     sync.RWMutex

	// Track last activity for auto-pause
	sessionLastActivity = make(map[string]time.Time)
	sessionActivityMutex sync.RWMutex
	sessionPaused = make(map[string]bool)
	sessionPausedMutex sync.RWMutex

	// Track session timers
	sessionTimers = make(map[string]chan bool)
	sessionTimerMutex sync.RWMutex

	// Track phase start times for phase duration
	phaseStartTimes = make(map[string]time.Time)
	phaseStartMutex sync.RWMutex

	// Track accumulated time when paused
	sessionAccumulatedTime = make(map[string]time.Duration)
	phaseAccumulatedTime   = make(map[string]time.Duration)
	lastUpdateTime         = make(map[string]time.Time)
	accumulatedMutex       sync.RWMutex
)

// SessionWebSocketHandler handles WebSocket connections for therapy sessions
func SessionWebSocketHandler(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")

	// Capture auth token for internal MCP calls
	// First try query parameter (for WebSocket), then header (shouldn't happen for WebSocket)
	authToken := r.URL.Query().Get("token")
	if authToken != "" {
		authToken = "Bearer " + authToken
	} else {
		authToken = r.Header.Get("Authorization")
	}

	// Verify session exists
	var session repository.Session
	if err := repository.DB.First(&session, "id = ?", sessionID).Error; err != nil {
		http.Error(w, "Session not found", http.StatusNotFound)
		return
	}

	// Upgrade connection
	conn, err := sessionWebSocketUpgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.AppLogger.WithError(err).Error("Failed to upgrade WebSocket connection")
		return
	}
	defer conn.Close()

	// Store connection with thread-safe wrapper
	sessionConnMutex.Lock()
	sessionConnections[sessionID] = &safeConn{conn: conn}
	sessionConnMutex.Unlock()

	defer func() {
		sessionConnMutex.Lock()
		delete(sessionConnections, sessionID)
		sessionConnMutex.Unlock()

		// Stop the session timer
		stopSessionTimer(sessionID)
	}()

	logger.AppLogger.WithField("session_id", sessionID).Info("WebSocket connection established")

	// Send initial session state immediately to eliminate shimmer
	go func() {
		// Get session with current phase
		var session repository.Session
		if err := repository.DB.First(&session, "id = ?", sessionID).Error; err != nil {
			logger.AppLogger.WithError(err).Error("Failed to get session for initial state")
			return
		}

		// Get current phase info
		var currentPhase repository.Phase
		if err := repository.DB.First(&currentPhase, "id = ?", session.Phase).Error; err != nil {
			logger.AppLogger.WithError(err).Error("Failed to get current phase")
		}

		// Get phase data for current phase only
		var phaseData []repository.PhaseData
		if err := repository.DB.Where("phase_id = ?", session.Phase).Find(&phaseData).Error; err != nil {
			logger.AppLogger.WithError(err).Error("Failed to get phase data")
		}

		// Get only transitions from current phase (what's possible next)
		var availableTransitions []repository.PhaseTransition
		if err := repository.DB.Where("from_phase_id = ?", session.Phase).Find(&availableTransitions).Error; err != nil {
			logger.AppLogger.WithError(err).Error("Failed to get available transitions")
		}

		// Get all messages for session (enterprise chatbot experience)
		var messages []repository.Message
		if err := repository.DB.Where("session_id = ?", sessionID).
			Order("created_at DESC").
			Find(&messages).Error; err != nil {
			logger.AppLogger.WithError(err).Error("Failed to get messages")
		}

		// Get phase data values from SessionFieldValue table
		phaseDataValues := make(map[string]interface{})
		// Get stored field values for this session
		var storedValues []repository.SessionFieldValue
		if err := repository.DB.Where("session_id = ?", sessionID).Find(&storedValues).Error; err != nil {
			logger.AppLogger.WithError(err).Error("Failed to get stored field values")
		}

		// Map ALL stored values, not just current phase
		for _, sv := range storedValues {
			// Parse JSON value
			var parsedValue interface{}
			if err := json.Unmarshal([]byte(sv.FieldValue), &parsedValue); err != nil {
				logger.AppLogger.WithError(err).WithField("field_value", sv.FieldValue).Error("Failed to parse stored field value as JSON")
				continue // Skip invalid values
			}
			phaseDataValues[sv.FieldName] = parsedValue
		}

		// Also include null for current phase fields that don't have values yet
		for _, pd := range phaseData {
			if _, exists := phaseDataValues[pd.Name]; !exists {
				phaseDataValues[pd.Name] = nil
			}
		}

		// Log exactly what we're sending
		logger.AppLogger.WithFields(map[string]interface{}{
			"session_id": sessionID,
			"phase_data_count": len(phaseData),
			"phase_data": phaseData,
			"phase_data_values": phaseDataValues,
			"current_phase": currentPhase,
		}).Info("📊 INITIAL STATE DATA")

		// Get all phases with their phase_data for the complete schema
		var allPhases []repository.Phase
		if err := repository.DB.Order("position ASC").Find(&allPhases).Error; err != nil {
			logger.AppLogger.WithError(err).Error("Failed to get all phases")
		}

		// Convert phases and attach phase_data to each
		sharedPhases := make([]shared.Phase, len(allPhases))
		for i, phase := range allPhases {
			var phaseFields []repository.PhaseData
			if err := repository.DB.Where("phase_id = ?", phase.ID).Find(&phaseFields).Error; err != nil {
				logger.AppLogger.WithError(err).Error("Failed to get phase data for phase")
			}
			sharedPhases[i] = shared.Phase{
				ID:          phase.ID,
				DisplayName: phase.DisplayName,
				Description: phase.Description,
				Color:       phase.Color,
				Icon:        phase.Icon,
				PhaseData:   convertPhaseData(phaseFields),
			}
		}

		// Get wait state for timed_waiting phases
		var phaseState repository.SessionPhaseState
		var waitState map[string]interface{}
		if err := repository.DB.Where("session_id = ? AND phase_id = ?", sessionID, session.Phase).
			First(&phaseState).Error; err == nil {
			// Phase state exists
			waitState = map[string]interface{}{
				"wait_started_at":   phaseState.WaitStartedAt,
				"wait_completed_at": phaseState.WaitCompletedAt,
				"is_waiting":        phaseState.WaitStartedAt != nil && phaseState.WaitCompletedAt == nil,
				"is_completed":      phaseState.WaitCompletedAt != nil,
			}
		}

		// Send initial state - clean structure
		broadcastSessionUpdate(sessionID, shared.TherapySessionUpdate{
			Type:                 "initial_state",
			Phase:                session.Phase,
			SessionStatus:        session.Status,
			PhaseDataValues:      phaseDataValues,
			Phases:               sharedPhases,
			RecentMessages:       convertMessages(messages),
			Metadata:             waitState,
			Timestamp:            time.Now(),
		})

		logger.AppLogger.WithField("session_id", sessionID).Info("✅ Sent initial session state to eliminate shimmer")
	}()

	// Initialize MCP session state
	// Removed therapy_session_enable_auto_mode - this tool no longer exists
	// Only collect_structured_data is available now
	// mcpClient := getWSMCPClient(authToken)
	// if mcpClient != nil {
	// 	args := json.RawMessage(fmt.Sprintf(`{"session_id": "%s", "enabled": true}`, sessionID))
	// 	_, err := mcpClient.ToolsCall(context.Background(), "therapy_session_enable_auto_mode", args)
	// 	if err != nil {
	// 		logger.AppLogger.WithError(err).Warn("Failed to initialize MCP session state")
	// 	}
	// }

	// Send initial status
	broadcastSessionUpdate(sessionID, shared.TherapySessionUpdate{
		Type:      "connected",
		Timestamp: time.Now(),
	})

	// Generate initial greeting via Conductor (unified approach)
	var messageCount int64
	repository.DB.Model(&repository.Message{}).Where("session_id = ?", sessionID).Count(&messageCount)

	// Check for existing coach messages to prevent duplicates (database-based, no race condition)
	var coachMessageCount int64
	repository.DB.Model(&repository.Message{}).
		Where("session_id = ? AND role = ?", sessionID, "coach").
		Count(&coachMessageCount)

	logger.AppLogger.WithFields(map[string]interface{}{
		"session_id":          sessionID,
		"message_count":       messageCount,
		"coach_message_count": coachMessageCount,
	}).Info("[GREETING_DEBUG] Checking if initial greeting needed")

	// Only generate greeting if there are NO coach messages in the database
	if coachMessageCount == 0 {
		logger.AppLogger.WithField("session_id", sessionID).Info("[GREETING_DEBUG] No coach messages found, starting initial greeting generation")
		go generateInitialGreeting(sessionID)
	} else {
		logger.AppLogger.WithFields(map[string]interface{}{
			"session_id":          sessionID,
			"message_count":       messageCount,
			"coach_message_count": coachMessageCount,
		}).Info("[GREETING_DEBUG] Skipping initial greeting - coach messages already exist")
	}

	// Track last activity
	sessionActivityMutex.Lock()
	sessionLastActivity[sessionID] = time.Now()
	sessionActivityMutex.Unlock()

	// Start auto-pause monitor
	go monitorSessionActivity(sessionID)

	// Only start session timer if not in pre-session phase
	// Timer should be managed by state machine when transitioning out of pre-session
	if session.Phase != "pre_session" {
		go startSessionTimer(sessionID, session.StartTime)
	}

	// Handle incoming messages
	for {
		_, messageData, err := conn.ReadMessage()
		if err != nil {
			logger.AppLogger.WithError(err).Info("WebSocket connection closed")
			break
		}

		// Update last activity
		sessionActivityMutex.Lock()
		sessionLastActivity[sessionID] = time.Now()
		sessionActivityMutex.Unlock()

		// Check if session is paused
		sessionPausedMutex.RLock()
		isPaused := sessionPaused[sessionID]
		sessionPausedMutex.RUnlock()

		if isPaused {
			// If paused and receiving message, unpause
			sessionPausedMutex.Lock()
			sessionPaused[sessionID] = false
			sessionPausedMutex.Unlock()

			broadcastSessionUpdate(sessionID, shared.TherapySessionUpdate{
				Type:      "session_resumed",
				Timestamp: time.Now(),
			})
		}

		// Process the message
		go handlePatientMessage(sessionID, messageData, authToken)
	}
}

// startSessionTimer sends timer updates every second via WebSocket
func startSessionTimer(sessionID string, startTime time.Time) {
	// Check if timer already exists
	sessionTimerMutex.RLock()
	if _, exists := sessionTimers[sessionID]; exists {
		sessionTimerMutex.RUnlock()
		return
	}
	sessionTimerMutex.RUnlock()

	// Create stop channel
	stopChan := make(chan bool, 1)
	sessionTimerMutex.Lock()
	sessionTimers[sessionID] = stopChan
	sessionTimerMutex.Unlock()

	// Initialize tracking
	phaseStartMutex.Lock()
	phaseStartTimes[sessionID] = startTime
	phaseStartMutex.Unlock()

	accumulatedMutex.Lock()
	sessionAccumulatedTime[sessionID] = 0
	phaseAccumulatedTime[sessionID] = 0
	lastUpdateTime[sessionID] = time.Now()
	accumulatedMutex.Unlock()

	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-stopChan:
			// Timer stopped
			sessionTimerMutex.Lock()
			delete(sessionTimers, sessionID)
			sessionTimerMutex.Unlock()
			return
		case <-ticker.C:
			// Check if session is paused
			sessionPausedMutex.RLock()
			isPaused := sessionPaused[sessionID]
			sessionPausedMutex.RUnlock()

			// Get current accumulated time
			accumulatedMutex.Lock()
			sessionAccum := sessionAccumulatedTime[sessionID]
			phaseAccum := phaseAccumulatedTime[sessionID]
			lastUpdate := lastUpdateTime[sessionID]

			// Only accumulate time if not paused
			if !isPaused {
				elapsed := time.Since(lastUpdate)
				sessionAccum += elapsed
				phaseAccum += elapsed
				sessionAccumulatedTime[sessionID] = sessionAccum
				phaseAccumulatedTime[sessionID] = phaseAccum
			}

			// Always update last time to current
			lastUpdateTime[sessionID] = time.Now()
			accumulatedMutex.Unlock()

			// Send timer update with accumulated time
			timerUpdate := shared.TherapySessionUpdate{
				Type: "timer_update",
				Metadata: map[string]interface{}{
					"session_elapsed_seconds": int(sessionAccum.Seconds()),
					"session_elapsed_formatted": fmt.Sprintf("%02d:%02d",
						int(sessionAccum.Minutes()),
						int(sessionAccum.Seconds())%60),
					"phase_elapsed_seconds": int(phaseAccum.Seconds()),
					"phase_elapsed_formatted": fmt.Sprintf("%02d:%02d",
						int(phaseAccum.Minutes()),
						int(phaseAccum.Seconds())%60),
					"is_paused": isPaused,
					"start_time": startTime.Format(time.RFC3339),
				},
				Timestamp: time.Now(),
			}

			broadcastSessionUpdate(sessionID, timerUpdate)
		}
	}
}

// stopSessionTimer stops the timer for a session
func stopSessionTimer(sessionID string) {
	sessionTimerMutex.RLock()
	stopChan, exists := sessionTimers[sessionID]
	sessionTimerMutex.RUnlock()

	if exists {
		stopChan <- true
	}
}

// monitorSessionActivity checks for inactivity and auto-pauses the session
func monitorSessionActivity(sessionID string) {
	ticker := time.NewTicker(10 * time.Second) // Check every 10 seconds
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			// Check if connection still exists
			sessionConnMutex.RLock()
			_, exists := sessionConnections[sessionID]
			sessionConnMutex.RUnlock()

			if !exists {
				// Connection closed, stop monitoring
				return
			}

			// Check last activity
			sessionActivityMutex.RLock()
			lastActivity, hasActivity := sessionLastActivity[sessionID]
			sessionActivityMutex.RUnlock()

			if !hasActivity {
				continue
			}

			// Check if already paused
			sessionPausedMutex.RLock()
			isPaused := sessionPaused[sessionID]
			sessionPausedMutex.RUnlock()

			if isPaused {
				continue
			}

			// If more than 2 minutes of inactivity, pause the session
			// BUT don't auto-pause during timed_waiting phases (e.g., focused mindfulness)
			if time.Since(lastActivity) > 2*time.Minute {
				// Check if current phase is a timed_waiting type
				session, err := repository.GetSessionByID(sessionID)
				if err != nil || session == nil {
					continue
				}

				phase, err := repository.GetPhaseByID(session.Phase)
				if err != nil || phase == nil {
					continue
				}

				// Skip auto-pause for timed_waiting phases
				if phase.Type == string(repository.PhaseTypeTimedWaiting) {
					logger.AppLogger.WithFields(map[string]interface{}{
						"session_id": sessionID,
						"phase": session.Phase,
						"phase_type": phase.Type,
					}).Info("Skipping auto-pause during timed_waiting phase")
					continue
				}

				sessionPausedMutex.Lock()
				sessionPaused[sessionID] = true
				sessionPausedMutex.Unlock()

				logger.AppLogger.WithFields(map[string]interface{}{
					"session_id": sessionID,
					"last_activity": lastActivity,
					"inactivity_duration": time.Since(lastActivity).String(),
				}).Info("Auto-pausing session due to inactivity")

				// Broadcast pause event
				broadcastSessionUpdate(sessionID, shared.TherapySessionUpdate{
					Type: "session_paused",
					Metadata: map[string]interface{}{
						"reason": "Auto-paused due to 2 minutes of inactivity",
						"inactivity_seconds": int(time.Since(lastActivity).Seconds()),
						"is_paused": true,
					},
					Timestamp: time.Now(),
				})

				// Session is now paused
				// Timers will be handled by the workflow manager
			}
		}
	}
}

// handlePatientMessage processes incoming patient messages via Conductor
func handlePatientMessage(sessionID string, messageData []byte, authToken string) {
	ctx := context.Background()
	
	logger.AppLogger.WithFields(map[string]interface{}{
		"session_id":    sessionID,
		"message_data":  string(messageData),
	}).Info("[GREETING_DEBUG] handlePatientMessage called")

	// Parse the message
	var wsMessage struct {
		Type    string `json:"type"`
		Content string `json:"content"`
		Role    string `json:"role"`
	}

	if err := json.Unmarshal(messageData, &wsMessage); err != nil {
		logger.AppLogger.WithError(err).Error("Failed to parse WebSocket message")
		return
	}

	logger.AppLogger.WithFields(map[string]interface{}{
		"session_id": sessionID,
		"type":       wsMessage.Type,
		"role":       wsMessage.Role,
		"content":    wsMessage.Content,
	}).Info("Received WebSocket message")

	// Handle special message types
	if wsMessage.Type == "trigger_checkin" {
		logger.AppLogger.WithField("session_id", sessionID).Info("Triggering check-in after mindfulness timer")
		// Handle timer-triggered check-ins via Conductor
		go handlePatientMessage(sessionID, []byte(`{"type":"message","role":"system","content":"[5 minutes elapsed - trigger check-in]"}`), authToken)
		return
	}

	// Handle pause/resume/stop controls
	if wsMessage.Type == "pause_session" {
		sessionPausedMutex.Lock()
		sessionPaused[sessionID] = true
		sessionPausedMutex.Unlock()

		logger.AppLogger.WithField("session_id", sessionID).Info("Session manually paused")

		// Broadcast pause event with timer update
		sessionTimerMutex.RLock()
		timerData := sessionTimers[sessionID]
		sessionTimerMutex.RUnlock()

		broadcastSessionUpdate(sessionID, shared.TherapySessionUpdate{
			Type: "session_paused",
			Metadata: map[string]interface{}{
				"reason": "Manually paused by user",
				"is_paused": true,
			},
			Timestamp: time.Now(),
		})

		// Also send timer update with paused state
		if timerData != nil {
			broadcastSessionUpdate(sessionID, shared.TherapySessionUpdate{
				Type: "timer_update",
				Metadata: map[string]interface{}{
					"is_paused": true,
				},
				Timestamp: time.Now(),
			})
		}
		return
	}

	if wsMessage.Type == "resume_session" {
		sessionPausedMutex.Lock()
		sessionPaused[sessionID] = false
		sessionPausedMutex.Unlock()

		// Update last activity to prevent auto-pause
		sessionActivityMutex.Lock()
		sessionLastActivity[sessionID] = time.Now()
		sessionActivityMutex.Unlock()

		logger.AppLogger.WithField("session_id", sessionID).Info("Session resumed")

		broadcastSessionUpdate(sessionID, shared.TherapySessionUpdate{
			Type: "session_resumed",
			Metadata: map[string]interface{}{
				"reason": "Manually resumed by user",
				"is_paused": false,
			},
			Timestamp: time.Now(),
		})

		// Also send timer update with resumed state
		broadcastSessionUpdate(sessionID, shared.TherapySessionUpdate{
			Type: "timer_update",
			Metadata: map[string]interface{}{
				"is_paused": false,
			},
			Timestamp: time.Now(),
		})
		return
	}

	if wsMessage.Type == "start_wait" {
		// User clicked "Begin" to start timed waiting period
		var session repository.Session
		if err := repository.DB.First(&session, "id = ?", sessionID).Error; err != nil {
			logger.AppLogger.WithError(err).Error("Failed to get session for start_wait")
			return
		}

		// Set wait_started_at timestamp - create record if it doesn't exist
		now := time.Now()
		phaseState := repository.SessionPhaseState{
			SessionID:     sessionID,
			PhaseID:       session.Phase,
			WaitStartedAt: &now,
		}

		// FirstOrCreate will find existing or create new record, then update it
		if err := repository.DB.Where("session_id = ? AND phase_id = ?", sessionID, session.Phase).
			Assign(repository.SessionPhaseState{WaitStartedAt: &now}).
			FirstOrCreate(&phaseState).Error; err != nil {
			logger.AppLogger.WithError(err).Error("Failed to set wait_started_at")
			return
		}

		logger.AppLogger.WithFields(map[string]interface{}{
			"session_id": sessionID,
			"phase":      session.Phase,
		}).Info("Started timed waiting period")

		return
	}

	if wsMessage.Type == "end_wait" {
		logger.AppLogger.WithFields(map[string]interface{}{
			"session_id": sessionID,
		}).Info("🎯 Received end_wait message from frontend")

		// User closed fullscreen or timer completed
		var session repository.Session
		if err := repository.DB.First(&session, "id = ?", sessionID).Error; err != nil {
			logger.AppLogger.WithError(err).Error("Failed to get session for end_wait")
			return
		}

		// Get wait_started_at to calculate duration
		var phaseState repository.SessionPhaseState
		if err := repository.DB.Where("session_id = ? AND phase_id = ?", sessionID, session.Phase).
			First(&phaseState).Error; err != nil {
			logger.AppLogger.WithError(err).Error("Failed to get phase state for end_wait")
			return
		}

		if phaseState.WaitStartedAt != nil {
			// Calculate processing time in minutes
			duration := time.Since(*phaseState.WaitStartedAt)
			processingMinutes := int(duration.Minutes())
			if processingMinutes < 1 {
				processingMinutes = 1 // Minimum 1 minute
			}

			// Auto-store processing_time_minutes
			processingTimeJSON, _ := json.Marshal(processingMinutes)
			fieldValue := repository.SessionFieldValue{
				ID:          uuid.New().String(),
				SessionID:   sessionID,
				PhaseID:     session.Phase,
				FieldName:   "processing_time_minutes",
				FieldValue:  string(processingTimeJSON),
				FieldType:   "int",
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			}
			repository.DB.Create(&fieldValue)

			logger.AppLogger.WithFields(map[string]interface{}{
				"session_id":         sessionID,
				"phase":              session.Phase,
				"processing_minutes": processingMinutes,
			}).Info("Completed timed waiting period")

			// FIRST: Mark wait as completed and show completion bubble
			completedAt := time.Now()
			repository.DB.Model(&repository.SessionPhaseState{}).
				Where("session_id = ? AND phase_id = ?", sessionID, session.Phase).
				Update("wait_completed_at", completedAt)

			// Broadcast wait_completed event to frontend - SHOWS COMPLETION BUBBLE FIRST
			broadcastSessionUpdate(sessionID, shared.TherapySessionUpdate{
				Type:      "wait_completed",
				Timestamp: time.Now(),
				Metadata: map[string]interface{}{
					"phase":              session.Phase,
					"processing_minutes": processingMinutes,
					"elapsed_seconds":    int(duration.Seconds()),
				},
			})

			// SECOND: Generate coach post-wait response while wait_started_at is still set
			// This allows context builder to detect post_wait state and load correct prompts
			// Post-wait message will appear AFTER the completion bubble
			if Services.GeminiService != nil {
				logger.AppLogger.WithFields(map[string]interface{}{
					"session_id": sessionID,
					"phase":      session.Phase,
				}).Info("Attempting to generate post-wait coach response")

				coachService := services.NewCoachService(Services.GeminiService)
				coachResponse, err := coachService.GenerateResponse(ctx, sessionID, "", session.Phase)

				if err != nil {
					logger.AppLogger.WithError(err).WithFields(map[string]interface{}{
						"session_id": sessionID,
						"phase":      session.Phase,
					}).Error("Failed to generate post-wait coach response")
				} else if strings.TrimSpace(coachResponse.Message) == "" {
					logger.AppLogger.WithFields(map[string]interface{}{
						"session_id": sessionID,
						"phase":      session.Phase,
					}).Warn("Post-wait coach response was empty")
				} else {
					// Save and broadcast coach's post-wait response
					therapistMsg := &repository.Message{
						ID:        fmt.Sprintf("msg_%d", time.Now().UnixNano()),
						SessionID: sessionID,
						Role:      "coach",
						Content:   strings.TrimSpace(coachResponse.Message),
						CreatedAt: time.Now(),
						UpdatedAt: time.Now(),
					}
					if err := repository.DB.Create(therapistMsg).Error; err != nil {
						logger.AppLogger.WithError(err).Error("Failed to save post-wait coach message to database")
					} else {
						broadcastSessionUpdate(sessionID, shared.TherapySessionUpdate{
							Type:      "message",
							Message:   convertMessage(therapistMsg),
							Timestamp: time.Now(),
						})
						logger.AppLogger.WithFields(map[string]interface{}{
							"session_id":     sessionID,
							"message_length": len(coachResponse.Message),
						}).Info("Post-wait coach response sent successfully")
					}
				}
			} else {
				logger.AppLogger.WithField("session_id", sessionID).Error("GeminiService is nil, cannot generate post-wait coach response")
			}

			// FINALLY: Clear wait_started_at so subsequent messages use normal phase prompts
			// This prevents getting stuck in post_wait state for all future messages
			phaseState.WaitStartedAt = nil
			if err := repository.DB.Save(&phaseState).Error; err != nil {
				logger.AppLogger.WithError(err).Error("Failed to clear wait_started_at after post-wait response")
			} else {
				logger.AppLogger.WithField("session_id", sessionID).Info("Cleared wait_started_at timestamp after post-wait response")
			}

			// Auto-transition will happen via normal data collection flow
			// The ready_to_move_on data requirement triggers phase transition
		}

		return
	}

	if wsMessage.Type == "stop_session" {
		logger.AppLogger.WithField("session_id", sessionID).Info("Session stop requested")

		// Stop the timer
		sessionTimerMutex.Lock()
		if timerChan, exists := sessionTimers[sessionID]; exists {
			close(timerChan)
			delete(sessionTimers, sessionID)
		}
		sessionTimerMutex.Unlock()

		// Mark session as stopped
		sessionPausedMutex.Lock()
		sessionPaused[sessionID] = true
		sessionPausedMutex.Unlock()

		broadcastSessionUpdate(sessionID, shared.TherapySessionUpdate{
			Type: "session_stopped",
			Metadata: map[string]interface{}{
				"reason": "Session stopped by user",
			},
			Timestamp: time.Now(),
		})
		return
	}

	// Handle workflow status requests
	if wsMessage.Type == "get_workflow_status" {
		logger.AppLogger.WithField("session_id", sessionID).Info("Frontend requested workflow status")

		// Get current session to find phase
		var session repository.Session
		if err := repository.DB.First(&session, "id = ?", sessionID).Error; err != nil {
			logger.AppLogger.WithError(err).Error("Failed to get session")
			return
		}

		// Get ALL phases for the complete state machine
		var allPhases []repository.Phase
		if err := repository.DB.Order("\"order\"").Find(&allPhases).Error; err != nil {
			logger.AppLogger.WithError(err).Error("Failed to get phases")
		}

		// Get ALL transitions for the complete state machine
		var allTransitions []repository.PhaseTransition
		if err := repository.DB.Find(&allTransitions).Error; err != nil {
			logger.AppLogger.WithError(err).Error("Failed to get transitions")
		}

		// Get phase data for current phase
		var phaseData []repository.PhaseData
		if err := repository.DB.Where("phase_id = ?", session.Phase).Find(&phaseData).Error; err != nil {
			logger.AppLogger.WithError(err).Error("Failed to get phase data")
		}

		// Get available transitions from current phase
		var availableTransitions []repository.PhaseTransition
		if err := repository.DB.Where("from_phase_id = ?", session.Phase).Find(&availableTransitions).Error; err != nil {
			logger.AppLogger.WithError(err).Error("Failed to get available transitions")
		}

		// Get phase data values from SessionFieldValue table
		phaseDataValues := make(map[string]interface{})
		// Get stored field values for this session
		var storedValues []repository.SessionFieldValue
		if err := repository.DB.Where("session_id = ?", sessionID).Find(&storedValues).Error; err != nil {
			logger.AppLogger.WithError(err).Error("Failed to get stored field values")
		}

		// Map ALL stored values, not just current phase
		for _, sv := range storedValues {
			// Parse JSON value
			var parsedValue interface{}
			if err := json.Unmarshal([]byte(sv.FieldValue), &parsedValue); err != nil {
				logger.AppLogger.WithError(err).WithField("field_value", sv.FieldValue).Error("Failed to parse stored field value as JSON")
				continue // Skip invalid values
			}
			phaseDataValues[sv.FieldName] = parsedValue
		}

		// Also include null for current phase fields that don't have values yet
		for _, pd := range phaseData {
			if _, exists := phaseDataValues[pd.Name]; !exists {
				phaseDataValues[pd.Name] = nil
			}
		}

		// Convert all phases with their phase_data for clean structure
		sharedPhases := make([]shared.Phase, len(allPhases))
		for i, phase := range allPhases {
			var phaseFields []repository.PhaseData
			if err := repository.DB.Where("phase_id = ?", phase.ID).Find(&phaseFields).Error; err != nil {
				logger.AppLogger.WithError(err).Error("Failed to get phase data for phase")
			}
			sharedPhases[i] = shared.Phase{
				ID:          phase.ID,
				DisplayName: phase.DisplayName,
				Description: phase.Description,
				Color:       phase.Color,
				Icon:        phase.Icon,
				PhaseData:   convertPhaseData(phaseFields),
			}
		}

		// Send complete state - clean structure
		broadcastSessionUpdate(sessionID, shared.TherapySessionUpdate{
			Type:            "session_updated",
			Phase:           session.Phase,
			SessionStatus:   session.Status,
			PhaseDataValues: phaseDataValues,
			Phases:          sharedPhases,
			Timestamp:       time.Now(),
		})
		logger.AppLogger.WithField("session_id", sessionID).Info("✅ Sent complete state machine representation to frontend")
		return
	}

	// Create patient message record
	patientMsg := &repository.Message{
		ID:        fmt.Sprintf("msg_%d", time.Now().UnixNano()),
		SessionID: sessionID,
		Role:      "client",
		Content:   wsMessage.Content,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Save to database
	if err := repository.DB.Create(patientMsg).Error; err != nil {
		logger.AppLogger.WithError(err).Error("Failed to save patient message")
		return
	}

	// Broadcast patient message
	broadcastSessionUpdate(sessionID, shared.TherapySessionUpdate{
		Type:      "message",
		Message:   convertMessage(patientMsg),
		Timestamp: time.Now(),
	})

	// TODO: Replace with state machine call
	// GlobalWorkflowManager.ProcessPatientMessage(sessionID, patientMsg) // REMOVED: workflow manager deleted

	// Get current phase from session database for proper prompt loading
	var session repository.Session
	if err := repository.DB.First(&session, "id = ?", sessionID).Error; err != nil {
		logger.AppLogger.WithError(err).Error("Failed to load session for phase")
		return
	}
	
	currentPhase := session.Phase
	if currentPhase == "" {
		currentPhase = "pre_session"
	}
	
	logger.AppLogger.WithFields(map[string]interface{}{
		"session_id":      sessionID,
		"database_phase":  session.Phase,
		"current_phase":   currentPhase,
	}).Info("[PHASE_DEBUG] Using session database phase instead of workflow engine")

	// Use CoachService for therapeutic responses
	logger.AppLogger.WithFields(map[string]interface{}{
		"session_id":    sessionID,
		"current_phase": currentPhase,
		"user_message":  wsMessage.Content,
	}).Info("🤖 GENERATING COACH RESPONSE")
	
	logger.AppLogger.WithFields(map[string]interface{}{
		"session_id":        sessionID,
		"gemini_service_nil": Services.GeminiService == nil,
	}).Info("[DEBUG] Checking Services.GeminiService before creating coach")
	
	if Services.GeminiService == nil {
		logger.AppLogger.WithField("session_id", sessionID).Error("[DEBUG] Services.GeminiService is NIL - cannot create coach")
		return
	}
	
	logger.AppLogger.WithField("session_id", sessionID).Info("[DEBUG] Services.GeminiService is good, creating coach service")
	
	// Generate response using Context Builder + phase-specific prompts
	coachService := services.NewCoachService(Services.GeminiService)
	
	logger.AppLogger.WithField("session_id", sessionID).Info("[DEBUG] Coach service created, calling GenerateResponse") 
	coachResponse, err := coachService.GenerateResponse(ctx, sessionID, wsMessage.Content, currentPhase)
	if err != nil {
		logger.AppLogger.WithError(err).Error("Coach service failed to generate response")
		return
	}
	
	logger.AppLogger.WithFields(map[string]interface{}{
		"session_id":        sessionID,
		"response_length":   len(coachResponse.Message),
		"tool_calls_count":  len(coachResponse.ToolCalls),
	}).Info("✅ COACH RESPONSE GENERATED")
	
	// Create conversation message only if there's actual response text
	responseText := strings.TrimSpace(coachResponse.Message)
	logger.AppLogger.WithFields(map[string]interface{}{
		"session_id":      sessionID,
		"response_length": len(responseText),
		"tool_calls_count": len(coachResponse.ToolCalls),
	}).Info("[MESSAGE_DEBUG] Processing coach response")

	if responseText != "" {
		therapistMsg := &repository.Message{
			ID:        fmt.Sprintf("msg_%d", time.Now().UnixNano()),
			SessionID: sessionID,
			Role:      "coach",
			Content:   responseText,
				CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		if err := repository.DB.Create(therapistMsg).Error; err != nil {
			logger.AppLogger.WithError(err).Error("Failed to save therapist message")
			return
		}

		// Broadcast the saved message immediately
		broadcastSessionUpdate(sessionID, shared.TherapySessionUpdate{
			Type:      "message",
			Message:   convertMessage(therapistMsg),
			Timestamp: time.Now(),
		})

		logger.AppLogger.WithField("session_id", sessionID).Info("[MESSAGE_DEBUG] Conversation message created and broadcast")

		// Extract data from this conversation turn asynchronously
		go func(userMsg, coachMsg, phase string) {
			dataExtractor := services.NewDataExtractor(Services.GeminiService)
			extracted, err := dataExtractor.ExtractDataFromTurn(
				ctx,
				sessionID,
				userMsg,
				coachMsg,
				phase,
			)

			if err != nil {
				logger.AppLogger.WithError(err).WithField("session_id", sessionID).Error("[EXTRACTOR] Data extraction failed")
				return
			}

			if len(extracted) > 0 {
				logger.AppLogger.WithFields(map[string]interface{}{
					"session_id": sessionID,
					"extracted": extracted,
				}).Info("[EXTRACTOR] Data extracted, calling collect_structured_data tool")

				// Call MCP tool to collect the data
				mcpClient := getWSMCPClient(authToken)
				if mcpClient != nil {
					argsMap := map[string]interface{}{
						"session_id": sessionID,
						"data":       extracted,
					}
					argsJSON, _ := json.Marshal(argsMap)
					_, toolErr := mcpClient.ToolsCall(ctx, "collect_structured_data", argsJSON)
					if toolErr != nil {
						logger.AppLogger.WithError(toolErr).Error("[EXTRACTOR] Failed to call collect_structured_data tool")
					} else {
						logger.AppLogger.WithField("session_id", sessionID).Info("[EXTRACTOR] Successfully called collect_structured_data tool")
					}
				}
			} else {
				logger.AppLogger.WithField("session_id", sessionID).Debug("[EXTRACTOR] No data extracted from turn")
			}
		}(wsMessage.Content, responseText, currentPhase)
	} else {
		logger.AppLogger.WithField("session_id", sessionID).Info("[MESSAGE_DEBUG] No response text, skipping conversation message")

		// If tool calls exist, generate immediate coach response (don't leave user hanging)
		if len(coachResponse.ToolCalls) > 0 {
			logger.AppLogger.WithFields(map[string]interface{}{
				"session_id":    sessionID,
				"current_phase": currentPhase,
			}).Info("🔄 Tool called but no text - generating immediate coach response")

			// Generate response with empty user message (same pattern as transition messages)
			immediateResponse, err := coachService.GenerateResponse(ctx, sessionID, "", currentPhase)

			if err != nil {
				logger.AppLogger.WithError(err).Error("❌ Failed to generate immediate coach response")
			} else if immediateResponse != nil && strings.TrimSpace(immediateResponse.Message) != "" {
				// Save and broadcast coach message
				coachMsg := &repository.Message{
					ID:        fmt.Sprintf("msg_%d", time.Now().UnixNano()),
					SessionID: sessionID,
					Role:      "coach",
					Content:   strings.TrimSpace(immediateResponse.Message),
					CreatedAt: time.Now(),
					UpdatedAt: time.Now(),
				}

				if err := repository.DB.Create(coachMsg).Error; err != nil {
					logger.AppLogger.WithError(err).Error("Failed to save immediate coach message")
				} else {
					broadcastSessionUpdate(sessionID, shared.TherapySessionUpdate{
						Type:      "message",
						Message:   convertMessage(coachMsg),
						Timestamp: time.Now(),
					})

					logger.AppLogger.WithField("session_id", sessionID).Info("✅ Immediate coach response sent after tool call")
				}
			}
		}
	}

	// Create initial "executing" tool call messages and execute async
	mcpClient := getWSMCPClient(authToken)
	hasTransitionTool := false

	if len(coachResponse.ToolCalls) > 0 {
		for _, toolCall := range coachResponse.ToolCalls {
			if toolCall.Name == "therapy_session_transition" {
				hasTransitionTool = true
			}

			// 1. Create initial "executing" tool call message
			initialMetadata, _ := json.Marshal(map[string]interface{}{
				"tool_name":    toolCall.Name,
				"arguments":    toolCall.Arguments,
				"executed_at":  time.Now(),
				"status":       "executing",
				"success":      false,
			})

			var toolMessage string
			switch toolCall.Name {
			case "therapy_session_transition":
				toolMessage = "Starting formal brainspotting session"
			case "therapy_session_record_suds":
				toolMessage = "Recording stress level"
			case "collect_structured_data":
				toolMessage = "Collecting therapeutic data"
			default:
				toolMessage = fmt.Sprintf("Called %s", toolCall.Name)
			}

			toolMsgID := fmt.Sprintf("msg_%d", time.Now().UnixNano()+1)
			toolMsg := &repository.Message{
				ID:          toolMsgID,
				SessionID:   sessionID,
				Role:        "coach",
				Content:     toolMessage,
				MessageType: "tool_call",
				Metadata:    string(initialMetadata),
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			}

			if err := repository.DB.Create(toolMsg).Error; err != nil {
				logger.AppLogger.WithError(err).Error("Failed to save initial tool call message")
				continue
			}

			// 2. Broadcast initial "executing" state
			broadcastSessionUpdate(sessionID, shared.TherapySessionUpdate{
				Type:      "message",
				Message:   convertMessage(toolMsg),
				Timestamp: time.Now(),
			})

			// 3. Execute tool asynchronously and update message
			go func(tCall services.ToolCall, msgID string, coach *services.CoachService) {
				var toolResult interface{}
				var executionError error
				if mcpClient != nil {
					argsJSON, _ := json.Marshal(tCall.Arguments)
					toolResult, executionError = mcpClient.ToolsCall(ctx, tCall.Name, argsJSON)
				}

				// Check if tool result contains a continuation prompt first
				var continuationStr string
				if toolResult != nil {
					if resultMap, ok := toolResult.(map[string]interface{}); ok {
						if continuation, exists := resultMap["continuation"]; exists && continuation != nil {
							if contStr, ok := continuation.(string); ok && contStr != "" {
								continuationStr = contStr
								logger.AppLogger.WithFields(map[string]interface{}{
									"tool":       tCall.Name,
									"session_id": sessionID,
									"continuation_length": len(continuationStr),
								}).Info("📝 Tool provided continuation - will create coach guidance message")
							}
						}
					}
				}

				// Create enhanced metadata (without continuation - that becomes a separate message)
				finalMetadata, _ := json.Marshal(map[string]interface{}{
					"tool_name":    tCall.Name,
					"arguments":    tCall.Arguments,
					"executed_at":  time.Now(),
					"tool_result":  toolResult,
					"success":      executionError == nil,
					"status":       "completed",
					"error":        func() interface{} { if executionError != nil { return executionError.Error() } else { return nil } }(),
				})

				// Update database
				repository.DB.Model(&repository.Message{}).Where("id = ?", msgID).Update("metadata", string(finalMetadata))

				// Broadcast updated tool call
				updatedMsg := &repository.Message{
					ID:          msgID,
					SessionID:   sessionID,
					Role:        "coach",
					Content:     toolMessage,
					MessageType: "tool_call",
					Metadata:    string(finalMetadata),
						CreatedAt:   time.Now(),
					UpdatedAt:   time.Now(),
				}

				broadcastSessionUpdate(sessionID, shared.TherapySessionUpdate{
					Type:      "message",
					Message:   convertMessage(updatedMsg),
					Timestamp: time.Now(),
				})

				if executionError != nil {
					logger.AppLogger.WithError(executionError).WithField("tool", tCall.Name).Error("Tool execution failed")
				} else {
					logger.AppLogger.WithFields(map[string]interface{}{
						"tool":       tCall.Name,
						"session_id": sessionID,
						"has_continuation": continuationStr != "",
					}).Info("✅ Tool executed successfully")

					// Reset phase timer on phase transition
					if tCall.Name == "therapy_session_transition" {
						phaseStartMutex.Lock()
						phaseStartTimes[sessionID] = time.Now()
						phaseStartMutex.Unlock()

						// Reset phase accumulated time
						accumulatedMutex.Lock()
						phaseAccumulatedTime[sessionID] = 0
						accumulatedMutex.Unlock()

						logger.AppLogger.WithField("session_id", sessionID).Info("✅ Reset phase timer after transition")
					}

					// FIXED: Removed recursive coach response that was causing infinite loops
					// The initial coach response already contains the therapeutic guidance needed
				}
			}(toolCall, toolMsgID, coachService)
		}
	}

	// If a phase transition occurred, broadcast workflow update to frontend
	if hasTransitionTool {
		// TODO: Replace with state machine call
		// if status, err := GlobalWorkflowManager.GetWorkflowStatus(sessionID); err == nil {
		broadcastSessionUpdate(sessionID, shared.TherapySessionUpdate{
			Type:      "session_updated",
			// WorkflowStatus: status, // REMOVED: workflow manager deleted
			Timestamp: time.Now(),
		})
		logger.AppLogger.WithField("session_id", sessionID).Info("✅ Broadcast session update after phase transition")
		// } else {
		//	logger.AppLogger.WithError(err).WithField("session_id", sessionID).Error("Failed to get workflow status for broadcast")
		// }
	}

	// Message already broadcast above when saved to database
	
	logger.AppLogger.WithField("session_id", sessionID).Info("✅ CLEAN COACH RESPONSE COMPLETED")
}

// generateInitialGreeting creates greeting via Conductor (unified approach)
func generateInitialGreeting(sessionID string) {
	ctx := context.Background()
	logger.AppLogger.WithField("session_id", sessionID).Info("[GREETING_DEBUG] Starting generateInitialGreeting function")

	// Get current phase from session
	var session repository.Session
	if err := repository.DB.First(&session, "id = ?", sessionID).Error; err != nil {
		logger.AppLogger.WithError(err).Error("Failed to load session for initial greeting")
		return
	}

	currentPhase := session.Phase
	if currentPhase == "" {
		currentPhase = "pre_session"
	}

	// Use coach service directly to generate initial greeting
	logger.AppLogger.WithFields(map[string]interface{}{
		"session_id":    sessionID,
		"current_phase": currentPhase,
	}).Info("🤖 GENERATING INITIAL GREETING")

	if Services.GeminiService == nil {
		logger.AppLogger.WithField("session_id", sessionID).Error("[DEBUG] Services.GeminiService is NIL - cannot create coach for greeting")
		return
	}

	// Generate greeting using Context Builder + phase-specific prompts
	coachService := services.NewCoachService(Services.GeminiService)

	// Pass empty string as user message to indicate this is an initial greeting
	coachResponse, err := coachService.GenerateResponse(ctx, sessionID, "", currentPhase)
	if err != nil {
		logger.AppLogger.WithError(err).Error("Coach service failed to generate initial greeting")
		return
	}

	logger.AppLogger.WithFields(map[string]interface{}{
		"session_id":        sessionID,
		"response_length":   len(coachResponse.Message),
		"tool_calls_count":  len(coachResponse.ToolCalls),
	}).Info("✅ INITIAL GREETING GENERATED")

	// Create therapist greeting message
	responseText := strings.TrimSpace(coachResponse.Message)
	if responseText != "" {
		therapistMsg := &repository.Message{
			ID:        fmt.Sprintf("msg_%d", time.Now().UnixNano()),
			SessionID: sessionID,
			Role:      "coach",
			Content:   responseText,
				CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		if err := repository.DB.Create(therapistMsg).Error; err != nil {
			logger.AppLogger.WithError(err).Error("Failed to save initial greeting message")
			return
		}

		// Broadcast the greeting
		broadcastSessionUpdate(sessionID, shared.TherapySessionUpdate{
			Type:      "message",
			Message:   convertMessage(therapistMsg),
			Timestamp: time.Now(),
		})

		logger.AppLogger.WithField("session_id", sessionID).Info("✅ Initial greeting sent successfully")
	}
}

// broadcastSessionUpdate sends updates to connected WebSocket clients
func broadcastSessionUpdate(sessionID string, update shared.TherapySessionUpdate) {
	sessionConnMutex.RLock()
	conn, exists := sessionConnections[sessionID]
	sessionConnMutex.RUnlock()

	if !exists {
		logger.AppLogger.WithField("session_id", sessionID).Debug("No WebSocket connection found for session")
		return
	}

	// Calculate total connections for this session
	sessionConnMutex.RLock()
	totalConnections := len(sessionConnections)
	sessionConnMutex.RUnlock()

	// Only log non-timer updates to reduce noise
	if update.Type != "timer_update" {
		logger.AppLogger.WithFields(map[string]interface{}{
			"session_id":         sessionID,
			"update_type":        update.Type,
			"connection_exists":  exists,
			"total_connections": totalConnections,
		}).Info("Broadcasting session update")
	}

	// Log WebSocket message content to dedicated file
	wsLogEntry := map[string]interface{}{
		"timestamp":   time.Now().Format(time.RFC3339),
		"session_id":  sessionID,
		"direction":   "outbound",
		"type":        update.Type,
		"message":     update,
	}
	wsLogJSON, _ := json.Marshal(wsLogEntry)
	if wsLogFile, err := os.OpenFile("logs/ws.jsonl", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644); err == nil {
		wsLogFile.WriteString(string(wsLogJSON) + "\n")
		wsLogFile.Close()
	}

	// Send update to WebSocket
	if err := conn.WriteJSON(update); err != nil {
		logger.AppLogger.WithError(err).Error("Failed to send WebSocket update")
		return
	}

	// Only log non-timer updates to reduce noise
	if update.Type != "timer_update" {
		logger.AppLogger.WithFields(map[string]interface{}{
			"session_id":  sessionID,
			"update_type": update.Type,
		}).Info("Successfully sent WebSocket update")
	}
}

