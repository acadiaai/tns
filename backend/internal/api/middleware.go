package api

import (
	"context"
	"net/http"
	"strings"

	"therapy-navigation-system/internal/auth"
	"therapy-navigation-system/internal/logger"
)

// Global Firebase auth instance
var firebaseAuth *auth.FirebaseAuth

// InitializeAuth initializes Firebase authentication
func InitializeAuth() error {
	fa, err := auth.NewFirebaseAuth()
	if err != nil {
		return err
	}
	firebaseAuth = fa
	logger.AppLogger.Info("Authentication middleware initialized")
	return nil
}

// AuthMiddleware validates Firebase ID tokens and checks whitelist
func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Skip auth for OPTIONS requests (CORS preflight)
		if r.Method == "OPTIONS" {
			next(w, r)
			return
		}

		// Skip auth for health endpoints
		if r.URL.Path == "/health" || r.URL.Path == "/version" {
			next(w, r)
			return
		}

		// Skip auth for WebSocket endpoint (uses its own auth)
		if strings.Contains(r.URL.Path, "/ws") {
			next(w, r)
			return
		}

		// Skip auth for docs
		if strings.HasPrefix(r.URL.Path, "/docs") {
			next(w, r)
			return
		}

		// Check if Firebase auth is initialized
		if firebaseAuth == nil {
			logger.AppLogger.Error("Firebase auth not initialized - allowing request for development")
			next(w, r)
			return
		}

		// Get Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			logger.AppLogger.WithField("path", r.URL.Path).Warn("Request with no Authorization header")
			http.Error(w, "Unauthorized: No token provided", http.StatusUnauthorized)
			return
		}

		// Extract token (remove "Bearer " prefix)
		token := strings.TrimPrefix(authHeader, "Bearer ")

		// Verify token and check whitelist
		firebaseToken, err := firebaseAuth.VerifyTokenAndCheckWhitelist(context.Background(), token)
		if err != nil {
			logger.AppLogger.WithError(err).WithField("path", r.URL.Path).Warn("Token validation failed")
			http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
			return
		}

		// Add user info to context
		ctx := context.WithValue(r.Context(), "user_email", firebaseToken.Claims["email"])
		ctx = context.WithValue(ctx, "user_uid", firebaseToken.UID)

		// Log successful auth
		logger.AppLogger.WithField("email", firebaseToken.Claims["email"]).Debug("Request authenticated")

		// Continue with authenticated request
		next(w, r.WithContext(ctx))
	}
}

// RequireAuth wraps a handler with authentication middleware
func RequireAuth(handler http.HandlerFunc) http.HandlerFunc {
	return AuthMiddleware(handler)
}