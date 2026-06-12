create extension if not exists vector;

create table if not exists agent_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'default',
  is_active boolean not null default false,
  persona text not null default 'You are WatchAgent, a concise voice assistant for an M5Stack Stopwatch.',
  voice_id text,
  model text not null default 'openai/gpt-4.1-mini',
  temperature numeric not null default 0.7,
  controls jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  id uuid primary key,
  device_id text,
  client_id text,
  route text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists memory_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references agent_profiles(id) on delete cascade,
  device_id text,
  content text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references agent_profiles(id) on delete cascade,
  title text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references knowledge_documents(id) on delete cascade,
  profile_id uuid references agent_profiles(id) on delete cascade,
  content text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists mcp_servers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references agent_profiles(id) on delete cascade,
  name text not null,
  url text not null,
  headers jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references agent_profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  instructions text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

insert into agent_profiles (name, is_active)
select 'default', true
where not exists (select 1 from agent_profiles where is_active = true);
