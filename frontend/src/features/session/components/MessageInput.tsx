import React, { useState } from 'react';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
  isCompleted?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  disabled = false,
  isCompleted = false
}) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-white/[0.05] p-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isCompleted
              ? "Session Complete - No further input needed"
              : disabled
              ? "Connecting..."
              : "Type your message..."
          }
          disabled={disabled}
          className={`flex-1 px-4 py-2 border rounded-lg text-white/90 placeholder-white/30 outline-none transition-all ${
            isCompleted
              ? 'bg-green-500/5 border-green-400/20 cursor-not-allowed'
              : 'bg-white/[0.05] border-white/[0.1] focus:border-white/20 focus:bg-white/[0.08]'
          } disabled:opacity-50`}
        />
        {!isCompleted && (
          <button
            type="submit"
            disabled={disabled || !input.trim()}
            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-300 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        )}
      </div>
    </form>
  );
};