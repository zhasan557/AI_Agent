'use client';

import { useState, useEffect } from 'react';
import { Conversation, AgentMode } from '@/lib/types';
import { AGENT_MODES, getMode } from '@/lib/agent-config';
import { formatTime, createConversation } from '@/lib/storage';
import {
  MessageSquare,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Zap,
} from 'lucide-react';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: (mode?: AgentMode) => void;
  onDeleteConversation: (id: string) => void;
  currentMode: AgentMode;
}

export default function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  currentMode,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const currentModeConfig = getMode(currentMode);

  return (
    <aside
      className="relative flex flex-col h-full transition-all duration-300"
      style={{
        width: collapsed ? '60px' : '280px',
        minWidth: collapsed ? '60px' : '280px',
        background: 'rgba(2, 6, 23, 0.95)',
        borderRight: '1px solid rgba(99, 102, 241, 0.12)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div
              className="relative w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 0 15px rgba(99, 102, 241, 0.5)',
              }}
            >
              <Cpu size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-wide">NEXUS</p>
              <p className="text-[10px] text-surface-500 uppercase tracking-widest">AI Agent</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <Cpu size={16} className="text-white" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1.5 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-white/5 transition-all"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={() => onNewConversation()}
          id="new-chat-btn"
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1))',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            color: '#a5b8fd',
          }}
          title="New Conversation"
        >
          <Plus size={16} />
          {!collapsed && <span>New Conversation</span>}
        </button>
      </div>

      {/* Conversations List */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto sidebar-scroll px-2 py-1 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center py-8 px-3">
              <MessageSquare size={28} className="text-surface-700 mx-auto mb-2" />
              <p className="text-xs text-surface-600">No conversations yet</p>
              <p className="text-xs text-surface-700 mt-1">Start a new chat above</p>
            </div>
          ) : (
            conversations
              .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
              .map((conv) => {
                const modeConfig = getMode(conv.mode);
                const isActive = conv.id === activeConversationId;
                const isHovered = conv.id === hoveredId;

                return (
                  <div
                    key={conv.id}
                    className="relative group"
                    onMouseEnter={() => setHoveredId(conv.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <button
                      onClick={() => onSelectConversation(conv.id)}
                      id={`conv-${conv.id}`}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all duration-200"
                      style={{
                        background: isActive
                          ? `rgba(${hexToRgb(modeConfig.color)}, 0.1)`
                          : isHovered
                          ? 'rgba(255, 255, 255, 0.04)'
                          : 'transparent',
                        border: isActive
                          ? `1px solid rgba(${hexToRgb(modeConfig.color)}, 0.3)`
                          : '1px solid transparent',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-base">{modeConfig.icon}</span>
                        <span
                          className="font-medium text-xs truncate flex-1"
                          style={{ color: isActive ? '#e2e8f0' : '#94a3b8' }}
                        >
                          {conv.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 ml-6">
                        <span className="text-[10px] text-surface-600">
                          {formatTime(conv.updatedAt)}
                        </span>
                        <span className="text-[10px] text-surface-700">·</span>
                        <span className="text-[10px] text-surface-600">
                          {conv.messages.length} msgs
                        </span>
                      </div>
                    </button>

                    {/* Delete Button */}
                    {isHovered && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(conv.id);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' }}
                        id={`delete-conv-${conv.id}`}
                        title="Delete conversation"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* Footer — Agent Status */}
      {!collapsed && (
        <div
          className="p-3 border-t border-white/5"
          style={{ background: 'rgba(2, 6, 23, 0.5)' }}
        >
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="relative flex items-center">
              <div
                className="w-2 h-2 rounded-full status-pulse"
                style={{ background: '#10b981', color: '#10b981' }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-surface-400 truncate">
                <span style={{ color: currentModeConfig.color }}>
                  {currentModeConfig.icon} {currentModeConfig.name}
                </span>
                {' '}mode active
              </p>
              <p className="text-[10px] text-surface-600">llama-3.3-70b · groq</p>
            </div>
            <Zap size={12} className="text-surface-600 flex-shrink-0" />
          </div>
        </div>
      )}
    </aside>
  );
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '99, 102, 241';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}
