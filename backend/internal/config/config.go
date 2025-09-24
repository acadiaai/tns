package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all configuration for the application
type Config struct {
	// Server
	Port        string
	Environment string // dev, staging, prod

	// Database
	DatabaseURL string

	// GCP Configuration
	GCPProjectID string
	GCPRegion    string

	// API Keys (never expose in frontend!)
	GeminiAPIKey string
	OpenAIAPIKey string // Optional fallback

	// Security
	JWTSecret     string
	SessionSecret string

	// AI Configuration
	AIProvider    string // gemini, openai
	AIModel       string // gemini-2.0-flash, gpt-4, etc
	AITemperature float32
	AIMaxTokens   int

	// Tenant Configuration (for multi-tenant future)
	TenantMode      string // single, multi
	DefaultTenantID string

	// Feature Flags
	EnableAuth      bool
	EnableAnalytics bool
	EnableCaching   bool


	// Monitoring
	LogLevel     string
	SentryDSN    string
	OTelEndpoint string
}

// Load loads configuration from environment
func Load() (*Config, error) {
	// Load .env file if it exists (dev only)
	if err := godotenv.Load(); err != nil {
		// Not an error in production where we use real env vars
		if os.Getenv("ENVIRONMENT") == "" {
			// Likely development, but .env missing
			// Continue with system env vars
		}
	}

	cfg := &Config{
		// Server
		Port:        getEnvOrDefault("PORT", "8083"),
		Environment: getEnvOrDefault("ENVIRONMENT", "dev"),

		// Database
		DatabaseURL: getEnvOrDefault("DATABASE_URL", "sqlite://therapy.db"),

		// GCP Configuration
		GCPProjectID: getEnvOrDefault("GCP_PROJECT_ID", "therapy-nav-poc-quan"),
		GCPRegion:    getEnvOrDefault("GCP_REGION", "us-east1"),

		// API Keys
		GeminiAPIKey: os.Getenv("GEMINI_API_KEY"),
		OpenAIAPIKey: os.Getenv("OPENAI_API_KEY"),

		// Security
		JWTSecret:     getEnvOrDefault("JWT_SECRET", "dev-secret-change-in-prod"),
		SessionSecret: getEnvOrDefault("SESSION_SECRET", "dev-session-secret"),

		// AI Configuration
		AIProvider:    getEnvOrDefault("AI_PROVIDER", "gemini"),
		AIModel:       getEnvOrDefault("AI_MODEL", "gemini-2.5-flash"),
		AITemperature: getFloatEnvOrDefault("AI_TEMPERATURE", 0.7),
		AIMaxTokens:   getIntEnvOrDefault("AI_MAX_TOKENS", 500),

		// Tenant Configuration
		TenantMode:      getEnvOrDefault("TENANT_MODE", "single"),
		DefaultTenantID: getEnvOrDefault("DEFAULT_TENANT_ID", "default"),

		// Feature Flags
		EnableAuth:      getBoolEnvOrDefault("ENABLE_AUTH", false),
		EnableAnalytics: getBoolEnvOrDefault("ENABLE_ANALYTICS", false),
		EnableCaching:   getBoolEnvOrDefault("ENABLE_CACHING", false),


		// Monitoring
		LogLevel:     getEnvOrDefault("LOG_LEVEL", "info"),
		SentryDSN:    os.Getenv("SENTRY_DSN"),
		OTelEndpoint: os.Getenv("OTEL_ENDPOINT"),
	}

	// Validate required fields based on environment
	if cfg.Environment == "prod" {
		if cfg.GeminiAPIKey == "" && cfg.OpenAIAPIKey == "" {
			return nil, ErrMissingAPIKey
		}
	}

	return cfg, nil
}

// Helper functions
func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getIntEnvOrDefault(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

func getFloatEnvOrDefault(key string, defaultValue float32) float32 {
	if value := os.Getenv(key); value != "" {
		if floatVal, err := strconv.ParseFloat(value, 32); err == nil {
			return float32(floatVal)
		}
	}
	return defaultValue
}

func getBoolEnvOrDefault(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		if boolVal, err := strconv.ParseBool(value); err == nil {
			return boolVal
		}
	}
	return defaultValue
}

// Errors
var (
	ErrMissingAPIKey = fmt.Errorf("missing required API key for AI provider")
)
