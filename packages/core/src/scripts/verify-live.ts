import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { randomUUID } from "node:crypto";
import { createDefaultRegistry } from "../plugins/defaults.js";
import { loadConfig } from "../config.js";

const config = loadConfig();
const audioFile = process.env.WATCHAGENT_VERIFY_AUDIO_FILE;

if (!audioFile) {
  throw new Error("WATCHAGENT_VERIFY_AUDIO_FILE must point to a real audio file for live ElevenLabs STT verification.");
}

const registry = createDefaultRegistry(config);
const sessionId = randomUUID();

console.log("Running live WatchAgent verification. This uses real provider APIs and may consume credits.");

const profile = await registry.memory.getActiveProfile();
console.log(`Supabase active profile: ${profile.name}`);

await registry.memory.createSession({
  id: sessionId,
  route: "verify-live",
  deviceId: "verify-live",
  clientId: "verify-live"
});

try {
  const voices = await registry.voiceLibrary.listVoices();
  console.log(`ElevenLabs voices available: ${voices.length}`);

  const audio = await readFile(audioFile);
  const transcript = await registry.stt.transcribe({
    audio,
    filename: basename(audioFile),
    mimeType: mimeTypeFor(audioFile)
  });
  console.log(`ElevenLabs STT transcript: ${transcript}`);
  await registry.memory.addMessage({ sessionId, role: "user", content: transcript, metadata: { source: "verify-live" } });

  const context = await registry.memory.retrieveContext({
    profileId: profile.id,
    deviceId: "verify-live",
    query: transcript
  });
  const response = await registry.agent.respond({
    profile,
    context,
    messages: [{ role: "user", content: transcript }]
  });
  console.log(`AI Gateway response: ${response}`);
  await registry.memory.addMessage({ sessionId, role: "assistant", content: response, metadata: { source: "verify-live" } });

  const speech = await registry.tts.synthesize({
    text: response,
    voiceId: profile.voiceId || config.ELEVENLABS_VOICE_ID
  });
  console.log(`ElevenLabs TTS returned ${speech.byteLength} bytes.`);
} finally {
  await registry.memory.endSession(sessionId);
}

function mimeTypeFor(path: string): string {
  switch (extname(path).toLowerCase()) {
    case ".ogg":
    case ".opus":
      return "audio/ogg; codecs=opus";
    case ".wav":
      return "audio/wav";
    case ".mp3":
      return "audio/mpeg";
    case ".m4a":
      return "audio/mp4";
    case ".webm":
      return "audio/webm";
    default:
      return "application/octet-stream";
  }
}
