-- =====================================================================================
-- Tibia Map - database step 16: Key steps (slice 13l, 2026-11-22)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- Safe to run again. Needs step 6.
--
-- What it does:
--   map_quest_steps.kind   may now also be 'key': "use key N on the door" on a locked door's spot. The key comes
--                          from the map's door data (no new column); the quest's route goes through that door
--                          from this step on, while the door keeps its key on the map.
-- =====================================================================================

alter table public.map_quest_steps drop constraint if exists map_quest_steps_kind_check;
alter table public.map_quest_steps add constraint map_quest_steps_kind_check
  check (kind in ('talk', 'go', 'get', 'kill', 'note', 'reward', 'key'));
