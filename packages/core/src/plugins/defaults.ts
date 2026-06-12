import { loadConfig, type WatchAgentConfig } from "../config.js";
import { VercelAiGatewayAdapter } from "../adapters/ai-gateway.js";
import { ElevenLabsAdapter } from "../adapters/elevenlabs.js";
import { SupabaseMemoryAdapter } from "../adapters/supabase.js";
import { WatchProtocolAdapter } from "../protocol/watch-protocol.js";
import { createPluginRegistry, type WatchAgentPluginRegistry } from "./registry.js";

export function createDefaultRegistry(config: WatchAgentConfig = loadConfig()): WatchAgentPluginRegistry {
  const elevenLabs = new ElevenLabsAdapter(config);
  return createPluginRegistry({
    stt: elevenLabs,
    tts: elevenLabs,
    voiceLibrary: elevenLabs,
    agent: new VercelAiGatewayAdapter(config),
    memory: new SupabaseMemoryAdapter(config),
    protocol: new WatchProtocolAdapter()
  });
}
