import type {
  AgentAdapter,
  DeviceProtocolAdapter,
  MemoryAdapter,
  SpeechToTextAdapter,
  TextToSpeechAdapter,
  VoiceLibraryAdapter
} from "../adapters/interfaces.js";

export interface WatchAgentPluginRegistry {
  stt: SpeechToTextAdapter;
  tts: TextToSpeechAdapter;
  agent: AgentAdapter;
  memory: MemoryAdapter;
  voiceLibrary: VoiceLibraryAdapter;
  protocol: DeviceProtocolAdapter;
}

export function createPluginRegistry(registry: WatchAgentPluginRegistry): WatchAgentPluginRegistry {
  return registry;
}
