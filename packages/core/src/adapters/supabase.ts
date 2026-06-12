import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { MemoryAdapter } from "./interfaces.js";
import type { WatchAgentConfig } from "../config.js";
import type { AgentProfile, RetrievedContext, SessionRecord } from "../types.js";

export class SupabaseMemoryAdapter implements MemoryAdapter {
  private readonly client: SupabaseClient;

  constructor(config: WatchAgentConfig) {
    this.client = createClient(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false }
    });
  }

  async createSession(input: { id: string; deviceId?: string; clientId?: string; route: string }): Promise<SessionRecord> {
    const row = {
      id: input.id,
      device_id: input.deviceId ?? null,
      client_id: input.clientId ?? null,
      route: input.route
    };
    const { error } = await this.client.from("sessions").insert(row);
    if (error) throw new Error(`Supabase create session failed: ${error.message}`);
    return { id: input.id, deviceId: input.deviceId, clientId: input.clientId, route: input.route };
  }

  async endSession(sessionId: string): Promise<void> {
    const { error } = await this.client.from("sessions").update({ ended_at: new Date().toISOString() }).eq("id", sessionId);
    if (error) throw new Error(`Supabase end session failed: ${error.message}`);
  }

  async getActiveProfile(): Promise<AgentProfile> {
    const { data, error } = await this.client.from("agent_profiles").select("*").eq("is_active", true).limit(1).maybeSingle();
    if (error) throw new Error(`Supabase active profile failed: ${error.message}`);
    if (!data) throw new Error("No active agent profile found in Supabase");
    return {
      id: data.id,
      name: data.name,
      persona: data.persona,
      voiceId: data.voice_id,
      model: data.model,
      temperature: Number(data.temperature),
      controls: data.controls ?? {}
    };
  }

  async addMessage(input: { sessionId: string; role: "system" | "user" | "assistant" | "tool"; content: string; metadata?: Record<string, unknown> }): Promise<void> {
    const { error } = await this.client.from("messages").insert({
      session_id: input.sessionId,
      role: input.role,
      content: input.content,
      metadata: input.metadata ?? {}
    });
    if (error) throw new Error(`Supabase add message failed: ${error.message}`);
  }

  async retrieveContext(input: { profileId: string; deviceId?: string; query: string }): Promise<RetrievedContext> {
    const [memories, knowledge, skills, mcpServers] = await Promise.all([
      this.client.from("memory_items").select("content").eq("profile_id", input.profileId).limit(8),
      this.client.from("knowledge_chunks").select("content").eq("profile_id", input.profileId).limit(8),
      this.client.from("skills").select("id,name,description,instructions").eq("profile_id", input.profileId).eq("enabled", true),
      this.client.from("mcp_servers").select("id,name,url,headers").eq("profile_id", input.profileId).eq("enabled", true)
    ]);
    for (const result of [memories, knowledge, skills, mcpServers]) {
      if (result.error) throw new Error(`Supabase context query failed: ${result.error.message}`);
    }
    return {
      memories: (memories.data ?? []).map((row) => row.content),
      knowledge: (knowledge.data ?? []).map((row) => row.content),
      skills: (skills.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        instructions: row.instructions
      })),
      mcpServers: (mcpServers.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        url: row.url,
        headers: (row.headers ?? {}) as Record<string, string>
      }))
    };
  }
}
