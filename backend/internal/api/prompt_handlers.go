package api

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"therapy-navigation-system/internal/logger"

	"github.com/go-chi/chi/v5"
)

// GetSessionPrompts returns all prompt logs for a specific session
func GetSessionPrompts(w http.ResponseWriter, r *http.Request) {
	sessionID := chi.URLParam(r, "id")

	// Read the prompts.jsonl file
	// Note: In production, this should be from database
	promptsFile := "/Users/acadiaai/projects/therapy-navigation-system/backend/logs/prompts.jsonl"
	file, err := os.Open(promptsFile)
	if err != nil {
		logger.AppLogger.WithError(err).Error("Failed to open prompts file")
		http.Error(w, "Failed to read prompts", http.StatusInternalServerError)
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
	promptsFile := "/Users/acadiaai/projects/therapy-navigation-system/backend/logs/prompts.jsonl"
	file, err := os.Open(promptsFile)
	if err != nil {
		logger.AppLogger.WithError(err).Error("Failed to open prompts file")
		http.Error(w, "Failed to read prompts", http.StatusInternalServerError)
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