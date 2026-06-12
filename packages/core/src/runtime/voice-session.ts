import { oggOpusToRawPackets, rawOpusPacketsToOgg } from "../protocol/ogg-opus.js";
import { watchJson } from "../protocol/watch-protocol.js";
import type { WatchAgentPluginRegistry } from "../plugins/registry.js";
import type { ChatMessage } from "../types.js";

export interface VoiceSessionTransport {
  sendText(text: string): void;
  sendBinary(data: Uint8Array): void;
  close(code?: number, reason?: string): void;
}

export interface VoiceSessionInput {
  sessionId: string;
  deviceId?: string;
  clientId?: string;
  route: string;
  registry: WatchAgentPluginRegistry;
  transport: VoiceSessionTransport;
}

export class WatchVoiceSession {
  private readonly audioFrames: Uint8Array[] = [];
  private listening = false;
  private closed = false;
  private history: ChatMessage[] = [];

  constructor(private readonly input: VoiceSessionInput) {}

  async start(): Promise<void> {
    await this.input.registry.memory.createSession({
      id: this.input.sessionId,
      deviceId: this.input.deviceId,
      clientId: this.input.clientId,
      route: this.input.route
    });
  }

  async finish(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    await this.input.registry.memory.endSession(this.input.sessionId).catch(() => undefined);
  }

  acceptAudio(frame: Uint8Array): void {
    if (this.listening) {
      this.audioFrames.push(frame);
    }
  }

  async handleText(text: string): Promise<void> {
    const message = this.input.registry.protocol.parseTextMessage(text);
    if (message.type === "hello") {
      this.input.transport.sendText(this.input.registry.protocol.createServerHello(this.input.sessionId));
      return;
    }
    if (message.type === "listen") {
      if (message.state === "start" || message.state === "detect") {
        this.audioFrames.length = 0;
        this.listening = true;
        return;
      }
      if (message.state === "stop") {
        this.listening = false;
        await this.processUtterance();
      }
      return;
    }
    if (message.type === "abort") {
      this.audioFrames.length = 0;
      this.listening = false;
    }
    if (message.type === "mcp") {
      await this.input.registry.memory.addMessage({
        sessionId: this.input.sessionId,
        role: "tool",
        content: JSON.stringify(message.payload),
        metadata: { source: "watch-mcp" }
      });
    }
  }

  private async processUtterance(): Promise<void> {
    if (this.audioFrames.length === 0) return;
    const profile = await this.input.registry.memory.getActiveProfile();
    const audio = rawOpusPacketsToOgg(this.audioFrames);
    const transcript = await this.input.registry.stt.transcribe({
      audio,
      filename: `watchagent-${this.input.sessionId}.ogg`,
      mimeType: "audio/ogg; codecs=opus"
    });
    this.input.transport.sendText(watchJson(this.input.sessionId, { type: "stt", text: transcript }));
    await this.input.registry.memory.addMessage({ sessionId: this.input.sessionId, role: "user", content: transcript });

    this.history = [...this.history, { role: "user" as const, content: transcript }].slice(-12);
    const context = await this.input.registry.memory.retrieveContext({
      profileId: profile.id,
      deviceId: this.input.deviceId,
      query: transcript
    });
    const response = await this.input.registry.agent.respond({
      profile,
      messages: this.history,
      context
    });
    this.history = [...this.history, { role: "assistant" as const, content: response }].slice(-12);
    await this.input.registry.memory.addMessage({ sessionId: this.input.sessionId, role: "assistant", content: response });

    this.input.transport.sendText(watchJson(this.input.sessionId, { type: "llm", emotion: "neutral", text: "OK" }));
    this.input.transport.sendText(watchJson(this.input.sessionId, { type: "tts", state: "start" }));
    this.input.transport.sendText(watchJson(this.input.sessionId, { type: "tts", state: "sentence_start", text: response }));
    const speech = await this.input.registry.tts.synthesize({ text: response, voiceId: profile.voiceId });
    const packets = oggOpusToRawPackets(speech);
    const outbound = packets.length > 0 ? packets : [speech];
    for (const packet of outbound) {
      this.input.transport.sendBinary(packet);
    }
    this.input.transport.sendText(watchJson(this.input.sessionId, { type: "tts", state: "stop" }));
  }
}
