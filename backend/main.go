package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"therapy-navigation-system/internal/api"
	"therapy-navigation-system/internal/config"
	"therapy-navigation-system/internal/logger"
	"therapy-navigation-system/internal/repository"

	"github.com/joho/godotenv"
)

// Build-time constants (set via ldflags)
var buildTime = "development"

// @title Therapy Navigation System API
// @version 1.0
// @description AI-powered therapy navigation system for mental health practitioners
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.url http://template.example.com/support
// @contact.email support@template.example.com

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host localhost:8083
// @BasePath /
// @schemes http https

// @tag.name health
// @tag.description Health check endpoints

// @tag.name users
// @tag.description User management endpoints

// @tag.name messages
// @tag.description Message management endpoints

func main() {
	// Print startup message to stdout immediately
	println("[STARTUP] Starting Therapy Navigation System...")
	
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		// Don't fail if .env doesn't exist, just log
		println("[STARTUP] No .env file found, using system environment variables")
	}

	// Initialize logger first
	println("[STARTUP] Initializing logger...")
	if err := logger.InitLogger(); err != nil {
		println("[ERROR] Failed to initialize logger:", err.Error())
		panic("Failed to initialize logger: " + err.Error())
	}
	println("[STARTUP] Logger initialized successfully")

	logger.AppLogger.Info("🚀 Starting Therapy Navigation System API Server")

	// Load configuration
	logger.AppLogger.Info("Loading configuration...")
	cfg, err := config.Load()
	if err != nil {
		logger.AppLogger.WithError(err).Error("Failed to load configuration")
		println("[ERROR] Failed to load configuration:", err.Error())
		logger.AppLogger.WithError(err).Fatal("Failed to load configuration")
	}
	logger.AppLogger.WithField("config", cfg).Info("Configuration loaded successfully")

	// Initialize database
	logger.AppLogger.Info("Initializing database...")
	if err := repository.InitDatabase(); err != nil {
		logger.AppLogger.WithError(err).Error("Failed to initialize database")
		println("[ERROR] Failed to initialize database:", err.Error())
		logger.AppLogger.WithError(err).Fatal("Failed to initialize database")
	}
	logger.AppLogger.Info("Database initialized successfully")


	// Initialize services
	logger.AppLogger.Info("Initializing services...")
	if err := api.InitializeServices(cfg); err != nil {
		logger.AppLogger.WithError(err).Error("Failed to initialize services - some features may be unavailable")
		println("[WARNING] Failed to initialize services:", err.Error())
	} else {
		logger.AppLogger.Info("Services initialized successfully")
	}
	
	// Initialize awareness engine - REMOVED: awareness engine deleted
	// logger.AppLogger.Info("Initializing awareness engine...")
	// api.InitializeAwarenessEngine()
	// logger.AppLogger.Info("Awareness engine initialized successfully")
	
	// Initialize prompt storage
	// TODO: Implement prompt storage functionality
	// if err := api.InitPromptStorage(); err != nil {
	// 	logger.AppLogger.WithError(err).Error("Failed to initialize prompt storage - prompt browser will be unavailable")
	// }

	// Set build time for version endpoint (baked in via ldflags)
	api.BuildTime = buildTime

	// Create API router
	router := api.NewRouter()

	// Get port from environment or default to 8083
	port := os.Getenv("PORT")
	if port == "" {
		port = "8083"
	}

	// Create HTTP server
	server := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		logger.AppLogger.Info("🌟 Server starting on http://localhost:" + port)
		logger.AppLogger.Info("📋 API endpoints:")
		logger.AppLogger.Info("  - GET  /health")
		logger.AppLogger.Info("  - GET  /api/therapists")
		logger.AppLogger.Info("  - POST /api/therapists")
		logger.AppLogger.Info("  - GET  /api/clients")
		logger.AppLogger.Info("  - POST /api/clients")
		logger.AppLogger.Info("  - GET  /api/intakes")
		logger.AppLogger.Info("  - POST /api/intakes")
		logger.AppLogger.Info("  - GET  /api/sessions")
		logger.AppLogger.Info("  - POST /api/sessions")
		
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.AppLogger.WithError(err).Fatal("Server failed to start")
		}
	}()

	// Wait for interrupt signal for graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.AppLogger.Info("🛑 Server shutting down gracefully...")

	// Create a context with timeout for graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Shutdown server
	if err := server.Shutdown(ctx); err != nil {
		logger.AppLogger.WithError(err).Fatal("Server forced to shutdown")
	}

	logger.AppLogger.Info("✅ Server shutdown complete")
} 