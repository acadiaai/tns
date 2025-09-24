import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GitBranch, Settings, FileText, Database, Clock, MessageSquare,
  Save, History, ChevronRight, Edit2, AlertCircle,
  CheckCircle, RefreshCw, Layers, Timer
} from 'lucide-react';
import { PhaseIcon } from '../utils/iconMapper';

interface Phase {
  id: string;
  display_name: string;
  description: string;
  position: number;
  color?: string;
  icon?: string;
  minimum_turns?: number;
  recommended_duration_seconds?: number;
  duration_seconds?: number;
  created_at: string;
  updated_at: string;
  phase_data?: PhaseData[];
}

interface PhaseData {
  id: string;
  phase_id: string;
  name: string;
  description: string;
  required: boolean;
  data_type: string;
}

interface Prompt {
  id: string;
  phase_id: string;
  content: string;
  version: number;
  workflow_phase?: string;
  created_at: string;
  updated_at: string;
}

interface PromptVersion {
  id: string;
  prompt_id: string;
  phase_id: string;
  content: string;
  version: number;
  created_at: string;
  created_by?: string;
}

type TabType = 'phases' | 'prompts' | 'data' | 'visualization';

export const WorkflowStudio: React.FC = () => {
  // Get initial tab from URL hash
  const getInitialTab = (): TabType => {
    const hash = window.location.hash.slice(1) as TabType;
    return ['phases', 'prompts', 'data', 'visualization'].includes(hash) ? hash : 'phases';
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab());

  // Update URL when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };
  const [phases, setPhases] = useState<Phase[]>([]);
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);
  const [prompts, setPrompts] = useState<Record<string, Prompt>>({});
  const [promptHistory, setPromptHistory] = useState<PromptVersion[]>([]);
  const [phaseData, setPhaseData] = useState<Record<string, PhaseData[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadWorkflowData();
  }, []);

  const loadWorkflowData = async () => {
    try {
      setLoading(true);

      // Load phases
      const phasesRes = await fetch('/api/phases');
      if (phasesRes.ok) {
        const phasesData = await phasesRes.json();
        setPhases(phasesData.sort((a: Phase, b: Phase) => a.position - b.position));
        if (phasesData.length > 0 && !selectedPhase) {
          setSelectedPhase(phasesData[0]);
        }
      }

      // Load prompts for all phases
      const promptsRes = await fetch('/api/workflow/prompts');
      if (promptsRes.ok) {
        const promptsData = await promptsRes.json();
        const promptsMap: Record<string, Prompt> = {};
        promptsData.forEach((prompt: any) => {
          const phaseId = prompt.phase_id || prompt.workflow_phase;
          if (phaseId) {
            promptsMap[phaseId] = {
              ...prompt,
              phase_id: phaseId
            };
          }
        });
        setPrompts(promptsMap);
      }

      // Load phase data configurations
      const phaseDataRes = await fetch('/api/phase-data');
      if (phaseDataRes.ok) {
        const phaseDataArr = await phaseDataRes.json();
        const phaseDataMap: Record<string, PhaseData[]> = {};
        phaseDataArr.forEach((data: PhaseData) => {
          if (!phaseDataMap[data.phase_id]) {
            phaseDataMap[data.phase_id] = [];
          }
          phaseDataMap[data.phase_id].push(data);
        });
        setPhaseData(phaseDataMap);
      }
    } catch (error) {
      console.error('Error loading workflow data:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePhase = async () => {
    if (!editingPhase) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/phases/${editingPhase.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: editingPhase.display_name,
          description: editingPhase.description,
          color: editingPhase.color,
          icon: editingPhase.icon,
          min_turns: editingPhase.minimum_turns || 0,
          recommended_duration: editingPhase.recommended_duration_seconds || 0,
          max_duration: editingPhase.duration_seconds || 0
        })
      });

      if (response.ok) {
        const updatedPhase = await response.json();
        setPhases(phases.map(p => p.id === updatedPhase.id ? updatedPhase : p));
        setSelectedPhase(updatedPhase);
        setEditingPhase(null);
      }
    } catch (error) {
      console.error('Error saving phase:', error);
    } finally {
      setSaving(false);
    }
  };

  const savePrompt = async () => {
    if (!selectedPhase || !editingPrompt) return;

    setSaving(true);
    try {
      const existingPrompt = prompts[selectedPhase.id];
      const url = existingPrompt
        ? `/api/prompts/${existingPrompt.id}`
        : '/api/prompts';

      const response = await fetch(url, {
        method: existingPrompt ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase_id: selectedPhase.id,
          content: editingPrompt
        })
      });

      if (response.ok) {
        const updatedPrompt = await response.json();
        setPrompts({
          ...prompts,
          [selectedPhase.id]: updatedPrompt
        });
        setEditingPrompt('');
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
    } finally {
      setSaving(false);
    }
  };

  const loadPromptHistory = async (phaseId: string) => {
    try {
      const response = await fetch(`/api/prompts/history/${phaseId}`);
      if (response.ok) {
        const history = await response.json();
        setPromptHistory(history);
        setShowHistory(true);
      }
    } catch (error) {
      console.error('Error loading prompt history:', error);
    }
  };

  const revertToVersion = async (versionId: string) => {
    if (!selectedPhase) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/prompts/${prompts[selectedPhase.id]?.id}/revert/${versionId}`, {
        method: 'PUT'
      });

      if (response.ok) {
        await loadWorkflowData();
        setShowHistory(false);
      }
    } catch (error) {
      console.error('Error reverting prompt:', error);
    } finally {
      setSaving(false);
    }
  };

  const iconOptions = [
    'Brain', 'Target', 'Eye', 'Lightbulb', 'Heart',
    'Compass', 'Map', 'Activity', 'Zap', 'CheckCircle'
  ];

  const colorOptions = [
    '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#84cc16'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white/60">Loading workflow data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20">
              <GitBranch className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Workflow Studio</h1>
              <p className="text-white/60 text-sm">Configure phases, prompts, and workflow requirements</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-white/10 pb-2">
            <button
              onClick={() => handleTabChange('phases')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                activeTab === 'phases'
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Settings className="w-4 h-4" />
              Phases
            </button>
            <button
              onClick={() => handleTabChange('prompts')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                activeTab === 'prompts'
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="w-4 h-4" />
              Prompts
            </button>
            <button
              onClick={() => handleTabChange('data')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                activeTab === 'data'
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Database className="w-4 h-4" />
              Phase Data
            </button>
            <button
              onClick={() => handleTabChange('visualization')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                activeTab === 'visualization'
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-4 h-4" />
              Visualization
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Phase List Sidebar */}
          <div className="col-span-3">
            <div className="bg-white/5 rounded-xl border border-white/10 p-4">
              <h3 className="text-sm font-semibold text-white/70 mb-3">Workflow Phases</h3>
              <div className="space-y-2">
                {phases.map((phase) => (
                  <button
                    key={phase.id}
                    onClick={() => {
                      setSelectedPhase(phase);
                      if (activeTab === 'prompts') {
                        setEditingPrompt(prompts[phase.id]?.content || '');
                      }
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-all ${
                      selectedPhase?.id === phase.id
                        ? 'bg-white/10 border border-white/20'
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Phase Icon with color background */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm border"
                        style={{
                          background: phase.color
                            ? `linear-gradient(135deg, ${phase.color}20 0%, ${phase.color}10 100%)`
                            : 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                          borderColor: phase.color
                            ? `${phase.color}30`
                            : 'rgba(255,255,255,0.1)'
                        }}
                      >
                        <PhaseIcon
                          icon={phase.icon || ''}
                          className="w-4 h-4"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">{phase.display_name}</div>
                        <div className="text-xs text-white/40">Order: {phase.position}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/30" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="col-span-9">
            <AnimatePresence mode="wait">
              {/* Phases Tab */}
              {activeTab === 'phases' && selectedPhase && (
                <motion.div
                  key="phases"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white/5 rounded-xl border border-white/10 p-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold">Phase Configuration</h2>
                    {editingPhase ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingPhase(null)}
                          className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={savePhase}
                          disabled={saving}
                          className="px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 flex items-center gap-2"
                        >
                          <Save className="w-4 h-4" />
                          Save Changes
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingPhase({...selectedPhase})}
                        className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit Phase
                      </button>
                    )}
                  </div>

                  <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm text-white/60 mb-2">Display Name</label>
                        <input
                          type="text"
                          value={editingPhase?.display_name || selectedPhase.display_name}
                          onChange={(e) => editingPhase && setEditingPhase({
                            ...editingPhase,
                            display_name: e.target.value
                          })}
                          disabled={!editingPhase}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-violet-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white/60 mb-2">Order</label>
                        <input
                          type="number"
                          value={selectedPhase.position}
                          disabled
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg opacity-50"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm text-white/60 mb-2">Description</label>
                      <textarea
                        value={editingPhase?.description || selectedPhase.description}
                        onChange={(e) => editingPhase && setEditingPhase({
                          ...editingPhase,
                          description: e.target.value
                        })}
                        disabled={!editingPhase}
                        rows={3}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-violet-500 focus:outline-none"
                      />
                    </div>

                    {/* Appearance */}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm text-white/60 mb-2">Icon</label>
                        <select
                          value={editingPhase?.icon || selectedPhase.icon || ''}
                          onChange={(e) => editingPhase && setEditingPhase({
                            ...editingPhase,
                            icon: e.target.value
                          })}
                          disabled={!editingPhase}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-violet-500 focus:outline-none"
                        >
                          <option value="">Default</option>
                          {iconOptions.map(icon => (
                            <option key={icon} value={icon}>{icon}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-white/60 mb-2">Color</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editingPhase?.color || selectedPhase.color || ''}
                            onChange={(e) => editingPhase && setEditingPhase({
                              ...editingPhase,
                              color: e.target.value
                            })}
                            disabled={!editingPhase}
                            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-violet-500 focus:outline-none"
                          />
                          {editingPhase && (
                            <div className="flex gap-1">
                              {colorOptions.map(color => (
                                <button
                                  key={color}
                                  onClick={() => setEditingPhase({
                                    ...editingPhase,
                                    color
                                  })}
                                  className="w-8 h-8 rounded"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Requirements */}
                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm text-white/60 mb-2">
                          <MessageSquare className="w-4 h-4 inline mr-1" />
                          Min Turns
                        </label>
                        <input
                          type="number"
                          value={editingPhase?.minimum_turns || selectedPhase.minimum_turns || 0}
                          onChange={(e) => editingPhase && setEditingPhase({
                            ...editingPhase,
                            minimum_turns: parseInt(e.target.value) || 0
                          })}
                          disabled={!editingPhase}
                          min="0"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-violet-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white/60 mb-2">
                          <Clock className="w-4 h-4 inline mr-1" />
                          Recommended Duration (sec)
                        </label>
                        <input
                          type="number"
                          value={editingPhase?.recommended_duration_seconds || selectedPhase.recommended_duration_seconds || 0}
                          onChange={(e) => editingPhase && setEditingPhase({
                            ...editingPhase,
                            recommended_duration_seconds: parseInt(e.target.value) || 0
                          })}
                          disabled={!editingPhase}
                          min="0"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-violet-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white/60 mb-2">
                          <Timer className="w-4 h-4 inline mr-1" />
                          Max Duration (sec)
                        </label>
                        <input
                          type="number"
                          value={editingPhase?.duration_seconds || selectedPhase.duration_seconds || 0}
                          onChange={(e) => editingPhase && setEditingPhase({
                            ...editingPhase,
                            duration_seconds: parseInt(e.target.value) || 0
                          })}
                          disabled={!editingPhase}
                          min="0"
                          placeholder="Optional"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-violet-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Prompts Tab */}
              {activeTab === 'prompts' && selectedPhase && (
                <motion.div
                  key="prompts"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white/5 rounded-xl border border-white/10 p-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold">Prompt Configuration</h2>
                      {prompts[selectedPhase.id] && (
                        <p className="text-sm text-white/50 mt-1">
                          Version {prompts[selectedPhase.id].version} •
                          Last updated: {new Date(prompts[selectedPhase.id].updated_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadPromptHistory(selectedPhase.id)}
                        className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 flex items-center gap-2"
                      >
                        <History className="w-4 h-4" />
                        History
                      </button>
                      <button
                        onClick={savePrompt}
                        disabled={saving || !editingPrompt}
                        className="px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save Prompt
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-white/60 mb-2">
                        Prompt Content for {selectedPhase.display_name}
                      </label>
                      <textarea
                        value={editingPrompt || prompts[selectedPhase.id]?.content || ''}
                        onChange={(e) => setEditingPrompt(e.target.value)}
                        placeholder="Enter the prompt content for this phase..."
                        rows={15}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:border-violet-500 focus:outline-none font-mono text-sm"
                      />
                    </div>

                    {editingPrompt && editingPrompt !== prompts[selectedPhase.id]?.content && (
                      <div className="flex items-center gap-2 text-yellow-400 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>You have unsaved changes</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Phase Data Tab */}
              {activeTab === 'data' && selectedPhase && (
                <motion.div
                  key="data"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white/5 rounded-xl border border-white/10 p-6"
                >
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">Phase Data Requirements</h2>
                    <p className="text-sm text-white/50">
                      Configure the data fields required or optional for {selectedPhase.display_name}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {phaseData[selectedPhase.id]?.length > 0 ? (
                      phaseData[selectedPhase.id].map((field) => (
                        <div
                          key={field.id}
                          className="p-4 bg-white/5 rounded-lg border border-white/10"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium">{field.name}</span>
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                  field.required
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    : 'bg-green-500/20 text-green-400 border border-green-500/30'
                                }`}>
                                  {field.required ? 'Required' : 'Optional'}
                                </span>
                                <span className="px-2 py-0.5 text-xs rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">
                                  {field.data_type}
                                </span>
                              </div>
                              <p className="text-sm text-white/60">{field.description}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-white/40">
                        <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No data fields configured for this phase</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Visualization Tab */}
              {activeTab === 'visualization' && (
                <motion.div
                  key="visualization"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white/5 rounded-xl border border-white/10 p-6"
                >
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-2">Workflow Overview</h2>
                    <p className="text-sm text-white/50">
                      Complete therapy session flow with phase requirements and statistics
                    </p>
                  </div>

                  {/* Stats Overview */}
                  <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="text-2xl font-bold text-violet-400">{phases.length}</div>
                      <div className="text-xs text-white/50 mt-1">Total Phases</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="text-2xl font-bold text-green-400">
                        {Object.keys(prompts).length}
                      </div>
                      <div className="text-xs text-white/50 mt-1">Prompts Configured</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="text-2xl font-bold text-blue-400">
                        {phases.reduce((sum, p) => sum + (p.minimum_turns || 0), 0)}
                      </div>
                      <div className="text-xs text-white/50 mt-1">Total Min Turns</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="text-2xl font-bold text-amber-400">
                        {Math.round(phases.reduce((sum, p) => sum + (p.recommended_duration_seconds || 0), 0) / 60)}m
                      </div>
                      <div className="text-xs text-white/50 mt-1">Est. Duration</div>
                    </div>
                  </div>

                  {/* Visual Flow */}
                  <div className="relative">
                    {/* Connection Line */}
                    <div className="absolute left-12 top-0 bottom-0 w-0.5 bg-gradient-to-b from-violet-500/20 via-blue-500/20 to-green-500/20" />

                    <div className="space-y-6">
                      {phases.map((phase, index) => {
                        const hasPrompt = !!prompts[phase.id];
                        const hasData = (phaseData[phase.id]?.length || 0) > 0;
                        const requiredFields = phaseData[phase.id]?.filter(d => d.required).length || 0;
                        const optionalFields = phaseData[phase.id]?.filter(d => !d.required).length || 0;

                        return (
                          <div key={phase.id} className="flex items-start gap-4 relative">
                            {/* Phase Number/Icon */}
                            <div
                              className="w-24 h-24 rounded-2xl flex flex-col items-center justify-center backdrop-blur-sm border-2 relative z-10"
                              style={{
                                background: phase.color
                                  ? `linear-gradient(135deg, ${phase.color}30 0%, ${phase.color}10 100%)`
                                  : 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                                borderColor: phase.color || 'rgba(255,255,255,0.2)'
                              }}
                            >
                              <PhaseIcon
                                icon={phase.icon || ''}
                                className="w-8 h-8 mb-1"
                              />
                              <div className="text-xs font-medium text-white/70">Phase {index + 1}</div>
                            </div>

                            {/* Phase Details Card */}
                            <div className="flex-1 bg-white/5 rounded-xl border border-white/10 p-5">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <h3 className="font-semibold text-lg" style={{ color: phase.color || 'white' }}>
                                    {phase.display_name}
                                  </h3>
                                  <p className="text-sm text-white/60 mt-1">{phase.description}</p>
                                </div>

                                {/* Status Indicators */}
                                <div className="flex gap-2">
                                  {hasPrompt && (
                                    <div className="w-8 h-8 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center" title="Prompt configured">
                                      <FileText className="w-4 h-4 text-green-400" />
                                    </div>
                                  )}
                                  {hasData && (
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center" title="Has data fields">
                                      <Database className="w-4 h-4 text-blue-400" />
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Phase Requirements Grid */}
                              <div className="grid grid-cols-4 gap-3 text-xs">
                                {(phase.minimum_turns ?? 0) > 0 && (
                                  <div className="bg-white/5 rounded-lg px-3 py-2 flex items-center gap-2">
                                    <MessageSquare className="w-3.5 h-3.5 text-violet-400" />
                                    <span className="text-white/70">{phase.minimum_turns} min turns</span>
                                  </div>
                                )}
                                {(phase.recommended_duration_seconds ?? 0) > 0 && (
                                  <div className="bg-white/5 rounded-lg px-3 py-2 flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                                    <span className="text-white/70">{Math.round((phase.recommended_duration_seconds ?? 0) / 60)}m duration</span>
                                  </div>
                                )}
                                {requiredFields > 0 && (
                                  <div className="bg-white/5 rounded-lg px-3 py-2 flex items-center gap-2">
                                    <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                                    <span className="text-white/70">{requiredFields} required</span>
                                  </div>
                                )}
                                {optionalFields > 0 && (
                                  <div className="bg-white/5 rounded-lg px-3 py-2 flex items-center gap-2">
                                    <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                                    <span className="text-white/70">{optionalFields} optional</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Completion Indicator for last phase */}
                            {index === phases.length - 1 && (
                              <div className="absolute -bottom-16 left-12 transform -translate-x-1/2">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500/30 to-green-600/20 border-2 border-green-500/50 flex items-center justify-center">
                                  <CheckCircle className="w-8 h-8 text-green-400" />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Prompt History Modal */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 z-50"
              onClick={() => setShowHistory(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-gray-900 rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold">Prompt Version History</h3>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-2 hover:bg-white/5 rounded-lg"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  {promptHistory.map((version) => (
                    <div
                      key={version.id}
                      className="p-4 bg-white/5 rounded-lg border border-white/10"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="font-medium">Version {version.version}</span>
                          <span className="text-sm text-white/50">
                            {new Date(version.created_at).toLocaleString()}
                          </span>
                          {version.created_by && (
                            <span className="text-sm text-white/50">
                              by {version.created_by}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => revertToVersion(version.id)}
                          className="px-3 py-1 text-sm bg-violet-500 hover:bg-violet-600 rounded-lg flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Revert
                        </button>
                      </div>
                      <pre className="text-sm text-white/70 whitespace-pre-wrap font-mono">
                        {version.content.substring(0, 200)}...
                      </pre>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};