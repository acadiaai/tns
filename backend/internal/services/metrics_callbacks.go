package services

import "time"

// Metrics callback functions to avoid circular imports
var (
	updateGeminiMetricsCallback   func(agentType string, tokens int, duration time.Duration)
	updateChromaDBMetricsCallback func()
)

// SetMetricsCallbacks sets the callback functions for updating metrics
func SetMetricsCallbacks(
	geminiMetrics func(agentType string, tokens int, duration time.Duration),
	chromaDBMetrics func(),
) {
	updateGeminiMetricsCallback = geminiMetrics
	updateChromaDBMetricsCallback = chromaDBMetrics
}