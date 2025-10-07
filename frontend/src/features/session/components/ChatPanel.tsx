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
  timedWaitingPhase?: any;
  onBeginTimedWaiting?: () => void;
  timedWaitingStatus?: 'not_started' | 'in_progress' | 'completed';
  timedWaitingElapsed?: number;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  isConnected,
  onSendMessage,
  onEditMessage,
  className = '',
  isCompleted = false,
  timedWaitingPhase,
  onBeginTimedWaiting,
  timedWaitingStatus = 'not_started',
  timedWaitingElapsed = 0
}) => {
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Connection Status */}
      <ConnectionStatus isConnected={isConnected} />

      {/* Messages Area */}
      <MessageList
        messages={messages}
        onEditMessage={onEditMessage}
        className="flex-1"
        timedWaitingPhase={timedWaitingPhase}
        onBeginTimedWaiting={onBeginTimedWaiting}
        timedWaitingStatus={timedWaitingStatus}
        timedWaitingElapsed={timedWaitingElapsed}
      />
      
      {/* Input Area */}
      <MessageInput
        onSendMessage={onSendMessage}
        disabled={!isConnected || isCompleted}
        isCompleted={isCompleted}
      />
    </div>
  );
};