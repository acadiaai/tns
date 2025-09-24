import React, { useEffect, useState } from 'react';
import { Eye, FileText, Layout, Copy, Check } from 'lucide-react';
import { apiUrl } from '../../../config/api';
import { fetchWithAuth } from '../../../utils/auth-interceptor';

interface PromptInspectorProps {
  currentPhase: string;
  sessionId: string;
}

interface PromptContext {
  constructed_prompt: string;
  token_report: {
    sections: Record<string, number>;
    total: number;
    hash: string;
  };
  sections: {
    system: string;
    phase: string;
    awareness: string;
    working_memory: string;
    retrieved_context: string;
    tools: string;
  };
}

type ViewMode = 'raw' | 'structured';

export const PromptInspector: React.FC<PromptInspectorProps> = ({ currentPhase, sessionId }) => {
  const [context, setContext] = useState<PromptContext | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('raw');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastPrompt, setLastPrompt] = useState<string>('');

  useEffect(() => {
    loadPromptContext();
    // Also load from prompts.txt file
    loadRawPromptLog();
  }, [currentPhase, sessionId]);

  const loadPromptContext = async () => {
    try {
      const response = await fetchWithAuth(apiUrl(`/api/sessions/${sessionId}/context`));
      const data = await response.json();
      setContext(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load prompt context:', error);
      setLoading(false);
    }
  };

  const loadRawPromptLog = async () => {
    try {
      // Try to fetch the latest prompt from backend logs endpoint
      const response = await fetchWithAuth(apiUrl(`/api/sessions/${sessionId}/latest-prompt`));
      if (response.ok) {
        const text = await response.text();
        setLastPrompt(text);
      }
    } catch (error) {
      // Fallback to context constructed prompt
      console.log('Using context prompt as fallback');
    }
  };

  const copyToClipboard = () => {
    const textToCopy = viewMode === 'raw'
      ? (lastPrompt || context?.constructed_prompt || '')
      : JSON.stringify(context?.sections, null, 2);

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSectionColor = (section: string): string => {
    const colors: Record<string, string> = {
      system: 'text-blue-300',
      phase: 'text-green-300',
      awareness: 'text-yellow-300',
      working_memory: 'text-purple-300',
      retrieved_context: 'text-orange-300',
      tools: 'text-cyan-300'
    };
    return colors[section] || 'text-gray-300';
  };

  if (loading) {
    return (
      <div className="w-full bg-slate-900/50 border-l border-white/10 p-4">
        <div className="text-white/60">Loading prompt context...</div>
      </div>
    );
  }

  const displayPrompt = lastPrompt || context?.constructed_prompt || 'No prompt available';

  return (
    <div className="w-full bg-slate-900/50 border-l border-white/10 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-400" />
            <h3 className="text-white font-medium">Prompt Inspector</h3>
          </div>
          <button
            onClick={copyToClipboard}
            className="p-1 hover:bg-white/10 rounded transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-white/60" />
            )}
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-1 p-1 bg-black/30 rounded">
          <button
            onClick={() => setViewMode('raw')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-1 rounded transition-colors ${
              viewMode === 'raw'
                ? 'bg-blue-500/20 text-blue-300'
                : 'text-white/60 hover:bg-white/5'
            }`}
          >
            <FileText className="w-3 h-3" />
            <span className="text-xs font-medium">Raw</span>
          </button>
          <button
            onClick={() => setViewMode('structured')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-1 rounded transition-colors ${
              viewMode === 'structured'
                ? 'bg-blue-500/20 text-blue-300'
                : 'text-white/60 hover:bg-white/5'
            }`}
          >
            <Layout className="w-3 h-3" />
            <span className="text-xs font-medium">Structured</span>
          </button>
        </div>

        {/* Token Info */}
        {context && (
          <div className="text-xs text-white/60 mt-2">
            Phase: <span className="text-blue-300">{currentPhase}</span> •
            Total: <span className="text-green-300">{context.token_report.total} tokens</span>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {viewMode === 'raw' ? (
          // Raw Text View
          <div className="bg-black/40 rounded p-3">
            <pre className="text-xs text-white/80 whitespace-pre-wrap font-mono">
              {displayPrompt}
            </pre>
          </div>
        ) : (
          // Structured View
          <div className="space-y-3">
            {context?.sections && Object.entries(context.sections).map(([section, content]) => (
              <div key={section} className="bg-black/40 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`text-sm font-medium capitalize ${getSectionColor(section)}`}>
                    {section.replace(/_/g, ' ')}
                  </h4>
                  <span className="text-xs text-white/40">
                    {context.token_report.sections[section] || 0} tokens
                  </span>
                </div>
                <pre className="text-xs text-white/60 whitespace-pre-wrap font-mono">
                  {content || 'No content'}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};