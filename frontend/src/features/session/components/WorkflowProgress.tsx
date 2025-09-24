import React from 'react';
import { WorkflowStatusResponse as WorkflowStatus } from '../hooks/useWorkflow';

interface WorkflowProgressProps {
  workflowStatus: WorkflowStatus | null;
  className?: string;
}

const WORKFLOW_PHASES = [
  { key: 'issue_decision', label: 'Issue Decision', color: 'blue', description: 'Decide what to work on' },
  { key: 'information_gathering', label: 'Info Gathering', color: 'purple', description: 'History + current + desired outcome' },
  { key: 'activation_and_setup', label: 'Activation & Setup', color: 'amber', description: 'Step into issue + establish brainspot' },
  { key: 'focused_mindfulness', label: 'Mindfulness', color: 'green', description: 'Observe passively with no control' },
  { key: 'status_check_loop', label: 'Status Check', color: 'cyan', description: '3-5min check-ins, dynamic decisions' },
  { key: 'micro_reprocessing', label: 'Micro-reprocessing', color: 'red', description: 'De-escalation interventions' },
  { key: 'squeeze_lemon', label: 'Squeeze Lemon', color: 'yellow', description: 'Re-expose until SUDS=0' },
  { key: 'expansion', label: 'Expansion', color: 'emerald', description: 'Integrate into all life spaces' },
  { key: 'complete', label: 'Complete', color: 'gray', description: 'Session closure' }
];

export const WorkflowProgress: React.FC<WorkflowProgressProps> = ({
  workflowStatus,
  className = ''
}) => {
  const currentPhaseIndex = WORKFLOW_PHASES.findIndex(
    p => p.key === workflowStatus?.current_state
  );

  const activePhase = WORKFLOW_PHASES.find(p => p.key === workflowStatus?.current_state);

  return (
    <div className={`bg-black/60 backdrop-blur-xl border-b border-white/10 px-4 py-3 ${className}`}>
      {/* Current Stage Highlight */}
      {activePhase && (
        <div className="text-center mb-3">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-${activePhase.color}-500/20 border border-${activePhase.color}-500/30`}>
            <div className={`w-2 h-2 rounded-full bg-${activePhase.color}-400 animate-pulse`}></div>
            <span className={`text-sm font-medium text-${activePhase.color}-300`}>
              Stage {currentPhaseIndex + 1}: {activePhase.label}
            </span>
          </div>
          {activePhase.description && (
            <p className="text-xs text-white/60 mt-1">{activePhase.description}</p>
          )}
        </div>
      )}

      {/* Progress Indicators - All 8 stages in two rows */}
      <div className="space-y-2">
        {/* First row: Stages 1-4 */}
        <div className="flex items-center justify-between gap-1">
          {WORKFLOW_PHASES.slice(0, 4).map((phase, index) => {
            const isActive = phase.key === workflowStatus?.current_state;
            const isPast = currentPhaseIndex > index;
            
            return (
              <div
                key={phase.key}
                className={`flex-1 text-center transition-all ${isActive ? 'scale-105' : ''}`}
              >
                <div className={`
                  text-xs font-medium py-1 px-1 rounded-md transition-all
                  ${isActive ? `bg-${phase.color}-500/20 text-${phase.color}-300 border border-${phase.color}-500/40` :
                    isPast ? 'bg-white/10 text-white/50' :
                    'bg-white/5 text-white/30'}
                `}>
                  {index + 1}
                </div>
                <div className="text-xs text-white/40 mt-1 truncate">
                  {phase.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Second row: Stages 5-8 */}
        <div className="flex items-center justify-between gap-1">
          {WORKFLOW_PHASES.slice(4, 8).map((phase, index) => {
            const adjustedIndex = index + 4;
            const isActive = phase.key === workflowStatus?.current_state;
            const isPast = currentPhaseIndex > adjustedIndex;
            
            return (
              <div
                key={phase.key}
                className={`flex-1 text-center transition-all ${isActive ? 'scale-105' : ''}`}
              >
                <div className={`
                  text-xs font-medium py-1 px-1 rounded-md transition-all
                  ${isActive ? `bg-${phase.color}-500/20 text-${phase.color}-300 border border-${phase.color}-500/40` :
                    isPast ? 'bg-white/10 text-white/50' :
                    'bg-white/5 text-white/30'}
                `}>
                  {adjustedIndex + 1}
                </div>
                <div className="text-xs text-white/40 mt-1 truncate">
                  {phase.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Complete stage */}
        <div className="flex justify-center">
          {WORKFLOW_PHASES.slice(8).map((phase, index) => {
            const adjustedIndex = index + 8;
            const isActive = phase.key === workflowStatus?.current_state;
            const isPast = currentPhaseIndex > adjustedIndex;
            
            return (
              <div
                key={phase.key}
                className={`text-center transition-all ${isActive ? 'scale-105' : ''}`}
              >
                <div className={`
                  text-xs font-medium py-1 px-3 rounded-md transition-all
                  ${isActive ? `bg-${phase.color}-500/20 text-${phase.color}-300 border border-${phase.color}-500/40` :
                    isPast ? 'bg-white/10 text-white/50' :
                    'bg-white/5 text-white/30'}
                `}>
                  {adjustedIndex + 1}. {phase.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {workflowStatus?.next_actions?.[0] && (
        <div className="mt-3 pt-2 border-t border-white/10">
          <p className="text-xs text-white/60 text-center">
            <span className="text-white/40">Next: </span>
            {workflowStatus.next_actions[0]}
          </p>
        </div>
      )}
    </div>
  );
};