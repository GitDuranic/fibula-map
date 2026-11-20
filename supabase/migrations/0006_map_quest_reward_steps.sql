-- =====================================================================================
-- Tibia Map - database step 6: Reward steps (2026-11-20)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- Safe to run again. Needs step 3.
--
-- What it does:
--   map_quest_steps.kind     may now also be 'reward': the chest (or other spot) where you get a quest reward
--   map_quest_steps.object   a Reward step's object shown on the map (item id: chest, box, corpse...); its items
--                            go in the existing items column, like a Get step
-- The editors' rules and the history trigger from step 3 cover the new column.
-- =====================================================================================

alter table public.map_quest_steps drop constraint if exists map_quest_steps_kind_check;
alter table public.map_quest_steps add constraint map_quest_steps_kind_check
  check (kind in ('talk', 'go', 'get', 'kill', 'note', 'reward'));

alter table public.map_quest_steps add column if not exists object integer;
