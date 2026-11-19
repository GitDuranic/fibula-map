// Writes supabase/migrations/0001_map_quests.sql (slice 13b): the quest tables for the map and the quests of the
// user's Project Fibula list (tools/data/fibula-quests.json), with TibiaWiki's version and reward
// (tools/data/wikiquests.json) where the names match.
//
// Usage: node tools/quests-sql.js
// The script it writes is safe to run again: quests already in the table are left as they are.
import fs from 'node:fs';
import { questKey } from '../src/map/engine/questdata.js';

const list = JSON.parse(fs.readFileSync('tools/data/fibula-quests.json', 'utf8')).quests;
const wiki = new Map(JSON.parse(fs.readFileSync('tools/data/wikiquests.json', 'utf8')).quests.map((q) => [questKey(q.name), q]));

const str = (s) => (s == null || s === '' ? 'null' : `'${String(s).replace(/'/g, "''")}'`);
const rows = list.map((q, i) => {
  const w = wiki.get(questKey(q.n));
  return `  (${str(q.n)}, ${(i + 1) * 10}, ${q.level ?? 'null'}, ${str(q.area)}, ${str(q.reward)}, ${!!q.mark}, ${str(w?.implemented)}, ${str(w?.reward)})`;
});
const matched = list.filter((q) => wiki.has(questKey(q.n))).length;

const sql = `-- =====================================================================================
-- Tibia Map - database step 1: quests (slice 13b)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- It is safe to run again: tables use "if not exists", and quests already in the table are left alone.
-- Written by tools/quests-sql.js from tools/data/fibula-quests.json (${list.length} quests, ${matched} matched on TibiaWiki).
--
-- What it creates:
--   map_quests          the quests of the map's quest guides: name, level, area, rewards, notes, status
--   map_quest_history   every change to a quest (the row as it was before), so a bad edit can be undone
-- Everyone may read the quests. Nobody may change them yet: editing (two Discord accounts) is step 2.
-- =====================================================================================


-- -------------------------------------------------------------------------------------
-- 1. QUESTS
-- -------------------------------------------------------------------------------------
create table if not exists public.map_quests (
  id           bigint generated always as identity primary key,
  name         text not null unique,
  sort         integer not null default 0,               -- order in the list (gaps of 10 to slot quests in)
  level        integer,                                  -- level needed, null = none
  area         text,                                     -- e.g. Edron, Rookgaard
  rewards      text,                                     -- edited by hand (7.2 changes some)
  notes        text,
  status       text not null default 'not checked' check (status in ('not checked', 'checked')),
  fibula_mark  boolean not null default false,           -- the ✅ on the user's Project Fibula list
  wiki_version text,                                     -- TibiaWiki: implemented in
  wiki_reward  text,                                     -- TibiaWiki: reward (for reference)
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users (id) on delete set null
);

alter table public.map_quests enable row level security;

drop policy if exists "map quests: anyone reads" on public.map_quests;
create policy "map quests: anyone reads" on public.map_quests for select to anon, authenticated using (true);


-- -------------------------------------------------------------------------------------
-- 2. HISTORY
-- Every update or delete keeps the old row; every insert keeps the new one. Filled by a trigger, so nothing
-- can change a quest without leaving a trace.
-- -------------------------------------------------------------------------------------
create table if not exists public.map_quest_history (
  id          bigint generated always as identity primary key,
  quest_id    bigint not null,
  op          text not null,                             -- INSERT, UPDATE or DELETE
  row_data    jsonb not null,                            -- the quest before the change (after, for INSERT)
  changed_at  timestamptz not null default now(),
  changed_by  uuid default auth.uid()
);
create index if not exists map_quest_history_quest on public.map_quest_history (quest_id, changed_at desc);

alter table public.map_quest_history enable row level security;
-- No policies yet: only the dashboard (and later the editors) can see it.

create or replace function public.map_quests_log()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.map_quest_history (quest_id, op, row_data) values (new.id, tg_op, to_jsonb(new));
    return new;
  end if;
  insert into public.map_quest_history (quest_id, op, row_data) values (old.id, tg_op, to_jsonb(old));
  if tg_op = 'UPDATE' then
    new.updated_at := now();
    new.updated_by := auth.uid();
    return new;
  end if;
  return old;
end;
$$;

drop trigger if exists map_quests_log on public.map_quests;
create trigger map_quests_log
  before insert or update or delete on public.map_quests
  for each row execute function public.map_quests_log();


-- -------------------------------------------------------------------------------------
-- 3. THE QUESTS (the user's Project Fibula list)
-- -------------------------------------------------------------------------------------
insert into public.map_quests (name, sort, level, area, rewards, fibula_mark, wiki_version, wiki_reward) values
${rows.join(',\n')}
on conflict (name) do nothing;
`;

fs.mkdirSync('supabase/migrations', { recursive: true });
fs.writeFileSync('supabase/migrations/0001_map_quests.sql', sql);
console.log(`supabase/migrations/0001_map_quests.sql: ${list.length} quests, ${matched} with TibiaWiki data`);
