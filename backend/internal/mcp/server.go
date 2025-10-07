package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"therapy-navigation-system/internal/repository"
	"therapy-navigation-system/internal/state"
	"github.com/google/uuid"
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

	// Essential tools
	switch toolName {
	case "collect_structured_data":
		result, err = s.handleCollectStructuredData(ctx, arguments)
	case "check_auto_transition":
		result, err = s.handleCheckAutoTransition(ctx, arguments)
	default:
		// HARD ERROR - no silent failures
		err = fmt.Errorf("CRITICAL: Unknown tool '%s'. Available tools: collect_structured_data, check_auto_transition", toolName)
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

// GetTools returns available MCP tools
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
		{
			Name:        "check_auto_transition",
			Description: "Check if the current phase requirements are met and automatically transition to the next phase if ready. This tool should be called after every conversation turn to ensure timely phase progression.",
			InputSchema: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"session_id": map[string]interface{}{
						"type":        "string",
						"description": "The session ID to check for auto-transition",
					},
				},
				"required": []string{"session_id"},
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

	// Reject same-phase transitions (no-ops)
	if targetPhase == session.Phase {
		return nil, fmt.Errorf("cannot transition to current phase: already in %s", targetPhase)
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

	// === VISIT-BASED TRANSITION LOGIC ===
	// 1. Close the current visit (if exists)
	if session.CurrentVisitID != nil {
		now := time.Now()
		if err := repository.DB.Model(&repository.SessionPhaseVisit{}).
			Where("id = ?", *session.CurrentVisitID).
			Updates(map[string]interface{}{
				"exited_at":  &now,
				"is_current": false,
			}).Error; err != nil {
			s.logger.WithError(err).Warn("Failed to close current visit")
		}
	}

	// 2. Calculate visit number for target phase
	var visitCount int64
	repository.DB.Model(&repository.SessionPhaseVisit{}).
		Where("session_id = ? AND phase_id = ?", session.ID, targetPhase).
		Count(&visitCount)
	visitNumber := int(visitCount) + 1

	// 3. Find which transition was taken (for exit_transition_id)
	var transitionID *string
	var transition repository.PhaseTransition
	if err := repository.DB.Where("from_phase_id = ? AND to_phase_id = ? AND is_active = ?",
		oldPhase, targetPhase, true).First(&transition).Error; err == nil {
		transitionID = &transition.ID
	}

	// 4. Create new visit node
	newVisitID := uuid.New().String()
	newVisit := repository.SessionPhaseVisit{
		ID:                 newVisitID,
		SessionID:          session.ID,
		PhaseID:            targetPhase,
		VisitNumber:        visitNumber,
		EnteredAt:          time.Now(),
		IsCurrent:          true,
		EnteredFromVisitID: session.CurrentVisitID, // Link to previous visit
		ExitTransitionID:   nil,                    // Will be set when exiting
		CollectedData:      "{}",                   // Fresh data for this visit
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
	}

	if err := repository.DB.Create(&newVisit).Error; err != nil {
		return nil, fmt.Errorf("failed to create visit node: %w", err)
	}

	// 5. Update the exit_transition_id on the previous visit
	if session.CurrentVisitID != nil && transitionID != nil {
		repository.DB.Model(&repository.SessionPhaseVisit{}).
			Where("id = ?", *session.CurrentVisitID).
			Update("exit_transition_id", transitionID)
	}

	// 6. Update session to point to new visit
	updates := map[string]interface{}{
		"phase":            targetPhase,
		"current_visit_id": newVisitID,
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

// handleCheckAutoTransition checks if phase requirements are met and automatically transitions if ready
func (s *MCPServer) handleCheckAutoTransition(ctx context.Context, arguments json.RawMessage) (interface{}, error) {
	var args struct {
		SessionID string `json:"session_id"`
	}

	if err := json.Unmarshal(arguments, &args); err != nil {
		return nil, fmt.Errorf("invalid arguments: %w", err)
	}

	// Get current session
	var session repository.Session
	if err := repository.DB.Where("id = ?", args.SessionID).First(&session).Error; err != nil {
		return nil, fmt.Errorf("session not found: %w", err)
	}

	// Use state machine to check if we can transition
	stateMachine := state.New(args.SessionID)
	readyToTransition := stateMachine.ValidatePhaseRequirements(session.Phase) == nil

	// Get detailed validation results for logging
	dataRequirementsErr := stateMachine.ValidateDataRequirements(session.Phase)
	minimumTurnsErr := stateMachine.ValidateMinimumTurns(session.Phase)

	// Log comprehensive transition readiness check
	s.logger.WithFields(logrus.Fields{
		"session_id":               args.SessionID,
		"current_phase":            session.Phase,
		"ready_to_transition":      readyToTransition,
		"data_requirements_met":    dataRequirementsErr == nil,
		"minimum_turns_met":        minimumTurnsErr == nil,
		"data_requirements_error":  func() string { if dataRequirementsErr != nil { return dataRequirementsErr.Error() }; return "" }(),
		"timing_constraints_error": func() string { if minimumTurnsErr != nil { return minimumTurnsErr.Error() }; return "" }(),
	}).Info("🔍 Auto-transition check")

	// If ready, automatically transition to next phase
	if readyToTransition {
		// Use decision tree logic to determine next phase
		targetPhase, err := stateMachine.DetermineNextPhase(session.Phase)
		if err != nil {
			s.logger.WithError(err).Error("❌ Decision tree failed to determine next phase")
			return map[string]interface{}{
				"auto_transition_attempted": true,
				"auto_transition_success":   false,
				"auto_transition_error":     fmt.Sprintf("decision tree error: %s", err.Error()),
				"data_requirements_met":     dataRequirementsErr == nil,
				"minimum_turns_met":         minimumTurnsErr == nil,
				"ready_to_transition":       readyToTransition,
			}, nil
		}

		s.logger.WithFields(logrus.Fields{
			"session_id":    args.SessionID,
			"current_phase": session.Phase,
			"target_phase":  targetPhase,
		}).Info("🚀 AUTO-TRANSITION: All requirements met, decision tree determined next phase")

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
			return map[string]interface{}{
				"auto_transition_attempted": true,
				"auto_transition_success":   false,
				"auto_transition_error":     err.Error(),
			}, nil
		}

		s.logger.WithField("session_id", args.SessionID).Info("✅ AUTO-TRANSITION SUCCESSFUL")

		// Extract the resolved phase from transition result
		resultMap, _ := result.(map[string]interface{})
		actualNewPhase, _ := resultMap["new_phase"].(string)

		s.logger.WithFields(logrus.Fields{
			"session_id":      args.SessionID,
			"resolved_phase":  actualNewPhase,
			"original_target": targetPhase,
		}).Info("🔄 Broadcasting resolved phase for coach message generation")

		// Trigger coach message generation for the new phase
		s.broadcast(map[string]interface{}{
			"type":                  "phase_transition_completed",
			"session_id":            args.SessionID,
			"new_phase":             actualNewPhase,
			"trigger_coach_message": true,
			"timestamp":             time.Now(),
		})

		return map[string]interface{}{
			"auto_transition_attempted": true,
			"auto_transition_success":   true,
			"transition_result":         result,
		}, nil
	}

	// Data collected but not ready to transition
	// Check if we should trigger coach continuation message
	dataRequirementsComplete := dataRequirementsErr == nil
	turnsBlocking := minimumTurnsErr != nil

	if dataRequirementsComplete && turnsBlocking {
		// All data collected, only waiting for minimum turns
		s.logger.WithField("session_id", args.SessionID).Info("🔄 Data complete, turns blocking - triggering coach continuation")
		s.broadcast(map[string]interface{}{
			"type":                  "data_collected_continue_conversation",
			"session_id":            args.SessionID,
			"current_phase":         session.Phase,
			"trigger_coach_message": true,
			"timestamp":             time.Now(),
		})
	}

	return map[string]interface{}{
		"ready_to_transition":      readyToTransition,
		"auto_transition_attempted": false,
		"data_requirements_met":    dataRequirementsErr == nil,
		"minimum_turns_met":        minimumTurnsErr == nil,
	}, nil
}

// handleCollectStructuredData stores phase-required data
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

	// === VISIT-SCOPED DATA STORAGE ===
	// Get current visit
	if session.CurrentVisitID == nil {
		return nil, fmt.Errorf("no current visit - cannot collect data")
	}

	var currentVisit repository.SessionPhaseVisit
	if err := repository.DB.Where("id = ?", *session.CurrentVisitID).First(&currentVisit).Error; err != nil {
		return nil, fmt.Errorf("current visit not found: %w", err)
	}

	// Parse existing collected data for this visit
	var visitData map[string]interface{}
	if err := json.Unmarshal([]byte(currentVisit.CollectedData), &visitData); err != nil {
		visitData = make(map[string]interface{})
	}

	// Get required fields for current phase
	var requiredFields []repository.PhaseData
	repository.DB.Where("phase_id = ? AND required = ?", session.Phase, true).Find(&requiredFields)

	// Check what requirements we satisfy (no mapping - use exact field names)
	requirementsSatisfied := []string{}
	extraDataStored := []string{}

	for key, value := range args.Data {
		// Skip nil values - don't store them at all
		if value == nil {
			continue
		}

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

		// Store in current visit's CollectedData JSON
		visitData[key] = value
	}

	// Save updated visit data
	updatedDataJSON, _ := json.Marshal(visitData)
	if err := repository.DB.Model(&currentVisit).Update("collected_data", string(updatedDataJSON)).Error; err != nil {
		return nil, fmt.Errorf("failed to update visit data: %w", err)
	}

	// Check if all requirements are now satisfied using current visit's data
	// Build a map of all collected field names in this visit
	collectedFieldNames := make(map[string]bool)
	for key := range visitData {
		collectedFieldNames[key] = true
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
		"visit_collected_count": len(visitData),
		"ready_to_transition": readyToTransition,
	}).Info("✅ Structured data collected and requirements checked")

	// Broadcast workflow update so UI refreshes with new data
	// Use visitData directly (already a map[string]interface{})
	phaseDataValues := visitData

	// DEBUG: Log exactly what we're broadcasting
	s.logger.WithFields(logrus.Fields{
		"session_id": args.SessionID,
		"phase_data_values_count": len(phaseDataValues),
		"phase_data_values": phaseDataValues,
		"visit_collected_count": len(visitData),
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

	// Return data collection results
	// NOTE: Auto-transition logic has been moved to separate check_auto_transition tool
	return map[string]interface{}{
		"success": true,
		"requirements_satisfied": requirementsSatisfied,
		"extra_data_stored": extraDataStored,
		"missing_requirements": missingRequirements,
		"ready_to_transition": readyToTransition,
		"timestamp": time.Now(),
	}, nil
}

// parsePosition tries to parse a string as a position number
func parsePosition(target string) int {
	if position, err := strconv.Atoi(target); err == nil && position > 0 {
		return position
	}
	return 0
}

