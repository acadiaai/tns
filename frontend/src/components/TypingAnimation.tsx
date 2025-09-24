import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface TypingAnimationProps {
  text: string;
  speed?: number; // milliseconds per character
  onComplete?: () => void;
  className?: string;
  showCursor?: boolean;
  cursorChar?: string;
  startDelay?: number;
}

export const TypingAnimation: React.FC<TypingAnimationProps> = ({
  text,
  speed = 50,
  onComplete,
  className = '',
  showCursor = true,
  cursorChar = '|',
  startDelay = 0
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showBlinkingCursor, setShowBlinkingCursor] = useState(true);

  useEffect(() => {
    if (!text) return;

    const startTyping = () => {
      setIsTyping(true);
      setDisplayedText('');

      let currentIndex = 0;
      const typeInterval = setInterval(() => {
        if (currentIndex <= text.length) {
          setDisplayedText(text.slice(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(typeInterval);
          setIsTyping(false);
          onComplete?.();
        }
      }, speed);

      return () => clearInterval(typeInterval);
    };

    if (startDelay > 0) {
      const delayTimeout = setTimeout(startTyping, startDelay);
      return () => clearTimeout(delayTimeout);
    } else {
      return startTyping();
    }
  }, [text, speed, startDelay, onComplete]);

  // Blinking cursor effect
  useEffect(() => {
    if (!showCursor) return;

    const blinkInterval = setInterval(() => {
      setShowBlinkingCursor(prev => !prev);
    }, 500);

    return () => clearInterval(blinkInterval);
  }, [showCursor]);

  return (
    <span className={className}>
      {displayedText}
      {showCursor && (isTyping || showBlinkingCursor) && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
          className="text-cyan-400"
        >
          {cursorChar}
        </motion.span>
      )}
    </span>
  );
};

interface FormFieldTypingProps {
  label: string;
  value: string;
  type?: 'text' | 'number' | 'boolean';
  isRequired?: boolean;
  isCompleted?: boolean;
  speed?: number;
  delay?: number;
  onComplete?: () => void;
}

export const FormFieldTyping: React.FC<FormFieldTypingProps> = ({
  label,
  value,
  type = 'text',
  isRequired = false,
  isCompleted = false,
  speed = 30,
  delay = 0,
  onComplete
}) => {
  const [stage, setStage] = useState<'waiting' | 'typing-label' | 'typing-value' | 'complete'>('waiting');

  useEffect(() => {
    if (delay > 0) {
      const timeout = setTimeout(() => setStage('typing-label'), delay);
      return () => clearTimeout(timeout);
    } else {
      setStage('typing-label');
    }
  }, [delay]);

  const handleLabelComplete = () => {
    setStage('typing-value');
  };

  const handleValueComplete = () => {
    setStage('complete');
    onComplete?.();
  };

  const getStatusColor = () => {
    if (stage === 'complete' && isCompleted) return 'text-emerald-400';
    if (stage === 'complete') return 'text-amber-400';
    return 'text-white/60';
  };

  const getStatusIcon = () => {
    if (stage === 'complete' && isCompleted) return '✅';
    if (stage === 'complete') return '⏳';
    return '○';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 mb-2"
    >
      <div className="flex items-start gap-3">
        <span className={`text-sm ${getStatusColor()}`}>
          {getStatusIcon()}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {stage === 'waiting' ? (
              <span className="text-white/40 text-sm">{label}</span>
            ) : (
              <TypingAnimation
                text={label}
                speed={speed}
                onComplete={handleLabelComplete}
                className="text-white/80 text-sm font-medium"
                showCursor={stage === 'typing-label'}
              />
            )}
            {isRequired && <span className="text-red-400 text-xs">*</span>}
          </div>

          {stage === 'typing-value' || stage === 'complete' ? (
            <div className="mt-1">
              {type === 'boolean' ? (
                <TypingAnimation
                  text={value === 'true' ? '✓ Yes' : value === 'false' ? '✗ No' : value}
                  speed={speed * 2}
                  onComplete={handleValueComplete}
                  className={`text-sm ${isCompleted ? 'text-emerald-300' : 'text-cyan-300'}`}
                  showCursor={stage === 'typing-value'}
                />
              ) : (
                <TypingAnimation
                  text={value}
                  speed={speed}
                  onComplete={handleValueComplete}
                  className={`text-sm ${isCompleted ? 'text-emerald-300' : 'text-cyan-300'}`}
                  showCursor={stage === 'typing-value'}
                />
              )}
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
};

interface ThinkingAnimationProps {
  text?: string;
  className?: string;
}

export const ThinkingAnimation: React.FC<ThinkingAnimationProps> = ({
  text = "AI is thinking",
  className = ""
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
            className="w-2 h-2 bg-cyan-400 rounded-full"
          />
        ))}
      </div>
      <span className="text-white/60 text-sm">{text}...</span>
    </div>
  );
};