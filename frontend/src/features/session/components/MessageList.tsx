import React, { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { Message } from '../../../types/message';

interface MessageListProps {
  messages: Message[];
  onEditMessage?: (messageId: string, newContent: string) => void;
  className?: string;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  className = ''
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className={`flex items-center justify-center text-white/40 ${className}`}>
        <p>No messages yet. Start a conversation!</p>
      </div>
    );
  }

  // Filter out system messages that shouldn't be visible to users
  const visibleMessages = messages.filter(message => 
    message.content !== '[Generate initial greeting]'
  );

  return (
    <div className={`overflow-y-auto p-4 space-y-4 ${className}`}>
      {visibleMessages.map((message) => (
        <MessageBubble 
          key={message.id} 
          message={message}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};