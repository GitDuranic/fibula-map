-- =====================================================================================
-- Tibia Map - database step 20: AI drafts of quest guides from the TibiaWiki walkthroughs (slice 13j)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- Needs steps 3, 6, 7 and 9 and 16 (Key steps). Written by tools/drafts-to-sql.js from tools/data/quest-drafts. Every step is a draft
-- (not checked) with its wiki sentence as its source; what the checker couldn't tie to a real NPC, word, monster,
-- item or spot is a Note "Needs placing: ...". The quest's Reward steps from the old spots are moved into the draft.
-- Earlier drafts of these quests are replaced; a quest with anything made, changed or ticked in the app is skipped.
--
-- 140 steps for 17 quests (11 need placing):
--   Skull of Ratha Quest: 1 part, 7 steps + 0 Reward steps
--   Small Ruby Quest: 1 part, 12 steps + 0 Reward steps
--   Spike Sword Quest: 1 part, 6 steps + 0 Reward steps
--       no spot
--       no spot
--       no spot
--       no spot
--       32568,32085,12 is not a real spot
--   Stealth Ring Quest: 1 part, 7 steps + 0 Reward steps
--   Steel Helmet Quest: 1 part, 9 steps + 0 Reward steps
--   Studded Legs Quest: 1 part, 5 steps + 0 Reward steps
--       no NPC "Lee'Delle"
--       32024,32196,7 is not a real spot
--   Studded Shield Quest: 1 part, 3 steps + 0 Reward steps
--   Thais Lighthouse Quest: 1 part, 10 steps + 0 Reward steps
--       can't walk 32233,32276,9 -> 32226,32265,10 (A cyclops guards the room. At the north end: the dark shield in one chest.): The start is not near a tile you can walk on.
--   The Desert Dungeon Quest: 1 part, 9 steps + 0 Reward steps
--   The Outlaw Camp Quest: 3 parts, 31 steps + 0 Reward steps
--       can't walk 32594,32212,9 -> 32600,32207,9 (Take the right passage north (an orc shaman, an orc warrior) and go up the ladder.): No route found: these two places are not connected.
--       can't walk 32614,32222,10 -> 32614,32208,10 (Go back to the barrel in the wall (past the level 45 door; someone can rope you up the hole, or go through the giant spiders again). There is now a way through the wall.): No route found: these two places are not connected.
--   Throwing Star Quest: 1 part, 8 steps + 0 Reward steps
--   Time Ring Quest: 1 part, 6 steps + 0 Reward steps
--   Triangle Tower Quest: 1 part, 3 steps + 0 Reward steps
--       32564,32117,4 is not a real spot
--       32565,32119,3 is not a real spot
--   Two Rubies Quest: 1 part, 6 steps + 0 Reward steps
--   Vampire Shield Quest: 1 part, 7 steps + 0 Reward steps
--       33189,31688,14 is not a real spot
--       33195,31688,14 is not a real spot
--   Voodoo Doll Quest: 1 part, 4 steps + 0 Reward steps
--   Wedding Ring Quest: 1 part, 7 steps + 0 Reward steps
-- =====================================================================================

-- Skull of Ratha Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 64 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 64 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 64 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (64, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (64, seg, 10, 'go', 'Go north from Venore through the Green Claw Swamp to the Amazon camp (amazons). Witch Hill is in the middle of the camp: go up.', 32845, 31922, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Travel through Green Claw Swamp to the Amazon Encampment, North of Venore. "Witch Hill" is located near the center of the camp.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (64, seg, 20, 'kill', 'On the hill: two witches, valkyries and a lion.', 32846, 31919, 6, null, 'Witch', '[]'::jsonb, null, '[]'::jsonb, false, 'After defeating two Witches, three Valkeries and two Lions, open the two boxes to obtain 2 bags');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (64, seg, 30, 'reward', 'The left box: a bag with the skull of Ratha and a white pearl.', 32845, 31917, 6, null, null, '[[3207,1],[3026,1]]'::jsonb, 2469, '[]'::jsonb, false, 'open the two boxes to obtain 2 bags: one containing a White Pearl, the Skull of Ratha');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (64, seg, 40, 'reward', 'The right box: a bag with a wolf tooth chain and a dwarven ring.', 32847, 31917, 6, null, null, '[[3012,1],[3097,1]]'::jsonb, 2469, '[]'::jsonb, false, 'and a second containing a Wolf Tooth Chain and a Dwarven Ring.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (64, seg, 50, 'go', 'Go back down the hill and down the trapdoor of the witch house.', 32844, 31917, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'To get there go downstairs the "Witch house" (purple mark).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (64, seg, 60, 'kill', 'Follow the basement east: a witch and valkyries guard the chest.', 32864, 31911, 8, null, 'Valkyrie', '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the map of this basement in order to obtain your reward, it is guarded by a Witch and 3-5 Valkeries.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (64, seg, 70, 'reward', 'The chest: a bag with 100 gold, a crystal necklace and 2 black pearls.', 32867, 31909, 8, null, null, '[[3008,1],[3027,2],[3031,100]]'::jsonb, 2472, '[]'::jsonb, false, 'Once they are defeated, open the chest to find a bag with 100gp, a Crystal Necklace, and 2 Black Pearls.');
  update public.map_quest_steps st set segment_id = seg, sort = 70 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 64 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 70) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 64 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Small Ruby Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 65 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 65 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 65 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (65, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (65, seg, 10, 'note', 'Bring a shovel and a rope.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Shovel, Rope or Magic Rope');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (65, seg, 20, 'go', 'Go down into the Ancient Temple north of Thais, two floors.', 32356, 32170, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the road to Route:Mintwallin.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (65, seg, 30, 'go', 'Head as far north as you can and go down two floors to the rotworms.', 32354, 32138, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the road to Route:Mintwallin.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (65, seg, 40, 'go', 'Follow the path east and south and go down the ladder (rotworms, poison spiders, orcs and orc spearmen).', 32502, 32217, 11, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the road to Route:Mintwallin.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (65, seg, 50, 'go', 'Through the poison fields (antidote or destroy field) and down another level.', 32493, 32215, 12, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the road to Route:Mintwallin.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (65, seg, 60, 'go', 'Follow the path east and north (poison spiders, minotaurs) and go down the hole (cyclopes).', 32577, 32179, 13, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the road to Route:Mintwallin.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (65, seg, 70, 'go', 'Up two ladders in the north-west, then down two floors again and follow the long tunnel (minotaurs) to Mintwallin: go down into the city.', 32484, 32101, 14, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the road to Route:Mintwallin.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (65, seg, 80, 'go', 'In Mintwallin go south and up the stairs to the throne room.', 32426, 32135, 15, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'When you have come to Mintwallin you go south and up the stairs to the throne room');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (65, seg, 90, 'go', 'Take the ladder slightly south-west of the stairs.', 32415, 32149, 14, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'and you take the ladder slightly southwest from the stairs in there.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (65, seg, 100, 'go', 'Go down into the pit: a dragon.', 32435, 32171, 13, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'When you have gone down the ladder in to the pit, you will face 1 dragon');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (65, seg, 110, 'go', 'Go down the hole: two dragons.', 32436, 32188, 14, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'and when you go down the hole you will face 2 dragons.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (65, seg, 120, 'reward', 'North of the room: the small ruby lies under the fire.', 32437, 32174, 15, null, null, '[[3030,1]]'::jsonb, 3030, '[]'::jsonb, false, 'Browse the field on the fire located north of the room.');
  update public.map_quest_steps st set segment_id = seg, sort = 120 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 65 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 120) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 65 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Spike Sword Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 66 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 66 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 66 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (66, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (66, seg, 10, 'note', 'Bring a shovel, a rope, a pick, and invisible or stealth rings for the fire devils.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Shovel, Rope, Pick, Invisible spell or Stealth Rings for Fire Devils');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (66, seg, 20, 'note', 'Needs placing: Go down into the small cave east of Mount Sternum, and down another level.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go to the small cave east of Mount Sternum, and go down. You will be in a small room, go down another level.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (66, seg, 30, 'note', 'Needs placing: Pick a hole just to the south-west and go down it.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'In this room, you will need to pick a hole just to the south-west, as indicated on the map. Go down the hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (66, seg, 40, 'note', 'Needs placing: A fire devil. Follow the passage around to the west and go down.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'In this room is one Fire Devil. Follow the passage around to the west, and go down another level.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (66, seg, 50, 'note', 'Needs placing: Fire devils: in the south-west corner pick another hole and go down.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'On this level, there will be 5 Fire Devils. Head to the south-west corner of the room, and pick another hole, then go down.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (66, seg, 60, 'note', 'Needs placing: Lava all around and many fire devils: the spike sword is in the body hidden behind a pillar.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'The reward is inside a body that is hidden behind a pillar.');
  update public.map_quest_steps st set segment_id = seg, sort = 60 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 66 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 60) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 66 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Stealth Ring Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 67 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 67 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 67 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (67, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (67, seg, 10, 'go', 'Go down into the Minotaur Pyramid north-east of Darashia (minotaurs).', 33312, 32281, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Head to the Minotaur Pyramid north-east of Darashia. You will only have to face Minotaurs on the ground level. Go down the staircase.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (67, seg, 20, 'go', 'Minotaurs and minotaur guards: follow the path south-west and go down.', 33300, 32290, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Down these steps you will face Minotaurs and one or two Minotaur Guards. Follow this path to the south-west, and go down another staircase.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (67, seg, 30, 'go', 'Head east (minotaur guards, minotaur archers) and go down.', 33315, 32283, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Head to the East/North-East. There will be several Minotaur Guards and Minotaur Archers on this floor. There will be another staircase to go down.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (67, seg, 40, 'go', 'All kinds of minotaurs, minotaur mages too: head north and go down.', 33308, 32278, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'On the next level are all kinds of Minotaurs, including about 4 Minotaur Mages. On this level, head North. Look for another staircase down.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (67, seg, 50, 'kill', 'Kill the mummy.', 33311, 32280, 11, null, 'Mummy', '[]'::jsonb, null, '[]'::jsonb, false, 'Down this staircase, you will face one Mummy.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (67, seg, 60, 'reward', 'The south-east coffin: the stealth ring.', 33315, 32282, 11, null, null, '[[3049,1]]'::jsonb, 1983, '[]'::jsonb, false, 'After killing the Mummy, the Stealth Ring can be found in the south-east coffin');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (67, seg, 70, 'reward', 'The north-east coffin: the protection amulet.', 33315, 32277, 11, null, null, '[[3084,1]]'::jsonb, 1983, '[]'::jsonb, false, 'and the Protection Amulet can be found in the north-east coffin.');
  update public.map_quest_steps st set segment_id = seg, sort = 70 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 67 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 70) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 67 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Steel Helmet Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 68 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 68 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 68 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (68, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (68, seg, 10, 'note', 'Bring a shovel and a rope.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required Equipment: Shovel, Rope');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (68, seg, 20, 'go', 'West of Kazordoon past the Dwarf Mines: dig the loose stone pile behind the plum tree and go down.', 32489, 31965, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Travel west of Kazordoon past the Dwarf Mines and use your shovel to dig a Loose Stone Pile hidden behind a Plum Tree.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (68, seg, 30, 'go', 'Walk west (minotaurs) and rope up into the Secret Hideout.', 32466, 31966, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Once you go down the hole, walk west and rope up into the Secret Hideout.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (68, seg, 40, 'go', 'Minotaur guards and archers: go up the ladder in the north.', 32463, 31946, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'ground floor: 2 Minotaur Guards, 2 Minotaur Archers');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (68, seg, 50, 'go', 'Minotaur guards: go up the next ladder.', 32460, 31948, 6, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'first floor: 4 Minotaur Guards, 4 Minotaur Archers');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (68, seg, 60, 'reward', 'The drawers next to the table: 56 gold.', 32460, 31951, 5, null, null, '[[3031,56]]'::jsonb, 2434, '[]'::jsonb, false, '56 Gold Coins can be found in a Chest of Drawers next to a table');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (68, seg, 70, 'reward', 'The box between the two beds: 47 gold.', 32464, 31957, 5, null, null, '[[3031,47]]'::jsonb, 2469, '[]'::jsonb, false, '47 Gold Coins can be found in a Chest between two beds');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (68, seg, 80, 'go', 'Go up the ladder (minotaur archers).', 32465, 31953, 5, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'floor 4: North side: 4 Minotaur Archers');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (68, seg, 90, 'reward', 'The box next to the anvil: the steel helmet.', 32462, 31947, 4, null, null, '[[3351,1]]'::jsonb, 2473, '[]'::jsonb, false, 'Steel Helmet can be found in a Box next an anvil');
  update public.map_quest_steps st set segment_id = seg, sort = 90 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 68 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 90) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 68 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Studded Legs Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 69 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 69 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 69 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (69, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (69, seg, 10, 'note', 'Bring a rope.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required equipment: Rope');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (69, seg, 20, 'go', 'Go to the wasp tower in north-west Rookgaard and rope up four times to the top (wasps).', 32000, 32139, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go to the Wasp tower in North-west Rookgaard. Rope yourself up killing or simply ignoring the Wasps you will face.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (69, seg, 30, 'get', 'Use the honey flower patch to the right: a honey flower.', 32005, 32139, 3, null, null, '[[2984,1]]'::jsonb, null, '[]'::jsonb, false, 'At the top simply "use" on the Honeyflower Patch to the right and you will get a Honey Flower.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (69, seg, 40, 'note', 'Needs placing: Give Lee''Delle the honey flower.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Head to Lee''Delle''s Shop, on premium account area, and trade your Honey Flower for a pair of Studded Legs.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (69, seg, 50, 'note', 'Needs placing: Lee''Delle gives the studded legs.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Oh, thank you so much! Please take this piece of armor as reward.');
  update public.map_quest_steps st set segment_id = seg, sort = 50 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 69 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 50) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 69 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Studded Shield Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 70 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 70 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 70 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (70, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (70, seg, 10, 'get', 'Use the banana palm in the east of Rookgaard to get a banana.', 32172, 32169, 7, null, null, '[[3587,1]]'::jsonb, null, '[]'::jsonb, false, 'Head to the Bananapalm located in East Rookgaard. "Use" the Bananapalm to get the Banana.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (70, seg, 20, 'talk', 'Give the banana to Willie in the town.', null, null, null, 'Willie', null, '[]'::jsonb, null, '[{"say":"hi","reply":"Hiho <your name>."},{"say":"banana","reply":"Have you found a banana for me?"},{"say":"yes","reply":"A banana! Great. Take this shield, so the &#@&* monsters don''t beat the &@*&@ out of you.","fx":["takes banana","you get studded shield"],"cond":["if you have banana"],"alts":[{"reply":"Hm, you don''t have it."},{"other":true,"reply":"Too bad."}]}]'::jsonb, false, 'Head to Willie in the town and trade the ''Banana'' for a Studded Shield.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (70, seg, 30, 'reward', 'Willie gives you a studded shield.', 32047, 32204, 7, null, null, '[[3426,1]]'::jsonb, 3426, '[]'::jsonb, false, 'Willie: A banana! Great. Here, take this shield, I don''t need it anyway.');
  update public.map_quest_steps st set segment_id = seg, sort = 30 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 70 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 30) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 70 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Thais Lighthouse Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 71 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 71 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 71 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (71, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (71, seg, 10, 'note', 'You need two players.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Note: you will need at least two players to complete this quest!');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (71, seg, 20, 'go', 'Go down into the basement of the lighthouse south-west of Thais.', 32224, 32275, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go to the lighthouse southwest of Thais and go down into the basement.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (71, seg, 30, 'go', 'Move the crates in the south of the room: pull the lever under them. A ladder down appears.', 32227, 32278, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'To access this dungeon, you''ll have to find a lever under some crates which will make a ladder leading down appear.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (71, seg, 40, 'go', 'Go down the ladder that appeared.', 32225, 32276, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'To access this dungeon, you''ll have to find a lever under some crates which will make a ladder leading down appear.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (71, seg, 50, 'go', 'One player stands on the switch plate at the end of the north passage: stairs appear at the south end.', 32225, 32268, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'The north passage leads to a switchplate that will make stairs appear at the south end once someone stands on it.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (71, seg, 60, 'go', 'The other player goes down the stairs at the south end.', 32225, 32283, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'The other person must go down the stairs and turn a lever.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (71, seg, 70, 'go', 'Pull the lever: a teleporter appears in the east passage.', 32225, 32285, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Once turned, this lever will make the teleporter leading to the quest room appear in the right passage.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (71, seg, 80, 'go', 'Go back up and take the teleporter at the end of the east passage.', 32233, 32276, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Once turned, this lever will make the teleporter leading to the quest room appear in the right passage.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (71, seg, 90, 'reward', 'A cyclops guards the room. At the north end: the dark shield in one chest.', 32226, 32265, 10, null, null, '[[3421,1]]'::jsonb, 2472, '[]'::jsonb, false, 'There are only 2 Cyclopes in there, which can be either fought or ignored. The chests containing the Dark Shield and Battle Hammer are at the north end of the room.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (71, seg, 100, 'reward', 'The battle hammer in the other chest.', 32225, 32265, 10, null, null, '[[3305,1]]'::jsonb, 2472, '[]'::jsonb, false, 'The chests containing the Dark Shield and Battle Hammer are at the north end of the room.');
  update public.map_quest_steps st set segment_id = seg, sort = 100 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 71 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 100) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 71 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- The Desert Dungeon Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 72 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 72 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 72 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (72, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (72, seg, 10, 'note', 'Four players, one of each vocation, and a shovel. Each brings the item for their basin: knight a sword, paladin a crossbow, druid a red apple, sorcerer a spellbook. The items are destroyed.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, '4-5 players, one of each vocation. Each player should bring an item which will be destroyed at the end of the quest: Spellbook (Sorcerer only), Crossbow (Paladin only), Red Apple (Druid only), Sword (Knight only)');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (72, seg, 20, 'go', 'In the middle of the Jakundaf Desert, open the loose stone pile with your shovel and drop down.', 32649, 32093, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Open the Loose Stone Pile in the middle of the desert and drop down.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (72, seg, 30, 'go', 'Go down 4 more holes, to the floor with spiders.', 32643, 32093, 11, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go down 4 more times to reach a floor with Spiders.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (72, seg, 40, 'go', 'Go north, turn east as soon as you can and follow the cave south to the ladder up (spiders, slimes).', 32658, 32112, 12, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go north and turn east as soon as you can, and then follow the cave south to find the next ladder up.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (72, seg, 50, 'go', 'Go west to the next ladder up. Do not go down the hole to the south with the warning sign.', 32646, 32110, 11, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go up the ladder and west to find another ladder (do not go down the hole to the south with the Warning Sign).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (72, seg, 60, 'go', 'Go south and up the ladder.', 32628, 32133, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go south and up the ladder.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (72, seg, 70, 'go', 'Go east and north to a hole (do not go down), then east and north again and follow the path to the last ladder up.', 32670, 32099, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Now go east and then north to find a hole, but do not go down. Go east and north again and follow the path to find the final ladder.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (72, seg, 80, 'go', 'In the vocation room each puts the item on their basin, then steps on the tile in front of it: knight south, paladin north, druid west, sorcerer east. When all four are on their tiles, the paladin pulls the lever in front of him: all four are teleported to the reward room.', 32673, 32086, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Sorcerers: place the Spellbook on the east basin and then step on the tile. Knights: place the Sword on the south basin and then step on the tile. Druids: place the Red Apple on the west basin and then step on the tile. Paladins: place the Crossbow on the north basin and then step on the tile. When all the switches are pressed, the Paladin must pull the Lever in front of his tile. All players will be teleported to the reward room.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (72, seg, 90, 'note', 'Needs placing: the reward room with its 2 chests, west: 100 platinum coins; east: a bag with a ring of healing, a protection amulet, an ankh and a magic light wand (north of the vocation room on the wiki and the 7.6 map; not on the 7.1 map).', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'There are 2 reward chests: one to the west and one to the east. One of them contains Golden Bag with 25 Platinum Coins for each vocation that participated, the other contains a Green Bag with with a Protection Amulet, a Magic Light Wand, a Ring of Healing, and an Ankh.');
  update public.map_quest_steps st set segment_id = seg, sort = 90 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 72 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 90) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 72 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- The Outlaw Camp Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 73 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 73 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 73 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (73, 10, 'The keys') returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 10, 'note', 'Bring a rope, a shovel, a power ring, a barrel and 3 parcels (or exani hur).', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Rope, Shovel, 1-2 Power Rings, Barrel, 3 Parcels (or Levitate if you have it)');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 20, 'get', 'Key 3301 is in the dead tree next to the minotaur tower (a dead body next to it). Mind the pitfall next to it.', 32617, 32250, 7, null, null, '[[2970,1]]'::jsonb, null, '[]'::jsonb, false, 'Copper Key 3301: In a dead tree right next to the minotaur tower. There is a dead body next to the tree.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 30, 'get', 'Key 3302 is in the dead tree just north of the minotaur tower.', 32609, 32244, 7, null, null, '[[2970,1]]'::jsonb, null, '[]'::jsonb, false, 'Silver Key 3302: Just north of the minotaur tower, in a dead tree.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 40, 'get', 'Key 3303 is in the dead tree at the campsite south of the main buildings.', 32651, 32244, 7, null, null, '[[2970,1]]'::jsonb, null, '[]'::jsonb, false, 'Copper Key 3303: In a campsite south of the main buildings of the Outlaw Camp, in a dead tree.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 50, 'go', 'Dig open the hole behind the trees: the wild warrior cave.', 32632, 32228, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Now, take these keys, and go into the Wild Warrior cave. The shovel hole is hidden behind a tree.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 60, 'go', 'Follow the path north (wild warriors) to the room with four ladders down; take the one in the north-west corner.', 32619, 32181, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'At the end of this path is a larger room with four ladders going down. Take the ladder in the north-west corner.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 70, 'key', 'Open the door with key 3303.', 32614, 32175, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Here you will see a locked door with a switch behind it. Unlock the door with Key 3303, and flip the switch.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 80, 'go', 'Flip the switch: it moves the oven in the room south of you.', 32614, 32173, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'This switch moves an oven in the room directly south of you.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 90, 'go', 'Go back up and down the ladder to the south.', 32619, 32186, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go back up the ladder, and then down the ladder to your south.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 100, 'get', 'Behind the oven: key 3304.', 32623, 32187, 9, null, null, '[[2972,1]]'::jsonb, null, '[]'::jsonb, false, 'There will be an oven with a Chest (Quest) behind it. If the switch is in the correct position, you can fit behind the oven and open the chest to get Key 3304.');
  insert into public.map_quest_segments (quest_id, sort, name) values (73, 20, 'The barrel') returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 10, 'go', 'Bring the barrel to the shovel hole near the water north of the camp and go down.', 32603, 32206, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Drag a barrel back to the Outlaw Camp, and down a shovel hole near the water to the north.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 20, 'go', 'Follow the only way to its end and go down.', 32598, 32199, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'There is only one way you can go in this cave. Follow it all the way to the end, where you can go no further.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 30, 'go', 'In this very small room, put the barrel in the north-west corner. You rope it up through a hole later.', 32595, 32199, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'In this very small room, place the barrel in the north-west corner. You will rope it up through a hole later on.');
  insert into public.map_quest_segments (quest_id, sort, name) values (73, 30, 'The bright sword') returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 10, 'go', 'Go up the minotaur tower, two floors.', 32615, 32252, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Once the barrel is in place, go back to the minotaur tower to the south, and go up two levels.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 20, 'go', 'Past the "Point of No Return" sign, walk off the roof: you fall all the way underground.', 32616, 32249, 5, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'There will be a sign that says "Point of No Return". This leads to the Giant Spiders. Simply walk off of the roof and you will fall all the way underground.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 30, 'go', 'Follow the passage west and north (a giant spider). At the north end, go down the ledge with exani hur or 3 parcels (orc spearmen and an orc berserker below).', 32593, 32238, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'At the north end of this cave, there will be a ledge. You''ll need Levitate or three parcels. The typical spawn down the ledge consists of Orc Spearman and Orc Berserkers.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 40, 'go', 'Take the left of the two passages north. Put the power ring on the counter, then flip the switch: the ring is teleported away.', 32594, 32212, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'There will be two passages to the north. Go up the passage on the left. Here you will find a wooden surface and a switch. Place the Power Ring on the wooden surface, and then flip the switch.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 50, 'go', 'Take the right passage north (an orc shaman, an orc warrior) and go up the ladder.', 32600, 32207, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Now, take the right passage to the north. You will see a ladder going up, and a ladder going down. Take the ladder UP.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 60, 'go', 'Follow the short passage to the open hole: do not fall down! Use your rope on it to pull up your barrel.', 32595, 32199, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow this short passage, and you will see an open hole. DO NOT FALL DOWN THIS HOLE! "Use" a rope on the hole to rope-up your barrel.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 70, 'go', 'Take the barrel back down and to the left, and throw it down the ladder.', 32592, 32206, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Now, drag the barrel back down the hole (towards the Orcs) and to the left, throw the barrel down the ladder.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 80, 'kill', 'Kill the skeletons, the ghoul and the beholder first: they can push and break the barrel.', 32599, 32217, 10, null, 'Beholder', '[]'::jsonb, null, '[]'::jsonb, false, 'there will be some Skeletons, Ghouls and two Bonelords to the south in this room) kill them first cause ghouls and skeletons from Bonelords can push and break the barrel.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 90, 'go', 'Drag the barrel east through the level 45 door, down the passage to the wall. Put it in the gap at the south part of the wall: it stops the wall when you flip the next switch.', 32614, 32209, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Drag the barrel to the east, and through the level 45 Gate of Expertise. Continue down this passage until you come to a wall blocking your path. On the south part of this wall, there will be a small portion of the wall that the barrel will fit into. Place the barrel here.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 100, 'go', 'Back at the minotaur tower, fall down the pitfall next to the dead tree.', 32617, 32253, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Now go back to the Minotaur camp. Instead of going up, fall down the hole next to the dead tree. This is a pitfall.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 110, 'key', 'Follow the passage north: open the first door with key 3301.', 32619, 32241, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the passage to the north. You will need to go through two locked doors. The first one needs Key 3301, and the second one needs Key 3302.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 120, 'key', 'Open the second door with key 3302.', 32619, 32240, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'The first one needs Key 3301, and the second one needs Key 3302.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 130, 'go', 'At the ladder up and the ladder down, go down, and down again.', 32616, 32226, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'You will eventually come to a ladder going up, and a ladder going down. Go down.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 140, 'go', 'In the room with the mill, flip the switch: your power ring turns into a fire field.', 32614, 32222, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Continue until you see a room with Fire Fields on the floor. This room also has a Mill with a switch. Flip the switch. The Power Ring will turn into a fire field.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 150, 'go', 'Go back to the barrel in the wall (past the level 45 door; someone can rope you up the hole, or go through the giant spiders again). There is now a way through the wall.', 32614, 32208, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Now go back to where you placed the barrel in the wall (past the level 45 Gate of Expertise). If done correctly, there will be a passage through the wall.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 160, 'kill', 'Demon skeletons and skeletons.', 32620, 32202, 10, null, 'Demon Skeleton', '[]'::jsonb, null, '[]'::jsonb, false, 'Here you will face 3 Demon Skeletons and 2 Skeletons.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 170, 'key', 'Open the door with key 3304.', 32620, 32199, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'After killing the Demon Skeletons, use Golden Key 3304 to unlock the door.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (73, seg, 180, 'reward', 'The chest: a bag with the bright sword and a red gem.', 32620, 32198, 10, null, null, '[[3295,1],[3039,1]]'::jsonb, 2472, '[]'::jsonb, false, 'Open the Chest (Quest) to receive your Bright Sword and Red Gem inside a bag.');
  update public.map_quest_steps st set segment_id = seg, sort = 180 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 73 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 180) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 73 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Throwing Star Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 75 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 75 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 75 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (75, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (75, seg, 10, 'note', 'Bring a pick, a rope, and an antidote or destroy field runes for the poison fields.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Pick, Rope. Recommended Antidote, Antidote Rune, or Destroy Field for Poison Fields');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (75, seg, 20, 'go', 'Go down into the Ancient Temple north of Thais, two floors.', 32356, 32170, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go to the Ancient Temple, north of Thais. Go down two levels, and head as far north as you can go.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (75, seg, 30, 'go', 'Head as far north as you can and go down two floors to the rotworms.', 32354, 32138, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go down to the level with the Rotworms.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (75, seg, 40, 'go', 'Follow the path east and south and go down the ladder (rotworms, poison spiders, orcs and orc spearmen).', 32502, 32217, 11, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow this path to the east and south, and go down the ladder.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (75, seg, 50, 'go', 'Through the poison fields (antidote or destroy field) and down another level.', 32493, 32215, 12, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'On this level, there will be a lot of Poison Fields. You can either run through them and then use Antidote, or you can use Destroy Field to clear a path. Go down another level.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (75, seg, 60, 'go', 'Follow the path east and north (poison spiders, minotaurs) and go down the hole (cyclopes).', 32577, 32179, 13, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow this path to the east and north. Be careful of Minotaurs. Go down the hole that is circled on the map. You will face a couple Cyclopes down this hole.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (75, seg, 70, 'go', 'Follow the path around to the underground park (minotaurs, minotaur archers and guards, cyclopes) and use your pick on the muddy floor here.', 32517, 32107, 14, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow this path around to the underground park and use the Pick where indicated.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (75, seg, 80, 'reward', 'The box just south-east of the ladder: 10 throwing stars.', 32522, 32111, 15, null, null, '[[3287,10]]'::jsonb, 2473, '[]'::jsonb, false, 'The quest box will be just south-east of the ladder.');
  update public.map_quest_steps st set segment_id = seg, sort = 80 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 75 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 80) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 75 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Time Ring Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 76 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 76 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 76 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (76, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (76, seg, 10, 'note', 'Go to Shadowthorn, the elf town in the swamp south-east of Venore.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Find your way to Shadowthorn and enter the hole here.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (76, seg, 20, 'go', 'Go down the trapdoor south-west of the town (elves).', 33059, 32181, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Find your way to Shadowthorn and enter the hole here (Mapper Coords 129.36, 125.182, 7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (76, seg, 30, 'go', 'Head west (elf scouts) and go down the ramp.', 33047, 32177, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'When you come down, head west.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (76, seg, 40, 'reward', 'Down the ramp: elf arcanists, elf scouts and ghouls. The three chests are at the north end of the room; the west one: a crystal ball.', 33038, 32171, 9, null, null, '[[3076,1]]'::jsonb, 2472, '[]'::jsonb, false, 'Down the ramp you will find 4 Elf Arcanists, at least 4 Elf Scouts, two Ghouls and one Demon Skeleton. The three quest boxes are located in the north end of this room.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (76, seg, 50, 'reward', 'The middle chest: the time ring.', 33039, 32171, 9, null, null, '[[3053,1]]'::jsonb, 2472, '[]'::jsonb, false, 'The three quest boxes are located in the north end of this room.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (76, seg, 60, 'reward', 'The east chest: an elven amulet.', 33040, 32171, 9, null, null, '[[3082,1]]'::jsonb, 2472, '[]'::jsonb, false, 'The three quest boxes are located in the north end of this room.');
  update public.map_quest_steps st set segment_id = seg, sort = 60 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 76 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 60) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 76 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Triangle Tower Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 77 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 77 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 77 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (77, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (77, seg, 10, 'note', 'The Triangle Tower (south-east of Thais) is not on the 7.1 map. If the tower is closed, pull the lever in the desert east of it to open the wall (7.2 map: 32573,32121,7).', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'If the tower is closed you will have to go into the desert and pull the lever to open the wall, the lever is found here (Mapper Coords 127.62, 125.122, 7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (77, seg, 20, 'note', 'Needs placing: Go into the Triangle Tower and up to the top floor: skeletons, ghouls, demon skeletons, stalkers (7.2 map: last stairs 32564,32117,4).', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'First, head to the Triangle Tower, which is found here (Mapper Coords 127.49, 125.119, 7), and go up to the top.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (77, seg, 30, 'note', 'Needs placing: On the top floor (a monk, a witch and a dwarf geomancer), the chest: a dwarven ring, 2 small sapphires and a garlic necklace in a bag (7.2 map: 32565,32119,3).', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'After reaching the fourth floor and eventually killing everything there, open the box to get your reward.');
  update public.map_quest_steps st set segment_id = seg, sort = 30 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 77 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 30) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 77 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Two Rubies Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 79 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 79 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 79 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (79, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (79, seg, 10, 'note', 'Bring a rope and a destroy field rune.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Required equipment: Rope, Destroy Field (at least 1 charge)');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (79, seg, 20, 'go', 'Go down both sets of stairs in the Ancient Temple north of Thais.', 32356, 32170, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Find your way to Ancient Temple and go down both sets of the stairs (Mapper Coords 126.100, 125.171, 7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (79, seg, 30, 'go', 'South through the first door, west down the hall to a second door facing south, through it and south past two crossings (east at the second), then down the hole on the east.', 32371, 32242, 9, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'In words, head south through the first door, then west down the hall until you reach a second door facing south. Go south through this door, then pass the intersection, continue heading south. You''ll come to a second intersection where you''ll go east. Head south and there will be one or two Orc Warriors. Go down the hole on the east.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (79, seg, 40, 'go', 'South and then north-west to the stairs with fire underneath: go down.', 32356, 32248, 10, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'In words, south and then to the north west until you see stairs leading down with fire underneath. There are no monsters at the bottom of the stairs, so go down.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (79, seg, 50, 'go', 'Walk around the fire fields, south to a hole: two dragons are below it, on an island in the lava. Lure them to the hole and kill them, then go down.', 32361, 32265, 11, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Continue heading south until you see a hole. Beneath this hole are 2 Dragons, on an island surrounded by Lava with some Fire Fields on the island. For most people, its easier to lure the dragons to the roping point and kill them one at a time.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (79, seg, 60, 'reward', 'On the east side of the island a fire covers a small hole: destroy the fire with the destroy field rune and use the hole (you can''t go down it): 2 small rubies.', 32370, 32265, 12, null, null, '[[3030,2]]'::jsonb, 387, '[]'::jsonb, false, 'To the east side of the island you will notice a fire that is covering a hole. Use the Destroy Field rune on the fire, just leaving the hole. Use the hole, and you will get the reward. Note, you can''t go down the hole, you have to use it.');
  update public.map_quest_steps st set segment_id = seg, sort = 60 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 79 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 60) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 79 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Vampire Shield Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 80 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 80 and source <> 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (80, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (80, seg, 10, 'note', 'Bring a rope.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go down the hole there.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (80, seg, 20, 'go', 'Go down into the Edron Hero Cave.', 33164, 31636, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go to the Hero Cave, north of the city of Edron (1). You will face three Hunters at the entrance. Go down the hole there.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (80, seg, 30, 'go', 'Follow the cave down five floors: wild warriors, demon skeletons, a beholder, monks, then dragons and a hero.', 33144, 31589, 12, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the route bellow.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (80, seg, 40, 'go', 'Be ready to be swamped (wild warriors, stalkers, hunters, priestesses, monks, demon skeletons): head south to the end and then east; at the crossing (a minotaur mage) take the south path and go down the stairs.', 33192, 31658, 13, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Be prepared to be swamped with creatures. Kill them, and head south to the end and then east. At the next crossroads are some Minotaurs. Take the south path and down the stairs (7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (80, seg, 50, 'reward', 'The Temple of Xayepocax: demon skeletons, monks, heroes, priestesses, witches, a warlock and a stalker. At the back of the room, the box outside the level 70 gates: a strange symbol, a black pearl and a mysterious fetish in a bag.', 33188, 31682, 14, null, null, '[[3058,1],[3027,1],[3078,1]]'::jsonb, 2469, '[]'::jsonb, false, 'There is also a quest box outside of the level 70 door. This quest box contains the Strange Symbol, Black Pearl and Mysterious Fetish (8).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (80, seg, 60, 'note', 'Needs placing: Through the west level 70 gate of expertise, the box: a dragon lance.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Enter the level 70 gate of expertise, and retrieve your reward of a Vampire Shield and a Dragon Lance from the chests.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (80, seg, 70, 'note', 'Needs placing: Through the east level 70 gate of expertise, the box: the vampire shield.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Enter the level 70 gate of expertise, and retrieve your reward of a Vampire Shield and a Dragon Lance from the chests.');
  update public.map_quest_steps st set segment_id = seg, sort = 70 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 80 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 70) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 80 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Voodoo Doll Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 81 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 81 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 81 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (81, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (81, seg, 10, 'go', 'Go down the hole on the north side of the Green Claw Swamp (east of the Dwarf Bridge, west of Venore).', 32739, 31952, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Travel to Green Claw Swamp, and find the hole on the north side of the swamp (Mapper Coords 127.225, 124.209, 7). You can get to this hole from the west of Venore (by walking east from the Dwarf Bridge).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (81, seg, 20, 'go', 'Go west and down one more level.', 32736, 31951, 8, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Once down the hole, go directly west and down one more level.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (81, seg, 30, 'reward', 'Three witches on this floor: lure them one at a time at the corners of the entryway. In the large room to the east, against the east wall, the north box: the voodoo doll.', 32758, 31952, 9, null, null, '[[3209,1]]'::jsonb, 2473, '[]'::jsonb, false, 'On this level are 3 Witches, you will find the quest boxes in the large room to the east, against the east wall. You can easily use the corners of the entryway to lure the witches one at a time.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (81, seg, 40, 'reward', 'The south box: a magic light wand.', 32757, 31957, 9, null, null, '[[3046,1]]'::jsonb, 2473, '[]'::jsonb, false, 'You will find the quest boxes in the large room to the east, against the east wall.');
  update public.map_quest_steps st set segment_id = seg, sort = 40 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 81 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 40) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 81 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;

-- Wedding Ring Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 82 and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = 82 and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = 82 and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (82, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (82, seg, 10, 'note', 'Bring a rope.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the route bellow.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (82, seg, 20, 'go', 'Go down into the Edron Hero Cave.', 33164, 31636, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Go into the Edron Hero Cave (Mapper Coords 129.140, 123.150, 7).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (82, seg, 30, 'go', 'Follow the cave down five floors: wild warriors, demon skeletons, a beholder, monks, then dragons and a hero.', 33144, 31589, 12, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the route bellow.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (82, seg, 40, 'go', 'This floor is crowded (wild warriors, stalkers, hunters, priestesses, monks, demon skeletons): go down in the south-east.', 33152, 31619, 13, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the route bellow.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (82, seg, 50, 'go', 'Past the monks and down the next hole.', 33157, 31618, 14, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Follow the route bellow.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (82, seg, 60, 'reward', 'Three heroes here. The north box: the wedding ring.', 33158, 31621, 15, null, null, '[[3004,1]]'::jsonb, 2469, '[]'::jsonb, false, 'In screen 8 you will face 3 Heroes and a Dark Apprentice. Use the chests to get a Wedding Ring and a Dragon Necklace.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (82, seg, 70, 'reward', 'The south box: a dragon necklace.', 33158, 31622, 15, null, null, '[[3085,1]]'::jsonb, 2469, '[]'::jsonb, false, 'Use the chests to get a Wedding Ring and a Dragon Necklace.');
  update public.map_quest_steps st set segment_id = seg, sort = 70 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = 82 and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 70) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = 82 and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;
