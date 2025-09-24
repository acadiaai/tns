import React, { useEffect, useState } from 'react';
import { apiUrl } from '../../../config/api';
import { fetchWithAuth } from '../../../utils/auth-interceptor';

interface PromptSidebarProps {
  currentPhase: string;
  sessionId: string;
  className?: string;
}

type ComposedPrompt = {
  base: string;
  phase_templates: string[];
  therapist_addendum: string;
  variables: Record<string, string>;
  awareness: Record<string, any>;
  memory: string[];
  composed_preview: string;
};

export const PromptSidebar: React.FC<PromptSidebarProps> = ({ currentPhase, sessionId, className = '' }) => {
  const [data, setData] = useState<ComposedPrompt | null>(null);
  const [systemDisplay, setSystemDisplay] = useState(''); // resolved for editing
  const [systemId, setSystemId] = useState<string | null>(null);
  const [phaseDisplay, setPhaseDisplay] = useState('');   // resolved for editing
  const [constructed, setConstructed] = useState('');
  const [tokenReport, setTokenReport] = useState<{ sections?: Record<string, number>; total?: number; prompt_hash?: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [sysHasChanges, setSysHasChanges] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadComposedPrompt();
    loadSystemPrompt();
  }, [currentPhase, sessionId]);

  const resolveVariables = (text: string): string => {
    if (!text) return '';
    let out = text;
    const vars = (data?.variables || {}) as Record<string, string>;
    Object.entries(vars).forEach(([k, v]) => {
      const re = new RegExp(`\\{\\{${k}\\}\\}`, 'g');
      out = out.replace(re, v ?? '');
    });
    // strip any remaining {{...}}
    out = out.replace(/\{\{[^}]+\}\}/g, '');
    return out;
  };

  const restoreVariables = (text: string): string => {
    if (!text) return '';
    let out = text;
    const vars = (data?.variables || {}) as Record<string, string>;
    // Replace concrete values back to tokens
    Object.entries(vars).forEach(([k, v]) => {
      if (!v) return;
      const re = new RegExp(v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      out = out.replace(re, `{{${k}}}`);
    });
    return out;
  };

  const loadComposedPrompt = async () => {
    try {
      const res = await fetchWithAuth(apiUrl(`/api/prompts/compose/${sessionId}?phase=${encodeURIComponent(currentPhase)}`));
      if (!res.ok) throw new Error(`Failed to load composed prompt: ${res.status}`);
      const json: ComposedPrompt = await res.json();
      setData(json);
      // Use phase_templates as the editable content (not therapist_addendum)
      const rawPhase = (json.phase_templates && json.phase_templates.length > 0) 
        ? json.phase_templates.join('\n- ') 
        : json.therapist_addendum || '';
      setPhaseDisplay(resolveVariables(rawPhase));
      setHasChanges(false);

      const cRes = await fetchWithAuth(apiUrl(`/api/sessions/${sessionId}/context/last`));
      if (cRes.ok) {
        const cJson = await cRes.json();
        setConstructed(cJson.constructed_prompt || '');
        setTokenReport({ ...(cJson.token_report || {}), prompt_hash: cJson.prompt_hash });
      }
    } catch {
      setData(null);
    }
  };

  const loadSystemPrompt = async () => {
    try {
      const res = await fetchWithAuth(apiUrl(`/api/prompts?active=true`));
      if (!res.ok) return;
      const arr = await res.json();
      if (Array.isArray(arr)) {
        const rows = arr
          .map((p: any) => p?.Prompt || p)
          .filter((p: any) => p?.is_system === true && p?.is_active === true);
        const preferred = rows.filter((p: any) => p?.usage_context === 'system_policy');
        const pick = (preferred.length > 0 ? preferred : rows).sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        if (pick.length > 0) {
          const latest = pick[0];
          setSystemId(latest.id);
          const raw = latest.content || '';
          setSystemDisplay(resolveVariables(raw));
          setSysHasChanges(false);
        }
      }
    } catch {}
  };

  const handleSaveSystem = async () => {
    if (!sysHasChanges || !systemId) return;
    setIsSaving(true);
    try {
      const toSaveRaw = restoreVariables(systemDisplay);
      const getRes = await fetchWithAuth(apiUrl(`/api/prompts/${systemId}`));
      if (!getRes.ok) throw new Error('Failed to load system prompt');
      const pr = await getRes.json();
      const req = {
        name: pr.name || 'System Prompt',
        description: pr.description || 'Global system prompt',
        category: pr.category || 'therapeutic_response',
        content: toSaveRaw,
        variables: pr.variables ? JSON.parse(pr.variables) : [],
        workflow_phase: pr.workflow_phase || '',
        is_system: true,
        updated_by: 'frontend',
        create_new_version: true,
      };
      const putRes = await fetchWithAuth(apiUrl(`/api/prompts/${systemId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (!putRes.ok) throw new Error('Failed to save system prompt');
      setSysHasChanges(false);
      await loadComposedPrompt();
    } catch {
      // swallow
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePhase = async () => {
    if (!hasChanges) return;
    setIsSaving(true);
    try {
      const toSaveRaw = restoreVariables(phaseDisplay);
      const res = await fetchWithAuth(apiUrl(`/api/prompts/compose/global?phase=${encodeURIComponent(currentPhase)}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ therapist_addendum: toSaveRaw, updated_by: 'frontend', create_new_version: true })
      });
      if (!res.ok) throw new Error(`Failed to save addendum: ${res.status}`);
      await loadComposedPrompt();
      setHasChanges(false);
    } catch {
      // swallow
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`w-96 bg-black/40 border-l border-white/10 p-6 flex flex-col ${className}`}>
      <div className="mb-4">
        <h3 className="text-white/80 font-medium">Active Prompt</h3>
        <p className="text-sm text-white/50 mt-1">Phase: {currentPhase}</p>
      </div>

      {data ? (
        <>
          <div className="flex-1 flex flex-col">
            {/* Global System Prompt */}
            <div className="mb-2 text-xs text-white/50">System Prompt (editable, global)</div>
            <textarea
              value={systemDisplay}
              onChange={(e) => { setSystemDisplay(e.target.value); setSysHasChanges(true); }}
              className="w-full h-28 bg-white/5 border border-white/20 rounded p-3 text-white/80 text-sm font-mono whitespace-pre-wrap"
              placeholder="Edit the global system prompt..."
            />
            <div className="flex justify-end mt-2 mb-2">
              <button
                onClick={handleSaveSystem}
                disabled={!sysHasChanges || isSaving}
                className={`px-3 py-1 rounded text-xs ${sysHasChanges ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300' : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'}`}
              >
                {isSaving ? 'Saving…' : sysHasChanges ? 'Save System' : 'No Changes'}
              </button>
            </div>
            <div className="mb-6 bg-white/5 border border-white/10 rounded p-3 text-white/70 text-xs whitespace-pre-wrap">
              <div className="text-[10px] text-white/40 mb-1">Preview (resolved)</div>
              {resolveVariables(systemDisplay)}
            </div>

            {/* Global Phase Prompt (Addendum) */}
            <div className="mb-2 text-xs text-white/50">Phase System Prompt (editable, global)</div>
            <textarea
              value={phaseDisplay}
              onChange={(e) => { setPhaseDisplay(e.target.value); setHasChanges(true); }}
              className="flex-1 w-full bg-white/5 border border-white/20 rounded p-4 text-white/90 font-mono text-sm resize-none focus:outline-none focus:border-white/30"
              placeholder="Edit the phase-specific guidance here..."
            />
            <div className="flex justify-end mt-2 mb-2">
              <button
                onClick={handleSavePhase}
                disabled={!hasChanges || isSaving}
                className={`px-3 py-1 rounded text-xs ${hasChanges ? 'bg-blue-500/20 border border-blue-500/30 text-blue-300' : 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'}`}
              >
                {isSaving ? 'Saving…' : hasChanges ? 'Save Phase' : 'No Changes'}
              </button>
            </div>
            <div className="mb-6 bg-white/5 border border-white/10 rounded p-3 text-white/70 text-xs whitespace-pre-wrap">
              <div className="text-[10px] text-white/40 mb-1">Preview (resolved)</div>
              {resolveVariables(phaseDisplay)}
            </div>

            {/* Constructed Prompt */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-white/50">Constructed Prompt (last turn)</div>
                <div className="text-[10px] text-white/40 flex items-center gap-3">
                  {typeof tokenReport.total === 'number' ? `~${tokenReport.total} toks` : ''}
                  {tokenReport.sections && (
                    <span className="text-white/40">
                      {Object.entries(tokenReport.sections).map(([k,v]) => `${k}:${v}`).join('  ')}
                    </span>
                  )}
                </div>
              </div>
              {tokenReport.prompt_hash && (
                <div className="text-[10px] text-white/30 mb-1">hash: {tokenReport.prompt_hash.slice(0,12)}…</div>
              )}
              <pre className="max-h-60 overflow-auto whitespace-pre-wrap bg-white/5 border border-white/10 rounded p-3 text-white/80 text-xs">{constructed || data.composed_preview}</pre>
            </div>

            {/* Complete Prompt with History - Scrollable Deep View */}
            <div className="mt-6">
              <details className="group">
                <summary className="cursor-pointer text-white/70 text-sm font-medium p-2 bg-white/5 rounded hover:bg-white/10 transition-colors">
                  📋 Complete Prompt with Full History 
                  <span className="text-white/40 text-xs ml-2">(Gemini CLI style inspection)</span>
                </summary>
                
                <div className="mt-2 border border-white/10 rounded bg-black/30">
                  {/* Token Breakdown Header */}
                  <div className="p-3 border-b border-white/10 bg-white/5">
                    <div className="text-xs text-white/60 space-y-1">
                      <div className="flex justify-between">
                        <span>Total Context:</span>
                        <span className="text-green-300">{tokenReport.total} tokens</span>
                      </div>
                      {tokenReport.sections && Object.entries(tokenReport.sections).map(([section, tokens]) => (
                        <div key={section} className="flex justify-between">
                          <span className="text-blue-300">{section}:</span>
                          <span>{tokens} tok</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Full Prompt - Can Scroll REALLY Low */}
                  <div className="max-h-[80vh] overflow-y-auto">
                    <pre className="p-4 text-xs text-white/70 whitespace-pre-wrap leading-relaxed">
                      {constructed || 'Loading complete prompt...'}
                    </pre>
                  </div>
                  
                  {/* Hash for Debugging */}
                  {tokenReport.prompt_hash && (
                    <div className="p-2 border-t border-white/10 text-xs text-white/30 font-mono">
                      Hash: {tokenReport.prompt_hash}
                    </div>
                  )}
                </div>
              </details>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-white/40">
          <p className="text-sm">No composed prompt available</p>
        </div>
      )}
    </div>
  );
};


