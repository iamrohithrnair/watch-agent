import type { AgentProfile, ChatMessage, RetrievedContext, SessionRecord, VoiceInfo } from "../types.js";

export interface SpeechToTextAdapter {
  transcribe(input: { audio: Uint8Array; filename: string; mimeType: string }): Promise<string>;
}

export interface TextToSpeechAdapter {
  synthesize(input: { text: string; voiceId: string }): Promise<Uint8Array>;
}

export interface AgentAdapter {
  respond(input: {
    profile: AgentProfile;
    messages: ChatMessage[];
    context: RetrievedContext;
  }): Promise<string>;
}

export interface MemoryAdapter {
  createSession(input: { id: string; deviceId?: string; clientId?: string; route: string }): Promise<SessionRecord>;
  endSession(sessionId: string): Promise<void>;
  getActiveProfile(): Promise<AgentProfile>;
  addMessage(input: { sessionId: string; role: ChatMessage["role"]; content: string; metadata?: Record<string, unknown> }): Promise<void>;
  retrieveContext(input: { profileId: string; deviceId?: string; query: string }): Promise<RetrievedContext>;
}

export interface VoiceLibraryAdapter {
  listVoices(search?: string): Promise<VoiceInfo[]>;
}

export interface DeviceProtocolAdapter {
  createServerHello(sessionId: string): string;
  parseTextMessage(text: string): WatchTextMessage;
}

export interface McpAdapter {
  initialize(): Promise<void>;
}

export interface SkillAdapter {
  renderSkillInstructions(skills: { name: string; instructions: string }[]): string;
}

export type WatchTextMessage =
  | { type: "hello"; version?: number; features?: Record<string, boolean>; transport?: string; audio_params?: Record<string, unknown> }
  | { type: "listen"; session_id?: string; state: "start" | "stop" | "detect"; mode?: string; text?: string }
  | { type: "abort"; session_id?: string; reason?: string }
  | { type: "mcp"; session_id?: string; payload: unknown }
  | { type: string; [key: string]: unknown };
