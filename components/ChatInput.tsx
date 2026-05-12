'use client';

import { useState, useRef, useEffect, KeyboardEvent, DragEvent } from 'react';
import { AgentMode } from '@/lib/types';
import { QUICK_COMMANDS, getMode } from '@/lib/agent-config';
import FileUpload, { AttachedFile } from './FileUpload';
import {
  Send,
  Square,
  Paperclip,
  Sparkles,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string, files?: AttachedFile[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  currentMode: AgentMode;
  onModeClick: () => void;
  disabled?: boolean;
  modelSelector?: React.ReactNode;
}

export default function ChatInput({
  onSend,
  onStop,
  isStreaming,
  currentMode,
  onModeClick,
  disabled = false,
  modelSelector,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [showQuickCommands, setShowQuickCommands] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    if ((!trimmed && attachedFiles.length === 0) || isStreaming) return;

    const message = trimmed || 'Analyze the attached file(s)';
    onSend(message, attachedFiles.length > 0 ? attachedFiles : undefined);
    setInput('');
    setAttachedFiles([]);
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

  // Drag & drop on the input area
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // FileUpload component handles file processing through its own handlers
  };

  const handlePaperclipClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const PARTIAL_THRESHOLD = 1 * 1024 * 1024; // 1MB

    const newFiles: AttachedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.size > MAX_SIZE) {
        // Show visible error via a temporary state or just alert
        alert(`⚠️ File "${file.name}" is too large (${(file.size / (1024*1024)).toFixed(1)}MB). Max: 10MB.\n\nFor large CSV datasets, use the ML Training Playground at /train.`);
        continue;
      }

      try {
        let content: string;
        const ext = getFileExtension(file.name);

        if (file.size > PARTIAL_THRESHOLD) {
          // Large file — read only first 500KB to get first 2000 lines
          const slice = file.slice(0, 512 * 1024);
          const partialText = await readFileContent(slice as any);
          const lines = partialText.split('\n').slice(0, 2000);
          content = lines.join('\n') + `\n\n[... FILE TRUNCATED: showing first ${lines.length} lines of ${(file.size / 1024).toFixed(0)}KB file ...]`;
        } else {
          content = await readFileContent(file);
        }

        newFiles.push({
          name: file.name,
          size: file.size,
          extension: ext,
          content,
          language: getLanguage(ext),
        });
      } catch {
        alert(`Failed to read: ${file.name}`);
      }
    }

    if (newFiles.length > 0) {
      setAttachedFiles((prev) => {
        const combined = [...prev, ...newFiles];
        return combined.slice(0, 5); // Max 5 files
      });
    }

    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const charCount = input.length;
  const isLong = charCount > 500;
  const canSend = input.trim() || attachedFiles.length > 0;

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

      {/* Hidden file input for paperclip button */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
        id="paperclip-file-input"
      />

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

          {/* Model Selector (Passed from parent) */}
          {modelSelector && (
            <div className="mr-2">
              {modelSelector}
            </div>
          )}

          {/* Attach File Button */}
          <button
            onClick={handlePaperclipClick}
            id="attach-file-btn"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all"
            style={{
              color: attachedFiles.length > 0 ? '#a5b8fd' : '#64748b',
              background: attachedFiles.length > 0 ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              border: `1px solid ${attachedFiles.length > 0 ? 'rgba(99, 102, 241, 0.3)' : 'transparent'}`,
            }}
            title="Attach files (text, code, JSON, CSV, etc.)"
          >
            <Paperclip size={12} />
            <span>Attach</span>
            {attachedFiles.length > 0 && (
              <span
                className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold"
                style={{
                  background: 'rgba(99, 102, 241, 0.3)',
                  color: '#c7d7fe',
                }}
              >
                {attachedFiles.length}
              </span>
            )}
          </button>

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

        {/* Attached Files Preview */}
        {attachedFiles.length > 0 && (
          <div className="px-4 pt-3">
            <FileUpload
              attachedFiles={attachedFiles}
              onFilesChange={setAttachedFiles}
              disabled={disabled}
            />
          </div>
        )}

        {/* Textarea */}
        <div className="px-4 py-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              attachedFiles.length > 0
                ? 'What would you like to do with the attached file(s)?'
                : `Ask NEXUS to ${getPlaceholder(currentMode)}...`
            }
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

          {/* File count */}
          {attachedFiles.length > 0 && (
            <span className="text-xs text-brand-400">
              📎 {attachedFiles.length} file{attachedFiles.length > 1 ? 's' : ''} attached
            </span>
          )}

          <div className="flex-1" />

          {/* Keyboard hint */}
          {canSend && !isStreaming && (
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
              disabled={!canSend || disabled}
              id="send-btn"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background:
                  canSend
                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                    : 'rgba(255, 255, 255, 0.04)',
                border: canSend
                  ? 'none'
                  : '1px solid rgba(255, 255, 255, 0.06)',
                color: canSend ? 'white' : '#475569',
                boxShadow: canSend ? '0 4px 15px rgba(99, 102, 241, 0.4)' : 'none',
                cursor: canSend ? 'pointer' : 'not-allowed',
                transform: canSend ? 'none' : 'scale(0.98)',
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
        NEXUS can make mistakes. Verify important information. Drop files anywhere to attach.
      </p>
    </div>
  );
}

// ===========================
// Helpers
// ===========================
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
    training: 'train an ML model — describe your task or upload data',
  };
  return placeholders[mode] || 'ask anything or build something amazing';
}

function readFileContent(file: globalThis.File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function getFileExtension(name: string): string {
  const lastDot = name.lastIndexOf('.');
  if (lastDot === -1) return '';
  return name.substring(lastDot).toLowerCase();
}

function getLanguage(ext: string): string {
  const langMap: Record<string, string> = {
    '.js': 'javascript', '.jsx': 'javascript',
    '.ts': 'typescript', '.tsx': 'typescript',
    '.py': 'python', '.java': 'java',
    '.cpp': 'cpp', '.c': 'c',
    '.go': 'go', '.rs': 'rust',
    '.html': 'html', '.css': 'css',
    '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml',
    '.md': 'markdown', '.txt': 'text',
    '.csv': 'csv', '.sql': 'sql',
    '.sh': 'bash', '.xml': 'xml',
  };
  return langMap[ext] || 'text';
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '99, 102, 241';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}
