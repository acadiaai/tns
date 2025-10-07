import React, { useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { TimedWaitingPromptBubble } from './TimedWaitingPromptBubble';
import { Message } from '../../../types/message';

interface MessageListProps {
  messages: Message[];
  onEditMessage?: (messageId: string, newContent: string) => void;
  className?: string;
  timedWaitingPhase?: any;
  onBeginTimedWaiting?: () => void;
  timedWaitingStatus?: 'not_started' | 'in_progress' | 'completed';
  timedWaitingElapsed?: number;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  className = '',
  timedWaitingPhase,
  onBeginTimedWaiting,
  timedWaitingStatus = 'not_started',
  timedWaitingElapsed = 0
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
      {visibleMessages.map((message) => {
        // Render completion bubble for wait_completed messages
        if (message.message_type === 'wait_completed' && timedWaitingPhase) {
          const metadata = typeof message.metadata === 'string'
            ? JSON.parse(message.metadata)
            : message.metadata;

          return (
            <TimedWaitingPromptBubble
              key={message.id}
              phaseName={timedWaitingPhase.display_name || 'Timed Phase'}
              durationSeconds={timedWaitingPhase.wait_duration_seconds || 60}
              visualizationType={timedWaitingPhase.visualization_type || 'flowing_lines'}
              onBegin={onBeginTimedWaiting || (() => {})}
              status='completed'
              elapsedSeconds={metadata?.elapsed_seconds || timedWaitingElapsed}
            />
          );
        }

        // Regular message bubble
        return (
          <MessageBubble
            key={message.id}
            message={message}
          />
        );
      })}

      {/* Show timed waiting START bubble only when phase is active and not started yet */}
      {timedWaitingPhase && onBeginTimedWaiting && timedWaitingStatus === 'not_started' && (
        <TimedWaitingPromptBubble
          phaseName={timedWaitingPhase.display_name || 'Timed Phase'}
          durationSeconds={timedWaitingPhase.wait_duration_seconds || 60}
          visualizationType={timedWaitingPhase.visualization_type || 'flowing_lines'}
          onBegin={onBeginTimedWaiting}
          status={timedWaitingStatus}
          elapsedSeconds={timedWaitingElapsed}
        />
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};