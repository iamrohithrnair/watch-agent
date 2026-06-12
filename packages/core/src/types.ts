export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface AgentProfile {
  id: string;
  name: string;
  persona: string;
  voiceId: string;
  model: string;
  temperature: number;
  controls: Record<string, unknown>;
}

export interface SessionRecord {
  id: string;
  deviceId?: string;
  clientId?: string;
  route: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  instructions: string;
}

export interface McpServerConfig {
  id: string;
  name: string;
  url: string;
  headers: Record<string, string>;
}

export interface RetrievedContext {
  memories: string[];
  knowledge: string[];
  skills: Skill[];
  mcpServers: McpServerConfig[];
}

export interface VoiceInfo {
  voiceId: string;
  name: string;
  category?: string;
  description?: string;
}
