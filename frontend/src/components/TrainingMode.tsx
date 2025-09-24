import React, { useState, useEffect, useRef } from 'react';
import { Brain, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Domain types matching Quan's terminology
interface SUDsAssessment {
  strength: number; // 0-10 scale
  direction: 'P' | 'N' | 'Neu'; // Positive, Negative, Neutral
  location: string; // Body location
}

interface StateCheck {
  timestamp: Date;
  assessment: SUDsAssessment;
  patientResponse: string;
}

// TherapistInstruction interface removed - using from models

interface TrainingSession {
  id: string;
  startTime: Date;
  currentPhase: 'intake' | 'setup' | 'mindfulness' | 'intervention' | 'closure';
  instructionPhase: 'instruct' | 'wait' | 'check_in';
  stateChecks: StateCheck[];
  currentSUDs: SUDsAssessment;
  elapsedMinutes: number;
}

export const TrainingMode: React.FC = () => {
  const [session, setSession] = useState<TrainingSession>({
    id: crypto.randomUUID(),
    startTime: new Date(),
    currentPhase: 'intake',
    instructionPhase: 'instruct',
    stateChecks: [],
    currentSUDs: { strength: 0, direction: 'Neu', location: '' },
    elapsedMinutes: 0
  });

  const [messages, setMessages] = useState<Array<{
    role: 'therapist' | 'patient' | 'coach';
    content: string;
    timestamp: Date;
  }>>([]);

  const [patientInput, setPatientInput] = useState('');
  const [isWaitPhase] = useState(false);
  const [nextCheckInTime] = useState<Date | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Timer for session duration
  useEffect(() => {
    const timer = setInterval(() => {
      setSession(prev => ({
        ...prev,
        elapsedMinutes: Math.floor((Date.now() - prev.startTime.getTime()) / 60000)
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (role: 'therapist' | 'patient' | 'coach', content: string) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
  };

  const handlePatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientInput.trim()) return;

    addMessage('patient', patientInput);
    // TODO: Send to backend for processing
    setPatientInput('');
  };


  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="flex h-full bg-gray-50">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Training Mode - MMF Session
            </h2>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span>{session.elapsedMinutes} min</span>
              </div>
              <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                Phase: {session.currentPhase}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <AnimatePresence>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${
                  msg.role === 'patient' ? 'flex-row-reverse' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  msg.role === 'therapist' ? 'bg-blue-500' :
                  msg.role === 'patient' ? 'bg-green-500' :
                  'bg-purple-500'
                }`}>
                  {msg.role === 'therapist' ? '🧠' :
                   msg.role === 'patient' ? '👤' : '🎯'}
                </div>
                <div className={`max-w-lg ${
                  msg.role === 'patient' ? 'text-right' : ''
                }`}>
                  <div className={`inline-block px-4 py-2 rounded-lg ${
                    msg.role === 'therapist' ? 'bg-blue-100' :
                    msg.role === 'patient' ? 'bg-green-100' :
                    'bg-purple-100 italic'
                  }`}>
                    {msg.content}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Patient Input */}
        <form onSubmit={handlePatientSubmit} className="border-t bg-white p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={patientInput}
              onChange={(e) => setPatientInput(e.target.value)}
              placeholder={isWaitPhase ? "Processing... (Wait phase)" : "Your response as patient..."}
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isWaitPhase}
            />
            <button
              type="submit"
              disabled={isWaitPhase}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      </div>

      {/* Right Panel - SUDs Assessment & Coach Guidance */}
      <div className="w-96 bg-white border-l">
        <div className="p-6 border-b">
          <h3 className="font-semibold mb-4">Current Assessment (SUDs)</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Strength (0-10)</label>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-400 to-red-500 transition-all"
                    style={{ width: `${session.currentSUDs.strength * 10}%` }}
                  />
                </div>
                <span className="font-semibold">{session.currentSUDs.strength}</span>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600">Direction</label>
              <div className="flex gap-2 mt-1">
                {['P', 'N', 'Neu'].map(dir => (
                  <div
                    key={dir}
                    className={`px-3 py-1 rounded-full text-sm ${
                      session.currentSUDs.direction === dir
                        ? dir === 'P' ? 'bg-green-500 text-white' :
                          dir === 'N' ? 'bg-red-500 text-white' :
                          'bg-gray-500 text-white'
                        : 'bg-gray-200'
                    }`}
                  >
                    {dir === 'P' ? 'Positive' : dir === 'N' ? 'Negative' : 'Neutral'}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600">Location</label>
              <p className="mt-1 text-sm">{session.currentSUDs.location || 'Not specified'}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Coach Guidance
          </h3>
          <div className="space-y-3 text-sm">
            {session.instructionPhase === 'instruct' && (
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="font-medium">Current Phase: Instruction</p>
                <p className="text-gray-600 mt-1">
                  Follow intake protocol - gather information about the issue
                </p>
              </div>
            )}
            {session.instructionPhase === 'wait' && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="font-medium">Current Phase: Wait</p>
                <p className="text-gray-600 mt-1">
                  Allow processing for {isWaitPhase ? '2-5' : '3-5'} minutes
                </p>
                {nextCheckInTime && (
                  <p className="text-xs mt-1">
                    Next check-in: {formatTime(nextCheckInTime)}
                  </p>
                )}
              </div>
            )}
            {session.instructionPhase === 'check_in' && (
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="font-medium">Current Phase: Check-In</p>
                <p className="text-gray-600 mt-1">
                  Assess Str, Dir, Loc - decide next action
                </p>
              </div>
            )}

            {/* Decision Logic Display */}
            {session.elapsedMinutes < 20 && session.currentSUDs.strength > 0 && (
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-xs">T {'<'} 20 min & Str {'>'} 0 → Return to Issue</p>
              </div>
            )}
            {session.elapsedMinutes >= 20 && session.currentSUDs.strength > 0 && 
             session.currentSUDs.direction === 'N' && (
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-xs">T {'>'} 20 min & Str {'>'} 0 & Dir = N → Consider Micro-Interventions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};