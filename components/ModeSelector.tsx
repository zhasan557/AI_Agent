'use client';

import { AgentMode, ModeConfig } from '@/lib/types';
import { AGENT_MODES } from '@/lib/agent-config';
import { X } from 'lucide-react';

interface ModeSelectorProps {
  currentMode: AgentMode;
  onModeChange: (mode: AgentMode) => void;
  onClose: () => void;
}

export default function ModeSelector({
  currentMode,
  onModeChange,
  onClose,
}: ModeSelectorProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl p-6 animate-slide-up"
        style={{
          background: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(99, 102, 241, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Select Agent Mode</h2>
            <p className="text-sm text-surface-500 mt-0.5">
              Choose the specialized AI mode for your task
            </p>
          </div>
          <button
            onClick={onClose}
            id="close-mode-selector"
            className="p-2 rounded-xl text-surface-500 hover:text-white hover:bg-white/5 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Grid */}
        <div className="grid grid-cols-3 gap-3">
          {AGENT_MODES.map((mode) => (
            <ModeCard
              key={mode.id}
              mode={mode}
              isActive={currentMode === mode.id}
              onClick={() => {
                onModeChange(mode.id as AgentMode);
                onClose();
              }}
            />
          ))}
        </div>

        {/* Footer Note */}
        <p className="text-xs text-surface-600 text-center mt-4">
          Each mode uses a specialized system prompt optimized for that task
        </p>
      </div>
    </div>
  );
}

function ModeCard({
  mode,
  isActive,
  onClick,
}: {
  mode: ModeConfig;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      id={`mode-${mode.id}`}
      className="mode-card text-left p-4 rounded-xl transition-all duration-200"
      style={{
        background: isActive
          ? `rgba(${hexToRgb(mode.color)}, 0.12)`
          : 'rgba(255, 255, 255, 0.02)',
        border: isActive
          ? `1px solid rgba(${hexToRgb(mode.color)}, 0.4)`
          : '1px solid rgba(255, 255, 255, 0.06)',
        boxShadow: isActive
          ? `0 0 20px rgba(${hexToRgb(mode.color)}, 0.15)`
          : 'none',
      }}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{mode.icon}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="text-sm font-semibold text-white">{mode.name}</span>
            {isActive && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{
                  background: `rgba(${hexToRgb(mode.color)}, 0.2)`,
                  color: mode.color,
                  border: `1px solid rgba(${hexToRgb(mode.color)}, 0.3)`,
                }}
              >
                Active
              </span>
            )}
          </div>
          <p className="text-xs text-surface-500 leading-relaxed line-clamp-2">
            {mode.description}
          </p>
        </div>
      </div>
    </button>
  );
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '99, 102, 241';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}
