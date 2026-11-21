-- =====================================================================================
-- Tibia Map - database step 13: AI drafts of quest guides from the TibiaWiki walkthroughs (slice 13j)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- Needs steps 3, 6, 7 and 9. Written by tools/drafts-to-sql.js from tools/data/quest-drafts. Every step is a draft
-- (not checked) with its wiki sentence as its source; what the checker couldn't tie to a real NPC, word, monster,
-- item or spot is a Note "Needs placing: ...". The quest's Reward steps from the old spots are moved into the draft.
-- Earlier drafts of these quests are replaced; a quest with anything made, changed or ticked in the app is skipped.
--
-- 141 steps for 19 quests (0 need placing):
--   Adorned UH Rune Quest: 1 part, 9 steps + 0 Reward steps
--   Alawar's Vault Quest: 1 part, 11 steps + 0 Reward steps
--       can't walk 32040,31636,8 -> 32172,31602,10 (Take key 4501 from the chest.): No route found: these two places are not connected.
--   Barbarian Axe Quest: 1 part, 7 steps + 1 Reward step
--       can't walk 33173,31900,7 -> 33172,31896,8 (Pull the lever if the stones block the way into the orc cave.): No route found: these two places are not connected.
--   Battle Axe Quest: 1 part, 3 steps + 1 Reward step
--       can't walk 32302,32257,8 -> 32305,32254,9 (reward): No route found: these two places are not connected.
--   Behemoth Quest: 1 part, 9 steps + 0 Reward steps
--       can't walk 33285,31700,12 -> 33296,31672,15 (Go down the stairs on the platform, kill the behemoths by the stairs, go north through the narrow passage and up the stairs, through the level 80 door.): No route found: these two places are not connected.
--   Berserker Treasure Quest: 1 part, 8 steps + 0 Reward steps
--       can't walk 33173,31900,7 -> 33172,31896,8 (Pull the lever if the stones block the way into the orc cave.): No route found: these two places are not connected.
--   Black Knight Quest: 1 part, 11 steps + 2 Reward steps
--   Blood Herb Quest: 1 part, 1 steps + 1 Reward step
--   Circle Room Quest: 1 part, 11 steps + 0 Reward steps
--   Combat Knife Quest: 1 part, 2 steps + 0 Reward steps
--   Crusader Helmet Quest: 1 part, 9 steps + 0 Reward steps
--   Crystal Wand Quest: 1 part, 5 steps + 1 Reward step
--   Dark Armor Quest: 1 part, 9 steps + 0 Reward steps
--       can't walk 33173,31900,7 -> 33172,31896,8 (Pull the lever if the stones block the way into the orc cave.): No route found: these two places are not connected.
--   Dead Archer Quest: 1 part, 5 steps + 1 Reward step
--   Deeper Fibula Quest: 1 part, 12 steps + 0 Reward steps
--       can't walk 32219,32401,10 -> 32239,32471,10 (The tower shield is in the skeleton under the fire field in the north-west corner (destroy field rune).): No route found: these two places are not connected.
--   Demona Ring Quest: 1 part, 5 steps + 0 Reward steps
--   Devil Helmet Quest: 2 parts, 13 steps + 0 Reward steps
--   Double Hero Quest: 1 part, 10 steps + 0 Reward steps
--   Doublet Quest: 1 part, 1 steps + 1 Reward step
-- =====================================================================================

-- Adorned UH Rune Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 1 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 1 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (1, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (1, seg, 10, 'note', 'Bring a rope.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Rope');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (1, seg, 20, 'go', 'Go down into the Edron Hero Cave, north of Edron (wild warriors and hunters outside).', 33164, 31636, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'First of all, you have to go to the Edron Hero Cave.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (1, seg, 30, 'go', 'Kill the wild warriors and go down the next hole.', 33161, 31624, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'When you enter to the undergrounds, you have to kill some wild warriors. Go to the next hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (1, seg, 40, 'go', 'Go down the stairs (demon skeletons, wild warriors, a priestess and a beholder).', 33136, 31593, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Now you have to kill some Demon Skeletons, Wild Warriors, Prietesses and Bonelords. Go with that way, and go downstairs.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (1, seg, 50, 'go', 'Go down the stairs again (demon skeletons, wild warriors, a monk).', 33169, 31588, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Now you have to go with that way, killing some Monks, Demon Skeletons and Wild Warriors. Go downstairs.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (1, seg, 60, 'go', 'Kill the 3 dragons and go down the hole.', 33150, 31595, 11, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Kill the 3 Dragons and 2 Dragon Hatchlings and enter that hole. (No dragon hatchlings in 7.1.)');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (1, seg, 70, 'go', 'Go down the stairs (a hero and monks).', 33144, 31589, 12, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Now you have to kill one Hero and two Monks. Go with that way and again, go downstairs.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (1, seg, 80, 'go', 'Go down 2 floors to the last floor (priestesses, hunters and stalkers, then monks).', 33137, 31599, 13, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Now you have to kill some Hunters, Demon Skeletons and Prietesses. Go downstairs. This is the last floor, it containts 5 Monks.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (1, seg, 90, 'reward', 'The silver rune emblem is in the box (5 monks on this floor).', 33136, 31601, 15, null, null, '[]'::jsonb, 2469, '[]'::jsonb, false, 'The Silver Rune Emblem is in the box.');
  update public.map_quest_steps st set segment_id = seg, sort = 90 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 1 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 90) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 1 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Alawar's Vault Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 2 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 2 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 2 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (2, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (2, seg, 10, 'note', 'Bring 20 gold for the boat and a pick. Bring key 4502 too if you already have it, or you may be trapped.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Equipment: Travel money (at least 20gp), Pick. The long path ... if you have already received it, you should bring it (or you may be trapped).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (2, seg, 20, 'talk', 'Take the boat north of Carlin to Folda.', null, null, null, 'Nielson', null, '[]'::jsonb, null, '[{"say":"hi","reply":"Ahoi, young man <your name> and welcome to the Nordic Tibia Ferries.","cond":["male characters only"],"alts":[{"cond":["female characters only"],"reply":"Ahoi, young lady <your name> and welcome to the Nordic Tibia Ferries."}]},{"say":"folda","reply":"Do you want a round-trip passage to Folda for 20 gold?"},{"say":"yes","reply":"Have a nice trip!","fx":["takes 20 gp","ends the conversation","teleports you to 32048, 31582, 7"],"cond":["if you have 20 gp"],"alts":[{"reply":"You don''t have enough money."},{"other":true,"reply":"You shouldn''t miss the experience."}]}]'::jsonb, false, 'Go to Folda via the ferry north of Carlin (20gp).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (2, seg, 30, 'go', 'Go down into the Folda caves.', 31998, 31570, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Enter Folda caves (Mapper Coords 124.255, 123.83, 7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (2, seg, 40, 'go', 'Go south-west through the minotaurs and down.', 32028, 31539, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'From the start of the cave, follow south-west until you come to a room with Minotaurs.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (2, seg, 50, 'get', 'Take key 4503 from the chest in the western room.', 32031, 31686, 8, null, null, '[[2970,1]]'::jsonb, null, '[]'::jsonb, false, 'To the west, get Key 4503 from a chest in the western room.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (2, seg, 60, 'go', 'Open the door of the protected area with key 4503 and use your pick on the fire against the wall, between the stone piles. Go down the hole: you fall two floors and can only get out by finishing the quest.', 32040, 31636, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Backtrack and find the protected area. Enter with Key 4503 and follow to the fire fields. Use pick on the fire field against the wall, between stone piles. Go down the hole. Note: you cannot return here!');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (2, seg, 70, 'get', 'Take key 4501 from the chest.', 32172, 31602, 10, null, null, '[[2970,1]]'::jsonb, null, '[]'::jsonb, false, 'Follow the green line to get Key 4501, Key 4502 and then follow it to Alawar''s Vault.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (2, seg, 80, 'get', 'Take key 4502 from the chest (with a dark helmet and a blank rune).', 32201, 31571, 10, null, null, '[[2970,1],[3147,1],[3384,1]]'::jsonb, null, '[]'::jsonb, false, 'Follow the green line to get Key 4501, Key 4502 and then follow it to Alawar''s Vault.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (2, seg, 90, 'go', 'Go up into Alawar''s Vault (minotaurs and a minotaur mage).', 32106, 31576, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Enter the Magic Forcefield to enter Alawar''s Vault. Beware Minotaurs and a Minotaur Mage.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (2, seg, 100, 'reward', 'Open the chest by the teleporter: 3 white pearls.', 32105, 31567, 9, null, null, '[[3026,3]]'::jsonb, 2472, '[]'::jsonb, false, 'Open the 2 chests by the teleporter to receive your reward.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (2, seg, 110, 'reward', 'And the other chest: the broadsword. The teleporter takes you out to the top of the castle.', 32109, 31567, 9, null, null, '[[3301,1]]'::jsonb, 2472, '[]'::jsonb, false, 'Open the 2 chests by the teleporter to receive your reward. Go back through the teleporter to appear on the top of the castle.');
  update public.map_quest_steps st set segment_id = seg, sort = 110 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 2 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 110) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 2 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Barbarian Axe Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 4 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 4 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (4, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (4, seg, 10, 'note', 'Bring a rope.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Rope');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (4, seg, 20, 'go', 'Go down the ramp into the cellar south-west of Edron castle.', 33173, 31900, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go down into the Edron Orc Cave. The entrance is southwest of the castle (Mapper Coords 129.149, 124.156, 7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (4, seg, 30, 'go', 'Pull the lever if the stones block the way into the orc cave.', 33172, 31896, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'You can access this area through a drain in the basement of the Edron Flats. (On the 7.1 map the cellar has a lever and stones that close the way.)');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (4, seg, 40, 'go', 'Follow the cave west and south and go down (orcs, orc spearmen, orc warriors, poison spiders).', 33164, 31932, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Once in the hole, you will meet only Poison Spiders, Orcs, Orc Spearmen and Orc Warriors. Follow the cave to the west and then south.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (4, seg, 50, 'go', 'Go west and down again (orc warriors, orc spearmen, poison spiders).', 33153, 31930, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'On this floor you will encounter Poison Spiders, Orcs, Orc Spearmen, Orc Warriors and probably one or two lured Orc Berserkers.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (4, seg, 60, 'go', 'Go down again (orc warriors and an orc berserker).', 33165, 31930, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Once down this hole you will face Orc Berserkers, Poison Spiders and Orc Warriors.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (4, seg, 70, 'kill', 'Careful: orc berserkers right at the bottom. Go south into the last room: orc berserkers, 2 orc leaders and orc warriors.', 33183, 31940, 11, null, 'Orc Berserker', '[]'::jsonb, null, '[]'::jsonb, false, 'Right after going down the hole, you will encounter 3 - 5 Orc Berserkers. As you head south into the final room, you will have to face 3+ Orc Berserkers, 2 Orc Leaders and 2-3 Orc Warriors.');
  update public.map_quest_steps st set segment_id = seg, sort = 70 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 4 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 70) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 4 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Battle Axe Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 5 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 5 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (5, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (5, seg, 10, 'note', 'Bring a pick and a rope.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Requirements: Rope, Pick.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (5, seg, 20, 'go', 'Go down into the Thais sewers near the depot.', 32310, 32248, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Enter the Thais Sewers near the depot. You will face Rats here.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (5, seg, 30, 'go', 'Go to the south-west end of the sewers and use your pick 2 squares north of the dead end on the east side. Go down the hole.', 32302, 32257, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Navigate to the south-west end of the cave (Mapper Coords 126.46, 126.1, 8). Use a pick on the tile 2 sqm north of the dead end on the eastern side. A hole should open.');
  update public.map_quest_steps st set segment_id = seg, sort = 30 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 5 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 30) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 5 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Behemoth Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 7 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 7 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (7, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (7, seg, 10, 'note', 'Bring destroy field runes.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Requirements: Destroy Field Runes (at least 1, more recommended).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (7, seg, 20, 'go', 'Go down into Cyclopolis, north of Edron.', 33250, 31697, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go north of Edron to Cyclopolis (Mapper Coords 129.226, 123.210, 7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (7, seg, 30, 'go', 'Follow the way 5 floors down (cyclopes, dwarf soldiers, fire elementals lower down) to the dragons'' floor, and go down again.', 33285, 31700, 12, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the maps below to reach the 5th floor of Cyclopolis, with the Dragons. Go down again and you will see an impressive overview of the Behemoth floor.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (7, seg, 40, 'note', 'Needs placing: open the way with the lever. Levitate down to the small platform north behind the stairs (2 cyclopes); if there are large rocks north of it, go back up, east and down, west and up, and up the south-eastern stairs. Kill the dragon lord, use a destroy field rune on the westernmost tile of the northern corridor and pull the lever to the right.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go north behind the stairs and find a spot to levitate down to a small platform with 2 Cyclopes. ... use a Destroy Field Rune on the tile furthest west of the northern corridor row. When the lever is to the right, backtrack to the rocks for the next step.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (7, seg, 50, 'go', 'Go down the stairs on the platform, kill the behemoths by the stairs, go north through the narrow passage and up the stairs, through the level 80 door.', 33296, 31672, 15, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go down the stairs on the platform and kill the Behemoths, Dwarf Soldiers and Cyclopes that spawn by the stairs. Go north through the narrow passage and up the stairs. Go through the level 80 Door of Expertise.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (7, seg, 60, 'kill', 'Clear the last room: behemoths and dragons.', 33296, 31662, 13, null, 'Behemoth', '[]'::jsonb, null, '[]'::jsonb, false, 'In the final room there are 4 Behemoths, 2 Cyclops Smiths, and 2 Dragons.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (7, seg, 70, 'reward', 'The rewards are in the chests at the north end of the room: the guardian halberd,', 33295, 31658, 13, null, null, '[[3315,1]]'::jsonb, 2472, '[]'::jsonb, false, 'When the room is clear you will find your rewards in the northern end of the room.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (7, seg, 80, 'reward', 'the demon shield,', 33297, 31658, 13, null, null, '[[3420,1]]'::jsonb, 2472, '[]'::jsonb, false, 'When the room is clear you will find your rewards in the northern end of the room.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (7, seg, 90, 'reward', 'and the golden armor.', 33298, 31658, 13, null, null, '[[3360,1]]'::jsonb, 2472, '[]'::jsonb, false, 'When the room is clear you will find your rewards in the northern end of the room.');
  update public.map_quest_steps st set segment_id = seg, sort = 90 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 7 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 90) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 7 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Berserker Treasure Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 8 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 8 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (8, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (8, seg, 10, 'note', 'Bring a rope.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Rope');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (8, seg, 20, 'go', 'Go down the ramp into the cellar south-west of Edron castle.', 33173, 31900, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go down into the Edron Orc Cave. The entrance is southwest of the castle (Mapper Coords 129.149, 124.156, 7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (8, seg, 30, 'go', 'Pull the lever if the stones block the way into the orc cave.', 33172, 31896, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'You can access this area through a drain in the basement of the Edron Flats. (On the 7.1 map the cellar has a lever and stones that close the way.)');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (8, seg, 40, 'go', 'Follow the cave west and south and go down (orcs, orc spearmen, orc warriors, poison spiders).', 33164, 31932, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Once in the hole, you will meet only Poison Spiders, Orcs, Orc Spearmen and Orc Warriors. Follow the cave to the west and then south.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (8, seg, 50, 'go', 'Go west and down again (orc warriors, orc spearmen, poison spiders).', 33153, 31930, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'On this floor you will encounter Poison Spiders, Orcs, Orc Spearmen, Orc Warriors and probably one or two lured Orc Berserkers.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (8, seg, 60, 'go', 'Go down again (orc warriors and an orc berserker).', 33165, 31930, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Once down this hole you will face Orc Berserkers, Poison Spiders and Orc Warriors.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (8, seg, 70, 'kill', 'Go east to the end of the floor, past orc berserkers and an orc leader.', 33196, 31924, 11, null, 'Orc Berserker', '[]'::jsonb, null, '[]'::jsonb, false, 'Down the hole you will meet up to 6 Orc Berserkers. Slowly make your way to the eastern end of the floor, fighting off more Orc Berserkers and 1-4 Orc Leaders.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (8, seg, 80, 'reward', 'The reward is in the box at the end of the floor.', 33199, 31923, 11, null, null, '[[3026,3],[3031,175]]'::jsonb, 2469, '[]'::jsonb, false, 'The reward is in a box at the end of the floor, as shown on the map.');
  update public.map_quest_steps st set segment_id = seg, sort = 80 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 8 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 80) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 8 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Black Knight Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 9 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 9 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (9, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (9, seg, 10, 'note', 'Bring a rope.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Requirements: Rope');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (9, seg, 20, 'go', 'Leave Venore by the north-west exit towards the Amazon camp, to the large ruined building in the swamp, and go down its stairs.', 32826, 31957, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Leave Venore from the north-west exit, traveling north-west toward the Amazon Camp. Stop when you find a large ruined building immersed in the swamp (Mapper Coords 128.59, 124.215, 7). Go down the stairs to the basement of this building.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (9, seg, 30, 'get', 'If the door in the basement is locked: key 5010 is in this dead tree west of the building.', 32800, 31959, 7, null, null, '[[2969,1]]'::jsonb, null, '[]'::jsonb, false, 'Key 5010, if door is locked; this key can be obtained in 2 dead trees west of the villa (Mapper Coords 128.45, 124.220, 7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (9, seg, 40, 'go', 'Go to the south end of the basement, through the door (key 5010 if it''s locked) and down the stairs.', 32822, 31970, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go to the south end of the basement to find a door. If it is locked, open it with Key 5010. Go in and down the stairs inside.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (9, seg, 50, 'go', 'Go down again.', 32825, 31968, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'You may find one of the parchments on this floor. Go down again.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (9, seg, 60, 'go', 'Follow the cave (either way at the split) and drop down the hole at the end (skeletons).', 32833, 31979, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the cave. When the cave splits in 2, pick either direction. Drop down the hole at the end of the cave.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (9, seg, 70, 'go', 'Follow the cave south and rope up at the end.', 32843, 31986, 11, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the cave south. Rope up at the end of the path.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (9, seg, 80, 'go', 'Follow the cave furthest south to the room with skeletons and drop down a hole.', 32853, 31993, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the cave furthest south again to a room with a few Skeletons. Drop down either of the two holes in this room.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (9, seg, 90, 'go', 'Go east to the wall, then north to the stairs and go down (beholders).', 32875, 31977, 11, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'There are 4 Bonelords on this floor. Go east until you hit a wall and then follow the cave north to find stairs. Go down the stairs.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (9, seg, 100, 'go', 'Go north through the level 50 gate and through the big room (a skeleton and a beholder) to the teleporter in the north.', 32874, 31942, 12, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'To the north is a level 50 Gate of Expertise. Go through it and head north. There will be 1 Skeleton, 2 Bonelords and 1 Wyvern in this large room. Kill them and go through the teleporter to the north.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (9, seg, 110, 'kill', 'Kill the Black Knight, the beholders and the scorpions in the round room.', 32874, 31950, 11, null, 'Black Knight', '[]'::jsonb, null, '[]'::jsonb, false, 'The teleporter brings you to a circular room with the Black Knight, 2 Bonelords, and a few Scorpions.');
  update public.map_quest_steps st set segment_id = seg, sort = 110 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 9 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 110) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 9 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Blood Herb Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 10 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 10 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (10, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (10, seg, 10, 'kill', 'Go to the small piece of land north-east of Wyda''s house (witches on the hill to the east) and kill the giant spider.', 32769, 31971, 7, null, 'Giant Spider', '[]'::jsonb, null, '[]'::jsonb, false, 'Prepare yourself and go up to fight a single Giant Spider. Be careful because 2 Witches spawn on a hill to the east and can shoot you as you walk.');
  update public.map_quest_steps st set segment_id = seg, sort = 10 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 10 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 10) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 10 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Circle Room Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 11 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 11 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (11, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (11, seg, 10, 'note', 'Bring a rope.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Rope');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (11, seg, 20, 'go', 'Go down into the dwarf mine west of Kazordoon.', 32495, 31974, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go to Kazordoon, and enter the Dwarf mine located (Mapper Coords 126.239, 124.231, 7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (11, seg, 30, 'go', 'Go down a level (dwarves).', 32497, 31980, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'You will be in a very small cave with one or two Dwarves. Go down a level.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (11, seg, 40, 'go', 'Follow the path north-east and go down the hole.', 32518, 31965, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow this path to the north-east, and go down the hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (11, seg, 50, 'go', 'Follow the path north, then east, and go down the hole.', 32540, 31948, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow this path to the north, and then east, and go down the hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (11, seg, 60, 'go', 'Follow the path south, west and north (groups of dwarf soldiers) and go down the hole.', 32527, 31951, 11, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow this path to the south, west, and then north. Watch out for groups of Dwarf Soldiers. Go down the hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (11, seg, 70, 'go', 'Go straight south and down the hole.', 32526, 31964, 12, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go directly south, and go down the hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (11, seg, 80, 'go', 'Go south, west and north through the dwarf guards and the level 32 door. Have your rope ready: down this hole you''re swarmed.', 32509, 31953, 13, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow this path to the south, west, and north through the Dwarf Guards. Here you will have to go through the Level 32 Door of Expertise. Before going down the hole, get ready with your rope.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (11, seg, 90, 'kill', 'Fight your way to the far south end of the room, along the east side (dwarf soldiers, guards and geomancers: kill the geomancers first).', 32500, 31985, 14, null, 'Dwarf Geomancer', '[]'::jsonb, null, '[]'::jsonb, false, 'Work your way through the Dwarves to the far south end of the room. By staying to the eastern side of the room, you will avoid most of the Dwarves. Kill the geomancers fast.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (11, seg, 100, 'reward', 'Open the box: the dwarven axe.', 32497, 31992, 14, null, null, '[[3323,1]]'::jsonb, 2469, '[]'::jsonb, false, 'This room is where the quest boxes are. Work your way to the far south end of the room to get your reward.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (11, seg, 110, 'reward', 'And the other box: the war hammer.', 32495, 31992, 14, null, null, '[[3279,1]]'::jsonb, 2469, '[]'::jsonb, false, 'This room is where the quest boxes are. Work your way to the far south end of the room to get your reward.');
  update public.map_quest_steps st set segment_id = seg, sort = 110 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 11 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 110) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 11 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Combat Knife Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 12 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 12 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (12, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (12, seg, 10, 'go', 'Go down into the Rookgaard sewers.', 32110, 32245, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go into the Rookgaard sewer entrance.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (12, seg, 20, 'reward', 'Follow the path north, then west twice (rats). The box is partly hidden behind debris.', 32102, 32235, 8, null, null, '[[3292,1]]'::jsonb, 2473, '[]'::jsonb, false, 'Follow the path north and then turn west twice. You will encounter a number of rats. The quest box will be partially hidden behind some debris.');
  update public.map_quest_steps st set segment_id = seg, sort = 20 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 12 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 20) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 12 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Crusader Helmet Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 13 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 13 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (13, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (13, seg, 10, 'note', 'Bring a rope and a melee weapon for the spider webs.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Rope. Any melee weapon or a firebug to break the spider webs on the way.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (13, seg, 20, 'go', 'Go down into the Pick ''N Shovel Mine west of Kazordoon.', 32549, 31987, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Head to Pick ''N Shovel Mine west of Kazordoon, located (Mapper Coords 127.36, 124.243, 7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (13, seg, 30, 'go', 'Head east and down the hole (dwarves).', 32562, 31994, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Head east and down the hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (13, seg, 40, 'go', 'Go straight down another hole.', 32564, 31992, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Immediately head down another hole and then head far to the west.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (13, seg, 50, 'go', 'Head far to the west (dwarf soldiers), then north and west, and down.', 32443, 31993, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Immediately head down another hole and then head far to the west. Head to the north and west and continue down another hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (13, seg, 60, 'go', 'Go on down (dwarf soldiers).', 32438, 31967, 11, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'You will meet Dwarf Guards. Head east continuing further down in the mine.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (13, seg, 70, 'go', 'Head east and further down (dwarf guards).', 32470, 31973, 12, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Head east continuing further down in the mine (Mapper Coords 126.213, 124.228, 12).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (13, seg, 80, 'go', 'Go north through the level 35 gate and down the hole: giant spiders below, and spider webs to break.', 32477, 31943, 13, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go north and through the level 35 gate of expertise. Head down the hole (Mapper Coords 126.221, 124.199, 13) and prepare to face Giant Spiders. There are some spider webs blocking the way.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (13, seg, 90, 'reward', 'The crusader helmet is in the skeleton at the far west end of the tunnel.', 32427, 31943, 14, null, null, '[[3391,1]]'::jsonb, 4285, '[]'::jsonb, false, 'The reward (a Crusader Helmet) is located in a skeleton body at the far west end of the tunnel (Mapper Coords 126.170, 124.196, 14).');
  update public.map_quest_steps st set segment_id = seg, sort = 90 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 13 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 90) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 13 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Crystal Wand Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 14 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 14 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (14, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (14, seg, 10, 'note', 'Bring a shovel and a rope.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Shovel, Rope');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (14, seg, 20, 'go', 'South of Northport, dig open the hole with your shovel and go down.', 32512, 31622, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Start at the cave a bit south of Northport. Use the shovel to open a hole (Mapper Coords 127.0, 123.136, 7) and get into it.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (14, seg, 30, 'note', 'Needs placing: in the small forest inside the cave, a hole behind the trees has a switch: turn it right to open the way into the Maze of Lost Souls (if it''s already right, turn it left and right again). Then on through the energy fields to the maze.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'In the red spot, behind the trees, there is a hole and inside that hole there is a switch that you must turn right to open the entrance to the MoLS. Note: If the switch is already turned right, then turn it left and right again.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (14, seg, 40, 'go', 'Through the maze: past the griffin shield room, through the level 60 gate, north, and the right passage to the stairs up to Demona.', 32500, 31677, 15, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'In the first entrance room is the Griffin Shield Quest. Keep going to the end of the passage and through the Gate of Expertise for level 60. Go north and take the right passage all the way to the stairs. Right above here is Demona.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (14, seg, 50, 'go', 'Go to the top of the room (warlocks, stone golems, elf arcanists) and down the stairs to the quest room (warlocks and dragons).', 32480, 31651, 14, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'In Demona are several Warlocks, a couple of Stone Golems and a few Elf Arcanists. Go to the top of the room. Down the stairs is the quest room with 4 Warlocks and 5 Dragons.');
  update public.map_quest_steps st set segment_id = seg, sort = 50 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 14 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 50) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 14 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Dark Armor Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 15 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 15 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (15, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (15, seg, 10, 'note', 'Bring a rope.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Rope');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (15, seg, 20, 'go', 'Go down the ramp into the cellar south-west of Edron castle.', 33173, 31900, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go down into the Edron Orc Cave. The entrance is southwest of the castle (Mapper Coords 129.149, 124.156, 7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (15, seg, 30, 'go', 'Pull the lever if the stones block the way into the orc cave.', 33172, 31896, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'You can access this area through a drain in the basement of the Edron Flats. (On the 7.1 map the cellar has a lever and stones that close the way.)');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (15, seg, 40, 'go', 'Follow the cave west and south and go down (orcs, orc spearmen, orc warriors, poison spiders).', 33164, 31932, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Once in the hole, you will meet only Poison Spiders, Orcs, Orc Spearmen and Orc Warriors. Follow the cave to the west and then south.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (15, seg, 50, 'go', 'Go west, take the passage north and drop down the hole in the first room on the east.', 33172, 31919, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go west and take the passage north. Go into the first room on the east and drop down the hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (15, seg, 60, 'go', 'Orc shamans right at the bottom (energy doesn''t hurt them). Go north over the tiled floor and down.', 33171, 31884, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'As soon as you drop down this hole, you will be surrounded by Orc Shamans. On this level, go north, facing more Orc Shamans. You will walk over a tile-floor area.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (15, seg, 70, 'go', 'Go north to the large pit (orc shamans, orc leaders, poison spiders) and down the hole on its north-east side.', 33184, 31864, 11, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Head north and you will see a large pit and a Giant Spider waiting for you inside of it. The hole to get down is on the north-east side of the pit.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (15, seg, 80, 'kill', 'Kill the giant spider (or grab the armor and run).', 33182, 31868, 12, null, 'Giant Spider', '[]'::jsonb, null, '[]'::jsonb, false, 'Just go down the hole and kill the Giant Spider. Instead of killing the Giant Spider you can also put on Defensive Fighting mode, run to the body, grab the loot, and go back.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (15, seg, 90, 'reward', 'The dark armor is in the dead body.', 33182, 31869, 12, null, null, '[[3383,1]]'::jsonb, 4240, '[]'::jsonb, false, 'You can find the Dark Armor inside a dead body on the ground.');
  update public.map_quest_steps st set segment_id = seg, sort = 90 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 15 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 90) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 15 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Dead Archer Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 16 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 16 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (16, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (16, seg, 10, 'note', 'Bring a shovel and a rope; an antidote for the poison fields.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Shovel, Rope. Recommended Antidote, Antidote Rune, or Destroy Field for Poison Fields.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (16, seg, 20, 'go', 'Dig open the hole of the troll cave east of Thais and go down.', 32493, 32259, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go the Thais troll cave east of town (Mapper Coords 126.235, 126.4, 7). You will need to use a shovel to open the hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (16, seg, 30, 'go', 'Go east and down (trolls).', 32484, 32265, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'After entering the cave, go east and go down a hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (16, seg, 40, 'go', 'Follow the path east and down the hole.', 32500, 32303, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow this path east and go down into the hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (16, seg, 50, 'go', 'Go south and down to the Dead Archer, through the poison fields on either side of the slime.', 32504, 32307, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow this path south to find the Dead Archer. On either side of the Slime spawn, you will have to pass through some Poison Fields.');
  update public.map_quest_steps st set segment_id = seg, sort = 50 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 16 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 50) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 16 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Deeper Fibula Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 17 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 17 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (17, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (17, seg, 10, 'note', 'Bring key 3940 (sold on Fibula) and destroy field runes.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required equipment: Key 3940, Key 3980, Destroy Field runes. If you are faced with a locked door, you need Key 3940 to open, it can be bought on the island.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (17, seg, 20, 'go', 'Go down the well in Fibula.', 32172, 32439, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Head to Fibula and enter the dungeon through the well.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (17, seg, 30, 'go', 'Follow the path (door: key 3940) and go down.', 32190, 32429, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the path shown on the map. If you are faced with a locked door, you need Key 3940 to open.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (17, seg, 40, 'go', 'Go down again.', 32210, 32437, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the path shown on the map.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (17, seg, 50, 'go', 'Go east, through the level 50 gate and into the right teleporter (minotaur guards and archers).', 32212, 32433, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Upon coming down, head east and through a teleporter. You will now be facing two teleporters, go through the level 50 gate of expertise and the right one.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (17, seg, 60, 'get', 'Go west through the fire and energy fields (minotaur mages) and use the hole: key 3980.', 32219, 32401, 10, null, null, '[[2972,1]]'::jsonb, null, '[]'::jsonb, false, 'Continue west through fire, and energy fields to get Key 3980, be prepared to face 3 Minotaur Mages. Key 3980 is found by "using" on a hole to the west.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (17, seg, 70, 'note', 'Go back and south past the minotaurs, open the door with key 3980 and go on through the minotaur room into the dragon cave (dragons and dragon lords).', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go back and then south, kill some Minotaurs, unlock the door with you newly found key. Continue further and now prepare to face ~16 Dragons and 4 Dragon Lords.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (17, seg, 80, 'reward', 'The tower shield is in the skeleton under the fire field in the north-west corner (destroy field rune).', 32239, 32471, 10, null, null, '[[3428,1]]'::jsonb, 4285, '[]'::jsonb, false, 'Tower Shield is in the north-west corner of the cave, under a Fire Field, inside a skeleton.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (17, seg, 90, 'reward', 'The warrior helmet is in the skeleton south of it, behind a rock.', 32239, 32478, 10, null, null, '[[3369,1]]'::jsonb, 4285, '[]'::jsonb, false, 'Warrior Helmet is south of the Tower Shield, in a skeleton that is hidden behind a rock.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (17, seg, 100, 'reward', 'The dwarven ring is in the skeleton north of the exit teleporter.', 32233, 32491, 10, null, null, '[[3097,1]]'::jsonb, 4240, '[]'::jsonb, false, 'Dwarven Ring is north of the exit portal, inside a skeleton.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (17, seg, 110, 'reward', 'The elven amulet is in the dragon corpse east of it.', 32245, 32492, 10, null, null, '[[3082,1]]'::jsonb, 4025, '[]'::jsonb, false, 'Elven Amulet is directly east of the Dwarven Ring, in a fresh-looking dragon corpse.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (17, seg, 120, 'reward', 'The knight axe is in the dead body south-east of it. The teleporter in the south-west takes you back to the dungeon entrance.', 32256, 32500, 10, null, null, '[[3318,1]]'::jsonb, 4240, '[]'::jsonb, false, 'Knight Axe is south-east of the Elven Amulet, in a dead human body. The portal in the south-west part of the last room leads back to the dungeon entrance.');
  update public.map_quest_steps st set segment_id = seg, sort = 120 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 17 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 120) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 17 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Demona Ring Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 19 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 19 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (19, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (19, seg, 10, 'note', 'Bring a shovel and a rope (the way to Demona).', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Items: Shovel, Rope');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (19, seg, 20, 'go', 'In Demona''s main room, go down the north-easternmost stairs (an elf arcanist and warlocks).', 32508, 31654, 14, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the route to Demona and go up into the main (pentagrammatic) room. Make your way to the northeastern-most staircase while fending off an Elf Arcanist and some Warlocks and go down.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (19, seg, 30, 'go', 'Follow the long hallway to the big room (elf arcanists and warlocks) and go up the stairs.', 32504, 31577, 15, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'You will come to a long hallway you''ll have to follow all the way until you get to a big room filled with Elf Arcanists and Warlocks. Go up either staircase in this room.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (19, seg, 40, 'reward', 'The left chest in the south: the stealth ring.', 32504, 31596, 14, null, null, '[[3049,1]]'::jsonb, 2472, '[]'::jsonb, false, 'There are two chests in the south of this floor, with the left one containing a Stealth Ring and the right one an Energy Ring.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (19, seg, 50, 'reward', 'The right chest: the energy ring.', 32515, 31596, 14, null, null, '[[3051,1]]'::jsonb, 2472, '[]'::jsonb, false, 'There are two chests in the south of this floor, with the left one containing a Stealth Ring and the right one an Energy Ring.');
  update public.map_quest_steps st set segment_id = seg, sort = 50 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 19 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 50) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 19 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Devil Helmet Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 20 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 20 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (20, 10, 'Key 3610') returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (20, seg, 10, 'note', 'Bring a rope, a destroy field rune and an antidote. You need at least 2 players.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'If you are getting the key you must have a Destroy Field rune. Rope. Recommended Antidote. You cannot complete this quest alone.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (20, seg, 20, 'go', 'Go down into the Ancient Temple north of Thais, two floors.', 32356, 32170, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go to the Ancient Temple, north of Thais (Mapper Coords 126.100, 125.171, 7). Go down two levels.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (20, seg, 30, 'go', 'Head as far north as you can and go down to the rotworms.', 32354, 32138, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Head as far north as you can go. Go down to the level with the Rotworms.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (20, seg, 40, 'go', 'Follow the path east and south and go down the ladder.', 32502, 32217, 11, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow this path to the east and south, and go down the ladder.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (20, seg, 50, 'go', 'Through the poison fields (antidote or destroy field) and down another level.', 32493, 32215, 12, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'On this level, there will be a lot of Poison Fields. Go down another level.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (20, seg, 60, 'go', 'Follow the path east and north (minotaurs) and go down the hole (cyclopes).', 32577, 32179, 13, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow this path to the east and north. Be careful of Minotaurs. Go down the hole that is circled on the map. You will face a couple Cyclopes down this hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (20, seg, 70, 'get', 'Go north and down to the minotaur room, south and up into the cyclops room. Pull the switch (it traps you in), kill the cyclopes, burn the fire away with the destroy field rune and use the hole: key 3610. The hole to the north takes you out.', 32589, 32097, 14, null, null, '[[2969,1]]'::jsonb, null, '[]'::jsonb, false, 'Follow the passage until you find the switch. Once you flip the switch, kill the cyclops. Use a destroy field rune on the fire. Now use the hole and you will get silver Key 3610. To exit, go to the hole down the passage to the north.');
  insert into public.map_quest_segments (quest_id, sort, name) values (20, 20, 'The helmet') returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (20, seg, 10, 'note', 'One of you goes down Mintwallin''s ladders, a bit west and up a hole, then south to the blocked passage and stands on the open square: that opens the grate for the others.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'At least one person must go this way. The selected person will go down the ladder, a bit west then up a hole. Go south to a blocked off passage. They must stand on the open square. This will open a grate for the others to go down.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (20, seg, 20, 'go', 'The others go south past spiders and poison fields to the grate and go down it.', 32482, 32170, 14, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'The rest of the group should now follow the other passage south until they get to some spiders and poison fields. The grate should now be open. All go down it.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (20, seg, 30, 'go', 'Go through the level 30 door and up the next hole. A dragon guards the last room; don''t step in the holes (a giant spider below).', 32469, 32169, 15, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Then go through the level 30+ requirement door, and up the next hole. Beware there is a dragon on this floor guarding the last room! The holes in the floor will lead to a Giant Spider.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (20, seg, 40, 'go', 'Open the door with key 3610 and go down to the quest room: minotaur guards, archers and mages.', 32466, 32153, 14, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go to the door and use Key 3610. Take the last step and go down to face 3 minotaur guards, 2 archers and mages.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (20, seg, 50, 'reward', 'The devil helmet is in this chest.', 32465, 32148, 15, null, null, '[[3356,1]]'::jsonb, 2472, '[]'::jsonb, false, 'Take the last step and go down.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (20, seg, 60, 'reward', 'The halberd is in the other chest.', 32466, 32148, 15, null, null, '[[3269,1]]'::jsonb, 2472, '[]'::jsonb, false, 'Take the last step and go down.');
  update public.map_quest_steps st set segment_id = seg, sort = 60 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 20 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 60) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 20 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Double Hero Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 21 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 21 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (21, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (21, seg, 10, 'note', 'Bring a rope.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Rope');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (21, seg, 20, 'go', 'Go down into the Edron Hero Cave, north of Edron (wild warriors and hunters outside).', 33164, 31636, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'First of all, you have to go to the Edron Hero Cave.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (21, seg, 30, 'go', 'Kill the wild warriors and go down the next hole.', 33161, 31624, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'When you enter to the undergrounds, you have to kill some wild warriors. Go to the next hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (21, seg, 40, 'go', 'Go down the stairs (demon skeletons, wild warriors, a priestess and a beholder).', 33136, 31593, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Now you have to kill some Demon Skeletons, Wild Warriors, Prietesses and Bonelords. Go with that way, and go downstairs.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (21, seg, 50, 'go', 'Go down the stairs again (demon skeletons, wild warriors, a monk).', 33169, 31588, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Now you have to go with that way, killing some Monks, Demon Skeletons and Wild Warriors. Go downstairs.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (21, seg, 60, 'go', 'Kill the 3 dragons and go down the hole.', 33150, 31595, 11, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Kill the 3 Dragons and enter that hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (21, seg, 70, 'go', 'Go down again (a hero and monks).', 33113, 31592, 12, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Here, you will face 1 Hero and 2 or 3 Monks.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (21, seg, 80, 'kill', 'Go south slowly: the room has 2 heroes, priestesses, demon skeletons and an orc shaman.', 33110, 31675, 13, null, 'Hero', '[]'::jsonb, null, '[]'::jsonb, false, 'In the room there are 2 Heroes, 1 Priestess, 2 Demon Skeletons, 1 Orc Shaman.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (21, seg, 90, 'reward', 'Open the box in the south of the room: the red gem.', 33109, 31679, 13, null, null, '[[3039,1]]'::jsonb, 2469, '[]'::jsonb, false, 'In the south of the room there are 2 chests open both to recieve the Club Ring and the Red Gem.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (21, seg, 100, 'reward', 'And the box next to it: the club ring.', 33110, 31679, 13, null, null, '[[3093,1]]'::jsonb, 2469, '[]'::jsonb, false, 'In the south of the room there are 2 chests open both to recieve the Club Ring and the Red Gem.');
  update public.map_quest_steps st set segment_id = seg, sort = 100 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 21 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 100) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 21 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Doublet Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 22 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 22 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (22, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (22, seg, 10, 'go', 'Go down the ladder in the stable north of Tom''s shop.', 32080, 32181, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go down the ladder on the stables north from Tom''s shop (Mapper Coords 125.81, 125.183, 7).');
  update public.map_quest_steps st set segment_id = seg, sort = 10 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 22 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 10) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 22 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;
