import React, { useState, useEffect } from 'react';
import { apiUrl } from '../../config/api';
import { fetchWithAuth } from '../../utils/auth-interceptor';

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
      const response = await fetchWithAuth(apiUrl(`/api/sessions/${sessionId}/prompts`));
      if (response.ok) {
        const data = await response.json();
        setPrompts(data);
      }
    } catch (error) {
      console.error('Failed to fetch prompt logs:', error);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-3 bg-black/30 font-mono text-xs">
      <div className="text-white/80 mb-4 border-b border-white/10 pb-2">
        <div className="text-sm font-bold">PROMPT EXPLORER</div>
        <div className="text-white/50 text-xs">Session: {sessionId.slice(0, 8)}...</div>
      </div>

      <div className="space-y-6">
        {prompts.map((log, index) => (
          <div key={index} className="border-l-2 border-white/10 pl-3">
            <div className="text-white/40 mb-2 text-xs">
              {new Date(log.timestamp).toLocaleTimeString()} • {log.phase} • {log.turn_type}
            </div>

            {/* Show user message if present */}
            {log.turn_type === 'REQUEST' && log.user_message && (
              <div className="mb-3 text-blue-300/80 bg-blue-500/5 p-2 rounded border border-blue-500/20">
                USER: {log.user_message}
              </div>
            )}

            {/* Show the RAW PROMPT prominently */}
            {log.turn_type === 'REQUEST' && log.prompt && (
              <div className="mb-3">
                <div className="text-white/60 mb-1 font-bold">RAW PROMPT SENT TO AI:</div>
                <pre className="p-3 bg-black/50 border border-white/10 rounded text-white/70 overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed">
{log.prompt}
                </pre>
              </div>
            )}

            {/* Show AI response compactly */}
            {log.turn_type === 'RESPONSE' && (
              <div className="text-green-300/80 bg-green-500/5 p-2 rounded border border-green-500/20">
                <div className="text-xs text-green-400/60 mb-1">
                  AI ({log.token_total || 0} tokens{log.function_calls?.length ? `, ${log.function_calls.length} tools` : ''})
                </div>
                <div className="whitespace-pre-wrap">{log.response_text}</div>

                {log.function_calls && log.function_calls.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-amber-400/60">Tools</summary>
                    <pre className="text-xs mt-1 text-amber-300/60">{JSON.stringify(log.function_calls, null, 2)}</pre>
                  </details>
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