-- =====================================================================================
-- Tibia Map - database step 23: put the Mad Mage Room Quest back, for 7.2 (2026-11-23)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- Safe to run again.
--
-- What it does:
--   The user thinks they deleted the Mad Mage Room Quest, but it came in 7.24 (TibiaWiki), so it belongs on the
--   7.2 map. When it's gone, the last deleted version comes back from map_quest_history (the quest with its parts
--   and steps, same ids; like step 21). Either way it gets "came in" 7.24, so the 7.1 map hides it.
-- =====================================================================================

do $$
declare
  h record;
begin
  if exists (select 1 from public.map_quests where name = 'Mad Mage Room Quest') then
    raise notice 'Mad Mage Room Quest is still there: only its version is set.';
  else
    -- The last time the quest was deleted.
    select quest_id, changed_at into h
    from public.map_quest_history
    where tbl = 'quest' and op = 'DELETE' and row_data->>'name' = 'Mad Mage Room Quest'
    order by changed_at desc
    limit 1;
    if h is null then
      raise exception 'No deleted Mad Mage Room Quest found in map_quest_history.';
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

    raise notice 'Mad Mage Room Quest (id %) is back, as it was on %.', h.quest_id, h.changed_at;
  end if;

  -- Came in 7.24: hidden on the 7.1 map.
  update public.map_quests set wiki_version = '7.24' where name = 'Mad Mage Room Quest';
end $$;

-- Check: the quest with its version and number of parts and steps.
select q.id, q.name, q.wiki_version,
  (select count(*) from public.map_quest_segments s where s.quest_id = q.id) as parts,
  (select count(*) from public.map_quest_steps t where t.quest_id = q.id) as steps
from public.map_quests q
where q.name = 'Mad Mage Room Quest';
