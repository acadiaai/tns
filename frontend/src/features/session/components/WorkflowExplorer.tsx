import React, { useState, useEffect, useMemo } from 'react';
import { GitBranch, Zap, CheckCircle2, Circle, ChevronRight } from 'lucide-react';
import { SchemaPhaseDataForm } from '../../../components/SchemaPhaseDataForm';
import { PhaseIcon } from '../../../utils/iconMapper';

interface WorkflowExplorerProps {
  sessionId?: string;
  workflowStatus?: any;
  currentPhase?: string;
  phases?: any[];
  availableTransitions?: any[];
  isCompleted?: boolean;
}

export const WorkflowExplorer: React.FC<WorkflowExplorerProps> = ({
  workflowStatus,
  currentPhase,
  phases = [],
  availableTransitions = [],
  isCompleted = false
}) => {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [recentlyUpdatedFields] = useState<Set<string>>(new Set());

  // Get phase data values
  const phaseDataValues = workflowStatus?.phase_data_values || {};

  // DEBUG: Log what we're receiving
  console.log('🔍 WorkflowExplorer DEBUG:', {
    workflowStatus,
    phaseDataValues,
    phaseDataValuesKeys: Object.keys(phaseDataValues),
    phases: phases?.length,
    availableTransitions: availableTransitions?.length
  });

  // Log the first few phase data records to see structure
  if (phases?.length > 0) {
    console.log('🔍 First phase data structure:', phases[0]);
  }

  // Organize all phases with their data
  const phasesWithData = useMemo(() => {
    if (!phases?.length) return [];

    return phases.map((phase, index) => {
      // Get phase data fields for this phase
      const phaseFields = phase.phase_data || [];

      // Collect values for this phase's fields
      const collectedValues: Record<string, any> = {};
      let hasAnyData = false;
      let requiredCount = 0;
      let requiredFilled = 0;

      phaseFields.forEach((field: any) => {
        if (field.required) {
          requiredCount++;
        }
        if (field.name && phaseDataValues[field.name] !== undefined && phaseDataValues[field.name] !== null && phaseDataValues[field.name] !== '') {
          collectedValues[field.name] = phaseDataValues[field.name];
          hasAnyData = true;
          if (field.required) {
            requiredFilled++;
          }
        }
      });

      // Calculate fulfillment percentage for required fields
      // If session is completed, show 100% for all phases
      const requiredPercentage = isCompleted ? 100 : (requiredCount > 0 ? Math.round((requiredFilled / requiredCount) * 100) : 100);

      // Check if this phase has available transitions from current phase
      const hasTransition = availableTransitions?.some((t: any) => t.to_phase_id === phase.id);

      return {
        ...phase,
        index,
        phaseData: phaseFields,
        values: collectedValues,
        hasData: hasAnyData,
        isCurrent: !isCompleted && phase.id === currentPhase, // No current phase when completed
        hasTransition,
        requiredCount,
        requiredFilled,
        requiredPercentage,
        isSessionCompleted: isCompleted
      };
    });
  }, [phases, phaseDataValues, currentPhase, availableTransitions, isCompleted]);

  // Auto-expand current phase
  useEffect(() => {
    if (currentPhase && !expandedPhases.has(currentPhase)) {
      setExpandedPhases(new Set([currentPhase]));
    }
  }, [currentPhase]);

  const togglePhaseExpanded = (phaseId: string) => {
    setExpandedPhases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phaseId)) {
        newSet.delete(phaseId);
      } else {
        newSet.add(phaseId);
      }
      return newSet;
    });
  };

  // Calculate overall progress
  const totalFields = phasesWithData.reduce((acc, phase) => acc + phase.phaseData.length, 0);
  const completedFields = Object.keys(phaseDataValues).filter(key =>
    phaseDataValues[key] !== undefined && phaseDataValues[key] !== null && phaseDataValues[key] !== ''
  ).length;
  const overallProgress = isCompleted ? 100 : (totalFields > 0 ? (completedFields / totalFields) * 100 : 0);

  if (!phasesWithData.length) {
    return (
      <div className="text-center py-8">
        <GitBranch className="w-8 h-8 mx-auto mb-3 text-white/30" />
        <p className="text-sm text-white/60">Loading session data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
            <GitBranch className="w-4 h-4 text-white/70" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white/90 tracking-wide">Session Explorer</h3>
            <p className="text-xs text-white/50 mt-0.5">
              {completedFields} of {totalFields} data points • {phasesWithData.length} phases
            </p>
          </div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="relative rounded-xl p-3 backdrop-blur-md bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/60">
            {isCompleted ? 'Session Complete!' : 'Session Progress'}
          </span>
          <span className={`text-xs font-medium ${
            isCompleted ? 'text-green-400' : 'text-white/70'
          }`}>
            {Math.round(overallProgress)}%
          </span>
        </div>
        <div className="h-1 bg-black/20 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isCompleted
                ? 'bg-gradient-to-r from-green-500/60 to-green-600/60'
                : 'bg-gradient-to-r from-violet-500/60 to-violet-600/60'
            }`}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Phase Cards */}
      <div className="space-y-2">
        {phasesWithData.map((phase) => {
          const isExpanded = expandedPhases.has(phase.id);
          const completedCount = Object.keys(phase.values).length;
          const totalCount = phase.phaseData.length;

          return (
            <div
              key={phase.id}
              className={`
                relative rounded-xl transition-all duration-300
                ${phase.isCurrent
                  ? 'ring-2 shadow-2xl scale-[1.02]'
                  : ''
                }
                backdrop-blur-md
              `}
              style={{
                background: phase.color
                  ? phase.isCurrent
                    ? `linear-gradient(135deg, ${phase.color}15 0%, ${phase.color}08 100%)`
                    : phase.hasData
                      ? `linear-gradient(135deg, ${phase.color}0A 0%, ${phase.color}05 100%)`
                      : 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                borderColor: phase.color
                  ? phase.isCurrent
                    ? `${phase.color}30`
                    : `${phase.color}15`
                  : 'rgba(255,255,255,0.1)',
                borderWidth: '1px',
                borderStyle: 'solid',
                boxShadow: phase.isCurrent && phase.color
                  ? `0 4px 12px ${phase.color}10`
                  : ''
              }}
            >
              <button
                onClick={() => togglePhaseExpanded(phase.id)}
                className="w-full p-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors rounded-xl"
              >
                {/* Phase Icon */}
                <div
                  className={`
                    w-10 h-10 rounded-lg flex items-center justify-center
                    backdrop-blur-sm border
                  `}
                  style={{
                    background: phase.color
                      ? `linear-gradient(135deg, ${phase.color}99 0%, ${phase.color}66 100%)`
                      : 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                    borderColor: phase.color
                      ? `${phase.color}CC`
                      : 'rgba(255,255,255,0.1)'
                  }}
                >
                  <PhaseIcon
                    icon={phase.icon}
                    className="w-5 h-5"
                    size={20}
                  />
                </div>

                {/* Phase Info */}
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-semibold"
                      style={{
                        color: phase.isCurrent && phase.color
                          ? phase.color
                          : 'rgba(255,255,255,0.9)'
                      }}
                    >
                      {phase.display_name}
                    </span>
                    {phase.isCurrent && (
                      <Zap
                        className="w-3.5 h-3.5"
                        style={{ color: `${phase.color || '#10b981'}80` }}
                      />
                    )}
                  </div>
                  <p className="text-xs text-white/50 mt-0.5">
                    {phase.description}
                    {totalCount > 0 && (
                      <>
                        {phase.description && ' • '}
                        {phase.requiredCount > 0 ? (
                          <span
                            style={{
                              color: phase.requiredPercentage === 100
                                ? `${phase.color}99`
                                : `${phase.color || '#f59e0b'}99`
                            }}
                          >
                            {phase.requiredPercentage}% complete
                          </span>
                        ) : (
                          <span className="text-white/40">
                            {completedCount}/{totalCount} optional
                          </span>
                        )}
                      </>
                    )}
                  </p>
                </div>

                {/* Status & Progress */}
                <div className="flex items-center gap-3">
                  {/* Completion Status */}
                  {phase.hasData ? (
                    <CheckCircle2
                      className="w-5 h-5"
                      style={{
                        color: `${phase.color}60`
                      }}
                    />
                  ) : (
                    <Circle className="w-5 h-5 text-white/20" />
                  )}

                  {/* Expand Icon */}
                  <ChevronRight className={`w-4 h-4 text-white/40 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {/* Expanded Data */}
              {isExpanded && (
                <div className="px-4 pb-4">
                  <div className="border-t border-white/5 pt-4">
                    {phase.phaseData && phase.phaseData.length > 0 ? (
                      <div className="space-y-3">
                        {phase.phaseData.length > 0 && (
                          <div className="text-xs text-white/30 uppercase tracking-wider mb-3">Required Data</div>
                        )}
                        <SchemaPhaseDataForm
                          phaseData={phase.phaseData}
                          data={phase.values}
                          recentlyUpdatedFields={recentlyUpdatedFields}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-white/40 text-center py-2">
                        No data requirements for this phase
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};