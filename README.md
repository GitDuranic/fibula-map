# Fibula Map

A Google Maps-style map of the Tibia 7.1 world: pan, zoom and floors drawn with the game's own sprites, NPCs and
what they trade, routes with run times (walking, boats, carpets, forcefields, locked doors), monsters and their
loot, and quest spots with their rewards. The design and every decision are in [docs/design.md](docs/design.md).

## How it fits together

1. **The converter** (`npm run convert`) reads the game files in `assets/` and writes the map data to
   `public/map-data`: sprite sheets, small JSON chunks of the map, overview pictures for zooming out, NPCs,
   monsters, quests. That's about 110 MB. It runs **once**, and again only when the game data or the converter
   changes. It's not in git: you build it yourself.
2. **The map** (the React app in `src/`) runs in the browser and only downloads the pieces of map data it shows.
   People using the map never run the converter.

## Run it on your computer

### What you need

- **[Node.js](https://nodejs.org) 20 or newer** (`node --version` to check).
- **[Git](https://git-scm.com)**.
- **About 8 GB of free memory** for the converter, and about 500 MB of disk space.

### First time

Open a terminal (on Windows: PowerShell or Git Bash) and run:

```sh
git clone https://github.com/GitDuranic/fibula-map.git
cd fibula-map
npm install
npm run convert
npm run dev
```

- `npm install` downloads the libraries the project uses (once, ~1 minute).
- `npm run convert` builds the map data. It takes **3 to 5 minutes** and prints what it does; it's done when you're
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
npm run convert      # only needed when assets/, tools/ or tools/data/ changed
npm run dev
```

If you're not sure whether to convert, convert: it's always safe.

If the map was running during a convert, **stop it (`Ctrl+C`) and start it again** (`npm run dev`): the dev server
only serves files that existed when it started, so newly added data files would be missing.

## Put it on a website

The map is a static site: no server code, only files. To build it:

```sh
npm run convert      # if the map data isn't built yet
npm run build
```

This writes the whole site to `dist/` (the app plus a copy of `public/map-data` and `public/map-data-72`). Upload
the contents of `dist/` to any web host. To try the built site locally first: `npm run preview` and open
http://localhost:5181.

The 7.2 map data is built with:

```sh
node --max-old-space-size=8192 tools/convert-map.js --map "<dir>/map72.otbm" --spawn "<dir>/map-spawn.xml" --out public/map-data-72
```

The refresh tiles (Settings → "Refresh tiles") come from the 7.2 map's tile flags; the 7.1 map has none and
borrows them: add `--refresh-map "<dir>/map72.otbm"` when converting 7.1. Without a full convert:
`node tools/refresh-tiles.js "<dir>/map72.otbm" public/map-data` (and `public/map-data-72`).

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
| `assets/client/` | `Tibia.dat`, `Tibia.spr`, `Tibia.pic`: the game client's files (7.6 format, 7.1 item data). |
| `assets/map71/` | `Tibia71.otbm` (the 7.1 map, converted to TVP item ids) and `Tibia71-spawn.xml` (NPC and monster spawns). |
| `assets/tvp-data/` | The parts of TVP's data the converter reads: items, door and key ids, NPCs, monsters, quest chests, the 7.6 map. TVP is a community fork of [The Forgotten Server](https://github.com/otland/forgottenserver), GPL-2; its licence is in `assets/tvp-data/LICENSE`. |
| `docs/design.md` | The design: what was decided, why, and what's still open. |

The converter's inputs can be pointed elsewhere:
`node --max-old-space-size=8192 tools/convert-map.js --assets <dir> --data <dir> --map <file> --spawn <file> --out <dir>`.
