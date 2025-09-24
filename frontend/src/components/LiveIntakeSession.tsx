import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Zap, MessageSquare, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'patient' | 'therapist';
  content: string;
  timestamp: Date;
}

interface ExtractedField {
  field: string;
  value: string;
  confidence: number;
}


export const LiveIntakeSession: React.FC = () => {
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedField[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);

  const startSession = async () => {
    try {
      // Start a simple session
      const response = await fetch('http://localhost:8083/api/simple/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ num_turns: 8 })
      });
      
      const data = await response.json();
      setSessionId(data.session_id);
      setIsSessionActive(true);
      
      // Connect to WebSocket
      const websocket = new WebSocket(`ws://localhost:8083${data.websocket}`);
      
      websocket.onmessage = (event) => {
        const update = JSON.parse(event.data);
        handleSessionUpdate(update);
      };
      
      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      setWs(websocket);
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const handleSessionUpdate = (update: any) => {
    if (update.type === 'message') {
      setMessages(prev => [...prev, {
        id: update.message.id,
        role: update.message.role === 'MessageRoleClient' ? 'patient' : 'therapist',
        content: update.message.content,
        timestamp: new Date(update.timestamp)
      }]);
    } else if (update.type === 'extraction') {
      const fields = Object.entries(update.extracted_data).map(([field, value]) => ({
        field,
        value: String(value),
        confidence: 0.85
      }));
      setExtractedData(prev => [...prev, ...fields]);
    } else if (update.type === 'status' && update.status === 'completed') {
      setIsSessionActive(false);
    }
  };

  useEffect(() => {
    return () => {
      ws?.close();
    };
  }, [ws]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Live Intake Session Demo
          </h1>
          <p className="text-muted-foreground">Watch AI agents conduct therapy intake with real-time data extraction</p>
        </div>

        {!isSessionActive && (
          <div className="flex justify-center mb-8">
            <Button onClick={startSession} size="lg" className="gap-2">
              <Zap className="h-5 w-5" />
              Start New Session
            </Button>
          </div>
        )}

        {sessionId && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat Panel */}
            <Card className="lg:col-span-2 p-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Conversation</h2>
              </div>
              
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                <AnimatePresence>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === 'patient' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-[80%] p-4 rounded-lg ${
                        msg.role === 'patient' 
                          ? 'bg-blue-500/10 text-blue-900 dark:text-blue-100' 
                          : 'bg-purple-500/10 text-purple-900 dark:text-purple-100'
                      }`}>
                        <div className="text-xs font-medium mb-1 opacity-70">
                          {msg.role === 'patient' ? '👤 Patient' : '👨‍⚕️ Therapist'}
                        </div>
                        <div>{msg.content}</div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </Card>

            {/* Data Extraction Panel */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Database className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Extracted Data</h2>
              </div>
              
              <div className="space-y-3">
                <AnimatePresence>
                  {extractedData.map((field, idx) => (
                    <motion.div
                      key={`${field.field}-${idx}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-muted/50 p-3 rounded-lg"
                    >
                      <div className="text-sm font-medium text-muted-foreground">
                        {field.field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                      <div className="text-sm mt-1">{field.value}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="text-xs text-muted-foreground">Confidence:</div>
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${field.confidence * 100}%` }}
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">{Math.round(field.confidence * 100)}%</div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};