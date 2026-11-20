-- =====================================================================================
-- Tibia Map - database step 4: reward items on quests (2026-11-20)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- Safe to run again. Needs steps 1-3.
--
-- What it does:
--   map_quests.reward_items   the reward's items, added by hand by the editors: [[item id, count], ...]
--                             (shown as icons under the reward text, which stays free text)
--   Paradox Tower's reward text becomes "Choice of two of these rewards:" (its items are added in the map).
-- The editors' update rule from step 2 covers the new column; the history trigger keeps it with the rest of the row.
-- =====================================================================================

alter table public.map_quests add column if not exists reward_items jsonb not null default '[]'::jsonb;

do $$ begin
  alter table public.map_quests add constraint map_quests_reward_items_array check (jsonb_typeof(reward_items) = 'array');
exception when duplicate_object then null;
end $$;

-- The reward text copied from the Fibula list had an image caption in it.
update public.map_quests
set rewards = 'Choice of two of these rewards:'
where name = 'The Paradox Tower Quest' and rewards like '%Image showing how to get each reward%';
