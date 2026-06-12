# WatchAgent

WatchAgent is a standalone voice server and admin app for the M5Stack Stopwatch.

The working voice loop is:

1. The watch opens a WebSocket to the gateway.
2. The gateway receives real Opus microphone frames.
3. ElevenLabs transcribes the audio.
4. Vercel AI Gateway generates the agent response through Vercel AI SDK.
5. ElevenLabs streams speech audio.
6. The gateway sends Opus audio frames back to the watch.
7. Supabase stores sessions, transcripts, persona, skills, memory, knowledge, and MCP configuration.

## Quick Start

```bash
cp .env.example .env
npm install
npm run check:env
npm run dev:gateway
```

In another terminal:

```bash
npm run dev:web
```

Configure the stopwatch WebSocket URL to:

```text
ws://<gateway-host>:8000/watchagent/v1
```

## Required Services

- ElevenLabs API key with STT and TTS access.
- Vercel AI Gateway key.
- Supabase project with the schema from `supabase/schema.sql`.
- Supabase `sb_secret_...` key for backend code and `sb_publishable_...` key for public clients.
- A WebSocket-capable host for `apps/gateway`.
- Vercel for `apps/web`.

## Scripts

- `npm run dev:gateway`: run the watch WebSocket gateway on `GATEWAY_PORT`.
- `npm run dev:web`: run the admin UI.
- `npm run check:env`: validate required environment variables.
- `npm run verify:live`: call real Supabase, ElevenLabs STT/TTS, and Vercel AI Gateway using `WATCHAGENT_VERIFY_AUDIO_FILE`.
- `npm run build`: build all workspaces.

`verify:live` intentionally has no offline simulation mode. It requires a real audio file and real provider credentials.

## Adapter Architecture

Provider-specific code lives behind interfaces in `packages/core`. The gateway and web app use a plugin registry so STT, TTS, LLM, memory, knowledge, MCP, skills, and protocol adapters can be swapped without rewriting the runtime.

## Provider Notes

- Supabase uses the current `SUPABASE_SECRET_KEY` and `SUPABASE_PUBLISHABLE_KEY` naming.
- Vercel AI Gateway is called through Vercel AI SDK 6 and `@ai-sdk/openai-compatible`.
- ElevenLabs STT defaults to `scribe_v2`; TTS uses the streaming text-to-speech endpoint and requests 48 kHz Opus output for the watch audio path.
