-- =====================================================================================
-- Tibia Map - database step 2: the two quest editors (slice 13c)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- Safe to run again.
--
-- Only two Discord accounts may edit quests: their Discord user IDs are written into map_is_editor() below
-- (hard-coded on purpose: no editors table). To change who may edit, change the IDs and run this again.
--
-- A Discord user ID is the long number Discord shows with "Copy User ID" (Settings -> Advanced -> Developer Mode,
-- then right-click your name). Someone who logged in to the planner can also be found with:
--   select provider_id, identity_data->>'full_name' from auth.identities where provider = 'discord';
--
-- What it does:
--   map_is_editor()    true for the two editors (the map asks it after login to show the Edit button)
--   map_quests         editors may change quests; every change still goes into map_quest_history (step 1)
--   map_quest_history  editors may read it (for undo later, slice 13k)
-- =====================================================================================

create or replace function public.map_is_editor()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  -- auth.identities, not the login's user_metadata: users can change their own user_metadata.
  select exists (
    select 1 from auth.identities i
    where i.user_id = auth.uid()
      and i.provider = 'discord'
      and i.provider_id in (
        'DISCORD_ID_OF_THE_USER',      -- the user
        'DISCORD_ID_OF_RYNDEAN'        -- Ryndean
      )
  );
$$;

revoke all on function public.map_is_editor() from public;
grant execute on function public.map_is_editor() to anon, authenticated;

-- Editors change quests. Adding and deleting quests isn't part of the map yet.
drop policy if exists "map quests: editors update" on public.map_quests;
create policy "map quests: editors update" on public.map_quests
  for update to authenticated
  using (public.map_is_editor())
  with check (public.map_is_editor());

-- No empty names (the name is how the map finds a quest).
do $$ begin
  alter table public.map_quests add constraint map_quests_name_not_empty check (length(btrim(name)) > 0);
exception when duplicate_object then null;
end $$;

drop policy if exists "map quest history: editors read" on public.map_quest_history;
create policy "map quest history: editors read" on public.map_quest_history
  for select to authenticated
  using (public.map_is_editor());
