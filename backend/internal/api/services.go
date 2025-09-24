package api

import (
	"therapy-navigation-system/internal/services"
)

// ServiceContainer holds all services used by handlers
type ServiceContainer struct {
	GeminiService     *services.GeminiService
	MonitoringService *services.MonitoringService
}

// Global service container (initialized at startup)
var Services *ServiceContainer

// InitializeServices is defined in services_init.go