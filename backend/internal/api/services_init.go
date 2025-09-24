package api

import (
	"fmt"
	"therapy-navigation-system/internal/config"
	"therapy-navigation-system/internal/logger"
	"therapy-navigation-system/internal/repository"
	"therapy-navigation-system/internal/services"
	"therapy-navigation-system/shared"
	"time"
)

// InitializeServices creates and initializes all services
func InitializeServices(cfg *config.Config) error {
	logger.AppLogger.Info("Initializing services...")

	// Initialize Gemini service with new Google GenAI SDK
	geminiService, err := services.NewGeminiService(cfg)
	if err != nil {
		return fmt.Errorf("failed to initialize Gemini service: %w", err)
	}

	// Initialize monitoring service first
	monitoringService := services.NewMonitoringService()

	// Create service container
	Services = &ServiceContainer{
		GeminiService:     geminiService,
		MonitoringService: monitoringService,
	}

	// Initialize MCP server with WebSocket broadcast capability
	broadcastFunc := func(event interface{}) {
		// Bridge conductor timer/MCP events to the session WebSocket
		switch ev := event.(type) {
		case map[string]interface{}:
			// Generic MCP activity, route if session present
			sid, _ := ev["session_id"].(string)
			typ, _ := ev["type"].(string)
			if sid != "" && typ != "" {
				update := shared.TherapySessionUpdate{
					Type:      typ,
					Metadata:  ev, // Pass through the entire event for MCP events
					Timestamp: time.Now(),
				}

				// Extract phase_data_values to top level if present
				if pdv, ok := ev["phase_data_values"].(map[string]interface{}); ok {
					update.PhaseDataValues = pdv
				}

				// Extract phase if present
				if phase, ok := ev["phase"].(string); ok {
					update.Phase = phase
				}

				// For session completion and other important events, include current session status
				if typ == "session_completed" || typ == "phase_transition" || typ == "session_updated" {
					var session repository.Session
					if err := repository.DB.First(&session, "id = ?", sid).Error; err == nil {
						update.SessionStatus = session.Status
					}
				}

				broadcastSessionUpdate(sid, update)

				// Reset phase timer on phase transitions
				if typ == "phase_transition" {
					// Reset phase accumulated time for this session
					accumulatedMutex.Lock()
					phaseAccumulatedTime[sid] = 0
					lastUpdateTime[sid] = time.Now()
					accumulatedMutex.Unlock()

					// Also reset phase start time
					phaseStartMutex.Lock()
					phaseStartTimes[sid] = time.Now()
					phaseStartMutex.Unlock()

					logger.AppLogger.WithField("session_id", sid).Info("✅ Reset phase timer after auto-transition")
				}
			} else {
				logger.AppLogger.WithField("event", ev).Debug("MCP event (no session routing)")
			}
		default:
			logger.AppLogger.WithField("event", ev).Debug("MCP event broadcast")
		}
	}

	if err := InitializeMCPServer(logger.AppLogger, broadcastFunc); err != nil {
		logger.AppLogger.WithError(err).Fatal("❌ CRITICAL: Failed to initialize MCP server - cannot continue")
	} else {
		logger.AppLogger.Info("✅ MCP server initialized successfully")

		// Conductor system removed - no autonomous AI
	}

	// Set up metrics callbacks to avoid circular imports
	services.SetMetricsCallbacks(
		UpdateGeminiMetrics,
		UpdateChromaDBMetrics,
	)

	// Start background embedding processor
	// embeddingProcessor.Start()
	// logger.AppLogger.Info("Started background embedding processor")

	// Process all existing unembedded messages on startup
	// go embeddingProcessor.ProcessAllMessages()


	logger.AppLogger.Info("All services initialized successfully")
	return nil
}
