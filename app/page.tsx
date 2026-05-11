'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Conversation, Message, AgentMode } from '@/lib/types';
import {
  loadConversations,
  saveConversations,
  createConversation,
  createMessage,
  generateTitle,
} from '@/lib/storage';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import MessageList from '@/components/MessageList';
import ChatInput from '@/components/ChatInput';
import WelcomeScreen from '@/components/WelcomeScreen';
import ModeSelector from '@/components/ModeSelector';
import toast from 'react-hot-toast';

export default function HomePage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [currentMode, setCurrentMode] = useState<AgentMode>('autonomous');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);

  // Load conversations from storage
  useEffect(() => {
    const stored = loadConversations();
    setConversations(stored);
  }, []);

  // Save conversations whenever they change
  useEffect(() => {
    if (conversations.length > 0) {
      saveConversations(conversations);
    }
  }, [conversations]);

  // Get active conversation
  const activeConversation = conversations.find((c) => c.id === activeConvId) || null;

  // ===========================
  // Conversation Management
  // ===========================
  const handleNewConversation = useCallback((mode?: AgentMode) => {
    const newConv = createConversation(mode || currentMode);
    setConversations((prev) => [newConv, ...prev]);
    setActiveConvId(newConv.id);
    setStreamingContent('');
  }, [currentMode]);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConvId(id);
    setStreamingContent('');
    if (isStreaming) {
      abortControllerRef.current?.abort();
      setIsStreaming(false);
    }
  }, [isStreaming]);

  const handleDeleteConversation = useCallback((id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConvId === id) {
      setActiveConvId(null);
    }
    toast.success('Conversation deleted');
  }, [activeConvId]);

  const handleClearChat = useCallback(() => {
    if (!activeConvId) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConvId
          ? { ...c, messages: [], title: 'New Conversation', updatedAt: new Date() }
          : c
      )
    );
    toast.success('Chat cleared');
  }, [activeConvId]);

  const handleModeChange = useCallback((mode: AgentMode) => {
    setCurrentMode(mode);
    // Update active conversation's mode too
    if (activeConvId) {
      setConversations((prev) =>
        prev.map((c) => (c.id === activeConvId ? { ...c, mode } : c))
      );
    }
  }, [activeConvId]);

  // ===========================
  // Send Message & Stream
  // ===========================
  const handleSend = useCallback(async (content: string) => {
    if (isStreaming) return;

    // Create conversation if none active
    let convId = activeConvId;
    let conv = activeConversation;

    if (!convId || !conv) {
      const newConv = createConversation(currentMode);
      setConversations((prev) => [newConv, ...prev]);
      setActiveConvId(newConv.id);
      convId = newConv.id;
      conv = newConv;
    }

    // Create user message
    const userMsg = createMessage('user', content, currentMode);

    // Add user message to conversation
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId) return c;
        const updated = {
          ...c,
          messages: [...c.messages, userMsg],
          updatedAt: new Date(),
          mode: currentMode,
          title:
            c.messages.length === 0 ? generateTitle(content) : c.title,
        };
        return updated;
      })
    );

    // Prepare history for API
    const history = [
      ...(conv.messages || []).map((m) => ({ role: m.role, content: m.content })),
    ];

    // Start streaming
    setIsStreaming(true);
    setStreamingContent('');
    startTimeRef.current = Date.now();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let fullContent = '';

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content }],
          mode: currentMode,
          conversationHistory: history,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error?.includes('GROQ_API_KEY')) {
          setApiKeyMissing(true);
          toast.error('API key missing — see setup instructions', { duration: 6000 });
        } else {
          throw new Error(errorData.error || 'Failed to get response');
        }
        setIsStreaming(false);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'text') {
                fullContent += data.content;
                setStreamingContent(fullContent);
              } else if (data.type === 'done') {
                // Streaming complete
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (parseErr) {
              // Skip malformed JSON lines
            }
          }
        }
      }

      // Save assistant message
      if (fullContent) {
        const processingTime = Date.now() - startTimeRef.current;
        const assistantMsg = createMessage('assistant', fullContent, currentMode);
        assistantMsg.status = 'complete';
        assistantMsg.metadata = {
          processingTime,
          model: 'llama-3.3-70b-versatile',
          tokensUsed: Math.ceil(fullContent.length / 4),
        };

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convId) return c;
            return {
              ...c,
              messages: [...c.messages, assistantMsg],
              updatedAt: new Date(),
            };
          })
        );
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        // User stopped — save partial response
        if (fullContent) {
          const partialMsg = createMessage('assistant', fullContent + '\n\n*[Generation stopped]*', currentMode);
          partialMsg.status = 'complete';
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== convId) return c;
              return {
                ...c,
                messages: [...c.messages, partialMsg],
                updatedAt: new Date(),
              };
            })
          );
        }
      } else {
        console.error('Stream error:', err);
        toast.error('Failed to get response. Check console for details.');
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
      abortControllerRef.current = null;
    }
  }, [isStreaming, activeConvId, activeConversation, currentMode]);

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleQuickCommand = useCallback((prompt: string) => {
    if (!activeConvId) {
      const newConv = createConversation(currentMode);
      setConversations((prev) => [newConv, ...prev]);
      setActiveConvId(newConv.id);
      // Small delay to ensure conversation is set
      setTimeout(() => handleSend(prompt), 50);
    } else {
      handleSend(prompt);
    }
  }, [activeConvId, currentMode, handleSend]);

  const activeMessages = activeConversation?.messages || [];
  const showWelcome = activeMessages.length === 0 && !isStreaming;

  return (
    <div className="relative h-screen flex overflow-hidden">
      {/* Animated Background */}
      <div className="bg-mesh" />
      <div className="grid-overlay" />

      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConvId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        currentMode={currentMode}
      />

      {/* Main Content */}
      <main className="relative flex-1 flex flex-col h-full overflow-hidden z-10">
        {/* Header */}
        <Header
          currentMode={currentMode}
          onModeClick={() => setShowModeSelector(true)}
          onClearChat={handleClearChat}
          conversationTitle={activeConversation?.title || ''}
          messageCount={activeMessages.length}
          isStreaming={isStreaming}
        />

        {/* API Key Warning */}
        {apiKeyMissing && (
          <div
            className="mx-4 mt-3 px-4 py-3 rounded-xl text-sm animate-slide-up"
            style={{
              background: 'rgba(249, 115, 22, 0.1)',
              border: '1px solid rgba(249, 115, 22, 0.3)',
              color: '#fdba74',
            }}
          >
            <strong>⚠️ API Key Required:</strong> Create a{' '}
            <code className="font-mono text-xs bg-black/20 px-1 rounded">.env.local</code>{' '}
            file in the project root with:{' '}
            <code className="font-mono text-xs bg-black/20 px-1 rounded">
              GROQ_API_KEY=your_key_here
            </code>
            {' '}— Get your free key at{' '}
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white transition-colors"
            >
              console.groq.com/keys
            </a>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {showWelcome ? (
            <WelcomeScreen
              currentMode={currentMode}
              onQuickCommand={handleQuickCommand}
              onModeClick={() => setShowModeSelector(true)}
            />
          ) : (
            <MessageList
              messages={activeMessages}
              isStreaming={isStreaming}
              streamingContent={streamingContent}
            />
          )}
        </div>

        {/* Chat Input */}
        <div className="px-4 pb-4 pt-2 z-10">
          <ChatInput
            onSend={handleSend}
            onStop={handleStop}
            isStreaming={isStreaming}
            currentMode={currentMode}
            onModeClick={() => setShowModeSelector(true)}
            disabled={false}
          />
        </div>
      </main>

      {/* Mode Selector Modal */}
      {showModeSelector && (
        <ModeSelector
          currentMode={currentMode}
          onModeChange={handleModeChange}
          onClose={() => setShowModeSelector(false)}
        />
      )}
    </div>
  );
}
