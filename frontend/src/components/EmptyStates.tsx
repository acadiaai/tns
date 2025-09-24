import React from 'react';
import { motion } from 'framer-motion';

export const NoSessionsEmptyState: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16"
    >
      <svg width="200" height="200" viewBox="0 0 200 200" className="mb-8">
        <defs>
          <linearGradient id="network-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
          </linearGradient>
          
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Animated circles */}
        <motion.circle
          cx="50"
          cy="50"
          r="20"
          fill="url(#network-gradient)"
          filter="url(#glow)"
          animate={{
            cx: [50, 80, 50],
            cy: [50, 80, 50],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        <motion.circle
          cx="150"
          cy="50"
          r="20"
          fill="url(#network-gradient)"
          filter="url(#glow)"
          animate={{
            cx: [150, 120, 150],
            cy: [50, 80, 50],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />
        
        <motion.circle
          cx="100"
          cy="150"
          r="25"
          fill="url(#network-gradient)"
          filter="url(#glow)"
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />
        
        {/* Animated connections */}
        <motion.line
          x1="50"
          y1="50"
          x2="150"
          y2="50"
          stroke="url(#network-gradient)"
          strokeWidth="2"
          strokeDasharray="5,5"
          animate={{
            strokeDashoffset: [0, -10],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        
        <motion.line
          x1="50"
          y1="50"
          x2="100"
          y2="150"
          stroke="url(#network-gradient)"
          strokeWidth="2"
          strokeDasharray="5,5"
          animate={{
            strokeDashoffset: [0, -10],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear",
            delay: 0.3,
          }}
        />
        
        <motion.line
          x1="150"
          y1="50"
          x2="100"
          y2="150"
          stroke="url(#network-gradient)"
          strokeWidth="2"
          strokeDasharray="5,5"
          animate={{
            strokeDashoffset: [0, -10],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear",
            delay: 0.6,
          }}
        />
      </svg>
      
      <h3 className="text-xl font-medium text-white/80 mb-2">No Sessions Yet</h3>
      <p className="text-white/60 text-sm text-center max-w-md">
        Create your first therapy session by selecting a patient and therapist in the network above
      </p>
    </motion.div>
  );
};

export const NoDataEmptyState: React.FC<{ type: 'patients' | 'therapists' }> = ({ type }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20"
    >
      <svg width="150" height="150" viewBox="0 0 150 150" className="mb-6">
        <defs>
          <linearGradient id={`${type}-gradient`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={type === 'patients' ? '#3b82f6' : '#8b5cf6'} stopOpacity="0.6" />
            <stop offset="100%" stopColor={type === 'patients' ? '#8b5cf6' : '#3b82f6'} stopOpacity="0.6" />
          </linearGradient>
        </defs>
        
        {/* Profile icon */}
        <motion.g
          animate={{
            y: [0, -5, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <circle cx="75" cy="50" r="25" fill={`url(#${type}-gradient)`} />
          <path
            d="M 40 100 Q 75 70 110 100"
            fill={`url(#${type}-gradient)`}
            opacity="0.8"
          />
        </motion.g>
        
        {/* Plus icon */}
        <motion.g
          animate={{
            rotate: [0, 90, 180, 270, 360],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <circle cx="120" cy="120" r="20" fill="none" stroke={`url(#${type}-gradient)`} strokeWidth="2" />
          <line x1="120" y1="110" x2="120" y2="130" stroke={`url(#${type}-gradient)`} strokeWidth="2" />
          <line x1="110" y1="120" x2="130" y2="120" stroke={`url(#${type}-gradient)`} strokeWidth="2" />
        </motion.g>
      </svg>
      
      <h3 className="text-lg font-medium text-white/80 mb-2">
        No {type === 'patients' ? 'Patients' : 'Therapists'} Yet
      </h3>
      <p className="text-white/60 text-sm">
        Click the "New {type === 'patients' ? 'Patient' : 'Therapist'}" button to add your first one
      </p>
    </motion.div>
  );
};