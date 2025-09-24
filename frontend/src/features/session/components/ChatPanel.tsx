import React from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ConnectionStatus } from './ConnectionStatus';
import { Message } from '../../../types/message';

interface ChatPanelProps {
  messages: Message[];
  isConnected: boolean;
  onSendMessage: (content: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  className?: string;
  isCompleted?: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  isConnected,
  onSendMessage,
  onEditMessage,
  className = '',
  isCompleted = false
}) => {
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Connection Status */}
      <ConnectionStatus isConnected={isConnected} />
      
      {/* Messages Area */}
      <MessageList messages={messages} onEditMessage={onEditMessage} className="flex-1" />
      
      {/* Input Area */}
      <MessageInput
        onSendMessage={onSendMessage}
        disabled={!isConnected || isCompleted}
        isCompleted={isCompleted}
      />
    </div>
  );
};