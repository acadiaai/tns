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

        {/* Timer Overlay - Smaller and less prominent */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-6 right-6 z-10"
        >
          <div className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-black/20 border border-white/5 backdrop-blur-sm">
            {/* Timer Display - Much smaller */}
            <div className="text-xl font-mono text-white/50">
              {formatTime(timeRemaining)}
            </div>

            {/* Pause Button - Inline */}
            <button
              onClick={togglePause}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/60 transition-all"
              aria-label={isPaused ? "Resume" : "Pause"}
            >
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Visualization Components

// Calm breathing orb with particle field - meditative visualization
const FlowingLines: React.FC<{ isPaused: boolean }> = ({ isPaused }) => {
  // Generate random particles
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 5,
    duration: Math.random() * 10 + 15,
  }));

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-slate-950 to-black overflow-hidden">
      {/* Floating particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-white/20"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
          }}
          animate={isPaused ? {} : {
            y: [0, -30, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Central breathing orb */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Outer glow rings */}
        <motion.div
          className="absolute w-96 h-96 rounded-full bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 blur-3xl"
          animate={isPaused ? {} : {
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="absolute w-80 h-80 rounded-full bg-gradient-to-r from-purple-600/40 to-blue-600/40 blur-2xl"
          animate={isPaused ? {} : {
            scale: [1.1, 1.4, 1.1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />

        {/* Core breathing orb */}
        <motion.div
          className="absolute w-64 h-64 rounded-full"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(168, 85, 247, 0.6), rgba(139, 92, 246, 0.5), rgba(124, 58, 237, 0.4))',
            boxShadow: '0 0 80px rgba(168, 85, 247, 0.6), inset 0 0 60px rgba(255, 255, 255, 0.15)',
          }}
          animate={isPaused ? {} : {
            scale: [1, 1.15, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Inner core */}
        <motion.div
          className="absolute w-32 h-32 rounded-full bg-gradient-to-br from-white/30 to-transparent blur-sm"
          animate={isPaused ? {} : {
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.2,
          }}
        />
      </div>

      {/* Subtle ambient radial glow */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.2), transparent 60%)',
        }}
        animate={isPaused ? {} : {
          opacity: [0.6, 0.9, 0.6],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
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

const Starfield: React.FC<{ isPaused: boolean }> = ({ isPaused }) => {
  // Generate stars with random starting positions and speeds
  const stars = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    startX: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 1.5 + 0.5,
    duration: Math.random() * 40 + 60, // 60-100 seconds for slow drift
  }));

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/30 to-purple-900/30">
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute bg-white rounded-full"
          style={{
            left: `${star.startX}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
          }}
          animate={isPaused ? {} : {
            x: ['0vw', '100vw'],
            opacity: [0.4, 0.6, 0.4]
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 10
          }}
        />
      ))}
    </div>
  );
};

export default FullscreenWaiting;