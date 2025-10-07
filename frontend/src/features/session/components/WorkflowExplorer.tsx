import React, { useState, useEffect, useMemo } from 'react';
import { GitBranch, Zap, Circle, ArrowRight, History, RotateCcw, ChevronRight, CheckCircle2 } from 'lucide-react';
import { PhaseIcon } from '../../../utils/iconMapper';
import { SchemaPhaseDataForm } from '../../../components/SchemaPhaseDataForm';

interface VisitNode {
  id: string;
  phase_id: string;
  phase_name: string;
  visit_number: number;
  entered_at: string;
  exited_at?: string;
  is_current: boolean;
  collected_data: Record<string, any>;
  entered_from_visit_id?: string;
  exit_transition_id?: string;
  exit_condition?: string;
}

interface SessionPath {
  session_id: string;
  visits: VisitNode[];
}

interface WorkflowExplorerProps {
  sessionId?: string;
  workflowStatus?: any;
  currentPhase?: string;
  phases?: any[];
  availableTransitions?: any[];
  isCompleted?: boolean;
}

export const WorkflowExplorer: React.FC<WorkflowExplorerProps> = ({
  sessionId,
  workflowStatus,
  currentPhase,
  phases = [],
  availableTransitions = [],
  isCompleted = false
}) => {
  const [sessionPath, setSessionPath] = useState<SessionPath | null>(null);
  const [showFullPath, setShowFullPath] = useState(false);
  const [expandedVisits, setExpandedVisits] = useState<Set<string>>(new Set());

  // Get phase data values
  const phaseDataValues = workflowStatus?.phase_data_values || {};

  // Auto-expand current visit
  useEffect(() => {
    if (sessionPath?.visits) {
      const currentVisit = sessionPath.visits.find(v => v.is_current);
      if (currentVisit && !expandedVisits.has(currentVisit.id)) {
        setExpandedVisits(new Set([currentVisit.id]));
      }
    }
  }, [sessionPath?.visits]);

  const toggleVisitExpanded = (visitId: string) => {
    setExpandedVisits(prev => {
      const newSet = new Set(prev);
      if (newSet.has(visitId)) {
        newSet.delete(visitId);
      } else {
        newSet.add(visitId);
      }
      return newSet;
    });
  };

  // Fetch session path
  useEffect(() => {
    if (!sessionId) return;

    const fetchPath = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/path`);
        if (response.ok) {
          const data = await response.json();
          setSessionPath(data);
        }
      } catch (error) {
        console.error('Failed to fetch session path:', error);
      }
    };

    fetchPath();
    // Refetch every 2 seconds to stay in sync
    const interval = setInterval(fetchPath, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

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

      {/* Session Path Timeline - Dynamic Visit-Based View */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-white/50" />
            <span className="text-xs font-medium text-white/60">Session Path</span>
            {sessionPath && sessionPath.visits.length > 0 && (
              <span className="text-xs text-white/40">({sessionPath.visits.length} visits)</span>
            )}
          </div>
          {sessionPath && sessionPath.visits.length > 3 && (
            <button
              onClick={() => setShowFullPath(!showFullPath)}
              className="text-xs text-white/50 hover:text-white/70 transition-colors"
            >
              {showFullPath ? 'Show Less' : 'Show All'}
            </button>
          )}
        </div>

        {sessionPath && sessionPath.visits.length > 0 ? (
          /* Visit Timeline */
          <div className="space-y-2">
            {(showFullPath ? sessionPath.visits : sessionPath.visits.slice(-3)).map((visit, idx, arr) => {
              const phase = phases.find(p => p.id === visit.phase_id);
              const isCurrentVisit = visit.is_current;
              const hasLoop = visit.visit_number > 1;
              const dataCount = Object.keys(visit.collected_data).length;
              const isExpanded = expandedVisits.has(visit.id);

              return (
                <div key={visit.id} className="relative">
                  {/* Connector Line */}
                  {idx < arr.length - 1 && (
                    <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-white/10" />
                  )}

                  <div
                    onClick={() => toggleVisitExpanded(visit.id)}
                    className={`
                      relative rounded-xl p-3 transition-all duration-300 cursor-pointer
                      ${isCurrentVisit ? 'ring-2 shadow-xl scale-[1.01]' : ''}
                      backdrop-blur-md hover:brightness-110
                    `}
                    style={{
                      background: phase?.color
                        ? isCurrentVisit
                          ? `linear-gradient(135deg, ${phase.color}20 0%, ${phase.color}10 100%)`
                          : `linear-gradient(135deg, ${phase.color}0A 0%, ${phase.color}05 100%)`
                        : 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                      borderColor: phase?.color
                        ? isCurrentVisit ? `${phase.color}40` : `${phase.color}20`
                        : 'rgba(255,255,255,0.1)',
                      borderWidth: '1px',
                      borderStyle: 'solid'
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Visit Icon */}
                      <div
                        className={`
                          w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                          backdrop-blur-sm border relative
                        `}
                        style={{
                          background: phase?.color
                            ? `linear-gradient(135deg, ${phase.color}99 0%, ${phase.color}66 100%)`
                            : 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                          borderColor: phase?.color ? `${phase.color}CC` : 'rgba(255,255,255,0.1)'
                        }}
                      >
                        {hasLoop ? (
                          <RotateCcw className="w-5 h-5 text-white" />
                        ) : phase?.icon ? (
                          <PhaseIcon icon={phase.icon} className="w-5 h-5" size={20} />
                        ) : (
                          <Circle className="w-5 h-5 text-white" />
                        )}
                        {hasLoop && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white border border-white/20">
                            {visit.visit_number}
                          </div>
                        )}
                      </div>

                      {/* Visit Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-sm font-semibold"
                            style={{
                              color: isCurrentVisit && phase?.color ? phase.color : 'rgba(255,255,255,0.9)'
                            }}
                          >
                            {visit.phase_name}
                          </span>
                          {hasLoop && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/30">
                              Visit {visit.visit_number}
                            </span>
                          )}
                          {isCurrentVisit && (
                            <Zap className="w-3.5 h-3.5" style={{ color: `${phase?.color || '#10b981'}80` }} />
                          )}
                        </div>

                        {/* Collected Data Count */}
                        {dataCount > 0 && (
                          <div className="text-xs text-white/50 mt-1">
                            {dataCount} data point{dataCount !== 1 ? 's' : ''} collected
                          </div>
                        )}

                        {/* Exit Condition */}
                        {visit.exit_condition && !isCurrentVisit && (
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <ArrowRight className="w-3 h-3 text-white/30" />
                            <span className="text-white/40">
                              Transitioned via: <code className="text-xs bg-black/20 px-1.5 py-0.5 rounded text-white/60">{visit.exit_condition}</code>
                            </span>
                          </div>
                        )}

                        {/* Current Position Indicator */}
                        {isCurrentVisit && (
                          <div className="mt-2 text-xs text-white/60 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            <span>Currently here</span>
                          </div>
                        )}

                        {/* Expand/Collapse Indicator */}
                        <div className="mt-2 flex items-center gap-2 text-xs text-white/40">
                          <ChevronRight
                            className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          />
                          <span>{isExpanded ? 'Hide' : 'Show'} details</span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
                        {/* Data Collection - Always show schema with required fields */}
                        {phase?.phase_data && phase.phase_data.length > 0 ? (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400/60" />
                              <span className="text-xs font-medium text-white/60">
                                {dataCount > 0 ? 'Collected Data' : 'Data to Collect'}
                              </span>
                            </div>
                            <SchemaPhaseDataForm
                              phaseData={phase.phase_data}
                              data={visit.collected_data}
                              className="ml-6"
                            />
                          </div>
                        ) : (
                          <div className="text-xs text-white/40 text-center py-2">
                            No data fields defined for this phase
                          </div>
                        )}

                        {/* Transition Conditions - Get transitions FROM this phase */}
                        {(() => {
                          // Find all transitions where from_phase_id matches this visit's phase
                          const outgoingTransitions = phases
                            .flatMap(p => p.transitions_from || [])
                            .filter((t: any) => t.from_phase_id === visit.phase_id);

                          return outgoingTransitions.length > 0 ? (
                            <div>
                              <div className="flex items-center gap-2 mb-3">
                                <ArrowRight className="w-4 h-4 text-violet-400/60" />
                                <span className="text-xs font-medium text-white/60">
                                  Transition Conditions {!isCurrentVisit && visit.exit_condition ? '(Taken)' : '(Available)'}
                                </span>
                              </div>
                              <div className="ml-6 space-y-2">
                                {outgoingTransitions.map((transition: any) => {
                                  const targetPhase = phases.find(p => p.id === transition.to_phase_id);
                                  const wasTaken = !isCurrentVisit && visit.exit_condition === transition.condition;

                                  return (
                                    <div
                                      key={transition.id}
                                      className={`px-3 py-2 rounded-lg border ${
                                        wasTaken
                                          ? 'bg-emerald-500/10 border-emerald-500/30'
                                          : 'bg-white/[0.02] border-white/10'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-white/50">To:</span>
                                        <span className={`text-xs font-medium ${
                                          wasTaken ? 'text-emerald-400' : 'text-white/80'
                                        }`}>
                                          {targetPhase?.display_name || transition.to_phase_id}
                                        </span>
                                        {wasTaken && (
                                          <CheckCircle2 className="w-3 h-3 text-emerald-400 ml-auto" />
                                        )}
                                      </div>
                                      {transition.condition ? (
                                        <div className="mt-1 flex items-center gap-2">
                                          <span className="text-xs text-white/50">When:</span>
                                          <code className={`text-xs px-1.5 py-0.5 rounded ${
                                            wasTaken
                                              ? 'bg-emerald-500/20 text-emerald-300'
                                              : 'bg-black/20 text-white/60'
                                          }`}>
                                            {transition.condition}
                                          </code>
                                        </div>
                                      ) : (
                                        <div className="mt-1 text-xs text-white/40">
                                          (Default transition)
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-white/40 text-center py-2">
                              No transitions defined from this phase
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* No visits yet */
          <div className="text-center py-6 text-xs text-white/40">
            Session path will appear as you progress through phases
          </div>
        )}
      </div>

    </div>
  );
};
