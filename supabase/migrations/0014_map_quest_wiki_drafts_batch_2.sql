-- =====================================================================================
-- Tibia Map - database step 14: AI drafts of quest guides from the TibiaWiki walkthroughs (slice 13j)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- Needs steps 3, 6, 7 and 9. Written by tools/drafts-to-sql.js from tools/data/quest-drafts. Every step is a draft
-- (not checked) with its wiki sentence as its source; what the checker couldn't tie to a real NPC, word, monster,
-- item or spot is a Note "Needs placing: ...". The quest's Reward steps from the old spots are moved into the draft.
-- Earlier drafts of these quests are replaced; a quest with anything made, changed or ticked in the app is skipped.
--
-- 125 steps for 19 quests (0 need placing):
--   Draconia Quest: 1 part, 13 steps + 0 Reward steps
--   Dragon Corpse Quest: 1 part, 5 steps + 0 Reward steps
--       can't walk 32170,32214,9 -> 32178,32223,9 (In the dead dragon: a bag with a copper shield and a legion helmet. Run back over the fire straight away.): No route found: these two places are not connected.
--   Dragon Tower Quest: 1 part, 8 steps + 0 Reward steps
--   Heaven Blossom Quest: 1 part, 3 steps + 0 Reward steps
--   Edron Goblin Quest: 1 part, 8 steps + 0 Reward steps
--   Elvenbane Quest: 1 part, 10 steps + 0 Reward steps
--   Emperor's Cookies Quest: 1 part, 4 steps + 0 Reward steps
--   Explorer Brooch Quest: 1 part, 4 steps + 0 Reward steps
--   Fanfare Quest: 1 part, 5 steps + 0 Reward steps
--   Geomancer Quest: 1 part, 6 steps + 0 Reward steps
--   Ghoul Room Quest: 1 part, 10 steps + 0 Reward steps
--   Giant Smithhammer Quest: 1 part, 3 steps + 0 Reward steps
--   Griffin Shield Quest: 1 part, 12 steps + 0 Reward steps
--   Iron Hammer Quest: 1 part, 5 steps + 0 Reward steps
--   Iron Helmet Quest: 1 part, 1 steps + 0 Reward steps
--   Katana Quest: 1 part, 8 steps + 0 Reward steps
--   Kingdom of Kormarak Quest: 1 part, 9 steps + 0 Reward steps
--   Life Ring Quest: 1 part, 5 steps + 0 Reward steps
--   Longsword Quest: 1 part, 6 steps + 0 Reward steps
-- =====================================================================================

-- Draconia Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 23 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 23 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (23, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (23, seg, 10, 'note', 'Bring key 3012 (Elathriel, the prison guard nearby, sells it for 5000 gold), a rope and destroy field runes. You need a second player for the floor switches. The pyramid''s keys (3001 to 3007) are daily: if someone took them, you need them from someone else.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Useful Items: Key 3012, Rope, Destroy Field runes. You cannot finish this quest alone. Most of the keys found in this quest are daily respawns.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (23, seg, 20, 'go', 'Go down into the Shadow Caves north-west of the Ab''Dendriel depot.', 32687, 31650, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Find the Shadow Caves (north-west the depot underground, Mapper Coords 127.143, 123.182, 8).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (23, seg, 30, 'go', 'Go down 2 more floors.', 32654, 31674, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go down 2 more floors and follow the cave south and then east.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (23, seg, 40, 'go', 'Go south and east to the Hellgate door, open it with key 3012 and enter the northern teleporter.', 32675, 31646, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'You should find a (normally locked) door, the Hellgate entrance. Open the door with Key 3012 and go in. Enter the northern teleport to enter Hellgate.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (23, seg, 50, 'go', 'Follow Hellgate a long way, many floors up and down (rotworms, ghouls, skeletons, slimes), until you climb up into the pyramid.', 32817, 31573, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the images below to reach Draconia. You may encounter Skeletons, Spiders, Poison Spiders, Ghouls, Rotworms, Carrion Worms, Slimes, Bonelords, and Demon Skeletons.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (23, seg, 60, 'go', 'Ground floor (skeletons, scorpions): key 3001 is in the skeleton corpses on the north-west side; key 3002 in the second coffin north of the red carpet behind the east door (walk the south row: two hidden holes); key 3003 behind the south-west door: pull the lever, then the lever behind the wall, and take the key where the rock was. Open the west door in the south-east corner with key 3003 and go up the stairs.', 32799, 31583, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Key 3001: north-west side, skeleton corpses. Key 3002: open the eastern door with key 3001, walk along the south row of the carpet, open the second coffin on the north side. Key 3003: open the door with key 3002 and pull the lever, pull another lever, pick up Key 3003. Use key 3003 on the western door in the south-east corner of the pyramid.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (23, seg, 70, 'go', 'Second floor (skeletons, ghouls): key 3004 is under the energy field in the first row, third column (destroy field); open the south door with it, key 3005 lies by the statues; open the west door with key 3005, key 3006 is under the south-easternmost fire field. Open the last door with key 3006 and go up the ladder.', 32812, 31589, 6, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Key 3004: energy fields, first row, third column. Key 3005: open the door south with key 3004, on the ground next to the statues. Key 3006: open the door with key 3005, south-easternmost tile. Enter the final locked door using key 3006. Go up the ladder.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (23, seg, 80, 'go', 'Third floor (ghouls, demon skeletons): player 1 stands on the southern floor switch, player 2 on the switch in the south-west room; player 1 then goes west and north through the teleporter for key 3007 and back to the switch. Go up the stairs.', 32797, 31583, 5, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Leave player 1 on the southern switch. Player 2 must now go west, enter the south-western room and step on the floor switch. Player 1 goes west and then north to enter the portal and take Key 3007.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (23, seg, 90, 'go', 'Fourth floor (mummies, demon skeletons): open the door with key 3007 and go up the stairs.', 32802, 31581, 4, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the path to the locked door. Open the door with Key 3007. Continue through the door and go upstairs.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (23, seg, 100, 'go', 'Fifth floor (mummies, slimes): straight through and up the stairs.', 32807, 31584, 3, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Fifth floor has 8 mummies and 2 slimes. There are no puzzles here, simply go through to the next floor.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (23, seg, 110, 'reward', 'Sixth floor (demon skeletons, mummies), behind the level 25 gate: the chest with a serpent sword and an ice rapier.', 32803, 31582, 2, null, null, '[[3297,1],[3284,1]]'::jsonb, 2472, '[]'::jsonb, false, 'Open the chests behind the level 25 Gate of Expertise for your reward.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (23, seg, 120, 'reward', 'And the chest with a stone skin amulet and an energy ring.', 32804, 31582, 2, null, null, '[[3081,1],[3051,1]]'::jsonb, 2472, '[]'::jsonb, false, 'Open the chests behind the level 25 Gate of Expertise for your reward.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (23, seg, 130, 'get', 'Key 3008 is in the western bookcase: with it, open the door upstairs, set the levers left-right-left-right and the teleporter takes you to Ab''Dendriel.', 32800, 31582, 2, null, null, '[[2969,1]]'::jsonb, null, '[]'::jsonb, false, 'Open the western bookcase to get Key 3008. Open the door with Key 3008. Arrange the levers: left-right-left-right. Enter the portal to arrive at Ab''Dendriel.');
  update public.map_quest_steps st set segment_id = seg, sort = 130 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 23 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 130) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 23 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Dragon Corpse Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 24 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 24 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 24 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (24, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (24, seg, 10, 'note', 'Bring a shovel, a scythe, food and some health potions or fluids.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Shovel, Scythe, 2-4 Small Health Potions, Food. You need 102 oz.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (24, seg, 20, 'go', 'Go down into the bear cave east of Rookgaard.', 32146, 32207, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go to the Bear Cave located east of Rookgaard (Mapper Coords 125.146, 125.208, 7). Now go down the hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (24, seg, 30, 'go', 'Take the southern way past the bears to the pool and dig the hole with your shovel.', 32166, 32216, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'The cave splits in two ways: Choose the southern path. At the end, there''s a pool of water and a hole, open it with your Shovel and go down.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (24, seg, 40, 'go', 'Cut the wheat with your scythe and run over the fire fields to the dead dragon.', 32170, 32214, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Now use your Scythe to cut the Wheat. Now you have to walk over 4 Large Fire Fields and 1 Medium Fire Field.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (24, seg, 50, 'reward', 'In the dead dragon: a bag with a copper shield and a legion helmet. Run back over the fire straight away.', 32178, 32223, 9, null, null, '[[3430,1],[3374,1]]'::jsonb, 4025, '[]'::jsonb, false, 'Inside the dead dragon you will find a bag containing a Copper Shield and a Legion Helmet. Return quickly to the entrance.');
  update public.map_quest_steps st set segment_id = seg, sort = 50 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 24 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 50) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 24 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Dragon Tower Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 25 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 25 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 25 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (25, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (25, seg, 10, 'note', 'Go to Shadowthorn, the elf town in the swamp south-east of Venore.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'First, you need to make your way to Shadowthorn in the swamps south-east of Venore.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (25, seg, 20, 'go', 'Go east to the big tower and climb it (first floor: elf scouts and an elf).', 33074, 32167, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Head east to the large tower and start going up. First floor: 3 Elf Scouts and 1 Elf.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (25, seg, 30, 'go', 'Up again (elf scouts, an elf arcanist).', 33075, 32166, 6, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Second floor: 4 Elf Scouts and 2 Elf Arcanists.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (25, seg, 40, 'go', 'Up again: the 2 dragons here can''t reach you.', 33076, 32166, 5, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Third floor: 2 Dragons (only accessible from above, they cannot reach you).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (25, seg, 50, 'go', 'Up again (elf scouts, elf arcanists).', 33075, 32166, 4, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Fourth floor: 6 Elf Scouts and 3 Elf Arcanists.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (25, seg, 60, 'go', 'Up to the top (elf scouts, elf arcanists).', 33074, 32167, 3, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Fifth floor: 3 Elf Scouts and 2 Elf Arcanists.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (25, seg, 70, 'reward', 'In the box: 30 burst arrows and 60 poison arrows.', 33072, 32169, 2, null, null, '[[3449,30],[3448,60]]'::jsonb, 2469, '[]'::jsonb, false, 'The rewards will be in two boxes in the last floor.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (25, seg, 80, 'reward', 'In the other box: a bow and 2 small sapphires.', 33079, 32169, 2, null, null, '[[3350,1],[3029,2]]'::jsonb, 2469, '[]'::jsonb, false, 'The rewards will be in two boxes in the last floor.');
  update public.map_quest_steps st set segment_id = seg, sort = 80 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 25 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 80) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 25 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Heaven Blossom Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 37 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 37 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (37, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (37, seg, 10, 'note', 'Go to Shadowthorn, the elf town in the swamp south-east of Venore.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'First, you need to make your way to Shadowthorn in the swamps south-east of Venore.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (37, seg, 20, 'go', 'Go down the ladder closest to you (elves).', 33075, 32166, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'You will encounter some Elves. Go down the ladder closest to you.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (37, seg, 30, 'reward', 'In the barrel: a heaven blossom (elves here, maybe a lured elf overseer).', 33067, 32181, 8, null, null, '[[3657,1]]'::jsonb, 2523, '[]'::jsonb, false, 'Make your way towards the star on the map. You will only encounter some Elves here. Open the Barrel to receive your reward, a Heaven Blossom.');
  update public.map_quest_steps st set segment_id = seg, sort = 30 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 37 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 30) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 37 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Edron Goblin Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 28 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 28 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (28, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (28, seg, 10, 'note', 'Bring a rope.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Rope');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (28, seg, 20, 'go', 'Go down the drain in the south-west corner of Edron castle.', 33165, 31827, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'From the Edron depot, go down the drain in the south-west corner of the castle (Mapper Coords 129.141, 124.84, 7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (28, seg, 30, 'go', 'There is only one way: follow the cave (rats) down and up with your rope until you come out in a grassy area.', 33128, 31810, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'There is only one way to go, so follow the cave until you emerge in a grassy area (Mapper Coords 129.105, 124.67, 7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (28, seg, 40, 'go', 'Go south-west over the goblin hill and down the hole (up to 10 goblins).', 33107, 31847, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go south-west until you find the goblin hill (Mapper Coords 129.83, 124.104, 7). Go down the hole, and be prepared to face up to 10 Goblins at once.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (28, seg, 50, 'go', 'Go north-west and down the next hole (goblins).', 33092, 31837, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow this path to the north-west and go down the hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (28, seg, 60, 'go', 'Go to the hole in the far north-east corner and down (goblins).', 33102, 31822, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow this path to the hole in the far north-east corner. Go down this hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (28, seg, 70, 'reward', 'In the throne room to the north (goblins, 2 wasps): the box with a silver amulet.', 33095, 31800, 10, null, null, '[[3054,1]]'::jsonb, 2469, '[]'::jsonb, false, 'The reward is in two chests in the throne room to the north. Watch out for more goblins and 2 wasps.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (28, seg, 80, 'reward', 'And the box with a steel shield.', 33095, 31801, 10, null, null, '[[3409,1]]'::jsonb, 2469, '[]'::jsonb, false, 'The reward is in two chests in the throne room to the north.');
  update public.map_quest_steps st set segment_id = seg, sort = 80 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 28 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 80) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 28 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Elvenbane Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 29 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 29 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (29, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (29, seg, 10, 'note', 'Bring a shovel, and destroy field runes or an antidote for the poison fields.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Useful Items: Destroy Field Runes, Antidote Runes or Antidote Spell. (On the 7.1 map the hole needs a shovel.)');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (29, seg, 20, 'go', 'From Ab''Dendriel''s gate go south, west and north to Elvenbane castle and open the hole between the four stones with your shovel.', 32579, 31679, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Start off at the gate of Ab''Dendriel. Go south, west and north to Elvenbane Castle. Drop down the hole surrounded by four stones.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (29, seg, 30, 'go', 'Run north and west through the basement (orc warriors and spearmen, minotaurs) and up into the castle.', 32598, 31652, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Run north and west to the opening. Here you may meet an Orc Berserker and a Minotaur Guard. Also a few Minotaurs and an Orc Spearman.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (29, seg, 40, 'go', 'Run around (orcs, minotaurs, an orc berserker) and up into the middle tower.', 32593, 31643, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Run around and enter the middle tower.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (29, seg, 50, 'go', 'Cross the poison fields (destroy field) and go up: a dragon is waiting.', 32588, 31643, 6, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'The first floor of the tower is entirely covered by poison fields. Prepare for the dragon upstairs.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (29, seg, 60, 'go', 'Kill the dragon or run past it to the ladder.', 32593, 31643, 5, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'On this floor you will face a Dragon. Kill the dragon or run past it to the ladder.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (29, seg, 70, 'go', 'Kill the orc shaman and the minotaur mage and go up again.', 32588, 31643, 4, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'On this floor there is an Orc Shaman and a Minotaur Mage. Kill them and continue climb the stairs.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (29, seg, 80, 'kill', 'Kill the 2 demon skeletons and the elf arcanist.', 32590, 31645, 3, null, 'Demon Skeleton', '[]'::jsonb, null, '[]'::jsonb, false, 'There are also 2 Demon Skeletons and an Elf Arcanist. Kill them and open the quest chests/drawers.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (29, seg, 90, 'reward', 'Open the chest: a morning star.', 32590, 31647, 3, null, null, '[[3282,1]]'::jsonb, 2472, '[]'::jsonb, false, 'The final floor contains 2 quest chests and 2 quest drawers.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (29, seg, 100, 'reward', 'And the other chest: a dwarven shield.', 32591, 31647, 3, null, null, '[[3425,1]]'::jsonb, 2472, '[]'::jsonb, false, 'The final floor contains 2 quest chests and 2 quest drawers.');
  update public.map_quest_steps st set segment_id = seg, sort = 100 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 29 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 100) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 29 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Emperor's Cookies Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 30 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 30 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 30 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (30, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (30, seg, 10, 'go', 'Go up through Kazordoon to Emperor Kruzak''s chambers.', 32589, 31950, 4, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'First you need to go to Emperor Kruzak''s chambers in his private room, to the north.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (30, seg, 20, 'get', 'At the end of the west secret passage: key 3800 in the chest. Don''t take the hole down, go back to the emperor''s room.', 32605, 31908, 3, null, null, '[[2970,1]]'::jsonb, null, '[]'::jsonb, false, 'Get Key 3800 which can be found at the end of the west "secret passage" exit, in a Chest. Do not take the exit route down the hole, but go back to the king''s room.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (30, seg, 30, 'reward', 'Open the small room in the emperor''s chamber with key 3800: 27 cookies and key 3801 in the chest.', 32648, 31905, 3, null, null, '[[3598,27],[2970,1]]'::jsonb, 2472, '[]'::jsonb, false, 'Open the door of the small room in the emperor''s chamber with the key. In the chest in the room you opened will be 7 and 20 Cookies and Key 3801.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (30, seg, 40, 'get', 'Go back down to the barracks and open the door with key 3801: key 3802 is in the chest (it opens Dwacatra prison and the Mine Hub).', 32599, 31923, 6, null, null, '[[2970,1]]'::jsonb, null, '[]'::jsonb, false, 'When at the barracks you can open the door with Key 3801, in the Chest will be the key, Key 3802, this key is needed to open Dwacatra Prison and a specific room in the Dwarf Mines.');
  update public.map_quest_steps st set segment_id = seg, sort = 40 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 30 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 40) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 30 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Explorer Brooch Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 31 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 31 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (31, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (31, seg, 10, 'note', 'Bring a rope.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required equipment: Rope');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (31, seg, 20, 'go', 'Go to the Jolly Axeman tavern in Kazordoon and down one of the sewer grates in the north of the room.', 32639, 31873, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go to The Jolly Axeman Tavern in Kazordoon. In upper side of room you will see 4 sewer gates. Go down.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (31, seg, 30, 'kill', 'Kill the rat.', 32636, 31874, 10, null, 'Rat', '[]'::jsonb, null, '[]'::jsonb, false, 'Go down, kill rat and take Explorer Brooch from body.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (31, seg, 40, 'reward', 'Take the explorer brooch from the body.', 32636, 31873, 10, null, null, '[[4871,1]]'::jsonb, 4240, '[]'::jsonb, false, 'Kill rat and take Explorer Brooch from body.');
  update public.map_quest_steps st set segment_id = seg, sort = 40 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 31 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 40) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 31 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Fanfare Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 32 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 32 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (32, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (32, seg, 10, 'note', 'Bring a rope.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Requirements: Key 3520, A Rope');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (32, seg, 20, 'get', 'In the building north-west of the boat: key 3520 in the box (the crypt door may already be open).', 32376, 31802, 7, null, null, '[[2973,1]]'::jsonb, null, '[]'::jsonb, false, 'Go inside the building just northwest of the boat, and get Key 3520 from the box. It may not be necessary to get the key.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (32, seg, 30, 'go', 'Go into the Carlin cemetery east of town and down into the crypt at its south end.', 32404, 31790, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Enter the Carlin cemetery just east of town (Mapper Coords 126.151, 124.40, 7) and go down into the Crypt at the south end of the cemetary.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (32, seg, 40, 'go', 'Open the door to the west (key 3520) and go down the hole.', 32396, 31787, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Open the door to the west and look for a hole. Go down the hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (32, seg, 50, 'reward', 'Follow the cave north (trolls): the fanfare is in the chest.', 32390, 31769, 9, null, null, '[[2955,1]]'::jsonb, 2472, '[]'::jsonb, false, 'Follow this path. "Use" the chest to receive the Fanfare.');
  update public.map_quest_steps st set segment_id = seg, sort = 50 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 32 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 50) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 32 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Geomancer Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 33 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 33 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (33, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (33, seg, 10, 'note', 'Bring a rope and a shovel.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Rope. (The Mount Sternum way is newer than 7.1: this draft goes through the Pick ''N Shovel mine, like the Crusader Helmet draft.)');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (33, seg, 20, 'go', 'Dig the loose stone pile west of Kazordoon open with your shovel and go down.', 32448, 31991, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'The wiki goes through Mount Sternum, which came later; on the 7.1 map the dwarf geomancers are deep in the mines below Kazordoon''s west side.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (33, seg, 30, 'go', 'Go east, up with your rope and down again into the mines (minotaurs, dwarves).', 32497, 31980, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow this path past the Graveyard of the Doomed to the west and north and go down a level.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (33, seg, 40, 'go', 'Follow the mines down, floor after floor, to the bottom (dwarf soldiers and guards).', 32509, 31953, 13, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Head directly north west and go down the hole. Move north and take first west and go down the hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (33, seg, 50, 'kill', 'Fight through the dwarf guards and soldiers to the geomancers (kill them first).', 32500, 31985, 14, null, 'Dwarf Geomancer', '[]'::jsonb, null, '[]'::jsonb, false, 'The quest box is on the east side of this room, behind a couple Dwarf Guards, and a Dwarf Geomancer.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (33, seg, 60, 'note', 'Needs placing: the box with a dwarven ring, a small diamond and a small sapphire (east side of the geomancers'' room on the wiki; not on the 7.1 map).', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'The quest box is on the east side of this room.');
  update public.map_quest_steps st set segment_id = seg, sort = 60 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 33 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 60) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 33 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Ghoul Room Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 34 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 34 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (34, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (34, seg, 10, 'note', 'Bring destroy field runes or an antidote for the poison fields.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Recommended Destroy Field or using Antidote for Poison Fields');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (34, seg, 20, 'go', 'Go down into the Ancient Temple north of Thais, two floors.', 32356, 32170, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go to the Ancient Temple, north of Thais (Mapper Coords 126.100, 125.171, 7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (34, seg, 30, 'go', 'Go north to the end of the big room and down two floors to the rotworms.', 32354, 32138, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Down 2 levels and head North - all the way to the northern end of the large room. Go down to the Rotworms.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (34, seg, 40, 'go', 'Follow the long way east, south and east and go down (rotworms, poison spiders, orcs and orc spearmen).', 32502, 32217, 11, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow this path to the east, south, and east, and go down the ladder. Watch out for Orcs, Orc Spearmen, Orc Warriors.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (34, seg, 50, 'go', 'Run through the poison fields (antidote or destroy field) and go down again.', 32493, 32215, 12, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'This room will be filled with Poison Fields. Once through the poison fields, go down the ladder.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (34, seg, 60, 'get', 'Follow the tunnel east and north to the room with skeletons and rotworms: key 3600 is in the pile of bones in the south-east.', 32509, 32181, 13, null, null, '[[2969,1]]'::jsonb, null, '[]'::jsonb, false, 'Follow a small tunnel to the east and then north. After you come to a room with Skeletons and Rotworms, "Open" a dead skeleton in the South-East of the room - you will get Key 3600.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (34, seg, 70, 'go', 'Use the well in that room to go down.', 32508, 32176, 13, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'When you have the key, "Use" the well in that room to go down it.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (34, seg, 80, 'kill', 'Kill the 3 ghouls and open the door with key 3600.', 32504, 32176, 14, null, 'Ghoul', '[]'::jsonb, null, '[]'::jsonb, false, 'Kill 3 Ghouls, unlock the door with Key 3600, get your reward.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (34, seg, 90, 'reward', 'The chest with a club ring.', 32500, 32174, 14, null, null, '[[3093,1]]'::jsonb, 2472, '[]'::jsonb, false, 'Get your reward.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (34, seg, 100, 'reward', 'And the chest with a garlic necklace.', 32500, 32176, 14, null, null, '[[3083,1]]'::jsonb, 2472, '[]'::jsonb, false, 'Get your reward.');
  update public.map_quest_steps st set segment_id = seg, sort = 100 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 34 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 100) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 34 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Giant Smithhammer Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 35 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 35 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (35, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (35, seg, 10, 'go', 'Go to the cyclops and minotaur camp in the Plains of Havoc and down the stairs in the north building.', 32780, 32234, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go down the stairs in the north structure (Mapper Coords 128.11, 125.235, 7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (35, seg, 20, 'reward', 'Go to the room straight south (lots of cyclopes and minotaurs, guards and mages): the giant smithhammer is in the chest.', 32775, 32253, 8, null, null, '[[3208,1]]'::jsonb, 2472, '[]'::jsonb, false, 'Once you go down these stairs, you will be faced with numerous Cyclopes, Minotaurs, Minotaur Guards, Minotaur Mages. The quest box is located in the room directly to the south.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (35, seg, 30, 'reward', 'And a talon in the chest next to it.', 32777, 32253, 8, null, null, '[[3034,1]]'::jsonb, 2472, '[]'::jsonb, false, 'The quest box is located in the room directly to the south.');
  update public.map_quest_steps st set segment_id = seg, sort = 30 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 35 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 30) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 35 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Griffin Shield Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 36 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 36 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (36, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (36, seg, 10, 'note', 'Bring a shovel and plenty of food: the way is long.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Don''t forget to have a shovel in your backpack and some food because the way to the quest and back is too long.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (36, seg, 20, 'go', 'In the cave near Northport, dig the hole open with your shovel and go down (spiders).', 32512, 31622, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'It begins in a cave near Northport (Mapper Coords 126.232, 123.122, 7). Use the shovel to open a hole (Mapper Coords 127.0, 123.136, 7) and get into it.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (36, seg, 30, 'go', 'Follow the cave to the next hole (rotworms, wolves).', 32513, 31656, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the blue line until the next hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (36, seg, 40, 'go', 'And down again (trolls, wolves).', 32483, 31633, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Keep following the blue line.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (36, seg, 50, 'go', 'In the small forest in the cave, go down the hole behind the middle tree and turn the switch to the right (if it already is, left and right again), then climb back up.', 32494, 31629, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'In the red spot, behind the middle tree, there is a hole and inside that hole there is a switch that you must turn right to open the entrance to the Maze of Lost Souls.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (36, seg, 60, 'go', 'Go down into the Maze of Lost Souls.', 32503, 31669, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Get out the hole and follow this way to get to the entrance of the Maze of Lost Souls.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (36, seg, 70, 'go', 'Follow the maze closely, many floors up and down (orcs, trolls, minotaurs, goblins, a beholder and more): off the way are dragons, dragon lords and giant spiders.', 32521, 31726, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the next map step by step or you''ll face Dragons, Dragon Lords and Giant Spiders. In this path you''ll face all the creatures (Rats ~ Orc Leaders).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (36, seg, 80, 'go', 'Go down 5 floors to the last room.', 32511, 31721, 14, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Ok, here you are in the final room.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (36, seg, 90, 'kill', 'Kill the 2 dwarf guards, 2 minotaur guards, 2 stone golems and 3 elf arcanists.', 32505, 31722, 15, null, 'Stone Golem', '[]'::jsonb, null, '[]'::jsonb, false, 'There are 2 Dwarf Guards, 2 Minotaur Guards, 2 Stone Golems and 3 Elf Arcanists here.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (36, seg, 100, 'reward', 'In the pile of bones: the griffin shield.', 32500, 31721, 15, null, null, '[[3433,1]]'::jsonb, 4285, '[]'::jsonb, false, 'Take the reward that is inside two piles of bones and a dead body.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (36, seg, 110, 'reward', 'In the other pile of bones: a dwarven axe.', 32503, 31724, 15, null, null, '[[3323,1]]'::jsonb, 4285, '[]'::jsonb, false, 'Take the reward that is inside two piles of bones and a dead body.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (36, seg, 120, 'reward', 'In the dead body: an obsidian lance.', 32498, 31721, 15, null, null, '[[3313,1]]'::jsonb, 4240, '[]'::jsonb, false, 'Take the reward that is inside two piles of bones and a dead body.');
  update public.map_quest_steps st set segment_id = seg, sort = 120 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 36 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 120) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 36 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Iron Hammer Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 38 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 38 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (38, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (38, seg, 10, 'note', 'Bring a rope and a shovel.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Rope, Shovel');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (38, seg, 20, 'go', 'Dig the loose stone pile west of Kazordoon open with your shovel and go down (minotaurs).', 32448, 31991, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Find the loose stone pile west of Kazordoon (Mapper Coords 126.192, 124.249, 7). Use your shovel, and go down the hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (38, seg, 30, 'go', 'Go down the stairs (minotaurs, minotaur archers).', 32453, 31988, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Once down the hole, you will encounter Minotaurs, and Minotaur Archers.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (38, seg, 40, 'go', 'Go north-west and up with your rope.', 32432, 31951, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the passage to the north-west.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (38, seg, 50, 'reward', 'In the room with the beds: the box between the beds has the iron hammer.', 32434, 31938, 8, null, null, '[[3310,1]]'::jsonb, 2473, '[]'::jsonb, false, 'Follow the passage to the north-west until you find a room with beds in it. The quest box is located between a couple of beds.');
  update public.map_quest_steps st set segment_id = seg, sort = 50 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 38 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 50) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 38 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Iron Helmet Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 39 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 39 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (39, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (39, seg, 10, 'reward', 'In the Plains of Havoc, just west of the cyclops, orc and minotaur camp: the dead body half hidden by a tree has an iron helmet (leather armors, letters and worn boots lie around it).', 32787, 32232, 7, null, null, '[[3353,1]]'::jsonb, 4240, '[]'::jsonb, false, 'There is simply a dead body partially obscured by a tree in the Plains of Havoc, just west of the Cyclops / Orc / Minotaur camp (Mapper Coords 128.19, 125.232, 7).');
  update public.map_quest_steps st set segment_id = seg, sort = 10 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 39 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 10) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 39 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Katana Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 40 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 40 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 40 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (40, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (40, seg, 10, 'note', 'Bring a rope, a shovel and health potions or fluids.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Rope, Shovel, Small Health Potions, 2 Antidote Potions.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (40, seg, 20, 'go', 'Dig the middle grave north-east of the island open with your shovel and go down (spiders, a poison spider).', 32151, 32150, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go to the graves to the north-east of the island (Mapper Coords 125.151, 125.151, 7), and open the middle down one with a Shovel.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (40, seg, 30, 'go', 'Follow the way west to the hole and jump in.', 32146, 32158, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the path west to a hole and jump into it.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (40, seg, 40, 'get', 'Go north past the rotworms: key 4603 is in the dead body.', 32176, 32132, 9, null, null, '[[2969,1]]'::jsonb, null, '[]'::jsonb, false, 'To get Key 4603 face north. Key 4603 will be hidden in one of the dead bodies. When you find it, go back south.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (40, seg, 50, 'go', 'Go back south and down the hole to the east (a skeleton).', 32175, 32147, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go east from the poison fields, into a hole. Down the hole resides a single Skeleton.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (40, seg, 60, 'go', 'Open the door with key 4603 and take the stairs down. Careful: skeletons and a rotworm may be in the room below (the lever behind the north white pillar opens its door).', 32182, 32148, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Open the door with Key 4603, and take the stairs down. If the door is unlocked there could be two skeletons and a rotworm in this room. There is a hidden lever behind the northern white pillar.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (40, seg, 70, 'reward', 'In the fresh corpse: a viking helmet.', 32175, 32145, 11, null, null, '[[3367,1]]'::jsonb, 4240, '[]'::jsonb, false, 'The treasure is hidden inside the fresh human corpses. Grab your Viking Helmet and Katana.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (40, seg, 80, 'reward', 'In the other corpse: the katana. If someone closes the door, the teleporter takes you out.', 32174, 32149, 11, null, null, '[[3300,1]]'::jsonb, 4240, '[]'::jsonb, false, 'If someone closes the door with the lever from the outside, go to the teleport for you to get out!');
  update public.map_quest_steps st set segment_id = seg, sort = 80 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 40 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 80) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 40 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Kingdom of Kormarak Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 41 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 41 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (41, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (41, seg, 10, 'note', 'Daily: only one player per day gets the reward. Bring a rope and an antidote.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'This quest is a daily respawn. Recommended equipment: Rope.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (41, seg, 20, 'go', 'Go down into the Ancient Temple north of Thais, two floors.', 32356, 32170, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go to the Ancient Temple, north of Thais (Mapper Coords 126.100, 125.171, 7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (41, seg, 30, 'go', 'Go north to the end of the big room and down two floors to the rotworms.', 32354, 32138, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Down 2 levels and head North - all the way to the northern end of the large room. Go down to the Rotworms.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (41, seg, 40, 'go', 'Follow the long way east, south and east and go down (rotworms, poison spiders, orcs and orc spearmen).', 32502, 32217, 11, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow this path to the east, south, and east, and go down the ladder. Watch out for Orcs, Orc Spearmen, Orc Warriors.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (41, seg, 50, 'go', 'Run through the poison fields (antidote or destroy field) and go down again.', 32493, 32215, 12, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'This room will be filled with Poison Fields. Once through the poison fields, go down the ladder.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (41, seg, 60, 'go', 'Go north past the minotaurs (the room with skeletons is the Ghoul Room Quest) to the sign "Home of the dead Kingdom of Kormarak" and up the stairs (ghouls).', 32527, 32160, 13, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Down this ladder there are 3 Minotaurs and a few Poison Spiders. Go north following the line. Go up the stairs and you may have to kill three Ghouls.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (41, seg, 70, 'go', 'Go through the magic forcefield.', 32526, 32155, 12, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go through the Magic Forcefield.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (41, seg, 80, 'kill', 'Kill the 11 ghouls in the room (great fireballs) and the demon skeleton at the far end.', 32550, 32205, 11, null, 'Ghoul', '[]'::jsonb, null, '[]'::jsonb, false, 'Be prepared to face 11 Ghouls spread throughout the room and a Demon Skeleton that spawns at the far end of the room.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (41, seg, 90, 'reward', 'In the dead human by the wooden coffin: a brass armor, a brass helmet, a hatchet and 13 throwing stars.', 32553, 32200, 11, null, null, '[[3359,1],[3354,1],[3276,1],[3287,13]]'::jsonb, 4240, '[]'::jsonb, false, 'Open the Dead Human near the Wooden Coffin to find a Brass Armor, a Brass Helmet, a Hatchet and 13 Throwing Stars.');
  update public.map_quest_steps st set segment_id = seg, sort = 90 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 41 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 90) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 41 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Life Ring Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 43 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 43 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 43 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (43, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (43, seg, 10, 'note', 'Bring a pick and a rope.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Pick, Rope');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (43, seg, 20, 'go', 'Go down into the Ancient Temple north of Thais, two floors.', 32356, 32170, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go to the Ancient Temple, north of Thais (Mapper Coords 126.100, 125.171, 7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (43, seg, 30, 'go', 'Follow the way south and go down.', 32371, 32242, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Once down the steps, follow this path to the south and go down a level.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (43, seg, 40, 'go', 'Go east past the orcs and over the drawbridge (if it''s up, the lever is south of it through a narrow passage), then east and south past the beholders to the dead end at the water. Use your pick on the west wall and go down: 3 beholders below, so run to the box.', 32436, 32238, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Head East, through some Orcs. You will come to some water, and a drawbridge. If the bridge is down, go across it, otherwise flip the switch. Keep going east (through two Bonelords) and then south, through two more Bonelords, until you reach a dead-end against some water. The pick hole is hidden against the west wall.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (43, seg, 50, 'reward', 'In the box in the north-east corner: a life ring and a dragon necklace.', 32443, 32238, 11, null, null, '[[3052,1],[3085,1]]'::jsonb, 2469, '[]'::jsonb, false, 'The quest box is in the north-east corner of this room.');
  update public.map_quest_steps st set segment_id = seg, sort = 50 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 43 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 50) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 43 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Longsword Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 44 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 44 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 44 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (44, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (44, seg, 10, 'note', 'Bring a shovel and a rope.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Shovel, Rope');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (44, seg, 20, 'go', 'Dig open the troll cave behind the tree east of the dwarf bridge and go down (trolls; slimes down the drain to the north).', 32663, 31962, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go to the Troll cave east of the Dwarf Bridge (Mapper Coords 127.150, 124.222, 7). The cave entrance is hidden behind a tree. Be careful of the Slimes to the north of the cave entrance.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (44, seg, 30, 'go', 'Head south and go down the stairs (trolls).', 32648, 32003, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Once in the cave, head to the south and look for stairs down.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (44, seg, 40, 'reward', 'Go north to the large room (trolls, a minotaur mage): the chest with a wooden doll, a wedding ring and a mirror.', 32649, 31969, 9, null, null, '[[2989,1],[3004,1],[3463,1]]'::jsonb, 2472, '[]'::jsonb, false, 'Once on the next level, head north. The quest boxes are on the north end of the large room.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (44, seg, 50, 'reward', 'The chest with 9 blank runes.', 32650, 31969, 9, null, null, '[[3147,9]]'::jsonb, 2472, '[]'::jsonb, false, 'The quest boxes are on the north end of the large room.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (44, seg, 60, 'reward', 'The chest with the longsword.', 32651, 31969, 9, null, null, '[[3285,1]]'::jsonb, 2472, '[]'::jsonb, false, 'The quest boxes are on the north end of the large room.');
  update public.map_quest_steps st set segment_id = seg, sort = 60 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 44 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 60) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 44 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;
