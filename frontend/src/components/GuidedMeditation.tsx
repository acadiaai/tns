import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import {
  Play,
  Pause,
  RotateCcw,
  Heart,
  Volume2,
  VolumeX,
  Circle,
  Activity
} from 'lucide-react';

interface GuidedMeditationProps {
  onComplete: () => void;
  onProgress: (progress: number) => void;
}

const MEDITATION_SCRIPTS = [
  {
    id: 'breathing',
    name: 'Basic Breathing Exercise',
    duration: 300, // 5 minutes
    instructions: [
      "Let's begin by finding a comfortable position...",
      "Close your eyes or soften your gaze downward...",
      "Take a deep breath in through your nose for 4 counts...",
      "Hold for 4 counts...",
      "Now exhale slowly through your mouth for 6 counts...",
      "Continue this rhythm... in for 4, hold for 4, out for 6...",
      "Notice how your body begins to relax...",
      "If your mind wanders, gently return to your breath...",
      "You're doing great, just keep breathing naturally..."
    ]
  },
  {
    id: 'body-scan',
    name: 'Progressive Body Scan',
    duration: 600, // 10 minutes
    instructions: [
      "Begin by settling into your position...",
      "Take three deep breaths to center yourself...",
      "Now bring your attention to the top of your head...",
      "Notice any sensations or tension...",
      "Slowly move your attention down to your forehead...",
      "Release any tension you find there...",
      "Continue down to your eyes, your jaw...",
      "Let each part of your body soften and relax...",
      "Move down through your neck and shoulders..."
    ]
  },
  {
    id: 'grounding',
    name: '5-4-3-2-1 Grounding',
    duration: 240, // 4 minutes
    instructions: [
      "This exercise will help ground you in the present moment...",
      "Look around and name 5 things you can see...",
      "Take your time with each one...",
      "Now notice 4 things you can touch or feel...",
      "Next, identify 3 things you can hear...",
      "Find 2 things you can smell...",
      "Finally, notice 1 thing you can taste...",
      "Feel how present and grounded you are now..."
    ]
  }
];

export const GuidedMeditation: React.FC<GuidedMeditationProps> = ({ onComplete, onProgress }) => {
  const [selectedScript, setSelectedScript] = useState(MEDITATION_SCRIPTS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentInstruction, setCurrentInstruction] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [breathingCycle, setBreathingCycle] = useState<'inhale' | 'hold' | 'exhale' | 'pause'>('inhale');
  const [breathingCount, setBreathingCount] = useState(4);

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying && currentTime < selectedScript.duration) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 1;
          const progress = (newTime / selectedScript.duration) * 100;
          onProgress(progress);

          // Update instruction based on time
          const instructionIndex = Math.floor((newTime / selectedScript.duration) * selectedScript.instructions.length);
          setCurrentInstruction(Math.min(instructionIndex, selectedScript.instructions.length - 1));

          return newTime;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentTime, selectedScript, onProgress]);

  // Breathing cycle effect
  useEffect(() => {
    if (isPlaying && selectedScript.id === 'breathing') {
      const breathingInterval = setInterval(() => {
        setBreathingCycle(prev => {
          switch (prev) {
            case 'inhale':
              setBreathingCount(4);
              return 'hold';
            case 'hold':
              setBreathingCount(4);
              return 'exhale';
            case 'exhale':
              setBreathingCount(6);
              return 'pause';
            case 'pause':
              setBreathingCount(2);
              return 'inhale';
            default:
              return 'inhale';
          }
        });
      }, 1000);
      return () => clearInterval(breathingInterval);
    }
  }, [isPlaying, selectedScript.id]);

  // Complete meditation
  useEffect(() => {
    if (currentTime >= selectedScript.duration) {
      setIsPlaying(false);
      onComplete();
    }
  }, [currentTime, selectedScript.duration, onComplete]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const reset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setCurrentInstruction(0);
    onProgress(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getBreathingInstruction = () => {
    switch (breathingCycle) {
      case 'inhale':
        return 'Breathe in...';
      case 'hold':
        return 'Hold...';
      case 'exhale':
        return 'Breathe out...';
      case 'pause':
        return 'Pause...';
      default:
        return 'Breathe naturally...';
    }
  };

  return (
    <div className="space-y-6">
      {/* Script Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Select Meditation Exercise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {MEDITATION_SCRIPTS.map((script) => (
              <Button
                key={script.id}
                variant={selectedScript.id === script.id ? "accent" : "outline"}
                onClick={() => {
                  setSelectedScript(script);
                  reset();
                }}
                className="p-4 h-auto flex-col items-start"
              >
                <div className="font-medium">{script.name}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {Math.floor(script.duration / 60)} minutes
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Meditation Interface */}
      <Card>
        <CardHeader>
          <CardTitle>{selectedScript.name}</CardTitle>
          <CardDescription>
            Duration: {Math.floor(selectedScript.duration / 60)} minutes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(selectedScript.duration)}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${(currentTime / selectedScript.duration) * 100}%` }}
              />
            </div>
          </div>

          {/* Breathing Visualization */}
          {selectedScript.id === 'breathing' && (
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Circle
                  className={`h-32 w-32 text-blue-500 transition-all duration-1000 ${breathingCycle === 'inhale' ? 'scale-125' :
                    breathingCycle === 'exhale' ? 'scale-75' : 'scale-100'
                    }`}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Activity className="h-8 w-8 text-blue-400" />
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-white mb-2">
                  {getBreathingInstruction()}
                </div>
                <div className="text-lg text-gray-300">
                  {breathingCount > 0 ? breathingCount : ''}
                </div>
              </div>
            </div>
          )}

          {/* Current Instruction */}
          <div className="text-center">
            <div className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
              {selectedScript.instructions[currentInstruction]}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>

            <Button
              onClick={togglePlay}
              size="lg"
              className="flex items-center gap-2"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              {isPlaying ? 'Pause' : 'Start'}
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMuted(!isMuted)}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20"
              />
            </div>
          </div>

          {/* Completion Status */}
          {currentTime >= selectedScript.duration && (
            <div className="text-center p-4 bg-green-500/20 rounded-lg">
              <div className="text-green-300 font-medium">
                Meditation Complete! 🧘‍♀️
              </div>
              <div className="text-sm text-gray-300 mt-1">
                Take a moment to notice how you feel now.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 