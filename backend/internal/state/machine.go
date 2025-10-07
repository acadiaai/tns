package state

import (
	"encoding/json"
	"fmt"
	"strconv"
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

	// Check what's missing (keep full PhaseData for descriptions)
	var missingFields []repository.PhaseData
	for _, req := range required {
		if !m.isFieldPopulated(session, req.Name) {
			missingFields = append(missingFields, req)
		}
	}

	// Get phase for minimum turns requirement
	var phase repository.Phase
	if err := repository.DB.Where("id = ?", currentPhase).First(&phase).Error; err != nil {
		return "", fmt.Errorf("phase not found: %w", err)
	}

	// Count messages since current phase started (match validateMinimumTurns logic)
	var messageCount int64
	if err := repository.DB.Model(&repository.Message{}).
		Where("session_id = ? AND created_at >= ?", m.sessionID, session.PhaseStartTime).
		Count(&messageCount).Error; err != nil {
		return "", fmt.Errorf("failed to count messages: %w", err)
	}

	// Calculate current turns and check requirements
	currentTurns := int(messageCount) / 2
	turnsNeeded := phase.MinimumTurns - currentTurns
	turnsOK := turnsNeeded <= 0

	// Build simple guidance message
	var guidance strings.Builder

	if len(missingFields) == 0 && turnsOK {
		guidance.WriteString("✅ ALL REQUIREMENTS MET - Ready to transition!\n")
		guidance.WriteString("Continue the conversation naturally. The phase transition will happen automatically.\n")
	} else {
		guidance.WriteString("⚠️ TRANSITION REQUIREMENTS:\n\n")

		// Show data requirements
		if len(missingFields) > 0 {
			guidance.WriteString("❌ DATA REQUIREMENTS (missing):\n")
			for _, field := range missingFields {
				guidance.WriteString(fmt.Sprintf("- %s: %s\n",
					field.Name, field.Description))
			}
			guidance.WriteString("\n")
		} else {
			guidance.WriteString("✅ DATA REQUIREMENTS: Complete\n\n")
		}

		// Show turn requirements
		if !turnsOK {
			guidance.WriteString(fmt.Sprintf("❌ MINIMUM TURNS: Need %d more turns (%d/%d)\n",
				turnsNeeded, currentTurns, phase.MinimumTurns))

			// Special guidance when data is complete but turns aren't met
			if len(missingFields) == 0 {
				guidance.WriteString("\n💬 CONTINUE CONVERSATION:\n")
				guidance.WriteString("- All required data has been collected\n")
				guidance.WriteString("- Continue natural conversation to meet minimum turn requirement\n")
				guidance.WriteString("- DO NOT re-ask for data already collected\n")
				guidance.WriteString("- Phase will transition automatically when minimum turns are met\n\n")
			} else {
				guidance.WriteString("\n")
			}
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

// isFieldPopulated checks if a field has data in the current visit's collected_data JSON
func (m *Machine) isFieldPopulated(session repository.Session, fieldName string) bool {
	// Get current visit for this session
	var currentVisit repository.SessionPhaseVisit
	err := repository.DB.Where("session_id = ? AND is_current = ?", m.sessionID, true).
		First(&currentVisit).Error

	if err != nil {
		// No current visit means not populated
		return false
	}

	// Parse collected_data JSON
	var collectedData map[string]interface{}
	if err := json.Unmarshal([]byte(currentVisit.CollectedData), &collectedData); err != nil {
		// Invalid JSON means not populated
		return false
	}

	// Check if field exists and has non-empty value
	value, exists := collectedData[fieldName]
	if !exists {
		return false
	}

	// Check for various empty conditions
	if value == nil {
		return false
	}

	// For strings, check if trimmed value is non-empty
	if strVal, ok := value.(string); ok {
		return strings.TrimSpace(strVal) != ""
	}

	// For other types (bool, number, etc.), existence means populated
	return true
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

// DetermineNextPhase uses decision tree logic to find the best next phase
func (m *Machine) DetermineNextPhase(currentPhase string) (string, error) {
	// Get all valid transitions from current phase, ordered by priority DESC
	var transitions []repository.PhaseTransition
	if err := repository.DB.Where("from_phase_id = ? AND is_active = ?", currentPhase, true).
		Order("priority DESC").
		Find(&transitions).Error; err != nil {
		return "", fmt.Errorf("failed to query transitions: %w", err)
	}

	if len(transitions) == 0 {
		return "", fmt.Errorf("no valid transitions from phase %s", currentPhase)
	}

	// Evaluate conditions to find first matching transition
	for _, transition := range transitions {
		// If no condition, it's a default/fallback transition
		if transition.Condition == "" {
			return transition.ToPhaseID, nil
		}

		// Evaluate the condition
		conditionMet, err := m.EvaluateCondition(transition.Condition)
		if err != nil {
			// Log error but continue to next transition
			continue
		}

		if conditionMet {
			return transition.ToPhaseID, nil
		}
	}

	// No conditions matched - return error
	return "", fmt.Errorf("no transition conditions matched from phase %s", currentPhase)
}

// EvaluateCondition evaluates a simple condition string against session data
// Supported formats: "field_name > value", "field_name = value", "field_name < value"
func (m *Machine) EvaluateCondition(condition string) (bool, error) {
	condition = strings.TrimSpace(condition)

	// Parse condition: "field_name operator value"
	var fieldName, operator, valueStr string

	if strings.Contains(condition, ">=") {
		parts := strings.SplitN(condition, ">=", 2)
		if len(parts) != 2 {
			return false, fmt.Errorf("invalid condition format: %s", condition)
		}
		fieldName = strings.TrimSpace(parts[0])
		operator = ">="
		valueStr = strings.TrimSpace(parts[1])
	} else if strings.Contains(condition, "<=") {
		parts := strings.SplitN(condition, "<=", 2)
		if len(parts) != 2 {
			return false, fmt.Errorf("invalid condition format: %s", condition)
		}
		fieldName = strings.TrimSpace(parts[0])
		operator = "<="
		valueStr = strings.TrimSpace(parts[1])
	} else if strings.Contains(condition, ">") {
		parts := strings.SplitN(condition, ">", 2)
		if len(parts) != 2 {
			return false, fmt.Errorf("invalid condition format: %s", condition)
		}
		fieldName = strings.TrimSpace(parts[0])
		operator = ">"
		valueStr = strings.TrimSpace(parts[1])
	} else if strings.Contains(condition, "<") {
		parts := strings.SplitN(condition, "<", 2)
		if len(parts) != 2 {
			return false, fmt.Errorf("invalid condition format: %s", condition)
		}
		fieldName = strings.TrimSpace(parts[0])
		operator = "<"
		valueStr = strings.TrimSpace(parts[1])
	} else if strings.Contains(condition, "=") {
		parts := strings.SplitN(condition, "=", 2)
		if len(parts) != 2 {
			return false, fmt.Errorf("invalid condition format: %s", condition)
		}
		fieldName = strings.TrimSpace(parts[0])
		operator = "="
		valueStr = strings.TrimSpace(parts[1])
	} else {
		return false, fmt.Errorf("no operator found in condition: %s", condition)
	}

	// Get current visit's collected data
	var session repository.Session
	if err := repository.DB.Where("id = ?", m.sessionID).First(&session).Error; err != nil {
		return false, fmt.Errorf("session not found: %w", err)
	}

	if session.CurrentVisitID == nil {
		// No current visit - condition cannot be met
		return false, nil
	}

	var currentVisit repository.SessionPhaseVisit
	if err := repository.DB.Where("id = ?", *session.CurrentVisitID).First(&currentVisit).Error; err != nil {
		return false, fmt.Errorf("current visit not found: %w", err)
	}

	// Parse the CollectedData JSON
	var collectedData map[string]interface{}
	if err := json.Unmarshal([]byte(currentVisit.CollectedData), &collectedData); err != nil {
		return false, fmt.Errorf("failed to parse collected data: %w", err)
	}

	// Get field value from current visit's data
	fieldValueRaw, exists := collectedData[fieldName]
	if !exists {
		// Field not found in current visit - condition cannot be met
		return false, nil
	}

	// Parse the field value (handle various types)
	var actualValue float64
	switch v := fieldValueRaw.(type) {
	case float64:
		actualValue = v
	case string:
		fieldValueStr := strings.Trim(v, "\"")
		parsedValue, err := strconv.ParseFloat(fieldValueStr, 64)
		if err != nil {
			return false, fmt.Errorf("field value is not numeric: %s", v)
		}
		actualValue = parsedValue
	case int:
		actualValue = float64(v)
	default:
		return false, fmt.Errorf("field value has unsupported type: %T", v)
	}

	// Parse expected value
	expectedValue, err := strconv.ParseFloat(valueStr, 64)
	if err != nil {
		return false, fmt.Errorf("condition value is not numeric: %s", valueStr)
	}

	// Evaluate the condition
	switch operator {
	case ">":
		return actualValue > expectedValue, nil
	case ">=":
		return actualValue >= expectedValue, nil
	case "<":
		return actualValue < expectedValue, nil
	case "<=":
		return actualValue <= expectedValue, nil
	case "=":
		return actualValue == expectedValue, nil
	default:
		return false, fmt.Errorf("unknown operator: %s", operator)
	}
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


