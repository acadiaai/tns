import React, { useState, useEffect, useMemo } from 'react';
import { Database, Zap, CheckCircle2, Circle, ChevronRight, Activity } from 'lucide-react';
import { SchemaPhaseDataForm } from '../../../components/SchemaPhaseDataForm';

interface SessionDataExplorerProps {
  sessionId: string;
  sessionData?: any;
  allPhases?: any[];
}

export const SessionDataExplorer: React.FC<SessionDataExplorerProps> = ({
  sessionData,
  allPhases = []
}) => {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [recentlyUpdatedFields, setRecentlyUpdatedFields] = useState<Set<string>>(new Set());

  // Get current phase info
  const currentPhaseId = sessionData?.current_phase?.id || sessionData?.phase;
  const phaseDataValues = sessionData?.phase_data_values || {};

  // Organize all phases with their data
  const phasesWithData = useMemo(() => {
    if (!allPhases?.length) return [];

    return allPhases.map(phase => {
      // Get phase data fields for this phase
      const phaseFields = phase.phase_data || [];

      // Collect values for this phase's fields
      const collectedValues: Record<string, any> = {};
      let hasAnyData = false;

      phaseFields.forEach((field: any) => {
        if (field.name && phaseDataValues[field.name] !== undefined) {
          collectedValues[field.name] = phaseDataValues[field.name];
          hasAnyData = true;
        }
      });

      return {
        ...phase,
        phaseData: phaseFields,
        values: collectedValues,
        hasData: hasAnyData,
        isCurrent: phase.id === currentPhaseId
      };
    });
  }, [allPhases, phaseDataValues, currentPhaseId]);

  // Auto-expand current phase
  useEffect(() => {
    if (currentPhaseId && !expandedPhases.has(currentPhaseId)) {
      setExpandedPhases(new Set([currentPhaseId]));
    }
  }, [currentPhaseId]);

  // Detect real-time updates
  useEffect(() => {
    // Track which fields just got updated
    const updatedFields = new Set<string>();
    // Would implement update detection here
    setRecentlyUpdatedFields(updatedFields);
  }, [phaseDataValues]);

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
  const overallProgress = totalFields > 0 ? (completedFields / totalFields) * 100 : 0;

  if (!phasesWithData.length) {
    return (
      <div className="text-center py-8">
        <Database className="w-8 h-8 mx-auto mb-3 text-white/30" />
        <p className="text-sm text-white/60">Loading session data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Session Progress */}
      <div className="relative rounded-xl p-4 backdrop-blur-md bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
                <Activity className="w-4 h-4 text-white/70" />
              </div>
              <div>
                <span className="text-sm font-semibold text-white/90 tracking-wide">Session Progress</span>
                <p className="text-xs text-white/50 mt-0.5">{completedFields} of {totalFields} data points collected</p>
              </div>
            </div>
            <span className="text-white/70 text-sm font-medium">{Math.round(overallProgress)}%</span>
          </div>

          <div className="h-1.5 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-violet-500/60 to-violet-600/60"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Phase Data Cards */}
      <div className="space-y-3">
        {phasesWithData.map((phase, index) => {
          const isExpanded = expandedPhases.has(phase.id);
          const completedCount = Object.keys(phase.values).length;
          const totalCount = phase.phaseData.length;
          const phaseProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

          return (
            <div
              key={phase.id}
              className={`
                relative rounded-xl transition-all duration-300
                ${phase.isCurrent
                  ? 'ring-2 shadow-2xl'
                  : ''
                }
                backdrop-blur-md
              `}
              style={{
                background: phase.isCurrent && phase.color
                  ? `linear-gradient(135deg, ${phase.color}15 0%, ${phase.color}08 100%)`
                  : 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                borderColor: phase.isCurrent && phase.color
                  ? `${phase.color}40`
                  : 'rgba(255,255,255,0.1)',
                borderWidth: '1px',
                borderStyle: 'solid',
                // ringColor would go here but it's not a valid CSS property
                boxShadow: phase.isCurrent && phase.color
                  ? `0 20px 40px ${phase.color}15, 0 0 60px ${phase.color}10`
                  : ''
              }}
            >
              {/* Glassmorphic overlay */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

              {/* Phase Header */}
              <button
                onClick={() => togglePhaseExpanded(phase.id)}
                className="relative w-full p-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors rounded-xl"
              >
                <div className="flex items-center gap-3 flex-1">
                  {/* Phase Number & Icon */}
                  <div
                    className={`
                      w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-sm
                      ${phase.isCurrent
                        ? 'bg-gradient-to-br from-white/20 to-white/10 text-white shadow-lg'
                        : phase.hasData
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                          : 'bg-white/5 text-white/40 border border-white/10'
                      }
                      backdrop-blur-sm
                    `}
                    style={{
                      background: phase.isCurrent && phase.color
                        ? `linear-gradient(135deg, ${phase.color}30 0%, ${phase.color}20 100%)`
                        : undefined,
                      borderColor: phase.isCurrent && phase.color ? `${phase.color}50` : undefined,
                      color: phase.isCurrent && phase.color ? phase.color : undefined
                    }}
                  >
                    {index + 1}
                  </div>

                  {/* Phase Info */}
                  <div className="text-left flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`
                        text-sm font-semibold tracking-wide
                        ${phase.isCurrent ? 'text-white' : 'text-white/80'}
                      `}>
                        {phase.display_name}
                      </span>
                      {phase.isCurrent && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30">
                          <Zap className="w-3 h-3 text-emerald-400" />
                          <span className="text-xs text-emerald-300 font-medium">Current</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-white/50 mt-0.5">{phase.description}</p>
                  </div>

                  {/* Progress Indicator */}
                  {totalCount > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-white/60">{completedCount}/{totalCount}</p>
                        <p className="text-xs text-white/40">fields</p>
                      </div>
                      <div className="w-12 h-12 relative">
                        <svg className="w-12 h-12 transform -rotate-90">
                          <circle
                            cx="24"
                            cy="24"
                            r="20"
                            stroke="currentColor"
                            strokeWidth="3"
                            fill="none"
                            className="text-white/10"
                          />
                          <circle
                            cx="24"
                            cy="24"
                            r="20"
                            stroke="currentColor"
                            strokeWidth="3"
                            fill="none"
                            strokeDasharray={`${phaseProgress * 1.256} 125.6`}
                            className={phase.hasData ? "text-emerald-400" : "text-white/30"}
                            style={{
                              stroke: phase.isCurrent && phase.color ? phase.color : undefined
                            }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          {phase.hasData ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400"
                              style={{ color: phase.isCurrent && phase.color ? phase.color : undefined }}
                            />
                          ) : (
                            <Circle className="w-5 h-5 text-white/20" />
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Expand/Collapse Icon */}
                  <ChevronRight className={`
                    w-5 h-5 text-white/40 transition-transform duration-200
                    ${isExpanded ? 'rotate-90' : ''}
                  `} />
                </div>
              </button>

              {/* Phase Data (Collapsible) */}
              {isExpanded && phase.phaseData.length > 0 && (
                <div className="relative px-4 pb-4">
                  <div className="border-t border-white/5 pt-4">
                    <SchemaPhaseDataForm
                      phaseData={phase.phaseData}
                      data={phase.values}
                      recentlyUpdatedFields={recentlyUpdatedFields}
                    />
                  </div>
                </div>
              )}

              {/* No data message */}
              {isExpanded && phase.phaseData.length === 0 && (
                <div className="relative px-4 pb-4">
                  <div className="border-t border-white/5 pt-4 text-center">
                    <p className="text-xs text-white/40">No data fields for this phase</p>
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