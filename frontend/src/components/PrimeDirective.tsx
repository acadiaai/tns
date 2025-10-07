import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Save, History, RefreshCw, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { apiUrl } from '../config/api';
import { fetchWithAuth } from '../utils/auth-interceptor';

interface SystemPrompt {
  id: string;
  name: string;
  description: string;
  content: string;
  version: number;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const PrimeDirective: React.FC = () => {
  const [systemPrompt, setSystemPrompt] = useState<SystemPrompt | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSystemPrompt();
  }, []);

  useEffect(() => {
    if (systemPrompt) {
      const contentChanged = editedContent !== systemPrompt.content;
      const descriptionChanged = editedDescription !== systemPrompt.description;
      setHasChanges(contentChanged || descriptionChanged);
    }
  }, [editedContent, editedDescription, systemPrompt]);

  const loadSystemPrompt = async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(apiUrl('/api/system-prompt'));

      if (response.ok) {
        const data = await response.json();
        setSystemPrompt(data);
        setEditedContent(data.content || '');
        setEditedDescription(data.description || '');
      }
    } catch (error) {
      console.error('Failed to load system prompt:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSystemPrompt = async () => {
    if (!hasChanges) return;

    try {
      setSaving(true);
      const response = await fetchWithAuth(apiUrl('/api/system-prompt'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editedContent,
          description: editedDescription,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setSystemPrompt(updated);
        setEditedContent(updated.content || '');
        setEditedDescription(updated.description || '');
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save system prompt:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-900/50 via-slate-800/30 to-slate-900/50">
      {/* Header */}
      <div className="border-b border-white/[0.05] bg-white/[0.02] backdrop-blur-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-xl border border-violet-500/30">
              <Shield className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-light text-white/90">Prime Directive</h1>
              <p className="text-sm text-white/60 mt-1">
                Core system behavior and therapeutic principles
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-300">Saved successfully</span>
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={loadSystemPrompt}
              disabled={saving}
              className="px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white/80 hover:text-white/90 hover:bg-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
              <span className="text-sm">Reload</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={saveSystemPrompt}
              disabled={!hasChanges || saving}
              className="px-4 py-2 bg-gradient-to-r from-violet-500/80 to-purple-500/80 hover:from-violet-500 hover:to-purple-500 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span className="text-sm">{saving ? 'Saving...' : 'Save Changes'}</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Metadata Card */}
        {systemPrompt && (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl backdrop-blur-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-white/60" />
              <h2 className="text-lg font-medium text-white/90">Metadata</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-white/50">Version:</span>
                <span className="ml-2 text-white/80">{systemPrompt.version}</span>
              </div>
              <div>
                <span className="text-white/50">Status:</span>
                <span className={`ml-2 ${systemPrompt.is_active ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {systemPrompt.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <span className="text-white/50">Created:</span>
                <span className="ml-2 text-white/80">
                  {new Date(systemPrompt.created_at).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-white/50">Last Updated:</span>
                <span className="ml-2 text-white/80">
                  {new Date(systemPrompt.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Description Editor */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl backdrop-blur-xl p-6">
          <label className="block text-sm font-medium text-white/80 mb-3">
            Description
          </label>
          <input
            type="text"
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            placeholder="Brief description of this system prompt..."
            className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white/90 placeholder-white/40 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.05] transition-colors"
          />
        </div>

        {/* Content Editor */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl backdrop-blur-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-white/80">
              System Prompt Content
            </label>
            <div className="flex items-center gap-2 text-xs text-white/50">
              <AlertCircle className="w-4 h-4" />
              <span>Changes will affect all future sessions</span>
            </div>
          </div>
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            rows={20}
            placeholder="Enter your system prompt here..."
            className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white/90 placeholder-white/40 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.05] transition-colors font-mono text-sm leading-relaxed resize-none"
          />
          <div className="mt-3 flex items-center justify-between text-xs text-white/50">
            <span>{editedContent.length} characters</span>
            <span>{editedContent.split('\n').length} lines</span>
          </div>
        </div>

        {/* Future: Version History */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl backdrop-blur-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <History className="w-5 h-5 text-white/60" />
            <h2 className="text-lg font-medium text-white/90">Version History</h2>
          </div>
          <p className="text-sm text-white/50">Version history coming soon...</p>
        </div>
      </div>
    </div>
  );
};
