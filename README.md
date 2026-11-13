# Fibula Map

A Google Maps-style map of the Tibia 7.1 world: pan, zoom and floors drawn with the game's own sprites, NPCs and
what they trade, routes with run times (walking, boats, carpets, forcefields, locked doors), monsters and their
loot, and quest spots with their rewards. The design and every decision are in [docs/design.md](docs/design.md).

## Run it

You need [Node.js](https://nodejs.org) 20 or newer.

```sh
npm install
npm run convert     # builds the map data into public/map-data (takes a few minutes)
npx vite --port 5180
```

Then open http://localhost:5180.

The map data in `public/map-data` is generated, about 110 MB, and not in git. Run `npm run convert` again after
changing the converter or anything in `assets/` or `tools/data/`. Vite only serves files that existed when it
started, so restart it after a convert that adds new files.

## What's in the repo

| Folder | What |
|---|---|
| `src/map/` | The map: React components, drawing, the route finder (`engine/router.js`). |
| `tools/` | The converter (`convert-map.js`) and its parts in `tools/lib/`. |
| `tools/data/` | `wikiquests.json` (TibiaWiki quests up to 7.1), `custom-places.json` (locations you named on the map). |
| `assets/client/` | `Tibia.dat`, `Tibia.spr`, `Tibia.pic`: the game client's files (7.6 format, 7.1 item data). |
| `assets/map71/` | `Tibia71.otbm` (the 7.1 map, converted to TVP item ids) and `Tibia71-spawn.xml` (NPC and monster spawns). |
| `assets/tvp-data/` | The parts of TVP's data the converter reads (TVP is a community fork of [The Forgotten Server](https://github.com/otland/forgottenserver)) (items, door and key ids, NPCs, monsters, quest chests, the 7.6 map). TVP is GPL-2; its licence is in `assets/tvp-data/LICENSE`. |

The converter's inputs can be pointed elsewhere: `node tools/convert-map.js --assets <dir> --data <dir> --map <file> --spawn <file>`.

## Named locations

Right-click the map and choose **Add location here** to give a square a searchable name (more than one per square
is fine; **Remove '…'** on the same menu takes one off). This works with the dev server running; the names are kept
in `tools/data/custom-places.json` and the converter adds them to the map data.
