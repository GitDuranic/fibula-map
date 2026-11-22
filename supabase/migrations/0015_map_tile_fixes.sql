-- =====================================================================================
-- Tibia Map - database step 15: editors' tile fixes (slice 14a)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- Safe to run again. Needs database step 2 (map_is_editor()).
--
-- Some tiles on the converted map are wrong for routes, e.g. a door the map marks as locked that just opens.
-- The editors right-click such a tile on the map and mark it; everyone's routes then use the mark.
--
-- map_tile_fixes   one mark per tile per map version:
--   map    the map file's name, as the converter writes it into map.json ('Tibia71', 'map72', ...)
--   kind   'passable': the tile doesn't block routes (14a: a locked door that isn't locked)
-- Everyone may read the marks; only the editors may add and remove them.
-- =====================================================================================

create table if not exists public.map_tile_fixes (
  map        text not null check (length(btrim(map)) > 0),
  x          integer not null,
  y          integer not null,
  z          integer not null check (z between 0 and 15),
  kind       text not null default 'passable' check (kind in ('passable')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (map, x, y, z)
);

alter table public.map_tile_fixes enable row level security;

grant select on public.map_tile_fixes to anon, authenticated;
grant insert, delete on public.map_tile_fixes to authenticated;

drop policy if exists "map tile fixes: everyone reads" on public.map_tile_fixes;
create policy "map tile fixes: everyone reads" on public.map_tile_fixes
  for select to anon, authenticated
  using (true);

drop policy if exists "map tile fixes: editors add" on public.map_tile_fixes;
create policy "map tile fixes: editors add" on public.map_tile_fixes
  for insert to authenticated
  with check (public.map_is_editor());

drop policy if exists "map tile fixes: editors remove" on public.map_tile_fixes;
create policy "map tile fixes: editors remove" on public.map_tile_fixes
  for delete to authenticated
  using (public.map_is_editor());
