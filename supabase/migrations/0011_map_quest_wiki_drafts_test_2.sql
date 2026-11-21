-- =====================================================================================
-- Tibia Map - database step 11: AI drafts of quest guides from the TibiaWiki walkthroughs (slice 13j)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- Needs steps 3, 6, 7 and 9. Written by tools/drafts-to-sql.js from tools/data/quest-drafts. Every step is a draft
-- (not checked) with its wiki sentence as its source; what the checker couldn't tie to a real NPC, word, monster,
-- item or spot is a Note "Needs placing: ...". The quest's Reward steps from the old spots are moved into the draft.
-- Earlier drafts of these quests are replaced; a quest with anything made, changed or ticked in the app is skipped.
--
-- 19 steps for 3 quests (0 need placing):
--   Bear Room Quest: 2 parts, 9 steps + 1 Reward step
--       can't walk 32148,32105,11 -> 32145,32100,11 (Open the door with key 4601.): No route found: these two places are not connected.
--   Troll Cave Quest: 2 parts, 7 steps + 2 Reward steps
--   Amber's Lost Notebook Quest: 1 part, 3 steps + 0 Reward steps
-- =====================================================================================

-- Bear Room Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 6 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 6 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (6, 10, 'Down to the minotaurs') returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (6, seg, 10, 'note', 'Bring a rope, and key 4601 for the bear room door (or a pick to get the key on the way).', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Rope. Key 4601 to bear room, or a Pick to get it.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (6, seg, 20, 'go', 'Go down the stairs in the abandoned building north of Rookgaard.', 32094, 32137, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go to the abandoned building a little north of Rookgaard and down the hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (6, seg, 30, 'go', 'Go east and down (trolls and spiders here).', 32126, 32124, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go east and down (Trolls here).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (6, seg, 40, 'go', 'Go down again (orcs and skeletons).', 32136, 32114, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go down again like it is shown on this map. There are a few Orcs here.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (6, seg, 50, 'go', 'Go down again (orcs, easy to outrun).', 32126, 32118, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go down again. There are 2-4 Orcs here. It''s fairly easy to out run them.');
  insert into public.map_quest_segments (quest_id, sort, name) values (6, 20, 'The bear room') returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (6, seg, 10, 'note', 'No key 4601? Use a pick on the mud south of the small table (32148, 32109) and take the key from the chest downstairs. That room isn''t on the 7.1 map: check in the game.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'To retrieve the key, use a pick on the mud floor square directly south of the big table. A hole will appear for you to go down. Downstairs is a chest with Key 4601; take it and go back up the ladder.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (6, seg, 20, 'go', 'Pull the lever if the stone blocks the bear room door.', 32148, 32105, 11, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'North of the big table is a switch which controls the stone which can block the door to the bear room further north. If the stone is blocking the door, remove it by using the switch.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (6, seg, 30, 'go', 'Open the door with key 4601.', 32145, 32100, 11, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go through the door and kill the Bear');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (6, seg, 40, 'kill', 'Kill the bear in the room (orcs and a minotaur in the rooms around it).', 32144, 32098, 11, null, 'Bear', '[]'::jsonb, null, '[]'::jsonb, false, 'Go through the door and kill the Bear, afterwards open all three boxes to get your reward.');
  update public.map_quest_steps st set segment_id = seg, sort = 40 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 6 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 40) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 6 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Troll Cave Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 78 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 78 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (78, 10, 'To the troll cave') returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (78, seg, 10, 'note', 'Bring a rope.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Rope');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (78, seg, 20, 'go', 'From the Edron depot, go down the drain in the south-west corner of the castle.', 33165, 31827, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'From the Edron depot, go down the drain in the south-west corner of the castle (Mapper Coords 129.141, 124.84, 7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (78, seg, 30, 'go', 'Follow the only way through the cave: 3 floors down, then use your rope 4 times to climb up into a grassy area.', 33129, 31811, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'There is only one way to go, so follow this cave down and up until you emerge in a grassy area (Mapper Coords 129.105, 124.67, 7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (78, seg, 40, 'go', 'Go down the hole of the troll cave to the north-west.', 33117, 31775, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go to the Troll Cave to the north-west (Mapper Coords 129.93, 124.32, 7), and go down the hole.');
  insert into public.map_quest_segments (quest_id, sort, name) values (78, 20, 'Down the troll cave') returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (78, seg, 10, 'go', 'Follow the path north and east past the trolls, and go down the hole.', 33119, 31740, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow this path to the north and east, and go down the hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (78, seg, 20, 'go', 'Follow the path to the room in the north and go down the hole (more trolls).', 33128, 31729, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow this path to the room to the north and go down the hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (78, seg, 30, 'note', 'Down here: trolls, swamp trolls, bears and a frost troll.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Here you will face a number of Trolls, Bears, Troll Champions, and a Frost Troll. (Monsters from the 7.1 spawns: troll champions came in 8.10.)');
  update public.map_quest_steps st set segment_id = seg, sort = 30 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 78 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 30) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 78 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Amber's Lost Notebook Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 3 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 3 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 3 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (3, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (3, seg, 10, 'get', 'Open the box on the dock east of Rookgaard: Amber''s notebook is in it. Watch out for the poison spiders.', 32173, 32197, 7, null, null, '[[2821,1]]'::jsonb, null, '[]'::jsonb, false, 'Head to the dock east of Rookgaard town (Mapper Coords 125.172, 125.197, 7). Be careful of Bugs, Spiders, and especially Poison Spiders near the dock. "Use" the chest on the dock to receive a black book.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (3, seg, 20, 'talk', 'Bring the notebook to Amber in the resting room under the Academy.', null, null, null, 'Amber', null, '[]'::jsonb, null, '[{"say":"hi","reply":"Oh hello, nice to see you <your name>."},{"say":"book","reply":"Do you bring me my notebook?"},{"say":"yes","reply":"Excellent. Here, take this short sword, that might serve you well.","fx":["takes book","you get short sword"],"cond":["if you have book"],"alts":[{"reply":"Hm, you don''t have it."},{"other":true,"reply":"Too bad."}]}]'::jsonb, false, 'Take the book back to the Rookgaard Academy, and talk to Amber in the Resting Room under the Academy. Tell her you found her notebook, and she will trade you for a Short Sword. Say: Hi, Book, Yes.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (3, seg, 30, 'reward', 'Amber gives you the short sword.', 32103, 32182, 8, null, null, '[[3294,1]]'::jsonb, 3294, '[]'::jsonb, false, 'Tell her you found her notebook, and she will trade you for a Short Sword.');
  update public.map_quest_steps st set segment_id = seg, sort = 30 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 3 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 30) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 3 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;
