-- Habitower online: run this once in your Supabase project (Dashboard → SQL Editor → New query → paste → Run).
-- Safe to run again: everything is "if not exists" / "or replace".
--
-- What lives here, per signed-in user (row-level security: each user sees only their own rows):
--   docs      your saves, one JSON document per key: 'quests' (progress, XP), 'user' (your edits),
--             'building' (your own building.json, if you edited it in 🏗️), 'pack:<id>' (your private packs)
--   sessions  one row per Claude Code session that reported in (from your PC or a cloud session)
--   events    what each session did, already shortened to office events (no file contents, ~140 chars each)
--   ingest_tokens  the keys your Claude hooks use to write events into YOUR account (only a hash is stored)

-- ---------- saves ----------
create table if not exists public.docs (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  key text not null check (key ~ '^(quests|user|building|pack:[a-z0-9_-]{1,40})$'),
  data jsonb not null,
  rev bigint not null default 0,              -- set by the page (Date.now()); devices compare it to see a newer save
  updated_at timestamptz not null default now(),
  primary key (user_id, key),
  constraint docs_size check (pg_column_size(data) < 2000000)
);
alter table public.docs enable row level security;
drop policy if exists docs_own on public.docs;
create policy docs_own on public.docs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Claude sessions and their events ----------
create table if not exists public.sessions (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,                           -- Claude Code session id
  project text not null,                      -- floor id (the transcript folder name)
  project_name text,                          -- shown name (last part of the working folder)
  title text,
  source text not null default 'pc' check (source in ('pc', 'cloud')),
  created_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.sessions enable row level security;
drop policy if exists sessions_own on public.sessions;
create policy sessions_own on public.sessions for select to authenticated using (user_id = auth.uid());
drop policy if exists sessions_del on public.sessions;
create policy sessions_del on public.sessions for delete to authenticated using (user_id = auth.uid());

create table if not exists public.events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  session_id text not null,
  project text not null,
  msg jsonb not null,                         -- { type: 'events', events: [...] } or { type: 'link', ... }, as server.js streams them
  at timestamptz not null default now()
);
create index if not exists events_user_session on public.events (user_id, session_id, id desc);
alter table public.events enable row level security;
drop policy if exists events_own on public.events;
create policy events_own on public.events for select to authenticated using (user_id = auth.uid());

-- ---------- hook keys ----------
create extension if not exists pgcrypto with schema extensions;
create table if not exists public.ingest_tokens (
  hash text primary key,                      -- sha256 of the key; the key itself is shown once, then never stored
  user_id uuid not null references auth.users on delete cascade,
  label text,
  created_at timestamptz not null default now(),
  last_used timestamptz
);
alter table public.ingest_tokens enable row level security;
drop policy if exists tokens_own on public.ingest_tokens;
create policy tokens_own on public.ingest_tokens for select to authenticated using (user_id = auth.uid());
drop policy if exists tokens_del on public.ingest_tokens;
create policy tokens_del on public.ingest_tokens for delete to authenticated using (user_id = auth.uid());

-- a new hook key for the signed-in user; returns the key (shown to the user once)
create or replace function public.create_ingest_token(p_label text default null)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare k text;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if (select count(*) from ingest_tokens where user_id = auth.uid()) >= 20 then raise exception 'too many keys: delete an old one'; end if;
  k := 'htw_' || encode(gen_random_bytes(24), 'hex');
  insert into ingest_tokens (hash, user_id, label) values (encode(digest(k, 'sha256'), 'hex'), auth.uid(), left(p_label, 60));
  return k;
end $$;
revoke all on function public.create_ingest_token(text) from public, anon;
grant execute on function public.create_ingest_token(text) to authenticated;

-- the hook's only door: a valid key writes events into its owner's account, nothing else
create or replace function public.ingest(p_token text, p_session text, p_project text, p_project_name text,
                                          p_title text, p_source text, p_msgs jsonb)
returns int language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid; n int;
begin
  update ingest_tokens set last_used = now() where hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex') returning user_id into uid;
  if uid is null then raise exception 'unknown key' using errcode = '28000'; end if;
  if jsonb_typeof(p_msgs) <> 'array' or jsonb_array_length(p_msgs) > 200 then raise exception 'send 1-200 messages at a time'; end if;
  if length(p_session) > 80 or length(p_project) > 200 then raise exception 'bad session'; end if;
  insert into sessions (user_id, id, project, project_name, title, source)
    values (uid, p_session, p_project, left(p_project_name, 80), left(p_title, 120), case when p_source = 'cloud' then 'cloud' else 'pc' end)
  on conflict (user_id, id) do update set last_at = now(),
    title = coalesce(left(excluded.title, 120), sessions.title),
    project_name = coalesce(excluded.project_name, sessions.project_name);
  insert into events (user_id, session_id, project, msg)
    select uid, p_session, p_project, m from jsonb_array_elements(p_msgs) m where pg_column_size(m) < 20000;
  get diagnostics n = row_count;
  -- keep two weeks of history (checked now and then, not on every call)
  if random() < 0.02 then
    delete from events where user_id = uid and at < now() - interval '14 days';
    delete from sessions where user_id = uid and last_at < now() - interval '14 days';
  end if;
  return n;
end $$;
revoke all on function public.ingest(text, text, text, text, text, text, jsonb) from public;
grant execute on function public.ingest(text, text, text, text, text, text, jsonb) to anon, authenticated;

-- ---------- what the page's signed-in user may touch (row-level security above narrows it to their own rows) ----------
grant select, insert, update, delete on public.docs to authenticated;
grant select, delete on public.sessions, public.ingest_tokens to authenticated;
grant select on public.events to authenticated;
revoke all on public.docs, public.sessions, public.events, public.ingest_tokens from anon;

-- ---------- live updates to the page ----------
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.events; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.sessions; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.docs; exception when duplicate_object then null; end;
  end if;
end $$;
