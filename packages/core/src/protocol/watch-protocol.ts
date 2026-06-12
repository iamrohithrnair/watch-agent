import type { DeviceProtocolAdapter, WatchTextMessage } from "../adapters/interfaces.js";

export class WatchProtocolAdapter implements DeviceProtocolAdapter {
  createServerHello(sessionId: string): string {
    return JSON.stringify({
      type: "hello",
      transport: "websocket",
      session_id: sessionId,
      audio_params: {
        format: "opus",
        sample_rate: 24000,
        channels: 1,
        frame_duration: 60
      }
    });
  }

  parseTextMessage(text: string): WatchTextMessage {
    const value = JSON.parse(text) as WatchTextMessage;
    if (!value || typeof value !== "object" || typeof value.type !== "string") {
      throw new Error("Invalid watch message: missing type");
    }
    return value;
  }
}

export function watchJson(sessionId: string, payload: Record<string, unknown>): string {
  return JSON.stringify({ session_id: sessionId, ...payload });
}
