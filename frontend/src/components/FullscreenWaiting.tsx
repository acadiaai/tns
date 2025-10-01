import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pause, Play } from 'lucide-react';

interface FullscreenWaitingProps {
  isVisible: boolean;
  onComplete: () => void;
  onClose: () => void;
  durationSeconds: number;
  visualizationType?: string;
}

export const FullscreenWaiting: React.FC<FullscreenWaitingProps> = ({
  isVisible,
  onComplete,
  onClose,
  durationSeconds,
  visualizationType = 'breathing_circle',
}) => {
  const [timeRemaining, setTimeRemaining] = useState(durationSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-start timer when visible
  useEffect(() => {
    if (isVisible && !startTimeRef.current) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        if (!isPaused && startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current - pausedTimeRef.current) / 1000);
          const remaining = Math.max(0, durationSeconds - elapsed);

          setTimeRemaining(remaining);

          if (remaining === 0) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
            }
            setTimeout(() => {
              onComplete();
            }, 1000);
          }
        }
      }, 1000);
    }
  }, [isVisible, isPaused, durationSeconds, onComplete]);

  const togglePause = () => {
    if (isPaused) {
      // Resume
      pausedTimeRef.current += Date.now() - (startTimeRef.current || 0);
      startTimeRef.current = Date.now();
      setIsPaused(false);
    } else {
      // Pause
      setIsPaused(true);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  // Cleanup timer on unmount or visibility change
  useEffect(() => {
    if (!isVisible && timerRef.current) {
      clearInterval(timerRef.current);
      setTimeRemaining(durationSeconds);
      setIsPaused(false);
      startTimeRef.current = null;
      pausedTimeRef.current = 0;
    }
  }, [isVisible, durationSeconds]);

  const renderVisualization = () => {
    switch (visualizationType) {
      case 'flowing_lines':
        return <FlowingLines isPaused={isPaused} />;
      case 'breathing_circle':
        return <BreathingCircle isPaused={isPaused} />;
      case 'ocean_waves':
        return <OceanWaves isPaused={isPaused} />;
      case 'forest_sounds':
        return <ForestAmbiance isPaused={isPaused} />;
      case 'mountain_view':
        return <MountainView isPaused={isPaused} />;
      case 'starfield':
        return <Starfield isPaused={isPaused} />;
      default:
        return <FlowingLines isPaused={isPaused} />;
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        style={{ height: '100vh', width: '100vw' }}
      >
        {/* Background Visualization */}
        <div className="absolute inset-0">
          {renderVisualization()}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-10 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/60 hover:text-white transition-all backdrop-blur-xl"
        >
          <X size={20} />
        </button>

        {/* Timer Overlay */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-10"
        >
          <div className="flex flex-col items-center space-y-4">
            {/* Timer Display */}
            <div className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
              <div className="text-5xl font-light text-white/90 font-mono tracking-wider">
                {formatTime(timeRemaining)}
              </div>
            </div>

            {/* Pause Button */}
            <button
              onClick={togglePause}
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/60 hover:text-white transition-all backdrop-blur-xl"
              aria-label={isPaused ? "Resume" : "Pause"}
            >
              {isPaused ? <Play size={18} /> : <Pause size={18} />}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Visualization Components

// Apple-style flowing lines - vivid, animated, calming with curved paths
const FlowingLines: React.FC<{ isPaused: boolean }> = ({ isPaused }) => {
  const lines = [
    { color: 'from-pink-600 via-rose-500 to-orange-500', delay: 0, duration: 12, yPath: [15, 10, 20, 15] },
    { color: 'from-blue-600 via-cyan-500 to-teal-500', delay: 1.5, duration: 14, yPath: [30, 35, 25, 30] },
    { color: 'from-purple-600 via-violet-500 to-fuchsia-500', delay: 3, duration: 13, yPath: [45, 50, 40, 45] },
    { color: 'from-green-600 via-emerald-500 to-lime-500', delay: 4.5, duration: 15, yPath: [60, 55, 65, 60] },
    { color: 'from-yellow-500 via-amber-500 to-orange-500', delay: 6, duration: 11, yPath: [75, 80, 70, 75] },
  ];

  return (
    <div className="absolute inset-0 bg-black overflow-hidden">
      {lines.map((line, i) => (
        <motion.div
          key={i}
          className={`absolute h-2 bg-gradient-to-r ${line.color} rounded-full blur-md`}
          style={{
            width: '50%',
            left: '-25%',
            opacity: 0.9,
          }}
          animate={isPaused ? {} : {
            x: ['0%', '350%'],
            y: line.yPath.map(y => `${y}vh`),
            scaleX: [1, 1.8, 1.2, 1.5, 1],
            scaleY: [1, 1.3, 0.8, 1.2, 1],
            opacity: [0, 0.95, 0.85, 0.9, 0],
          }}
          transition={{
            duration: line.duration,
            repeat: Infinity,
            delay: line.delay,
            ease: "easeInOut"
          }}
        />
      ))}

      {/* Additional vivid ambient glow */}
      <motion.div
        className="absolute inset-0 bg-gradient-radial from-purple-600/15 via-transparent to-transparent"
        animate={isPaused ? {} : {
          opacity: [0.4, 0.6, 0.4],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  );
};

const BreathingCircle: React.FC<{ isPaused: boolean }> = ({ isPaused }) => (
  <div className="flex items-center justify-center h-full">
    <motion.div
      className="w-64 h-64 md:w-80 md:h-80 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 backdrop-blur-sm border border-white/10"
      animate={isPaused ? {} : {
        scale: [1, 1.2, 1],
        opacity: [0.6, 0.8, 0.6]
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  </div>
);

const OceanWaves: React.FC<{ isPaused: boolean }> = ({ isPaused }) => (
  <div className="absolute inset-0 bg-gradient-to-b from-blue-900/30 to-blue-600/30">
    <motion.div
      className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-blue-400/40 to-transparent"
      animate={isPaused ? {} : {
        scaleY: [1, 1.1, 0.9, 1],
        opacity: [0.4, 0.6, 0.4]
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  </div>
);

const ForestAmbiance: React.FC<{ isPaused: boolean }> = ({ isPaused }) => (
  <div className="absolute inset-0 bg-gradient-to-b from-green-900/30 to-green-700/30">
    <motion.div
      className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_40%,_rgba(34,197,94,0.1)_70%)]"
      animate={isPaused ? {} : {
        opacity: [0.3, 0.5, 0.3]
      }}
      transition={{
        duration: 6,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  </div>
);

const MountainView: React.FC<{ isPaused: boolean }> = () => (
  <div className="absolute inset-0 bg-gradient-to-b from-slate-800/30 to-slate-600/30">
    <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-slate-700/40 via-slate-600/20 to-transparent" />
  </div>
);

const Starfield: React.FC<{ isPaused: boolean }> = ({ isPaused }) => (
  <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/30 to-purple-900/30">
    {[...Array(50)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 bg-white rounded-full"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
        }}
        animate={isPaused ? {} : {
          opacity: [0.3, 1, 0.3]
        }}
        transition={{
          duration: Math.random() * 3 + 2,
          repeat: Infinity,
          delay: Math.random() * 2
        }}
      />
    ))}
  </div>
);

export default FullscreenWaiting;