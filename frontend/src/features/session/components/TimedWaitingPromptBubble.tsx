import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Play } from 'lucide-react';

interface TimedWaitingPromptBubbleProps {
  phaseName: string;
  message: string;
  durationSeconds: number;
  visualizationType?: string;
  onBegin: () => void;
}

export const TimedWaitingPromptBubble: React.FC<TimedWaitingPromptBubbleProps> = ({
  phaseName,
  message,
  durationSeconds,
  onBegin,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-center my-4"
    >
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg overflow-hidden w-full max-w-[600px] transition-all duration-200">
        <div
          className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-purple-500/20 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Clock className="w-4 h-4 text-purple-400" />
          <span className="font-mono text-slate-300 text-sm">{phaseName}</span>
          <span className="text-xs ml-auto text-purple-400">
            {formatDuration(durationSeconds)}
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
          <div className="px-4 pb-4 border-t border-purple-500/10">
            {/* Message */}
            <div className="mb-4 mt-3">
              <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                {message}
              </div>
            </div>

            {/* Begin Button */}
            <button
              onClick={onBegin}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-lg text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Play className="w-4 h-4" />
              Begin ({formatDuration(durationSeconds)})
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
