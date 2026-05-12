'use client';

import { AVAILABLE_MODELS, AIModel } from '@/lib/swarm';
import { ChevronDown, Zap, Cpu } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export default function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = AVAILABLE_MODELS.find(m => m.id === selectedModel) || AVAILABLE_MODELS[0];

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const qualityColor = {
    standard: '#10b981',
    high: '#3b82f6',
    premium: '#8b5cf6',
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-all hover:bg-white/5"
        style={{
          color: '#94a3b8',
          border: '1px solid rgba(99, 102, 241, 0.15)',
        }}
      >
        <Cpu size={10} />
        <span className="truncate max-w-[100px]">{current.name}</span>
        <ChevronDown size={10} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute bottom-full mb-2 right-0 w-64 rounded-xl overflow-hidden z-50"
          style={{
            background: 'rgba(15, 23, 42, 0.98)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: 'rgba(99, 102, 241, 0.1)' }}>
            <p className="text-xs font-semibold text-white">Select Model</p>
            <p className="text-[10px] text-surface-500">All models run on Groq infrastructure</p>
          </div>
          <div className="py-1">
            {AVAILABLE_MODELS.map(model => (
              <button
                key={model.id}
                onClick={() => { onModelChange(model.id); setIsOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all hover:bg-white/[0.04]"
                style={{
                  background: model.id === selectedModel ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-surface-200">{model.name}</span>
                    <span
                      className="text-[8px] px-1 py-0.5 rounded-full uppercase font-semibold"
                      style={{
                        background: `rgba(${hexToRgb(qualityColor[model.quality])}, 0.15)`,
                        color: qualityColor[model.quality],
                      }}
                    >
                      {model.quality}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-surface-500">{model.provider}</span>
                    <span className="text-[9px] text-surface-600">·</span>
                    <span className="text-[9px] text-surface-500">{(model.contextWindow / 1000).toFixed(0)}k ctx</span>
                    <span className="text-[9px] text-surface-600">·</span>
                    <span className="text-[9px] flex items-center gap-0.5" style={{ color: '#10b981' }}>
                      <Zap size={8} /> {model.speed}
                    </span>
                  </div>
                </div>
                {model.id === selectedModel && (
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#6366f1' }} />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '99, 102, 241';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}
