import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Brain, Users, Network, Sparkles } from 'lucide-react';
import { apiUrl, wsUrl } from '../config/api';

interface Message {
  id: string;
  role: 'patient' | 'therapist' | 'coach';
  content: string;
  timestamp: Date;
  isEmbedded?: boolean;
}

interface IntakeField {
  field_name: string;
  value: string;
  confidence: number;
  quality: number;
  extracted: boolean;
}

interface IntakeProgress {
  completion_score: number;
  quality_score: number;
  can_progress: boolean;
  missing_fields: string[];
  required_fields: Record<string, IntakeField>;
}

interface KnowledgeNode {
  id: string;
  label: string;
  type: 'entity' | 'relationship' | 'concept';
  x: number;
  y: number;
  connections: string[];
}

interface IntakeFormData {
  // Personal Information
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  
  // Mental Health Assessment  
  primaryConcerns: string[];
  symptomDuration: string;
  symptomSeverity: number;
  impactOnLife: string;
  previousTherapy: boolean;
  medications: string;
  
  // Goals
  therapyGoals: string[];
  expectations: string;
}

export const TherapyIntakeSession: React.FC = () => {
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [intakeProgress, setIntakeProgress] = useState<IntakeProgress | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [phase, setPhase] = useState<'intake' | 'setup'>('intake');
  const [embeddingCount, setEmbeddingCount] = useState(0);
  const [knowledgeNodes, setKnowledgeNodes] = useState<KnowledgeNode[]>([]);
  const [intakeFormData, setIntakeFormData] = useState<IntakeFormData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    email: '',
    phone: '',
    primaryConcerns: [],
    symptomDuration: '',
    symptomSeverity: 5,
    impactOnLife: '',
    previousTherapy: false,
    medications: '',
    therapyGoals: [],
    expectations: ''
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startSession = async () => {
    try {
      // Start an intake session
      const response = await fetch(apiUrl('/api/intake/sessions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: 'patient-' + Date.now(),
          therapist_id: 'therapist-' + Date.now()
        })
      });
      
      const data = await response.json();
      setSessionId(data.session_id);
      setIsSessionActive(true);
      
      // Connect to WebSocket
      const websocket = new WebSocket(wsUrl(data.websocket));
      
      websocket.onmessage = (event) => {
        const update = JSON.parse(event.data);
        handleSessionUpdate(update);
      };
      
      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      websocket.onclose = () => {
        setIsSessionActive(false);
      };
      
      setWs(websocket);
      
      // Start fetching intake progress periodically
      const progressInterval = setInterval(() => {
        fetchIntakeProgress(data.session_id);
      }, 5000); // Every 5 seconds
      
      // Clean up interval on unmount
      return () => clearInterval(progressInterval);
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const fetchIntakeProgress = async (sessionId: string) => {
    try {
      const response = await fetch(apiUrl(`/api/sessions/${sessionId}/attention`));
      const data = await response.json();
      setIntakeProgress(data);
      
      // Check if we should transition to setup
      if (data.can_progress && phase === 'intake') {
        // Coach agent would suggest transition here
        const coachMessage: Message = {
          id: 'coach-' + Date.now(),
          role: 'coach',
          content: '🎯 Coach: Great progress! The patient has shared enough information about their presenting issues. Consider transitioning to the SETUP phase to establish treatment goals and logistics.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, coachMessage]);
      }
    } catch (error) {
      console.error('Failed to fetch intake progress:', error);
    }
  };

  const handleSessionUpdate = (update: any) => {
    if (update.type === 'message') {
      const role = update.message.role === 'therapist' ? 'therapist' : 
                   update.message.role === 'patient' ? 'patient' : 
                   update.message.role === 'coach' ? 'coach' : 'patient';
      
      setMessages(prev => [...prev, {
        id: update.message.id,
        role: role,
        content: update.message.content,
        timestamp: new Date(update.timestamp),
        isEmbedded: false
      }]);
      
      // Simulate embedding generation after a short delay
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.id === update.message.id ? { ...msg, isEmbedded: true } : msg
        ));
        setEmbeddingCount(prev => prev + 1);
      }, 1000);
    }
    
    if (update.phase) {
      setPhase(update.phase === 'setup' ? 'setup' : 'intake');
    }
    
    if (update.type === 'extraction') {
      // Extraction happened, progress will be updated in next fetch
    }
    
    if (update.type === 'status' && update.status === 'completed') {
      setIsSessionActive(false);
    }
  };

  useEffect(() => {
    return () => {
      ws?.close();
    };
  }, [ws]);


  // Extract data from messages and update intake form
  const extractAndFillIntakeForm = (message: Message) => {
    const content = message.content.toLowerCase();
    
    // Extract names
    const nameMatch = content.match(/my name is (\w+)\s+(\w+)/i);
    if (nameMatch) {
      setIntakeFormData(prev => ({
        ...prev,
        firstName: nameMatch[1],
        lastName: nameMatch[2]
      }));
    }
    
    // Extract concerns
    if (content.includes('anxiety') || content.includes('stress') || content.includes('worry')) {
      setIntakeFormData(prev => ({
        ...prev,
        primaryConcerns: [...new Set([...prev.primaryConcerns, 'Anxiety'])]
      }));
    }
    
    if (content.includes('depression') || content.includes('sad') || content.includes('hopeless')) {
      setIntakeFormData(prev => ({
        ...prev,
        primaryConcerns: [...new Set([...prev.primaryConcerns, 'Depression'])]
      }));
    }
    
    // Extract duration
    const durationMatch = content.match(/(\d+)\s*(months?|years?|weeks?)/i);
    if (durationMatch) {
      setIntakeFormData(prev => ({
        ...prev,
        symptomDuration: durationMatch[0]
      }));
    }
    
    // Extract severity indicators
    if (content.includes('severe') || content.includes('overwhelming')) {
      setIntakeFormData(prev => ({ ...prev, symptomSeverity: 8 }));
    } else if (content.includes('moderate')) {
      setIntakeFormData(prev => ({ ...prev, symptomSeverity: 5 }));
    } else if (content.includes('mild')) {
      setIntakeFormData(prev => ({ ...prev, symptomSeverity: 3 }));
    }
    
    // Add knowledge nodes
    if (message.role === 'patient') {
      const concepts = [];
      if (content.includes('work')) concepts.push('Work Issues');
      if (content.includes('relationship')) concepts.push('Relationships');
      if (content.includes('family')) concepts.push('Family');
      if (content.includes('sleep')) concepts.push('Sleep Problems');
      
      concepts.forEach(concept => {
        const nodeId = concept.toLowerCase().replace(/\s+/g, '-');
        if (!knowledgeNodes.find(n => n.id === nodeId)) {
          setKnowledgeNodes(prev => [...prev, {
            id: nodeId,
            label: concept,
            type: 'concept',
            x: Math.random() * 300 + 50,
            y: Math.random() * 300 + 50,
            connections: prev.length > 0 ? [prev[prev.length - 1].id] : []
          }]);
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Gradient mesh background */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950 to-black" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full filter blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full filter blur-[128px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-600/10 rounded-full filter blur-[128px]" />
      </div>
      
      <div className="relative z-10">
        {/* Navigation Bar */}
        <nav className="border-b border-white/5 backdrop-blur-xl bg-white/[0.01]">
          <div className="max-w-[1400px] mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-white/90">Therapy Navigation System</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-white/40">Session ID: {sessionId || 'Not started'}</span>
                <div className="w-px h-4 bg-white/10" />
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isSessionActive ? 'bg-green-400' : 'bg-white/20'}`} />
                  <span className="text-xs text-white/60">{isSessionActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            </div>
          </div>
        </nav>
        
        <div className="p-6">
          <div className="max-w-[1400px] mx-auto">

            {!isSessionActive && !sessionId && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center min-h-[70vh]"
              >
                <div className="text-center mb-12">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 backdrop-blur-xl border border-white/10 flex items-center justify-center"
                  >
                    <Brain className="w-10 h-10 text-white/80" />
                  </motion.div>
                  <h2 className="text-3xl font-light text-white/90 mb-2">Welcome to Therapy Navigation</h2>
                  <p className="text-sm text-white/40">AI-powered intake sessions with real-time knowledge extraction</p>
                </div>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={startSession}
                  className="group relative px-8 py-3 overflow-hidden rounded-xl backdrop-blur-xl bg-white/[0.05] border border-white/10 transition-all"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-white/60" />
                    <span className="text-sm font-medium text-white/90">Begin Intake Session</span>
                  </div>
                </motion.button>
              </motion.div>
            )}

            {sessionId && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Chat Pane */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0 }}
                  className="lg:col-span-1"
                >
                  <div className="h-[80vh] rounded-2xl overflow-hidden backdrop-blur-xl bg-white/[0.02] border border-white/[0.05]">
                    {/* Chat Header */}
                    <div className="px-5 py-4 border-b border-white/[0.05]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-xl border border-white/10 flex items-center justify-center">
                            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                          </div>
                          <span className="text-xs font-medium text-white/80">Conversation</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-white/40">{embeddingCount} embeddings</span>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${isSessionActive ? 'bg-green-400 animate-pulse' : 'bg-white/20'}`} />
                            <span className="text-[10px] text-white/40">
                              {isSessionActive ? 'Recording' : 'Paused'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                      <AnimatePresence>
                        {messages.map((msg, idx) => {
                          // Extract data when rendering messages
                          if (msg.role === 'patient' && !msg.isEmbedded) {
                            extractAndFillIntakeForm(msg);
                          }
                          
                          return (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className={`flex ${msg.role === 'therapist' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-[85%] ${msg.role === 'coach' ? 'w-full' : ''}`}>
                                <div className="flex items-start gap-2 mb-1">
                                  {msg.role === 'patient' && (
                                    <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                                      <Users className="w-3 h-3 text-blue-400" />
                                    </div>
                                  )}
                                  {msg.role === 'therapist' && (
                                    <div className="w-6 h-6 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                                      <Brain className="w-3 h-3 text-purple-400" />
                                    </div>
                                  )}
                                  <div className={`rounded-xl px-4 py-2.5 backdrop-blur-sm ${
                                    msg.role === 'patient' 
                                      ? 'bg-white/[0.03] border border-white/[0.05]' 
                                      : msg.role === 'therapist'
                                      ? 'bg-white/[0.03] border border-white/[0.05]'
                                      : 'bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-500/10'
                                  }`}>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[10px] font-medium text-white/40">
                                        {msg.role === 'patient' ? 'Patient' : 
                                         msg.role === 'therapist' ? 'Dr. Smith' : 
                                         'AI Coach'}
                                      </span>
                                      {msg.isEmbedded && (
                                        <div className="flex items-center gap-1">
                                          <div className="w-1 h-1 rounded-full bg-green-400" />
                                          <span className="text-[9px] text-green-400/60">embedded</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-white/70 text-xs leading-relaxed">{msg.content}</div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                      <div ref={messagesEndRef} />
                    </div>
                  </div>
                </motion.div>

                {/* Knowledge Graph Pane */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="lg:col-span-1"
                >
                  <div className="h-[80vh] rounded-2xl overflow-hidden backdrop-blur-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="px-5 py-4 border-b border-white/[0.05]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 backdrop-blur-xl border border-white/10 flex items-center justify-center">
                          <Network className="w-3.5 h-3.5 text-cyan-400" />
                        </div>
                        <span className="text-xs font-medium text-white/80">Knowledge Graph</span>
                      </div>
                    </div>
                  
                    <div className="relative h-full p-5">
                      {knowledgeNodes.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10 backdrop-blur-xl border border-white/5 flex items-center justify-center">
                              <Network className="w-8 h-8 text-white/20" />
                            </div>
                            <p className="text-white/30 text-xs">Knowledge graph builds as conversation progresses</p>
                          </div>
                        </div>
                      ) : (
                        <svg className="w-full h-full">
                          <defs>
                            <filter id="glow">
                              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                              <feMerge>
                                <feMergeNode in="coloredBlur"/>
                                <feMergeNode in="SourceGraphic"/>
                              </feMerge>
                            </filter>
                          </defs>
                          
                          {/* Draw connections */}
                          {knowledgeNodes.map(node => 
                            node.connections.map(targetId => {
                              const target = knowledgeNodes.find(n => n.id === targetId);
                              if (!target) return null;
                              return (
                                <motion.line
                                  key={`${node.id}-${targetId}`}
                                  initial={{ pathLength: 0, opacity: 0 }}
                                  animate={{ pathLength: 1, opacity: 1 }}
                                  transition={{ duration: 1, ease: "easeInOut" }}
                                  x1={node.x}
                                  y1={node.y}
                                  x2={target.x}
                                  y2={target.y}
                                  stroke="url(#gradient)"
                                  strokeWidth="1"
                                  opacity="0.3"
                                />
                              );
                            })
                          )}
                          
                          <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
                              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.5" />
                            </linearGradient>
                          </defs>
                          
                          {/* Draw nodes */}
                          {knowledgeNodes.map((node, idx) => (
                            <motion.g
                              key={node.id}
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: idx * 0.1, type: "spring", stiffness: 200 }}
                            >
                              <circle
                                cx={node.x}
                                cy={node.y}
                                r="24"
                                fill={node.type === 'entity' ? 'rgba(59, 130, 246, 0.1)' : 
                                      node.type === 'concept' ? 'rgba(139, 92, 246, 0.1)' :
                                      'rgba(236, 72, 153, 0.1)'}
                                stroke={node.type === 'entity' ? 'rgba(59, 130, 246, 0.5)' : 
                                        node.type === 'concept' ? 'rgba(139, 92, 246, 0.5)' :
                                        'rgba(236, 72, 153, 0.5)'}
                                strokeWidth="1"
                                filter="url(#glow)"
                              />
                              <text
                                x={node.x}
                                y={node.y}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="white"
                                fontSize="10"
                                fontWeight="400"
                                opacity="0.8"
                              >
                                {node.label}
                              </text>
                            </motion.g>
                          ))}
                        </svg>
                      )}
                    </div>
                  </div>
                </motion.div>
                
                {/* Intake Forms Pane */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="lg:col-span-1"
                >
                  <div className="h-[80vh] rounded-2xl overflow-hidden backdrop-blur-xl bg-white/[0.02] border border-white/[0.05]">
                    <div className="px-5 py-4 border-b border-white/[0.05]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-xl border border-white/10 flex items-center justify-center">
                            <Users className="w-3.5 h-3.5 text-green-400" />
                          </div>
                          <span className="text-xs font-medium text-white/80">Intake Form</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400/60 animate-pulse" />
                          <span className="text-[10px] text-white/40">Auto-filling</span>
                        </div>
                      </div>
                    </div>
                  
                    <div className="overflow-y-auto h-full p-5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                      <form className="space-y-6">
                        {/* Personal Information */}
                        <div>
                          <h3 className="text-[11px] font-medium text-white/40 uppercase tracking-wider mb-3">Personal Information</h3>
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] text-white/30 block mb-1.5">First Name</label>
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={intakeFormData.firstName}
                                    readOnly
                                    className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.05] rounded-lg text-white/70 text-xs placeholder-white/20 focus:outline-none focus:border-white/10 transition-colors"
                                    placeholder="Extracted from conversation"
                                  />
                                  {intakeFormData.firstName && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center"
                                    >
                                      <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                    </motion.div>
                                  )}
                                </div>
                              </div>
                              <div>
                                <label className="text-[10px] text-white/30 block mb-1.5">Last Name</label>
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={intakeFormData.lastName}
                                    readOnly
                                    className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.05] rounded-lg text-white/70 text-xs placeholder-white/20 focus:outline-none focus:border-white/10 transition-colors"
                                    placeholder="Extracted from conversation"
                                  />
                                  {intakeFormData.lastName && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center"
                                    >
                                      <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                    </motion.div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-[10px] text-white/30 block mb-1.5">Email Address</label>
                              <input
                                type="email"
                                value={intakeFormData.email}
                                readOnly
                                className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.05] rounded-lg text-white/70 text-xs placeholder-white/20 focus:outline-none focus:border-white/10 transition-colors"
                                placeholder="Extracted from conversation"
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Mental Health Assessment */}
                        <div>
                          <h3 className="text-[11px] font-medium text-white/40 uppercase tracking-wider mb-3">Mental Health Assessment</h3>
                          <div className="space-y-3">
                            <div>
                              <label className="text-[10px] text-white/30 block mb-2">Primary Concerns</label>
                              <div className="min-h-[60px] p-3 bg-white/[0.02] border border-white/[0.05] rounded-lg">
                                {intakeFormData.primaryConcerns.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {intakeFormData.primaryConcerns.map(concern => (
                                      <motion.span
                                        key={concern}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        whileHover={{ scale: 1.05 }}
                                        className="px-2.5 py-1 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-full text-[10px] text-purple-300/80 backdrop-blur-sm"
                                      >
                                        {concern}
                                      </motion.span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-white/20">Listening for concerns...</span>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-[10px] text-white/30 block mb-1.5">Symptom Duration</label>
                              <input
                                type="text"
                                value={intakeFormData.symptomDuration}
                                readOnly
                                className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.05] rounded-lg text-white/70 text-xs placeholder-white/20 focus:outline-none focus:border-white/10 transition-colors"
                                placeholder="Extracted from conversation"
                              />
                            </div>
                            
                            <div>
                              <label className="text-[10px] text-white/30 block mb-2">Symptom Severity</label>
                              <div className="relative">
                                <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(intakeFormData.symptomSeverity / 10) * 100}%` }}
                                    className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                                  />
                                </div>
                                <div className="flex justify-between mt-2">
                                  <span className="text-[9px] text-white/30">Mild</span>
                                  <span className="text-xs text-white/60 font-medium">{intakeFormData.symptomSeverity}/10</span>
                                  <span className="text-[9px] text-white/30">Severe</span>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-[10px] text-white/30 block mb-1.5">Impact on Daily Life</label>
                              <textarea
                                value={intakeFormData.impactOnLife}
                                readOnly
                                className="w-full px-3 py-2 bg-white/[0.02] border border-white/[0.05] rounded-lg text-white/70 text-xs h-16 resize-none placeholder-white/20 focus:outline-none focus:border-white/10 transition-colors scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                                placeholder="Extracted from conversation"
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Progress Indicator */}
                        {intakeProgress && (
                          <div className="pt-4 mt-4 border-t border-white/[0.05]">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-white/40">Intake Completion</span>
                                <span className="text-xs text-white/60 font-medium">{Math.round(intakeProgress.completion_score * 100)}%</span>
                              </div>
                              <div className="relative h-1 bg-white/[0.05] rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${intakeProgress.completion_score * 100}%` }}
                                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-emerald-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                              </div>
                              
                              {intakeProgress.can_progress && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg backdrop-blur-sm"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                                      <Sparkles className="w-2.5 h-2.5 text-green-400" />
                                    </div>
                                    <span className="text-[11px] text-green-400/80">Ready to proceed to treatment planning</span>
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          </div>
                        )}
                      </form>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer { animation: shimmer 2s infinite; }
        
        .scrollbar-thin {
          scrollbar-width: thin;
        }
        .scrollbar-thumb-white\/10::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 9999px;
        }
        .scrollbar-track-transparent::-webkit-scrollbar-track {
          background-color: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
      `}</style>
    </div>
  );
};