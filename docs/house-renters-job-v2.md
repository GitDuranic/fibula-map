# Daily house-renters job, v2: one API call (for Ryndean's server)

These are instructions for Claude (or a person) building a small scheduled job on Ryndean's server. Paste this file
into Claude Code on that server and ask it to build and schedule the job.

This replaces `docs/house-renters-job.md`. The Project Fibula API was updated in November 2026. `/houses` can now
return each renter's outfit too, so the job needs **one** API call instead of about 680. If the old job is already
running, replace its fetch part (the house list plus one call per player) with step 1 below. Storing and logging stay as they
were, apart from the new sanity check in step 2.

## What it's for

The Tibia map (`<TibiaMap>` on ryndean.info) has a setting, **Players in houses**, that draws each house's renter on
the map in their own outfit. The map reads the renters from the Supabase table `public.map_house_renters`. This job
fills that table once a day from the Project Fibula stats API (https://api.projectfibula.org, docs at
https://api.projectfibula.org/docs).

## Before you start

- **Database step 28** must have been run in Supabase (the house planner's project):
  `supabase/migrations/0028_map_house_renters.sql` in the tibia-map repo. It creates the table
  `public.map_house_renters` and the function `public.map_replace_house_renters(rows jsonb)`. It has already been
  run, and step 29 filled the table once by hand.
- The job needs the Supabase project URL and the **service_role** key (Supabase dashboard → Project Settings → API).
  This key bypasses row-level security, so keep it in an environment variable or secret on the server. **Never** put
  it in the website's code or in git.
  - `SUPABASE_URL`, e.g. `https://xxxx.supabase.co`
  - `SUPABASE_SERVICE_ROLE_KEY`

## What the job does (once a day)

1. **Houses, renters and outfits in one request:**
   `GET https://api.projectfibula.org/houses?owners=true&outfits=true&updates=false`

   The response is JSON grouped by town, then by house name:
   ```json
   {
     "Thais": {
       "Alai Flats, Flat 01": { "name": "Alai Flats, Flat 01", "size": 24, "rent": 765,
                                "status": "Rented by Endurance", "updates": null, "owner": "Endurance",
                                "outfit": "https://outfit-images.ots.me/772/outfit.php?id=131&head=95&body=114&legs=114&feet=102" },
       "Greenshore Clanhall":  { "name": "Greenshore Clanhall", "owner": "GM Luna on Amera", "outfit": null, ... },
       "Alai Flats, Flat 09":  { "name": "Alai Flats, Flat 09", "owner": null, "outfit": null, ... }
     },
     "Carlin": { ... }
   }
   ```
   - Go through every town and every house. Skip a house value that is `null`, and skip houses whose `owner` is
     `null` (the house is free).
   - For each rented house: `house = name`, `renter = owner`.
   - `outfit` is an image URL. Read its query numbers: `looktype = id`, plus `head`, `body`, `legs` and `feet`. A
     missing number counts as 0. Use a real URL parser (e.g. `new URL(outfit).searchParams`), not string slicing.
   - If `outfit` is `null`, or `id` is missing or 0, the renter has **no outfit**: store nulls for all five numbers.
     The API has no outfit for characters that aren't in any highscore list. The map doesn't draw those renters.
   - In November 2026 there were 7 towns (Thais, Carlin, Kazordoon, Ab'Dendriel, Edron, Darashia, Venore), 680 rented
     houses, and 4 renters without an outfit.
   - If the request fails (network error, 5xx, timeout, or a body that isn't JSON), retry it a couple of times with a
     pause of a minute or so. If it still fails, stop and don't touch the table (step 2).

2. **Store it:** call the database function with **all** rows in one request:
   ```
   POST {SUPABASE_URL}/rest/v1/rpc/map_replace_house_renters
   apikey: {SUPABASE_SERVICE_ROLE_KEY}
   Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}
   Content-Type: application/json

   { "rows": [
       { "house": "Alai Flats, Flat 01", "renter": "Endurance", "looktype": 131, "head": 95, "body": 114, "legs": 114, "feet": 102 },
       { "house": "Greenshore Clanhall", "renter": "GM Luna on Amera", "looktype": null, "head": null, "body": null, "legs": null, "feet": null }
   ] }
   ```
   It replaces the whole list in one transaction and returns the number of rows stored. It refuses an empty list.
   Still, **if step 1 failed or gave no rented houses, don't call it at all**. Then yesterday's list stays.

   Sanity check before storing: if the new list has far fewer houses than the table has now (say under half), log it
   and don't store. A half-scraped answer must not wipe the map. To count the current rows:
   `GET {SUPABASE_URL}/rest/v1/map_house_renters?select=house` with the same two headers.

3. **Log** how many houses were stored, how many renters have no outfit, and any errors. Exit with a non-zero code if
   nothing was stored, so the scheduler or monitoring notices.

## Schedule

Once a day. A time shortly after the Project Fibula server save is best, since house rents change then. Use whatever
the server already uses: cron, a systemd timer, or a scheduled task. Running it by hand once after setup is a good
test. Since it's now a single request, running it more often (e.g. every few hours) is fine too.

## Suggested shape

A single Node.js (18 or newer, built-in `fetch`) script with no dependencies is enough, e.g. `house-renters.mjs`,
reading `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the environment. It should be about 50 lines. Any
language works. It's just two HTTP calls.

## Checking it worked

- In Supabase → Table Editor → `map_house_renters`: about 680 rows with today's `updated_at`.
- On the map (7.2 map version): Settings → **Players in houses**, then zoom in on a town. Renters stand in their
  houses with their names above them.

## Nothing to change on the website

The map reads the table with the same `supabaseUrl` / `supabaseKey` (public anon key) props it already gets for the
quests.
