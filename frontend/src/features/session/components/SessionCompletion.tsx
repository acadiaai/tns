import React from 'react';
import { CheckCircle, Clock, TrendingUp, Star } from 'lucide-react';

interface SessionCompletionProps {
  workflowStatus: any;
  sessionTimer: any;
  completionTimestamp?: string;
}

export const SessionCompletion: React.FC<SessionCompletionProps> = ({
  workflowStatus,
  sessionTimer,
  completionTimestamp
}) => {
  // Calculate session metrics
  const sessionDuration = sessionTimer?.session_elapsed_formatted || '00:00';
  const finalSuds = workflowStatus?.phase_data_values?.final_suds;
  const initialSuds = workflowStatus?.phase_data_values?.initial_suds;
  const sudsReduction = initialSuds && finalSuds ? initialSuds - finalSuds : 0;

  // Format completion timestamp
  const completedAt = completionTimestamp
    ? new Date(completionTimestamp).toLocaleString()
    : new Date().toLocaleString();

  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-green-900/20 via-black to-green-900/10">
      <div className="max-w-2xl mx-auto p-8 text-center">
        {/* Success Icon */}
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto rounded-full bg-green-500/20 border-2 border-green-400 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-400" />
          </div>
          <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full bg-green-400/20 animate-ping" />
        </div>

        {/* Completion Message */}
        <h1 className="text-4xl font-bold text-white mb-4">
          Session Complete! 🎉
        </h1>

        <p className="text-xl text-white/80 mb-8">
          Congratulations on completing your brainspotting therapy session.
        </p>

        {/* Session Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Duration */}
          <div className="bg-white/5 border border-green-400/30 rounded-xl p-6 backdrop-blur-md">
            <Clock className="w-8 h-8 text-green-400 mx-auto mb-3" />
            <div className="text-2xl font-bold text-white">{sessionDuration}</div>
            <div className="text-sm text-white/60">Session Duration</div>
          </div>

          {/* SUDS Reduction */}
          {sudsReduction > 0 && (
            <div className="bg-white/5 border border-green-400/30 rounded-xl p-6 backdrop-blur-md">
              <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-3" />
              <div className="text-2xl font-bold text-white">-{sudsReduction}</div>
              <div className="text-sm text-white/60">SUDS Reduction</div>
              <div className="text-xs text-white/40 mt-1">
                {initialSuds} → {finalSuds}
              </div>
            </div>
          )}

          {/* Completion Status */}
          <div className="bg-white/5 border border-green-400/30 rounded-xl p-6 backdrop-blur-md">
            <Star className="w-8 h-8 text-green-400 mx-auto mb-3" />
            <div className="text-2xl font-bold text-white">100%</div>
            <div className="text-sm text-white/60">Completed</div>
          </div>
        </div>

        {/* Session Summary */}
        <div className="bg-white/5 border border-green-400/30 rounded-xl p-6 backdrop-blur-md text-left mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Session Summary</h3>

          {workflowStatus?.phase_data_values?.session_notes && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-white/80 mb-2">Notes</h4>
              <p className="text-white/70 text-sm leading-relaxed">
                {workflowStatus.phase_data_values.session_notes}
              </p>
            </div>
          )}

          {workflowStatus?.phase_data_values?.future_focus && (
            <div>
              <h4 className="text-sm font-medium text-white/80 mb-2">Moving Forward</h4>
              <p className="text-white/70 text-sm leading-relaxed">
                {workflowStatus.phase_data_values.future_focus}
              </p>
            </div>
          )}
        </div>

        {/* Completion Details */}
        <div className="text-sm text-white/50">
          Session completed at {completedAt}
        </div>
      </div>
    </div>
  );
};