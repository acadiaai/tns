import React from 'react';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface ConversationState {
  turnCount: number;
  requiredTurns: number;
  issueIdentified: boolean;
  consentRequested: boolean;
  consentGiven: boolean;
  mcpStatus: 'allowed' | 'blocked' | 'pending';
  blockReason?: string;
  currentPhase: string;
}

interface StateMachineVisualizerProps {
  state: ConversationState;
  mode: 'compact' | 'full' | 'debug';
  className?: string;
}

const StateMachineVisualizer: React.FC<StateMachineVisualizerProps> = ({
  state,
  mode = 'compact',
  className = ''
}) => {

  if (mode === 'compact') {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        {/* Compact Progress Dots */}
        <div className="flex items-center gap-1">
          {[...Array(state.requiredTurns)].map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i < state.turnCount
                  ? 'bg-cyan-400 shadow-lg shadow-cyan-400/50'
                  : 'bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* MCP Status Indicator */}
        <div className="flex items-center gap-1">
          {state.mcpStatus === 'allowed' ? (
            <CheckCircle className="w-3 h-3 text-green-400" />
          ) : state.mcpStatus === 'pending' ? (
            <Clock className="w-3 h-3 text-yellow-400" />
          ) : (
            <AlertCircle className="w-3 h-3 text-red-400" />
          )}
          <span className="text-xs text-white/60">
            {state.turnCount}/{state.requiredTurns}
          </span>
        </div>
      </div>
    );
  }

  if (mode === 'full') {
    return (
      <div className={`bg-black/60 backdrop-blur border border-cyan-400/20 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-cyan-100 font-semibold">Conversation State</h3>
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            state.mcpStatus === 'allowed' ? 'bg-green-400/20 text-green-200' :
            state.mcpStatus === 'pending' ? 'bg-yellow-400/20 text-yellow-200' :
            'bg-red-400/20 text-red-200'
          }`}>
            {state.mcpStatus.toUpperCase()}
          </div>
        </div>

        {/* Progress Flow */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              state.turnCount >= state.requiredTurns ? 'bg-green-400' : 'bg-yellow-400'
            }`} />
            <span className="text-sm text-white/80">
              Conversation Turns: {state.turnCount}/{state.requiredTurns}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              state.issueIdentified ? 'bg-green-400' : 'bg-gray-600'
            }`} />
            <span className="text-sm text-white/80">
              Issue Identified: {state.issueIdentified ? 'Yes' : 'No'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${
              state.consentGiven ? 'bg-green-400' : state.consentRequested ? 'bg-yellow-400' : 'bg-gray-600'
            }`} />
            <span className="text-sm text-white/80">
              Consent: {state.consentGiven ? 'Given' : state.consentRequested ? 'Requested' : 'Not Asked'}
            </span>
          </div>
        </div>

        {/* Block Reason */}
        {state.mcpStatus === 'blocked' && state.blockReason && (
          <div className="mt-4 p-3 bg-red-400/10 border border-red-400/20 rounded">
            <p className="text-red-200 text-sm">{state.blockReason}</p>
          </div>
        )}
      </div>
    );
  }

  // Debug mode
  return (
    <div className={`bg-gray-900/80 backdrop-blur border border-gray-600 rounded-lg p-4 font-mono text-xs ${className}`}>
      <div className="text-gray-300 mb-2">STATE MACHINE DEBUG</div>
      <div className="space-y-1 text-gray-400">
        <div>Phase: {state.currentPhase}</div>
        <div>Turns: {state.turnCount}/{state.requiredTurns}</div>
        <div>Issue: {state.issueIdentified ? 'TRUE' : 'FALSE'}</div>
        <div>Consent Req: {state.consentRequested ? 'TRUE' : 'FALSE'}</div>
        <div>Consent Given: {state.consentGiven ? 'TRUE' : 'FALSE'}</div>
        <div className={`font-bold ${
          state.mcpStatus === 'allowed' ? 'text-green-400' :
          state.mcpStatus === 'pending' ? 'text-yellow-400' : 'text-red-400'
        }`}>
          MCP: {state.mcpStatus.toUpperCase()}
        </div>
        {state.blockReason && (
          <div className="text-red-300 mt-2">{state.blockReason}</div>
        )}
      </div>
    </div>
  );
};

export default StateMachineVisualizer;