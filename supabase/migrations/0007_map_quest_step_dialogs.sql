-- =====================================================================================
-- Tibia Map - database step 7: dialogs in Talk steps (slice 13f-1, 2026-11-20)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- Safe to run again. Needs step 3.
--
-- What it does:
--   map_quest_steps.dialog   a Talk step's conversation, in order, as a COPY of the lines (so it stays as checked
--                            when the NPC scripts change): [{ "say": "test", "reply": "...", "fx": ["..."],
--                            "cond": ["..."] }, ...]; a line typed by hand has "free": true and only "say".
-- The editors' rules and the history trigger from step 3 cover the new column.
-- =====================================================================================

alter table public.map_quest_steps add column if not exists dialog jsonb not null default '[]'::jsonb;

do $$ begin
  alter table public.map_quest_steps add constraint map_quest_steps_dialog_array check (jsonb_typeof(dialog) = 'array');
exception when duplicate_object then null;
end $$;
