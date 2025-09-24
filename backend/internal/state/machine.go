package state

import (
	"fmt"
	"strings"
	"time"
	"therapy-navigation-system/internal/repository"
)

// Machine uses database-driven phases - no hardcoded constants

// Machine manages therapy session state and validation
type Machine struct {
	sessionID string
}

// New creates a new state machine for a session
func New(sessionID string) *Machine {
	return &Machine{sessionID: sessionID}
}

// ValidatePhaseRequirements checks if current phase requirements are complete (can we leave?)
func (m *Machine) ValidatePhaseRequirements(currentPhase string) error {
	// Check data requirements (always required)
	if err := m.validateDataRequirements(currentPhase); err != nil {
		return err
	}

	// Check minimum turns requirement (simple)
	if err := m.validateMinimumTurns(currentPhase); err != nil {
		return err
	}

	return nil
}

// validateDataRequirements checks if all required data fields are collected
func (m *Machine) validateDataRequirements(currentPhase string) error {
	// Get all required PhaseData for CURRENT phase to see if we can leave it
	var phaseData []repository.PhaseData
	if err := repository.DB.Where("phase_id = ? AND required = ?", currentPhase, true).Find(&phaseData).Error; err != nil {
		return fmt.Errorf("failed to get phase requirements: %w", err)
	}

	if len(phaseData) == 0 {
		return nil // No requirements for this phase
	}

	// Get current session data
	var session repository.Session
	if err := repository.DB.Where("id = ?", m.sessionID).First(&session).Error; err != nil {
		return fmt.Errorf("session not found: %w", err)
	}

	// Check each requirement
	var missing []string
	for _, req := range phaseData {
		if !m.isFieldPopulated(session, req.Name) {
			missing = append(missing, req.Name)
		}
	}

	if len(missing) > 0 {
		return fmt.Errorf("missing required data for phase %s: %v", currentPhase, missing)
	}

	return nil
}

// validateMinimumTurns checks if minimum conversation exchanges have been met
func (m *Machine) validateMinimumTurns(currentPhase string) error {
	// Get phase with minimum turns requirement
	var phase repository.Phase
	if err := repository.DB.Where("id = ?", currentPhase).First(&phase).Error; err != nil {
		return fmt.Errorf("phase not found: %w", err)
	}

	// Get session to find when current phase started
	var session repository.Session
	if err := repository.DB.Where("id = ?", m.sessionID).First(&session).Error; err != nil {
		return fmt.Errorf("session not found: %w", err)
	}

	// Count messages since current phase started (use session.PhaseStartTime)
	var messageCount int64
	if err := repository.DB.Model(&repository.Message{}).
		Where("session_id = ? AND created_at >= ?", m.sessionID, session.PhaseStartTime).
		Count(&messageCount).Error; err != nil {
		return fmt.Errorf("failed to count messages: %w", err)
	}

	// Simple check: need at least MinimumTurns * 2 messages (each turn = client + coach message)
	requiredMessages := phase.MinimumTurns * 2
	if int(messageCount) < requiredMessages {
		return fmt.Errorf("minimum %d turns required (%d messages), currently have %d messages",
			phase.MinimumTurns, requiredMessages, messageCount)
	}

	return nil
}


// GetPhaseGuidance returns guidance for current phase
func (m *Machine) GetPhaseGuidance(currentPhase string) (string, error) {
	// Get current session
	var session repository.Session
	if err := repository.DB.Where("id = ?", m.sessionID).First(&session).Error; err != nil {
		return "", fmt.Errorf("session not found: %w", err)
	}

	// Get phase requirements
	var required []repository.PhaseData
	if err := repository.DB.Where("phase_id = ? AND required = ?", currentPhase, true).Find(&required).Error; err != nil {
		return "", fmt.Errorf("failed to get phase requirements: %w", err)
	}

	// Check what's missing
	var missing []string
	for _, req := range required {
		if !m.isFieldPopulated(session, req.Name) {
			missing = append(missing, req.Name)
		}
	}

	// Get phase for minimum turns requirement
	var phase repository.Phase
	if err := repository.DB.Where("id = ?", currentPhase).First(&phase).Error; err != nil {
		return "", fmt.Errorf("phase not found: %w", err)
	}

	// Count total messages for turn calculation
	var messageCount int64
	if err := repository.DB.Model(&repository.Message{}).
		Where("session_id = ?", m.sessionID).
		Count(&messageCount).Error; err != nil {
		return "", fmt.Errorf("failed to count messages: %w", err)
	}

	// Calculate current turns and check requirements
	currentTurns := int(messageCount) / 2
	turnsNeeded := phase.MinimumTurns - currentTurns
	turnsOK := turnsNeeded <= 0

	// Build simple guidance message
	var guidance strings.Builder

	if len(missing) == 0 && turnsOK {
		guidance.WriteString("✅ ALL REQUIREMENTS MET - Ready to transition!\n")
		guidance.WriteString("Use therapy_session_transition() when therapeutically appropriate.\n")
	} else {
		guidance.WriteString("⚠️ TRANSITION REQUIREMENTS:\n\n")

		// Show data requirements with specific guidance
		if len(missing) > 0 {
			guidance.WriteString("❌ DATA REQUIREMENTS:\n")
			for _, field := range missing {
				if field == "consent_given" {
					guidance.WriteString("- consent_given: ASK patient for consent and WAIT for their explicit agreement before calling collect_structured_data\n")
				} else {
					guidance.WriteString(fmt.Sprintf("- %s: WAIT for patient to provide this information, then use collect_structured_data\n", field))
				}
			}
			guidance.WriteString("\n🔧 IMPORTANT: Only call collect_structured_data() AFTER patient provides the required information.\n\n")
		} else {
			guidance.WriteString("✅ DATA REQUIREMENTS: Complete\n\n")
		}

		// Show turn requirements
		if !turnsOK {
			guidance.WriteString(fmt.Sprintf("❌ MINIMUM TURNS: Need %d more turns (%d/%d)\n\n",
				turnsNeeded, currentTurns, phase.MinimumTurns))
		} else {
			guidance.WriteString("✅ MINIMUM TURNS: Complete\n\n")
		}
	}

	guidance.WriteString(fmt.Sprintf("📊 Current: %d turns, %d messages",
		currentTurns, messageCount))

	return guidance.String(), nil
}

// GetMissingFields returns list of missing fields for current phase
func (m *Machine) GetMissingFields(currentPhase string) ([]string, error) {
	// Get current session data
	var session repository.Session
	if err := repository.DB.Where("id = ?", m.sessionID).First(&session).Error; err != nil {
		return nil, fmt.Errorf("session not found: %w", err)
	}

	// Get phase requirements
	var required []repository.PhaseData
	if err := repository.DB.Where("phase_id = ? AND required = ?", currentPhase, true).Find(&required).Error; err != nil {
		return nil, fmt.Errorf("failed to get phase requirements: %w", err)
	}

	// Check what's missing
	var missing []string
	for _, req := range required {
		if !m.isFieldPopulated(session, req.Name) {
			missing = append(missing, req.Name)
		}
	}

	return missing, nil
}

// isFieldPopulated checks if a session field has data by querying SessionFieldValue table
func (m *Machine) isFieldPopulated(session repository.Session, fieldName string) bool {
	// Query SessionFieldValue table for this field
	var fieldValue repository.SessionFieldValue
	err := repository.DB.Where("session_id = ? AND field_name = ?", m.sessionID, fieldName).
		First(&fieldValue).Error

	if err != nil {
		// Field not found or other error means not populated
		return false
	}

	// Check if the field value is not empty
	return strings.TrimSpace(fieldValue.FieldValue) != ""
}


// IsValidTransition validates phase transitions from database
func (m *Machine) IsValidTransition(fromPhase, toPhase string) bool {
	// Check if transition exists in database
	var transition repository.PhaseTransition
	err := repository.DB.Where("from_phase_id = ? AND to_phase_id = ?", fromPhase, toPhase).First(&transition).Error

	// If transition exists in DB, it's valid
	if err == nil {
		return true
	}

	// Special case: can always transition to complete phase
	if toPhase == "complete" {
		return true
	}

	return false
}

// GetPhaseDescription returns phase description from database
func (m *Machine) GetPhaseDescription(phaseID string) string {
	// Get phase from database
	var phase repository.Phase
	if err := repository.DB.Where("id = ?", phaseID).First(&phase).Error; err != nil {
		return phaseID // Return ID if not found
	}
	return phase.Description
}

// ValidateDataRequirements is a public wrapper for validateDataRequirements
func (m *Machine) ValidateDataRequirements(currentPhase string) error {
	return m.validateDataRequirements(currentPhase)
}

// ValidateMinimumTurns is a public wrapper for validateMinimumTurns
func (m *Machine) ValidateMinimumTurns(currentPhase string) error {
	return m.validateMinimumTurns(currentPhase)
}

// CompleteSession marks a session as completed when all requirements are met
func (m *Machine) CompleteSession() error {
	// Get current session
	var session repository.Session
	if err := repository.DB.Where("id = ?", m.sessionID).First(&session).Error; err != nil {
		return fmt.Errorf("session not found: %w", err)
	}

	// Verify we're in the complete phase
	if session.Phase != "complete" {
		return fmt.Errorf("cannot complete session: not in complete phase (currently in %s)", session.Phase)
	}

	// Validate that all requirements for the complete phase are met
	if err := m.ValidatePhaseRequirements("complete"); err != nil {
		return fmt.Errorf("cannot complete session: requirements not met: %w", err)
	}

	// Mark session as completed
	updates := map[string]interface{}{
		"status":     "completed",
		"updated_at": time.Now(),
	}

	if err := repository.DB.Model(&session).Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to mark session as completed: %w", err)
	}

	return nil
}


