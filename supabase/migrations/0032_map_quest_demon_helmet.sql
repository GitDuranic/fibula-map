-- =====================================================================================
-- Tibia Map - database step 32: AI drafts of quest guides from the TibiaWiki walkthroughs (slice 13j)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- Needs steps 3, 6, 7 and 9 and 16 (Key steps). Written by tools/drafts-to-sql.js from tools/data/quest-drafts. Every step is a draft
-- (not checked) with its wiki sentence as its source; what the checker couldn't tie to a real NPC, word, monster,
-- item or spot is a Note "Needs placing: ...". The quest's Reward steps from the old spots are moved into the draft.
-- Earlier drafts of these quests are replaced; a quest with anything made, changed or ticked in the app is skipped.
--
-- 14 steps for 1 quests (0 need placing):
--   Demon Helmet Quest: 1 part, 14 steps + 0 Reward steps (NEW QUEST: added first)
--       can't walk 33190,31629,13 -> 33211,31614,13 (Through the Gate of the Lost Souls: kill the fire elementals.): No route found: these two places are not connected.
--       can't walk 33321,31592,15 -> 33313,31592,15 (The three chests on the west side: Demon Helmet, Demon Shield and Steel Boots. Then leave through the portal; demons may have respawned on the way out.): No route found: these two places are not connected.
-- =====================================================================================

-- Demon Helmet Quest
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer; qid bigint;
begin
  select id into qid from public.map_quests where name = 'Demon Helmet Quest';
  if qid is null then
    insert into public.map_quests (name, sort, level, area, rewards, wiki_version, wiki_reward, reward_items)
    values ('Demon Helmet Quest', 900, 100, 'Edron', 'Demon Helmet, Demon Shield, Steel Boots', '7.2', 'Demon Helmet, Demon Shield and Steel Boots (later also the Demon Outfits'' first addon)', '[[3387,1],[3420,1],[3554,1]]'::jsonb)
    returning id into qid;
  end if;
  if exists (select 1 from public.map_quest_steps where quest_id = qid and (source is null or updated_by is not null or checked)) then return; end if;
  delete from public.map_quest_steps where quest_id = qid and source <> 'old quest spot';
  delete from public.map_quest_steps where quest_id = qid and source = 'old quest spot';
  insert into public.map_quest_segments (quest_id, sort, name) values (qid, 10, null) returning id into seg;
  new_segs := new_segs || seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (qid, seg, 10, 'note', 'Level 100. Bring a team for at least 9 demons (5 on the way, 4 in the quest room, maybe a respawn on the way back), lots of banshees and fire elementals. Even solo you need two more players to stand on the switches. You need the golden key 6010 from the Parchment Room Quest.', null, null, null, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'You will need a team capable of facing a total of at least 9 demons (5 on the way, 4 in the quest room, and a possible respawn on the way back) and a large number of banshees. ... you will still need two other players, namely to stand on the switches. You will need a golden Key 6010 ... obtainable through the Parchment Room Quest.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (qid, seg, 20, 'go', 'Enter the Edron Hero Cave.', 33164, 31638, 7, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Enter the Edron Hero Cave (Mapper Coords 129.140, 123.150, 7)');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (qid, seg, 30, 'go', 'Head down through the Hero Cave to the level 100 gate of expertise, near the single demon.', 33211, 31639, 13, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'head down until you get to the level 100 gate of expertise near the single demon spawn');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (qid, seg, 40, 'key', 'Open the door behind the gate of expertise with the golden key 6010.', 33211, 31634, 13, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'You will need a golden Key 6010 to open the door after the gate of expertise.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (qid, seg, 50, 'go', 'Two players stand on the two switches to the west. That opens the Gate of the Lost Souls.', 33190, 31629, 13, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Have two players stand on the switches (Mapper Coords 129.167, 123.141, 13) to get past the Gate of the Lost Souls (129.187, 123.142, 13).');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (qid, seg, 60, 'kill', 'Through the Gate of the Lost Souls: kill the fire elementals.', 33211, 31614, 13, null, 'Fire Elemental', '[]'::jsonb, null, '[]'::jsonb, false, 'Once you kill all the Fire Elementals, head down the passage');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (qid, seg, 70, 'go', 'Follow the passage (only one way; lots of fire on the floor) to the portal.', 33278, 31592, 11, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'head down the passage until you come to a portal (there''s only one way to go). Note that there is a lot of fire on the way there');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (qid, seg, 80, 'kill', 'Behind the portal: kill the demon.', 33284, 31592, 12, null, 'Demon', '[]'::jsonb, null, '[]'::jsonb, false, 'When you get to the portal, go through it. There will be one demon here. Kill the demon');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (qid, seg, 90, 'go', 'Go through the hole: it drops you two floors down.', 33293, 31592, 12, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'and head through the hole here. This will bring you down 2 floors to the cave where the portal into the quest room is.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (qid, seg, 100, 'kill', 'Head east and kill everything: 2 demons where you land, then one demon in each room, plus fire elementals.', 33298, 31592, 14, null, 'Demon', '[]'::jsonb, null, '[]'::jsonb, false, 'There are 4 demons and a couple Fire Elementals here, but they don''t all come at once (There''ll be 2 demons where you enter and if you head east there''s one demon in each room). Head east and kill all the creatures.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (qid, seg, 110, 'go', 'The portal at the east end takes you to the quest room right below.', 33324, 31592, 14, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Here you will see a portal that brings you to the quest room. The portal will bring you to a room right below you');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (qid, seg, 120, 'go', 'Pull the lever on the east side first: it opens the portal out, in case someone has to flee.', 33330, 31591, 15, null, null, '[]'::jsonb, null, '[]'::jsonb, false, 'Note that there is a switch (#2) on the east side of the room that must be pulled to activate the portal to get out. It is recommended that you do this before you kill anything');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (qid, seg, 130, 'kill', 'Kill the 4 demons and the banshees in the quest room.', 33321, 31592, 15, null, 'Demon', '[]'::jsonb, null, '[]'::jsonb, false, 'The portal will bring you to a room right below you with 4 demons and a lot of banshees.');
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (qid, seg, 140, 'reward', 'The three chests on the west side: Demon Helmet, Demon Shield and Steel Boots. Then leave through the portal; demons may have respawned on the way out.', 33313, 31592, 15, null, null, '[[3387,1],[3420,1],[3554,1]]'::jsonb, 2472, '[]'::jsonb, false, 'The boxes containing the rewards are on the west side of the room (#1). Once you have killed the creatures and got your reward, go out through the portal. Be careful of demons that may have respawned on the way out.');
  update public.map_quest_steps st set segment_id = seg, sort = 140 + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = qid and source = 'old quest spot') r where st.id = r.id;
  select coalesce(max(sort), 140) into sort_now from public.map_quest_steps where segment_id = seg;
  delete from public.map_quest_segments s where s.quest_id = qid and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;
