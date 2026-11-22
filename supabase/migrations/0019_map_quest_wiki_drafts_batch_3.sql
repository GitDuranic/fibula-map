-- =====================================================================================
-- Tibia Map - database step 19: AI drafts of quest guides from the TibiaWiki walkthroughs (slice 13j)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- Needs steps 3, 6, 7 and 9 and 16 (Key steps). Written by tools/drafts-to-sql.js from tools/data/quest-drafts. Every step is a draft
-- (not checked) with its wiki sentence as its source; what the checker couldn't tie to a real NPC, word, monster,
-- item or spot is a Note "Needs placing: ...". The quest's Reward steps from the old spots are moved into the draft.
-- Earlier drafts of these quests are replaced; a quest with anything made, changed or ticked in the app is skipped.
--
-- 147 steps for 20 quests (0 need placing):
--   Mad Mage Room Quest: 2 parts, 20 steps + 0 Reward steps
--       can't walk 32393,32136,14 -> 32393,32137,13 (He takes the 7 apples and gives you key 3666.): No route found: these two places are not connected.
--       can't walk 32393,32137,13 -> 32484,32101,15 (Leave Mintwallin the way you came in.): No route found: these two places are not connected.
--   Minotaur Hell Quest: 1 part, 8 steps + 0 Reward steps
--   Mintwallin Cyclops Quest: 1 part, 10 steps + 0 Reward steps
--   Noble Armor Quest: 1 part, 10 steps + 0 Reward steps
--   Orc Fortress Quest: 1 part, 6 steps + 0 Reward steps
--   Orc Shaman Quest: 1 part, 5 steps + 0 Reward steps
--   Ornamented Shield Quest: 1 part, 9 steps + 0 Reward steps (HAS HAND WORK: the SQL skips it)
--       can't walk 32771,32297,10 -> 32769,32302,10 (The chest behind the stalagmites: a time ring, a lyre, a spellbook, a garlic necklace and 5 platinum coins in a bag (the chest isn't on the 7.1 map; this is its 7.6 spot).): No route found: these two places are not connected.
--   Panpipe Quest: 1 part, 11 steps + 0 Reward steps
--   Plate Armor Quest: 1 part, 6 steps + 0 Reward steps
--       can't walk 32960,32022,7 -> 33317,32171,6 (Go down and fight your way across the gangplank to the southern boat (ghosts).): No route found: these two places are not connected.
--   Poison Daggers Quest: 1 part, 7 steps + 0 Reward steps
--       can't walk 33173,31900,7 -> 33172,31896,8 (Pull the lever if the stones block the way into the orc cave.): No route found: these two places are not connected.
--   Power Bolts Quest: 1 part, 6 steps + 0 Reward steps
--   Power Ring Quest: 1 part, 7 steps + 0 Reward steps
--   Present Quest: 2 parts, 5 steps + 0 Reward steps
--   Purple Tome Quest: 1 part, 7 steps + 0 Reward steps
--   Rapier Quest: 1 part, 3 steps + 0 Reward steps
--   Ring Quest: 1 part, 7 steps + 0 Reward steps
--   Scale Armor Quest: 1 part, 4 steps + 0 Reward steps (HAS HAND WORK: the SQL skips it)
--   Shaman Treasure Quest: 1 part, 6 steps + 0 Reward steps
--       can't walk 33173,31900,7 -> 33172,31896,8 (Pull the lever if the stones block the way into the orc cave.): No route found: these two places are not connected.
--   Silver Amulet Quest: 1 part, 4 steps + 0 Reward steps
--   Silver Brooch Quest: 1 part, 6 steps + 0 Reward steps
-- =====================================================================================

-- Mad Mage Room Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 45 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 45 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 45 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (45, 10, 'Key 3666 from A Prisoner') returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (45, seg, 10, 'note', 'Bring a rope, a shovel and 7 red apples.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Rope, Shovel, Key 3620, 7 Red Apples (for Key 3666).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (45, seg, 20, 'go', 'Go down into the Ancient Temple north of Thais, two floors.', 32356, 32170, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go to the Ancient Temple, north of Thais (Mapper Coords 126.100, 125.171, 7). Go down two levels.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (45, seg, 30, 'go', 'Head as far north as you can and go down two floors to the rotworms.', 32354, 32138, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Head as far north as you can go. Go down to the level with the Rotworms.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (45, seg, 40, 'go', 'Follow the path east and south and go down the ladder (rotworms, poison spiders, orcs and orc spearmen).', 32502, 32217, 11, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow this path to the east and south, and go down the ladder.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (45, seg, 50, 'go', 'Through the poison fields (antidote or destroy field) and down another level.', 32493, 32215, 12, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'On this level, there will be a lot of Poison Fields. You can either run through them and then use Antidote, or you can use Destroy Field to clear a path. Go down another level.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (45, seg, 60, 'go', 'Follow the path east and north (poison spiders, minotaurs) and go down the hole (cyclopes).', 32577, 32179, 13, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow this path to the east and north. Be careful of Minotaurs. Go down the hole that is circled on the map. You will face a couple Cyclopes down this hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (45, seg, 70, 'go', 'Head south down the leftmost passage and go up the hole to a small room, and up again.', 32552, 32154, 14, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Head south down the left most passage. Go up the hole to a small room and up again to another room.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (45, seg, 80, 'go', 'Go to the end of this passage and down the hole to a small room, and down again.', 32550, 32186, 12, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Here go to the end of this passage and down the hole to a small room and down again.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (45, seg, 90, 'go', 'Go down into Mintwallin.', 32484, 32101, 14, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'The first thing you need to do is go to the Prison in Mintwallin and talk to A Prisoner.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (45, seg, 100, 'get', 'Key 3620 is in the drawers of the barracks south of Markwin (minotaurs, minotaur guards, archers and mages).', 32411, 32155, 15, null, null, '[[2969,1]]'::jsonb, null, '[]'::jsonb, false, 'To get the key to his room, you need to go to the barracks, south of Markwin.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (45, seg, 110, 'go', 'Go up to the prison.', 32394, 32115, 15, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go to the Prison in Mintwallin and talk to A Prisoner.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (45, seg, 120, 'key', 'Open the prison door with key 3620; talk to A Prisoner through the bars.', 32393, 32136, 14, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'To get the key to his room, you need to go to the barracks, south of Markwin.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (45, seg, 130, 'talk', 'He takes the 7 apples and gives you key 3666.', null, null, null, 'A Prisoner', null, '[]'::jsonb, null, '[{"say":"hi","reply":"Huh? What? I can see! Wow! A non-mino. Did they capture you as well?"},{"say":"riddle","reply":"Great riddle, isn''t it? If you can tell me the correct answer, I will give you something. Hehehe!"},{"say":"pd-d-ks-p-pd","reply":"Hurray! For that I will give you my key for - hmm - let''s say ... some apples. Interested?"},{"say":"yes","reply":"Mnjam - excellent apples. Now - about that key. You are sure want it?","fx":["takes 7 red apples"],"cond":["if you have 7 red apples"],"alts":[{"reply":"Get some more apples first!"},{"other":true,"reply":"Then go away!","fx":["ends the conversation"]}]},{"say":"yes","reply":"Really, really?","alts":[{"other":true,"reply":"Then go away!","fx":["ends the conversation"]}]},{"say":"yes","reply":"Really, really, really, really?","alts":[{"other":true,"reply":"Then go away!","fx":["ends the conversation"]}]},{"say":"yes","reply":"Then take it and get happy - or die, hehe.","fx":["you get silver key (number 3666)"],"alts":[{"other":true,"reply":"Then go away!","fx":["ends the conversation"]}]}]'::jsonb, false, 'Ask him for the riddle. The correct answer is "PD-D-KS-P-PD". You receive silver Key 3666 after giving the apples.');
  insert into public.map_quest_segments (quest_id, sort, name) values (45, 20, 'The mad mage room') returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (45, seg, 10, 'go', 'Leave Mintwallin the way you came in.', 32484, 32101, 15, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'This is the path to the Mad Mage room from the surface. You will walk past this room on your way to Mintwallin.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (45, seg, 20, 'go', 'Head south, west, north, then right towards the level door and go down the stairs: a dragon, a giant spider, a beholder, demon skeletons, a ghoul, a scorpion and a skeleton.', 32557, 32177, 14, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Head south then west then north then take a right heading towards the level door. Head down the stairs BUT BEWARE!!!! There is at least one dragon, one giant spider, one Bonelord, 3 demon skeletons, one ghoul, one scorpion, and one skeleton.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (45, seg, 30, 'key', 'Clear the room, head south-east and open the door with key 3666.', 32578, 32197, 15, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'After clearing this room head to the southeast and through the locked door, using a key taken from A Prisoner.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (45, seg, 40, 'go', 'Go up the ladder and face the demon skeletons.', 32576, 32198, 15, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Once you are through the door, go up the ladder and face 3 Demon Skeletons.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (45, seg, 50, 'reward', 'The rewards are in this room: the stone skin amulet,', 32573, 32200, 14, null, null, '[[3081,1]]'::jsonb, 2473, '[]'::jsonb, false, 'The rewards are in chests in this room.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (45, seg, 60, 'reward', 'the hat of the mad,', 32574, 32200, 14, null, null, '[[3210,1]]'::jsonb, 2473, '[]'::jsonb, false, 'The rewards are in chests in this room.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (45, seg, 70, 'reward', 'and the star amulet.', 32577, 32200, 14, null, null, '[[3014,1]]'::jsonb, 2472, '[]'::jsonb, false, 'The rewards are in chests in this room.');
  update public.map_quest_steps st set segment_id = seg, sort = 70 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 45 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 70) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 45 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Minotaur Hell Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 46 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 46 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 46 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (46, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (46, seg, 10, 'go', 'From the level 2 bridge, head north into the main Rookgaard cave and go down.', 32094, 32137, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'From the level 2 bridge, head north to the main Rookgaard cave (Mapper Coords 125.95, 125.138, 7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (46, seg, 20, 'go', 'Follow the cave east (a rat, trolls) to the ladder going down.', 32126, 32124, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'On the -1 floor, expect to find a rat, a few trolls and maybe some spiders. Follow through the cave to the east until you reach a ladder going down.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (46, seg, 30, 'go', 'Head north (an orc), north-east at the first crossing and north-west at the second, to the next ladder down.', 32114, 32092, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'On the second underground floor (-2) you may find one or two orcs. Head north, follow the first cross-section north-east, and second north-west until you reach another ladder.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (46, seg, 40, 'go', 'The wolf maze: follow the path north through the wolves and an orc to the next ladder down.', 32123, 32050, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Descend to the third underground floor and you will be in the Wolf maze. Follow the path north through the masses of wolves and orcs to yet another ladder.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (46, seg, 50, 'go', 'Minotaur Hell: minotaurs, orcs and wolves. Clear the floor and go down the stairs to the minotaurs in the quest room.', 32134, 32065, 11, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'When going down the ladder, there will be about 2 minotaurs, 8 orcs and some wolves. Once the floor is cleared you can go down the staircase to the final room.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (46, seg, 60, 'reward', 'The three quest boxes are west of the stairs on the south wall: the carlin sword,', 32124, 32064, 12, null, null, '[[3283,1]]'::jsonb, 2473, '[]'::jsonb, false, 'Once the room has been cleared, the three quest boxes are just to the west of the stairs, on the south walls of the cave.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (46, seg, 70, 'reward', 'a bag with 10 arrows and 4 poison arrows,', 32127, 32065, 12, null, null, '[[2853,1],[3447,10],[3448,4]]'::jsonb, 2473, '[]'::jsonb, false, 'The bag contains 10 Arrows and 4 Poison Arrows.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (46, seg, 80, 'reward', 'and the fishing rod.', 32130, 32066, 12, null, null, '[[3483,1]]'::jsonb, 2473, '[]'::jsonb, false, 'The quest room and its rewards.');
  update public.map_quest_steps st set segment_id = seg, sort = 80 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 46 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 80) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 46 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Mintwallin Cyclops Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 47 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 47 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 47 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (47, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (47, seg, 10, 'note', 'Bring a rope, and an antidote or destroy field runes for the poison fields.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Rope. Recommended Antidote, Antidote Rune, or Destroy Field for Poison Fields.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (47, seg, 20, 'go', 'Go down into the Ancient Temple north of Thais, two floors.', 32356, 32170, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go to the Ancient Temple, north of Thais (Mapper Coords 126.100, 125.171, 7). Go down two levels.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (47, seg, 30, 'go', 'Head as far north as you can and go down two floors to the rotworms.', 32354, 32138, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Head as far north as you can go. Go down to the level with the Rotworms.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (47, seg, 40, 'go', 'Follow the path east and south and go down the ladder (rotworms, poison spiders, orcs and orc spearmen).', 32502, 32217, 11, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow this path to the east and south, and go down the ladder.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (47, seg, 50, 'go', 'Through the poison fields (antidote or destroy field) and down another level.', 32493, 32215, 12, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'On this level, there will be a lot of Poison Fields. You can either run through them and then use Antidote, or you can use Destroy Field to clear a path. Go down another level.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (47, seg, 60, 'go', 'Follow the path east and north (poison spiders, minotaurs) and go down the hole (cyclopes).', 32577, 32179, 13, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow this path to the east and north. Be careful of Minotaurs. Go down the hole that is circled on the map. You will face a couple Cyclopes down this hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (47, seg, 70, 'go', 'Follow this path all the way north and go down.', 32573, 32067, 14, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow this path all of the way north, and go down a level.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (47, seg, 80, 'go', 'Minotaurs, a minotaur archer and a minotaur guard. Work your way south through the room and use your rope here to go up.', 32587, 32089, 15, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'This room contains a large number of Minotaurs, Minotaur Archers, a Minotaur Mage and a Minotaur Guard. Work your way to the south of this room and go up a level.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (47, seg, 90, 'kill', 'Follow the passage to the switch. Pulling it moves the wall and traps you with the cyclopes: kill them.', 32602, 32104, 14, null, 'Cyclops', '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the passage until you find the switch. Be careful, when you flip the switch, the wall will be moved, and you will be essentially trapped with the Cyclopes.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (47, seg, 100, 'reward', 'The small diamond is in this chest.', 32590, 32097, 14, null, null, '[[3028,1]]'::jsonb, 2472, '[]'::jsonb, false, 'Once you flip the switch, you can get the reward.');
  update public.map_quest_steps st set segment_id = seg, sort = 100 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 47 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 100) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 47 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Noble Armor Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 48 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 48 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 48 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (48, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (48, seg, 10, 'note', 'Bring a rope and 1000 gold for Skjaar.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Rope. 1,000 gp to buy Key 3142 from Skjaar.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (48, seg, 20, 'go', 'Go into Mount Sternum and down the stairs (cyclopes).', 32482, 32056, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Enter through the west entrance of Mount Sternum, head downstairs. Be prepared to face some Cyclopes on the first floor.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (48, seg, 30, 'go', 'Head west and go down to the skeletons and ghouls.', 32473, 32042, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Start by heading west. On floor -2 you will face some Skeletons and a few Ghouls.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (48, seg, 40, 'go', 'Up the ladder in the south, down again, up the next ladder and down here.', 32460, 32062, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'You start at the stars and go up/down at the arrow markings.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (48, seg, 50, 'go', 'Use your rope here to go up to Skjaar.', 32453, 32039, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'You will need to find Skjaar below Mt Sternum.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (48, seg, 60, 'talk', 'He takes 1000 gold and gives you key 3142 if you answer right.', null, null, null, 'Skjaar', null, '[]'::jsonb, null, '[{"say":"hi","reply":"Hail, friend of nature! How may I help you?","cond":["druids only"],"alts":[{"cond":["knights only"],"reply":"Another creature who believes thinks physical strength is more important than wisdom! Why are you disturbing me?"},{"cond":["sorcerers only"],"reply":"It''s good to see somebody who has chosen the path of wisdom. What do you want?"},{"cond":["paladins only"],"reply":"Neither strong enough to be a knight nor wise enough to be a real mage. You like it easy, don''t you? Why are you disturbing me?"}]},{"say":"key","reply":"I will give the key to the crypt only to the closest followers of my master. Would you like me to test you?"},{"say":"yes","reply":"Before we start I must ask you for a small donation of 1000 gold coins. Are you willing to pay 1000 gold coins for the test?","alts":[{"other":true,"reply":"You''re not worthy if you cannot make up your mind. Leave!","fx":["ends the conversation"]}]},{"say":"yes","reply":"All right then. Here comes the first question. What was the name of Dago''s favourite pet?","fx":["takes 1000 gp"],"cond":["if you have 1000 gp"],"alts":[{"cond":["if you don''t have 1000 gp"],"reply":"You don''t even have the money to make a donation? Then go!","fx":["ends the conversation"]},{"other":true,"reply":"You''re not worthy if you cannot make up your mind. Leave!","fx":["ends the conversation"]}]},{"say":"redips","reply":"Perhaps you knew him after all. Tell me - how many fingers did he have when he died?","alts":[{"other":true,"reply":"You are wrong. Get lost!","fx":["ends the conversation"]}]},{"say":"7","reply":"Also true. But can you also tell me the colour of the deamons in which master specialized?","alts":[{"other":true,"reply":"You are wrong. Get lost!","fx":["ends the conversation"]}]},{"say":"black","reply":"It seems you are worthy after all. Do you want the key to the crypt?","alts":[{"other":true,"reply":"You are wrong. Get lost!","fx":["ends the conversation"]}]},{"say":"yes","reply":"Here you are.","fx":["you get copper key (number 3142)"],"alts":[{"other":true,"reply":"It is always a wise decision to leave the dead alone."}]}]'::jsonb, false, 'You will need to pay him 1,000 gp and take his quiz. The answers to his questions are "redips", "7", and "black" respectively.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (48, seg, 70, 'key', 'Open the crypt with key 3142.', 32450, 32044, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'After passing the quiz, go through the Level 35 Gate of Expertise and then use Key 3142 to enter the crypt.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (48, seg, 80, 'kill', 'Kill the 4 ghouls.', 32452, 32046, 8, null, 'Ghoul', '[]'::jsonb, null, '[]'::jsonb, false, 'Kill the 4 Ghouls and open the southern chests to get the loot.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (48, seg, 90, 'reward', 'The noble armor is in the southern chests,', 32451, 32048, 8, null, null, '[[3380,1]]'::jsonb, 2472, '[]'::jsonb, false, 'Kill the 4 Ghouls and open the southern chests to get the loot.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (48, seg, 100, 'reward', 'and the crown helmet.', 32455, 32048, 8, null, null, '[[3385,1]]'::jsonb, 2472, '[]'::jsonb, false, 'Kill the 4 Ghouls and open the southern chests to get the loot.');
  update public.map_quest_steps st set segment_id = seg, sort = 100 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 48 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 100) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 48 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Orc Fortress Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 49 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 49 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 49 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (49, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (49, seg, 10, 'go', 'Go to the Orc Fortress and down the hole (orc spearmen, shamans and berserkers).', 32889, 31770, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Head to the Orc Fortress and enter the hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (49, seg, 20, 'go', 'Head east (orc warriors, berserkers, leaders, shamans and a warlord) and go down the stairs.', 32957, 31767, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Head east and be prepared to face all kinds of Orcs.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (49, seg, 30, 'kill', 'Orc leaders, shamans, berserkers and a dragon wait down there. Then head east and north through the level 40 gate into the room with orc leaders, berserkers and slimes. Don''t say hi to The Orc King here: he summons orcs.', 32982, 31735, 9, null, 'Orc Leader', '[]'::jsonb, null, '[]'::jsonb, false, 'Down the stairs you will face several Orc Leaders, Orc Warlords, a Dragon and probably some Orc Shamans. When they are dead, head east and north through the level 40 gate of expertise. In this room you will find several Orc Berserkers, Orc Warlords, Slimes, Orc Leaders and Orc Riders. Do not say ''hi'' to The Orc King.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (49, seg, 40, 'reward', 'The quest chests are at the north end of the room: the knight axe,', 32980, 31727, 9, null, null, '[[3318,1]]'::jsonb, 2472, '[]'::jsonb, false, 'The quest boxes are located in the north end of this room.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (49, seg, 50, 'reward', 'the knight armor,', 32981, 31727, 9, null, null, '[[3370,1]]'::jsonb, 2472, '[]'::jsonb, false, 'The quest boxes are located in the north end of this room.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (49, seg, 60, 'reward', 'and the fire sword.', 32985, 31727, 9, null, null, '[[3280,1]]'::jsonb, 2472, '[]'::jsonb, false, 'The quest boxes are located in the north end of this room.');
  update public.map_quest_steps st set segment_id = seg, sort = 60 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 49 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 60) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 49 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Orc Shaman Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 50 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 50 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 50 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (50, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (50, seg, 10, 'note', 'Bring a rope and a shovel.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Rope, Shovel');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (50, seg, 20, 'go', 'Go east from Venore''s south gate through the swamp to the small cave. Use your shovel to open the hole and go down.', 33055, 32029, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Make your way through the swamp to a small cave (Mapper Coords 129.31, 125.30, 7). You will need to go east from Venore''s south gate. Use your Shovel to open a hole, and go down into it.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (50, seg, 30, 'go', 'Head east and go down (orcs, orc spearmen, snakes).', 33075, 32015, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Once in the cave, head directly east and go down a level.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (50, seg, 40, 'kill', 'Snakes, orcs, orc spearmen and one orc shaman on this level.', 33084, 32026, 9, null, 'Orc Shaman', '[]'::jsonb, null, '[]'::jsonb, false, 'On this level you will find a large number of Snakes, Orcs, Orc Spearmen, and one Orc Shaman.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (50, seg, 50, 'reward', 'The box in the south-east corner of the room: a magic light wand, an axe ring and a blank rune (the box isn''t on the 7.1 map; this is its 7.6 spot).', 33089, 32030, 9, null, null, '[[3046,1],[3092,1],[3147,1]]'::jsonb, 2469, '[]'::jsonb, false, 'The quest box is in the south-east corner of the room.');
  update public.map_quest_steps st set segment_id = seg, sort = 50 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 50 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 50) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 50 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Ornamented Shield Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 51 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 51 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 51 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (51, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (51, seg, 10, 'note', 'Bring a rope, a shovel, a pick and destroy field runes. You need a partner for the chest.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Rope, Shovel, Pick, at least one Destroy Field Rune. You will now need someone to help you, a partner.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (51, seg, 20, 'go', 'In the Plains of Havoc, use your shovel on the hidden hole and go down.', 32775, 32268, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go into the Plains of Havoc and head down a hidden hole (Mapper Coords 128.7, 126.11, 7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (51, seg, 30, 'go', 'Fight the dragon and go down the ramp.', 32771, 32269, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'On the 1st level down, you will fight a single Dragon. Proceed down the ramp.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (51, seg, 40, 'go', 'Two dragons (block one in the narrow passage) and down the ramp again.', 32781, 32268, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'On the 2nd level down, 2 Dragons are present, but it is possible to fight them one at a time if you block one into the narrow passageway. Go down the ramp again.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (51, seg, 50, 'kill', 'Go south through the corridor into the treasure room: dragons and 2 dragon lords. Lure them into the corridor one at a time.', 32777, 32283, 10, null, 'Dragon Lord', '[]'::jsonb, null, '[]'::jsonb, false, 'The 3rd level down has a corridor heading south, followed by an open room with many treasures, as well as 2 Dragon Lords and several Dragons. Kill them with caution, using the corridor to lure them one at a time.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (51, seg, 60, 'note', 'Use your pick on the spot marked X on the wiki map and go down: a fire devil and fire fields. Use a destroy field rune on the fire field with a body under it: Krendorak''s corpse, with a bag holding the ornamented shield, a spike sword, a dragon necklace, a might ring, a crystal key and his journal. The room below isn''t on the 7.1 map. Rope back up to the treasure room.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Use a pick on the X marked on the map. Down the hole there is a Fire Devil and a number of Fire Fields. Pass them and use a Destroy Field Rune on the Fire Field with a body sticking out underneath of it. In the body you will find a Brown Bag containing the Ornamented Shield along with some other items. Rope yourself back up the hole to the main room.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (51, seg, 70, 'go', 'Your partner stands here, south-west of the fire field in the north-west corner: the stalagmites in the south-west corner disappear while they stay.', 32770, 32282, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'To remove these stalagmites, have your partner stand on the spot directly southwest of the fire field in the northwest corner of the room.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (51, seg, 80, 'go', 'Walk past where the stalagmites were.', 32771, 32297, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'You will see Stalagmites in the southwest corner blocking the way to a rope hole. Once the stalagmites have been removed, you can walk behind them.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (51, seg, 90, 'reward', 'The chest behind the stalagmites: a time ring, a lyre, a spellbook, a garlic necklace and 5 platinum coins in a bag (the chest isn''t on the 7.1 map; this is its 7.6 spot).', 32769, 32302, 10, null, null, '[[3053,1],[2949,1],[3059,1],[3083,1],[3035,5]]'::jsonb, 2472, '[]'::jsonb, false, 'Open the Chest (Quest), which contains a Red Bag with a Time Ring and some other items.');
  update public.map_quest_steps st set segment_id = seg, sort = 90 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 51 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 90) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 51 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Panpipe Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 52 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 52 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 52 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (52, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (52, seg, 10, 'note', 'Bring a rope and a shovel.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Rope, Elvenhair Rope or Magic Rope spell; Shovel or Light Shovel');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (52, seg, 20, 'get', 'Use the hollow stone close to the Desert Dungeon entrance: key 4055.', 32652, 32107, 7, null, null, '[[2969,1]]'::jsonb, null, '[]'::jsonb, false, 'To get the key, "use" the hollow stone (Mapper Coords 127.140, 125.108, 7). It''s very close to the entrance to the dungeon.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (52, seg, 30, 'go', 'Go back to the Desert Dungeon entrance, use your shovel and go inside.', 32649, 32093, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go back to the Desert Dungeon entrance, use your shovel, and go inside.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (52, seg, 40, 'go', 'Go down 4 more floors to the bottom (spiders).', 32643, 32093, 11, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Take a Ladder down 5 times, to the bottom, you will face Spiders.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (52, seg, 50, 'go', 'Follow the way west and south and go up the ladder.', 32644, 32121, 12, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow this path around to the west and south, possible meeting one Bonelord, and go up a level.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (52, seg, 60, 'go', 'Go north-west past the Desert Dungeon Library (spiders) and rope up the hole.', 32616, 32095, 11, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Next, follow this path north-west (meeting a few Spiders again) past the Desert Dungeon Library, and rope up the hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (52, seg, 70, 'go', 'Rope up another level.', 32615, 32095, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Rope up another level.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (52, seg, 80, 'go', 'Follow the way south and go up one more level.', 32624, 32112, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'On this level, follow this path south, and go up one more level.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (52, seg, 90, 'key', null, 32643, 32128, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Finally, follow this path to the south-east to the locked door.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (52, seg, 100, 'kill', 'Kill the fire devil.', 32644, 32130, 8, null, 'Fire Devil', '[]'::jsonb, null, '[]'::jsonb, false, 'Follow this path to the south-east to the locked door, one Fire Devil, and the quest box.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (52, seg, 110, 'reward', 'The quest box: a power ring, panpipes and 2 small amethysts in a bag (the box isn''t on the 7.1 map; this is its 7.6 spot).', 32644, 32131, 8, null, null, '[[3050,1],[2953,1],[3033,2]]'::jsonb, 2472, '[]'::jsonb, false, 'The quest box containing a Bag with 1 Power Ring, Panpipes and 2 Small Amethysts.');
  update public.map_quest_steps st set segment_id = seg, sort = 110 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 52 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 110) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 52 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Plate Armor Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 53 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 53 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 53 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (53, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (53, seg, 10, 'note', 'Bring travel money: 60 gold for each try.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Travel money (variable amount)');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (53, seg, 20, 'talk', 'Ask Captain Fearless in Venore for a passage to Darashia. One time in ten the ghostship takes you; otherwise try again.', null, null, null, 'Captain Fearless', null, '[]'::jsonb, null, '[{"say":"hi","reply":"Welcome on board, Sir <your name>.","cond":["male characters only"],"alts":[{"cond":["female characters only"],"reply":"Welcome on board, Madam <your name>."},{"other":true,"cond":["only right after a question"],"reply":"We would like to serve you some time."}]},{"say":"darashia","reply":"Do you seek a passage to Darashia for 60 gold?","alts":[{"other":true,"cond":["only right after a question"],"reply":"We would like to serve you some time."}]},{"say":"yes","reply":"I warn you! This route is haunted by a ghostship. Do you really want to go there?","cond":["if you have 60 gp"]},{"say":"yes","reply":"Set the sails!","fx":["takes 60 gp","ends the conversation","teleports you to 33318, 32171, 6"],"cond":["if you have 60 gp","1 in 10 chance"],"alts":[{"cond":["if you have 60 gp"],"reply":"Set the sails!","fx":["takes 60 gp","ends the conversation","teleports you to 33292, 32481, 7"]}]}]'::jsonb, false, 'Go to Venore boat, and travel Venore→Darashia until you are hijacked by the Ghostship.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (53, seg, 30, 'go', 'Go down and fight your way across the gangplank to the southern boat (ghosts).', 33317, 32171, 6, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go down and fight your way across the gangplank to the southern boat.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (53, seg, 40, 'go', 'Go down the western ladder: you land on a fire field.', 33319, 32181, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go down to 2 vampires, 1 demon skeleton and a ghost. Warning: when you go down you will land on a fire field.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (53, seg, 50, 'kill', 'Kill the ghoul and the ghost.', 33322, 32181, 8, null, 'Ghoul', '[]'::jsonb, null, '[]'::jsonb, false, 'Go down to 2 vampires, 1 demon skeleton and a ghost. Kill them.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (53, seg, 60, 'reward', 'Use the coffin on the east: a plate armor.', 33327, 32180, 8, null, null, '[[3357,1]]'::jsonb, 2474, '[]'::jsonb, false, 'Kill them and use the coffin on the east to receive your reward.');
  update public.map_quest_steps st set segment_id = seg, sort = 60 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 53 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 60) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 53 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Poison Daggers Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 54 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 54 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 54 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (54, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (54, seg, 10, 'note', 'Bring a rope and a shovel.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Shovel, Rope');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (54, seg, 20, 'go', 'Go down the ramp into the cellar south-west of Edron castle.', 33173, 31900, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go down into the Edron Orc Cave. The entrance is southwest of the castle (Mapper Coords 129.149, 124.156, 7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (54, seg, 30, 'go', 'Pull the lever if the stones block the way into the orc cave.', 33172, 31896, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'You can access this area via a drain in the basement of the Edron Flats. (On the 7.1 map the cellar has a lever and stones that close the way.)');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (54, seg, 40, 'go', 'Follow the cave west and south and go down (orcs, orc spearmen, orc warriors, poison spiders).', 33164, 31932, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Once in the hole, you will meet only Orcs, Poison Spiders, Orc Spearmen and Orc Warriors. Follow the cave to the west and then south. There are a couple of side rooms, but basically there is only one way to go.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (54, seg, 50, 'go', 'Go west, take the passage north and drop down the hole in the first room on the east.', 33172, 31919, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'On the next level, go west and take the passage north. Go into the first room on the east. Drop down the hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (54, seg, 60, 'go', 'Orc shamans right at the bottom (energy doesn''t hurt them). Go north over the tiled floor (orc shamans, an orc berserker) and drop down the hole at its northern end.', 33171, 31884, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'As soon as you go down this hole, you will be surrounded by Orc Shamans. On this level, go north, meeting more shamans and one or two Orc Berserkers. You will walk over a tile-floor area. At the northern end of the floor, drop down another hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (54, seg, 70, 'reward', 'Go west to the box (orc shamans, orc leaders, poison spiders): 2 poison daggers and 30 poison arrows in a backpack (the box isn''t on the 7.1 map; this is its 7.6 spot).', 33155, 31880, 11, null, null, '[[3299,2],[3448,30]]'::jsonb, 2473, '[]'::jsonb, false, 'On this floor you will meet Orc Shamans, Orc Berserkers, Orc Leaders and a lot of Poison Spiders, in the chest you can find a backpack with 2 Poison Daggers and 30 Poison Arrows.');
  update public.map_quest_steps st set segment_id = seg, sort = 70 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 54 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 70) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 54 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Power Bolts Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 55 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 55 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 55 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (55, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (55, seg, 10, 'note', 'Bring a shovel and a rope.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Shovel, Rope');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (55, seg, 20, 'go', 'Just south of the Plains of Havoc temple, dig the hole open with your shovel and go down.', 32815, 32280, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go into the hole just south of the Plains of Havoc Temple (Mapper Coords 128.47, 126.24, 7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (55, seg, 30, 'kill', 'Kill the giant spider.', 32817, 32283, 8, null, 'Giant Spider', '[]'::jsonb, null, '[]'::jsonb, false, 'Kill the Giant Spider and look around.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (55, seg, 40, 'reward', 'The northern body: a bag with 5 power bolts and 12 burst arrows.', 32816, 32279, 8, null, null, '[[3450,5],[3449,12]]'::jsonb, 4240, '[]'::jsonb, false, 'The northern body contains a Brown Bag with in it 5 Power Bolts and 12 Burst Arrows.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (55, seg, 50, 'reward', 'The pile of bones: a two handed sword.', 32817, 32283, 8, null, null, '[[3265,1]]'::jsonb, 4285, '[]'::jsonb, false, 'The pile of bones contains the Two Handed Sword.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (55, seg, 60, 'reward', 'The body below the teleporter: The Dreammaster book.', 32814, 32281, 8, null, null, '[[2821,1]]'::jsonb, 4240, '[]'::jsonb, false, 'The body directly below the teleporter contains the The Dreammaster Book.');
  update public.map_quest_steps st set segment_id = seg, sort = 60 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 55 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 60) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 55 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Power Ring Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 56 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 56 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 56 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (56, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (56, seg, 10, 'note', 'Bring a rope.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Rope');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (56, seg, 20, 'go', 'On Femor Hills, follow the south side of the river into the mountain (north of the magic carpet) and rope up.', 32576, 31797, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'On Femor Hills, follow along the South side of the river that flows into the mountain (just north of the Magic Carpet), and rope up one level.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (56, seg, 30, 'go', 'Head east into the mountain (goblins) and go down to the north.', 32593, 31782, 6, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Head East into the mountain, and go down the ladder to the north.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (56, seg, 40, 'go', 'Follow the path north-east and go down the hole (a rotworm, goblins).', 32608, 31778, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the path to the north-east, and go down the hole. There may be a rotworm here, so be prepared.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (56, seg, 50, 'go', 'Goblins and four wolves attack at once, fire fields all over: go south-west and drop down one more level.', 32602, 31782, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Here you will find up to 11 Goblins and four Wolves (which will attack you the moment you enter the room), and there will be Fire Fields scattered throughout the room. Go to the south-west and drop down one more level.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (56, seg, 60, 'reward', 'Up to 11 goblins attack. At the north end next to the beer casks, the left box: the power ring.', 32599, 31776, 9, null, null, '[[3050,1]]'::jsonb, 2472, '[]'::jsonb, false, 'Here will be up to 11 Goblins (again, they will all attack you the moment you enter the room). The Quest boxes are on the north end of this room, next to the Beer Casks.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (56, seg, 70, 'reward', 'The right box: a bronze amulet.', 32601, 31776, 9, null, null, '[[3056,1]]'::jsonb, 2472, '[]'::jsonb, false, 'The Quest boxes are on the north end of this room, next to the Beer Casks.');
  update public.map_quest_steps st set segment_id = seg, sort = 70 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 56 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 70) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 56 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Present Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 84 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 84 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 84 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (84, 10, 'The present') returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (84, seg, 10, 'go', 'Go down the stairs in the abandoned building north of Rookgaard.', 32094, 32137, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Near Bear Room Quest room you can see a chest (near a switch)');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (84, seg, 20, 'go', 'Go east and down (trolls), down again (an orc), and down again (orcs).', 32126, 32118, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Near Bear Room Quest room you can see a chest (near a switch)');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (84, seg, 30, 'get', 'Next to the switch south of the bear room (orcs and a minotaur around): the chest has a backpack with the present. Keep the present.', 32149, 32105, 11, null, null, '[[2854,1],[2856,1]]'::jsonb, null, '[]'::jsonb, false, 'Near Bear Room Quest room you can see a chest (near a switch) that contains a backpack with a Present and some other stuff. Take it. You can keep the backpack and you need to keep the Present for later.');
  insert into public.map_quest_segments (quest_id, sort, name) values (84, 20, 'Seymour') returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (84, seg, 10, 'talk', 'Give the present to Seymour in the Academy.', null, null, null, 'Seymour', null, '[]'::jsonb, null, '[{"say":"hi","reply":"Hello, <your name>. What do you need?"},{"say":"box","reply":"Do you have a suitable present box for me?"},{"say":"yes","reply":"THANK YOU! Here is a helmet that will serve you well.","fx":["takes present","you get legion helmet"],"cond":["if you have present"],"alts":[{"reply":"HEY! You don''t have one! Stop playing tricks on me or I will give some extra work!"},{"other":true,"reply":"HEY! You don''t have one! Stop playing tricks on me or I will give some extra work!"}]}]'::jsonb, false, 'Now go to Seymour (Mapper Coords 125.102, 125.196, 7) and say box.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (84, seg, 20, 'reward', 'Seymour gives you a legion helmet.', 32103, 32195, 7, null, null, '[[3374,1]]'::jsonb, 3374, '[]'::jsonb, false, 'He will trade the Present for a Legion Helmet.');
  update public.map_quest_steps st set segment_id = seg, sort = 20 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 84 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 20) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 84 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Purple Tome Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 57 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 57 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 57 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (57, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (57, seg, 10, 'note', 'Bring a shovel and a rope.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Items: Shovel, Rope');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (57, seg, 20, 'go', 'South of Northport, dig open the hole with your shovel and go down: the start of the route to Demona.', 32512, 31622, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the directions to go to Demona using the stardard route.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (57, seg, 30, 'go', 'Follow the route to Demona through the Maze of Lost Souls and go up the stairs into Demona.', 32500, 31677, 15, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the directions to go to Demona using the stardard route.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (57, seg, 40, 'go', 'Past the warlocks and elf arcanists, take the north-west stairs of the star room (the way to the exit teleport).', 32451, 31654, 14, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'When you are in Demona you will find several Warlocks and Elf Arcanists, take the North-West Ladder of the Star Room, the one that is leading to the exit Teleport.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (57, seg, 50, 'reward', 'Follow the path and take the first way north to the room full of bookcases: the purple tome is in the bookcase on the west wall.', 32421, 31594, 15, null, null, '[[2848,1]]'::jsonb, 2438, '[]'::jsonb, false, 'Now Continue along the path and take the first way north until you reach this point. In this room, there are a lot of bookcases. In those bookcases you will find the Maps and the tome.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (57, seg, 60, 'reward', 'A map in a bookcase on the north wall.', 32423, 31591, 15, null, null, '[[2822,1]]'::jsonb, 2435, '[]'::jsonb, false, 'In those bookcases you will find the Maps and the tome.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (57, seg, 70, 'reward', 'Another map further east on the north wall.', 32428, 31591, 15, null, null, '[[2823,1]]'::jsonb, 2435, '[]'::jsonb, false, 'In those bookcases you will find the Maps and the tome.');
  update public.map_quest_steps st set segment_id = seg, sort = 70 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 57 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 70) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 57 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Rapier Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 58 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 58 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 58 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (58, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (58, seg, 10, 'go', 'Go down the sewer grate north of the Rookgaard temple.', 32097, 32205, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go into the Rookgaard sewer (Mapper Coords 125.94, 125.204, 7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (58, seg, 20, 'go', 'Make your way west past the rats and go down the ladder.', 32086, 32197, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'After entering, make your way west, and go down a Ladder, you will encounter a few rats on your way');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (58, seg, 30, 'reward', 'Run past the rats to the box in the north-east of the room: the rapier.', 32099, 32198, 9, null, null, '[[3272,1]]'::jsonb, 2473, '[]'::jsonb, false, 'Once you go down, you will encounter 3-7 rats, which you can kill or simply run past through. The quest-box is in the north-east part of the room, use it to obtain a Rapier.');
  update public.map_quest_steps st set segment_id = seg, sort = 30 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 58 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 30) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 58 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Ring Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 59 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 59 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 59 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (59, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (59, seg, 10, 'note', 'Bring a rope, and great fireball or thunderstorm runes for the crowded floor.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Rope, Stuff to kill Heroes and minor creatures, recommended GFBs or Thunderstorms');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (59, seg, 20, 'go', 'Go down into the Edron Hero Cave.', 33164, 31636, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go into the Edron Hero Cave, here (Mapper Coords 129.140, 123.150, 7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (59, seg, 30, 'go', 'Follow the cave down five floors: wild warriors, demon skeletons, a beholder, monks, then dragons and a hero.', 33144, 31589, 12, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the route bellow.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (59, seg, 40, 'go', 'This floor is crowded (wild warriors, stalkers, hunters, priestesses, demon skeletons): clear it with great fireballs or thunderstorms, then go down in the south.', 33131, 31626, 13, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Note: You probably need to use Great Fireballs or Thunderstorms in image #6.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (59, seg, 50, 'go', 'Past the monks and down to the bedroom (priestesses and a hero).', 33135, 31628, 14, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the route bellow.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (59, seg, 60, 'reward', 'The time ring is in the drawers on the west.', 33130, 31624, 15, null, null, '[[3053,1]]'::jsonb, 2433, '[]'::jsonb, false, 'Use the chests to get your reward.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (59, seg, 70, 'reward', 'The sword ring is in the drawers on the east.', 33135, 31624, 15, null, null, '[[3091,1]]'::jsonb, 2433, '[]'::jsonb, false, 'Use the chests to get your reward.');
  update public.map_quest_steps st set segment_id = seg, sort = 70 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 59 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 70) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 59 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Scale Armor Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 60 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 60 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 60 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (60, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (60, seg, 10, 'note', 'Bring a shovel and a rope; an antidote helps against the scorpion.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Shovel, Rope, Recommended Antidote, Antidote Rune or Silver Amulet for facing Scorpion');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (60, seg, 20, 'go', 'Dig open the hole west of the Ancient Temple entrance with your shovel and go down.', 32335, 32174, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Enter the cave that is directly west of the Ancient Temple entrance (Mapper Coords 126.81, 125.172, 7). You will need to use a Shovel to open the hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (60, seg, 30, 'go', 'Go north and east (trolls, rats) to the room with the well and use its lower-right corner to go down: a scorpion below.', 32354, 32131, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow this path to the north and east until you find the room with a well in it. "Use" the lower-right corner of the well to go down into it. Be prepared to face one or more Scorpions.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (60, seg, 40, 'reward', 'The scale armor is in the chest.', 32357, 32130, 9, null, null, '[[3377,1]]'::jsonb, 2472, '[]'::jsonb, false, 'Open the chests to receive the Scale Armor');
  update public.map_quest_steps st set segment_id = seg, sort = 40 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 60 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 40) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 60 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Shaman Treasure Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 61 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 61 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 61 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (61, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (61, seg, 10, 'note', 'Bring a rope.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Shovel, Rope');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (61, seg, 20, 'go', 'Go down the ramp into the cellar south-west of Edron castle.', 33173, 31900, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go down into the Edron Orc Cave. The entrance is southwest of the castle (Mapper Coords 129.149, 124.156, 7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (61, seg, 30, 'go', 'Pull the lever if the stones block the way into the orc cave.', 33172, 31896, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'You can access this area via a drain in the basement of the Edron Flats. (On the 7.1 map the cellar has a lever and stones that close the way.)');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (61, seg, 40, 'go', 'Follow the cave west and south and drop down (orcs, orc spearmen, orc warriors, poison spiders).', 33164, 31932, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Once in the hole, you will meet only Orcs, Poison Spiders, Orc Spearmen and Orc Warriors. Follow the cave to the west and then south.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (61, seg, 50, 'kill', 'Walk west to the three-way crossing, then all the way north and west to the room with the sacrificial stone at the far north-west end. Kill the orc shamans guarding it.', 33125, 31887, 9, null, 'Orc Shaman', '[]'::jsonb, null, '[]'::jsonb, false, 'After you drop down, follow the map below, by walking west to a three-way crossing. There, continue walking all the way north and then west. The reward is in a skeleton body in a room at the far north-western end of the floor, guarded by 2-3 Orc Shamans.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (61, seg, 60, 'reward', 'The 3 blank runes are in the skeleton by the sacrificial stone (the skeleton isn''t on the 7.1 map; this is its 7.6 spot).', 33127, 31885, 9, null, null, '[[3147,3]]'::jsonb, 4285, '[]'::jsonb, false, 'The reward is in a skeleton body in a room at the far north-western end of the floor. You can easily tell the right room, as it has a Sacrificial Stone in its center.');
  update public.map_quest_steps st set segment_id = seg, sort = 60 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 61 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 60) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 61 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Silver Amulet Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 62 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 62 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 62 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (62, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (62, seg, 10, 'note', 'Bring a shovel.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Shovel');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (62, seg, 20, 'go', 'Dig open the hole with your shovel and go down.', 32503, 32266, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'The entrance is here (Mapper Coords 126.247, 126.11, 7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (62, seg, 30, 'go', 'Go south-east and down to the cellar (trolls on the way).', 32508, 32273, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'The amulet is hidden in a box in the southeast cellar.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (62, seg, 40, 'reward', 'The silver amulet is in the box among the crates (the box isn''t on the 7.1 map; this is the wiki''s spot).', 32507, 32270, 9, null, null, '[[3054,1]]'::jsonb, 2469, '[]'::jsonb, false, 'The amulet is hidden in a box in the southeast cellar (Mapper Coords 126.251, 126.14, 9).');
  update public.map_quest_steps st set segment_id = seg, sort = 40 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 62 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 40) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 62 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Silver Brooch Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 63 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 63 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 63 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (63, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (63, seg, 10, 'note', 'Bring a pick and a rope; an antidote helps against the poison spiders.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Shovel, Rope, Machete (depending upon route), Pick, Recommended Antidote or Antidote Rune for fighting poisonous creatures');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (63, seg, 20, 'go', 'Come from the west (Dwarf Bridge) to the cave entrance in the Green Claw Swamp and fall down the partially hidden pitfall (not on the 7.1 map).', 32700, 31992, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Make your way to the cave entrance in Green Claw Swamp (Mapper Coords 127.188, 124.248, 7). The quickest way is to come from the west (by the Dwarf Bridge). You''ll need to fall down a partially hidden pitfall.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (63, seg, 30, 'go', 'Follow the cave east (rotworms, a beholder) and go down the hole.', 32734, 31982, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Once in the cave, follow this route to the east. You will face Poison Spiders, Rotworms and sometimes lured Bonelord. Go down the hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (63, seg, 40, 'go', 'Take the short passage south and go down the hole.', 32736, 31993, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Take this short passage to the south (there are no monsters here), and go down the hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (63, seg, 50, 'go', 'Follow the path east and south, kill the 3 beholders in the larger room, then use your pick here and go down: up to 5 mummies in the small room below.', 32775, 32010, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow this path to the east and south. There will be 3 Bonelords in the larger room. Once you have killed the Bonelords, use your pick in the circled area on the map. When you go down into the pick hole, you will be faced with up to 5 Mummies in a very small room.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (63, seg, 60, 'reward', 'Use the coffin on the north end: the silver brooch, 3 small diamonds and 2 small rubies.', 32777, 32008, 11, null, null, '[[3017,1],[3028,3],[3030,2]]'::jsonb, 2476, '[]'::jsonb, false, 'Kill the mummies and "Use" a coffin on the north end of this room to get your reward.');
  update public.map_quest_steps st set segment_id = seg, sort = 60 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 63 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 60) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 63 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;
