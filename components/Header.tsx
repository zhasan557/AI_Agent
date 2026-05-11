'use client';

import { AgentMode } from '@/lib/types';
import { getMode } from '@/lib/agent-config';
import { AGENT_MODES } from '@/lib/agent-config';
import {
  Settings,
  Share2,
  Download,
  RotateCcw,
  Info,
  ChevronDown,
} from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  currentMode: AgentMode;
  onModeClick: () => void;
  onClearChat: () => void;
  conversationTitle: string;
  messageCount: number;
  isStreaming: boolean;
}

export default function Header({
  currentMode,
  onModeClick,
  onClearChat,
  conversationTitle,
  messageCount,
  isStreaming,
}: HeaderProps) {
  const [showInfo, setShowInfo] = useState(false);
  const modeConfig = getMode(currentMode);

  return (
    <header
      className="flex items-center gap-3 px-5 py-3 border-b"
      style={{
        background: 'rgba(2, 6, 23, 0.9)',
        borderColor: 'rgba(99, 102, 241, 0.1)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Title */}
      <div className="flex-1 min-w-0">
        <h2
          className="text-sm font-semibold text-surface-200 truncate"
          id="conversation-title"
        >
          {conversationTitle || 'New Conversation'}
        </h2>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-surface-600">
            {messageCount > 0 ? `${messageCount} messages` : 'Start typing...'}
          </span>
          {isStreaming && (
            <>
              <span className="text-[10px] text-surface-700">·</span>
              <span
                className="text-[10px] font-medium animate-pulse"
                style={{ color: modeConfig.color }}
              >
                ● Generating...
              </span>
            </>
          )}
        </div>
      </div>

      {/* Mode Switcher */}
      <button
        onClick={onModeClick}
        id="header-mode-btn"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
        style={{
          background: `rgba(${hexToRgb(modeConfig.color)}, 0.1)`,
          border: `1px solid rgba(${hexToRgb(modeConfig.color)}, 0.25)`,
          color: modeConfig.color,
        }}
        title="Switch agent mode"
      >
        <span>{modeConfig.icon}</span>
        <span className="hidden sm:inline">{modeConfig.name}</span>
        <ChevronDown size={11} />
      </button>

      {/* Clear Chat */}
      {messageCount > 0 && (
        <button
          onClick={onClearChat}
          id="clear-chat-btn"
          className="p-2 rounded-lg text-surface-600 hover:text-surface-300 hover:bg-white/5 transition-all"
          title="Clear conversation"
        >
          <RotateCcw size={15} />
        </button>
      )}

      {/* Info Panel Toggle */}
      <div className="relative">
        <button
          onClick={() => setShowInfo(!showInfo)}
          id="info-btn"
          className="p-2 rounded-lg text-surface-600 hover:text-surface-300 hover:bg-white/5 transition-all"
          title="Agent information"
        >
          <Info size={15} />
        </button>

        {showInfo && (
          <div
            className="absolute top-full right-0 mt-2 w-72 rounded-xl p-4 z-20 animate-slide-up"
            style={{
              background: 'rgba(15, 23, 42, 0.98)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
            }}
          >
            <h3 className="text-sm font-bold text-white mb-3">NEXUS Agent Info</h3>
            <div className="space-y-2">
              <InfoRow label="Model" value="LLaMA 3.3 70B" />
              <InfoRow label="Provider" value="Groq (fast inference)" />
              <InfoRow label="Max Tokens" value="8,192 tokens" />
              <InfoRow label="Streaming" value="Enabled (SSE)" />
              <InfoRow label="Modes" value={`${AGENT_MODES.length} specialized`} />
              <InfoRow
                label="Current Mode"
                value={`${modeConfig.icon} ${modeConfig.name}`}
              />
            </div>
            <div
              className="mt-3 pt-3 border-t text-xs text-surface-600"
              style={{ borderColor: 'rgba(99, 102, 241, 0.1)' }}
            >
              {modeConfig.description}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-surface-500">{label}</span>
      <span className="text-xs font-medium text-surface-300">{value}</span>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '99, 102, 241';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}
