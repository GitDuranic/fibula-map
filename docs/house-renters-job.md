# Daily house-renters job (for Ryndean's server)

> **Replaced by `docs/house-renters-job-v2.md`** (2026-11-25): the API's `/houses` now returns the outfits too, so
> the job needs one call instead of one per renter.

These are instructions for Claude (or a person) building a small scheduled job on Ryndean's server. Paste this file
into Claude Code on that server and ask it to build and schedule the job.

## What it's for

The Tibia map (`<TibiaMap>` on ryndean.info) has a setting, **Players in houses**, that draws each house's renter on
the map in their own outfit. The data comes from the Project Fibula stats API (https://api.projectfibula.org,
docs at https://api.projectfibula.org/docs). Until now every visitor's browser called that API itself: one call
for the house list plus one call per renter for their outfit, which is about 680 calls. The API also sends no CORS
header, so browsers on ryndean.info can't read it.

From now on, **one server job asks the API once a day and stores the result in Supabase**. The map only reads it from
Supabase. This job is that server job.

## Before you start

- **Database step 28** must have been run in Supabase (the house planner's project):
  `supabase/migrations/0028_map_house_renters.sql` in the tibia-map repo. It creates the table
  `public.map_house_renters` and the function `public.map_replace_house_renters(rows jsonb)`.
- The job needs the Supabase project URL and the **service_role** key (Supabase dashboard → Project Settings → API).
  This key bypasses row-level security, so keep it in an environment variable or secret on the server. **Never** put
  it in the website's code or in git.
  - `SUPABASE_URL`, e.g. `https://xxxx.supabase.co`
  - `SUPABASE_SERVICE_ROLE_KEY`

## What the job does (once a day)

1. **House list:** `GET https://api.projectfibula.org/houses?updates=false&owners=true`

   The response is JSON grouped by town, then by house name:
   ```json
   {
     "Thais": {
       "Alai Flats, Flat 01": { "name": "Alai Flats, Flat 01", "size": 24, "rent": 765,
                                "status": "Rented by Endurance", "updates": null, "owner": "Endurance" },
       "Alai Flats, Flat 02": { "name": "Alai Flats, Flat 02", "owner": null, ... }
     },
     "Carlin": { ... }
   }
   ```
   Keep every house whose `owner` is set: `house = name`, `renter = owner`. Some house values may be `null`, so skip
   those. In November 2026 there were 7 towns and about 680 rented houses.

2. **Outfit of each renter:** for each distinct renter name, call
   `GET https://api.projectfibula.org/players/<name, URL-encoded>?char_info=true&ranking_info=false&updates=false&deaths=false`

   The response is keyed by the character's name:
   ```json
   { "Ryndean": { "info": { "name": "Ryndean",
       "outfit": "https://outfit-images.ots.me/772/outfit.php?id=128&head=108&body=114&legs=95&feet=114", ... },
       "updates": null, "deaths": null } }
   ```
   Take `info.outfit` (use `data[name]`, or the first value if the key's case differs) and read the query numbers:
   `looktype = id`, `head`, `body`, `legs`, `feet` (a missing number counts as 0). If `outfit` is missing/null or
   `id` is 0, or the API answers **404**, the renter has **no outfit**: store nulls. The API has no outfit for
   characters that aren't in any highscore list. The map doesn't draw those renters.
   - **Be gentle with the API:** call it one or two at a time with a short pause (e.g. 300–500 ms between calls).
     About 680 calls then take a few minutes, which is fine once a day.
   - If one player's call **fails** (network error, 5xx, timeout), retry it once or twice. If it still fails, reuse
     that renter's outfit from the current table (read `map_house_renters` first, see below), or else store nulls.
     One failed player must not stop the job.
   - If the friend's API ever gets a call that returns every renter's outfit at once, use that instead.

3. **Store it:** call the database function with **all** rows in one request:
   ```
   POST {SUPABASE_URL}/rest/v1/rpc/map_replace_house_renters
   apikey: {SUPABASE_SERVICE_ROLE_KEY}
   Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}
   Content-Type: application/json

   { "rows": [
       { "house": "Some House", "renter": "Ryndean", "looktype": 128, "head": 108, "body": 114, "legs": 95, "feet": 114 },
       { "house": "Alai Flats, Flat 01", "renter": "Endurance", "looktype": null, "head": null, "body": null, "legs": null, "feet": null }
   ] }
   ```
   It replaces the whole list in one transaction and returns the number of rows stored. It refuses an empty list.
   Still, **if step 1 failed or gave no rented houses, don't call it at all**. Then yesterday's list stays.

   To read the current list (for reusing outfits in step 2):
   `GET {SUPABASE_URL}/rest/v1/map_house_renters?select=renter,looktype,head,body,legs,feet` with the same two
   headers.

4. **Log** how many houses were stored, how many renters have no outfit, and any errors. Exit with a non-zero code if
   nothing was stored, so the scheduler or monitoring notices.

## Schedule

Once a day. A time shortly after the Project Fibula server save is best, since house rents change then. Use whatever
the server already uses: cron, a systemd timer, or a scheduled task. Running it by hand once after setup is a good
test.

## Suggested shape

A single Node.js (18 or newer, built-in `fetch`) script with no dependencies is enough, e.g. `house-renters.mjs`,
reading `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the environment. Any language works. It's just HTTP
calls.

## Checking it worked

- In Supabase → Table Editor → `map_house_renters`: about 680 rows with today's `updated_at`.
- On the map (7.2 map version): Settings → **Players in houses**, then zoom in on a town. Renters stand in their
  houses with their names above them.

## Nothing to change on the website

The map reads the table with the same `supabaseUrl` / `supabaseKey` (public anon key) props it already gets for the
quests. The old `fibulaApi` prop no longer exists. If the page still passes it, it's simply ignored.
