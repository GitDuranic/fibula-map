-- =====================================================================================
-- Tibia Map - database step 8: the bring list's hand edits (slice 13h, 2026-11-21)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- Safe to run again. Needs step 3.
--
-- What it does:
--   map_quest_segments.bring   the editors' changes to a segment's bring list (the rest is worked out by the map):
--                              { "add": [[item id, count], ...], "hide": ["i3003", "k3001", "gold", ...] }
--                              (hide: worked-out entries that are wrong: i<item id>, k<key number>, gold)
-- The editors' rules and the history trigger from step 3 cover the new column.
-- =====================================================================================

alter table public.map_quest_segments add column if not exists bring jsonb not null default '{}'::jsonb;

do $$ begin
  alter table public.map_quest_segments add constraint map_quest_segments_bring_object check (jsonb_typeof(bring) = 'object');
exception when duplicate_object then null;
end $$;
