import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle, FileText, RefreshCw } from 'lucide-react';
import { DataViewer } from '../../../components/DataViewer';

interface PhaseRequirement {
  id: string;
  name: string;
  description: string;
  schema: string;
  is_required: boolean;
}

interface PhaseRequirementsProps {
  sessionId: string;
  currentPhase: string;
  sessionData?: any;
}

export const PhaseRequirements: React.FC<PhaseRequirementsProps> = ({
  sessionId,
  currentPhase,
  sessionData
}) => {
  const [requirements, setRequirements] = useState<PhaseRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentPhase) {
      loadPhaseRequirements();
    }
  }, [currentPhase, sessionId]);

  const loadPhaseRequirements = async () => {
    try {
      setLoading(true);
      setError(null);

      // First get the phase ID from the current phase name
      const phasesResponse = await fetch('/api/phases');
      if (!phasesResponse.ok) throw new Error('Failed to load phases');

      const phases = await phasesResponse.json();
      const currentPhaseObj = phases.find((p: any) => p.name === currentPhase);

      if (!currentPhaseObj) {
        setRequirements([]);
        return;
      }

      // Get requirements for this phase
      const reqResponse = await fetch(`/api/phases/${currentPhaseObj.id}/requirements`);
      if (!reqResponse.ok) throw new Error('Failed to load requirements');

      const reqs = await reqResponse.json();
      setRequirements(reqs);
    } catch (err) {
      console.error('Failed to load phase requirements:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getRequirementStatus = (requirement: PhaseRequirement) => {
    if (!sessionData) return 'pending';

    try {
      const schema = JSON.parse(requirement.schema);
      if (schema.type === 'object' && schema.properties) {
        const hasAllRequired = schema.required?.every((field: string) => {
          const value = sessionData[field];
          return value !== null && value !== undefined && value !== '';
        }) ?? true;

        const hasAnyData = Object.keys(schema.properties).some((field: string) => {
          const value = sessionData[field];
          return value !== null && value !== undefined && value !== '';
        });

        if (hasAllRequired && hasAnyData) return 'complete';
        if (hasAnyData) return 'partial';
      }
    } catch (e) {
      console.error('Error parsing schema:', e);
    }

    return 'pending';
  };

  const getStatusIcon = (status: string, isRequired: boolean) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'partial':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'pending':
        return isRequired ?
          <AlertTriangle className="w-4 h-4 text-red-400" /> :
          <XCircle className="w-4 h-4 text-gray-400" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string, isRequired: boolean) => {
    switch (status) {
      case 'complete':
        return 'Complete';
      case 'partial':
        return 'In Progress';
      case 'pending':
        return isRequired ? 'Required' : 'Optional';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status: string, isRequired: boolean) => {
    switch (status) {
      case 'complete':
        return 'text-green-300 bg-green-500/10 border-green-500/20';
      case 'partial':
        return 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20';
      case 'pending':
        return isRequired ?
          'text-red-300 bg-red-500/10 border-red-500/20' :
          'text-gray-300 bg-gray-500/10 border-gray-500/20';
      default:
        return 'text-gray-300 bg-gray-500/10 border-gray-500/20';
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-white/60">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading requirements...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
        <div className="flex items-center gap-2 text-red-300 mb-2">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">Error</span>
        </div>
        <p className="text-xs text-red-200">{error}</p>
        <button
          onClick={loadPhaseRequirements}
          className="mt-2 px-2 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded text-xs text-red-300"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!requirements.length) {
    return (
      <div className="text-center py-6 text-white/40">
        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No requirements for this phase</p>
        <p className="text-xs text-white/30 mt-1">Ready to proceed</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-white/80">Phase Requirements</h4>
        <span className="text-xs text-white/50">
          {requirements.filter(r => getRequirementStatus(r) === 'complete').length} / {requirements.length} complete
        </span>
      </div>

      <div className="space-y-2">
        {requirements.map((requirement) => {
          const status = getRequirementStatus(requirement);
          const statusColors = getStatusColor(status, requirement.is_required);

          return (
            <div key={requirement.id} className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="text-sm font-medium text-white/90">{requirement.name}</h5>
                    {getStatusIcon(status, requirement.is_required)}
                  </div>
                  <p className="text-xs text-white/60">{requirement.description}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs border ${statusColors}`}>
                  {getStatusText(status, requirement.is_required)}
                </span>
              </div>

              {/* Show collected data if any */}
              {sessionData && status !== 'pending' && (
                <div className="mt-3 pt-2 border-t border-white/[0.05]">
                  <DataViewer
                    schema={requirement.schema}
                    data={sessionData}
                    compact={true}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="pt-2 border-t border-white/[0.05]">
        <div className="flex items-center justify-between text-xs text-white/50">
          <span>
            {requirements.filter(r => r.is_required).length} required, {requirements.filter(r => !r.is_required).length} optional
          </span>
          <span>
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
};