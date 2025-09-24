import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import {
  Send,
  Bot,
  User,
  Activity,
  MessageSquare,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface Message {
  id: string;
  role: 'client' | 'ai' | 'system';
  content: string;
  timestamp: string;
  stage_id?: number;
}

interface Stage {
  id: number;
  name: string;
  system_name: string;
  description: string;
}

interface ActivationLevel {
  level: number;
  confidence: number;
  factors: string[];
}

interface TherapyChatProps {
  sessionId?: string;
  clientId: string;
  therapistId: string;
}

export const TherapyChat: React.FC<TherapyChatProps> = ({ sessionId, clientId, therapistId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState<Stage | null>(null);
  const [activationLevel, setActivationLevel] = useState<ActivationLevel>({ level: 5, confidence: 0.5, factors: [] });
  const [sessionActive, setSessionActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize session
  useEffect(() => {
    if (!sessionId && clientId && therapistId) {
      initializeSession();
    }
  }, [clientId, therapistId]);

  const initializeSession = async () => {
    try {
      // Start with INTAKE stage
      setCurrentStage({
        id: 1,
        name: "Intake - What's Up?",
        system_name: "intake",
        description: "Initial assessment"
      });

      // Add welcome message
      const welcomeMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'system',
        content: "Welcome to your therapy session. Let's start by checking in - what brings you here today?",
        timestamp: new Date().toISOString(),
        stage_id: 1
      };
      setMessages([welcomeMessage]);
      setSessionActive(true);

      // Send intake prompt
      setTimeout(() => {
        const intakePrompt: Message = {
          id: `msg-${Date.now()}-1`,
          role: 'ai',
          content: "Hi there! I'm here to support you. To get started, I'd like to understand what's on your mind today. What's up? What's bringing you to this session?",
          timestamp: new Date().toISOString(),
          stage_id: 1
        };
        setMessages(prev => [...prev, intakePrompt]);
      }, 1500);
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'client',
      content: inputValue,
      timestamp: new Date().toISOString(),
      stage_id: currentStage?.id
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Here we would call the API to:
      // 1. Save the message
      // 2. Get AI response
      // 3. Calculate activation level
      
      // For now, simulate AI response
      setTimeout(() => {
        const aiResponse = generateAIResponse(userMessage.content, currentStage);
        setMessages(prev => [...prev, aiResponse]);
        
        // Update activation level
        updateActivationLevel(userMessage.content);
        
        // Check if we should transition stages
        checkStageTransition();
        
        setIsLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsLoading(false);
    }
  };

  const generateAIResponse = (_userInput: string, stage: Stage | null): Message => {
    let response = '';
    
    if (stage?.system_name === 'intake') {
      // INTAKE stage responses
      if (messages.filter(m => m.role === 'client').length === 0) {
        response = "Thank you for sharing that with me. It sounds like you're dealing with some challenging feelings. Can you tell me a bit more about how long you've been experiencing this?";
      } else {
        response = "I hear you. Before we dive deeper, let me ask you a few questions to better understand your situation. This will help me provide the most helpful support. Are you ready to continue?";
        // Prepare to transition to SETUP
      }
    } else if (stage?.system_name === 'setup') {
      // SETUP stage - structured Q&A
      const questionNumber = messages.filter(m => m.role === 'ai' && m.stage_id === 2).length;
      const setupQuestions = [
        "Let's start with some background. How would you describe your current living situation?",
        "What does your support system look like? Do you have family or friends you can rely on?",
        "How has your sleep been lately? Any changes in your sleep patterns?",
        "What about your appetite and energy levels? Have you noticed any changes?",
        "Have you experienced similar feelings before? If so, what helped you through those times?",
        "What are your main goals for our work together? What would you like to see change?",
        "Is there anything else you think would be important for me to know about your situation?"
      ];
      
      response = setupQuestions[Math.min(questionNumber, setupQuestions.length - 1)];
    } else {
      response = "I understand. Let me think about how I can best support you with this.";
    }

    return {
      id: `msg-${Date.now()}`,
      role: 'ai',
      content: response,
      timestamp: new Date().toISOString(),
      stage_id: stage?.id
    };
  };

  const updateActivationLevel = (userInput: string) => {
    // Simple activation level calculation based on keywords and patterns
    const highActivationKeywords = ['panic', 'crisis', 'emergency', 'suicide', 'can\'t cope', 'falling apart'];
    const lowActivationKeywords = ['fine', 'okay', 'good', 'better', 'calm', 'peaceful'];
    
    let newLevel = activationLevel.level;
    let factors = [];
    
    const lowerInput = userInput.toLowerCase();
    
    if (highActivationKeywords.some(keyword => lowerInput.includes(keyword))) {
      newLevel = Math.min(10, activationLevel.level + 1.5);
      factors.push('High-stress language detected');
    } else if (lowActivationKeywords.some(keyword => lowerInput.includes(keyword))) {
      newLevel = Math.max(0, activationLevel.level - 0.5);
      factors.push('Calm language detected');
    }
    
    // Length and complexity of response can indicate engagement
    if (userInput.length > 100) {
      factors.push('Detailed response - engaged');
    } else if (userInput.length < 20) {
      factors.push('Brief response - possible withdrawal');
      newLevel = Math.min(10, newLevel + 0.3);
    }
    
    setActivationLevel({
      level: parseFloat(newLevel.toFixed(1)),
      confidence: 0.7,
      factors
    });
  };

  const checkStageTransition = () => {
    const clientMessages = messages.filter(m => m.role === 'client');
    
    if (currentStage?.system_name === 'intake' && clientMessages.length >= 2) {
      // Transition from INTAKE to SETUP
      setCurrentStage({
        id: 2,
        name: "Setup - Q&A Session",
        system_name: "setup",
        description: "Structured information gathering"
      });
      
      const transitionMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'system',
        content: "Moving to structured assessment phase...",
        timestamp: new Date().toISOString(),
        stage_id: 2
      };
      setMessages(prev => [...prev, transitionMessage]);
    }
  };

  const getMessageIcon = (role: string) => {
    switch (role) {
      case 'client':
        return <User className="h-4 w-4" />;
      case 'ai':
        return <Bot className="h-4 w-4" />;
      case 'system':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getMessageStyle = (role: string) => {
    switch (role) {
      case 'client':
        return 'bg-blue-500/10 border-blue-500/20 ml-12';
      case 'ai':
        return 'bg-purple-500/10 border-purple-500/20 mr-12';
      case 'system':
        return 'bg-gray-500/10 border-gray-500/20 mx-12 text-center text-sm';
      default:
        return 'bg-gray-700';
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen">
      {/* Header */}
      <Card className="rounded-none border-x-0 border-t-0">
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-lg">Therapy Session</CardTitle>
              {currentStage && (
                <div className="flex items-center gap-2 text-sm">
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                  <span className="text-purple-400">{currentStage.name}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-yellow-400" />
                <span className="text-sm">
                  Activation: <span className="font-bold text-yellow-400">{activationLevel.level}</span>/10
                </span>
              </div>
              {sessionActive && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm text-green-400">Active</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start gap-3 ${message.role === 'client' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role !== 'client' && (
              <div className={`p-2 rounded-lg ${
                message.role === 'ai' ? 'bg-purple-500/20' : 'bg-gray-500/20'
              }`}>
                {getMessageIcon(message.role)}
              </div>
            )}
            <div className={`p-4 rounded-lg border ${getMessageStyle(message.role)}`}>
              <p className="text-sm">{message.content}</p>
              <p className="text-xs text-gray-500 mt-2">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
            {message.role === 'client' && (
              <div className="p-2 rounded-lg bg-blue-500/20">
                {getMessageIcon(message.role)}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-purple-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">AI is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <Card className="rounded-none border-x-0 border-b-0">
        <CardContent className="p-4">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              disabled={!sessionActive || isLoading}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!sessionActive || isLoading || !inputValue.trim()}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Send
            </Button>
          </form>
          {activationLevel.factors.length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              Analysis: {activationLevel.factors.join(' • ')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};