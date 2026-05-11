'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { AgentMode } from '@/lib/types';
import { QUICK_COMMANDS, getMode } from '@/lib/agent-config';
import {
  Send,
  Square,
  Mic,
  Paperclip,
  Sparkles,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  currentMode: AgentMode;
  onModeClick: () => void;
  disabled?: boolean;
}

export default function ChatInput({
  onSend,
  onStop,
  isStreaming,
  currentMode,
  onModeClick,
  disabled,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [showQuickCommands, setShowQuickCommands] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modeConfig = getMode(currentMode);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setInput('');
    setShowQuickCommands(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickCommand = (prompt: string) => {
    setInput(prompt);
    setShowQuickCommands(false);
    textareaRef.current?.focus();
  };

  const charCount = input.length;
  const isLong = charCount > 500;

  return (
    <div className="relative">
      {/* Quick Commands Panel */}
      {showQuickCommands && (
        <div
          className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl p-3 grid grid-cols-2 gap-2 z-10 animate-slide-up"
          style={{
            background: 'rgba(15, 23, 42, 0.97)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.3)',
          }}
        >
          {QUICK_COMMANDS.map((cmd, i) => (
            <button
              key={i}
              onClick={() => handleQuickCommand(cmd.prompt)}
              id={`quick-cmd-${i}`}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-sm transition-all duration-150 hover:scale-[1.01]"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(99, 102, 241, 0.1)',
                color: '#94a3b8',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                e.currentTarget.style.color = '#e2e8f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.1)';
                e.currentTarget.style.color = '#94a3b8';
              }}
            >
              <span className="text-base">{cmd.icon}</span>
              <span className="font-medium truncate">{cmd.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Input Container */}
      <div
        className="rounded-2xl transition-all duration-200"
        style={{
          background: 'rgba(15, 23, 42, 0.9)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          boxShadow: input
            ? '0 0 0 3px rgba(99, 102, 241, 0.08), 0 8px 30px rgba(0, 0, 0, 0.2)'
            : '0 4px 20px rgba(0, 0, 0, 0.2)',
        }}
      >
        {/* Top Bar — Mode & Actions */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-white/5">
          {/* Mode Badge */}
          <button
            onClick={onModeClick}
            id="mode-toggle-btn"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150"
            style={{
              background: `rgba(${hexToRgb(modeConfig.color)}, 0.1)`,
              border: `1px solid rgba(${hexToRgb(modeConfig.color)}, 0.25)`,
              color: modeConfig.color,
            }}
            title="Change agent mode"
          >
            <span>{modeConfig.icon}</span>
            <span>{modeConfig.name}</span>
          </button>

          <div className="flex-1" />

          {/* Quick Commands Toggle */}
          <button
            onClick={() => setShowQuickCommands(!showQuickCommands)}
            id="quick-commands-toggle"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all"
            style={{
              color: showQuickCommands ? '#a5b8fd' : '#64748b',
              background: showQuickCommands ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              border: `1px solid ${showQuickCommands ? 'rgba(99, 102, 241, 0.3)' : 'transparent'}`,
            }}
            title="Quick commands"
          >
            <Sparkles size={12} />
            <span>Quick</span>
            {showQuickCommands ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
          </button>
        </div>

        {/* Textarea */}
        <div className="px-4 py-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask NEXUS to ${getPlaceholder(currentMode)}...`}
            id="chat-input"
            disabled={disabled}
            rows={1}
            className="w-full bg-transparent text-sm text-surface-100 placeholder-surface-600 resize-none outline-none leading-relaxed"
            style={{ minHeight: '24px', maxHeight: '180px' }}
          />
        </div>

        {/* Bottom Bar — Actions */}
        <div className="flex items-center gap-2 px-4 pb-3">
          {/* Char count */}
          {isLong && (
            <span className="text-xs text-surface-600">
              {charCount.toLocaleString()} chars
            </span>
          )}

          <div className="flex-1" />

          {/* Keyboard hint */}
          {input && !isStreaming && (
            <span className="text-[10px] text-surface-700 hidden sm:block">
              Enter to send · Shift+Enter for newline
            </span>
          )}

          {/* Send / Stop Button */}
          {isStreaming ? (
            <button
              onClick={onStop}
              id="stop-btn"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
              }}
            >
              <Square size={13} fill="currentColor" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || disabled}
              id="send-btn"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background:
                  input.trim()
                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                    : 'rgba(255, 255, 255, 0.04)',
                border: input.trim()
                  ? 'none'
                  : '1px solid rgba(255, 255, 255, 0.06)',
                color: input.trim() ? 'white' : '#475569',
                boxShadow: input.trim() ? '0 4px 15px rgba(99, 102, 241, 0.4)' : 'none',
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                transform: input.trim() ? 'none' : 'scale(0.98)',
              }}
            >
              <Send size={14} />
              <span>Send</span>
            </button>
          )}
        </div>
      </div>

      {/* Helper text */}
      <p className="text-center text-[10px] text-surface-700 mt-2">
        NEXUS can make mistakes. Verify important information.
      </p>
    </div>
  );
}

function getPlaceholder(mode: AgentMode): string {
  const placeholders: Record<AgentMode, string> = {
    chat: 'ask anything — chat, learn, explore',
    autonomous: 'build a complete full-stack application',
    coding: 'write production-ready code for',
    debugging: 'debug and fix this issue',
    design: 'design a stunning UI for',
    devops: 'set up deployment infrastructure for',
    research: 'research AI architectures for',
    security: 'audit security vulnerabilities in',
    optimization: 'optimize the performance of',
    prompt: 'engineer the perfect prompt for',
  };
  return placeholders[mode] || 'ask anything or build something amazing';
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '99, 102, 241';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}
