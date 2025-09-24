import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, ChevronRight, Search, Brain, Settings, MessageSquare, Home, Stethoscope, PlayCircle, GitBranch } from 'lucide-react';
import { SessionsManagement } from './SessionsManagement';
// import { PatientsService, type api_CreatePatientRequest } from '../api/generated';
import { NoDataEmptyState } from './EmptyStates';
import { SessionDashboard } from '../features/session/SessionDashboard';
import { WorkflowStudio } from './WorkflowStudio';
import UserAvatar from './UserAvatar';
import { apiUrl } from '../config/api';
import { fetchWithAuth } from '../utils/auth-interceptor';

interface Patient {
  id: string;
  name: string;
  email: string;
  lastSession: string;
  intakeComplete: boolean;
  primaryConcerns: string[];
  assignedTherapist?: string;
  avatar?: string;
}

interface Therapist {
  id: string;
  name: string;
  email: string;
  specialty: string;
  license: string;
  active: boolean;
}


const VIEW_STATES = {
  DASHBOARD: 'dashboard',
  PATIENTS: 'patients',
  THERAPISTS: 'therapists',
  SESSIONS: 'sessions',
  CHAT_SESSION: 'chat-session',
  WORKFLOW_STUDIO: 'workflow-studio'
} as const;

type ViewState = typeof VIEW_STATES[keyof typeof VIEW_STATES];

const getViewTitle = (viewState: ViewState): string => {
  switch (viewState) {
    case VIEW_STATES.DASHBOARD: return 'Dashboard';
    case VIEW_STATES.PATIENTS: return 'Patients';
    case VIEW_STATES.THERAPISTS: return 'Therapists';
    case VIEW_STATES.SESSIONS: return 'Sessions';
    case VIEW_STATES.CHAT_SESSION: return '';
    case VIEW_STATES.WORKFLOW_STUDIO: return 'Workflow Studio';
    default: return '';
  }
};

export const TherapyNavigationSystem: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [viewState, setViewState] = useState<ViewState>(VIEW_STATES.DASHBOARD);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [backendVersion, setBackendVersion] = useState<string>('');

  // Fetch backend version for smoke test verification
  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const response = await fetch(apiUrl('/version'));
        const data = await response.json();
        setBackendVersion(data.build_time || 'unknown');
      } catch (error) {
        console.error('Failed to fetch backend version:', error);
        setBackendVersion('offline');
      }
    };
    fetchVersion();
  }, []);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [showNewTherapistModal, setShowNewTherapistModal] = useState(false);


  // Handle URL routing for deep linking
  useEffect(() => {
    const path = location.pathname;
    console.log('🔄 Navigation effect triggered, path:', path, 'current viewState:', viewState);
    
    let newViewState: ViewState | null = null;
    let newSessionId: string | null = null;
    
    if (path === '/' || path === '/dashboard') {
      newViewState = VIEW_STATES.DASHBOARD;
    } else if (path === '/patients') {
      newViewState = VIEW_STATES.PATIENTS;
    } else if (path === '/therapists') {
      newViewState = VIEW_STATES.THERAPISTS;
    } else if (path === '/sessions') {
      newViewState = VIEW_STATES.SESSIONS;
    } else if (path.startsWith('/sessions/')) {
      newSessionId = path.split('/')[2];
      newViewState = VIEW_STATES.CHAT_SESSION;
    } else if (path === '/workflow-studio') {
      newViewState = VIEW_STATES.WORKFLOW_STUDIO;
    } else {
      console.log('❌ Unknown path:', path);
      return;
    }
    
    // Only update state if it's actually changing
    if (newViewState && newViewState !== viewState) {
      console.log('✅ Setting viewState to', newViewState);
      setViewState(newViewState);
    }
    
    if (newSessionId && newSessionId !== activeSessionId) {
      console.log('✅ Setting activeSessionId to', newSessionId);
      setActiveSessionId(newSessionId);
    }
  }, [location.pathname]);

  // Navigate to different views
  const navigateToView = (view: ViewState, id?: string) => {
    console.log('🚀 navigateToView called with:', view, id);
    setViewState(view);
    switch (view) {
      case 'dashboard':
        console.log('📍 Navigating to /');
        navigate('/');
        break;
      case 'patients':
        console.log('📍 Navigating to /patients');
        navigate('/patients');
        break;
      case 'therapists':
        console.log('📍 Navigating to /therapists');
        navigate('/therapists');
        break;
      case 'sessions':
        console.log('📍 Navigating to /sessions');
        navigate('/sessions');
        break;
      case 'chat-session':
        if (id) {
          console.log('📍 Navigating to /sessions/' + id);
          navigate(`/sessions/${id}`);
        }
        break;
      case VIEW_STATES.WORKFLOW_STUDIO:
        console.log('📍 Navigating to /workflow-studio');
        navigate('/workflow-studio');
        break;
    }
  };

  useEffect(() => {
    // Load therapists first, then patients
    const loadAllData = async () => {
      await loadTherapists();
      await loadPatients();
    };
    loadAllData();
  }, []);

  const loadPatients = async () => {
    try {
      console.log('📊 Loading patients...');
      const response = await fetchWithAuth(apiUrl('/api/patients'));
      
      if (!response.ok) {
        console.error('❌ Patients API error:', response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Loaded patients:', data);
      
      // Extract patients array from response
      const patientsArray = data.patients || data;
      
      // Transform to our Patient interface 
      const transformedPatients: Patient[] = patientsArray.map((patient: any) => ({
        id: patient.id,
        name: patient.name,
        email: patient.email || '',
        lastSession: patient.last_session_date ? 
          new Date(patient.last_session_date).toLocaleDateString() : 
          'No sessions yet',
        intakeComplete: patient.intake_complete || false,
        primaryConcerns: patient.primary_concerns || [],
        assignedTherapist: 'Loading...'
      }));
      
      setPatients(transformedPatients);
      console.log('✅ Patients state updated:', transformedPatients.length);
    } catch (error) {
      console.error('❌ Failed to load patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTherapists = async () => {
    try {
      console.log('Loading therapists...');
      const response = await fetchWithAuth(apiUrl('/api/therapists'));
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Loaded therapists:', data);
      
      const transformedTherapists: Therapist[] = data.map((therapist: any) => ({
        id: therapist.id,
        name: therapist.name,
        email: therapist.email || '',
        specialty: therapist.specialty || 'General Practice',
        license: therapist.license || '',
        active: true,
      }));
      
      setTherapists(transformedTherapists);
      console.log('Therapists state updated:', transformedTherapists.length);
    } catch (error) {
      console.error('Failed to load therapists:', error);
    }
  };



  const joinChatSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    navigateToView('chat-session', sessionId);
  };


  const createNewPatient = async (_patientData: any) => {
    try {
      // const resp = await PatientsService.postApiPatients({ name: patientData.name });
      // console.log('✅ Patient created:', resp);
      setShowNewPatientModal(false);
      // await loadPatients();
    } catch (error: any) {
      // Surface backend error message if available
      const message = error?.body?.message || error?.message || 'Failed to create patient';
      console.error('❌ Failed to create patient:', message);
      alert(message);
    }
  };

  const createNewTherapist = async (therapistData: any) => {
    try {
      const response = await fetchWithAuth(apiUrl('/api/therapists'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(therapistData)
      });
      
      if (response.ok) {
        console.log('✅ Therapist created successfully');
        setShowNewTherapistModal(false);
        loadTherapists(); // Refresh the list
      } else {
        console.error('❌ Failed to create therapist');
      }
    } catch (error) {
      console.error('❌ Error creating therapist:', error);
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTherapists = therapists.filter(therapist =>
    therapist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    therapist.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const SidebarButton = ({ icon: Icon, label, isActive, onClick }: { 
    icon: any, 
    label: string, 
    isActive: boolean, 
    onClick: () => void 
  }) => (
    <motion.button
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        isActive 
          ? 'bg-white/10 text-white border border-white/20' 
          : 'text-white/60 hover:text-white/90 hover:bg-white/5'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{label}</span>
    </motion.button>
  );

  return (
    <div className="min-h-screen bg-black flex">
      {/* Gradient mesh background */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950 to-black" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full filter blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full filter blur-[128px]" />
      </div>

      {/* Sidebar */}
      <div className="relative z-10 w-64 border-r border-white/5 backdrop-blur-xl bg-white/[0.01]">
        <div className="p-6">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-white/90">Therapy Navigation</span>
          </div>

          {/* Navigation */}
          <div className="space-y-2">
            <SidebarButton 
              icon={Home} 
              label="Dashboard" 
              isActive={viewState === 'dashboard'} 
              onClick={() => navigateToView('dashboard')} 
            />
            <SidebarButton 
              icon={Users} 
              label="Patients" 
              isActive={viewState === 'patients'} 
              onClick={() => navigateToView('patients')} 
            />
            <SidebarButton 
              icon={Stethoscope} 
              label="Therapists" 
              isActive={viewState === 'therapists'} 
              onClick={() => navigateToView('therapists')} 
            />
            <SidebarButton 
              icon={MessageSquare} 
              label="Sessions" 
              isActive={viewState === 'sessions'} 
              onClick={() => navigateToView('sessions')} 
            />
            
            {/* Divider */}
            <div className="my-4 border-t border-white/[0.05]" />
            
            <SidebarButton
              icon={GitBranch}
              label="Workflow Studio"
              isActive={viewState === VIEW_STATES.WORKFLOW_STUDIO}
              onClick={() => navigateToView('workflow-studio')}
            />
          </div>

          {/* Version indicator for smoke test */}
          {backendVersion && (
            <div className="mt-auto pt-4 px-2">
              <div className="text-xs text-white/40 font-mono">
                Backend: {backendVersion.split('_')[1] || backendVersion}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col">
        {/* Top Bar - Hide for chat sessions */}
        {viewState !== VIEW_STATES.CHAT_SESSION && (
          <nav
            className="sticky top-0 z-50 border-b backdrop-blur-xl"
            style={{
              backgroundColor: 'rgba(255,255,255,0.01)',
              borderColor: 'rgba(255,255,255,0.05)'
            }}
          >
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-medium text-white/90">
                  {getViewTitle(viewState)}
                </h1>
              </div>
              <div className="flex items-center gap-4">
                <button className="text-white/60 hover:text-white/90 transition-colors">
                  <Settings className="w-4 h-4" />
                </button>
                <UserAvatar />
              </div>
            </div>
          </div>
        </nav>
        )}

        <AnimatePresence mode="wait">
          <div className="flex-1 overflow-hidden">
          {/* Dashboard View */}
          {viewState === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8"
            >
              <div className="max-w-7xl mx-auto space-y-8">
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-2xl backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-white/90">{patients.length}</p>
                        <p className="text-sm text-white/60">Total Patients</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-2xl backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <Stethoscope className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-white/90">{therapists.length}</p>
                        <p className="text-sm text-white/60">Active Therapists</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-2xl backdrop-blur-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                        <MessageSquare className="w-6 h-6 text-green-400" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-white/90">-</p>
                        <p className="text-sm text-white/60">Sessions Available Below</p>
                      </div>
                    </div>
                  </div>
                </div>


                {/* Sessions Management */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-light text-white/90">Active Sessions</h2>
                      <p className="text-sm text-white/60">Sessions with live WebSocket connections</p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => navigateToView('sessions')}
                      className="px-4 py-2 bg-white/[0.02] border border-white/[0.05] rounded-lg text-white/60 hover:text-white/80 text-sm"
                    >
                      View All Sessions →
                    </motion.button>
                  </div>
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl backdrop-blur-xl p-6">
                    <SessionsManagement onSessionSelect={joinChatSession} showActiveOnly={false} />
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <motion.button
                    whileHover={{ y: -2 }}
                    onClick={async () => {
                      try {
                        console.log('Creating quick coach session...');
                        const response = await fetchWithAuth(apiUrl('/api/sessions'), {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            client_id: '3b9e936b-476b-4dd7-93bc-357943438334',
                            therapist_id: '5b69a8ad-eeda-48ef-9a97-80725c88308a',
                            start_time: new Date().toISOString()
                          })
                        });
                        if (!response.ok) throw new Error(`API error: ${response.status}`);
                        const session = await response.json();
                        console.log('✅ Quick coach session created:', session.id);
                        navigateToView('chat-session', session.id);
                      } catch (error) {
                        console.error('Failed to create coaching session:', error);
                      }
                    }}
                    className="p-8 bg-gradient-to-br from-green-600/20 to-blue-600/20 border border-green-400/20 rounded-2xl backdrop-blur-xl text-left group"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-2xl bg-green-400/10 flex items-center justify-center">
                        <PlayCircle className="w-8 h-8 text-green-400/80" />
                      </div>
                      <div>
                        <h3 className="text-xl font-medium text-white/90 mb-1">🧠 Quick Coach Session</h3>
                        <p className="text-white/60">Start brainspotting coaching immediately</p>
                      </div>
                    </div>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ y: -2 }}
                    onClick={() => navigateToView('sessions')}
                    className="p-8 bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-white/10 rounded-2xl backdrop-blur-xl text-left group"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
                        <PlayCircle className="w-8 h-8 text-white/80" />
                      </div>
                      <div>
                        <h3 className="text-xl font-medium text-white/90 mb-1">Manage Sessions</h3>
                        <p className="text-white/60">Full session management (future clinical use)</p>
                      </div>
                    </div>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ y: -2 }}
                    onClick={() => navigateToView('patients')}
                    className="p-8 bg-white/[0.02] border border-white/[0.05] rounded-2xl backdrop-blur-xl text-left group"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-2xl bg-white/[0.05] flex items-center justify-center">
                        <Users className="w-8 h-8 text-white/60" />
                      </div>
                      <div>
                        <h3 className="text-xl font-medium text-white/90 mb-1">Manage Patients</h3>
                        <p className="text-white/60">View and manage patient profiles</p>
                      </div>
                    </div>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Patients View */}
          {viewState === 'patients' && (
            <motion.div
              key="patients"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8"
            >
              <div className="max-w-7xl mx-auto">
                {/* Search and Actions */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="text"
                      placeholder="Search patients..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white/[0.03] border border-white/[0.05] rounded-xl text-white/80 placeholder-white/30 text-sm focus:outline-none focus:border-white/10 backdrop-blur-xl"
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowNewPatientModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-white/10 rounded-xl text-white/90 text-sm font-medium backdrop-blur-xl flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    New Patient
                  </motion.button>
                </div>

                {/* Patient Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loading ? (
                    <div className="col-span-full flex items-center justify-center py-20">
                      <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    </div>
                  ) : filteredPatients.length === 0 ? (
                    <div className="col-span-full">
                      <NoDataEmptyState type="patients" />
                    </div>
                  ) : (
                    filteredPatients.map((patient) => (
                      <motion.div
                        key={patient.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -2 }}
                        className="group cursor-pointer"
                      >
                        <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-2xl backdrop-blur-xl hover:bg-white/[0.04] transition-all">
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center">
                              <span className="text-white/80 font-medium">
                                {patient.name ? patient.name.split(' ').map(n => n[0]).join('') : '?'}
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
                          </div>
                          
                          <h3 className="text-white/90 font-medium mb-1">{patient.name}</h3>
                          <p className="text-white/40 text-sm mb-3">{patient.email}</p>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-white/30">Therapist</span>
                              <span className="text-white/60">{patient.assignedTherapist || 'Not assigned'}</span>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-white/30">Last Session</span>
                              <span className="text-white/60">{patient.lastSession}</span>
                            </div>
                            
                            {patient.intakeComplete ? (
                              <div className="flex items-center gap-1.5 text-xs text-green-400/80">
                                <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                                Intake Complete
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs text-amber-400/80">
                                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                                Intake Pending
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Therapists View */}
          {viewState === 'therapists' && (
            <motion.div
              key="therapists"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8"
            >
              <div className="max-w-7xl mx-auto">
                {/* Search and Actions */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="text"
                      placeholder="Search therapists..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white/[0.03] border border-white/[0.05] rounded-xl text-white/80 placeholder-white/30 text-sm focus:outline-none focus:border-white/10 backdrop-blur-xl"
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowNewTherapistModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-white/10 rounded-xl text-white/90 text-sm font-medium backdrop-blur-xl flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    New Therapist
                  </motion.button>
                </div>

                {/* Therapist Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loading ? (
                    <div className="col-span-full flex items-center justify-center py-20">
                      <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    </div>
                  ) : filteredTherapists.length === 0 ? (
                    <div className="col-span-full">
                      <NoDataEmptyState type="therapists" />
                    </div>
                  ) : (
                    filteredTherapists.map((therapist) => (
                      <motion.div
                        key={therapist.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -2 }}
                        className="group cursor-pointer"
                      >
                        <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-2xl backdrop-blur-xl hover:bg-white/[0.04] transition-all">
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-600/20 flex items-center justify-center">
                              <span className="text-white/80 font-medium">
                                {therapist.name ? therapist.name.split(' ').map(n => n[0]).join('') : '?'}
                              </span>
                            </div>
                            <div className={`w-2 h-2 rounded-full ${therapist.active ? 'bg-green-400' : 'bg-red-400'}`} />
                          </div>
                          
                          <h3 className="text-white/90 font-medium mb-1">{therapist.name}</h3>
                          <p className="text-white/40 text-sm mb-3">{therapist.email}</p>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-white/30">Specialty</span>
                              <span className="text-white/60">{therapist.specialty}</span>
                            </div>
                            
                            <div className="flex items-center gap-1.5 text-xs text-purple-400/80">
                              <Stethoscope className="w-3 h-3" />
                              Licensed Professional
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Sessions View */}
          {viewState === 'sessions' && (
            <motion.div
              key="sessions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 h-full"
            >
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <MessageSquare className="w-6 h-6 text-white/80" />
                    <h2 className="text-2xl font-light text-white/90">Sessions</h2>
                  </div>
                  <p className="text-sm text-white/60">
                    Manage therapy sessions between patients and therapists
                  </p>
                </div>

                {/* Sessions Management */}
                <div className="flex-1">
                  <SessionsManagement
                    onSessionSelect={joinChatSession}
                    showActiveOnly={false}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Chat Session View */}
          {viewState === 'chat-session' && activeSessionId && (
            <motion.div
              key="chat-session"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <SessionDashboard sessionId={activeSessionId} />
            </motion.div>
          )}



          {/* Workflow Studio View */}
          {viewState === VIEW_STATES.WORKFLOW_STUDIO && (
            <motion.div
              key="workflow-studio"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full overflow-auto"
            >
              <WorkflowStudio />
            </motion.div>
          )}

          </div>
        </AnimatePresence>
      </div>

      {/* New Patient Modal */}
      {showNewPatientModal && <NewPatientModal onClose={() => setShowNewPatientModal(false)} onSubmit={createNewPatient} />}
      
      {/* New Therapist Modal */}
      {showNewTherapistModal && <NewTherapistModal onClose={() => setShowNewTherapistModal(false)} onSubmit={createNewTherapist} />}
    </div>
  );
};

const NewPatientModal = ({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: any) => void }) => {
  const [formData, setFormData] = useState<any>({
    name: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name: formData.name });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-black/80 border border-white/20 rounded-xl p-6 w-96 backdrop-blur-xl">
        <h3 className="text-white/90 font-medium mb-4">Add New Patient</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            value={formData.name}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
            className="w-full p-2 bg-white/5 border border-white/20 rounded text-white/80 text-sm"
            required
          />
          {/* Name is the only required field for creation per API */}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 p-2 border border-white/20 rounded text-white/60 hover:text-white/80 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 p-2 bg-blue-500/20 border border-blue-500/30 rounded text-blue-400 hover:bg-blue-500/30 transition-colors text-sm"
            >
              Add Patient
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface TherapistFormData {
  name: string;
  email: string;
  specialty: string;
  license_number: string;
  years_experience: string;
  bio: string;
}

const NewTherapistModal = ({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: any) => void }) => {
  const [formData, setFormData] = useState<TherapistFormData>({
    name: '',
    email: '',
    specialty: '',
    license_number: '',
    years_experience: '',
    bio: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      years_experience: parseInt(formData.years_experience) || 0
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-black/80 border border-white/20 rounded-xl p-6 w-96 backdrop-blur-xl">
        <h3 className="text-white/90 font-medium mb-4">Add New Therapist</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            value={formData.name}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
            className="w-full p-2 bg-white/5 border border-white/20 rounded text-white/80 text-sm"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full p-2 bg-white/5 border border-white/20 rounded text-white/80 text-sm"
            required
          />
          <input
            type="text"
            placeholder="Specialty"
            value={formData.specialty}
            onChange={(e) => setFormData(prev => ({ ...prev, specialty: e.target.value }))}
            className="w-full p-2 bg-white/5 border border-white/20 rounded text-white/80 text-sm"
            required
          />
          <input
            type="text"
            placeholder="License Number"
            value={formData.license_number}
            onChange={(e) => setFormData(prev => ({ ...prev, license_number: e.target.value }))}
            className="w-full p-2 bg-white/5 border border-white/20 rounded text-white/80 text-sm"
          />
          <input
            type="number"
            placeholder="Years Experience"
            value={formData.years_experience}
            onChange={(e) => setFormData(prev => ({ ...prev, years_experience: e.target.value }))}
            className="w-full p-2 bg-white/5 border border-white/20 rounded text-white/80 text-sm"
          />
          <textarea
            placeholder="Bio"
            value={formData.bio}
            onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
            className="w-full p-2 bg-white/5 border border-white/20 rounded text-white/80 text-sm h-20"
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 p-2 border border-white/20 rounded text-white/60 hover:text-white/80 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 p-2 bg-purple-500/20 border border-purple-500/30 rounded text-purple-400 hover:bg-purple-500/30 transition-colors text-sm"
            >
              Add Therapist
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};