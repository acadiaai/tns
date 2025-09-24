import { useState, useEffect } from 'react';
import { Message } from '../../../types/message';

export interface MessagesHook {
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
}

export const useMessages = (ws: WebSocket | null): MessagesHook => {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        // Handle initial_state message which includes recent messages
        if (data.type === 'initial_state' && data.recent_messages) {
          const initialMessages = data.recent_messages;
          if (Array.isArray(initialMessages)) {
            // Messages come in DESC order from backend, reverse for display
            const enhancedMessages = initialMessages.reverse().map((msg: any) => ({
              ...msg,
              metadata: msg.metadata || (typeof msg.metadata === 'string' ? msg.metadata : null),
              tool_calls: msg.tool_calls || []
            }));
            console.log(`✅ Loaded ${enhancedMessages.length} initial messages from WebSocket initial_state`);
            setMessages(enhancedMessages as Message[]);
          }
        } else if (data.type === 'message' && data.message) {
          console.log('Received message:', data.message);

          // Add all metadata to message for tool call visualization
          const enhancedMessage = {
            ...data.message,
            metadata: data.message.metadata || data.metadata || {},
            tool_calls: data.message.metadata?.tool_calls || data.metadata?.tool_calls || []
          };

          setMessages(prev => {
            // Check if this is an update to an existing message
            const existingIndex = prev.findIndex(msg => msg.id === data.message.id);
            if (existingIndex >= 0) {
              // Update existing message (for tool call status updates)
              console.log('🔄 Updating existing message:', data.message.id);
              const updated = [...prev];
              updated[existingIndex] = enhancedMessage;

              // Check for phase transition in tool call metadata
              const metadata = enhancedMessage.metadata;
              if (typeof metadata === 'string') {
                try {
                  const parsedMetadata = JSON.parse(metadata);
                  // Look for transition data in tool_result.data
                  const transitionData = parsedMetadata.tool_result?.data;
                  if (transitionData?.to_phase && transitionData?.from_phase) {
                    console.log('🔄 DETECTED PHASE TRANSITION:', transitionData);
                    // Emit phase transition event
                    window.dispatchEvent(new CustomEvent('phase_transition', {
                      detail: {
                        from_phase: transitionData.from_phase,
                        to_phase: transitionData.to_phase,
                        success: transitionData.success,
                        timestamp: Date.now()
                      }
                    }));
                  }
                } catch (e) {
                  console.error('Error parsing tool metadata for phase transition:', e);
                }
              }

              return updated;
            } else {
              // Add new message
              console.log('➕ Adding new message:', data.message.id);
              return [...prev, enhancedMessage];
            }
          });
        } else if (data.type === 'messages' && data.messages) {
          // Initial message load from WebSocket
          const enhancedMessages = data.messages.map((msg: any) => ({
            ...msg,
            metadata: msg.metadata || (typeof msg.metadata === 'string' ? msg.metadata : null),
            tool_calls: msg.tool_calls || []
          }));
          console.log(`Loaded ${enhancedMessages.length} messages from WebSocket`);
          setMessages(enhancedMessages);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.addEventListener('message', handleMessage);
    
    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [ws]);

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return {
    messages,
    addMessage,
    clearMessages
  };
};