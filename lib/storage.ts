import { v4 as uuidv4 } from 'uuid';
import { Conversation, Message, AgentMode } from './types';

// ===========================
// Conversation Storage (localStorage)
// ===========================
const STORAGE_KEY = 'nexus_conversations';

export function saveConversations(conversations: Conversation[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch (e) {
    console.error('Failed to save conversations:', e);
  }
}

export function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return parsed.map((c: Conversation) => ({
      ...c,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
      messages: c.messages.map((m: Message) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })),
    }));
  } catch (e) {
    console.error('Failed to load conversations:', e);
    return [];
  }
}

export function createConversation(mode: AgentMode = 'autonomous'): Conversation {
  return {
    id: uuidv4(),
    title: 'New Conversation',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    mode,
  };
}

export function createMessage(
  role: Message['role'],
  content: string,
  mode?: AgentMode
): Message {
  return {
    id: uuidv4(),
    role,
    content,
    timestamp: new Date(),
    status: role === 'user' ? 'complete' : 'pending',
    mode,
  };
}

export function generateTitle(firstMessage: string): string {
  const trimmed = firstMessage.trim();
  if (trimmed.length <= 50) return trimmed;
  return trimmed.substring(0, 47) + '...';
}

export function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
