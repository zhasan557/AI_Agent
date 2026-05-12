'use client';

import { SubAgent, TaskPlan } from '@/lib/swarm';
import { ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SwarmPanelProps {
  agents: SubAgent[];
  complexity: string;
  isVisible: boolean;
}

export default function SwarmPanel({ agents, complexity, isVisible }: SwarmPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [animatedAgents, setAnimatedAgents] = useState<SubAgent[]>([]);

  // Stagger agent appearance
  useEffect(() => {
    if (!isVisible || agents.length === 0) {
      setAnimatedAgents([]);
      return;
    }
    setAnimatedAgents([]);
    agents.forEach((agent, i) => {
      setTimeout(() => {
        setAnimatedAgents(prev => [...prev, agent]);
      }, i * 150);
    });
  }, [agents, isVisible]);

  if (!isVisible || agents.length <= 1) return null;

  const activeCount = agents.filter(a => a.status === 'active').length;
  const completeCount = agents.filter(a => a.status === 'complete').length;

  const complexityColor = {
    simple: '#10b981',
    moderate: '#3b82f6',
    complex: '#f97316',
    enterprise: '#ef4444',
  }[complexity] || '#6366f1';

  return (
    <div
      className="mx-4 mb-3 rounded-xl overflow-hidden transition-all duration-300"
      style={{
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(99, 102, 241, 0.15)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all hover:bg-white/[0.02]"
      >
        <div className="relative flex items-center">
          <Activity size={14} style={{ color: complexityColor }} className="animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white">🐝 Swarm Active</span>
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full font-medium uppercase"
              style={{
                background: `rgba(${hexToRgb(complexityColor)}, 0.15)`,
                color: complexityColor,
                border: `1px solid rgba(${hexToRgb(complexityColor)}, 0.3)`,
              }}
            >
              {complexity}
            </span>
          </div>
          <p className="text-[10px] text-surface-500 mt-0.5">
            {agents.length} agents · {activeCount} active · {completeCount} complete
          </p>
        </div>
        {collapsed ? (
          <ChevronDown size={14} className="text-surface-500" />
        ) : (
          <ChevronUp size={14} className="text-surface-500" />
        )}
      </button>

      {/* Agent List */}
      {!collapsed && (
        <div className="px-3 pb-3 space-y-1">
          {animatedAgents.map((agent, i) => (
            <div
              key={agent.id}
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-300"
              style={{
                background: agent.status === 'active'
                  ? 'rgba(99, 102, 241, 0.08)'
                  : agent.status === 'complete'
                  ? 'rgba(16, 185, 129, 0.05)'
                  : 'rgba(255, 255, 255, 0.02)',
                border: agent.status === 'active'
                  ? '1px solid rgba(99, 102, 241, 0.2)'
                  : '1px solid transparent',
                animation: `fadeSlideIn 0.3s ease-out`,
              }}
            >
              <span className="text-sm flex-shrink-0">{agent.icon}</span>
              <div className="flex-1 min-w-0">
                <span className="text-surface-300 font-medium">{agent.name}</span>
                <span className="text-surface-600 ml-1.5 truncate text-[10px]">{agent.task}</span>
              </div>
              <StatusDot status={agent.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: SubAgent['status'] }) {
  const colors = {
    pending: '#64748b',
    active: '#6366f1',
    complete: '#10b981',
    error: '#ef4444',
  };
  const color = colors[status];
  return (
    <div className="flex items-center gap-1">
      <div
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{
          background: color,
          boxShadow: status === 'active' ? `0 0 6px ${color}` : 'none',
          animation: status === 'active' ? 'pulse 2s ease-in-out infinite' : 'none',
        }}
      />
      <span className="text-[9px] text-surface-600 capitalize">{status}</span>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '99, 102, 241';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}
