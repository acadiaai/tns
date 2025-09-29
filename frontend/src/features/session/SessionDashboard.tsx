import React, { useState, useEffect } from 'react';
import { apiUrl } from '../../config/api';
import { fetchWithAuth } from '../../utils/auth-interceptor';
import { ChatPanel } from './components/ChatPanel';
import { PromptExplorer } from './PromptExplorer';
import { WorkflowExplorer } from './components/WorkflowExplorer';
import { useWebSocket } from './hooks/useWebSocket';
import { useMessages } from './hooks/useMessages';
import { useWorkflow } from './hooks/useWorkflow';
import { GitBranch, FileText } from 'lucide-react';
import { PhaseIcon } from '../../utils/iconMapper';
import { FullscreenWaiting } from '../../components/FullscreenWaiting';

interface SessionDashboardProps {
  sessionId?: string;
}


export const SessionDashboard: React.FC<SessionDashboardProps> = ({ sessionId }) => {
  if (!sessionId) {
    return <div className="flex items-center justify-center h-full text-white/60">No session ID provided</div>;
  }

  // Custom hooks for state management
  const { ws, isConnected, sendMessage } = useWebSocket(sessionId);
  const { messages } = useMessages(ws);
  const { workflowStatus, isPaused, sessionTimer, isCompleted } = useWorkflow(ws, sessionId);

  // UI state - only one panel can be shown at a time
  const [rightPanel, setRightPanel] = useState<'workflow' | 'prompts' | null>('workflow');
  const [showTimers, setShowTimers] = useState(false);

  // State to maintain last known phase info to prevent top bar shimmer
  const [lastKnownPhaseInfo, setLastKnownPhaseInfo] = useState<any>(null);
  const [phases, setPhases] = useState<any[]>([]);

  // Fullscreen waiting state
  const [showFullscreenWaiting, setShowFullscreenWaiting] = useState(false);
  const [waitingPhase, setWaitingPhase] = useState<any>(null);

  // Get phase from WebSocket data - workflowStatus should have all we need
  const currentPhase = workflowStatus?.phase || workflowStatus?.current_state || '';
  const phaseDescription = workflowStatus?.phase_description || '';

  // Fetch phases only if we need metadata (colors, icons)
  React.useEffect(() => {
    fetchWithAuth(apiUrl('/api/phases'))
      .then(res => res.json())
      .then(data => {
        console.log('Loaded phases with data:', data);
        setPhases(data);
        // Also set last known if we have current phase
        if (currentPhase) {
          const found = data.find((p: any) => p.id === currentPhase);
          if (found) setLastKnownPhaseInfo(found);
        }
      })
      .catch(err => console.error('Failed to load phases:', err));
  }, [currentPhase]);

  // Monitor for timed waiting phases and auto-launch fullscreen
  useEffect(() => {
    const phaseMetadata = phases.find(p => p.id === currentPhase);

    // Check if current phase is a timed_waiting type
    if (phaseMetadata?.type === 'timed_waiting' && !showFullscreenWaiting) {
      console.log('🎯 Launching fullscreen waiting for phase:', currentPhase);
      setWaitingPhase(phaseMetadata);
      setShowFullscreenWaiting(true);
    } else if (phaseMetadata?.type !== 'timed_waiting' && showFullscreenWaiting) {
      // Phase changed away from timed waiting, close fullscreen
      setShowFullscreenWaiting(false);
      setWaitingPhase(null);
    }
  }, [currentPhase, phases, showFullscreenWaiting]);

  // Build display info from WebSocket data first, fallback to API data
  const displayPhaseInfo = React.useMemo(() => {
    // Always show something if we have a phase from WebSocket
    if (currentPhase) {
      // Find phase metadata from API
      const phaseMetadata = phases.find((p: any) => p.id === currentPhase);

      // Return combined data - we ALWAYS have something to show
      return {
        id: currentPhase,
        display_name: phaseMetadata?.display_name || currentPhase.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: phaseDescription || phaseMetadata?.description || '',
        color: phaseMetadata?.color,
        icon: phaseMetadata?.icon || 'Circle',
        // From WebSocket - using correct property name
        phase_data: workflowStatus?.phase_data || [],
        phase_data_values: workflowStatus?.phase_data_values || {},
        transitions: workflowStatus?.transitions || [],
        available_tools: workflowStatus?.available_tools || []
      };
    }

    // Only use lastKnownPhaseInfo if we have NO current phase from WebSocket
    return lastKnownPhaseInfo;
  }, [currentPhase, phaseDescription, phases, workflowStatus, lastKnownPhaseInfo]);

  console.log('🔧 SessionDashboard debug:', {
    workflowStatus,
    currentPhase,
    displayPhaseInfo,
    phases: workflowStatus?.phases,
    sessionTimer,
    isPaused
  });

  console.log('⏱️ Timer Debug:', {
    sessionTimer,
    hasSessionTimer: !!sessionTimer,
    phase_elapsed: sessionTimer?.phase_elapsed_seconds,
    session_elapsed: sessionTimer?.session_elapsed_seconds,
    is_paused: sessionTimer?.is_paused
  });

  // Frontend is just a dumb display - show what backend sends


  const handleSendMessage = (content: string) => {
    sendMessage({
      type: 'message',
      content,
      role: 'patient'
    });
  };

  // Get phase color for dynamic theming
  const phaseColor = displayPhaseInfo?.color;

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden">
      {/* GLASSMORPHIC STATUS BAR WITH PHASE-AWARE COLORS */}
      <div
        className="sticky top-0 z-50 backdrop-blur-xl border-b transition-all duration-500"
        style={{
          backgroundColor: `${phaseColor}18`,
          borderColor: `${phaseColor}40`,
          boxShadow: `0 4px 24px -4px ${phaseColor}25`
        }}
      >
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Phase and Session Controls */}
          <div className="flex items-center gap-4">
            {/* Phase Badge with Glow Effect */}
            {displayPhaseInfo ? (
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-md transition-all duration-300 hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${displayPhaseInfo.color}25 0%, ${displayPhaseInfo.color}15 100%)`,
                  border: `1px solid ${displayPhaseInfo.color}50`,
                  boxShadow: `0 0 20px ${displayPhaseInfo.color}20, inset 0 0 20px ${displayPhaseInfo.color}10`
                }}
              >
                <PhaseIcon
                  icon={isCompleted ? 'CheckCircle' : displayPhaseInfo.icon}
                  className={isCompleted ? "text-white" : "text-white animate-pulse"}
                  size={18}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white/90">
                    {isCompleted ? 'Complete!' : displayPhaseInfo.display_name}
                  </span>
                  {(displayPhaseInfo.description || isCompleted) && (
                    <span className="text-xs text-white/50 truncate max-w-[300px]">
                      {isCompleted
                        ? `Completed at ${workflowStatus?.completion_timestamp
                            ? new Date(workflowStatus.completion_timestamp).toLocaleTimeString()
                            : new Date().toLocaleTimeString()}`
                        : displayPhaseInfo.description}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-md bg-white/5 border border-white/10">
                <div className="w-5 h-5 bg-white/10 rounded-full animate-pulse" />
                <div className="flex flex-col gap-1">
                  <div className="w-24 h-3 bg-white/10 rounded animate-pulse" />
                  <div className="w-16 h-2 bg-white/5 rounded animate-pulse" />
                </div>
              </div>
            )}

            {/* Neon Timer Controls */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl backdrop-blur-md bg-white/[0.03] border border-white/10">
              <div className="flex items-center gap-1.5">
                {/* Play Button */}
                <button
                  className={`p-2 rounded-lg transition-all ${
                    !isPaused
                      ? 'bg-green-500/30 border-2 border-green-400 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.5)] cursor-default'
                      : 'bg-green-500/10 border border-green-400/30 text-green-400/60 hover:bg-green-500/20 hover:scale-105 cursor-pointer'
                  }`}
                  onClick={() => {
                    if (isPaused) {
                      sendMessage({ type: 'resume_session' });
                    }
                  }}
                  title="Play"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                </button>

                {/* Pause Button */}
                <button
                  className={`p-2 rounded-lg transition-all ${
                    isPaused
                      ? 'bg-yellow-500/30 border-2 border-yellow-400 text-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)] cursor-default'
                      : 'bg-yellow-500/10 border border-yellow-400/30 text-yellow-400/60 hover:bg-yellow-500/20 hover:scale-105 cursor-pointer'
                  }`}
                  onClick={() => {
                    if (!isPaused) {
                      sendMessage({ type: 'pause_session' });
                    }
                  }}
                  title="Pause"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
                  </svg>
                </button>


                {/* Animated Pie Progress Timers - Only show when session is active (not in pre-session) */}
                {sessionTimer && currentPhase !== 'pre_session' && (
                  <div className="flex items-center gap-1.5 ml-2">
                    {/* Phase Timer Pie - Accumulative (left) */}
                    <button
                      className="relative w-8 h-8 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border transition-all duration-200 group"
                      style={{
                        borderColor: `${phaseColor}30`,
                      }}
                      onClick={() => setShowTimers(!showTimers)}
                      title={`Time in Current Phase: ${Math.floor((sessionTimer.phase_elapsed_seconds || 0) / 60)} minutes`}
                    >
                      <svg className="absolute inset-0 w-8 h-8 -rotate-90">
                        {/* Background circle */}
                        <circle
                          cx="16"
                          cy="16"
                          r="12"
                          fill="none"
                          stroke={`${phaseColor}20`}
                          strokeWidth="2"
                        />
                        {/* Progress circle - accumulative (fills up) */}
                        <circle
                          cx="16"
                          cy="16"
                          r="12"
                          fill="none"
                          stroke={phaseColor}
                          strokeOpacity="0.6"
                          strokeWidth="2"
                          strokeDasharray={`${Math.min(75.4, ((sessionTimer.phase_elapsed_seconds || 0) / 900 * 75.4))} 75.4`}
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[9px] font-bold" style={{ color: `${phaseColor}` }}>
                          {Math.floor((sessionTimer.phase_elapsed_seconds || 0) / 60)}
                        </span>
                      </span>
                      {/* Label on hover */}
                      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap" style={{ color: `${phaseColor}60` }}>
                        Phase
                      </span>
                    </button>

                    {/* Session Timer Pie - Counting Down (right) */}
                    <button
                      className="relative w-8 h-8 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] transition-all duration-200 group"
                      onClick={() => setShowTimers(!showTimers)}
                      title={`Session Time: ${Math.floor((sessionTimer.session_elapsed_seconds || 0) / 60)} minutes elapsed`}
                    >
                      <svg className="absolute inset-0 w-8 h-8 -rotate-90">
                        {/* Background circle */}
                        <circle
                          cx="16"
                          cy="16"
                          r="12"
                          fill="none"
                          stroke={`${phaseColor}20`}
                          strokeWidth="2"
                        />
                        {/* Progress circle - inverted for countdown (15 min phases) */}
                        <circle
                          cx="16"
                          cy="16"
                          r="12"
                          fill="none"
                          stroke={phaseColor}
                          strokeOpacity="0.6"
                          strokeWidth="2"
                          strokeDasharray={`${Math.max(0, 75.4 - ((sessionTimer.session_elapsed_seconds || 0) / 3600 * 75.4))} 75.4`}
                          className="transition-all duration-1000"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[9px] font-bold" style={{ color: `${phaseColor}` }}>
                          {Math.floor((sessionTimer.session_elapsed_seconds || 0) / 60)}
                        </span>
                      </span>
                      {/* Label on hover */}
                      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap" style={{ color: `${phaseColor}60` }}>
                        Phase
                      </span>
                    </button>

                    {/* Expandable Timer Display with Live Countdown */}
                    {showTimers && (
                      <div
                        className="flex items-center gap-3 px-3 py-1.5 ml-2 rounded-lg backdrop-blur-md animate-fade-in"
                        style={{
                          background: `linear-gradient(135deg, ${phaseColor}08 0%, ${phaseColor}03 100%)`,
                          border: `1px solid ${phaseColor}15`
                        }}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] uppercase tracking-wider" style={{ color: `${phaseColor}60` }}>Phase Time</span>
                          <span className="text-sm font-mono tabular-nums" style={{ color: `${phaseColor}` }}>
                            {(() => {
                              const elapsed = sessionTimer.phase_elapsed_seconds || 0;
                              const mins = Math.floor(elapsed / 60);
                              const secs = elapsed % 60;
                              return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                            })()}
                          </span>
                          <span className="text-[8px]" style={{ color: `${phaseColor}50` }}>elapsed</span>
                        </div>
                        <div className="w-px h-8 bg-white/10" />
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-white/40 uppercase tracking-wider">Session Time</span>
                          <span className="text-sm font-mono text-white/90 tabular-nums">
                            {(() => {
                              const elapsed = sessionTimer.session_elapsed_seconds || 0;
                              const mins = Math.floor(elapsed / 60);
                              const secs = elapsed % 60;
                              return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                            })()}
                          </span>
                          <span className="text-[8px] text-white/30">elapsed</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Empty - removed redundant status badge */}
          </div>

          {/* Glassmorphic View Controls and Connection Status */}
          <div className="flex items-center gap-4">
            {/* View Toggle Buttons - Stripe-inspired segmented control */}
            <div className="flex items-center backdrop-blur-md bg-white/[0.03] rounded-xl border border-white/10 p-1">
              <button
                onClick={() => setRightPanel(rightPanel === 'workflow' ? null : 'workflow')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all duration-200 ${
                  rightPanel === 'workflow'
                    ? 'bg-white/[0.1] text-white shadow-lg shadow-white/5 border border-white/10'
                    : 'text-white/60 hover:text-white/80 hover:bg-white/[0.05]'
                }`}>
                <GitBranch className="w-3.5 h-3.5" />
                Explorer
              </button>
              <button
                onClick={() => setRightPanel(rightPanel === 'prompts' ? null : 'prompts')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all duration-200 ${
                  rightPanel === 'prompts'
                    ? 'bg-white/[0.1] text-white shadow-lg shadow-white/5 border border-white/10'
                    : 'text-white/60 hover:text-white/80 hover:bg-white/[0.05]'
                }`}>
                <FileText className="w-3.5 h-3.5" />
                Prompts
              </button>
            </div>

            {/* Connection Status Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl backdrop-blur-md bg-white/[0.03] border border-white/10">
              <div className="relative">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                {isConnected && (
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping" />
                )}
              </div>
              <span className="text-xs font-medium text-white/60">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
              {/* End Session - Hidden in dropdown or requires confirmation */}
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to end this session? This action cannot be undone.')) {
                    sendMessage({ type: 'stop_session' });
                    // Could also navigate away or show completion screen
                  }
                }}
                className="ml-2 text-[10px] text-red-400/40 hover:text-red-400/80 transition-colors"
                title="End Session"
              >
                End
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          <ChatPanel
            messages={messages}
            isConnected={isConnected}
            onSendMessage={handleSendMessage}
            isCompleted={isCompleted}
          />
        </div>

        {rightPanel && (
          <div className="w-96 border-l border-cyan-400/30 bg-black/50 p-4">
            <div className="h-full flex flex-col">
              {rightPanel === 'workflow' && (
                <div className="flex-1 overflow-y-auto">
                  <WorkflowExplorer
                    sessionId={sessionId}
                    workflowStatus={workflowStatus}
                    currentPhase={currentPhase}
                    phases={phases}
                    availableTransitions={workflowStatus?.transitions}
                    isCompleted={isCompleted}
                  />
                </div>
              )}

              {rightPanel === 'prompts' && (
                <>
                  <h3 className="text-white/80 text-sm font-medium mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Prompt Explorer
                  </h3>
                  <div className="flex-1 overflow-hidden">
                    <PromptExplorer sessionId={sessionId} />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Waiting Component */}
      {waitingPhase && (
        <FullscreenWaiting
          isVisible={showFullscreenWaiting}
          durationSeconds={waitingPhase.wait_duration_seconds || 60}
          visualizationType={waitingPhase.visualization_type || 'breathing_circle'}
          preWaitMessage={waitingPhase.pre_wait_message || `Take a moment to focus during this ${waitingPhase.display_name} phase.`}
          postWaitPrompt={waitingPhase.post_wait_prompt}
          title={waitingPhase.display_name || 'Focused Time'}
          onComplete={() => {
            console.log('🎯 Fullscreen waiting completed');
            setShowFullscreenWaiting(false);
            setWaitingPhase(null);
            // The backend will handle auto-transition after the timer completes
          }}
          onClose={() => {
            console.log('🎯 Fullscreen waiting manually closed');
            setShowFullscreenWaiting(false);
            setWaitingPhase(null);
          }}
        />
      )}
    </div>
  );
};