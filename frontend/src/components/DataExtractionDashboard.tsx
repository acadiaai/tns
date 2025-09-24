import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  Brain,
  Target,
  Zap,
  Clock,
  Shield,
  RefreshCw
} from 'lucide-react';

interface RequiredField {
  field_name: string;
  description: string;
  required: boolean;
  min_quality: number;
  extracted: boolean;
  value?: any;
  confidence?: number;
  quality?: number;
}

interface AttentionStructure {
  session_id: string;
  current_stage: number;
  completion_score: number;
  quality_score: number;
  can_progress: boolean;
  missing_fields: string[];
  low_quality_fields: string[];
  required_fields: Record<string, RequiredField>;
}

interface DataExtractionDashboardProps {
  sessionId: string;
}

export const DataExtractionDashboard: React.FC<DataExtractionDashboardProps> = ({ sessionId }) => {
  const [attention, setAttention] = useState<AttentionStructure | null>(null);
  const [, setIsLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Fetch attention structure
  const fetchAttention = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/attention`);
      const data = await response.json();
      setAttention(data);
    } catch (error) {
      console.error('Failed to fetch attention structure:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchAttention();
      // Poll for updates
      const interval = setInterval(fetchAttention, 3000);
      return () => clearInterval(interval);
    }
  }, [sessionId]);

  // Simulate conversation
  const simulateConversation = async () => {
    setIsSimulating(true);
    try {
      const response = await fetch('/api/simulate/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_profile_index: 0,
          therapist_profile_index: 0,
          num_exchanges: 8
        })
      });
      const data = await response.json();
      console.log('Simulation complete:', data);
      // Refresh attention structure
      await fetchAttention();
    } catch (error) {
      console.error('Simulation failed:', error);
    } finally {
      setIsSimulating(false);
    }
  };

  const getFieldIcon = (fieldName: string) => {
    const icons: Record<string, JSX.Element> = {
      presenting_problem: <Brain className="h-4 w-4" />,
      immediate_risk: <Shield className="h-4 w-4" />,
      goals_for_therapy: <Target className="h-4 w-4" />,
      symptom_duration: <Clock className="h-4 w-4" />,
      impact_on_life: <Zap className="h-4 w-4" />
    };
    return icons[fieldName] || <AlertCircle className="h-4 w-4" />;
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 0.8) return 'text-green-400';
    if (quality >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getProgressBarColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (!attention) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-400">Loading attention structure...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-400" />
                Data Extraction Dashboard
              </CardTitle>
              <CardDescription>
                Real-time extraction of structured data from therapy conversations
              </CardDescription>
            </div>
            <Button
              onClick={simulateConversation}
              disabled={isSimulating}
              className="flex items-center gap-2"
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Simulating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Simulate Conversation
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Completion</span>
              <span className="text-lg font-bold">{(attention.completion_score * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getProgressBarColor(attention.completion_score)}`}
                style={{ width: `${attention.completion_score * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {attention.missing_fields.length} required fields missing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Quality</span>
              <span className={`text-lg font-bold ${getQualityColor(attention.quality_score)}`}>
                {(attention.quality_score * 100).toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getProgressBarColor(attention.quality_score)}`}
                style={{ width: `${attention.quality_score * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {attention.low_quality_fields.length} fields need improvement
            </p>
          </CardContent>
        </Card>

        <Card className={attention.can_progress ? 'border-green-500/50' : 'border-red-500/50'}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Stage Progress</span>
              {attention.can_progress ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
            </div>
            <p className={`text-sm font-medium ${attention.can_progress ? 'text-green-400' : 'text-red-400'}`}>
              {attention.can_progress ? 'Ready to progress' : 'More data needed'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Current: Stage {attention.current_stage}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Required Fields Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Required Fields Extraction Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(attention.required_fields).map(([fieldName, field]) => {
              const isMissing = attention.missing_fields.includes(fieldName);
              const isLowQuality = attention.low_quality_fields.includes(fieldName);
              const status = isMissing ? 'missing' : isLowQuality ? 'low-quality' : 'extracted';
              
              return (
                <div key={fieldName} className="border border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        status === 'extracted' ? 'bg-green-500/20' :
                        status === 'low-quality' ? 'bg-yellow-500/20' :
                        'bg-red-500/20'
                      }`}>
                        {getFieldIcon(fieldName)}
                      </div>
                      <div>
                        <h4 className="font-medium capitalize">
                          {fieldName.replace(/_/g, ' ')}
                        </h4>
                        <p className="text-sm text-gray-400 mt-1">
                          {field.description}
                        </p>
                        {field.value && (
                          <div className="mt-2 p-2 bg-gray-800 rounded text-sm">
                            <span className="text-gray-300">Value: </span>
                            <span className="text-white">{JSON.stringify(field.value)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {status === 'extracted' && (
                        <div className="flex items-center gap-2 text-green-400">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm">Extracted</span>
                        </div>
                      )}
                      {status === 'low-quality' && (
                        <div className="flex items-center gap-2 text-yellow-400">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">Low Quality</span>
                        </div>
                      )}
                      {status === 'missing' && (
                        <div className="flex items-center gap-2 text-red-400">
                          <XCircle className="h-4 w-4" />
                          <span className="text-sm">Missing</span>
                        </div>
                      )}
                      {field.confidence !== undefined && (
                        <p className="text-xs text-gray-500 mt-1">
                          Confidence: {(field.confidence * 100).toFixed(0)}%
                        </p>
                      )}
                      {field.quality !== undefined && (
                        <p className={`text-xs mt-1 ${getQualityColor(field.quality)}`}>
                          Quality: {(field.quality * 100).toFixed(0)}%
                        </p>
                      )}
                    </div>
                  </div>
                  {field.required && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">Required</span>
                      <span className="text-xs text-gray-500">
                        Min quality: {(field.min_quality * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">
                {attention.can_progress 
                  ? 'All required data has been extracted with sufficient quality.'
                  : `Complete ${attention.missing_fields.length} missing fields and improve ${attention.low_quality_fields.length} low-quality fields to proceed.`
                }
              </p>
            </div>
            <Button
              disabled={!attention.can_progress}
              className="flex items-center gap-2"
            >
              Proceed to Setup Stage
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};