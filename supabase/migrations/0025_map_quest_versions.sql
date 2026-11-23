-- =====================================================================================
-- Tibia Map - database step 25: quests that differ a little per map version (2026-11-23, slice 15d)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- Safe to run again. Needs steps 1 and 3.
--
-- What it does:
--   map_quests          gone_in: the version from which the quest is gone (e.g. '7.2': only on maps before 7.2).
--                       Together with wiki_version ("came in") a quest can be 7.1-only, 7.2-only or both.
--   map_quest_segments  map_only: null = on every map version, else only on that one ('7.1', '7.2').
--   map_quest_steps     map_only: the same per step, so a step that differs gets a 7.1 and a 7.2 variant while
--                       the rest of the guide stays shared.
-- The editors' existing rights (steps 2 and 3) cover the new columns; the history triggers keep them too.
-- =====================================================================================

alter table public.map_quests         add column if not exists gone_in  text;
alter table public.map_quest_segments add column if not exists map_only text;
alter table public.map_quest_steps    add column if not exists map_only text;

-- A version is like '7.1' or '7.24' (digits and dots), or empty.
alter table public.map_quests drop constraint if exists map_quests_gone_in_check;
alter table public.map_quests add constraint map_quests_gone_in_check check (gone_in is null or gone_in ~ '^\d+(\.\d+)?$');
alter table public.map_quest_segments drop constraint if exists map_quest_segments_map_only_check;
alter table public.map_quest_segments add constraint map_quest_segments_map_only_check check (map_only is null or map_only ~ '^\d+(\.\d+)?$');
alter table public.map_quest_steps drop constraint if exists map_quest_steps_map_only_check;
alter table public.map_quest_steps add constraint map_quest_steps_map_only_check check (map_only is null or map_only ~ '^\d+(\.\d+)?$');

-- Check: the new columns.
select table_name, column_name, data_type from information_schema.columns
where table_schema = 'public' and column_name in ('gone_in', 'map_only') order by table_name;
