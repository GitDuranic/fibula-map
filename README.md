# Fibula Map

A Google Maps-style map of the Tibia 7.1 world: pan, zoom and floors drawn with the game's own sprites, NPCs and
what they trade, routes with run times (walking, boats, carpets, forcefields, locked doors), monsters and their
loot, and quest spots with their rewards. The design and every decision are in [docs/design.md](docs/design.md).

## How it fits together

1. **The converter** (`npm run convert`) reads the game files (not in the repo, see "The game files") and writes
   the map data of one map version to its folder (`public/map-data` for 7.1, `public/map-data-72` for 7.2): sprite sheets, small JSON chunks of the map, overview pictures for zooming out, NPCs,
   monsters, quests. That's about 110 MB. It runs **once**, and again only when the game data or the converter
   changes, once per map version. It's not in git: you build it yourself.
2. **The map** (the React app in `src/`) runs in the browser and only downloads the pieces of map data it shows.
   People using the map never run the converter.

## Run it on your computer

### What you need

- **[Node.js](https://nodejs.org) 20 or newer** (`node --version` to check).
- **[Git](https://git-scm.com)**.
- **About 8 GB of free memory** for the converter, and about 500 MB of disk space.
- **The game files** (see below).

### The game files

The converter's input files aren't in the repo: Ryndean makes them. You need:

| What | Files | Option |
|---|---|---|
| The client files (7.6 format, 7.1 item data) | `Tibia.dat`, `Tibia.spr`, `Tibia.pic` in one folder | `--assets <folder>` |
| TVP's server data (the `data` folder of TVP, a GPL-2 fork of [The Forgotten Server](https://github.com/otland/forgottenserver)): items, door and key ids, NPCs, monsters, quest chests, the 7.6 map | `items/items.otb`, `items/items.xml`, `global.lua`, `npc/`, `monster/`, `scripts/`, `world/map.otbm` | `--data <folder>` |
| Per map version: the map, in TVP item ids | e.g. `Tibia71.otbm`, `map72.otbm` | `--map <file>` |
| Per map version: its NPC and monster spawns | e.g. `Tibia71-spawn.xml`, `map-spawn.xml` | `--spawn <file>` |
| Per map version, optional: its house list ("Players in houses") | e.g. `Tibia71-house.xml`, `map-house.xml` | `--houses <file>` |

Keep a map's file name when a new version of it comes: editors' tile fixes are kept per map file name
(`Tibia71`, `map72`).

### First time

Open a terminal (on Windows: PowerShell or Git Bash) and run:

```sh
git clone https://github.com/GitDuranic/fibula-map.git
cd fibula-map
npm install
npm run convert -- --assets "<client>" --data "<tvp>/data" --map "<7.1>/Tibia71.otbm" --spawn "<7.1>/Tibia71-spawn.xml" --out public/map-data
npm run convert -- --assets "<client>" --data "<tvp>/data" --map "<7.2>/map72.otbm" --spawn "<7.2>/map-spawn.xml" --houses "<7.2>/map-house.xml" --out public/map-data-72
npm run dev
```

- `npm install` downloads the libraries the project uses (once, ~1 minute).
- `npm run convert` builds one map version's data (put your own folders in place of `<...>`). It takes **3 to 5 minutes** and prints what it does; it's done when you're
  back at the prompt. The last lines look like `Overview images: 51.5 MB`.
- `npm run dev` starts the map. Leave this window open while you use it.

Then open **http://localhost:5180** in your browser. To stop the map, press `Ctrl+C` in the terminal.

### Next times

```sh
cd fibula-map
npm run dev
```

and open http://localhost:5180. You don't need to convert again unless something below changed.

### After an update

```sh
git pull
npm install          # only needed when package.json changed, but harmless
npm run convert -- ...   # both versions; only needed when the game files, tools/ or tools/data/ changed
npm run dev
```

If you're not sure whether to convert, convert: it's always safe.

If the map was running during a convert, **stop it (`Ctrl+C`) and start it again** (`npm run dev`): the dev server
only serves files that existed when it started, so newly added data files would be missing.

## Put it on a website

The map is a static site: no server code, only files. To build it:

```sh
npm run convert -- ...   # both versions, if the map data isn't built yet
npm run build
```

This writes the whole site to `dist/` (the app plus a copy of `public/map-data` and `public/map-data-72`). Upload
the contents of `dist/` to any web host. To try the built site locally first: `npm run preview` and open
http://localhost:5181.

The refresh tiles (Settings → "Refresh tiles") come from the map's own tile flags. A map without them can borrow
another version's: add `--refresh-map "<other map>.otbm"` (the Settings note then says they're borrowed). Without a
full convert: `node tools/refresh-tiles.js "<map>.otbm" public/map-data`.

The house list for "Players in houses" comes with `--houses`, or without a full convert:
`node tools/houses.js "<map>.otbm" "<house list>.xml" public/map-data-72`. The renters and their outfits come from
Supabase (table `map_house_renters`, database step 28), which one of Ryndean's servers fills once a day from the
Project Fibula API (see `docs/house-renters-job-v2.md`).

To put the map inside another React site instead, use the component directly:

```jsx
import TibiaMap from './map/TibiaMap.jsx';

<TibiaMap height="80vh" />
```

- `maps`, `defaultMap`: the map versions players can switch between in the panel (7.1 | 7.2). By default
  7.1 is served from `/map-data` and 7.2 from `/map-data-72`, and 7.2 opens first. Serve both folders. `?map=71` or
  `?map=72` in the link opens that version; a player's last choice is remembered in their browser.
- `dataUrl` (optional): show only this one data folder, without the switch.
- `height`: the map's height (any CSS size).
- `syncUrl` (default `true`): keep the view in the address (`#x,y,z,zoom`) so links can be shared, and let the
  browser's back button work with the map's Back button. Set it to `false` if the page uses the address itself.
- `supabaseUrl`, `supabaseKey` (optional): the quest database, the same Supabase project and public key as the
  house planner. Without them the quest list built by the converter is shown.

## Quest database

The quests come from Supabase (the house planner's project). Set it up once: open
`supabase/migrations/0001_map_quests.sql`, paste it into Supabase's SQL Editor and run it. For `npm run dev`, put
the address and public key in `.env.local` (not in git), as for the planner:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<public key>
```

## Named locations

With `npm run dev` running, right-click the map and choose **Add location here** to give a square a name that's
searchable. A square can have more than one name; the same menu has **Remove '…'** to take one off. The names are
kept in `tools/data/custom-places.json` (commit that file to keep them). The next `npm run convert` adds them to the
map data, so they're also searchable on a built site, where adding and removing isn't available.

## When something goes wrong

| What you see | What to do |
|---|---|
| `npm run convert` stops with `JavaScript heap out of memory` | Close other programs and try again; the converter needs up to 8 GB. |
| `npm run dev` says `Port 5180 is already in use` | The map is already running in another terminal, or something else uses that port. Close it, or open the map that's already running. |
| The page says `Could not load the map` or stays grey/black | The map data isn't built yet or is incomplete: run `npm run convert`, then restart `npm run dev`. |
| New things (monsters, quests, ...) are missing after a convert | Restart `npm run dev` (see "After an update"). |
| The page looks stuck after you changed code | Reload the page (F5). |

## What's in the repo

| Folder | What |
|---|---|
| `src/map/` | The map: React components, drawing, the route finder (`engine/router.js`). |
| `tools/` | The converter (`convert-map.js`) and its parts in `tools/lib/`. |
| `tools/data/` | `wikiquests.json` (TibiaWiki quests up to 7.1), `custom-places.json` (locations you named on the map) and `scripted-links.json` (holes and such that a lever opens, so they're not on the map; added by hand). |
| `docs/design.md` | The design: what was decided, why, and what's still open. |

The game files aren't in the repo (see "The game files").
