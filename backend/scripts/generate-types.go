package main

import (
	"fmt"
	"log"
	"os"
	"reflect"
	"strings"
	"time"

	"therapy-navigation-system/shared"
)

func main() {
	if len(os.Args) < 2 {
		log.Fatal("Usage: go run generate-types.go <output-file>")
	}

	outputFile := os.Args[1]

	// Generate TypeScript interfaces
	output := generateTypeScriptInterfaces()

	// Write to file
	err := os.WriteFile(outputFile, []byte(output), 0644)
	if err != nil {
		log.Fatalf("Failed to write output file: %v", err)
	}

	fmt.Printf("Generated TypeScript types at %s\n", outputFile)
}

func generateTypeScriptInterfaces() string {
	var sb strings.Builder

	// Header
	sb.WriteString("// AUTO-GENERATED: Do not edit manually\n")
	sb.WriteString("// Generated from Go structs in shared/websocket-types.go\n\n")

	// Message type constants
	sb.WriteString("// Message Types\n")
	sb.WriteString("export const MESSAGE_TYPES = {\n")
	sb.WriteString("  // Inbound (frontend -> backend)\n")
	sb.WriteString("  GET_WORKFLOW_STATUS: 'get_workflow_status',\n")
	sb.WriteString("  TOOL_CALL: 'tool_call',\n")
	sb.WriteString("  PAUSE_TIMER: 'pause_timer',\n")
	sb.WriteString("  RESUME_TIMER: 'resume_timer',\n")
	sb.WriteString("  STOP_TIMER: 'stop_timer',\n")
	sb.WriteString("  \n")
	sb.WriteString("  // Outbound (backend -> frontend)\n")
	sb.WriteString("  WORKFLOW_UPDATE: 'workflow_update',\n")
	sb.WriteString("  THERAPY_SESSION_UPDATE: 'therapy_session_update',\n")
	sb.WriteString("  TIMER_UPDATE: 'timer_update',\n")
	sb.WriteString("  PHASE_TIMER_STARTED: 'phase_timer_started',\n")
	sb.WriteString("  PHASE_TIMER_STOPPED: 'phase_timer_stopped',\n")
	sb.WriteString("  PHASE_TIMER_PAUSED: 'phase_timer_paused',\n")
	sb.WriteString("  PHASE_TIMER_RESUMED: 'phase_timer_resumed',\n")
	sb.WriteString("  PHASE_TIMER_COMPLETED: 'phase_timer_completed',\n")
	sb.WriteString("  PHASE_TIMER_CHECKIN: 'phase_timer_checkin',\n")
	sb.WriteString("} as const;\n\n")

	// Timer state enum
	sb.WriteString("export enum TimerState {\n")
	sb.WriteString("  IDLE = 'idle',\n")
	sb.WriteString("  RUNNING = 'running',\n")
	sb.WriteString("  PAUSED = 'paused',\n")
	sb.WriteString("  STOPPED = 'stopped',\n")
	sb.WriteString("  COMPLETED = 'completed',\n")
	sb.WriteString("  EXPIRED = 'expired',\n")
	sb.WriteString("}\n\n")

	// Timer stop reason enum
	sb.WriteString("export enum TimerStopReason {\n")
	sb.WriteString("  MANUAL = 'manual',\n")
	sb.WriteString("  PHASE_TRANSITION = 'phase_transition',\n")
	sb.WriteString("  SESSION_END = 'session_end',\n")
	sb.WriteString("  TIMEOUT = 'timeout',\n")
	sb.WriteString("  ERROR = 'error',\n")
	sb.WriteString("  COMPLETED = 'completed',\n")
	sb.WriteString("}\n\n")

	// Generate interfaces for each struct
	types := []interface{}{
		shared.WebSocketMessage{},
		shared.TherapySessionUpdate{},
		shared.WorkflowStatusResponse{},
		shared.TimerStatus{},
		shared.TimerEvent{},
		shared.Phase{},
		shared.PhaseDataField{},
		shared.TransitionOption{},
		shared.Message{},
		shared.ToolCallRequest{},
		shared.ToolCallResponse{},
	}

	for _, t := range types {
		interfaceName := getTypeName(t)
		sb.WriteString(fmt.Sprintf("export interface %s {\n", interfaceName))
		sb.WriteString(generateFieldsForType(reflect.TypeOf(t)))
		sb.WriteString("}\n\n")
	}

	// WebSocket message union type
	sb.WriteString("// Union type for all possible WebSocket message data\n")
	sb.WriteString("export type WebSocketMessageData = \n")
	sb.WriteString("  | TherapySessionUpdate\n")
	sb.WriteString("  | WorkflowStatusResponse\n")
	sb.WriteString("  | TimerEvent\n")
	sb.WriteString("  | ToolCallRequest\n")
	sb.WriteString("  | ToolCallResponse;\n\n")

	// Type-safe WebSocket message
	sb.WriteString("export interface TypedWebSocketMessage {\n")
	sb.WriteString("  type: string;\n")
	sb.WriteString("  data?: WebSocketMessageData;\n")
	sb.WriteString("  timestamp: string;\n")
	sb.WriteString("}\n\n")

	// Helper type guards
	sb.WriteString("// Type guards for runtime type checking\n")
	sb.WriteString("export function isTherapySessionUpdate(data: any): data is TherapySessionUpdate {\n")
	sb.WriteString("  return data && typeof data === 'object' && 'type' in data;\n")
	sb.WriteString("}\n\n")

	sb.WriteString("export function isWorkflowStatusResponse(data: any): data is WorkflowStatusResponse {\n")
	sb.WriteString("  return data && typeof data === 'object' && 'current_state' in data;\n")
	sb.WriteString("}\n\n")

	sb.WriteString("export function isTimerEvent(data: any): data is TimerEvent {\n")
	sb.WriteString("  return data && typeof data === 'object' && 'phase' in data && 'state' in data;\n")
	sb.WriteString("}\n")

	return sb.String()
}

func getTypeName(t interface{}) string {
	return reflect.TypeOf(t).Name()
}

func generateFieldsForType(t reflect.Type) string {
	var sb strings.Builder

	for i := 0; i < t.NumField(); i++ {
		field := t.Field(i)

		// Skip unexported fields
		if !field.IsExported() {
			continue
		}

		jsonTag := field.Tag.Get("json")
		if jsonTag == "-" {
			continue
		}

		// Parse JSON tag
		jsonName := field.Name
		optional := false
		if jsonTag != "" {
			parts := strings.Split(jsonTag, ",")
			if parts[0] != "" {
				jsonName = parts[0]
			}
			for _, part := range parts[1:] {
				if part == "omitempty" {
					optional = true
				}
			}
		}

		// Convert Go type to TypeScript type
		tsType := convertGoTypeToTypeScript(field.Type)

		// Make field optional if it has omitempty tag
		optionalMarker := ""
		if optional {
			optionalMarker = "?"
		}

		sb.WriteString(fmt.Sprintf("  %s%s: %s;\n", jsonName, optionalMarker, tsType))
	}

	return sb.String()
}

func convertGoTypeToTypeScript(t reflect.Type) string {
	switch t.Kind() {
	case reflect.String:
		return "string"
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64,
		 reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64,
		 reflect.Float32, reflect.Float64:
		return "number"
	case reflect.Bool:
		return "boolean"
	case reflect.Slice, reflect.Array:
		elemType := convertGoTypeToTypeScript(t.Elem())
		return fmt.Sprintf("%s[]", elemType)
	case reflect.Map:
		keyType := convertGoTypeToTypeScript(t.Key())
		valueType := convertGoTypeToTypeScript(t.Elem())
		return fmt.Sprintf("Record<%s, %s>", keyType, valueType)
	case reflect.Ptr:
		return convertGoTypeToTypeScript(t.Elem()) + " | null"
	case reflect.Interface:
		return "any"
	case reflect.Struct:
		if t == reflect.TypeOf(time.Time{}) {
			return "string" // ISO date string
		}
		return t.Name()
	default:
		return "any"
	}
}