import { config as loadDotenv } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

loadDotenv({ path: findEnvPath() });

const EnvSchema = z.object({
  WATCHAGENT_PUBLIC_NAME: z.string().default("WatchAgent"),
  WATCHAGENT_GATEWAY_URL: z.string().default("ws://localhost:8000/watchagent/v1"),
  WATCHAGENT_WEB_URL: z.string().default("http://localhost:3000"),
  DEVICE_AUTH_TOKEN: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
  SUPABASE_PUBLISHABLE_KEY: z.string().optional().default(""),
  ELEVENLABS_API_KEY: z.string().min(1),
  ELEVENLABS_STT_MODEL: z.string().default("scribe_v2"),
  ELEVENLABS_TTS_MODEL: z.string().default("eleven_multilingual_v2"),
  ELEVENLABS_VOICE_ID: z.string().min(1),
  ELEVENLABS_TTS_OUTPUT_FORMAT: z.string().default("opus_24000_32"),
  AI_GATEWAY_API_KEY: z.string().min(1),
  LLM_MODEL: z.string().default("openai/gpt-4.1-mini"),
  LLM_TEMPERATURE: z.coerce.number().default(0.7),
  OPENAI_COMPATIBLE_BASE_URL: z.string().optional().default(""),
  OPENAI_COMPATIBLE_API_KEY: z.string().optional().default(""),
  OPENAI_COMPATIBLE_MODEL: z.string().optional().default(""),
  GATEWAY_PORT: z.coerce.number().int().positive().default(8000)
});

export type WatchAgentConfig = z.infer<typeof EnvSchema>;

export function loadConfig(): WatchAgentConfig {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n");
    throw new Error(`Invalid WatchAgent environment:\n${details}`);
  }
  return {
    ...parsed.data,
    SUPABASE_URL: normalizeSupabaseUrl(parsed.data.SUPABASE_URL)
  };
}

export function requiredEnvNames(): string[] {
  return [
    "DEVICE_AUTH_TOKEN",
    "SUPABASE_URL",
    "SUPABASE_SECRET_KEY",
    "ELEVENLABS_API_KEY",
    "ELEVENLABS_VOICE_ID",
    "AI_GATEWAY_API_KEY"
  ];
}

function findEnvPath(): string {
  const explicit = process.env.WATCHAGENT_ENV_FILE;
  if (explicit) return explicit;

  const candidates = [
    join(process.cwd(), ".env"),
    join(process.cwd(), "../../.env"),
    join(dirname(fileURLToPath(import.meta.url)), "../../../.env"),
    join(dirname(fileURLToPath(import.meta.url)), "../../../../.env")
  ];

  for (const candidate of candidates) {
    const absolute = resolve(candidate);
    if (existsSync(absolute)) return absolute;
  }

  return resolve(process.cwd(), ".env");
}

function normalizeSupabaseUrl(url: string): string {
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}
