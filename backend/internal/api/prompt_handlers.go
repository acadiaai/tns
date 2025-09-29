package api

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"therapy-navigation-system/internal/logger"
	"therapy-navigation-system/internal/repository"

	"github.com/go-chi/chi/v5"
)

// GetSessionPrompts returns all prompt logs for a specific session
func GetSessionPrompts(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")

	// Read the prompts.jsonl file
	// Note: In production, this should be from database
	promptsFile := "logs/prompts.jsonl"
	// Try alternative paths for different environments
	if _, err := os.Stat(promptsFile); os.IsNotExist(err) {
		promptsFile = "/app/logs/prompts.jsonl"
	}
	if _, err := os.Stat(promptsFile); os.IsNotExist(err) {
		promptsFile = "./logs/prompts.jsonl"
	}
	file, err := os.Open(promptsFile)
	if err != nil {
		logger.AppLogger.WithError(err).Warn("Prompts file not found, returning empty results")
		// Return empty results instead of error
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]map[string]interface{}{})
		return
	}
	defer file.Close()

	// Parse JSONL and filter for this session
	var sessionPrompts []map[string]interface{}
	scanner := bufio.NewScanner(file)

	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}

		var promptLog map[string]interface{}
		if err := json.Unmarshal([]byte(line), &promptLog); err != nil {
			continue
		}

		// Filter for this session
		if sid, ok := promptLog["session_id"].(string); ok && sid == sessionID {
			sessionPrompts = append(sessionPrompts, promptLog)
		}
	}

	if err := scanner.Err(); err != nil {
		logger.AppLogger.WithError(err).Error("Error reading prompts file")
	}

	// Return as JSON
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(sessionPrompts)
}

// GetSessionPromptsRawText returns all prompts for a session as raw text
func GetSessionPromptsRawText(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")

	// Read the prompts.jsonl file
	promptsFile := "logs/prompts.jsonl"
	// Try alternative paths for different environments
	if _, err := os.Stat(promptsFile); os.IsNotExist(err) {
		promptsFile = "/app/logs/prompts.jsonl"
	}
	if _, err := os.Stat(promptsFile); os.IsNotExist(err) {
		promptsFile = "./logs/prompts.jsonl"
	}
	file, err := os.Open(promptsFile)
	if err != nil {
		logger.AppLogger.WithError(err).Warn("Prompts file not found, returning empty results")
		// Return empty text results instead of error
		w.Header().Set("Content-Type", "text/plain")
		fmt.Fprintf(w, "=== RAW PROMPT LOG FOR SESSION %s ===\n\nNo prompt logs found.\n", sessionID)
		return
	}
	defer file.Close()

	// Parse JSONL and filter for this session
	var output string
	output += "=== RAW PROMPT LOG FOR SESSION " + sessionID + " ===\n\n"

	scanner := bufio.NewScanner(file)
	turnCount := 0

	for scanner.Scan() {
		line := scanner.Text()
		if line == "" {
			continue
		}

		var promptLog map[string]interface{}
		if err := json.Unmarshal([]byte(line), &promptLog); err != nil {
			continue
		}

		// Filter for this session
		if sid, ok := promptLog["session_id"].(string); ok && sid == sessionID {
			turnCount++

			// Format the output
			output += "========================================\n"
			output += fmt.Sprintf("TURN %d\n", turnCount)

			if timestamp, ok := promptLog["timestamp"].(string); ok {
				output += "Time: " + timestamp + "\n"
			}
			if phase, ok := promptLog["phase"].(string); ok {
				output += "Phase: " + phase + "\n"
			}
			if turnType, ok := promptLog["turn_type"].(string); ok {
				output += "Type: " + turnType + "\n"
			}

			output += "\n"

			// Include user message
			if turnType, ok := promptLog["turn_type"].(string); ok && turnType == "REQUEST" {
				if userMsg, ok := promptLog["user_message"].(string); ok {
					output += "USER MESSAGE:\n"
					output += userMsg + "\n\n"
				}

				if prompt, ok := promptLog["prompt"].(string); ok {
					output += "FULL PROMPT SENT TO AI:\n"
					output += prompt + "\n\n"
				}
			}

			// Include response
			if turnType, ok := promptLog["turn_type"].(string); ok && turnType == "RESPONSE" {
				if responseText, ok := promptLog["response_text"].(string); ok {
					output += "AI RESPONSE:\n"
					output += responseText + "\n\n"
				}

				if functionCalls, ok := promptLog["function_calls"].([]interface{}); ok && len(functionCalls) > 0 {
					output += "TOOL CALLS:\n"
					toolJSON, _ := json.MarshalIndent(functionCalls, "", "  ")
					output += string(toolJSON) + "\n\n"
				}

				if tokenTotal, ok := promptLog["token_total"].(float64); ok {
					output += fmt.Sprintf("Tokens: %d\n", int(tokenTotal))
				}
			}
		}
	}

	if err := scanner.Err(); err != nil {
		logger.AppLogger.WithError(err).Error("Error reading prompts file")
	}

	output += "\n=== END OF SESSION LOG ===\n"
	output += fmt.Sprintf("Total turns: %d\n", turnCount)

	// Return as plain text
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Write([]byte(output))
}

// GetSystemPromptHandler returns the current system prompt
// @Summary Get system prompt
// @Description Retrieve the current system prompt configuration
// @Tags prompts
// @Produce json
// @Success 200 {object} repository.Prompt
// @Router /api/system-prompt [get]
func GetSystemPromptHandler(w http.ResponseWriter, r *http.Request) {
	var prompt repository.Prompt

	// Get the active system prompt from the prompts table
	if err := repository.DB.Where("category = ? AND is_system = ? AND is_active = ?", "system", true, true).
		Order("version DESC").
		First(&prompt).Error; err != nil {

		// Return default if none exists
		if err.Error() == "record not found" {
			prompt = repository.Prompt{
				ID:          "system-prompt-default",
				Name:        "System Prompt",
				Description: "Main system prompt for therapy sessions",
				Category:    "system",
				Content:     "You are a supportive brainspotting therapy assistant.",
				Version:     1,
				IsActive:    true,
				IsSystem:    true,
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(prompt)
			return
		}

		logger.AppLogger.WithError(err).Error("Failed to fetch system prompt")
		http.Error(w, "Failed to fetch system prompt", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(prompt)
}

// UpdateSystemPromptRequest represents a request to update the system prompt
type UpdateSystemPromptRequest struct {
	Content     string `json:"content"`
	Description string `json:"description,omitempty"`
}

// UpdateSystemPromptHandler updates the system prompt
// @Summary Update system prompt
// @Description Update the system prompt configuration
// @Tags prompts
// @Accept json
// @Produce json
// @Param request body UpdateSystemPromptRequest true "Update request"
// @Success 200 {object} repository.Prompt
// @Router /api/system-prompt [put]
func UpdateSystemPromptHandler(w http.ResponseWriter, r *http.Request) {
	var req UpdateSystemPromptRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Get current system prompt
	var currentPrompt repository.Prompt
	err := repository.DB.Where("category = ? AND is_system = ? AND is_active = ?", "system", true, true).
		Order("version DESC").
		First(&currentPrompt).Error

	var newVersion int = 1
	if err == nil {
		// Deactivate current prompt
		currentPrompt.IsActive = false
		repository.DB.Save(&currentPrompt)
		newVersion = currentPrompt.Version + 1
	}

	// Create new version
	newPrompt := repository.Prompt{
		ID:          fmt.Sprintf("system-prompt-v%d", newVersion),
		Name:        "System Prompt",
		Description: req.Description,
		Category:    "system",
		Content:     req.Content,
		Version:     newVersion,
		IsActive:    true,
		IsSystem:    true,
	}

	if req.Description == "" {
		newPrompt.Description = fmt.Sprintf("System prompt for therapy sessions (v%d)", newVersion)
	}

	// Save new prompt
	if err := repository.DB.Create(&newPrompt).Error; err != nil {
		logger.AppLogger.WithError(err).Error("Failed to save system prompt")
		http.Error(w, "Failed to save system prompt", http.StatusInternalServerError)
		return
	}

	logger.AppLogger.WithField("version", newVersion).Info("System prompt updated")
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(newPrompt)
}