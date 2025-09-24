package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	// HTTP metrics
	httpRequestsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "http_requests_total",
		Help: "Total number of HTTP requests",
	}, []string{"method", "path", "status"})

	httpRequestDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name: "http_request_duration_seconds",
		Help: "HTTP request latencies in seconds",
	}, []string{"method", "path"})

	// Therapy session metrics
	sessionsTotal = promauto.NewCounter(prometheus.CounterOpts{
		Name: "therapy_sessions_total",
		Help: "Total number of therapy sessions created",
	})

	sessionsActive = promauto.NewGauge(prometheus.GaugeOpts{
		Name: "therapy_sessions_active",
		Help: "Number of currently active therapy sessions",
	})

	// Gemini API metrics
	geminiTokensTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "gemini_tokens_total",
		Help: "Total number of tokens used by Gemini API",
	}, []string{"agent_type"})

	geminiRequestDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name: "gemini_request_duration_seconds",
		Help: "Gemini API request latencies in seconds",
	}, []string{"agent_type"})

	// ChromaDB metrics
	chromadbEmbeddingsTotal = promauto.NewCounter(prometheus.CounterOpts{
		Name: "chromadb_embeddings_total",
		Help: "Total number of embeddings stored in ChromaDB",
	})

	// Intake extraction metrics
	intakeExtractionTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "intake_extraction_total",
		Help: "Total number of intake extractions performed",
	}, []string{"trigger", "status"}) // trigger: message, manual, scheduled; status: success, failure

	intakeExtractionDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name: "intake_extraction_duration_seconds",
		Help: "Time taken for intake extraction",
		Buckets: []float64{0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0},
	}, []string{"trigger"})

	intakeFieldsExtracted = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name: "intake_fields_extracted",
		Help: "Number of intake fields extracted per session",
	}, []string{"session_id"})

	intakeCompletionScore = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name: "intake_completion_score",
		Help: "Intake completion percentage per session",
	}, []string{"session_id"})

	// Knowledge graph metrics
	knowledgeGraphEntities = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name: "knowledge_graph_entities",
		Help: "Number of entities in knowledge graph per session",
	}, []string{"session_id", "entity_type"})

	knowledgeExtractionDuration = promauto.NewHistogram(prometheus.HistogramOpts{
		Name: "knowledge_extraction_duration_seconds",
		Help: "Time taken for knowledge graph extraction",
		Buckets: []float64{0.5, 1.0, 2.0, 5.0, 10.0, 15.0, 30.0},
	})

	// Message processing metrics
	messageProcessingTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "message_processing_total",
		Help: "Total messages processed for extraction",
	}, []string{"role", "stage", "processing_type"}) // processing_type: embedding, intake, knowledge

	messageProcessingDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name: "message_processing_duration_seconds",
		Help: "Time taken to process messages",
		Buckets: []float64{0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0},
	}, []string{"processing_type"})

	// Knowledge graph metrics
	knowledgeGraphEntitiesTotal = promauto.NewCounter(prometheus.CounterOpts{
		Name: "knowledge_graph_entities_total",
		Help: "Total number of entities in the knowledge graph",
	})

	// Intake metrics
	intakeCompletionPercentage = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name: "intake_completion_percentage",
		Help: "Percentage of intake fields completed per session",
	}, []string{"session_id"})

	// Prompt metrics
	promptsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "prompts_total",
		Help: "Total number of prompts processed",
	}, []string{"agent_type"})

	// Detailed prompt usage metrics
	promptUsageTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "prompt_usage_total",
		Help: "Total number of times each prompt has been used",
	}, []string{"prompt_name", "category", "workflow_phase"})

	promptResponseTime = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name: "prompt_response_time_seconds",
		Help: "Response time for prompts in seconds",
		Buckets: []float64{0.1, 0.5, 1.0, 2.0, 5.0, 10.0},
	}, []string{"prompt_name", "category"})

	promptTokensUsed = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "prompt_tokens_used_total",
		Help: "Total tokens used by each prompt",
	}, []string{"prompt_name", "category"})

	promptSuccessRate = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "prompt_success_total",
		Help: "Number of successful prompt executions",
	}, []string{"prompt_name", "status"})

	// Database metrics
	databaseTableRows = promauto.NewGaugeVec(prometheus.GaugeOpts{
		Name: "database_table_rows",
		Help: "Number of rows in database tables",
	}, []string{"table"})
)

// PrometheusMiddleware tracks HTTP metrics
func PrometheusMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		
		// Wrap ResponseWriter to capture status code
		wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
		
		// Process request
		next.ServeHTTP(wrapped, r)
		
		// Record metrics
		duration := time.Since(start).Seconds()
		path := chi.RouteContext(r.Context()).RoutePattern()
		if path == "" {
			path = r.URL.Path
		}
		
		httpRequestsTotal.WithLabelValues(r.Method, path, strconv.Itoa(wrapped.statusCode)).Inc()
		httpRequestDuration.WithLabelValues(r.Method, path).Observe(duration)
	})
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// MetricsHandler returns the Prometheus metrics handler
func MetricsHandler() http.Handler {
	return promhttp.Handler()
}

// UpdateSessionMetrics updates session-related metrics
func UpdateSessionMetrics(action string) {
	switch action {
	case "created":
		sessionsTotal.Inc()
		sessionsActive.Inc()
	case "ended":
		sessionsActive.Dec()
	}
}

// InitializeSessionCounter sets the session counter to the current total from database
func InitializeSessionCounter(currentTotal int) {
	// Add the current total to the counter (since counters start at 0)
	sessionsTotal.Add(float64(currentTotal))
}

// UpdateGeminiMetrics updates Gemini API metrics
func UpdateGeminiMetrics(agentType string, tokens int, duration time.Duration) {
	geminiTokensTotal.WithLabelValues(agentType).Add(float64(tokens))
	geminiRequestDuration.WithLabelValues(agentType).Observe(duration.Seconds())
	promptsTotal.WithLabelValues(agentType).Inc()
}

// UpdateChromaDBMetrics updates ChromaDB metrics
func UpdateChromaDBMetrics() {
	chromadbEmbeddingsTotal.Inc()
}

// UpdateIntakeExtractionMetrics updates intake extraction metrics
func UpdateIntakeExtractionMetrics(trigger string, status string, duration time.Duration, sessionID string, fieldsCount int, completionScore float64) {
	intakeExtractionTotal.WithLabelValues(trigger, status).Inc()
	intakeExtractionDuration.WithLabelValues(trigger).Observe(duration.Seconds())
	
	if status == "success" {
		intakeFieldsExtracted.WithLabelValues(sessionID).Set(float64(fieldsCount))
		intakeCompletionScore.WithLabelValues(sessionID).Set(completionScore)
	}
}

// UpdateKnowledgeGraphMetrics updates knowledge graph metrics
func UpdateKnowledgeGraphMetrics(sessionID string, entities map[string]int, duration time.Duration) {
	knowledgeExtractionDuration.Observe(duration.Seconds())
	
	for entityType, count := range entities {
		knowledgeGraphEntities.WithLabelValues(sessionID, entityType).Set(float64(count))
	}
	
	knowledgeGraphEntitiesTotal.Inc()
}

// UpdateMessageProcessingMetrics updates message processing metrics
func UpdateMessageProcessingMetrics(role string, stage string, processingType string, duration time.Duration) {
	messageProcessingTotal.WithLabelValues(role, stage, processingType).Inc()
	messageProcessingDuration.WithLabelValues(processingType).Observe(duration.Seconds())
}

// UpdateIntakeMetrics updates intake completion metrics
func UpdateIntakeMetrics(sessionID string, percentage float64) {
	intakeCompletionPercentage.WithLabelValues(sessionID).Set(percentage)
}

// UpdateDatabaseMetrics updates database table row counts
func UpdateDatabaseMetrics(table string, count int) {
	databaseTableRows.WithLabelValues(table).Set(float64(count))
}

// UpdateSessionActiveMetrics sets the active sessions count
func UpdateSessionActiveMetrics(count int) {
	sessionsActive.Set(float64(count))
}

// UpdatePromptUsageMetrics updates detailed prompt usage metrics
func UpdatePromptUsageMetrics(promptName string, category string, workflowPhase string, responseTime time.Duration, tokensUsed int, success bool) {
	promptUsageTotal.WithLabelValues(promptName, category, workflowPhase).Inc()
	promptResponseTime.WithLabelValues(promptName, category).Observe(responseTime.Seconds())
	promptTokensUsed.WithLabelValues(promptName, category).Add(float64(tokensUsed))
	
	status := "success"
	if !success {
		status = "failure"
	}
	promptSuccessRate.WithLabelValues(promptName, status).Inc()
}