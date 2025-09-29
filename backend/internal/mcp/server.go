package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"therapy-navigation-system/internal/repository"
	"therapy-navigation-system/internal/state"
	"github.com/sirupsen/logrus"
)

// MCPServer implements the Model Context Protocol server (stripped to essentials)
type MCPServer struct {
	logger    *logrus.Logger
	broadcast func(event interface{})
}

// NewMCPServer creates a new MCP server instance
func NewMCPServer(logger *logrus.Logger, broadcast func(event interface{})) *MCPServer {
	return &MCPServer{
		logger:    logger,
		broadcast: broadcast,
	}
}

// CallTool executes an MCP tool - only 3 essential tools
func (s *MCPServer) CallTool(ctx context.Context, toolName string, arguments json.RawMessage) (interface{}, error) {
	s.logger.WithFields(logrus.Fields{
		"tool": toolName,
		"args": string(arguments),
	}).Info("MCP tool called")

	// Broadcast MCP activity event for UI
	s.broadcast(map[string]interface{}{
		"type":      "mcp_activity",
		"tool":      toolName,
		"timestamp": time.Now(),
		"status":    "executing",
	})

	var result interface{}
	var err error

	// Single universal tool
	switch toolName {
	case "collect_structured_data":
		result, err = s.handleCollectStructuredData(ctx, arguments)
	// REMOVED: therapy_session_transition is now handled automatically via collect_structured_data
	// case "therapy_session_transition":
	//	result, err = s.handleTransition(ctx, arguments)
	default:
		// HARD ERROR - no silent failures
		err = fmt.Errorf("CRITICAL: Unknown tool '%s'. Only available tool: collect_structured_data", toolName)
		s.logger.WithField("tool", toolName).Error("Unknown tool called - failing hard")
		return nil, err
	}

	// Broadcast completion event
	status := "success"
	if err != nil {
		status = "error"
	}

	s.broadcast(map[string]interface{}{
		"type":      "mcp_activity",
		"tool":      toolName,
		"timestamp": time.Now(),
		"status":    status,
		"result":    result,
		"error":     err,
	})

	if err != nil {
		s.logger.WithError(err).Errorf("Tool %s failed", toolName)
		return nil, err
	}

	s.logger.WithFields(logrus.Fields{
		"tool":   toolName,
		"result": result,
	}).Info("MCP tool completed successfully")

	return result, nil
}

// Tool represents an MCP tool definition
type Tool struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	InputSchema map[string]interface{} `json:"inputSchema"`
}

// GetTools returns the single universal MCP tool
func (s *MCPServer) GetTools() []Tool {
	return []Tool{
		{
			Name:        "collect_structured_data",
			Description: "Collect and store data as defined by the current phase requirements. Only collect data that has been explicitly provided in the conversation. The required fields and their schemas are defined in the phase_data table for each workflow phase.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"session_id": map[string]interface{}{
						"type":        "string",
						"description": "The session ID",
					},
					"data": map[string]interface{}{
						"type":        "object",
						"description": "Key-value pairs of data collected based on phase requirements. Each key should match field names defined in phase_data table. Values must reflect actual user responses from the conversation.",
					},
				},
				"required": []string{"session_id", "data"},
			},
		},
	}
}

// handleTransition processes therapy session phase transitions
func (s *MCPServer) handleTransition(ctx context.Context, arguments json.RawMessage) (interface{}, error) {
	var args struct {
		SessionID   string `json:"session_id"`
		TargetPhase string `json:"target_phase"`
		Reason      string `json:"reason"`
	}

	if err := json.Unmarshal(arguments, &args); err != nil {
		return nil, fmt.Errorf("invalid arguments: %w", err)
	}

	// Get current session
	var session repository.Session
	if err := repository.DB.Where("id = ?", args.SessionID).First(&session).Error; err != nil {
		return nil, fmt.Errorf("session not found: %w", err)
	}

	// Use state machine for validation
	stateMachine := state.New(args.SessionID)

	// Handle position-based transitions
	targetPhase := args.TargetPhase

	// Get current phase position
	var currentPhaseRecord repository.Phase
	if err := repository.DB.Where("id = ?", session.Phase).First(&currentPhaseRecord).Error; err != nil {
		return nil, fmt.Errorf("current phase not found: %w", err)
	}

	if args.TargetPhase == "next" {
		// Find next phase by position
		s.logger.WithFields(logrus.Fields{
			"current_phase": currentPhaseRecord.ID,
			"current_position": currentPhaseRecord.Position,
			"looking_for_position": currentPhaseRecord.Position + 1,
		}).Debug("Looking for next phase")

		var nextPhase repository.Phase
		if err := repository.DB.Where("position = ?", currentPhaseRecord.Position+1).First(&nextPhase).Error; err != nil {
			// Check if we're in the final phase - if so, complete the session instead of transitioning
			if currentPhaseRecord.ID == "complete" {
				s.logger.WithField("session_id", args.SessionID).Info("🎉 COMPLETING SESSION - No next phase needed")

				// Use state machine to complete the session
				stateMachine := state.New(args.SessionID)
				if err := stateMachine.CompleteSession(); err != nil {
					return nil, fmt.Errorf("failed to complete session: %w", err)
				}

				// Broadcast session completion
				s.broadcast(map[string]interface{}{
					"type": "session_completed",
					"session_id": args.SessionID,
					"timestamp": time.Now(),
					"message": "Session successfully completed!",
				})

				return map[string]interface{}{
					"success": true,
					"message": "Session completed successfully",
					"status": "completed",
					"timestamp": time.Now(),
				}, nil
			}
			return nil, fmt.Errorf("no next phase found after position %d", currentPhaseRecord.Position)
		}
		targetPhase = nextPhase.ID

		s.logger.WithFields(logrus.Fields{
			"found_phase": nextPhase.ID,
			"found_position": nextPhase.Position,
		}).Debug("Found next phase")
	} else {
		// Check if target is a position number
		if position := parsePosition(args.TargetPhase); position > 0 {
			var targetPhaseRecord repository.Phase
			if err := repository.DB.Where("position = ?", position).First(&targetPhaseRecord).Error; err != nil {
				return nil, fmt.Errorf("no phase found at position %d", position)
			}
			targetPhase = targetPhaseRecord.ID
		}
		// Otherwise use the target as-is (assume it's a phase ID)
	}

	// Validate transition
	if !stateMachine.IsValidTransition(session.Phase, targetPhase) {
		return nil, fmt.Errorf("invalid transition from %s to %s", session.Phase, targetPhase)
	}

	// Validate requirements and provide guidance if failed - check CURRENT phase completion
	if err := stateMachine.ValidatePhaseRequirements(session.Phase); err != nil {
		// Get specific guidance for what's missing in CURRENT phase
		guidance, guidanceErr := stateMachine.GetPhaseGuidance(session.Phase)
		if guidanceErr != nil {
			guidance = "Unable to get phase guidance"
		}

		// Get missing fields dynamically from database
		missingFields, fieldsErr := stateMachine.GetMissingFields(session.Phase)
		if fieldsErr != nil {
			missingFields = []string{} // fallback to empty if error
		}

		// Return structured response instead of error so AI can process it
		return map[string]interface{}{
			"success": false,
			"error": fmt.Sprintf("phase requirements not met: %s", err.Error()),
			"guidance": guidance,
			"missing_fields": missingFields, // Now database-driven!
			"instructions": "Use collect_structured_data() to collect the missing data before attempting transition.",
		}, nil
	}

	// Store old phase for logging
	oldPhase := session.Phase

	// Update session phase
	updates := map[string]interface{}{
		"phase":            targetPhase,
		"phase_start_time": time.Now(),
		"updated_at":       time.Now(),
	}

	if err := repository.DB.Model(&session).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("failed to update session: %w", err)
	}

	s.logger.WithFields(logrus.Fields{
		"session_id":    args.SessionID,
		"from_phase":    oldPhase,
		"to_phase":      targetPhase,
		"reason":        args.Reason,
	}).Info("✅ Phase transition successful")

	// Broadcast phase transition event for frontend
	s.broadcast(map[string]interface{}{
		"type": "phase_transition",
		"session_id": args.SessionID,
		"from_phase": oldPhase,
		"to_phase": targetPhase,
		"reason": args.Reason,
		"timestamp": time.Now(),
	})

	// Broadcast workflow update for UI reactivity
	// Get all collected data for this session to include in broadcast
	var allCollectedData []repository.SessionFieldValue
	repository.DB.Where("session_id = ?", args.SessionID).Find(&allCollectedData)

	// Get PhaseData records to map names to IDs
	var phaseDataRecords []repository.PhaseData
	repository.DB.Where("phase_id = ?", targetPhase).Find(&phaseDataRecords)

	// Create name->ID mapping
	nameToID := make(map[string]string)
	for _, pd := range phaseDataRecords {
		nameToID[pd.Name] = pd.ID
	}

	phaseDataValues := make(map[string]interface{})
	for _, field := range allCollectedData {
		// Always use field name as key to match frontend expectations
		phaseDataValues[field.FieldName] = field.FieldValue
	}

	// Get phase details for the broadcast
	var newPhase repository.Phase
	repository.DB.Where("id = ?", targetPhase).First(&newPhase)

	s.broadcast(map[string]interface{}{
		"type": "workflow_update",
		"current_state": targetPhase,
		"session_id": args.SessionID,
		"phase": targetPhase,
		"phase_description": newPhase.Description,
		"phase_data_values": phaseDataValues,
		"timestamp": time.Now(),
	})

	return map[string]interface{}{
		"success":     true,
		"new_phase":   targetPhase,
		"message":     fmt.Sprintf("Transitioned to %s", targetPhase),
		"timestamp":   time.Now(),
	}, nil
}


// handleCollectStructuredData stores phase-required data and handles auto-transitions
func (s *MCPServer) handleCollectStructuredData(ctx context.Context, arguments json.RawMessage) (interface{}, error) {
	var args struct {
		SessionID string                 `json:"session_id"`
		Data      map[string]interface{} `json:"data"`
	}

	if err := json.Unmarshal(arguments, &args); err != nil {
		return nil, fmt.Errorf("invalid arguments: %w", err)
	}

	// Get current session and required fields
	var session repository.Session
	if err := repository.DB.Where("id = ?", args.SessionID).First(&session).Error; err != nil {
		return nil, fmt.Errorf("session not found: %w", err)
	}

	// Get required fields for current phase
	var requiredFields []repository.PhaseData
	repository.DB.Where("phase_id = ? AND required = ?", session.Phase, true).Find(&requiredFields)

	// Check what requirements we satisfy (no mapping - use exact field names)
	requirementsSatisfied := []string{}
	extraDataStored := []string{}

	for key, value := range args.Data {
		// Check if this key matches a required field exactly
		isRequired := false
		for _, field := range requiredFields {
			if field.Name == key {
				isRequired = true
				requirementsSatisfied = append(requirementsSatisfied, key)
				break
			}
		}

		if !isRequired {
			extraDataStored = append(extraDataStored, key)
		}

		// Convert value to JSON string for storage
		fieldValueBytes, _ := json.Marshal(value)
		fieldValueStr := string(fieldValueBytes)

		// Detect type
		fieldType := "string"
		switch value.(type) {
		case float64:
			fieldType = "number"
		case bool:
			fieldType = "boolean"
		case map[string]interface{}, []interface{}:
			fieldType = "object"
		}

		// Store in SessionFieldValue
		fieldValueRecord := repository.SessionFieldValue{
			SessionID:  args.SessionID,
			PhaseID:    session.Phase,
			FieldName:  key, // Use original field name
			FieldValue: fieldValueStr,
			FieldType:  fieldType,
		}

		// Upsert the record
		repository.DB.Where("session_id = ? AND field_name = ?", args.SessionID, key).
			Assign(repository.SessionFieldValue{
				FieldValue: fieldValueStr,
				FieldType:  fieldType,
				PhaseID:    session.Phase,
				UpdatedAt:  time.Now(),
			}).
			FirstOrCreate(&fieldValueRecord)
	}

	// Check if all requirements are now satisfied by checking ALL collected data
	var allCollectedForSession []repository.SessionFieldValue
	repository.DB.Where("session_id = ?", args.SessionID).Find(&allCollectedForSession)

	// Build a map of all collected field names
	collectedFieldNames := make(map[string]bool)
	for _, field := range allCollectedForSession {
		collectedFieldNames[field.FieldName] = true
	}

	// Check which required fields are still missing
	missingRequirements := []string{}
	for _, reqField := range requiredFields {
		if !collectedFieldNames[reqField.Name] {
			missingRequirements = append(missingRequirements, reqField.Name)
		}
	}

	// Use state machine to check if we can transition (includes timing constraints)
	stateMachine := state.New(args.SessionID)
	readyToTransition := stateMachine.ValidatePhaseRequirements(session.Phase) == nil

	// Get detailed validation results for logging
	dataRequirementsErr := stateMachine.ValidateDataRequirements(session.Phase)
	minimumTurnsErr := stateMachine.ValidateMinimumTurns(session.Phase)

	// DEBUG: Add detailed transition readiness logging
	s.logger.WithFields(logrus.Fields{
		"session_id": args.SessionID,
		"missing_requirements_count": len(missingRequirements),
		"missing_requirements": missingRequirements,
		"ready_to_transition": readyToTransition,
		"required_fields_count": len(requiredFields),
		"collected_fields_count": len(collectedFieldNames),
		"data_requirements_met": dataRequirementsErr == nil,
		"minimum_turns_met": minimumTurnsErr == nil,
		"data_requirements_error": func() string {
			if dataRequirementsErr != nil {
				return dataRequirementsErr.Error()
			}
			return ""
		}(),
		"timing_constraints_error": func() string {
			if minimumTurnsErr != nil {
				return minimumTurnsErr.Error()
			}
			return ""
		}(),
	}).Info("🔍 DEBUG: Comprehensive transition readiness check")

	s.logger.WithFields(logrus.Fields{
		"session_id": args.SessionID,
		"current_phase": session.Phase,
		"data_fields": len(args.Data),
		"fields_stored": func() []string {
			names := []string{}
			for key := range args.Data {
				names = append(names, key)
			}
			return names
		}(),
		"requirements_satisfied": len(requirementsSatisfied),
		"extra_data": len(extraDataStored),
		"missing_requirements": missingRequirements,
		"all_collected_count": len(allCollectedForSession),
		"ready_to_transition": readyToTransition,
	}).Info("✅ Structured data collected and requirements checked")

	// Broadcast workflow update so UI refreshes with new data
	// Get all collected data for this session
	var allCollectedData []repository.SessionFieldValue
	repository.DB.Where("session_id = ?", args.SessionID).Find(&allCollectedData)

	// Get PhaseData records to map names to IDs
	var phaseDataRecords []repository.PhaseData
	repository.DB.Where("phase_id = ?", session.Phase).Find(&phaseDataRecords)

	// Create name->ID mapping
	nameToID := make(map[string]string)
	for _, pd := range phaseDataRecords {
		nameToID[pd.Name] = pd.ID
	}

	// Build phase_data_values map using field names as keys (frontend expects names, not IDs)
	phaseDataValues := make(map[string]interface{})
	for _, field := range allCollectedData {
		// Always use field name as key to match frontend expectations
		phaseDataValues[field.FieldName] = field.FieldValue
	}

	// DEBUG: Log exactly what we're broadcasting
	s.logger.WithFields(logrus.Fields{
		"session_id": args.SessionID,
		"phase_data_values_count": len(phaseDataValues),
		"phase_data_values": phaseDataValues,
		"all_collected_count": len(allCollectedData),
	}).Info("🔍 DEBUG: About to broadcast workflow_update with phase data")

	// Broadcast workflow status update
	s.broadcast(map[string]interface{}{
		"type": "workflow_update",
		"current_state": session.Phase,
		"session_id": args.SessionID,
		"phase": session.Phase,
		"phase_data_values": phaseDataValues,
		"timestamp": time.Now(),
	})

	// AUTO-TRANSITION: If ready, automatically transition to next phase
	transitionResult := map[string]interface{}{}
	s.logger.WithFields(logrus.Fields{
		"session_id": args.SessionID,
		"ready_to_transition": readyToTransition,
		"current_phase": session.Phase,
	}).Info("🔍 DEBUG: About to check auto-transition condition")

	if readyToTransition {
		// Check if we're in status_check phase and have a next_action field
		targetPhase := "next" // default

		if session.Phase == "status_check" {
			// Look for next_action in collected data to determine branching
			for _, field := range allCollectedData {
				if field.FieldName == "next_action" {
					// The value should be a phase ID directly from the enum
					// Remove quotes if present (JSON string)
					targetPhase = strings.Trim(field.FieldValue, "\"")
					s.logger.WithFields(logrus.Fields{
						"raw_value": field.FieldValue,
						"cleaned_value": targetPhase,
					}).Info("📍 Status check branching based on next_action")
					break
				}
			}
		}

		s.logger.WithFields(logrus.Fields{
			"session_id": args.SessionID,
			"current_phase": session.Phase,
			"target_phase": targetPhase,
		}).Info("🚀 AUTO-TRANSITION: All requirements met, transitioning")

		// Call internal transition logic
		transitionArgs := struct {
			SessionID   string `json:"session_id"`
			TargetPhase string `json:"target_phase"`
			Reason      string `json:"reason"`
		}{
			SessionID:   args.SessionID,
			TargetPhase: targetPhase,
			Reason:      "Auto-transition: All phase requirements satisfied",
		}
		transitionArgsBytes, _ := json.Marshal(transitionArgs)

		// Execute transition
		result, err := s.handleTransition(ctx, transitionArgsBytes)
		if err != nil {
			s.logger.WithError(err).Error("❌ AUTO-TRANSITION FAILED")
			transitionResult = map[string]interface{}{
				"auto_transition_attempted": true,
				"auto_transition_success":   false,
				"auto_transition_error":     err.Error(),
			}
		} else {
			s.logger.WithField("session_id", args.SessionID).Info("✅ AUTO-TRANSITION SUCCESSFUL")
			transitionResult = map[string]interface{}{
				"auto_transition_attempted": true,
				"auto_transition_success":   true,
				"transition_result":         result,
			}

			// Trigger coach message for phase transition
			// This will be picked up by the WebSocket handler to generate a transition message
			s.broadcast(map[string]interface{}{
				"type": "phase_transition_completed",
				"session_id": args.SessionID,
				"new_phase": targetPhase,
				"trigger_coach_message": true,
				"timestamp": time.Now(),
			})
		}
	} else {
		s.logger.WithFields(logrus.Fields{
			"session_id": args.SessionID,
			"current_phase": session.Phase,
			"missing_requirements": missingRequirements,
			"ready_to_transition": readyToTransition,
			"data_requirements_met": dataRequirementsErr == nil,
			"minimum_turns_met": minimumTurnsErr == nil,
			"blocking_reason": func() string {
				if dataRequirementsErr != nil && minimumTurnsErr != nil {
					return "Both data and minimum turns requirements not met"
				} else if dataRequirementsErr != nil {
					return "Data requirements not met"
				} else if minimumTurnsErr != nil {
					return "Minimum turns requirement not met"
				}
				return "Unknown reason"
			}(),
		}).Info("⏸️ AUTO-TRANSITION SKIPPED: Requirements not satisfied")
	}

	// Merge results
	response := map[string]interface{}{
		"success": true,
		"requirements_satisfied": requirementsSatisfied,
		"extra_data_stored": extraDataStored,
		"missing_requirements": missingRequirements,
		"ready_to_transition": readyToTransition,
		"timestamp": time.Now(),
	}

	// Add transition results if any
	for k, v := range transitionResult {
		response[k] = v
	}

	return response, nil
}

// parsePosition tries to parse a string as a position number
func parsePosition(target string) int {
	if position, err := strconv.Atoi(target); err == nil && position > 0 {
		return position
	}
	return 0
}

