import { createClient } from "@supabase/supabase-js";

type ProfileRow = {
  name: string;
  persona: string;
  voice_id: string | null;
  model: string;
  temperature: number;
};

type MessageRow = {
  role: string;
  content: string;
  created_at: string;
};

export default async function Page() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const gatewayUrl = process.env.WATCHAGENT_GATEWAY_URL ?? "ws://localhost:8000/watchagent/v1";
  let profile: ProfileRow | null = null;
  let messages: MessageRow[] = [];
  let error: string | null = null;

  if (supabaseUrl && secretKey) {
    const supabase = createClient(normalizeSupabaseUrl(supabaseUrl), secretKey, { auth: { persistSession: false } });
    const profileResult = await supabase.from("agent_profiles").select("name,persona,voice_id,model,temperature").eq("is_active", true).limit(1).maybeSingle();
    const messagesResult = await supabase.from("messages").select("role,content,created_at").order("created_at", { ascending: false }).limit(12);
    if (profileResult.error) error = profileResult.error.message;
    if (messagesResult.error) error = messagesResult.error.message;
    profile = profileResult.data;
    messages = messagesResult.data ?? [];
  } else {
    error = "Set SUPABASE_URL and SUPABASE_SECRET_KEY for the admin UI.";
  }

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">WatchAgent</p>
          <h1>M5Stack Stopwatch Voice Agent</h1>
          <p className="lede">Real watch audio, ElevenLabs voice, Vercel AI Gateway intelligence, Supabase memory.</p>
        </div>
        <div className="endpoint">
          <span>Gateway</span>
          <code>{gatewayUrl}</code>
        </div>
      </section>

      {error ? <div className="notice">{error}</div> : null}

      <section className="grid">
        <article className="panel">
          <h2>Active Persona</h2>
          <dl>
            <dt>Name</dt>
            <dd>{profile?.name ?? "No active profile"}</dd>
            <dt>Model</dt>
            <dd>{profile?.model ?? "Not configured"}</dd>
            <dt>Voice</dt>
            <dd>{profile?.voice_id ?? "Not configured"}</dd>
            <dt>Temperature</dt>
            <dd>{profile?.temperature ?? "Not configured"}</dd>
          </dl>
          <p className="persona">{profile?.persona ?? "Create the Supabase schema and active profile first."}</p>
        </article>

        <article className="panel">
          <h2>Setup Checklist</h2>
          <ul className="checklist">
            <li>Apply `supabase/schema.sql` to Supabase.</li>
            <li>Set the `.env` values from `.env.example`.</li>
            <li>Run `npm run check:env`.</li>
            <li>Run `npm run dev:gateway` and point the watch to the gateway URL.</li>
          </ul>
        </article>
      </section>

      <section className="panel">
        <h2>Recent Transcript</h2>
        <div className="messages">
          {messages.length === 0 ? (
            <p className="muted">No messages yet.</p>
          ) : (
            messages.map((message) => (
              <div className="message" key={`${message.created_at}-${message.content}`}>
                <span>{message.role}</span>
                <p>{message.content}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function normalizeSupabaseUrl(url: string): string {
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
}
