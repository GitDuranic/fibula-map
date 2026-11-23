-- =====================================================================================
-- Tibia Map - database step 22: the 7.2 quests (2026-11-23, slice 15b)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- Safe to run again: versions are just set again, quests are only added when no quest has that name.
--
-- What it does (TibiaWiki's "implemented" versions, checked 2026-11-23):
--   1. The quests already in the list that came in 7.2 or 7.24 get that "came in" version, so the 7.1 map hides them.
--   2. The 7.2 / 7.24 quests that weren't in the list are added (wiki level, area and reward; not checked yet).
--      Their guides come later as drafts (like the earlier wiki draft batches).
-- =====================================================================================

-- 1. Came in 7.2 / 7.24
update public.map_quests set wiki_version = '7.2'  where name = 'Behemoth Quest';
update public.map_quests set wiki_version = '7.24' where name in ('Giant Smithhammer Quest', 'Mad Mage Room Quest', 'Skull of Ratha Quest', 'Voodoo Doll Quest');

-- 2. The missing ones, at the end of the list
insert into public.map_quests (name, sort, level, area, rewards, wiki_version, wiki_reward)
select v.name, v.sort, v.level, v.area, v.rewards, v.wiki_version, v.wiki_reward
from (values
  ('Parchment Room Quest', 850, null::integer, 'Edron', null::text, '7.2', null::text),
  ('The Queen of the Banshees Quest', 860, 60, 'Isle of the Kings, Ghostlands',
    'Boots of Haste, Giant Sword, Tower Shield, Stealth Ring, Stone Skin Amulet, 100 Platinum Coins', '7.2',
    'Boots of Haste, Giant Sword, Tower Shield, Stealth Ring, Stone Skin Amulet and 100 Platinum Coins (10K)'),
  ('The Annihilator Quest', 870, 100, 'Edron',
    'Magic Sword, Demon Armor, Stonecutter Axe or a Present', '7.24',
    'One of four: Magic Sword, Demon Armor, Stonecutter Axe, a Present Box (later also the Demon Outfits and an achievement)'),
  ('The Postman Missions Quest', 880, null, 'Thais (Kevin), all over Tibia',
    'Cheaper parcels, letters and boat fares, Post Officer''s Hat', '7.24',
    'Cheaper parcels (10 gp), letters (5 gp), boat fares (10 gp cheaper), locked mailboxes, Post Officer''s Hat, Post Horn'),
  ('The White Raven Monastery Quest', 890, null, 'Carlin, Ghostlands, Isle of the Kings',
    'Blessed Ankh, Family Brooch, access to the Isle of the Kings', '7.24',
    'Blessed Ankh, Family Brooch, access to the Isle of the Kings')
) as v(name, sort, level, area, rewards, wiki_version, wiki_reward)
where not exists (select 1 from public.map_quests q where q.name = v.name);

-- Check: every 7.2x quest with its version.
select id, name, sort, level, area, wiki_version from public.map_quests where wiki_version like '7.2%' order by sort;
