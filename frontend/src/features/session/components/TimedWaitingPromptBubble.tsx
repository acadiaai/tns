import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Play, CheckCircle } from 'lucide-react';

interface TimedWaitingPromptBubbleProps {
  phaseName: string;
  durationSeconds: number;
  visualizationType?: string;
  onBegin: () => void;
  status?: 'not_started' | 'in_progress' | 'completed';
  elapsedSeconds?: number;
}

export const TimedWaitingPromptBubble: React.FC<TimedWaitingPromptBubbleProps> = ({
  phaseName,
  durationSeconds,
  onBegin,
  status = 'not_started',
  elapsedSeconds = 0,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
  };

  // Don't show bubble when timer is running (in fullscreen mode)
  if (status === 'in_progress') {
    return null;
  }

  const isCompleted = status === 'completed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-center my-4"
    >
      <div className={`border rounded-lg overflow-hidden w-full max-w-[600px] transition-all duration-200 ${
        isCompleted
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-purple-500/10 border-purple-500/30'
      }`}>
        <div
          className={`flex items-center gap-2 px-4 py-3 cursor-pointer transition-colors ${
            isCompleted
              ? 'hover:bg-green-500/20'
              : 'hover:bg-purple-500/20'
          }`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isCompleted ? (
            <CheckCircle className="w-4 h-4 text-green-400" />
          ) : (
            <Clock className="w-4 h-4 text-purple-400" />
          )}
          <span className="font-mono text-slate-300 text-sm">{phaseName}</span>
          <span className={`text-xs ml-auto ${isCompleted ? 'text-green-400' : 'text-purple-400'}`}>
            {isCompleted ? (
              <>Completed • {formatDuration(elapsedSeconds)}</>
            ) : (
              formatDuration(durationSeconds)
            )}
          </span>
          <span className={`text-slate-400 text-xs ml-1 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>

        {/* Expandable content */}
        <motion.div
          initial={{ height: 'auto', opacity: 1 }}
          animate={{
            height: isExpanded ? 'auto' : 0,
            opacity: isExpanded ? 1 : 0
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="overflow-hidden"
        >
          <div className={`px-4 pb-4 border-t ${
            isCompleted ? 'border-green-500/10' : 'border-purple-500/10'
          }`}>
            {/* Begin Button - only show for not_started */}
            {!isCompleted && (
              <button
                onClick={onBegin}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 mt-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-lg text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Play className="w-4 h-4" />
                Begin ({formatDuration(durationSeconds)})
              </button>
            )}

            {/* Completion message */}
            {isCompleted && (
              <div className="mt-3 text-sm text-green-300/80">
                Mindfulness period completed. Time spent: {formatDuration(elapsedSeconds)}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
