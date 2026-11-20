-- =====================================================================================
-- Tibia Map - database step 5: a first draft of the quests' reward items (2026-11-20)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- Needs step 4. Written by tools/reward-items-sql.js from the reward texts: each part that names a game item
-- becomes an item icon (with its count); the parts that don't stay as text. A quest is only changed while its
-- reward text is still the one read and it has no reward items yet, so running it again (or after hand edits)
-- changes nothing. Check the result per quest in the map (Edit) - it's a draft.
--
-- What it does, per quest:
  -- Adorned UH Rune Quest: nothing matched ("Silver Rune Emblem (UH)")
  -- Alawar's Vault Quest: broadsword, dark helmet  | text left: Keys, etc
  -- Amber's Lost Notebook Quest: short sword
  -- Barbarian Axe Quest: barbarian axe, scimitar
  -- Battle Axe Quest: battle axe
  -- Bear Room Quest: chain armor, brass helmet, 40 gold coin
  -- Behemoth Quest: demon shield, golden armor, guardian halberd, naginata
  -- Berserker Treasure Quest: 3 white pearl, 175 gold coin
  -- Black Knight Quest: crown armor, crown shield, wedding ring
  -- Blood Herb Quest: nothing matched ("Blood Herb or Witchesbroom")
  -- Circle Room Quest: dwarven axe, war hammer  | text left: gems, etc
  -- Combat Knife Quest: combat knife
  -- Crusader Helmet Quest: crusader helmet, platinum coin  | text left: etc
  -- Crystal Wand Quest: crystal wand  | text left: Silver Rune Emblem (SD), Twinkiller Rune
  -- Dark Armor Quest: dark armor
  -- Dead Archer Quest: bow, poison arrow  | text left: Mana/Health Fluid
  -- Deeper Fibula Quest: knight axe, warrior helmet, tower shield, dwarven ring, elven amulet
  -- Demon Legs Quest: demon legs
  -- Demona Ring Quest: energy ring, stealth ring
  -- Devil Helmet Quest: devil helmet, halberd, small sapphire
  -- Double Hero Quest: club ring, red gem
  -- Doublet Quest: doublet
  -- Draconia Quest: ice rapier, serpent sword, stone skin amulet
  -- Dragon Corpse Quest: copper shield, legion helmet
  -- Dragon Tower Quest: bow  | text left: Burst/Poison Arrows, Fluids
  -- Drefia Quest: medusa shield, skull staff, blue robe  | text left: SDs
  -- Edron Dragon Lair Quest: fire axe, ring of healing, dragon necklace
  -- Edron Goblin Quest: steel shield, silver amulet
  -- Elvenbane Quest: morning star, dwarven shield  | text left: Strong Mana Fluid, etc
  -- Emperor's Cookies Quest: cookie  | text left: Keys
  -- Explorer Brooch Quest: explorer brooch
  -- Fanfare Quest: fanfare
  -- Geomancer Quest: small sapphire, small diamond, dwarven ring
  -- Ghoul Room Quest: garlic necklace, club ring
  -- Giant Smithhammer Quest: talon, giant smithhammer, 100 gold coin
  -- Griffin Shield Quest: griffin shield, dwarven axe, obsidian lance
  -- Heaven Blossom Quest: heaven blossom
  -- Iron Hammer Quest: iron hammer
  -- Iron Helmet Quest: iron helmet, leather armor  | text left: SD Rune, etc
  -- Katana Quest: katana, viking helmet
  -- Kingdom of Kormarak Quest: brass armor, brass helmet, hatchet, throwing star
  -- Legion Helmet Quest: legion helmet
  -- Life Ring Quest: life ring, dragon necklace
  -- Longsword Quest: longsword, mirror, blank rune  | text left: etc
  -- Mad Mage Room Quest: hat of the mad, stone skin amulet, star amulet
  -- Minotaur Hell Quest: carlin sword, fishing rod
  -- Mintwallin Cyclops Quest: small diamond, hatchet  | text left: Health Fluids, Chain Set
  -- Noble Armor Quest: noble armor, crown helmet
  -- Orc Fortress Quest: knight armor, knight axe, fire sword
  -- Orc Shaman Quest: magic light wand, axe ring, blank rune
  -- Ornamented Shield Quest: ornamented shield, spike sword  | text left: Keys, Rings, etc
  -- Panpipe Quest: panpipes, power ring  | text left: gems
  -- Plate Armor Quest: plate armor
  -- Poison Daggers Quest: 2 poison dagger, 30 poison arrow
  -- Power Bolts Quest: power bolt, burst arrow  | text left: Two Handed Sword, etc
  -- Power Ring Quest: power ring, bronze amulet
  -- Purple Tome Quest: purple tome, map
  -- Rapier Quest: rapier
  -- Ring Quest: time ring, sword ring
  -- Scale Armor Quest: scale armor
  -- Shaman Treasure Quest: 3 blank rune
  -- Silver Amulet Quest: silver amulet
  -- Silver Brooch Quest: silver brooch  | text left: gems
  -- Skull of Ratha Quest: white pearl, 2 black pearl, wolf tooth chain, dwarven ring, 100 gold coin, crystal necklace  | text left: Skull of Ratha
  -- Small Ruby Quest: small ruby
  -- Spike Sword Quest: spike sword
  -- Stealth Ring Quest: stealth ring, protection amulet
  -- Steel Helmet Quest: steel helmet, gold coin, book
  -- Studded Legs Quest: studded legs
  -- Studded Shield Quest: studded shield
  -- Thais Lighthouse Quest: dark shield, battle hammer
  -- The Desert Dungeon Quest: nothing matched ("10k Quest Items (Ring of Healing, Ankh etc)")
  -- The Outlaw Camp Quest: bright sword, red gem
  -- The Paradox Tower Quest: nothing matched ("Choice of two of these rewards:")
  -- Throwing Star Quest: 10 throwing star
  -- Time Ring Quest: time ring, elven amulet, crystal ball
  -- Triangle Tower Quest: garlic necklace, dwarven ring  | text left: Sapphires
  -- Troll Cave Quest: brass legs, garlic necklace
  -- Two Rubies Quest: 2 small ruby
  -- Vampire Shield Quest: vampire shield, dragon lance, strange symbol
  -- Voodoo Doll Quest: magic light wand  | text left: Voodoo Doll (King)
  -- Wedding Ring Quest: wedding ring, dragon necklace
  -- Naginata Thais Dragon Lair Quest: naginata, 10 small ruby, dragon necklace
-- =====================================================================================

update public.map_quests set reward_items = '[[3301,1],[3384,1]]'::jsonb, rewards = 'Keys, etc'
  where id = 2 and rewards = 'Keys, Broadsword, Dark Helmet, etc.' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3294,1]]'::jsonb, rewards = null
  where id = 3 and rewards = 'Short Sword' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3317,1],[3307,1]]'::jsonb, rewards = null
  where id = 4 and rewards = 'Barbarian Axe, Scimitar' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3266,1]]'::jsonb, rewards = null
  where id = 5 and rewards = 'Battle Axe' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3358,1],[3354,1],[3031,40]]'::jsonb, rewards = null
  where id = 6 and rewards = 'Chain Armor, Brass Helmet, 40 gp' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3420,1],[3360,1],[3315,1],[3314,1]]'::jsonb, rewards = null
  where id = 7 and rewards = 'Demon Shield, Golden Armor, Guardian Halberd, Naginata' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3026,3],[3031,175]]'::jsonb, rewards = null
  where id = 8 and rewards = '3 White Pearls and 175 gp' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3381,1],[3419,1],[3004,1]]'::jsonb, rewards = null
  where id = 9 and rewards = 'Crown Armor, Crown Shield, Wedding Ring' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3323,1],[3279,1]]'::jsonb, rewards = 'gems, etc'
  where id = 11 and rewards = 'Dwarven Axe, War Hammer, gems, etc.' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3292,1]]'::jsonb, rewards = null
  where id = 12 and rewards = 'Combat Knife' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3391,1],[3035,1]]'::jsonb, rewards = 'etc'
  where id = 13 and rewards = 'Crusader Helmet, platinum coins, etc.' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3068,1]]'::jsonb, rewards = 'Silver Rune Emblem (SD), Twinkiller Rune'
  where id = 14 and rewards = 'Crystal Wand, Silver Rune Emblem (SD), Twinkiller Rune' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3383,1]]'::jsonb, rewards = null
  where id = 15 and rewards = 'Dark Armor' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3350,1],[3448,1]]'::jsonb, rewards = 'Mana/Health Fluid'
  where id = 16 and rewards = 'Bow, Poison Arrow, Mana/Health Fluid' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3318,1],[3369,1],[3428,1],[3097,1],[3082,1]]'::jsonb, rewards = null
  where id = 17 and rewards = 'Knight Axe, Warrior Helmet, Tower Shield, Dwarven Ring, Elven Amulet.' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3389,1]]'::jsonb, rewards = null
  where id = 18 and rewards = 'Demon Legs' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3051,1],[3049,1]]'::jsonb, rewards = null
  where id = 19 and rewards = 'Energy Ring, Stealth Ring' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3356,1],[3269,1],[3029,1]]'::jsonb, rewards = null
  where id = 20 and rewards = 'Devil Helmet, Halberd, Small Sapphire' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3093,1],[3039,1]]'::jsonb, rewards = null
  where id = 21 and rewards = 'Club Ring, Red Gem' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3379,1]]'::jsonb, rewards = null
  where id = 22 and rewards = 'Doublet' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3284,1],[3297,1],[3081,1]]'::jsonb, rewards = null
  where id = 23 and rewards = 'Ice Rapier, Serpent Sword, Stone Skin Amulet' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3430,1],[3374,1]]'::jsonb, rewards = null
  where id = 24 and rewards = 'Copper Shield, Legion Helmet' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3350,1]]'::jsonb, rewards = 'Burst/Poison Arrows, Fluids'
  where id = 25 and rewards = 'Burst/Poison Arrows, Bow, Fluids' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3436,1],[3324,1],[3567,1]]'::jsonb, rewards = 'SDs'
  where id = 26 and rewards = 'Medusa Shield, Skull Staff, Blue Robe, SDs' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3320,1],[3098,1],[3085,1]]'::jsonb, rewards = null
  where id = 27 and rewards = 'Fire Axe, Ring of Healing, Dragon Necklace' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3409,1],[3054,1]]'::jsonb, rewards = null
  where id = 28 and rewards = 'Steel Shield, Silver Amulet' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3282,1],[3425,1]]'::jsonb, rewards = 'Strong Mana Fluid, etc'
  where id = 29 and rewards = 'Morning Star, Dwarven Shield, Strong Mana Fluid, etc.' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3598,1]]'::jsonb, rewards = 'Keys'
  where id = 30 and rewards = 'Keys, Cookies' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[4871,1]]'::jsonb, rewards = null
  where id = 31 and rewards = 'Explorer Brooch' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[2955,1]]'::jsonb, rewards = null
  where id = 32 and rewards = 'Fanfare' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3029,1],[3028,1],[3097,1]]'::jsonb, rewards = null
  where id = 33 and rewards = 'Small Sapphire, Small Diamond, Dwarven Ring' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3083,1],[3093,1]]'::jsonb, rewards = null
  where id = 34 and rewards = 'Garlic Necklace, Club Ring' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3034,1],[3208,1],[3031,100]]'::jsonb, rewards = null
  where id = 35 and rewards = 'Talon, Giant Smithhammer, 100 gp' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3433,1],[3323,1],[3313,1]]'::jsonb, rewards = null
  where id = 36 and rewards = 'Griffin Shield, Dwarven Axe, Obsidian Lance' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3657,1]]'::jsonb, rewards = null
  where id = 37 and rewards = 'Heaven Blossom' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3310,1]]'::jsonb, rewards = null
  where id = 38 and rewards = 'Iron Hammer' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3353,1],[3361,1]]'::jsonb, rewards = 'SD Rune, etc'
  where id = 39 and rewards = 'Iron Helmet, SD Rune, Leather Armor, etc.' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3300,1],[3367,1]]'::jsonb, rewards = null
  where id = 40 and rewards = 'Katana, Viking Helmet' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3359,1],[3354,1],[3276,1],[3287,1]]'::jsonb, rewards = null
  where id = 41 and rewards = 'Brass Armor, Brass Helmet, Hatchet, Throwing Stars' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3374,1]]'::jsonb, rewards = null
  where id = 42 and rewards = 'Legion Helmet' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3052,1],[3085,1]]'::jsonb, rewards = null
  where id = 43 and rewards = 'Life Ring, Dragon Necklace' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3285,1],[3463,1],[3147,1]]'::jsonb, rewards = 'etc'
  where id = 44 and rewards = 'Longsword, Mirror, Blank Runes, etc.' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3210,1],[3081,1],[3014,1]]'::jsonb, rewards = null
  where id = 45 and rewards = 'Hat of the Mad, Stone Skin Amulet, Star Amulet' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3283,1],[3483,1]]'::jsonb, rewards = null
  where id = 46 and rewards = 'Carlin Sword, Fishing Rod' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3028,1],[3276,1]]'::jsonb, rewards = 'Health Fluids, Chain Set'
  where id = 47 and rewards = 'Small Diamond, Health Fluids, Hatchet, Chain Set' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3380,1],[3385,1]]'::jsonb, rewards = null
  where id = 48 and rewards = 'Noble Armor and Crown Helmet' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3370,1],[3318,1],[3280,1]]'::jsonb, rewards = null
  where id = 49 and rewards = 'Knight Armor, Knight Axe, Fire Sword' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3046,1],[3092,1],[3147,1]]'::jsonb, rewards = null
  where id = 50 and rewards = 'Magic Light Wand, Axe Ring and Blank Rune' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3424,1],[3271,1]]'::jsonb, rewards = 'Keys, Rings, etc'
  where id = 51 and rewards = 'Ornamented Shield, Spike Sword, Keys, Rings, etc.' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[2953,1],[3050,1]]'::jsonb, rewards = 'gems'
  where id = 52 and rewards = 'Panpipes, gems, Power Ring' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3357,1]]'::jsonb, rewards = null
  where id = 53 and rewards = 'Plate Armor' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3299,2],[3448,30]]'::jsonb, rewards = null
  where id = 54 and rewards = '2 Poison Daggers, 30 Poison Arrows' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3450,1],[3449,1]]'::jsonb, rewards = 'Two Handed Sword, etc'
  where id = 55 and rewards = 'Power Bolts, Burst Arrows, Two Handed Sword, etc.' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3050,1],[3056,1]]'::jsonb, rewards = null
  where id = 56 and rewards = 'Power Ring and a Bronze Amulet' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[2848,1],[2822,1]]'::jsonb, rewards = null
  where id = 57 and rewards = 'Purple Tome, Maps' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3272,1]]'::jsonb, rewards = null
  where id = 58 and rewards = 'Rapier' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3053,1],[3091,1]]'::jsonb, rewards = null
  where id = 59 and rewards = 'Time Ring, Sword Ring' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3377,1]]'::jsonb, rewards = null
  where id = 60 and rewards = 'Scale Armor' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3147,3]]'::jsonb, rewards = null
  where id = 61 and rewards = '3 Blank Runes' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3054,1]]'::jsonb, rewards = null
  where id = 62 and rewards = 'Silver Amulet' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3017,1]]'::jsonb, rewards = 'gems'
  where id = 63 and rewards = 'Silver Brooch, gems' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3026,1],[3027,2],[3012,1],[3097,1],[3031,100],[3008,1]]'::jsonb, rewards = 'Skull of Ratha'
  where id = 64 and rewards = 'White Pearl, 2 Black Pearls, Skull of Ratha, Wolf Tooth Chain, Dwarven Ring, 100 gp, Crystal Necklace' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3030,1]]'::jsonb, rewards = null
  where id = 65 and rewards = '1 Small Ruby' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3271,1]]'::jsonb, rewards = null
  where id = 66 and rewards = 'Spike Sword' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3049,1],[3084,1]]'::jsonb, rewards = null
  where id = 67 and rewards = 'Stealth Ring, Protection Amulet' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3351,1],[3031,1],[2816,1]]'::jsonb, rewards = null
  where id = 68 and rewards = 'Steel Helmet, gold, Book' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3362,1]]'::jsonb, rewards = null
  where id = 69 and rewards = 'Studded Legs' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3426,1]]'::jsonb, rewards = null
  where id = 70 and rewards = 'Studded Shield' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3421,1],[3305,1]]'::jsonb, rewards = null
  where id = 71 and rewards = 'Dark Shield and Battle Hammer' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3295,1],[3039,1]]'::jsonb, rewards = null
  where id = 73 and rewards = 'Bright Sword, Red Gem' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3287,10]]'::jsonb, rewards = null
  where id = 75 and rewards = '10 Throwing Stars' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3053,1],[3082,1],[3076,1]]'::jsonb, rewards = null
  where id = 76 and rewards = 'Time Ring, Elven Amulet, Crystal Ball' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3083,1],[3097,1]]'::jsonb, rewards = 'Sapphires'
  where id = 77 and rewards = 'Garlic Necklace, Dwarven Ring, Sapphires' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3372,1],[3083,1]]'::jsonb, rewards = null
  where id = 78 and rewards = 'Brass Legs, Garlic Necklace' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3030,2]]'::jsonb, rewards = null
  where id = 79 and rewards = 'Two Small Rubies' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3434,1],[3302,1],[3058,1]]'::jsonb, rewards = null
  where id = 80 and rewards = 'Vampire Shield, Dragon Lance, Strange Symbol' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3046,1]]'::jsonb, rewards = 'Voodoo Doll (King)'
  where id = 81 and rewards = 'Voodoo Doll (King), Magic Light Wand' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3004,1],[3085,1]]'::jsonb, rewards = null
  where id = 82 and rewards = 'Wedding Ring, Dragon Necklace' and reward_items = '[]'::jsonb;
update public.map_quests set reward_items = '[[3314,1],[3030,10],[3085,1]]'::jsonb, rewards = null
  where id = 83 and rewards = 'Naginata, 10 small rubies, Dragon Necklace' and reward_items = '[]'::jsonb;
