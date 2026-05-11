// ===========================
// Core Types for AI Agent
// ===========================

export type AgentMode =
  | 'autonomous'
  | 'coding'
  | 'debugging'
  | 'design'
  | 'devops'
  | 'research'
  | 'security'
  | 'optimization'
  | 'prompt';

export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error';

export type AgentStep =
  | 'understanding'
  | 'planning'
  | 'architecture'
  | 'executing'
  | 'reviewing'
  | 'optimizing'
  | 'complete';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  status: MessageStatus;
  mode?: AgentMode;
  steps?: AgentStep[];
  currentStep?: AgentStep;
  metadata?: {
    tokensUsed?: number;
    processingTime?: number;
    model?: string;
  };
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  mode: AgentMode;
}

export interface AgentConfig {
  mode: AgentMode;
  model: string;
  temperature: number;
  maxTokens: number;
  streamingEnabled: boolean;
  autoImprove: boolean;
}

export interface ProjectPlan {
  title: string;
  objective: string;
  techStack: string[];
  features: string[];
  architecture: string[];
  phases: ProjectPhase[];
  estimatedTime: string;
}

export interface ProjectPhase {
  phase: number;
  name: string;
  tasks: string[];
  status: 'pending' | 'active' | 'complete';
}

export interface ModeConfig {
  id: AgentMode;
  name: string;
  description: string;
  icon: string;
  color: string;
  gradient: string;
  badge: string;
  systemPromptKey: string;
}
