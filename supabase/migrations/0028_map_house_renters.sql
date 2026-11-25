-- =====================================================================================
-- Tibia Map - database step 28: house renters filled by Ryndean's daily job (slice 17c)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- Safe to run again.
--
-- "Players in houses" shows each house's renter in their own outfit. Until now every browser asked the Project
-- Fibula API itself (one call for the houses + one call per renter for the outfit). Now one of Ryndean's servers
-- asks the API once a day and stores the answer here; the map only reads this table.
--
-- map_house_renters   one row per rented house (houses without a renter are not stored):
--   house      the house's name as the API gives it ('Alai Flats, Flat 01'); the map matches it to map-house.xml
--   renter     the character's name
--   looktype, head, body, legs, feet
--              the outfit, from the numbers in the API's outfit image URL
--              (.../outfit.php?id=128&head=108&body=114&legs=95&feet=114 -> 128, 108, 114, 95, 114);
--              all null when the API has no outfit for the character (the map then doesn't draw that renter)
--   updated_at when the daily job wrote the row
--
-- Everyone may read. Nobody may write through the public key: the job writes with the service_role key, and only
-- through map_replace_house_renters(), which swaps the whole list in one transaction (so the map never sees a
-- half-written or empty list) and refuses an empty list (so a failed API call can't wipe the houses).
-- =====================================================================================

create table if not exists public.map_house_renters (
  house      text primary key check (length(btrim(house)) > 0),
  renter     text not null check (length(btrim(renter)) > 0),
  looktype   integer,
  head       integer,
  body       integer,
  legs       integer,
  feet       integer,
  updated_at timestamptz not null default now()
);

alter table public.map_house_renters enable row level security;

revoke all on public.map_house_renters from anon, authenticated;
grant select on public.map_house_renters to anon, authenticated;

drop policy if exists "map house renters: everyone reads" on public.map_house_renters;
create policy "map house renters: everyone reads" on public.map_house_renters
  for select to anon, authenticated
  using (true);

-- rows: a JSON array of { "house", "renter", "looktype", "head", "body", "legs", "feet" } (outfit fields may be
-- null or left out). Returns the number of rows stored.
create or replace function public.map_replace_house_renters(rows jsonb)
returns integer
language plpgsql
set search_path = public
as $$
declare
  n integer;
begin
  if rows is null or jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) = 0 then
    raise exception 'map_replace_house_renters: no rows given; the list is left as it was';
  end if;
  delete from public.map_house_renters where true;
  insert into public.map_house_renters (house, renter, looktype, head, body, legs, feet)
  select distinct on (r.house) r.house, r.renter, r.looktype, r.head, r.body, r.legs, r.feet
  from jsonb_to_recordset(rows) as r(house text, renter text, looktype integer, head integer, body integer, legs integer, feet integer)
  where r.house is not null and r.renter is not null;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.map_replace_house_renters(jsonb) from public, anon, authenticated;
grant execute on function public.map_replace_house_renters(jsonb) to service_role;
