-- =====================================================================================
-- Tibia Map - database step 3: quest segments and steps (slice 13d)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- Safe to run again. Needs steps 1 and 2.
--
-- What it creates:
--   map_quest_segments  the parts of a quest, in order (a simple quest has one)
--   map_quest_steps     the steps of a segment, in order: Talk, Go/use, Get, Kill or Note
--   map_quest_history   now also keeps every change to segments and steps (column tbl says which table)
-- Everyone may read them; only the two editors (map_is_editor(), step 2) may add, change or delete them.
-- =====================================================================================


-- -------------------------------------------------------------------------------------
-- 1. SEGMENTS
-- -------------------------------------------------------------------------------------
create table if not exists public.map_quest_segments (
  id          bigint generated always as identity primary key,
  quest_id    bigint not null references public.map_quests (id) on delete cascade,
  sort        integer not null default 0,
  name        text,                                      -- e.g. "To the tower"; null = "Part N"
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null
);
create index if not exists map_quest_segments_quest on public.map_quest_segments (quest_id, sort);


-- -------------------------------------------------------------------------------------
-- 2. STEPS
-- -------------------------------------------------------------------------------------
create table if not exists public.map_quest_steps (
  id          bigint generated always as identity primary key,
  quest_id    bigint not null references public.map_quests (id) on delete cascade,
  segment_id  bigint not null references public.map_quest_segments (id) on delete cascade,
  sort        integer not null default 0,
  kind        text not null default 'go' check (kind in ('talk', 'go', 'get', 'kill', 'note')),
  text        text,                                      -- what to do, in your own words
  x           integer,                                   -- the spot on the map (null for a Note without one)
  y           integer,
  z           integer,
  npc         text,                                      -- Talk: the NPC's name
  monster     text,                                      -- Kill: the monster
  items       jsonb not null default '[]'::jsonb,        -- Get: [[item id, count], ...]
  any_group   integer,                                   -- steps with the same number may be done in any order (not shown yet)
  checked     boolean not null default false,            -- an editor went through this step and it's right
  source      text,                                      -- where a drafted step came from (the wiki sentence, 13j)
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null
);
create index if not exists map_quest_steps_quest on public.map_quest_steps (quest_id, sort);


-- -------------------------------------------------------------------------------------
-- 3. RIGHTS: everyone reads, the editors write
-- -------------------------------------------------------------------------------------
alter table public.map_quest_segments enable row level security;
alter table public.map_quest_steps enable row level security;

drop policy if exists "map segments: anyone reads" on public.map_quest_segments;
create policy "map segments: anyone reads" on public.map_quest_segments for select to anon, authenticated using (true);
drop policy if exists "map segments: editors write" on public.map_quest_segments;
create policy "map segments: editors write" on public.map_quest_segments for all to authenticated
  using (public.map_is_editor()) with check (public.map_is_editor());

drop policy if exists "map steps: anyone reads" on public.map_quest_steps;
create policy "map steps: anyone reads" on public.map_quest_steps for select to anon, authenticated using (true);
drop policy if exists "map steps: editors write" on public.map_quest_steps;
create policy "map steps: editors write" on public.map_quest_steps for all to authenticated
  using (public.map_is_editor()) with check (public.map_is_editor());


-- -------------------------------------------------------------------------------------
-- 4. HISTORY: segments and steps go into the same history as quests
-- quest_id stays the quest (so one quest's whole history is together); tbl and row_id say what changed.
-- -------------------------------------------------------------------------------------
alter table public.map_quest_history add column if not exists tbl text not null default 'quest';
alter table public.map_quest_history add column if not exists row_id bigint;

create or replace function public.map_quest_parts_log()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  t text := case tg_table_name when 'map_quest_segments' then 'segment' else 'step' end;
begin
  if tg_op = 'INSERT' then
    insert into public.map_quest_history (quest_id, op, row_data, tbl, row_id) values (new.quest_id, tg_op, to_jsonb(new), t, new.id);
    return new;
  end if;
  insert into public.map_quest_history (quest_id, op, row_data, tbl, row_id) values (old.quest_id, tg_op, to_jsonb(old), t, old.id);
  if tg_op = 'UPDATE' then
    new.updated_at := now();
    new.updated_by := auth.uid();
    return new;
  end if;
  return old;
end;
$$;

drop trigger if exists map_quest_segments_log on public.map_quest_segments;
create trigger map_quest_segments_log
  before insert or update or delete on public.map_quest_segments
  for each row execute function public.map_quest_parts_log();

drop trigger if exists map_quest_steps_log on public.map_quest_steps;
create trigger map_quest_steps_log
  before insert or update or delete on public.map_quest_steps
  for each row execute function public.map_quest_parts_log();
