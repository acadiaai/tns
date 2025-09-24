import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, MessageSquare, User, Brain, Calendar, FileText, Target, Zap, AlertCircle, RefreshCw, Minimize, Maximize, Wind, CheckCircle, Shield, Heart, Sparkles } from 'lucide-react';
import { apiUrl } from '../config/api';
import { fetchWithAuth } from '../utils/auth-interceptor';

interface Patient {
  id: string;
  name: string;
  email: string;
}

interface Therapist {
  id: string;
  name: string;
  specialty: string;
}

interface Session {
  id: string;
  client_id: string;
  therapist_id: string;
  status: 'active' | 'completed' | 'paused';
  phase: 'intake' | 'setup' | 'treatment';
  start_time: string;
  end_time?: string;
  message_count: number;
  patient_name?: string;
}

interface SessionsManagementProps {
  onSessionSelect: (sessionId: string) => void;
  showActiveOnly?: boolean;
}

export const SessionsManagement: React.FC<SessionsManagementProps> = ({ onSessionSelect, showActiveOnly = false }) => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [therapistsRes, patientsRes, sessionsRes] = await Promise.all([
        fetchWithAuth(apiUrl('/api/therapists')),
        fetchWithAuth(apiUrl('/api/clients')),
        fetchWithAuth(apiUrl('/api/sessions'))
      ]);

      const [therapistsData, patientsData, sessionsData] = await Promise.all([
        therapistsRes.json(),
        patientsRes.json(),
        sessionsRes.json()
      ]);

      console.log('SessionsManagement loaded data:', { therapistsData, patientsData, sessionsData });

      // Ensure we have arrays
      const therapistsArray = Array.isArray(therapistsData) ? therapistsData : [];
      const patientsArray = Array.isArray(patientsData) ? patientsData : [];
      const sessionsArray = Array.isArray(sessionsData) ? sessionsData : [];

      // Transform sessions and fetch workflow status for each
      const transformedSessionsWithNulls = await Promise.all(
        sessionsArray.map(async (session: any) => {
          let workflowPhase = session.phase || 'intake';
          let workflowStatus = session.status || 'active';
          let messageCount = session.message_count || 0;
          
          // Skip this session if we're showing active only (can be implemented later with actual criteria)
          if (showActiveOnly) {
            return null;
          }

          // Fetch actual workflow status and conversation length
          try {
            const [workflowResponse, conversationResponse] = await Promise.all([
              fetchWithAuth(apiUrl(`/api/sessions/${session.id}/workflow/status`)),
              fetchWithAuth(apiUrl(`/api/sessions/${session.id}/messages`))
            ]);
            
            // Handle workflow status
            if (workflowResponse.ok) {
              const workflowData = await workflowResponse.json();
              
              // Map workflow states to user-friendly names
              const stateNames: Record<string, string> = {
                'intake': 'Intake',
                'identify_activate': 'Identify & Activate',
                'setup': 'Setup',
                'focused_mindfulness': 'Focused Mindfulness',
                'status_check': 'Status Check',
                'micro_reprocessing': 'Micro-Reprocessing',
                'squeeze_lemon': 'Squeeze Lemon',
                'expansion_work': 'Expansion Work',
                'dtm_passive': 'DTM Passive',
                'checkin': 'Check-in',
                'active': 'Active Processing',
                'integration': 'Integration',
                'stabilization': 'Stabilization',
                'resolution': 'Resolution'
              };
              
              const currentState = workflowData.current_state || 'intake';
              workflowPhase = stateNames[currentState] || currentState;
              workflowStatus = workflowData.status || workflowStatus;
            }
            
            // Get conversation length for meter display
            if (conversationResponse.ok) {
              const conversationData = await conversationResponse.json();
              const messages = Array.isArray(conversationData) ? conversationData : (conversationData.messages || []);
              
              // Store actual message count for meter display
              messageCount = messages.length;
              console.log(`Session ${session.id} has ${messageCount} messages`);
            } else {
              // Fallback: 0 messages
              messageCount = 0;
              console.warn(`Failed to fetch messages for session ${session.id}: ${conversationResponse.status}`);
            }
          } catch (error) {
            console.warn(`Failed to fetch session data for ${session.id}:`, error);
            // Use existing message count as fallback
            messageCount = session.message_count || 0;
          }
          
          return {
            ...session,
            phase: workflowPhase,
            status: workflowStatus,
            message_count: messageCount
          };
        })
      );

      // Filter out null values (sessions without active connections when showActiveOnly is true)
      const transformedSessions: Session[] = transformedSessionsWithNulls.filter(session => session !== null);

      console.log('SessionsManagement arrays:', { 
        therapists: therapistsArray.length, 
        patients: patientsArray.length, 
        sessions: transformedSessions.length,
        showActiveOnly 
      });

      setTherapists(therapistsArray);
      setPatients(patientsArray);
      setSessions(transformedSessions);
      setError(null);
    } catch (error) {
      console.error('Failed to load data:', error);
      setError(`Failed to load data: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const createNewSession = async (therapistId: string, patientId: string) => {
    try {
      const response = await fetchWithAuth(apiUrl('/api/sessions'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          therapist_id: therapistId,
          simulation_mode: false,
          conversation_turns: 10
        })
      });

      if (response.ok) {
        const newSession = await response.json();
        console.log('✅ New session created:', newSession.session_id);
        onSessionSelect(newSession.session_id);
        loadData(); // Refresh the data
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const getSessionsForTherapistPatient = (therapistId: string, patientId: string) => {
    return sessions.filter(s => s.therapist_id === therapistId && s.client_id === patientId);
  };

  const getPatientsForTherapist = (therapistId: string) => {
    if (!Array.isArray(sessions) || !Array.isArray(patients)) {
      console.warn('getPatientsForTherapist: sessions or patients not arrays', { sessions, patients });
      return [];
    }
    
    // Only show patients who have sessions specifically with THIS therapist
    const therapistSessions = sessions.filter(s => s.therapist_id === therapistId);
    const patientIds = [...new Set(therapistSessions.map(s => s.client_id))];
    return patients.filter(p => patientIds.includes(p.id));
  };

  const getPhaseIcon = (phase: string) => {
    const normalizedPhase = phase.toLowerCase().replace(/\s+/g, '_');
    switch (normalizedPhase) {
      case 'intake': return FileText;
      case 'identify_&_activate': 
      case 'identify_activate': return Target;
      case 'setup': return Zap;
      case 'focused_mindfulness': return Brain;
      case 'status_check': return AlertCircle;
      case 'micro-reprocessing':
      case 'micro_reprocessing': return RefreshCw;
      case 'squeeze_lemon': return Minimize;
      case 'expansion_work': return Maximize;
      case 'dtm_passive': return Wind;
      case 'check-in':
      case 'checkin': return CheckCircle;
      case 'integration': return Shield;
      case 'stabilization': return Heart;
      case 'resolution': return Sparkles;
      default: return MessageSquare;
    }
  };

  const getPhaseColor = (phase: string) => {
    const normalizedPhase = phase.toLowerCase().replace(/\s+/g, '_');
    switch (normalizedPhase) {
      case 'intake': return {
        text: 'text-orange-400',
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/20'
      };
      case 'identify_&_activate':
      case 'identify_activate': return {
        text: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20'
      };
      case 'setup': return {
        text: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/20'
      };
      case 'focused_mindfulness': return {
        text: 'text-purple-400',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20'
      };
      case 'status_check': return {
        text: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/20'
      };
      case 'micro-reprocessing':
      case 'micro_reprocessing': return {
        text: 'text-cyan-400',
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/20'
      };
      case 'squeeze_lemon': return {
        text: 'text-lime-400',
        bg: 'bg-lime-500/10',
        border: 'border-lime-500/20'
      };
      case 'expansion_work': return {
        text: 'text-indigo-400',
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/20'
      };
      case 'dtm_passive': return {
        text: 'text-sky-400',
        bg: 'bg-sky-500/10',
        border: 'border-sky-500/20'
      };
      case 'check-in':
      case 'checkin': return {
        text: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20'
      };
      case 'integration': return {
        text: 'text-teal-400',
        bg: 'bg-teal-500/10',
        border: 'border-teal-500/20'
      };
      case 'stabilization': return {
        text: 'text-rose-400',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/20'
      };
      case 'resolution': return {
        text: 'text-violet-400',
        bg: 'bg-violet-500/10',
        border: 'border-violet-500/20'
      };
      default: return {
        text: 'text-gray-400',
        bg: 'bg-gray-500/10',
        border: 'border-gray-500/20'
      };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/60">Loading sessions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white/90">Therapy Sessions</h2>
        <p className="text-white/60 text-sm mt-1">Click "New Session" under any patient to start, or click existing sessions to continue</p>
      </div>

      {/* Unassigned Patients Section */}
      {patients.filter(p => !sessions.some(s => s.client_id === p.id)).length > 0 && (
        <div className="border border-white/10 rounded-xl p-6 bg-white/[0.02] mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gray-500/20 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <h3 className="text-white/90 font-medium">Unassigned Patients</h3>
              <p className="text-white/60 text-sm">Patients not yet assigned to any therapist</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patients.filter(p => !sessions.some(s => s.client_id === p.id)).map(patient => (
              <div key={patient.id} className="border border-white/5 rounded-lg p-4 bg-white/[0.01]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white/80 font-medium text-sm truncate">{patient.name}</h4>
                    <p className="text-white/40 text-xs truncate">{patient.email}</p>
                  </div>
                </div>
                
                <div className="text-center py-4">
                  <Calendar className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-white/40 text-xs mb-3">No sessions yet</p>
                </div>

                {/* Assign to Therapist Buttons */}
                <div className="space-y-2">
                  {therapists.map(therapist => (
                    <motion.button
                      key={therapist.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => createNewSession(therapist.id, patient.id)}
                      className="w-full p-2 border border-dashed border-purple-500/30 rounded-lg 
                                 bg-purple-500/5 text-purple-400/80 hover:text-purple-400 hover:border-purple-500/50 
                                 hover:bg-purple-500/10 transition-all text-xs font-medium flex items-center justify-center gap-2"
                    >
                      <Plus className="w-3 h-3" />
                      Assign to {therapist.name}
                    </motion.button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Therapist Swimlanes */}
      <div className="space-y-8">
        {therapists.map(therapist => {
          const therapistPatients = getPatientsForTherapist(therapist.id);
          
          if (therapistPatients.length === 0) {
            return (
              <div key={therapist.id} className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Brain className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-white/90 font-medium">{therapist.name}</h3>
                      <p className="text-white/60 text-sm">{therapist.specialty}</p>
                    </div>
                  </div>
                </div>
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">No sessions yet</p>
                </div>
              </div>
            );
          }

          return (
            <div key={therapist.id} className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
              {/* Therapist Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Brain className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-white/90 font-medium">{therapist.name}</h3>
                    <p className="text-white/60 text-sm">{therapist.specialty}</p>
                  </div>
                </div>
                <span className="text-white/40 text-xs">{therapistPatients.length} patients</span>
              </div>

              {/* Patient Columns */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {therapistPatients.map(patient => {
                  const patientSessions = getSessionsForTherapistPatient(therapist.id, patient.id);
                  
                  return (
                    <div key={patient.id} className="border border-white/5 rounded-lg p-4 bg-white/[0.01]">
                      {/* Patient Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white/80 font-medium text-sm truncate">{patient.name}</h4>
                          <p className="text-white/40 text-xs truncate">{patient.email}</p>
                        </div>
                      </div>

                      {/* Sessions List */}
                      <div className="space-y-2">
                        {patientSessions.length === 0 ? (
                          <div className="text-center py-4">
                            <Calendar className="w-8 h-8 text-white/20 mx-auto mb-2" />
                            <p className="text-white/40 text-xs">No sessions</p>
                          </div>
                        ) : (
                          patientSessions
                            .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
                            .map(session => (
                            <motion.div
                              key={session.id}
                              whileHover={{ scale: 1.02, x: 2 }}
                              onClick={() => onSessionSelect(session.id)}
                              className={`p-3 border rounded-lg cursor-pointer transition-all group
                                         ${getPhaseColor(session.phase).bg} ${getPhaseColor(session.phase).border}
                                         hover:brightness-110`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {React.createElement(getPhaseIcon(session.phase), {
                                    className: `w-4 h-4 ${getPhaseColor(session.phase).text}`
                                  })}
                                  <span className={`text-xs font-medium ${getPhaseColor(session.phase).text}`}>
                                    {session.phase}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="text-xs text-white/60">
                                  {(() => {
                                    const date = new Date(session.start_time);
                                    const options: Intl.DateTimeFormatOptions = { 
                                      weekday: 'long', 
                                      month: 'numeric', 
                                      day: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true
                                    };
                                    return date.toLocaleDateString('en-US', options);
                                  })()}
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1">
                                    <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300"
                                        style={{ width: `${Math.min(100, (session.message_count / 50) * 100)}%` }}
                                      />
                                    </div>
                                    <span className="text-white/40 text-[10px]">{session.message_count} msgs</span>
                                  </div>
                                  <MessageSquare className="w-3 h-3 text-white/30 group-hover:text-white/60 transition-colors" />
                                </div>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </div>

                      {/* Quick Create Session Button */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => createNewSession(therapist.id, patient.id)}
                        className="w-full mt-3 p-3 border border-dashed border-blue-500/30 rounded-lg 
                                   bg-blue-500/5 text-blue-400/80 hover:text-blue-400 hover:border-blue-500/50 
                                   hover:bg-blue-500/10 transition-all text-xs font-medium flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Start New Session
                      </motion.button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};