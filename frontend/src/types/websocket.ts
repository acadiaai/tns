// AUTO-GENERATED: Do not edit manually
// Generated from Go structs in shared/websocket-types.go

// Message Types
export const MESSAGE_TYPES = {
  // Inbound (frontend -> backend)
  GET_WORKFLOW_STATUS: 'get_workflow_status',
  TOOL_CALL: 'tool_call',
  PAUSE_TIMER: 'pause_timer',
  RESUME_TIMER: 'resume_timer',
  STOP_TIMER: 'stop_timer',
  
  // Outbound (backend -> frontend)
  WORKFLOW_UPDATE: 'workflow_update',
  THERAPY_SESSION_UPDATE: 'therapy_session_update',
  TIMER_UPDATE: 'timer_update',
  PHASE_TIMER_STARTED: 'phase_timer_started',
  PHASE_TIMER_STOPPED: 'phase_timer_stopped',
  PHASE_TIMER_PAUSED: 'phase_timer_paused',
  PHASE_TIMER_RESUMED: 'phase_timer_resumed',
  PHASE_TIMER_COMPLETED: 'phase_timer_completed',
  PHASE_TIMER_CHECKIN: 'phase_timer_checkin',
} as const;

export enum TimerState {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
}

export enum TimerStopReason {
  MANUAL = 'manual',
  PHASE_TRANSITION = 'phase_transition',
  SESSION_END = 'session_end',
  TIMEOUT = 'timeout',
  ERROR = 'error',
  COMPLETED = 'completed',
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp: string;
}

export interface TherapySessionUpdate {
  type: string;
  phase?: string;
  session_status?: string;
  phase_data_values?: Record<string, any>;
  phases?: Phase[];
  recent_messages?: Message[];
  message?: Message | null;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface WorkflowStatusResponse {
  current_state: string;
  session_id: string;
  phase: string;
  phase_description: string;
  phase_data: PhaseDataField[];
  phase_data_values: Record<string, any>;
  available_tools: string[];
  transitions: TransitionOption[];
  suds_level: number;
  body_location: string;
  eye_position: string;
  time_in_phase_seconds: number;
  next_actions: string[];
  timer_state?: TimerStatus | null;
  timestamp: string;
}

export interface TimerStatus {
  phase: string;
  state: string;
  elapsed: number;
  remaining: number;
  total: number;
  active: boolean;
}

export interface TimerEvent {
  type: string;
  session_id: string;
  phase: string;
  state: string;
  stop_reason?: string | null;
  elapsed: number;
  remaining: number;
  total: number;
  timestamp: string;
}

export interface Phase {
  id: string;
  display_name: string;
  description: string;
  color?: string;
  icon?: string;
  phase_data: PhaseDataField[];
}

export interface PhaseDataField {
  name: string;
  description: string;
  required: boolean;
  data_type: string;
}

export interface TransitionOption {
  to_phase: string;
  description: string;
  position: number;
}

export interface Message {
  id: string;
  session_id: string;
  content: string;
  role: string;
  message_type: string;
  metadata: string;
  created_at: string;
  updated_at: string;
}

export interface ToolCallRequest {
  tool_name: string;
  arguments: Record<string, any>;
}

export interface ToolCallResponse {
  success: boolean;
  result?: Record<string, any>;
  error?: string;
}

// Union type for all possible WebSocket message data
export type WebSocketMessageData = 
  | TherapySessionUpdate
  | WorkflowStatusResponse
  | TimerEvent
  | ToolCallRequest
  | ToolCallResponse;

export interface TypedWebSocketMessage {
  type: string;
  data?: WebSocketMessageData;
  timestamp: string;
}

// Type guards for runtime type checking
export function isTherapySessionUpdate(data: any): data is TherapySessionUpdate {
  return data && typeof data === 'object' && 'type' in data;
}

export function isWorkflowStatusResponse(data: any): data is WorkflowStatusResponse {
  return data && typeof data === 'object' && 'current_state' in data;
}

export function isTimerEvent(data: any): data is TimerEvent {
  return data && typeof data === 'object' && 'phase' in data && 'state' in data;
}
