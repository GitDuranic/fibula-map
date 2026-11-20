-- =====================================================================================
-- Tibia Map - database step 9: the old quest spots become Reward steps (slice 13i, 2026-11-21)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- Needs steps 3 and 6. Written by tools/spots-to-steps-sql.js. Each old spot (slices 10/12) becomes a draft Reward
-- step (not checked) at the end of its quest's last segment, with its object and what it gives. A quest that
-- already has steps from old spots is skipped, so running it again changes nothing.
--
-- 57 steps for 32 quests (what each spot gives, per quest):
--   Alawar's Vault Quest: copper key | copper key + blank rune + dark helmet | copper key
--   Amber's Lost Notebook Quest: short sword
--   Barbarian Axe Quest: barbarian axe + scimitar
--   Battle Axe Quest: battle axe
--   Bear Room Quest: chain armor + brass helmet + 40 gold coin
--   Black Knight Quest: crown shield | crown armor
--   Blood Herb Quest: blood herb
--   Crystal Wand Quest: crystal wand
--   Dead Archer Quest: bow + 5 poison arrow
--   Doublet Quest: doublet
--   Dragon Corpse Quest: legion helmet + copper shield
--   Dragon Tower Quest: 30 burst arrow + 60 poison arrow | bow + 2 small sapphire
--   Emperor's Cookies Quest: copper key | copper key | 7 cookie + copper key + 7 cookie
--   Katana Quest: silver key | viking helmet | katana
--   Life Ring Quest: life ring + dragon necklace
--   Longsword Quest: wooden doll + wedding ring + mirror | 3 blank rune + 3 blank rune + 3 blank rune | longsword
--   Minotaur Hell Quest: carlin sword | 4 poison arrow + arrow | fishing rod
--   Ornamented Shield Quest: book | book
--   Power Bolts Quest: talon | book
--   Power Ring Quest: power ring | bronze amulet
--   Ring Quest: time ring | sword ring
--   Scale Armor Quest: scale armor
--   Silver Brooch Quest: 3 small diamond
--   Small Ruby Quest: small ruby
--   Stealth Ring Quest: protection amulet | stealth ring
--   Studded Shield Quest: banana
--   The Outlaw Camp Quest: red gem + bright sword
--   The Paradox Tower Quest: violet gem + hat of the mad | violet gem + might ring | red spell wand + violet gem | might ring + red spell wand | might ring + hat of the mad | hat of the mad + red spell wand
--   Time Ring Quest: crystal ball | time ring | elven amulet
--   Triangle Tower Quest: garlic necklace
--   Troll Cave Quest: garlic necklace | brass legs
--   Present Quest: plate + cup + jug + legion helmet
-- Not in the database (left out): Captain Iglues Treasure Quest (1), Demon Helmet Quest (4), Fire Axe Quest (1)
-- =====================================================================================

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 2 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 2 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (2, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (2, seg, base + 10, 'reward', 'The key is key 4501.', 32172, 31602, 10, 2472, '[[2970,1]]'::jsonb, false, 'old quest spot'),
    (2, seg, base + 20, 'reward', 'The key is key 4502.', 32201, 31571, 10, 2472, '[[2970,1],[3147,1],[3384,1]]'::jsonb, false, 'old quest spot'),
    (2, seg, base + 30, 'reward', 'The key is key 4503.', 32031, 31686, 8, 2472, '[[2970,1]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 3 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 3 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (3, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (3, seg, base + 10, 'reward', null, 32173, 32196, 7, 2854, '[[3294,1]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 4 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 4 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (4, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (4, seg, base + 10, 'reward', null, 33185, 31945, 11, null, '[[3317,1],[3307,1]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 5 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 5 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (5, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (5, seg, base + 10, 'reward', null, 32305, 32254, 9, null, '[[3266,1]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 6 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 6 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (6, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (6, seg, base + 10, 'reward', null, 32147, 32098, 11, 2471, '[[3358,1],[3354,1],[3031,40]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 9 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 9 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (9, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (9, seg, base + 10, 'reward', null, 32868, 31955, 11, 3634, '[[3419,1]]'::jsonb, false, 'old quest spot'),
    (9, seg, base + 20, 'reward', null, 32880, 31955, 11, 3634, '[[3381,1]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 10 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 10 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (10, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (10, seg, base + 10, 'reward', null, 32769, 31968, 7, 3634, '[[3734,1]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 14 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 14 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (14, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (14, seg, base + 10, 'reward', null, 32481, 31611, 15, 2472, '[[3068,1]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 16 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 16 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (16, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (16, seg, base + 10, 'reward', null, 32514, 32303, 10, 4240, '[[3350,1],[3448,5]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 22 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 22 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (22, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (22, seg, base + 10, 'reward', null, 32084, 32181, 8, 408, '[[3379,1]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 24 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 24 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (24, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (24, seg, base + 10, 'reward', null, 32178, 32223, 9, 4025, '[[3374,1],[3430,1]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 25 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 25 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (25, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (25, seg, base + 10, 'reward', null, 33072, 32169, 2, 2469, '[[3449,30],[3448,60]]'::jsonb, false, 'old quest spot'),
    (25, seg, base + 20, 'reward', null, 33079, 32169, 2, 2469, '[[3350,1],[3029,2]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 30 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 30 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (30, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (30, seg, base + 10, 'reward', 'The key is key 3800.', 32605, 31908, 3, 2472, '[[2970,1]]'::jsonb, false, 'old quest spot'),
    (30, seg, base + 20, 'reward', 'The key is key 3802.', 32599, 31923, 6, 2472, '[[2970,1]]'::jsonb, false, 'old quest spot'),
    (30, seg, base + 30, 'reward', 'The key is key 3801.', 32648, 31905, 3, 2472, '[[3598,7],[2970,1],[3598,7]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 40 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 40 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (40, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (40, seg, base + 10, 'reward', 'The key is key 4603.', 32176, 32132, 9, 4240, '[[2969,1]]'::jsonb, false, 'old quest spot'),
    (40, seg, base + 20, 'reward', null, 32175, 32145, 11, 4240, '[[3367,1]]'::jsonb, false, 'old quest spot'),
    (40, seg, base + 30, 'reward', null, 32174, 32149, 11, 4240, '[[3300,1]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 43 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 43 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (43, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (43, seg, base + 10, 'reward', null, 32443, 32238, 11, 2469, '[[3052,1],[3085,1]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 44 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 44 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (44, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (44, seg, base + 10, 'reward', null, 32649, 31969, 9, 2472, '[[2989,1],[3004,1],[3463,1]]'::jsonb, false, 'old quest spot'),
    (44, seg, base + 20, 'reward', null, 32650, 31969, 9, 2472, '[[3147,3],[3147,3],[3147,3]]'::jsonb, false, 'old quest spot'),
    (44, seg, base + 30, 'reward', null, 32651, 31969, 9, 2472, '[[3285,1]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 46 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 46 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (46, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (46, seg, base + 10, 'reward', null, 32124, 32064, 12, 2473, '[[3283,1]]'::jsonb, false, 'old quest spot'),
    (46, seg, base + 20, 'reward', null, 32127, 32065, 12, 2473, '[[3448,4],[3447,1]]'::jsonb, false, 'old quest spot'),
    (46, seg, base + 30, 'reward', null, 32130, 32066, 12, 2473, '[[3483,1]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 51 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 51 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (51, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (51, seg, base + 10, 'reward', null, 32578, 32177, 15, 2435, '[[2821,1]]'::jsonb, false, 'old quest spot'),
    (51, seg, base + 20, 'reward', null, 32786, 32254, 8, 2523, '[[2821,1]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 55 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 55 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (55, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (55, seg, base + 10, 'reward', null, 32777, 32253, 8, 2472, '[[3034,1]]'::jsonb, false, 'old quest spot'),
    (55, seg, base + 20, 'reward', null, 32814, 32281, 8, 4240, '[[2821,1]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 56 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 56 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (56, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (56, seg, base + 10, 'reward', null, 32599, 31776, 9, 2473, '[[3050,1]]'::jsonb, false, 'old quest spot'),
    (56, seg, base + 20, 'reward', null, 32601, 31776, 9, 2473, '[[3056,1]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 59 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 59 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (59, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (59, seg, base + 10, 'reward', null, 33130, 31624, 15, 2469, '[[3053,1]]'::jsonb, false, 'old quest spot'),
    (59, seg, base + 20, 'reward', null, 33135, 31624, 15, 2469, '[[3091,1]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 60 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 60 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (60, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (60, seg, base + 10, 'reward', null, 32357, 32130, 9, 2472, '[[3377,1]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 63 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 63 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (63, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (63, seg, base + 10, 'reward', null, 32590, 32097, 14, 2472, '[[3028,3]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 65 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 65 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (65, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (65, seg, base + 10, 'reward', null, 32370, 32265, 12, 387, '[[3030,1]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 67 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 67 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (67, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (67, seg, base + 10, 'reward', null, 33315, 32277, 11, 1983, '[[3084,1]]'::jsonb, false, 'old quest spot'),
    (67, seg, base + 20, 'reward', null, 33315, 32282, 11, 1983, '[[3049,1]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 70 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 70 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (70, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (70, seg, base + 10, 'reward', null, 32172, 32169, 7, 3639, '[[3587,1]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 73 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 73 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (73, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (73, seg, base + 10, 'reward', null, 32620, 32198, 10, 2472, '[[3039,1],[3295,1]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 74 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 74 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (74, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (74, seg, base + 10, 'reward', null, 32481, 31902, 1, null, '[[3036,1],[3210,1]]'::jsonb, false, 'old quest spot'),
    (74, seg, base + 20, 'reward', null, 32480, 31902, 1, null, '[[3036,1],[3048,1]]'::jsonb, false, 'old quest spot'),
    (74, seg, base + 30, 'reward', null, 32479, 31902, 1, null, '[[3075,1],[3036,1]]'::jsonb, false, 'old quest spot'),
    (74, seg, base + 40, 'reward', null, 32478, 31902, 1, null, '[[3048,1],[3075,1]]'::jsonb, false, 'old quest spot'),
    (74, seg, base + 50, 'reward', null, 32477, 31902, 1, null, '[[3048,1],[3210,1]]'::jsonb, false, 'old quest spot'),
    (74, seg, base + 60, 'reward', null, 32476, 31902, 1, null, '[[3210,1],[3075,1]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 76 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 76 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (76, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (76, seg, base + 10, 'reward', null, 33038, 32171, 9, 2472, '[[3076,1]]'::jsonb, false, 'old quest spot'),
    (76, seg, base + 20, 'reward', null, 33039, 32171, 9, 2472, '[[3053,1]]'::jsonb, false, 'old quest spot'),
    (76, seg, base + 30, 'reward', null, 33040, 32171, 9, 2472, '[[3082,1]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 77 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 77 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (77, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (77, seg, base + 10, 'reward', null, 32500, 32178, 14, 2472, '[[3083,1]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 78 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 78 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (78, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (78, seg, base + 10, 'reward', null, 33143, 31719, 10, 2469, '[[3083,1]]'::jsonb, false, 'old quest spot'),
    (78, seg, base + 20, 'reward', null, 33143, 31721, 10, 2469, '[[3372,1]]'::jsonb, false, 'old quest spot');
end $$;

do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = 84 and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = 84 order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (84, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    (84, seg, base + 10, 'reward', null, 32149, 32105, 11, 2472, '[[2905,1],[2881,1],[2882,1],[3374,1]]'::jsonb, false, 'old quest spot');
end $$;
