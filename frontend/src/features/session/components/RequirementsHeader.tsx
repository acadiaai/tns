import React from 'react';
import { FileCheck, Target, LayoutGrid, List, RefreshCw } from 'lucide-react';

interface RequirementsHeaderProps {
  currentPhase: string;
  totalRequirements: number;
  completedRequirements: number;
  isLoading?: boolean;
  viewMode: 'list' | 'grid';
  onViewModeChange: (mode: 'list' | 'grid') => void;
  onRefresh?: () => void;
}

export const RequirementsHeader: React.FC<RequirementsHeaderProps> = ({
  currentPhase,
  totalRequirements,
  completedRequirements,
  isLoading = false,
  viewMode,
  onViewModeChange,
  onRefresh
}) => {
  const completionPercentage = totalRequirements > 0 ? (completedRequirements / totalRequirements) * 100 : 0;

  const formatPhaseName = (phase: string) => {
    return phase.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="space-y-4">
      {/* Main Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/[0.05] rounded-lg border border-white/[0.08]">
            <FileCheck className="w-4 h-4 text-white/70" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-white/90">Phase Requirements</h3>
            <p className="text-xs text-white/60">{formatPhaseName(currentPhase)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-white/[0.03] rounded-lg border border-white/[0.06] p-0.5">
            <button
              onClick={() => onViewModeChange('list')}
              className={`p-1.5 rounded transition-all ${
                viewMode === 'list'
                  ? 'bg-white/[0.08] text-white/80'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded transition-all ${
                viewMode === 'grid'
                  ? 'bg-white/[0.08] text-white/80'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-1.5 bg-white/[0.03] hover:bg-white/[0.06] rounded-lg border border-white/[0.06] text-white/60 hover:text-white/80 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-white/80">Progress</span>
          <span className="text-xs text-white/60">
            {completedRequirements} of {totalRequirements} complete
          </span>
        </div>

        {/* Progress Bar */}
        <div className="relative h-2 bg-white/[0.05] rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        {/* Progress Text */}
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className="text-white/50">
            {Math.round(completionPercentage)}% complete
          </span>
          {totalRequirements > 0 && (
            <div className="flex items-center gap-1 text-white/40">
              <Target className="w-3 h-3" />
              <span>{totalRequirements - completedRequirements} remaining</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};