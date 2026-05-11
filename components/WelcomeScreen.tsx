'use client';

import { AgentMode } from '@/lib/types';
import { getMode, QUICK_COMMANDS } from '@/lib/agent-config';
import { Cpu, Zap, Sparkles, ArrowRight } from 'lucide-react';

interface WelcomeScreenProps {
  currentMode: AgentMode;
  onQuickCommand: (prompt: string) => void;
  onModeClick: () => void;
}

export default function WelcomeScreen({
  currentMode,
  onQuickCommand,
  onModeClick,
}: WelcomeScreenProps) {
  const modeConfig = getMode(currentMode);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 overflow-y-auto">
      {/* Logo / Hero */}
      <div className="relative mb-8 flex flex-col items-center">
        {/* Orbit rings */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div
            className="orbit-ring"
            style={{ width: '80px', height: '80px', animationDuration: '6s' }}
          />
          <div
            className="orbit-ring"
            style={{
              width: '60px',
              height: '60px',
              animationDuration: '4s',
              animationDirection: 'reverse',
              borderColor: 'rgba(139, 92, 246, 0.2)',
            }}
          />

          {/* Core */}
          <div
            className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
              boxShadow:
                '0 0 30px rgba(99, 102, 241, 0.6), 0 0 60px rgba(99, 102, 241, 0.2)',
            }}
          >
            <Cpu size={28} className="text-white" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mt-6">
          <h1 className="text-4xl font-black tracking-tight">
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(135deg, #e2e8f0 0%, #a5b8fd 50%, #67e8f9 100%)',
              }}
            >
              NEXUS
            </span>
          </h1>
          <p className="text-surface-400 text-sm mt-1 font-medium tracking-wide uppercase">
            Your AI Assistant & Engineering Agent
          </p>
        </div>
      </div>

      {/* Current Mode Badge */}
      <button
        onClick={onModeClick}
        id="welcome-mode-badge"
        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8 transition-all hover:scale-105"
        style={{
          background: `rgba(${hexToRgb(modeConfig.color)}, 0.1)`,
          border: `1px solid rgba(${hexToRgb(modeConfig.color)}, 0.3)`,
          color: modeConfig.color,
          boxShadow: `0 0 20px rgba(${hexToRgb(modeConfig.color)}, 0.1)`,
        }}
      >
        <span>{modeConfig.icon}</span>
        <span>{modeConfig.name} Mode Active</span>
        <span className="text-xs opacity-60">· Click to change</span>
      </button>

      {/* Capabilities */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xl mb-8">
        {CAPABILITIES.map((cap, i) => (
          <div
            key={i}
            className="text-center px-3 py-3 rounded-xl"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(99, 102, 241, 0.1)',
            }}
          >
            <div className="text-xl mb-1">{cap.icon}</div>
            <p className="text-xs font-medium text-surface-400">{cap.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Commands */}
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={14} className="text-surface-500" />
          <p className="text-xs font-medium text-surface-500 uppercase tracking-wider">
            Try These
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_COMMANDS.slice(0, 6).map((cmd, i) => (
            <button
              key={i}
              onClick={() => onQuickCommand(cmd.prompt)}
              id={`welcome-cmd-${i}`}
              className="flex items-center gap-3 p-3 rounded-xl text-left text-sm group transition-all duration-200"
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(99, 102, 241, 0.1)',
                color: '#94a3b8',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.25)';
                e.currentTarget.style.color = '#e2e8f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.1)';
                e.currentTarget.style.color = '#94a3b8';
              }}
            >
              <span className="text-xl flex-shrink-0">{cmd.icon}</span>
              <span className="font-medium text-xs flex-1">{cmd.label}</span>
              <ArrowRight
                size={12}
                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-surface-700 text-center mt-8 max-w-md">
        NEXUS is your all-in-one AI — chat naturally, ask questions, get answers. Switch to Build Mode when you want to create apps, websites, and more.
        Powered by{' '}
        <span className="text-surface-600">Groq LLaMA 3.3 · 10 Specialized Modes</span>
      </p>
    </div>
  );
}

const CAPABILITIES = [
  { icon: '💬', label: 'General Chat' },
  { icon: '🏗️', label: 'Build Apps' },
  { icon: '🤖', label: 'AI Integration' },
  { icon: '🎨', label: 'UI/UX Design' },
  { icon: '🧠', label: 'Learn Anything' },
  { icon: '⚡', label: 'Code & Debug' },
];

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '99, 102, 241';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}
