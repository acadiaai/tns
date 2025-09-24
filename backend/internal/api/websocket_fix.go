package api

import (
	"net/http"
	"strings"
	
	"github.com/go-chi/chi/v5/middleware"
)

// ConditionalCompress applies compression middleware only to non-WebSocket routes
func ConditionalCompress(level int) func(http.Handler) http.Handler {
	compress := middleware.Compress(level)
	
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Skip compression for WebSocket endpoints
			if strings.Contains(r.URL.Path, "/ws") || 
			   r.Header.Get("Upgrade") == "websocket" ||
			   r.Header.Get("Connection") == "Upgrade" {
				next.ServeHTTP(w, r)
				return
			}
			
			// Apply compression for other routes
			compress(next).ServeHTTP(w, r)
		})
	}
}

// ConditionalPrometheusMiddleware applies Prometheus middleware only to non-WebSocket routes
func ConditionalPrometheusMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Skip Prometheus for WebSocket endpoints
		if strings.Contains(r.URL.Path, "/ws") || 
		   r.Header.Get("Upgrade") == "websocket" ||
		   r.Header.Get("Connection") == "Upgrade" {
			next.ServeHTTP(w, r)
			return
		}
		
		// Apply Prometheus for other routes
		PrometheusMiddleware(next).ServeHTTP(w, r)
	})
}