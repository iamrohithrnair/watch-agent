import type { SpeechToTextAdapter, TextToSpeechAdapter, VoiceLibraryAdapter } from "./interfaces.js";
import type { WatchAgentConfig } from "../config.js";
import type { VoiceInfo } from "../types.js";

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";

export class ElevenLabsAdapter implements SpeechToTextAdapter, TextToSpeechAdapter, VoiceLibraryAdapter {
  constructor(private readonly config: WatchAgentConfig) {}

  async transcribe(input: { audio: Uint8Array; filename: string; mimeType: string }): Promise<string> {
    const form = new FormData();
    const audioPart = input.audio.buffer.slice(input.audio.byteOffset, input.audio.byteOffset + input.audio.byteLength) as ArrayBuffer;
    form.set("model_id", this.config.ELEVENLABS_STT_MODEL);
    form.set("file", new Blob([audioPart], { type: input.mimeType }), input.filename);

    const response = await fetch(`${ELEVENLABS_API_BASE}/speech-to-text`, {
      method: "POST",
      headers: { "xi-api-key": this.config.ELEVENLABS_API_KEY },
      body: form
    });
    const body = await readProviderBody(response);
    if (!response.ok) {
      throw new Error(`ElevenLabs STT failed (${response.status}): ${body}`);
    }
    const parsed = JSON.parse(body) as { text?: string };
    if (!parsed.text) {
      throw new Error("ElevenLabs STT response did not include text");
    }
    return parsed.text;
  }

  async synthesize(input: { text: string; voiceId: string }): Promise<Uint8Array> {
    const voiceId = input.voiceId || this.config.ELEVENLABS_VOICE_ID;
    const url = new URL(`${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}/stream`);
    url.searchParams.set("output_format", this.config.ELEVENLABS_TTS_OUTPUT_FORMAT);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "xi-api-key": this.config.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: input.text,
        model_id: this.config.ELEVENLABS_TTS_MODEL
      })
    });
    if (!response.ok) {
      throw new Error(`ElevenLabs TTS failed (${response.status}): ${await readProviderBody(response)}`);
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  async listVoices(search?: string): Promise<VoiceInfo[]> {
    const response = await fetch(`${ELEVENLABS_API_BASE}/voices`, {
      headers: { "xi-api-key": this.config.ELEVENLABS_API_KEY }
    });
    const body = await readProviderBody(response);
    if (!response.ok) {
      throw new Error(`ElevenLabs voices failed (${response.status}): ${body}`);
    }
    const parsed = JSON.parse(body) as {
      voices?: Array<{ voice_id: string; name: string; category?: string; description?: string }>;
    };
    const voices = (parsed.voices ?? []).map((voice) => ({
      voiceId: voice.voice_id,
      name: voice.name,
      category: voice.category,
      description: voice.description
    }));
    if (!search) return voices;
    const needle = search.toLowerCase();
    return voices.filter((voice) => `${voice.name} ${voice.category ?? ""} ${voice.description ?? ""}`.toLowerCase().includes(needle));
  }
}

async function readProviderBody(response: Response): Promise<string> {
  return await response.text().catch(() => "");
}
