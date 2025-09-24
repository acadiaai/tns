import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import {
  User,
  Brain,
  Target,
  Heart,
  Zap,
  Eye,
  Shield,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  PlayCircle,
  PauseCircle,
  ArrowRight,
  ArrowLeft,
  Settings
} from 'lucide-react';

// Mock data structures
interface Stage {
  id: number;
  name: string;
  description: string;
  objectives: string;
  duration: number;
  icon: React.ReactNode;
  color: string;
}

interface AIGuidance {
  id: string;
  type: 'suggestion' | 'warning' | 'encouragement' | 'technique' | 'question';
  content: string;
  context: string;
  confidence: number;
  timestamp: string;
}

interface SessionProgress {
  stage_id: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  start_time?: string;
  end_time?: string;
  client_response: string;
  therapist_notes: string;
  stress_level: number;
}

interface MockSession {
  id: string;
  client_name: string;
  therapist_name: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  current_stage: number;
  start_time: string;
  progress: SessionProgress[];
}

// Mock therapeutic stages
const STAGES: Stage[] = [
  {
    id: 1,
    name: "Background",
    description: "Gather client background information and identify potential issues",
    objectives: "Establish rapport, understand background, identify primary concerns",
    duration: 15,
    icon: <User className="h-5 w-5" />,
    color: "bg-blue-500"
  },
  {
    id: 2,
    name: "Identify Issue",
    description: "Clearly identify and articulate the specific problem",
    objectives: "Define problem clearly, understand triggers, assess impact",
    duration: 10,
    icon: <Target className="h-5 w-5" />,
    color: "bg-purple-500"
  },
  {
    id: 3,
    name: "Set Stage",
    description: "Prepare mentally and emotionally for therapeutic work",
    objectives: "Establish therapeutic alliance, set expectations, create safety",
    duration: 8,
    icon: <Settings className="h-5 w-5" />,
    color: "bg-green-500"
  },
  {
    id: 4,
    name: "Meditation",
    description: "Guide through meditation or mindfulness practice",
    objectives: "Promote relaxation, increase present-moment awareness",
    duration: 12,
    icon: <Heart className="h-5 w-5" />,
    color: "bg-pink-500"
  },
  {
    id: 5,
    name: "Processing",
    description: "Process emotions, thoughts, and experiences",
    objectives: "Explore emotions, process experiences, identify patterns",
    duration: 20,
    icon: <Brain className="h-5 w-5" />,
    color: "bg-orange-500"
  },
  {
    id: 6,
    name: "Integration",
    description: "Integrate insights and connect to life experience",
    objectives: "Connect insights to life patterns, develop understanding",
    duration: 15,
    icon: <Eye className="h-5 w-5" />,
    color: "bg-cyan-500"
  },
  {
    id: 7,
    name: "Stabilization",
    description: "Stabilize emotional state and ground before ending",
    objectives: "Emotional stabilization, grounding techniques, ensure safety",
    duration: 10,
    icon: <Shield className="h-5 w-5" />,
    color: "bg-indigo-500"
  },
  {
    id: 8,
    name: "Resolution",
    description: "Achieve calm, connected, and self-regulated state",
    objectives: "Achieve self-regulation, establish calm state, plan next steps",
    duration: 10,
    icon: <CheckCircle className="h-5 w-5" />,
    color: "bg-emerald-500"
  }
];

// Mock AI guidance generator
const generateAIGuidance = (stageId: number, _clientResponse: string, stressLevel: number): AIGuidance[] => {
  const guidanceTemplates = {
    1: [
      {
        type: 'suggestion' as const,
        content: 'The client seems comfortable sharing background information. Consider asking about their support system.',
        context: 'Client opened up about family dynamics',
        confidence: 0.85
      },
      {
        type: 'question' as const,
        content: 'Ask: "What would you like to be different in your life after our work together?"',
        context: 'Establishing therapy goals',
        confidence: 0.90
      }
    ],
    2: [
      {
        type: 'warning' as const,
        content: 'Client stress level is elevated. Consider slowing down and providing more validation.',
        context: `Stress level: ${stressLevel}/10`,
        confidence: 0.92
      },
      {
        type: 'technique' as const,
        content: 'Try the "scaling technique" - ask the client to rate their problem from 1-10.',
        context: 'Helping client quantify their experience',
        confidence: 0.88
      }
    ],
    3: [
      {
        type: 'encouragement' as const,
        content: 'Great job establishing safety. The client appears ready to do deeper work.',
        context: 'Client showing signs of readiness',
        confidence: 0.87
      }
    ],
    4: [
      {
        type: 'suggestion' as const,
        content: 'Consider a 5-minute breathing exercise. Client seems receptive to mindfulness.',
        context: 'Client mentioned interest in relaxation',
        confidence: 0.91
      },
      {
        type: 'technique' as const,
        content: 'Guide them through progressive muscle relaxation if they seem tense.',
        context: 'Observed physical tension',
        confidence: 0.89
      }
    ],
    5: [
      {
        type: 'warning' as const,
        content: 'Client is accessing difficult emotions. Stay present and provide grounding if needed.',
        context: 'Emotional processing underway',
        confidence: 0.94
      },
      {
        type: 'suggestion' as const,
        content: 'Reflect back the emotion you\'re observing: "I notice you seem [emotion]..."',
        context: 'Emotional validation opportunity',
        confidence: 0.86
      }
    ],
    6: [
      {
        type: 'question' as const,
        content: 'Ask: "What patterns are you noticing in how you respond to stress?"',
        context: 'Integration of insights',
        confidence: 0.88
      }
    ],
    7: [
      {
        type: 'technique' as const,
        content: 'Use the "5-4-3-2-1" grounding technique to help them stabilize.',
        context: 'Client needs grounding after emotional work',
        confidence: 0.93
      }
    ],
    8: [
      {
        type: 'encouragement' as const,
        content: 'Excellent work! The client has achieved a noticeably calmer state.',
        context: 'Successful progression through stages',
        confidence: 0.95
      }
    ]
  };

  return (guidanceTemplates[stageId as keyof typeof guidanceTemplates] || []).map((template: any, index: number) => ({
    id: `guidance-${stageId}-${index}`,
    ...template,
    timestamp: new Date().toISOString()
  }));
};

// Mock session data
const createMockSession = (): MockSession => ({
  id: 'session-001',
  client_name: 'John Doe',
  therapist_name: 'Dr. Quan',
  status: 'in_progress',
  current_stage: 1,
  start_time: new Date().toISOString(),
  progress: STAGES.map(stage => ({
    stage_id: stage.id,
    status: stage.id === 1 ? 'in_progress' : 'pending',
    client_response: '',
    therapist_notes: '',
    stress_level: 5
  }))
});

export const TherapyDashboard: React.FC = () => {
  const [session, setSession] = useState<MockSession>(createMockSession());
  const [aiGuidance, setAiGuidance] = useState<AIGuidance[]>([]);
  const [currentStageData, setCurrentStageData] = useState<SessionProgress | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [adaptiveMode, setAdaptiveMode] = useState(true);

  // Get current stage info
  const currentStage = STAGES.find(s => s.id === session.current_stage);
  const currentProgress = session.progress.find(p => p.stage_id === session.current_stage);

  useEffect(() => {
    setCurrentStageData(currentProgress || null);
  }, [session.current_stage]);

  // Start session
  const startSession = () => {
    setIsSessionActive(true);
    setSession(prev => ({ ...prev, status: 'in_progress' }));
    // Generate initial AI guidance
    const guidance = generateAIGuidance(1, '', 5);
    setAiGuidance(guidance);
  };

  // Move to next stage
  const nextStage = () => {
    if (session.current_stage < 8) {
      setSession(prev => {
        const newProgress = [...prev.progress];
        const currentIndex = newProgress.findIndex(p => p.stage_id === prev.current_stage);
        if (currentIndex !== -1) {
          newProgress[currentIndex].status = 'completed';
          newProgress[currentIndex].end_time = new Date().toISOString();
        }

        const nextIndex = newProgress.findIndex(p => p.stage_id === prev.current_stage + 1);
        if (nextIndex !== -1) {
          newProgress[nextIndex].status = 'in_progress';
          newProgress[nextIndex].start_time = new Date().toISOString();
        }

        return {
          ...prev,
          current_stage: prev.current_stage + 1,
          progress: newProgress
        };
      });

      // Generate AI guidance for next stage
      const nextGuidance = generateAIGuidance(session.current_stage + 1, '', 5);
      setAiGuidance(nextGuidance);
    }
  };

  // Previous stage
  const previousStage = () => {
    if (session.current_stage > 1) {
      setSession(prev => ({
        ...prev,
        current_stage: prev.current_stage - 1
      }));
    }
  };

  // Update progress
  const updateProgress = (updates: Partial<SessionProgress>) => {
    setSession(prev => {
      const newProgress = [...prev.progress];
      const index = newProgress.findIndex(p => p.stage_id === prev.current_stage);
      if (index !== -1) {
        newProgress[index] = { ...newProgress[index], ...updates };
      }
      return { ...prev, progress: newProgress };
    });

    // Generate adaptive AI guidance based on updates
    if (updates.client_response || updates.stress_level !== undefined) {
      const guidance = generateAIGuidance(
        session.current_stage,
        updates.client_response || '',
        updates.stress_level || 5
      );
      setAiGuidance(guidance);
    }
  };

  // Skip stage (adaptive workflow)
  const skipStage = () => {
    setSession(prev => {
      const newProgress = [...prev.progress];
      const currentIndex = newProgress.findIndex(p => p.stage_id === prev.current_stage);
      if (currentIndex !== -1) {
        newProgress[currentIndex].status = 'skipped';
      }
      return { ...prev, progress: newProgress };
    });
    nextStage();
  };

  return (
    <div className="min-h-screen p-6 space-y-6 flex flex-col items-center">
      <div className="max-w-7xl w-full mx-auto">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg glass-card-strong">
                <Brain className="h-6 w-6 text-theme-light" />
              </div>
              Therapy Navigation System
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-gray-400">Adaptive Mode</span>
                <Button
                  variant={adaptiveMode ? "accent" : "outline"}
                  size="sm"
                  onClick={() => setAdaptiveMode(!adaptiveMode)}
                >
                  {adaptiveMode ? 'ON' : 'OFF'}
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              AI-Powered therapeutic guidance through the 8-stage resolution process
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Session Controls */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Session: {session.client_name}</span>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs ${session.status === 'in_progress' ? 'bg-green-500/20 text-green-300' :
                  session.status === 'completed' ? 'bg-blue-500/20 text-blue-300' :
                    'bg-gray-500/20 text-gray-300'
                  }`}>
                  {session.status.replace('_', ' ')}
                </span>
                {!isSessionActive ? (
                  <Button onClick={startSession} className="flex items-center gap-2">
                    <PlayCircle className="h-4 w-4" />
                    Start Session
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setIsSessionActive(false)} className="flex items-center gap-2">
                    <PauseCircle className="h-4 w-4" />
                    Pause Session
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Stage Progress Bar */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>8-Stage Therapeutic Process</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              {STAGES.map((stage, index) => (
                <div key={stage.id} className="flex items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-white font-bold
                    ${session.progress[index]?.status === 'completed' ? 'bg-green-500' :
                      session.progress[index]?.status === 'in_progress' ? stage.color :
                        session.progress[index]?.status === 'skipped' ? 'bg-gray-500' :
                          'bg-gray-700'}
                  `}>
                    {session.progress[index]?.status === 'completed' ?
                      <CheckCircle className="h-5 w-5" /> :
                      stage.icon
                    }
                  </div>
                  {index < STAGES.length - 1 && (
                    <div className={`
                      w-12 h-1 mx-2
                      ${session.progress[index]?.status === 'completed' ? 'bg-green-500' : 'bg-gray-600'}
                    `} />
                  )}
                </div>
              ))}
            </div>

            {/* Current Stage Info */}
            {currentStage && (
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Stage {currentStage.id}: {currentStage.name}
                </h3>
                <p className="text-gray-300 mb-2">{currentStage.description}</p>
                <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
                  <span>Duration: {currentStage.duration}min</span>
                  <span>•</span>
                  <span>Objectives: {currentStage.objectives}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stage Interface */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {currentStage?.icon}
                Current Stage: {currentStage?.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Client Response */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Client Response
                </label>
                <textarea
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white resize-none"
                  rows={4}
                  placeholder="Record client's response and observations..."
                  value={currentStageData?.client_response || ''}
                  onChange={(e) => updateProgress({ client_response: e.target.value })}
                />
              </div>

              {/* Therapist Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Therapist Notes
                </label>
                <textarea
                  className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white resize-none"
                  rows={3}
                  placeholder="Your observations and notes..."
                  value={currentStageData?.therapist_notes || ''}
                  onChange={(e) => updateProgress({ therapist_notes: e.target.value })}
                />
              </div>

              {/* Stress Level */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Client Stress Level: {currentStageData?.stress_level || 5}/10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={currentStageData?.stress_level || 5}
                  onChange={(e) => updateProgress({ stress_level: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Calm</span>
                  <span>Moderate</span>
                  <span>High Stress</span>
                </div>
              </div>

              {/* Stage Controls */}
              <div className="flex items-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={previousStage}
                  disabled={session.current_stage === 1}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </Button>

                <Button
                  onClick={nextStage}
                  disabled={session.current_stage === 8}
                  className="flex items-center gap-2"
                >
                  <ArrowRight className="h-4 w-4" />
                  Next Stage
                </Button>

                {adaptiveMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={skipStage}
                    className="flex items-center gap-2 ml-auto"
                  >
                    Skip Stage
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Guidance Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                AI Therapist Guidance
              </CardTitle>
              <CardDescription>
                Real-time suggestions based on Quan's 40 years of therapeutic expertise
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {aiGuidance.map((guidance) => (
                  <div key={guidance.id} className="p-4 bg-gray-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center
                        ${guidance.type === 'suggestion' ? 'bg-blue-500' :
                          guidance.type === 'warning' ? 'bg-red-500' :
                            guidance.type === 'encouragement' ? 'bg-green-500' :
                              guidance.type === 'technique' ? 'bg-purple-500' :
                                'bg-yellow-500'}
                      `}>
                        {guidance.type === 'suggestion' ? <Lightbulb className="h-4 w-4" /> :
                          guidance.type === 'warning' ? <AlertCircle className="h-4 w-4" /> :
                            guidance.type === 'encouragement' ? <Heart className="h-4 w-4" /> :
                              guidance.type === 'technique' ? <Zap className="h-4 w-4" /> :
                                <Target className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white capitalize">
                            {guidance.type}
                          </span>
                          <span className="text-xs text-gray-400">
                            {Math.round(guidance.confidence * 100)}% confidence
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 mb-2">{guidance.content}</p>
                        <p className="text-xs text-gray-400">{guidance.context}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Session Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Session Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {session.progress.filter(p => p.status === 'completed').length}
                </div>
                <div className="text-sm text-gray-400">Completed Stages</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {session.progress.filter(p => p.status === 'in_progress').length}
                </div>
                <div className="text-sm text-gray-400">Current Stage</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {session.progress.filter(p => p.status === 'pending').length}
                </div>
                <div className="text-sm text-gray-400">Remaining</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {Math.round((session.progress.filter(p => p.status === 'completed').length / 8) * 100)}%
                </div>
                <div className="text-sm text-gray-400">Progress</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 