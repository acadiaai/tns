import { useState, useEffect } from 'react';
import { Phase, Message } from '../../../types/websocket';
import { Session } from '../../../generated';

// Clean workflow state that matches our WebSocket structure
export interface WorkflowStatusResponse {
  phase: string;                        // Current phase ID
  current_state: string;                // Same as phase (for compatibility)
  phase_data_values: Record<string, any>; // Collected data values
  phases?: Phase[];                     // All phases with schemas
  recent_messages?: Message[];          // Recent chat messages
  session_id?: string;                  // Session ID (optional during updates)
  session_status?: Session.status; // Session completion status

  // Additional fields needed by components
  phase_description?: string;           // Description of current phase
  phase_data?: any[];                   // Schema for current phase
  transitions?: any[];                  // Available transitions
  available_tools?: string[];           // Available tools
  next_actions?: string[];              // Next actions

  last_transition?: {
    from: string;
    to: string;
    reason: string;
    timestamp: string;
  };
  completion_timestamp?: string;        // When session was completed
}

export interface SessionTimer {
  session_elapsed_seconds: number;
  session_elapsed_formatted: string;
  phase_elapsed_seconds: number;
  phase_elapsed_formatted: string;
  is_paused: boolean;
  start_time: string;
}

export interface WorkflowHook {
  workflowStatus: WorkflowStatusResponse | null;
  currentPhase: string;
  isLoading: boolean;
  isPaused: boolean;
  timer?: { elapsed: number; remaining: number; total: number; phase: string };
  sessionTimer?: SessionTimer;
  sessionStatus: Session.status;
  isCompleted: boolean;
}

export const useWorkflow = (ws: WebSocket | null, sessionId: string): WorkflowHook => {
  // Thin client - no default states, only what backend sends
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [timer, setTimer] = useState<{ elapsed: number; remaining: number; total: number; phase: string }>();
  const [sessionTimer, setSessionTimer] = useState<SessionTimer>();
  const [sessionStatus, setSessionStatus] = useState<Session.status>(Session.status.SCHEDULED);

  // No fallback timer - frontend only displays what backend sends via WebSocket
  const [currentPhaseId, setCurrentPhaseId] = useState<string>('');

  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        // Thin client - just update state from backend

        if (data.type === 'initial_state' || data.type === 'session_updated') {
          // Clean structure - everything at top level
          const workflowState: WorkflowStatusResponse = {
            phase: data.phase || '',
            current_state: data.phase || '',
            phase_data_values: data.phase_data_values || {},
            phases: data.phases || [],
            recent_messages: data.recent_messages || [],
            session_id: sessionId,
            session_status: data.session_status || Session.status.SCHEDULED
          };

          // Update session status state
          if (data.session_status) {
            setSessionStatus(data.session_status);
          }

          console.log('🔄 SESSION STATUS UPDATE:', {
            type: data.type,
            phase: data.phase,
            phase_data_values: data.phase_data_values,
            phases: data.phases?.length,
            fullData: data
          });

          setWorkflowStatus(workflowState);
          setIsLoading(false);

          // If initial state, immediately log messages
          if (data.type === 'initial_state' && data.recent_messages) {
            console.log('📨 Initial messages received:', data.recent_messages);
          }
        } else if (data.type === 'workflow_update') {
          // Handle workflow updates from MCP tools
          const phaseDataValues = data.phase_data_values || {};
          const phase = data.phase;

          console.log('🔄 WORKFLOW UPDATE:', {
            phase: phase,
            phase_data_values: phaseDataValues,
            fullData: data
          });

          setWorkflowStatus(prevStatus => {
            if (!prevStatus) {
              // Create new state if none exists
              return {
                phase: phase || '',
                current_state: phase || '',
                phase_data_values: phaseDataValues,
                phases: [],
                recent_messages: [],
                session_id: sessionId
              };
            }
            return {
              ...prevStatus,
              phase: phase || prevStatus.phase,
              current_state: phase || prevStatus.current_state,
              phase_data_values: phaseDataValues
            };
          });
          setIsLoading(false);
        } else if (data.type === 'phase_transition') {
          // Phase transitions use metadata for from_phase/to_phase (special event type)
          const phaseDataValues = data.phase_data_values;
          const fromPhase = data.metadata?.from_phase;
          const toPhase = data.metadata?.to_phase || data.phase;
          const reason = data.metadata?.reason;

          console.log('🔄 PHASE TRANSITION EVENT:', {
            from: fromPhase,
            to: toPhase,
            reason: reason,
            phase_data_values: phaseDataValues,
            data
          });

          setWorkflowStatus(prevStatus => {
            if (!prevStatus) {
              return {
                phase: toPhase || '',
                current_state: toPhase || '',
                phase_data_values: phaseDataValues || {},
                phases: [],
                recent_messages: [],
                session_id: sessionId,
                last_transition: {
                  from: fromPhase || '',
                  to: toPhase || '',
                  reason: reason || 'Phase transition',
                  timestamp: data.timestamp
                }
              };
            }
            const newStatus: WorkflowStatusResponse = {
              ...prevStatus,
              current_state: toPhase || prevStatus.current_state,
              phase: toPhase || prevStatus.phase,
              // Preserve phase_data_values if present
              ...(phaseDataValues && { phase_data_values: phaseDataValues }),
              last_transition: {
                from: fromPhase || '',
                to: toPhase || '',
                reason: reason || 'Phase transition',
                timestamp: data.timestamp
              }
            };
            console.log('🔄 UPDATING WORKFLOW STATE:', { prevStatus, newStatus });
            return newStatus;
          });
          setIsLoading(false);
          // Request fresh status to get updated phase data
          if (ws.readyState === WebSocket.OPEN) {
            setTimeout(() => {
              ws.send(JSON.stringify({ type: 'get_workflow_status' }));
            }, 500);
          }
        } else if (data.type && typeof data.type === 'string' && data.type.startsWith('phase_timer_')) {
          // Timer events use metadata (special event type)
          const meta = data.metadata || {};

          // Handle timer completion
          if (data.type === 'phase_timer_completed') {
            console.log('⏰ TIMER COMPLETED for phase:', meta.phase);
            setTimer({
              elapsed: Number(meta.total ?? 600), // Set to total duration
              remaining: 0,
              total: Number(meta.total ?? 600),
              phase: String(meta.phase || ''),
            });
            // Could trigger an alert or notification here
          } else {
            setTimer({
              elapsed: Number(meta.elapsed ?? 0),
              remaining: Number(meta.remaining ?? 0),
              total: Number(meta.total ?? 0),
              phase: String(meta.phase || ''),
            });
          }
          setIsLoading(false);
        } else if (data.type === 'session_paused') {
          console.log('⏸️ SESSION PAUSED');
          setIsPaused(true);
        } else if (data.type === 'session_resumed') {
          console.log('▶️ SESSION RESUMED');
          setIsPaused(false);
        } else if (data.type === 'session_completed') {
          // Handle session completion WebSocket event
          console.log('🎉 SESSION COMPLETED EVENT:', data);

          setWorkflowStatus(prevStatus => {
            if (!prevStatus) return prevStatus;
            return {
              ...prevStatus,
              session_status: Session.status.COMPLETED,
              completion_timestamp: data.timestamp || new Date().toISOString()
            };
          });

          setSessionStatus(Session.status.COMPLETED);
          setIsLoading(false);
        } else if (data.type === 'timer_update') {
          // Timer updates use metadata for timer-specific data (special event type)
          const timerData = data.metadata as SessionTimer;
          if (timerData) {
            console.log('⏱️ TIMER UPDATE received:', {
              session_elapsed: timerData.session_elapsed_seconds,
              phase_elapsed: timerData.phase_elapsed_seconds,
              is_paused: timerData.is_paused
            });
            setSessionTimer(timerData);
            if (timerData.is_paused !== undefined) {
              setIsPaused(timerData.is_paused);
            }
          }
        }
      } catch (error) {
        console.error('Error parsing workflow update:', error);
      }
    };

    ws.addEventListener('message', handleMessage);

    // Listen for phase transitions detected from tool call metadata (from useMessages)
    const handlePhaseTransition = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('🔄 CUSTOM PHASE TRANSITION EVENT:', customEvent.detail);
      const { from_phase, to_phase, timestamp } = customEvent.detail;

      setWorkflowStatus(prevStatus => {
        if (!prevStatus) return prevStatus;
        const newStatus: WorkflowStatusResponse = {
          ...prevStatus,
          current_state: to_phase,
          phase: to_phase,
          last_transition: {
            from: from_phase,
            to: to_phase,
            reason: 'Tool call detected transition',
            timestamp: timestamp
          }
        };
        console.log('🔄 UPDATING WORKFLOW STATE FROM CUSTOM EVENT:', { prevStatus, newStatus });
        return newStatus;
      });
      setIsLoading(false);
      // Request fresh status to get updated phase data
      if (ws && ws.readyState === WebSocket.OPEN) {
        setTimeout(() => {
          ws.send(JSON.stringify({ type: 'get_workflow_status' }));
        }, 500);
      }
    };

    window.addEventListener('phase_transition', handlePhaseTransition);

    // Always request fresh data from backend
    const requestWorkflowStatus = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'get_workflow_status' }));
      }
    };

    // Request on connect and periodically to stay in sync
    requestWorkflowStatus();

    const handleOpen = () => {
      requestWorkflowStatus();
    };

    ws.addEventListener('open', handleOpen);

    // WebSocket is event-driven - no polling needed since backend pushes updates

    return () => {
      ws.removeEventListener('message', handleMessage);
      ws.removeEventListener('open', handleOpen);
      window.removeEventListener('phase_transition', handlePhaseTransition);
    };
  }, [ws, sessionId]);

  // Track phase changes and session start for fallback timer
  useEffect(() => {
    const newPhase = workflowStatus?.current_state || '';

    // Track session initialization
    if (workflowStatus && newPhase !== 'pre_session' && newPhase) {
      console.log('🎬 Session started:', new Date());
    }

    // Track phase changes for phase timer
    if (newPhase && newPhase !== currentPhaseId) {
      setCurrentPhaseId(newPhase);
      console.log(`🔄 Phase changed to ${newPhase}:`, new Date());
    }
  }, [workflowStatus?.current_state, currentPhaseId]);

  // No fallback timer - frontend only displays what backend sends via WebSocket
  // This ensures single source of truth for timer state


  // Thin client - only return what backend sent
  const currentPhase = workflowStatus?.current_state || '';
  const isCompleted = sessionStatus === Session.status.COMPLETED;

  return {
    workflowStatus,
    currentPhase,
    isLoading,
    isPaused,
    timer,
    sessionTimer,
    sessionStatus,
    isCompleted,
  };
};