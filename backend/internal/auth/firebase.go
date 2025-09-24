package auth

import (
	"context"
	"fmt"
	"strings"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"github.com/sirupsen/logrus"
	"therapy-navigation-system/internal/logger"
)

// WHITELIST: Must match frontend whitelist exactly
var AllowedEmails = map[string]bool{
	"qshi@bangor-bsp.com": true, // Primary user
	"root@acadia.sh":      true,
	"demo@acadia.sh":      true,
	"test@acadia.sh":      true,
}

// FirebaseAuth handles Firebase authentication
type FirebaseAuth struct {
	client *auth.Client
}

// NewFirebaseAuth creates a new Firebase auth instance
func NewFirebaseAuth() (*FirebaseAuth, error) {
	ctx := context.Background()

	// Initialize Firebase Admin SDK with Application Default Credentials
	// This will automatically use:
	// 1. GOOGLE_APPLICATION_CREDENTIALS env var if set
	// 2. gcloud auth application-default credentials
	// 3. GCP metadata service when running on GCP
	app, err := firebase.NewApp(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Firebase app: %w", err)
	}

	client, err := app.Auth(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get Firebase auth client: %w", err)
	}

	logger.AppLogger.Info("Firebase Auth initialized successfully with ADC")

	return &FirebaseAuth{
		client: client,
	}, nil
}

// VerifyTokenAndCheckWhitelist verifies the Firebase ID token and checks email whitelist
func (f *FirebaseAuth) VerifyTokenAndCheckWhitelist(ctx context.Context, idToken string) (*auth.Token, error) {
	// Remove "Bearer " prefix if present
	idToken = strings.TrimPrefix(idToken, "Bearer ")
	idToken = strings.TrimSpace(idToken)

	if idToken == "" {
		return nil, fmt.Errorf("no token provided")
	}

	// Verify the ID token
	token, err := f.client.VerifyIDToken(ctx, idToken)
	if err != nil {
		logger.AppLogger.WithError(err).Error("Failed to verify Firebase ID token")
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	// Extract email from token claims
	email, ok := token.Claims["email"].(string)
	if !ok || email == "" {
		return nil, fmt.Errorf("no email found in token")
	}

	// Check whitelist (case-insensitive)
	emailLower := strings.ToLower(email)
	if !AllowedEmails[emailLower] {
		logger.AppLogger.WithFields(logrus.Fields{
			"email": email,
			"uid":   token.UID,
		}).Warn("Access denied - email not in whitelist")
		return nil, fmt.Errorf("access denied: email %s is not authorized", email)
	}

	logger.AppLogger.WithFields(logrus.Fields{
		"email": email,
		"uid":   token.UID,
	}).Info("Access granted to whitelisted email")

	return token, nil
}