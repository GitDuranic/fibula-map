-- =====================================================================================
-- Tibia Map - database step 27: editors mark blocked tiles walkable (slice 14b, 2026-11-24)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- Safe to run again. Needs database step 15 (map_tile_fixes).
--
-- map_tile_fixes.kind gets a second value:
--   'passable'  (14a) a locked door that isn't locked
--   'walkable'  (14b) a blocked tile routes may walk over, e.g. the wasp lever bridge at Hellgate on the 7.2 map
--               (32627-32629,31700,10: water until the lever is pulled)
-- A tile has one mark per map version (the primary key stays map, x, y, z).
-- =====================================================================================

alter table public.map_tile_fixes drop constraint if exists map_tile_fixes_kind_check;
alter table public.map_tile_fixes add constraint map_tile_fixes_kind_check check (kind in ('passable', 'walkable'));
