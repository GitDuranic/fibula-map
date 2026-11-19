-- =====================================================================================
-- Tibia Map - database step 1: quests (slice 13b)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- It is safe to run again: tables use "if not exists", and quests already in the table are left alone.
-- Written by tools/quests-sql.js from tools/data/fibula-quests.json (84 quests, 71 matched on TibiaWiki).
--
-- What it creates:
--   map_quests          the quests of the map's quest guides: name, level, area, rewards, notes, status
--   map_quest_history   every change to a quest (the row as it was before), so a bad edit can be undone
-- Everyone may read the quests. Nobody may change them yet: editing (two Discord accounts) is step 2.
-- =====================================================================================


-- -------------------------------------------------------------------------------------
-- 1. QUESTS
-- -------------------------------------------------------------------------------------
create table if not exists public.map_quests (
  id           bigint generated always as identity primary key,
  name         text not null unique,
  sort         integer not null default 0,               -- order in the list (gaps of 10 to slot quests in)
  level        integer,                                  -- level needed, null = none
  area         text,                                     -- e.g. Edron, Rookgaard
  rewards      text,                                     -- edited by hand (7.2 changes some)
  notes        text,
  status       text not null default 'not checked' check (status in ('not checked', 'checked')),
  fibula_mark  boolean not null default false,           -- the ✅ on the user's Project Fibula list
  wiki_version text,                                     -- TibiaWiki: implemented in
  wiki_reward  text,                                     -- TibiaWiki: reward (for reference)
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users (id) on delete set null
);

alter table public.map_quests enable row level security;

drop policy if exists "map quests: anyone reads" on public.map_quests;
create policy "map quests: anyone reads" on public.map_quests for select to anon, authenticated using (true);


-- -------------------------------------------------------------------------------------
-- 2. HISTORY
-- Every update or delete keeps the old row; every insert keeps the new one. Filled by a trigger, so nothing
-- can change a quest without leaving a trace.
-- -------------------------------------------------------------------------------------
create table if not exists public.map_quest_history (
  id          bigint generated always as identity primary key,
  quest_id    bigint not null,
  op          text not null,                             -- INSERT, UPDATE or DELETE
  row_data    jsonb not null,                            -- the quest before the change (after, for INSERT)
  changed_at  timestamptz not null default now(),
  changed_by  uuid default auth.uid()
);
create index if not exists map_quest_history_quest on public.map_quest_history (quest_id, changed_at desc);

alter table public.map_quest_history enable row level security;
-- No policies yet: only the dashboard (and later the editors) can see it.

create or replace function public.map_quests_log()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.map_quest_history (quest_id, op, row_data) values (new.id, tg_op, to_jsonb(new));
    return new;
  end if;
  insert into public.map_quest_history (quest_id, op, row_data) values (old.id, tg_op, to_jsonb(old));
  if tg_op = 'UPDATE' then
    new.updated_at := now();
    new.updated_by := auth.uid();
    return new;
  end if;
  return old;
end;
$$;

drop trigger if exists map_quests_log on public.map_quests;
create trigger map_quests_log
  before insert or update or delete on public.map_quests
  for each row execute function public.map_quests_log();


-- -------------------------------------------------------------------------------------
-- 3. THE QUESTS (the user's Project Fibula list)
-- -------------------------------------------------------------------------------------
insert into public.map_quests (name, sort, level, area, rewards, fibula_mark, wiki_version, wiki_reward) values
  ('Adorned UH Rune Quest', 10, null, 'Edron', 'Silver Rune Emblem (UH)', false, '6.4', 'Silver Rune Emblem (Ultimate Healing).'),
  ('Alawar''s Vault Quest', 20, null, 'Folda', 'Keys, Broadsword, Dark Helmet, etc.', true, '6.5', '3 White Pearls, Broadsword, Dark Helmet, 4 Throwing Knives, Blank Rune, 33gp, Key 4501, Key 4502, Key 4503.'),
  ('Amber''s Lost Notebook Quest', 30, null, 'Rookgaard', 'Short Sword', true, null, null),
  ('Barbarian Axe Quest', 40, null, 'Edron', 'Barbarian Axe, Scimitar', true, '6.4', 'Barbarian Axe, Scimitar'),
  ('Battle Axe Quest', 50, null, 'Thais', 'Battle Axe', true, null, 'Battle Axe'),
  ('Bear Room Quest', 60, null, 'Rookgaard', 'Chain Armor, Brass Helmet, 40 gp', true, '5.2', 'Chain Armor, Brass Helmet, 12 Arrows and 40 gp'),
  ('Behemoth Quest', 70, 80, 'Edron', 'Demon Shield, Golden Armor, Guardian Halberd, Naginata', false, null, null),
  ('Berserker Treasure Quest', 80, null, 'Edron', '3 White Pearls and 175 gp', true, '6.4', '3 White Pearls and 175 gp.'),
  ('Black Knight Quest', 90, 50, 'Venore', 'Crown Armor, Crown Shield, Wedding Ring', true, '7.1', 'Crown Armor, Crown Shield'),
  ('Blood Herb Quest', 100, null, 'Venore', 'Blood Herb or Witchesbroom', true, '6.1', 'Blood Herb or Witchesbroom'),
  ('Circle Room Quest', 110, 32, 'Kazordoon', 'Dwarven Axe, War Hammer, gems, etc.', true, null, 'Dwarven Axe, War Hammer'),
  ('Combat Knife Quest', 120, null, 'Rookgaard', 'Combat Knife', true, '5.2', 'Combat Knife'),
  ('Crusader Helmet Quest', 130, 35, 'Kazordoon', 'Crusader Helmet, platinum coins, etc.', true, null, 'Crusader Helmet'),
  ('Crystal Wand Quest', 140, 60, 'Demona', 'Crystal Wand, Silver Rune Emblem (SD), Twinkiller Rune', false, null, 'Crystal Wand, Silver Rune Emblem (SD), Twinkiller Rune (Book)'),
  ('Dark Armor Quest', 150, null, 'Edron', 'Dark Armor', true, '6.4', 'Dark Armor'),
  ('Dead Archer Quest', 160, null, 'Thais', 'Bow, Poison Arrow, Mana/Health Fluid', true, null, 'Bow, 5 Poison Arrow, Mana Potion, Health Potion'),
  ('Deeper Fibula Quest', 170, 50, 'Fibula', 'Knight Axe, Warrior Helmet, Tower Shield, Dwarven Ring, Elven Amulet.', true, '5.0', 'Knight Axe, Warrior Helmet, Elven Amulet, Tower Shield, Dwarven Ring'),
  ('Demon Legs Quest', 180, 100, 'Edron', 'Demon Legs', true, null, null),
  ('Demona Ring Quest', 190, 60, 'Demona', 'Energy Ring, Stealth Ring', false, null, 'Energy Ring, Stealth Ring.'),
  ('Devil Helmet Quest', 200, 30, 'Thais', 'Devil Helmet, Halberd, Small Sapphire', false, '5.01', 'Devil Helmet, Halberd, 4 Small Sapphire'),
  ('Double Hero Quest', 210, null, 'Edron', 'Club Ring, Red Gem', true, '6.4', 'Club Ring, Red Gem'),
  ('Doublet Quest', 220, null, 'Rookgaard', 'Doublet', true, null, 'Doublet'),
  ('Draconia Quest', 230, 25, 'Draconia', 'Ice Rapier, Serpent Sword, Stone Skin Amulet', true, '6.2', 'Ice Rapier, Serpent Sword, Stone Skin Amulet and Energy Ring.'),
  ('Dragon Corpse Quest', 240, null, 'Rookgaard', 'Copper Shield, Legion Helmet', true, '5.2', 'Bag containing Copper Shield and Legion Helmet.'),
  ('Dragon Tower Quest', 250, null, 'Venore', 'Burst/Poison Arrows, Bow, Fluids', false, '7.1', '2 Small Sapphires, 30 Burst Arrows, 60 Poison Arrows, Bow, 1 Health Potion, 1 Mana Potion'),
  ('Drefia Quest', 260, 60, 'Darashia', 'Medusa Shield, Skull Staff, Blue Robe, SDs', false, null, null),
  ('Edron Dragon Lair Quest', 270, 60, 'Edron', 'Fire Axe, Ring of Healing, Dragon Necklace', false, null, null),
  ('Edron Goblin Quest', 280, null, 'Edron', 'Steel Shield, Silver Amulet', true, '6.4', 'Steel Shield, Silver Amulet'),
  ('Elvenbane Quest', 290, null, 'Ab''Dendriel', 'Morning Star, Dwarven Shield, Strong Mana Fluid, etc.', true, null, 'Morning Star, Dwarven Shield, Strong Mana Potion, Blank Rune, Spellbook, 2 Small Diamonds and 100 gp.'),
  ('Emperor''s Cookies Quest', 300, null, 'Kazordoon', 'Keys, Cookies', true, '6.1', 'Key 3800, a bag with 20+7 cookies & Key 3801 and Key 3802'),
  ('Explorer Brooch Quest', 310, null, 'Kazordoon', 'Explorer Brooch', false, '6.1', 'Explorer Brooch'),
  ('Fanfare Quest', 320, null, 'Carlin', 'Fanfare', false, null, 'Fanfare'),
  ('Geomancer Quest', 330, null, 'Thais', 'Small Sapphire, Small Diamond, Dwarven Ring', false, null, 'Small Sapphire, Small Diamond, Dwarven Ring'),
  ('Ghoul Room Quest', 340, null, 'Thais', 'Garlic Necklace, Club Ring', true, '5.01', 'Garlic Necklace, Club Ring'),
  ('Giant Smithhammer Quest', 350, null, 'Plains of Havoc', 'Talon, Giant Smithhammer, 100 gp', true, null, null),
  ('Griffin Shield Quest', 360, 30, 'Demona', 'Griffin Shield, Dwarven Axe, Obsidian Lance', false, null, 'Griffin Shield, Dwarven Axe, Obsidian Lance'),
  ('Heaven Blossom Quest', 370, null, 'Venore', 'Heaven Blossom', false, null, 'Heaven Blossom'),
  ('Iron Hammer Quest', 380, null, 'Kazordoon', 'Iron Hammer', false, '6.61-6.97', 'Iron Hammer'),
  ('Iron Helmet Quest', 390, null, 'Plains of Havoc', 'Iron Helmet, SD Rune, Leather Armor, etc.', true, null, 'Iron Helmet, Sudden Death Rune, Leather Armor, Porgol''s Strange Behaviour (Book), Worn Leather Boots, Longsword'),
  ('Katana Quest', 400, null, 'Rookgaard', 'Katana, Viking Helmet', true, '5.2', 'Katana, Viking Helmet, Key 4603'),
  ('Kingdom of Kormarak Quest', 410, null, 'Thais', 'Brass Armor, Brass Helmet, Hatchet, Throwing Stars', false, null, 'Brass Armor, Brass Helmet, Hatchet and 13 Throwing Stars.'),
  ('Legion Helmet Quest', 420, null, 'Rookgaard', 'Legion Helmet', true, null, null),
  ('Life Ring Quest', 430, null, 'Thais', 'Life Ring, Dragon Necklace', true, null, 'Life Ring, Dragon Necklace'),
  ('Longsword Quest', 440, null, 'Kazordoon', 'Longsword, Mirror, Blank Runes, etc.', true, null, 'Longsword, Mirror, 3 Blank Runes, Wooden Doll, Wedding Ring, 76 gp'),
  ('Mad Mage Room Quest', 450, 40, 'Thais', 'Hat of the Mad, Stone Skin Amulet, Star Amulet', true, null, null),
  ('Minotaur Hell Quest', 460, null, 'Rookgaard', 'Carlin Sword, Fishing Rod', true, '5.2', 'Carlin Sword, 4 Poison Arrows, 10 Arrows and a Fishing Rod'),
  ('Mintwallin Cyclops Quest', 470, null, 'Thais', 'Small Diamond, Health Fluids, Hatchet, Chain Set', false, null, 'Small Diamond, two Strong Health Potions, Hatchet, Chain Helmet and a Chain Armor.'),
  ('Noble Armor Quest', 480, 35, 'Thais', 'Noble Armor and Crown Helmet', true, null, 'Noble Armor and Crown Helmet'),
  ('Orc Fortress Quest', 490, 40, 'Orc Fortress', 'Knight Armor, Knight Axe, Fire Sword', true, '6.1', 'Knight Armor, Knight Axe, Fire Sword'),
  ('Orc Shaman Quest', 500, null, 'Venore', 'Magic Light Wand, Axe Ring and Blank Rune', true, null, 'Magic Light Wand, Axe Ring and Blank Rune'),
  ('Ornamented Shield Quest', 510, null, 'Plains of Havoc', 'Ornamented Shield, Spike Sword, Keys, Rings, etc.', true, '5.1', 'Brown Bag containing Key 3702, Might Ring, Dragon Necklace, Spike Sword, Devious Dragons (Book), Ornamented Shield, Steel Helmet, Inkwell.'),
  ('Panpipe Quest', 520, null, 'Jakundaf Desert', 'Panpipes, gems, Power Ring', true, '6.1', 'Panpipes, 2 Small Amethysts, Power Ring'),
  ('Plate Armor Quest', 530, null, 'Ghostship', 'Plate Armor', false, '6.61-6.97', 'Plate Armor'),
  ('Poison Daggers Quest', 540, null, 'Edron', '2 Poison Daggers, 30 Poison Arrows', true, '6.4', '2 Poison Daggers, 30 Poison Arrows'),
  ('Power Bolts Quest', 550, null, 'Plains of Havoc', 'Power Bolts, Burst Arrows, Two Handed Sword, etc.', true, null, '5 Power Bolts, 12 Burst Arrows, Two Handed Sword, The Dreammaster (Book), 6 Throwing Stars, Talon.'),
  ('Power Ring Quest', 560, null, 'Femor Hills', 'Power Ring and a Bronze Amulet', true, null, 'a Power Ring and a Bronze Amulet'),
  ('Purple Tome Quest', 570, 60, 'Demona', 'Purple Tome, Maps', false, null, 'Tibia Map (Book), Fields of Glory Map (Book) and Purple Tome.'),
  ('Rapier Quest', 580, null, 'Rookgaard', 'Rapier', true, '5.2', 'Rapier'),
  ('Ring Quest', 590, null, 'Edron', 'Time Ring, Sword Ring', false, '7.1', 'Time Ring, Sword Ring.'),
  ('Scale Armor Quest', 600, null, 'Thais', 'Scale Armor', true, null, 'Scale Armor'),
  ('Shaman Treasure Quest', 610, null, 'Edron', '3 Blank Runes', false, '6.4', '3 Blank Runes'),
  ('Silver Amulet Quest', 620, null, 'Thais', 'Silver Amulet', true, '5.2', 'Silver Amulet'),
  ('Silver Brooch Quest', 630, null, 'Venore', 'Silver Brooch, gems', true, null, 'Silver Brooch, 2 Small Rubies, 3 Small Diamonds'),
  ('Skull of Ratha Quest', 640, null, 'Venore', 'White Pearl, 2 Black Pearls, Skull of Ratha, Wolf Tooth Chain, Dwarven Ring, 100 gp, Crystal Necklace', true, null, null),
  ('Small Ruby Quest', 650, null, 'Mintwallin', '1 Small Ruby', false, null, '1 Small Ruby'),
  ('Spike Sword Quest', 660, null, 'Thais', 'Spike Sword', false, null, 'Spike Sword'),
  ('Stealth Ring Quest', 670, null, 'Darashia', 'Stealth Ring, Protection Amulet', true, '6.61-6.97', 'Stealth Ring and Protection Amulet.'),
  ('Steel Helmet Quest', 680, null, 'Kazordoon', 'Steel Helmet, gold, Book', false, '6.61-6.97', 'Steel Helmet, 47 gp, 56 gp, The Fox Is Out (Book)'),
  ('Studded Legs Quest', 690, null, 'Rookgaard', 'Studded Legs', false, null, null),
  ('Studded Shield Quest', 700, null, 'Rookgaard', 'Studded Shield', true, '6.0', 'Banana which can be traded for a Studded Shield'),
  ('Thais Lighthouse Quest', 710, null, 'Thais', 'Dark Shield and Battle Hammer', true, '3.0', 'Dark Shield and Battle Hammer'),
  ('The Desert Dungeon Quest', 720, 20, 'Jakundaf Desert', '10k Quest Items (Ring of Healing, Ankh etc)', true, '6.1', 'Golden Bag with 25 Platinum Coins for each participating vocation and a Green Bag with: Protection Amulet, Ring Of Healing, Magic Light Wand and Ankh.'),
  ('The Outlaw Camp Quest', 730, 45, 'Outlaw Camp', 'Bright Sword, Red Gem', true, '6.4', 'Bright Sword, Red Gem'),
  ('The Paradox Tower Quest', 740, 30, 'Kazordoon', 'Red Spell Wand, Time Ring, Magician Hat, Violet Gem. Image showing how to get each reward.', true, '6.61-6.97', 'Up to two of the following: 10k gp, Wand of Cosmic Energy, 32 Talons and Phoenix Egg. You will also get the achievement Mathemagician.'),
  ('Throwing Star Quest', 750, null, 'Thais', '10 Throwing Stars', false, null, '10 Throwing Stars'),
  ('Time Ring Quest', 760, null, 'Venore', 'Time Ring, Elven Amulet, Crystal Ball', false, '7.1', 'Time Ring, Elven Amulet, Crystal Ball'),
  ('Triangle Tower Quest', 770, null, 'Thais', 'Garlic Necklace, Dwarven Ring, Sapphires', false, null, 'Garlic Necklace, Dwarven Ring and 2 Small Sapphires'),
  ('Troll Cave Quest', 780, null, 'Edron', 'Brass Legs, Garlic Necklace', true, '6.4', 'Brass Legs, Garlic Necklace'),
  ('Two Rubies Quest', 790, null, 'Thais', 'Two Small Rubies', true, null, null),
  ('Vampire Shield Quest', 800, 70, 'Edron', 'Vampire Shield, Dragon Lance, Strange Symbol', false, '6.4', 'Vampire Shield, Dragon Lance, Strange Symbol, Black Pearl, Mysterious Fetish'),
  ('Voodoo Doll Quest', 810, null, 'Venore', 'Voodoo Doll (King), Magic Light Wand', true, null, null),
  ('Wedding Ring Quest', 820, null, 'Edron', 'Wedding Ring, Dragon Necklace', false, '6.4', 'Wedding Ring, Dragon Necklace.'),
  ('Naginata Thais Dragon Lair Quest', 830, null, 'Thais', 'Naginata, 10 small rubies, Dragon Necklace', false, null, null),
  ('Present Quest', 840, null, null, null, false, '5.2', 'Backpack containing Jug, Plate, Cup and a Present or a Legion Helmet.')
on conflict (name) do nothing;
