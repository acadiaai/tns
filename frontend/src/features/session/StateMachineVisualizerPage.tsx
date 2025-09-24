import React from 'react';
import { useParams } from 'react-router-dom';
import { useWebSocket } from './hooks/useWebSocket';
import { useMessages } from './hooks/useMessages';
import { useWorkflow } from './hooks/useWorkflow';
import StateMachineVisualizer from '../../components/StateMachineVisualizer';
import { ArrowLeft, Activity, Zap } from 'lucide-react';

export const StateMachineVisualizerPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();

  if (!sessionId) {
    return <div className="text-white/60">No session ID provided</div>;
  }

  const { ws, isConnected } = useWebSocket(sessionId);
  const { messages } = useMessages(ws);
  const { workflowStatus } = useWorkflow(ws, sessionId);

  const currentPhase = workflowStatus?.current_state || 'pre_session';

  // Calculate conversation state
  const patientMessages = messages.filter(m => m.role === 'patient');
  const conversationState = {
    turnCount: patientMessages.length,
    requiredTurns: 3,
    issueIdentified: messages.some(m =>
      m.content?.toLowerCase().includes('stress') ||
      m.content?.toLowerCase().includes('anxious') ||
      m.content?.toLowerCase().includes('nervous') ||
      m.content?.toLowerCase().includes('pain') ||
      m.content?.toLowerCase().includes('hurt')
    ),
    consentRequested: messages.some(m =>
      m.content?.toLowerCase().includes('would you like to start') ||
      m.content?.toLowerCase().includes('ready to begin')
    ),
    consentGiven: messages.some(m =>
      m.role === 'patient' && (
        m.content?.toLowerCase().includes('yes') ||
        m.content?.toLowerCase().includes('sure') ||
        m.content?.toLowerCase().includes('love to')
      )
    ),
    mcpStatus: (patientMessages.length >= 3 &&
                messages.some(m => m.role === 'patient' && m.content?.toLowerCase().includes('yes')))
                ? 'allowed' as const : 'blocked' as const,
    blockReason: patientMessages.length < 3
                ? `Need ${3 - patientMessages.length} more conversation turns before session start`
                : 'Waiting for explicit consent',
    currentPhase: currentPhase
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => window.history.back()}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-cyan-100">State Machine Visualizer</h1>
          <p className="text-white/60">Session: {sessionId}</p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-sm text-white/60">{isConnected ? 'Live' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Main Visualization Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Full State Visualizer */}
        <StateMachineVisualizer
          state={conversationState}
          mode="full"
          className="h-fit"
        />

        {/* Debug State Visualizer */}
        <StateMachineVisualizer
          state={conversationState}
          mode="debug"
          className="h-fit"
        />

        {/* Conversation Flow */}
        <div className="lg:col-span-2 bg-black/60 backdrop-blur border border-white/10 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-cyan-100">Conversation Flow Analysis</h2>
          </div>

          <div className="space-y-3">
            {messages.map((message, index) => (
              <div key={message.id} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  message.role === 'patient' ? 'bg-blue-400' : 'bg-green-400'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white/80">
                      {message.role === 'patient' ? 'Patient' : 'Therapist'}
                    </span>
                    <span className="text-xs text-white/40">Turn {index + 1}</span>
                    {(message as any).message_type === 'tool_call' && (
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-yellow-400" />
                        <span className="text-xs text-yellow-200">Tool Call</span>
                      </div>
                    )}
                  </div>
                  <p className="text-white/70 text-sm">{message.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};