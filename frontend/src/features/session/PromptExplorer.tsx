import React, { useState, useEffect } from 'react';
import { apiUrl } from '../../config/api';

interface PromptLog {
  timestamp: string;
  phase: string;
  turn_type: 'REQUEST' | 'RESPONSE';
  user_message?: string;
  response_text?: string;
  token_total?: number;
  function_calls?: any[];
  prompt?: string; // Full prompt sent to the AI
}

export const PromptExplorer: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const [prompts, setPrompts] = useState<PromptLog[]>([]);

  useEffect(() => {
    fetchPromptLogs();
    const interval = setInterval(fetchPromptLogs, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const fetchPromptLogs = async () => {
    try {
      const response = await fetch(apiUrl(`/api/sessions/${sessionId}/prompts`));
      if (response.ok) {
        const data = await response.json();
        setPrompts(data);
      }
    } catch (error) {
      console.error('Failed to fetch prompt logs:', error);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-3 bg-black/20 font-mono text-xs">
      <div className="text-white/80 mb-4">
        <div className="text-sm font-semibold mb-2">RAW PROMPT LOG</div>
        <div className="text-white/60">Session: {sessionId}</div>
        <div className="text-white/60">Total entries: {prompts.length}</div>
      </div>

      <div className="space-y-4">
        {prompts.map((log, index) => (
          <div key={index} className="border-l-2 border-white/20 pl-4">
            <div className="text-slate-400 mb-1">
              [{log.timestamp}] {log.turn_type} - Phase: {log.phase}
            </div>

            {log.turn_type === 'REQUEST' && log.user_message && (
              <div className="mb-2">
                <div className="text-blue-400/60 mb-1">USER MESSAGE:</div>
                <div className="text-white/70 whitespace-pre-wrap bg-blue-500/10 p-2 rounded">
                  {log.user_message}
                </div>
              </div>
            )}

            {log.turn_type === 'REQUEST' && log.prompt && (
              <details className="mt-2 mb-2">
                <summary className="cursor-pointer text-xs text-white/40 hover:text-white/60">
                  📝 Full Prompt ({log.prompt.length} chars)
                </summary>
                <pre className="mt-2 p-2 bg-black/40 rounded text-xs overflow-x-auto text-white/50 max-h-96 overflow-y-auto">
                  {log.prompt}
                </pre>
              </details>
            )}

            {log.turn_type === 'RESPONSE' && (
              <div className="mb-2">
                <div className="text-green-400/60 mb-1">
                  AI RESPONSE (tokens: {log.token_total || 0}, tools: {log.function_calls?.length || 0}):
                </div>
                <div className="text-white/70 whitespace-pre-wrap bg-green-500/10 p-2 rounded">
                  {log.response_text}
                </div>

                {log.function_calls && log.function_calls.length > 0 && (
                  <div className="mt-2">
                    <div className="text-amber-400/60 mb-1">TOOL CALLS:</div>
                    <div className="text-white/60 bg-amber-500/10 p-2 rounded">
                      <pre>{JSON.stringify(log.function_calls, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {prompts.length === 0 && (
          <div className="text-white/40 text-center py-8">
            No prompt logs yet. Start a conversation to see AI prompts and responses.
          </div>
        )}
      </div>
    </div>
  );
};