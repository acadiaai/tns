import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Edit3, Check, X } from 'lucide-react';
import { Message } from '../../../types/message';

interface MessageBubbleProps {
  message: Message;
  onEdit?: (messageId: string, newContent: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');
  const isCoach = message.role === 'coach';
  const isToolCall = (message as any).message_type === 'tool_call';

  // Auto-expand for therapy session transitions with continuation content
  const shouldAutoExpand = isToolCall && (() => {
    let parsedMetadata: any = {};
    if ((message as any).metadata) {
      try {
        parsedMetadata = typeof (message as any).metadata === 'string' ? JSON.parse((message as any).metadata) : (message as any).metadata;
      } catch (e) {
        parsedMetadata = {};
      }
    }
    const toolName = parsedMetadata.tool_name || parsedMetadata.name || '';
    const continuationContent = parsedMetadata.continuation;
    return toolName === 'therapy_session_transition' && continuationContent;
  })();

  const [isExpanded, setIsExpanded] = useState(shouldAutoExpand);

  // Tool call messages - expandable Cursor-style
  if (isToolCall) {
    // Parse metadata to get tool info
    let parsedMetadata: any = {};
    let toolName = 'unknown_tool';

    if ((message as any).metadata) {
      if (typeof (message as any).metadata === 'string') {
        // Database metadata (JSON string)
        try {
          parsedMetadata = JSON.parse((message as any).metadata);
        } catch (e) {
          parsedMetadata = {};
        }
      } else if (typeof (message as any).metadata === 'object') {
        // WebSocket metadata (already object)
        parsedMetadata = (message as any).metadata;
      }

      // Extract tool name from parsed metadata with fallbacks
      toolName = parsedMetadata.tool_name || parsedMetadata.name || 'unknown_tool';
    }

    // Fallback: extract tool name from message content if metadata is incomplete
    if (toolName === 'unknown_tool' && message.content) {
      if (message.content.includes('Starting formal brainspotting session')) {
        toolName = 'therapy_session_transition';
      } else if (message.content.includes('Recording stress level')) {
        toolName = 'therapy_session_record_suds';
      } else if (message.content.includes('Saving session data')) {
        toolName = 'therapy_session_set_field';
      } else if (message.content.startsWith('Called ')) {
        const match = message.content.match(/Called (.+)/);
        if (match) toolName = match[1];
      }
    }

    // Tool metadata parsing (debug logs removed to prevent console spam)

    const toolArgs = parsedMetadata.arguments || parsedMetadata.tool_args;
    const toolResult = parsedMetadata.tool_result;
    const toolStatus = parsedMetadata.status || (toolResult ? 'completed' : 'pending');
    const toolSuccess = parsedMetadata.success === true;
    const continuationContent = parsedMetadata.continuation;

    // Make tool names more user-friendly
    const displayToolName = toolName
      .replace(/_/g, ' ')
      .replace(/therapy session /gi, '')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Tool call debugging (logs removed to prevent console spam)

    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center my-4"
      >
        <div className="bg-slate-500/5 border border-slate-500/20 rounded-lg overflow-hidden w-full max-w-[600px] transition-all duration-200">
          <div
            className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-slate-500/10 transition-colors"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {toolStatus === 'pending' || toolStatus === 'executing' ? (
              <CheckCircle2 className="w-4 h-4 text-gray-400 animate-pulse" />
            ) : toolSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-red-400" />
            )}
            <span className="font-mono text-slate-300 text-sm">{displayToolName}</span>
            <span className={`text-xs ml-auto ${
              toolStatus === 'pending' ? 'text-yellow-400' :
              toolStatus === 'executing' ? 'text-yellow-400' :
              toolSuccess ? 'text-green-400' : 'text-red-400'
            }`}>
              {toolStatus === 'pending' ? '⏳' :
               toolStatus === 'executing' ? '⏳' :
               toolSuccess ? '✓' : '✗'}
            </span>
            <span className={`text-slate-400 text-xs ml-1 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </div>
          
          {/* Smooth animated expandable content */}
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: isExpanded ? 'auto' : 0, 
              opacity: isExpanded ? 1 : 0 
            }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 border-t border-slate-500/10">
              {/* Show continuation content prominently for therapy session transitions */}
              {continuationContent && toolName === 'therapy_session_transition' && (
                <div className="mb-4">
                  <div className="text-xs text-slate-300/60 mb-2">🚀 Therapy Session Start:</div>
                  <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 p-3 rounded-lg">
                    <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {continuationContent}
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-3">
                <div className="text-xs text-slate-300/60 mb-1">Request:</div>
                <pre className="text-xs bg-black/20 p-2 rounded overflow-x-auto max-w-full text-slate-300/80 break-words">
                  {toolArgs ? JSON.stringify(toolArgs, null, 2) : 'No arguments data'}
                </pre>
              </div>

              <div>
                <div className="text-xs text-slate-300/60 mb-1">Response:</div>
                <pre className="text-xs bg-black/20 p-2 rounded overflow-x-auto max-w-full text-slate-300/80 break-words">
                  {toolResult ? JSON.stringify(toolResult, null, 2) : 'No result data'}
                </pre>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    );
  }

  // Handle edit actions
  const handleSaveEdit = () => {
    if (onEdit && editContent.trim() !== message.content) {
      onEdit(message.id || '', editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content || '');
    setIsEditing(false);
  };

  // Regular messages - ChatGPT-style with proper alignment
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-4 group flex ${isCoach ? 'justify-start' : 'justify-end'}`}
    >
      <div className={`
        max-w-[75%] rounded-xl p-4 relative
        ${isCoach
          ? 'bg-white/5 border border-white/10'
          : 'bg-blue-600/20 border border-blue-500/30'
        }
      `}>
        {/* Role indicator with edit button */}
        <div className="flex items-center justify-between mb-2">
          <div className={`text-xs font-medium ${isCoach ? 'text-white/70' : 'text-blue-200'}`}>
            {isCoach ? 'Brainspotting Coach' : 'You'}
          </div>
          
          {/* Edit button for user messages (ChatGPT style) */}
          {!isCoach && !isEditing && onEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded"
              title="Edit message"
            >
              <Edit3 className="w-3 h-3 text-white/60" />
            </button>
          )}
        </div>
        
        {/* Message content - editable for user messages */}
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-black/30 border border-white/30 rounded-lg p-3 text-white/90 resize-none focus:outline-none focus:border-slate-400"
              rows={Math.max(2, (editContent.match(/\n/g) || []).length + 1)}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded text-xs text-white font-medium"
              >
                <Check className="w-3 h-3" />
                Save & regenerate
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 rounded text-xs text-white"
              >
                <X className="w-3 h-3" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className={`leading-relaxed whitespace-pre-wrap ${isCoach ? 'text-white/90' : 'text-white/95'}`}>
            {message.content}
          </div>
        )}
        
        {/* Timestamp - minimal */}
        {!isEditing && (message as any).created_at && (
          <div className={`text-xs mt-2 ${isCoach ? 'text-white/40' : 'text-blue-200/60'}`}>
            {new Date((message as any).created_at).toLocaleTimeString()}
          </div>
        )}
      </div>
    </motion.div>
  );
};