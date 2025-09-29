import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pause, Play } from 'lucide-react';

interface FullscreenWaitingProps {
  isVisible: boolean;
  onComplete: () => void;
  onClose: () => void;
  durationSeconds: number;
  visualizationType?: string;
  preWaitMessage?: string;
  postWaitPrompt?: string;
  title?: string;
}

const VISUALIZATION_TYPES = {
  breathing_circle: 'Breathing Circle',
  ocean_waves: 'Ocean Waves',
  forest_sounds: 'Forest Ambiance',
  mountain_view: 'Mountain Vista',
  starfield: 'Starfield',
  minimal: 'Minimal'
};

export const FullscreenWaiting: React.FC<FullscreenWaitingProps> = ({
  isVisible,
  onComplete,
  onClose,
  durationSeconds,
  visualizationType = 'breathing_circle',
  preWaitMessage = "Please take a moment to pause and reflect.",
  postWaitPrompt,
  title = "Focused Time"
}) => {
  const [timeRemaining, setTimeRemaining] = useState(durationSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const [showMessage, setShowMessage] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start the timer
  const startTimer = () => {
    setShowMessage(false);
    setHasStarted(true);
    startTimeRef.current = Date.now();
    runTimer();
  };

  const runTimer = () => {
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
          }, 1000); // Brief pause before completing
        }
      }
    }, 1000);
  };

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
    if (!isVisible) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Reset state
      setTimeRemaining(durationSeconds);
      setIsPaused(false);
      setShowMessage(true);
      setHasStarted(false);
      startTimeRef.current = null;
      pausedTimeRef.current = 0;
    }
  }, [isVisible, durationSeconds]);

  // Update remaining time when duration changes
  useEffect(() => {
    if (!hasStarted) {
      setTimeRemaining(durationSeconds);
    }
  }, [durationSeconds, hasStarted]);

  const progress = ((durationSeconds - timeRemaining) / durationSeconds) * 100;

  const renderVisualization = () => {
    switch (visualizationType) {
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
        return <MinimalVisualization isPaused={isPaused} />;
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
          className="absolute top-6 right-6 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all backdrop-blur-sm"
        >
          <X size={24} />
        </button>

        {/* Main Content */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-2xl px-8">
          {showMessage ? (
            /* Pre-timer Message */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-6"
            >
              <h2 className="text-3xl md:text-4xl font-light text-white/90 leading-relaxed">
                {preWaitMessage}
              </h2>
              <p className="text-lg text-white/70">
                {formatTime(durationSeconds)} of {title.toLowerCase()}
              </p>
              <button
                onClick={startTimer}
                className="px-8 py-3 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-sm transition-all text-lg font-medium"
              >
                Begin
              </button>
            </motion.div>
          ) : (
            /* Timer Display */
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              {/* Timer */}
              <div className="relative">
                <div className="text-6xl md:text-8xl font-light text-white/90 font-mono">
                  {formatTime(timeRemaining)}
                </div>

                {/* Progress Ring */}
                <svg
                  className="absolute inset-0 w-full h-full -rotate-90"
                  viewBox="0 0 100 100"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="transparent"
                    stroke="white"
                    strokeOpacity="0.1"
                    strokeWidth="1"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="transparent"
                    stroke="white"
                    strokeOpacity="0.3"
                    strokeWidth="1"
                    strokeDasharray="283"
                    initial={{ strokeDashoffset: 283 }}
                    animate={{ strokeDashoffset: 283 - (progress * 283) / 100 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </svg>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={togglePause}
                  className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur-sm"
                >
                  {isPaused ? <Play size={20} /> : <Pause size={20} />}
                </button>
              </div>

              {/* Visualization Label */}
              <p className="text-white/60 text-sm">
                {VISUALIZATION_TYPES[visualizationType as keyof typeof VISUALIZATION_TYPES] || title}
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Visualization Components
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

const MountainView: React.FC<{ isPaused: boolean }> = ({ isPaused }) => (
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

const MinimalVisualization: React.FC<{ isPaused: boolean }> = ({ isPaused }) => (
  <div className="absolute inset-0 bg-gradient-to-br from-gray-800/20 to-gray-600/20" />
);

export default FullscreenWaiting;