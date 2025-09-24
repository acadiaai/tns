import React from 'react';
import { CheckCircle, Clock, AlertTriangle, XCircle } from 'lucide-react';
import { DataViewer } from '../../../components/DataViewer';

interface RequirementCardProps {
  requirement: {
    id: string;
    name: string;
    description: string;
    schema: string;
    is_required: boolean;
  };
  sessionData?: any;
  status: 'complete' | 'partial' | 'pending';
  phaseColor?: string;
}

export const RequirementCard: React.FC<RequirementCardProps> = ({
  requirement,
  sessionData,
  status,
  phaseColor
}) => {
  const getStatusIcon = () => {
    const completeColor = phaseColor || '#10b981';
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-4 h-4" style={{ color: completeColor }} />;
      case 'partial':
        return <Clock className="w-4 h-4 text-amber-400" />;
      case 'pending':
        return requirement.is_required ?
          <AlertTriangle className="w-4 h-4 text-red-400" /> :
          <XCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusBadge = () => {
    const baseClasses = "px-2 py-0.5 rounded-full text-xs font-medium border";
    const completeColor = phaseColor || '#10b981';

    switch (status) {
      case 'complete':
        return {
          className: baseClasses,
          style: {
            color: completeColor,
            backgroundColor: `${completeColor}20`,
            borderColor: `${completeColor}40`
          }
        };
      case 'partial':
        return {
          className: baseClasses,
          style: {
            color: '#fbbf24',
            backgroundColor: '#fbbf2420',
            borderColor: '#fbbf2440'
          }
        };
      case 'pending':
        return requirement.is_required
          ? {
              className: baseClasses,
              style: {
                color: '#f87171',
                backgroundColor: '#f8717120',
                borderColor: '#f8717140'
              }
            }
          : {
              className: baseClasses,
              style: {
                color: '#94a3b8',
                backgroundColor: '#94a3b820',
                borderColor: '#94a3b840'
              }
            };
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'complete':
        return 'Complete';
      case 'partial':
        return 'In Progress';
      case 'pending':
        return requirement.is_required ? 'Required' : 'Optional';
    }
  };

  return (
    <div className="group bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.08] hover:border-white/[0.12] rounded-xl p-4 transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="mt-0.5">
            {getStatusIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="text-sm font-medium text-white/90 mb-1 leading-tight">
              {requirement.name}
            </h5>
            <p className="text-xs text-white/60 leading-relaxed">
              {requirement.description}
            </p>
          </div>
        </div>
        <div className="ml-3 flex-shrink-0">
          <span {...getStatusBadge()}>
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Data Preview */}
      {sessionData && status !== 'pending' && (
        <div className="mt-4 pt-3 border-t border-white/[0.06]">
          <DataViewer
            schema={requirement.schema}
            data={sessionData}
            compact={true}
          />
        </div>
      )}
    </div>
  );
};