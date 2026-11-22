-- =====================================================================================
-- Tibia Map - database step 18: editors may delete quests (2026-11-22)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- Safe to run again. Needs steps 2 and 3.
--
-- What it does:
--   map_quests   the editors may delete a quest (the quest's edit form: "Delete quest"). Its segments and steps go
--                with it (step 3's "on delete cascade"). The quest, its segments and its steps all stay in
--                map_quest_history (the triggers of steps 1 and 3), so a deleted quest can be put back by hand.
-- =====================================================================================

grant delete on public.map_quests to authenticated;

drop policy if exists "map quests: editors delete" on public.map_quests;
create policy "map quests: editors delete" on public.map_quests
  for delete to authenticated
  using (public.map_is_editor());
