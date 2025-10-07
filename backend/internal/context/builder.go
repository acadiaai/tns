package contextbuilder

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"regexp"
	"strings"
	"sync"
	"time"

	"therapy-navigation-system/internal/repository"
	"therapy-navigation-system/internal/state"
	"therapy-navigation-system/internal/logger"
	"github.com/sirupsen/logrus"
)

// TokenReport provides approximate token counts per section
type TokenReport struct {
	Sections map[string]int `json:"sections"`
	Total    int            `json:"total"`
}


// ContextBundle contains the last constructed context for a session
type ContextBundle struct {
	SessionID         string          `json:"session_id"`
	Phase             string          `json:"phase"`
	ConstructedPrompt string          `json:"constructed_prompt"`
	TokenReport       TokenReport     `json:"token_report"`
	Tools             []string        `json:"tools"`
	Timestamp         time.Time       `json:"timestamp"`
	PromptHash        string          `json:"prompt_hash"`
}

var lastContexts sync.Map // sessionID -> *ContextBundle

// Last returns the last built context for a session
func Last(sessionID string) (*ContextBundle, bool) {
	if v, ok := lastContexts.Load(sessionID); ok {
		if b, ok2 := v.(*ContextBundle); ok2 {
			return b, true
		}
	}
	return nil, false
}

// BuildTurnContext builds the per-turn constructed prompt and stores it as last context
func BuildTurnContext(sessionID string, phase string) (*ContextBundle, error) {
	logger.AppLogger.WithFields(map[string]interface{}{
		"session_id": sessionID,
		"phase":      phase,
	}).Info("[CONTEXT_DEBUG] Starting BuildTurnContext")
	
	// 1) Load system prompt from database (no hardcoded prompts)  
	logger.AppLogger.WithField("session_id", sessionID).Info("[CONTEXT_DEBUG] Loading system prompt from database")
	
	var sp repository.Prompt
	if err := repository.DB.Where("category = ? AND is_active = ?", "system", true).First(&sp).Error; err != nil {
		logger.AppLogger.WithFields(map[string]interface{}{
			"session_id": sessionID,
			"error":      err.Error(),
		}).Error("[CONTEXT_DEBUG] Failed to load system prompt")
		return nil, fmt.Errorf("failed to load system prompt: %w", err)
	}
	
	systemPrompt := sp.Content
	logger.AppLogger.WithFields(map[string]interface{}{
		"session_id":    sessionID,
		"prompt_name":   sp.Name,
		"prompt_length": len(systemPrompt),
		"version":       sp.Version,
	}).Info("[CONTEXT_DEBUG] System prompt loaded successfully")
	
	logger.AppLogger.WithField("session_id", sessionID).Info("[CONTEXT_DEBUG] System prompt loaded, loading phase templates")

	// 2) Load phase templates from database (proper versioning)
	logger.AppLogger.WithFields(map[string]interface{}{
		"session_id": sessionID,
		"phase": phase,
	}).Info("[CONTEXT_DEBUG] Loading phase templates from database for phase")

	// Check if this is a timed_waiting phase and determine pre/post wait state
	var currentPhase repository.Phase
	var phaseState string
	if err := repository.DB.Where("id = ?", phase).First(&currentPhase).Error; err == nil {
		if currentPhase.Type == "timed_waiting" {
			// Check if wait has started
			var phaseStateRecord repository.SessionPhaseState
			if err := repository.DB.Where("session_id = ? AND phase_id = ?", sessionID, phase).First(&phaseStateRecord).Error; err == nil {
				if phaseStateRecord.WaitStartedAt != nil {
					phaseState = "post_wait"
				} else {
					phaseState = "pre_wait"
				}
			} else {
				phaseState = "pre_wait" // Default to pre_wait if no state record
			}
			logger.AppLogger.WithFields(map[string]interface{}{
				"session_id": sessionID,
				"phase": phase,
				"phase_state": phaseState,
			}).Info("[CONTEXT_DEBUG] Detected timed_waiting phase, using phase_state")
		}
	}

	var phasePrompts []repository.Prompt
	query := repository.DB.Where("workflow_phase = ? AND is_active = ?", phase, true)
	if phaseState != "" {
		query = query.Where("phase_state = ?", phaseState)
	} else {
		query = query.Where("phase_state IS NULL OR phase_state = ''")
	}
	if err := query.Order("created_at").Find(&phasePrompts).Error; err != nil {
		logger.AppLogger.WithFields(map[string]interface{}{
			"session_id": sessionID,
			"phase": phase,
			"phase_state": phaseState,
			"error":      err.Error(),
		}).Warn("[CONTEXT_DEBUG] Failed to load phase prompts, using empty")
	}

	var phaseTemplates []string
	for _, prompt := range phasePrompts {
		phaseTemplates = append(phaseTemplates, prompt.Content)
		logger.AppLogger.WithFields(map[string]interface{}{
			"session_id": sessionID,
			"phase": phase,
			"prompt_name": prompt.Name,
		}).Debug("[CONTEXT_DEBUG] Added phase template")
	}

	logger.AppLogger.WithFields(map[string]interface{}{
		"session_id":            sessionID,
		"phase":                 phase,
		"phase_templates_count": len(phaseTemplates),
	}).Info("[CONTEXT_DEBUG] Phase templates loaded")
	
	logger.AppLogger.WithField("session_id", sessionID).Info("[CONTEXT_DEBUG] Loading phase addendum")
	phaseAddendum := ""
	{
		var pa repository.PromptAddendum
		_ = repository.DB.Where("session_id = '' AND phase = ?", phase).Order("version DESC").First(&pa).Error
		phaseAddendum = pa.Content
	}
	logger.AppLogger.WithField("session_id", sessionID).Info("[CONTEXT_DEBUG] Phase addendum loaded")

	// Build substitution variables (therapist/client/session)
	logger.AppLogger.WithField("session_id", sessionID).Info("[CONTEXT_DEBUG] Loading session with therapist/client data")
	vars := map[string]string{"session_id": sessionID}
	{
		var session repository.Session
		if err := repository.DB.Preload("Therapist").Preload("Client").First(&session, "id = ?", sessionID).Error; err == nil {
			if session.Therapist.Name != "" {
				vars["therapist_name"] = session.Therapist.Name
			}
			if session.Client.Name != "" {
				vars["client_name"] = session.Client.Name
			}
		}
	}
	logger.AppLogger.WithField("session_id", sessionID).Info("[CONTEXT_DEBUG] Session data loaded successfully")
	
	logger.AppLogger.WithField("session_id", sessionID).Info("[CONTEXT_DEBUG] About to start variable substitution")
	// Substitute known vars and remove any remaining {{var}} tokens
	substitute := func(s string) string {
		out := s
		for k, v := range vars {
			token := "{{" + k + "}}"
			out = strings.ReplaceAll(out, token, v)
		}
		// Remove any remaining template tokens like {{anything}}
		re := regexp.MustCompile(`\{\{[^}]+\}\}`)
		out = re.ReplaceAllString(out, "")
		return out
	}

	// Apply substitution to prompts before assembly
	systemPrompt = substitute(systemPrompt)
	for i := range phaseTemplates {
		phaseTemplates[i] = substitute(phaseTemplates[i])
	}
	if phaseAddendum != "" {
		phaseAddendum = substitute(phaseAddendum)
	}

	// 3) Awareness summary from session
	logger.AppLogger.WithField("session_id", sessionID).Info("[CONTEXT_DEBUG] About to build awareness summary")
	awareness := buildAwarenessSummary(sessionID)
	logger.AppLogger.WithField("session_id", sessionID).Info("[CONTEXT_DEBUG] Awareness summary built")

	// 4) Working memory (recent messages)
	logger.AppLogger.WithField("session_id", sessionID).Info("[CONTEXT_DEBUG] About to build working memory")
	workingMemory := buildWorkingMemory(sessionID)
	logger.AppLogger.WithField("session_id", sessionID).Info("[CONTEXT_DEBUG] Working memory built")

	// 4.5) Detect post-transition scenario and add explicit instruction
	phaseTransitionInstruction := ""
	var session repository.Session
	if err := repository.DB.First(&session, "id = ?", sessionID).Error; err == nil {
		// Check if phase just started (within last 3 seconds) AND working memory exists
		timeSincePhaseStart := time.Since(session.PhaseStartTime)
		if timeSincePhaseStart < 3*time.Second && workingMemory != "" {
			phaseTransitionInstruction = `
PHASE TRANSITION DETECTED:
You just transitioned to a new phase. The previous conversation is shown in Working Memory above.
DO NOT greet the client again - you already did that in the previous phase.
Instead, begin this new phase by asking the first appropriate question or making a relevant statement for this phase's purpose.
Reference the previous conversation naturally to maintain continuity.`
			logger.AppLogger.WithFields(map[string]interface{}{
				"session_id":         sessionID,
				"phase":              phase,
				"time_since_start":   timeSincePhaseStart.Seconds(),
			}).Info("[CONTEXT_DEBUG] Post-transition detected - adding explicit instruction")
		}
	}

	// 5) Retrieval removed - ChromaDB integration deleted

	// 6) Enforce a simple token budget per section (approx 4 chars/token)
	const totalBudgetTokens = 1500
	caps := map[string]int{
		"system_phase": int(0.30 * float64(totalBudgetTokens)),
		"awareness":    int(0.15 * float64(totalBudgetTokens)),
		"working":      int(0.35 * float64(totalBudgetTokens)),
	}

	rawSystemPhase := systemPrompt + "\n\n" + strings.Join(phaseTemplates, "\n")
	if phaseAddendum != "" {
		rawSystemPhase += "\n\n" + phaseAddendum
	}

	truncate := func(s string, capTokens int) string {
		if capTokens <= 0 {
			return ""
		}
		maxChars := capTokens * 4
		if len(s) <= maxChars {
			return s
		}
		cut := maxChars
		if cut > len(s) {
			cut = len(s)
		}
		if idx := strings.LastIndex(s[:cut], "\n"); idx > 0 && idx > cut-200 {
			cut = idx
		}
		return s[:cut]
	}

	finalSystemPhase := truncate(rawSystemPhase, caps["system_phase"])
	finalAwareness := truncate(awareness, caps["awareness"])
	finalWorking := truncate(workingMemory, caps["working"])

	// Assemble constructed prompt from truncated sections
	var sb strings.Builder
	sb.WriteString("SYSTEM PROMPT\n")
	sb.WriteString(finalSystemPhase)
	if finalAwareness != "" {
		sb.WriteString("\n\nAWARENESS\n")
		sb.WriteString(finalAwareness)
	}
	if finalWorking != "" {
		sb.WriteString("\n\nWORKING MEMORY (recent dialogue)\n")
		sb.WriteString(finalWorking)
	}

	// Add phase transition instruction if detected
	if phaseTransitionInstruction != "" {
		sb.WriteString("\n\n")
		sb.WriteString(phaseTransitionInstruction)
	}

	// Add phase requirements and transitions from state machine
	phaseContext := buildPhaseContextFromStateMachine(sessionID, phase)
	if phaseContext != "" {
		sb.WriteString("\n\nPHASE WORKFLOW\n")
		sb.WriteString(phaseContext)
	}

	// Phase requirements are handled by extractor - AI doesn't need to see them

	sb.WriteString(fmt.Sprintf("\n\nSESSION INFO\nCurrent Session ID: %s\n", sessionID))

	constructed := sb.String()

	// Compute prompt hash for audit/debugging
	sum := sha256.Sum256([]byte(constructed))
	promptHash := hex.EncodeToString(sum[:])

	// 8) Token report after truncation
	sections := map[string]string{
		"system_phase": finalSystemPhase,
		"awareness":    finalAwareness,
		"working":      finalWorking,
	}
	tr := TokenReport{Sections: map[string]int{}, Total: 0}
	for k, v := range sections {
		t := len(v) / 4
		tr.Sections[k] = t
		tr.Total += t
	}

	logger.AppLogger.WithField("session_id", sessionID).Info("[CONTEXT_DEBUG] Creating ContextBundle")
	
	bundle := &ContextBundle{
		SessionID:         sessionID,
		Phase:             phase,
		ConstructedPrompt: constructed,
		TokenReport:       tr,
		Tools:             []string{}, // Empty - data extraction happens separately
		Timestamp:         time.Now(),
		PromptHash:        promptHash,
	}
	
	logger.AppLogger.WithFields(map[string]interface{}{
		"session_id":     sessionID,
		"prompt_length":  len(bundle.ConstructedPrompt),
		"token_total":    tr.Total,
	}).Info("[CONTEXT_DEBUG] ContextBundle created, storing in lastContexts")
	
	lastContexts.Store(sessionID, bundle)
	
	logger.AppLogger.WithField("session_id", sessionID).Info("[CONTEXT_DEBUG] Bundle stored, returning to caller")
	return bundle, nil
}

func buildAwarenessSummary(sessionID string) string {
	var session repository.Session
	if err := repository.DB.First(&session, "id = ?", sessionID).Error; err != nil {
		return ""
	}

	lines := []string{
		fmt.Sprintf("Phase: %s", session.Phase),
	}

	// Get all collected field values for this session
	var fieldValues []repository.SessionFieldValue
	repository.DB.Where("session_id = ?", session.ID).Find(&fieldValues)

	// Build map of collected fields for current phase
	collectedForPhase := make(map[string]string)
	for _, fv := range fieldValues {
		// Check if this field belongs to current phase
		var phaseData repository.PhaseData
		if err := repository.DB.Where("phase_id = ? AND name = ?", session.Phase, fv.FieldName).First(&phaseData).Error; err == nil {
			collectedForPhase[fv.FieldName] = fv.FieldValue
		}
	}

	// Show ALL collected data for current phase (not just hardcoded fields)
	if len(collectedForPhase) > 0 {
		lines = append(lines, "")
		lines = append(lines, "COLLECTED DATA:")
		for fieldName, fieldValue := range collectedForPhase {
			lines = append(lines, fmt.Sprintf("  %s: %s", fieldName, fieldValue))
		}
	}

	// Get required fields for current phase
	var requiredFields []repository.PhaseData
	repository.DB.Where("phase_id = ? AND required = ?", session.Phase, true).Find(&requiredFields)

	// Find missing required fields
	var missing []string
	for _, field := range requiredFields {
		if _, exists := collectedForPhase[field.Name]; !exists {
			missing = append(missing, field.Name)
		}
	}

	// Show what's still needed - this guides the coach toward completing the phase
	if len(missing) > 0 {
		lines = append(lines, "")
		lines = append(lines, "MISSING REQUIRED FIELDS:")
		for _, fieldName := range missing {
			lines = append(lines, fmt.Sprintf("  - %s", fieldName))
		}
	}

	return "- " + strings.Join(lines, "\n- ")
}

func buildWorkingMemory(sessionID string) string {
	logger.AppLogger.WithField("session_id", sessionID).Info("[CONTEXT_DEBUG] buildWorkingMemory: Starting function")

	var messages []repository.Message
	logger.AppLogger.WithField("session_id", sessionID).Info("[CONTEXT_DEBUG] buildWorkingMemory: About to query database")
	_ = repository.DB.Where("session_id = ?", sessionID).Order("created_at DESC").Limit(30).Find(&messages)
	logger.AppLogger.WithFields(map[string]interface{}{
		"session_id": sessionID,
		"message_count": len(messages),
	}).Info("[CONTEXT_DEBUG] buildWorkingMemory: Database query completed")

	// Sliding window approach: collect MOST RECENT messages until hitting token budget
	// Industry standard: 8K-16K tokens for chatbot working memory (2025 best practices)
	const capChars = 10000 // ~2500 tokens = last 15-20 exchanges

	// Collect recent messages (newest first from query)
	var recentMessages []repository.Message
	charCount := 0
	for i := range messages {
		// Domain-agnostic: capitalize database role directly
		role := strings.Title(messages[i].Role) // "client" -> "Client", "coach" -> "Coach"
		line := fmt.Sprintf("%s: %s\n", role, messages[i].Content)
		if charCount + len(line) > capChars {
			break
		}
		recentMessages = append(recentMessages, messages[i])
		charCount += len(line)
	}

	logger.AppLogger.WithFields(map[string]interface{}{
		"session_id": sessionID,
		"total_messages": len(messages),
		"included_messages": len(recentMessages),
		"char_count": charCount,
	}).Info("[CONTEXT_DEBUG] buildWorkingMemory: Collected recent messages")

	// Reverse to render chronologically (oldest to newest)
	for i, j := 0, len(recentMessages)-1; i < j; i, j = i+1, j-1 {
		recentMessages[i], recentMessages[j] = recentMessages[j], recentMessages[i]
	}

	// Build final string
	var sb strings.Builder
	for i := range recentMessages {
		// Domain-agnostic: capitalize database role directly
		role := strings.Title(recentMessages[i].Role) // "client" -> "Client", "coach" -> "Coach"
		sb.WriteString(fmt.Sprintf("%s: %s\n", role, recentMessages[i].Content))
	}

	return sb.String()
}


// buildPhaseContextFromStateMachine provides AI with current phase requirements and transitions
func buildPhaseContextFromStateMachine(sessionID string, currentPhase string) string {
	logger.AppLogger.WithFields(logrus.Fields{
		"session_id": sessionID,
		"phase": currentPhase,
	}).Info("[PHASE_CONTEXT_DEBUG] Starting buildPhaseContextFromStateMachine")

	var sb strings.Builder

	// Get phase data from database
	var phaseData []repository.PhaseData
	if err := repository.DB.Where("phase_id = ?", currentPhase).Find(&phaseData).Error; err != nil {
		logger.AppLogger.WithFields(logrus.Fields{
			"session_id": sessionID,
			"phase": currentPhase,
			"error": err.Error(),
		}).Error("[PHASE_CONTEXT_DEBUG] Failed to query phase data")
		return ""
	}

	logger.AppLogger.WithFields(logrus.Fields{
		"session_id": sessionID,
		"phase": currentPhase,
		"phase_data_count": len(phaseData),
	}).Info("[PHASE_CONTEXT_DEBUG] Found phase data items")

	// Just show current phase - extractor handles data collection
	sb.WriteString(fmt.Sprintf("CURRENT PHASE: %s\n", currentPhase))

	// Get possible transitions
	var transitions []repository.PhaseTransition
	if err := repository.DB.Where("from_phase_id = ?", currentPhase).Find(&transitions).Error; err == nil && len(transitions) > 0 {
		sb.WriteString("\nNEXT PHASES AVAILABLE:\n")
		for _, trans := range transitions {
			sb.WriteString(fmt.Sprintf("- %s\n", trans.ToPhaseID))
		}
	}

	// TIME AWARENESS DISABLED: Using wall clock time was misleading the AI
	// TODO: Implement proper accumulated therapy time tracking
	// The WebSocket timer tracks accumulated time but it's not accessible here yet

	// For status_check phase, add explicit guidance about respecting patient choice
	if currentPhase == "status_check" {
		sb.WriteString("\nSTATUS CHECK GUIDANCE:\n")
		sb.WriteString("🎯 CRITICAL: When collecting next_action field, respect the patient's explicit choice\n")
		sb.WriteString("- If patient requests squeeze_hug, set next_action: 'squeeze_hug'\n")
		sb.WriteString("- If patient requests positive_installation, set next_action: 'positive_installation'\n")
		sb.WriteString("- If patient requests more mindfulness, set next_action: 'focused_mindfulness'\n")
		sb.WriteString("- Only use 'complete' if patient explicitly wants to end the session\n")
		sb.WriteString("- DO NOT override patient preference based on time or other factors\n")
	}

	// Clean, simple reference - no random validation

	result := sb.String()
	logger.AppLogger.WithFields(logrus.Fields{
		"session_id": sessionID,
		"phase": currentPhase,
		"context_length": len(result),
		"context_preview": func() string {
			if len(result) > 200 {
				return result[:200]
			}
			return result
		}(),
	}).Info("[PHASE_CONTEXT_DEBUG] Built phase context")

	return result
}

// buildPhaseRequirementsStatus checks phase requirements using state machine
func buildPhaseRequirementsStatus(sessionID string, currentPhase string) string {
	// Use state machine for phase guidance - no more hardcoded field mappings!
	stateMachine := state.New(sessionID)
	guidance, err := stateMachine.GetPhaseGuidance(currentPhase)
	if err != nil {
		logger.AppLogger.WithError(err).Error("Failed to get phase guidance from state machine")
		return "❌ Unable to check phase requirements\n"
	}

	logger.AppLogger.WithFields(logrus.Fields{
		"session_id": sessionID,
		"phase":      currentPhase,
		"guidance":   guidance,
	}).Info("[PHASE_REQ_DEBUG] Got guidance from state machine")

	return guidance
}

// loadPhaseToolsFromDB loads tools for a phase using Phase -> PhaseTools -> Tools relationship
func loadPhaseToolsFromDB(phaseID string) ([]string, error) {
	var phaseTools []repository.PhaseTool
	err := repository.DB.
		Preload("Tool").
		Where("phase_id = ? AND is_active = ?", phaseID, true).
		Find(&phaseTools).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query phase tools: %w", err)
	}

	if len(phaseTools) == 0 {
		return nil, fmt.Errorf("no tools found for phase %s - this is a configuration error", phaseID)
	}

	var toolStrings []string
	for _, phaseTool := range phaseTools {
		if !phaseTool.Tool.IsActive {
			continue // Skip inactive tools
		}

		// Format tool string for context (tool_name with basic signature)
		toolString := phaseTool.Tool.Name + "(session_id, ...)"
		toolStrings = append(toolStrings, toolString)
	}

	if len(toolStrings) == 0 {
		return nil, fmt.Errorf("no active tools found for phase %s - this is a configuration error", phaseID)
	}

	logger.AppLogger.WithFields(logrus.Fields{
		"phase_id":    phaseID,
		"tools_count": len(toolStrings),
		"tools":       toolStrings,
	}).Info("Loaded phase tools from database")

	return toolStrings, nil
}


