package api

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

// Embed the frontend build files
//
//go:embed all:static
var staticFiles embed.FS

func NewRouter() *chi.Mux {
	r := chi.NewRouter()

	// CORS middleware for development
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	// Standard middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)

	// Health and metrics
	r.Get("/health", HealthHandler)
	r.Get("/version", VersionHandler)

	// API routes
	r.Route("/api", func(r chi.Router) {
		// Apply authentication middleware to all API routes
		r.Use(func(next http.Handler) http.Handler {
			return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				AuthMiddleware(next.ServeHTTP)(w, r)
			})
		})

		// Basic entities for UI
		r.Get("/therapists", GetTherapistsHandler)
		r.Get("/clients", GetClientsHandler)
		r.Get("/sessions", GetSessionsHandler)
		r.Post("/sessions", CreateSessionHandler)

		// Session specific
		r.Route("/sessions/{sessionId}", func(r chi.Router) {
			r.Get("/", GetSessionHandler)
			r.Get("/messages", GetMessagesHandler)
		})

		// Session prompts endpoint
		r.Get("/sessions/{id}/prompts", GetSessionPrompts)
		r.Get("/sessions/{id}/prompts/raw", GetSessionPromptsRawText)

		// MCP (Model Context Protocol) endpoint
		r.Post("/mcp", MCPHTTPHandler)

		// Messages
		r.Post("/messages", CreateMessageHandler)

		// Core WebSocket handler - this is the main interface
		r.Get("/sessions/{id}/ws", SessionWebSocketHandler)

		// Phase handlers for database-driven workflow
		r.Get("/phases", GetPhasesHandler)
		r.Get("/phases/{id}", GetPhaseHandler)
		r.Put("/phases/{id}", UpdatePhaseHandler)
		r.Get("/phases/{id}/requirements", GetPhaseRequirementsHandler)
		r.Get("/phases/{id}/tools", GetPhaseToolsHandler)

		// Workflow Studio endpoints
		r.Get("/phase-data", GetAllPhaseDataHandler)
		r.Get("/phase-data/{phaseId}", GetPhaseDataHandler)

		// Prompt management with versioning
		r.Get("/workflow/prompts", GetWorkflowPromptsHandler)
		r.Post("/prompts", CreatePromptHandler)
		r.Put("/prompts/{id}", UpdatePromptHandler)
		r.Get("/prompts/history/{phaseId}", GetPromptHistoryHandler)
		r.Put("/prompts/{id}/revert/{versionId}", RevertPromptVersionHandler)

		// System Prompt Editor endpoints
		r.Get("/system-prompt", GetSystemPromptHandler)
		r.Put("/system-prompt", UpdateSystemPromptHandler)

	})

	// API Documentation
	r.Handle("/docs/*", http.StripPrefix("/docs/", http.FileServer(http.Dir("./docs"))))

	// Serve frontend static files
	// This must be last to avoid catching API routes
	staticFS, err := fs.Sub(staticFiles, "static")
	if err == nil {
		fileServer := http.FileServer(http.FS(staticFS))
		r.Get("/*", func(w http.ResponseWriter, r *http.Request) {
			// Try to serve the file
			path := r.URL.Path
			if path == "/" {
				path = "/index.html"
			}

			// Check if file exists
			if _, err := staticFS.Open(strings.TrimPrefix(path, "/")); err == nil {
				fileServer.ServeHTTP(w, r)
			} else if strings.HasPrefix(path, "/api/") || strings.HasPrefix(path, "/docs/") {
				// API or docs route - return 404
				http.NotFound(w, r)
			} else {
				// For all other routes, serve index.html (SPA routing)
				r.URL.Path = "/index.html"
				fileServer.ServeHTTP(w, r)
			}
		})
	}

	return r
}