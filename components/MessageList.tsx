'use client';

import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message } from '@/lib/types';
import { getMode } from '@/lib/agent-config';
import { Copy, Check, User, Bot } from 'lucide-react';
import { useState } from 'react';

interface MessageListProps {
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
}

export default function MessageList({
  messages,
  isStreaming,
  streamingContent,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id}
          message={message}
          isLast={index === messages.length - 1}
        />
      ))}

      {/* Streaming message */}
      {isStreaming && streamingContent && (
        <MessageBubble
          message={{
            id: 'streaming',
            role: 'assistant',
            content: streamingContent,
            timestamp: new Date(),
            status: 'streaming',
          }}
          isLast={true}
          isStreaming={true}
        />
      )}

      {/* Typing indicator when no content yet */}
      {isStreaming && !streamingContent && (
        <div className="flex gap-4 animate-fade-in">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)',
            }}
          >
            <Bot size={18} className="text-white" />
          </div>
          <div
            className="px-4 py-3 rounded-2xl rounded-tl-sm"
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(99, 102, 241, 0.15)',
            }}
          >
            <div className="typing-dots flex gap-1.5 py-1">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  isLast: boolean;
  isStreaming?: boolean;
}

function MessageBubble({ message, isLast, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const modeConfig = message.mode ? getMode(message.mode) : null;

  return (
    <div
      className={`flex gap-4 animate-fade-in ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={
          isUser
            ? {
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
              }
            : {
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)',
              }
        }
      >
        {isUser ? (
          <User size={16} className="text-brand-400" />
        ) : (
          <Bot size={18} className="text-white" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-[85%] ${isUser ? 'flex flex-col items-end' : ''}`}>
        {/* Header */}
        <div className={`flex items-center gap-2 mb-1.5 ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="text-xs font-semibold text-surface-400">
            {isUser ? 'You' : 'NEXUS'}
          </span>
          {modeConfig && !isUser && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{
                background: `rgba(${hexToRgb(modeConfig.color)}, 0.15)`,
                color: modeConfig.color,
                border: `1px solid rgba(${hexToRgb(modeConfig.color)}, 0.3)`,
              }}
            >
              {modeConfig.icon} {modeConfig.name}
            </span>
          )}
          <span className="text-[10px] text-surface-700">
            {formatTime(message.timestamp)}
          </span>
        </div>

        {/* Bubble */}
        {isUser ? (
          <div
            className="px-4 py-3 rounded-2xl rounded-tr-sm text-sm"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.15))',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              color: '#e2e8f0',
              maxWidth: '100%',
              wordBreak: 'break-word',
            }}
          >
            {message.content}
          </div>
        ) : (
          <div
            className="px-5 py-4 rounded-2xl rounded-tl-sm"
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(99, 102, 241, 0.12)',
              width: '100%',
            }}
          >
            <div className={`prose-agent ${isStreaming ? 'streaming-cursor' : ''}`}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');
                    const isInline = !match && !codeString.includes('\n');

                    if (isInline) {
                      return <code className={className} {...props}>{children}</code>;
                    }

                    return (
                      <CodeBlock
                        code={codeString}
                        language={match ? match[1] : 'text'}
                      />
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>

            {/* Token usage */}
            {message.metadata?.tokensUsed && (
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-3">
                <span className="text-[10px] text-surface-700">
                  ~{message.metadata.tokensUsed} tokens
                </span>
                {message.metadata.processingTime && (
                  <span className="text-[10px] text-surface-700">
                    {(message.metadata.processingTime / 1000).toFixed(1)}s
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3">
      <div
        className="flex items-center justify-between px-4 py-2 rounded-t-xl"
        style={{
          background: 'rgba(2, 6, 23, 0.9)',
          borderBottom: '1px solid rgba(99, 102, 241, 0.15)',
        }}
      >
        <span className="text-xs font-mono text-surface-500">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-300 transition-colors"
        >
          {copied ? (
            <>
              <Check size={12} className="text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: '0 0 12px 12px',
          background: 'rgba(2, 6, 23, 0.9)',
          border: '1px solid rgba(99, 102, 241, 0.15)',
          borderTop: 'none',
          fontSize: '0.82rem',
          lineHeight: '1.6',
        }}
        showLineNumbers={code.split('\n').length > 5}
        lineNumberStyle={{ color: 'rgba(99, 102, 241, 0.3)', fontSize: '0.75rem' }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '99, 102, 241';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}
