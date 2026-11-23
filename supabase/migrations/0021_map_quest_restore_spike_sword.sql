-- =====================================================================================
-- Tibia Map - database step 21: put the Spike Sword Quest back (2026-11-23)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- Safe to run again: it does nothing while a quest with that name exists.
--
-- What it does:
--   The user deleted the Spike Sword Quest, but it is on the 7.2 map. Step 18's delete kept the quest, its parts and
--   its steps in map_quest_history (op DELETE, all at the same moment: the cascade runs in one transaction). This
--   puts the last deleted version back as it was, with the same ids, so links and players' progress still match.
-- =====================================================================================

do $$
declare
  h record;
begin
  if exists (select 1 from public.map_quests where name = 'Spike Sword Quest') then
    raise notice 'Spike Sword Quest is already there: nothing to do.';
    return;
  end if;

  -- The last time the quest was deleted.
  select quest_id, changed_at into h
  from public.map_quest_history
  where tbl = 'quest' and op = 'DELETE' and row_data->>'name' = 'Spike Sword Quest'
  order by changed_at desc
  limit 1;
  if h is null then
    raise exception 'No deleted Spike Sword Quest found in map_quest_history.';
  end if;

  -- The quest row, then its parts, then its steps (as they were at that delete).
  insert into public.map_quests overriding system value
  select (jsonb_populate_record(null::public.map_quests, row_data)).*
  from public.map_quest_history
  where tbl = 'quest' and op = 'DELETE' and quest_id = h.quest_id and changed_at = h.changed_at;

  insert into public.map_quest_segments overriding system value
  select (jsonb_populate_record(null::public.map_quest_segments, row_data)).*
  from public.map_quest_history
  where tbl = 'segment' and op = 'DELETE' and quest_id = h.quest_id and changed_at = h.changed_at;

  insert into public.map_quest_steps overriding system value
  select (jsonb_populate_record(null::public.map_quest_steps, row_data)).*
  from public.map_quest_history
  where tbl = 'step' and op = 'DELETE' and quest_id = h.quest_id and changed_at = h.changed_at;

  raise notice 'Spike Sword Quest (id %) is back, as it was on %.', h.quest_id, h.changed_at;
end $$;

-- Check: the quest with its number of parts and steps.
select q.id, q.name, q.wiki_version,
  (select count(*) from public.map_quest_segments s where s.quest_id = q.id) as parts,
  (select count(*) from public.map_quest_steps t where t.quest_id = q.id) as steps
from public.map_quests q
where q.name = 'Spike Sword Quest';
