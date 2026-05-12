// ===========================
// Multi-Agent Swarm System
// Inspired by Ruflo's agent orchestration
// ===========================

export interface SubAgent {
  id: string;
  name: string;
  role: string;
  icon: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  task: string;
  result?: string;
}

export interface TaskPlan {
  id: string;
  objective: string;
  complexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
  agents: SubAgent[];
  createdAt: Date;
  status: 'planning' | 'executing' | 'complete';
}

// ===========================
// Agent Definitions (virtual sub-agents)
// ===========================
const AGENT_ROSTER = {
  planner:    { name: 'Planner',      icon: '📋', role: 'Analyzes requirements and creates architecture plans' },
  architect:  { name: 'Architect',    icon: '🏗️', role: 'Designs system architecture and tech stack' },
  frontend:   { name: 'Frontend Dev', icon: '🎨', role: 'Builds UI components and pages' },
  backend:    { name: 'Backend Dev',  icon: '⚙️', role: 'Creates APIs, server logic, and databases' },
  database:   { name: 'DB Engineer',  icon: '🗄️', role: 'Designs schemas and optimizes queries' },
  security:   { name: 'Security',     icon: '🛡️', role: 'Audits security and adds protections' },
  devops:     { name: 'DevOps',       icon: '🚀', role: 'Configures deployment and infrastructure' },
  tester:     { name: 'QA Tester',    icon: '🧪', role: 'Generates test cases and validates code' },
  uiux:       { name: 'UI/UX',        icon: '✨', role: 'Polishes design, animations, and UX flow' },
  optimizer:  { name: 'Optimizer',    icon: '⚡', role: 'Improves performance and scalability' },
  reviewer:   { name: 'Code Review',  icon: '🔍', role: 'Reviews code quality and best practices' },
  documenter: { name: 'Documenter',   icon: '📝', role: 'Generates documentation and guides' },
  aiEngineer: { name: 'AI Engineer',  icon: '🤖', role: 'Integrates AI/ML models and pipelines' },
  dataEng:    { name: 'Data Engineer',icon: '📊', role: 'Handles data processing and ETL pipelines' },
} as const;

type AgentKey = keyof typeof AGENT_ROSTER;

// ===========================
// Task Complexity Detector
// ===========================
export function detectComplexity(message: string): TaskPlan['complexity'] {
  const lower = message.toLowerCase();
  const complexKeywords = ['saas', 'platform', 'enterprise', 'microservices', 'multi-tenant', 'kubernetes', 'distributed', 'real-time', 'marketplace'];
  const moderateKeywords = ['full-stack', 'authentication', 'dashboard', 'api', 'database', 'deploy', 'mobile app', 'web app', 'chatbot'];
  const simpleKeywords = ['component', 'function', 'script', 'button', 'form', 'page', 'fix', 'debug', 'explain'];

  if (complexKeywords.some(k => lower.includes(k))) return 'enterprise';
  if (moderateKeywords.filter(k => lower.includes(k)).length >= 2) return 'complex';
  if (moderateKeywords.some(k => lower.includes(k))) return 'moderate';
  return 'simple';
}

// ===========================
// Task Decomposition (GOAP-inspired)
// ===========================
export function decomposeTask(message: string): SubAgent[] {
  const complexity = detectComplexity(message);
  const lower = message.toLowerCase();

  let agentKeys: AgentKey[] = [];

  switch (complexity) {
    case 'enterprise':
      agentKeys = ['planner', 'architect', 'database', 'backend', 'frontend', 'uiux', 'security', 'tester', 'devops', 'optimizer', 'documenter'];
      break;
    case 'complex':
      agentKeys = ['planner', 'architect', 'backend', 'frontend', 'security', 'devops', 'tester'];
      break;
    case 'moderate':
      agentKeys = ['planner', 'architect', 'backend', 'frontend'];
      // Add specialized agents based on keywords
      if (lower.includes('ai') || lower.includes('ml') || lower.includes('model')) agentKeys.push('aiEngineer');
      if (lower.includes('data') || lower.includes('analytics')) agentKeys.push('dataEng');
      if (lower.includes('deploy') || lower.includes('docker')) agentKeys.push('devops');
      if (lower.includes('security') || lower.includes('auth')) agentKeys.push('security');
      break;
    case 'simple':
    default:
      agentKeys = ['planner'];
      if (lower.includes('ui') || lower.includes('design')) agentKeys.push('uiux');
      if (lower.includes('api') || lower.includes('server')) agentKeys.push('backend');
      if (lower.includes('debug') || lower.includes('fix')) agentKeys = ['reviewer'];
      break;
  }

  // Deduplicate
  agentKeys = [...new Set(agentKeys)];

  return agentKeys.map((key, i) => {
    const agent = AGENT_ROSTER[key];
    return {
      id: `agent-${key}-${Date.now()}`,
      name: agent.name,
      role: agent.role,
      icon: agent.icon,
      status: i === 0 ? 'active' : 'pending',
      task: generateAgentTask(key, message),
    };
  });
}

function generateAgentTask(agentKey: AgentKey, userMessage: string): string {
  const taskMap: Record<AgentKey, string> = {
    planner: `Analyze requirements: "${userMessage.substring(0, 80)}..."`,
    architect: 'Design system architecture and tech stack',
    frontend: 'Build responsive UI components',
    backend: 'Create API endpoints and server logic',
    database: 'Design database schema and queries',
    security: 'Audit security and add protections',
    devops: 'Configure deployment and CI/CD',
    tester: 'Generate test cases',
    uiux: 'Polish UI/UX design and animations',
    optimizer: 'Optimize performance and scalability',
    reviewer: 'Review code quality',
    documenter: 'Generate documentation',
    aiEngineer: 'Integrate AI/ML pipeline',
    dataEng: 'Design data processing pipeline',
  };
  return taskMap[agentKey];
}

// ===========================
// Self-Learning Memory System
// ===========================
export interface LearningMemory {
  patterns: PatternEntry[];
  totalTasks: number;
  successRate: number;
  lastUpdated: Date;
}

interface PatternEntry {
  id: string;
  taskType: string;
  approach: string;
  success: boolean;
  timestamp: Date;
}

const MEMORY_KEY = 'nexus_learning_memory';

export function loadLearningMemory(): LearningMemory {
  if (typeof window === 'undefined') return defaultMemory();
  try {
    const stored = localStorage.getItem(MEMORY_KEY);
    if (!stored) return defaultMemory();
    const parsed = JSON.parse(stored);
    return {
      ...parsed,
      lastUpdated: new Date(parsed.lastUpdated),
      patterns: parsed.patterns.map((p: any) => ({ ...p, timestamp: new Date(p.timestamp) })),
    };
  } catch {
    return defaultMemory();
  }
}

export function saveLearningMemory(memory: LearningMemory): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
}

export function recordPattern(taskType: string, approach: string, success: boolean): void {
  const memory = loadLearningMemory();
  memory.patterns.push({
    id: `p-${Date.now()}`,
    taskType,
    approach,
    success,
    timestamp: new Date(),
  });
  // Keep only last 100 patterns
  if (memory.patterns.length > 100) {
    memory.patterns = memory.patterns.slice(-100);
  }
  memory.totalTasks += 1;
  memory.successRate = memory.patterns.filter(p => p.success).length / memory.patterns.length;
  memory.lastUpdated = new Date();
  saveLearningMemory(memory);
}

export function getRelevantPatterns(taskType: string): PatternEntry[] {
  const memory = loadLearningMemory();
  return memory.patterns
    .filter(p => p.success && p.taskType.toLowerCase().includes(taskType.toLowerCase()))
    .slice(-5);
}

function defaultMemory(): LearningMemory {
  return { patterns: [], totalTasks: 0, successRate: 1, lastUpdated: new Date() };
}

// ===========================
// Multi-Model Support
// ===========================
export interface AIModel {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  speed: 'fast' | 'medium' | 'slow';
  quality: 'standard' | 'high' | 'premium';
}

export const AVAILABLE_MODELS: AIModel[] = [
  { id: 'llama-3.3-70b-versatile', name: 'LLaMA 3.3 70B', provider: 'Groq', contextWindow: 128000, speed: 'fast', quality: 'premium' },
  { id: 'llama-3.1-8b-instant', name: 'LLaMA 3.1 8B', provider: 'Groq', contextWindow: 128000, speed: 'fast', quality: 'standard' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', provider: 'Groq', contextWindow: 32768, speed: 'fast', quality: 'high' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B', provider: 'Groq', contextWindow: 8192, speed: 'fast', quality: 'standard' },
];

export function getModel(id: string): AIModel {
  return AVAILABLE_MODELS.find(m => m.id === id) || AVAILABLE_MODELS[0];
}

// ===========================
// Swarm Status Formatter (for system prompt injection)
// ===========================
export function formatSwarmContext(agents: SubAgent[], complexity: string): string {
  if (agents.length <= 1) return '';

  let context = '\n\n🐝 **SWARM ORCHESTRATION ACTIVE**\n';
  context += `Complexity: ${complexity.toUpperCase()} | ${agents.length} virtual agents deployed\n\n`;
  context += 'You are coordinating the following sub-agents for this task:\n';

  agents.forEach((agent, i) => {
    context += `${i + 1}. ${agent.icon} **${agent.name}** — ${agent.role}\n`;
  });

  context += '\nExecute each agent\'s role sequentially in your response. ';
  context += 'Use headers like "### 🏗️ Architect Agent" to show which agent is working. ';
  context += 'Produce a complete, integrated solution combining all agents\' work.\n';

  return context;
}
