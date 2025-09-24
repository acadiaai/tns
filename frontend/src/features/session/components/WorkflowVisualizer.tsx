import React from 'react';
import { ArrowRight, Clock, Target as TargetIcon } from 'lucide-react';
import { PhaseIcon } from '../../../utils/iconMapper';

interface WorkflowVisualizerProps {
  currentPhase?: string;
  sessionId?: string;
  phases?: any[];
  availableTransitions?: any[];
  workflowStatus?: any;
}


export const WorkflowVisualizer: React.FC<WorkflowVisualizerProps> = ({
  currentPhase,
  phases = [],
  availableTransitions = [],
  workflowStatus
}) => {
  // Get current phase details
  const currentPhaseInfo = phases.find((p: any) => p.id === currentPhase);

  // Build a map of all transitions for visualization
  const allTransitions = workflowStatus?.transitions || [];

  // Create phase flow visualization
  const phaseNodes = phases.map((phase: any) => {
    const isActive = phase.id === currentPhase;
    // Don't highlight available transitions - just show them in the list below
    const isAvailable = false; // availableTransitions?.some((t: any) => t.to_phase_id === phase.id);
    const hasTransitionTo = false; // allTransitions.some((t: any) => t.from_phase_id === currentPhase && t.to_phase_id === phase.id);

    return {
      ...phase,
      isActive,
      isAvailable,
      hasTransitionTo
    };
  });

  // Group phases by stage
  const stageGroups = phaseNodes.reduce((acc: any, phase: any) => {
    const stage = phase.stage || 0;
    if (!acc[stage]) acc[stage] = [];
    acc[stage].push(phase);
    return acc;
  }, {});

  return (
    <div className="h-full flex flex-col space-y-4 p-4">
      {/* Current Phase Header */}
      <div className="glass-card-strong rounded-xl p-3 backdrop-blur-xl bg-white/[0.08] border border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentPhaseInfo && (
              <>
                <PhaseIcon icon={currentPhaseInfo.icon} className="text-white animate-pulse" size={20} />
                <div>
                  <h3 className="text-sm font-semibold text-white/90">{currentPhaseInfo.display_name}</h3>
                  <p className="text-xs text-white/50">Current Phase</p>
                </div>
              </>
            )}
          </div>
          {currentPhaseInfo?.duration_minutes > 0 && (
            <div className="flex items-center gap-1 text-xs text-white/50">
              <Clock className="w-3 h-3" />
              <span>{currentPhaseInfo.duration_minutes}min</span>
            </div>
          )}
        </div>
      </div>

      {/* State Machine Visualization */}
      <div className="flex-1 glass-card rounded-xl p-4 overflow-auto backdrop-blur-md bg-white/[0.03] border border-white/10">
        <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">Workflow State Machine</h4>

        <div className="space-y-6">
          {Object.entries(stageGroups).sort(([a], [b]) => Number(a) - Number(b)).map(([stage, stagePhases]: [string, any]) => (
            <div key={stage} className="relative">
              {stage !== '0' && (
                <div className="absolute -top-3 left-0 px-2 bg-black/50 rounded text-[10px] text-white/30 font-semibold">
                  Stage {stage}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {stagePhases.map((phase: any, idx: number) => {
                  const nextPhase = stagePhases[idx + 1];
                  const hasArrow = nextPhase && allTransitions.some(
                    (t: any) => t.from_phase_id === phase.id && t.to_phase_id === nextPhase.id
                  );

                  return (
                    <React.Fragment key={phase.id}>
                      <div
                        className={`
                          relative flex items-center gap-2 px-3 py-2 rounded-lg
                          border transition-all duration-300 cursor-pointer
                          ${
                            phase.isActive
                              ? 'bg-white/20 border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.1)] scale-105'
                              : phase.isAvailable
                              ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/15'
                              : phase.hasTransitionTo
                              ? 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15'
                              : 'bg-white/5 border-white/10 opacity-50'
                          }
                        `}
                      >
                        {/* Status indicator */}
                        <div className="absolute -top-1 -right-1">
                          {phase.isActive && (
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                          )}
                          {phase.isAvailable && !phase.isActive && (
                            <div className="w-2 h-2 bg-green-400 rounded-full" />
                          )}
                        </div>

                        <PhaseIcon icon={phase.icon} className="text-white/70" size={14} />
                        <span className={`text-xs font-medium ${
                          phase.isActive ? 'text-white' :
                          phase.isAvailable ? 'text-green-400' :
                          phase.hasTransitionTo ? 'text-blue-400' :
                          'text-white/40'
                        }`}>
                          {phase.display_name}
                        </span>
                      </div>

                      {hasArrow && (
                        <ArrowRight className="w-4 h-4 text-white/20 self-center" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Transition Rules for Current Phase */}
        {availableTransitions && availableTransitions.length > 0 && (
          <div className="mt-6 pt-4 border-t border-white/10">
            <h5 className="text-xs font-semibold text-white/40 mb-2 flex items-center gap-1">
              <TargetIcon className="w-3 h-3" />
              Available Transitions
            </h5>
            <div className="space-y-1">
              {availableTransitions.map((transition: any) => {
                const targetPhase = phases.find((p: any) => p.id === transition.to_phase_id);
                return (
                  <div key={transition.id} className="flex items-center gap-2 text-xs">
                    <ArrowRight className="w-3 h-3 text-white/30" />
                    {targetPhase && (
                      <>
                        <PhaseIcon icon={targetPhase.icon} className="text-white/50" size={12} />
                        <span className="text-white/50">{targetPhase.display_name}</span>
                      </>
                    )}
                    {transition.description && (
                      <span className="text-white/30 text-[10px] ml-1">({transition.description})</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};