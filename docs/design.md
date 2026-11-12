# Tibia Map — design doc

A Google Maps-style map of Tibia 7.6. It works out the best way to sell loot and the best route from A to B with every travel method, and it gives accurate run times for a given level and speed setup. The panels look like the old client, as in the house planner. The map itself loads fast and pans and zooms like Google Maps.

Status: design agreed on 2026-11-12, nothing built yet. Keep this doc current: every decision, even small ones made while building, goes in here straight away.

## Decisions

### Scope and hosting
- **Version: 7.1 only** (changed from 7.6 on 2026-11-12). No version selector. Our data (TVP) is 7.6, so where the 7.1 map, NPCs, prices and monsters come from is still open (see open questions).
- **Project: `C:\git\tibia-map`**, its own repo next to the house planner, with the same git identity (GitDuranic). Nothing is pushed until the user asks.
- **It goes on Ryndean's site too**, so it has the same limits as the house planner:
  - It is a React component and gets its settings as props. No Vite-only APIs such as `import.meta.env`.
  - Every new npm package must be reported to Ryndean, who adds it to his `package.json`.
  - All CSS classes get a prefix (`tm-` proposed, so they don't clash with `t-`/`thp-` from the planner).
  - It renders in the browser only (Docusaurus).
  - Tile data is served as static files, like `/house-planner-data`.
- **Everyone is treated as premium.** There are no premium limits.
- **Rookgaard works**: it is on the map, and routes on the island work.

### Map
- **Real sprites, drawn in the browser (2026-11-12).** Pre-rendering the whole map as 32 px sprite images was estimated at ~1 GB+ per floor, which is too big to host and too slow to load. Instead, the way the house planner works: the converter writes **compact map data** (item ids per tile, in chunks) plus a **sprite sheet** of the items used on the map. The browser draws the visible chunks with the planner's render engine and caches them. Only the **far zoom levels** are pre-rendered images, drawn with the same sprites (see "Overview images" below; originally minimap colours, changed 2026-11-12). This keeps the download small, is sharp at every zoom step, and makes it easy to cut roofs away per building at runtime.
- Pan, zoom, and floor up/down feel like Google Maps (drag, scroll wheel, pinch).
- **Roofs and zoom.** The map is always drawn "from above": the floor plus the floors above it, with the client's 1-tile shift per floor. The far-zoom overview images exist only from above (surface) and per underground floor.
  - **First version (2026-11-12):** zoom 64 and closer switched the whole map to "this floor only". The user didn't like the whole map losing its roofs at once.
  - **Now: zoom through the layers under the mouse (2026-11-12, the user's idea, "let's try it").**
    - Over the street, zooming only zooms; every building keeps its roof.
    - Over a building, from zoom 32 inward, each zoom step in also takes off the topmost layer still showing under the cursor (roof, then upper floors, down to the floor you're on). That's the connected area of that layer only (4-neighbours, at most 3000 tiles, so mountain ranges are left alone).
    - Each layer remembers the zoom it came off at. Zooming back out past that zoom puts it back, wherever the mouse is, so zooming out undoes zooming in.
    - Zooming out to the overview (below 32) or changing floor closes everything.
    - At max zoom, a step over a building still takes a layer off.
    - The zoom buttons and `+`/`-` act on the centre of the screen. Pinch only zooms, for now.
    - Known effect: buildings whose roofs touch come off together (e.g. the Thais temple and the house next to it).
    - **Refined after user test at Darashia (32989,32414,7), "doesn't take away the roof fully":**
      - **Which area** (World.peelArea): first the whole building, i.e. everything at or above the layer connected to the cursor, bridging 1-tile gaps, if that's at most 400 tiles. Otherwise (a city block of touching houses) just that layer's own connected area.
      - **Which tile:** if nothing is above the tile under the cursor (open courtyard, gap between walls), the nearest tile within 3 that has a layer showing is used.
      - **Still imperfect:** Darashia's open-topped buildings are loose wall pieces with gaps of 3+ tiles (each floor is also drawn one tile further up-left), so connected-area rules miss parts of them. Asked the user how it should work. Options: a circle around the mouse, bridging bigger gaps, or the whole building at once.
    - **User chose "whole building at once" (2026-11-12).** The first zoom step over a building takes everything above the current floor off that building. Later steps just zoom, and zooming back out past that zoom puts it back. This replaces one layer per step.
      - **The building** (World.buildingArea): everything above, connected, bridging 1-tile gaps, if at most 400 tiles. Otherwise each layer's own connected area from that tile, together.
      - **A 1-tile margin** of covered tiles is added, so roof overhangs don't stay behind as thin strips. A 2-tile margin also cut into neighbouring roofs, e.g. the Thais temple. With 1 tile a neighbour can still lose a thin edge.
      - The same Darashia limitation remains: wall pieces 3+ tiles away stay.
    - **Back to one layer per step, but over the whole building (2026-11-12).** The user: Darashia's flat roofs (and other buildings) should first lose the roof, then the floor under it; "otherwise you can never see the room below the roof". Each zoom step now takes the topmost layer showing and everything above it off the whole building area (World.buildingArea). A flat roof goes first, the upper room shows, and the next step goes down to the ground floor.
      - **Which layer:** the topmost layer showing on that building within 3 tiles of the cursor, not just at one tile. At a building's lower-right edge only the upper floor's walls show (each floor is drawn a tile further up-left), which made the first step skip the roof. Tested at Darashia 33197,32422,7: roof (floor 5), then the floor-6 rooms, then the ground floor.
  - **Replaced (2026-11-12): wheel = zoom only, Ctrl + wheel = layers.** The user: the per-building area guessing "is still a problem, e.g. Darashia depot is awful". Better to scroll through layers with Ctrl + wheel and zoom with the wheel.
    - **Ctrl + wheel forward** takes the top layer off the **whole view**: everything above that floor is left out, starting with the highest floor. **Backward** puts the last one back.
    - Only floors with map data on screen count, so every step changes something (World.layersIn).
    - **Panel:** shows "All layers" or "Layers from floor N".
    - **Reset:** changing floor or opening a link resets to all layers.
    - The building search (buildingArea, peel-on-zoom) is removed.
    - Known: a laptop trackpad pinch sends Ctrl + wheel in browsers, so pinching on a trackpad changes layers instead of zooming. Touch-screen pinch still zooms.
    - Not done yet: a way to change layers without a mouse (phones, keyboard); layers don't apply to the far-zoom overview images (below 16).
  - Still planned: around the route and a selected NPC, roofs are cut away even when zoomed out.
- **Viewer: our own canvas code, no map library (2026-11-12).** Leaflet was considered. It can look like Tibia, but the per-building roof swap and pixel-exact zoom steps (sharp at DPR 2.5) fight its design, and it would be an extra npm package for Ryndean. The pan/zoom/markers code is small enough to write ourselves.
- **Code sharing:** the planner's `tools/lib` (dat, spr, otbm, png) and render engine are **copied** into tibia-map, not linked, so the planner's sync to Ryndean's site isn't affected.
- A position readout shows x, y, z under the cursor. You can type a position to jump there.
- **Shareable links**: the URL holds the position, zoom, floor and the route.

### Things on the map
- **NPC pins**: click one to see what the NPC buys and sells, at what price, and the passages they offer.
- **Places & landmarks**: towns, temples, depots, shops, hunting spots, quests. Sources: TVP data and TibiaWiki.
- **Monster spawns**: from `map-spawn.xml`, as a layer you can switch on and off.
- **Map pins**: drop a pin and the map shows the route to it.
- **Current position**: the player enters it, or it comes from Ryndean's overlay later (see open questions).

### Routing
- **Start and destination are set by clicking or searching**, like Google Maps: a "From" field and a "To" field (a town, depot, NPC, temple, coordinates or a click on the map), plus optional stops along the way.
- Travel methods:
  - walking tile by tile
  - floor changes: stairs, ladders, holes, rope spots, shovel spots
  - boats and carpets, with prices from the NPC `Teleport(x,y,z)` lines and `Price=` in `data/npc/behavior/*.npc`
  - map teleporters and magic fields
- **Passages locked behind a quest** are shown as checkboxes ("I have done …"). Routes only use the passages the player has ticked.
- **Shortest path only.** Routes don't avoid monsters or danger; time is the only cost.

### Run times (formulas from the TVP source)
- `baseSpeed = 70 + (level − 1)` (vocation basespeed 70, `player.h` updateBaseSpeed)
- `speed = 2 · (baseSpeed + varSpeed) + 80` (`creature.h` getSpeed)
- Haste: `varSpeed += floor(baseSpeed · 30 / 100)`, lasts 60 s, 60 mana
- Strong Haste: `varSpeed += floor(baseSpeed · 70 / 100)`, lasts 42.5 s
- Boots of haste: speed attribute 20. **To verify**: does it add to `varSpeed` (that would mean +40 shown)? The time ring and other speed items are handled the same way.
- Step time: `ceil50(1000 · groundSpeed / speed)` ms, where groundSpeed is the item's `speed` in items.otb (grass, road, swamp…). A diagonal step costs ×3 (`creature.cpp`). **To verify**: is it the ground of the tile you step onto or the one you leave?
- Floor changes (stairs, rope, ladder) cost extra time. Measure or derive this.
- The UI takes: level, BoH yes/no, other speed items, and the haste spell (none / haste / strong haste). Long walks count recasts. Showing mana use is an option.

### Selling loot
- **The map is optional here.** The loot seller works on its own: fill the bag and you get a short list of NPCs to visit (town + NPC + what to sell to them) and the receipt. The route and map are an extra view you can open ("show on map"), not the centre of this mode.
- **Adding items: a search field.** Clicking an item in the results drops it into a client-style backpack.
- **Search by monster category**, e.g. "dragon" (dragon + dragon lord) or "dwarves". It shows all loot of those monsters, taken from the TVP monster files.
- **Quick entry**: type `3 plate armor` ⏎, then `12 dwarven shield` ⏎, the way you'd say it to an NPC.
- Amounts can be changed right in the bag.
- **Live update**: while you fill the bag, the NPC list updates (and so does the map, if it's open) with which towns and NPCs to visit to sell everything.
- **Goal: gold vs time.** It offers a few options: max gold, fastest, and balanced. Each option shows the gold, the travel costs and the walk time.
- **Receipt**: a client/console-style list of what to sell to which NPC, the price per item and the total.
- Prices come from the `.npc` behaviour scripts (the buy and sell lines).

### Look and feel
- The panels look like the client: stone texture, bevels, client backpack, console-style receipt and messages. This matches the house planner and could share its components.
- The map itself is modern and smooth: pan, zoom, pins, the route drawn as a line.
- Sharpness matters (the user's display has DPR 2.5). Sprites are drawn at whole screen pixels per game pixel where possible.

## Data sources
- `C:\git\tibia assets\tibia71-tvp-converted\Tibia71.otbm`: **the 7.1 map** (in TVP item ids), plus `Tibia71-house.xml`, `Tibia71-spawn.xml` (spawns) and `Tibia71-npc-port-report.txt`
- `C:\git\tibia assets\TVP-main\TVP-main\data\world\map.otbm`: the 7.6 map (not used any more)
- `…\data\spawns.dat`: NPC positions (7.6; the 7.1 positions come with Ryndean's data / the port report)
- `…\data\npc\*.xml` + `…\data\npc\behavior\*.npc` (376 scripts): trade lists, prices, passages (`Teleport(x,y,z)`). These are 7.6 stand-ins until Ryndean's 7.1 NPC files arrive.
- `…\data\monster\monsters\*.xml`: loot per monster (7.6 stand-in until the 7.1 files arrive)
- `…\data\items\items.otb` / `items.xml`: ground speed, names, speed items
- `C:\git\tibia assets\Tibia.dat/.spr/.pic`: sprites. These are 7.6-format files whose item data was changed to match 7.1 for the 7.1 items (from Ryndean), so the sprites and graphics are fine for 7.1.
- TibiaWiki (cached like the house planner's): places, quests, which quest unlocks which passage

## Open questions
- **Pattern-Z ground looks:** on odd floors (e.g. 7) the grass/edge grounds show their second pattern-Z set (rougher, textured stone); on even floors the first (smooth stone). Is this second set the correct 7.1 look, or should the map always use one set? Ask the user / Ryndean, who made the 7.1 dat. The house planner uses the same `z % pz` rule and the same dat, so it can also show black squares on these items (272 etc.) — the same fallback is needed there.
- **7.1 data (answered 2026-11-12):** Ryndean has 7.1 NPC and monster data and will hand it over; we don't have it yet. Until then we build against the TVP files in the same formats as stand-ins (`npc/behavior/*.npc`, `monster/monsters/*.xml`, `spawns.dat`), and the converters must take a data folder as input so the 7.1 set can be dropped in. **7.1 map received (2026-11-12):** `C:git	ibia assets	ibia71-tvp-converted` holds `Tibia71.otbm` (a real 7.1 map converted to TVP item ids, saved with Remere's), `Tibia71-house.xml`, `Tibia71-spawn.xml` and an NPC port report. NPC positions were moved over from a TVP 7.4 fork: 259 kept, 6 nudged (worth checking), 70 dropped (no such area in 7.1, e.g. Ankrahmun/Port Hope, or no standable tile), Dalbrect excluded on request. The converter uses this map by default (`--map`); items.otb still comes from TVP. Result: 5.5M tiles, 1650 items, all with sprites, 26 MB of chunks.
- **Ryndean's overlay**: what is it, and how could it know the player's live position? Plan for now: the map can export a route as a list of `x,y,z` positions, so an overlay can draw it in the real game later. To ask Ryndean.
- Which passages are locked behind a quest in 7.6? Make a list from the `.npc` conditions plus TibiaWiki.
- Where does the "balanced" sell option sit between gold and time (e.g. gold per minute)?
- Mana and recasts of haste on long routes: show them or not?
- Can the house planner and the map share client components (as a shared package or a copy)? Remember the Ryndean sync.

## Delivery slices
Agree each slice before building it, then build one at a time.

1. **Map viewer.** A converter turns `map.otbm` into sprite chunks plus overview images for far zoom. A viewer with Google Maps-style pan, zoom and floors, a position readout and shareable links.
2. Places and NPC pins + search (town, NPC, coordinates).
3. Walking router (one floor, then floor changes) + run time with level and speed settings.
4. Boats, carpets, teleports + quest checkboxes.
5. Loot seller, usable without the map: search, backpack, quick entry, monster categories, NPC list + receipt. Because the map is optional here, this slice could also come before slices 2–4.
6. Sell route optimisation (max gold, fastest, balanced), shown in the NPC list and, when it's open, on the map.
7. Map pins, current position, spawn layer, route export for the overlay.

## Decisions made while building

### Slice 1: map viewer (built 2026-11-12, waiting for the user to try it)
- **Converter** `tools/convert-map.js` (`npm run convert`, ~1 min). Readers for dat/spr/otbm/png are copied from the planner. Output goes to `public/map-data/` (about 80 MB). It is generated, so it isn't committed (`.gitignore`), but rerun it after a fresh checkout.
- **Chunks:** 32×32 tiles per JSON file, tiles in row order (`0` = none, a number = a tile with one item, an array = the items). That's 26 MB raw for 7.1, ~11 MB gzipped (7.6 measurements).
- **Overview images instead of minimap colours (2026-11-12).** The user found the switch from sprites (zoom 16) to minimap colours (zoom 8) too hard a transition, and doesn't want a minimap switch either. Measured: drawing the sprites live below zoom 16 is too slow (zoom 8: >10 s to fill a screen; zoom 4: >50 s and a frozen tab). So the converter now pre-draws the map with the real sprites, shrunk to **8 px per tile** (each 4×4 block averaged), and halves that to 4, 2 and 1 px per tile.
  - Images are 1024×1024 px WebP (quality 80), in `overview/<set>/<level>/<bx>_<by>.webp`. The sets: `surface` (floors 7..0 from above, in floor 7's frame) and `8`..`15` (each underground floor alone). Floors 0–6 reuse the surface images, shifted one tile per floor like the client.
  - Total 51.5 MB for 7.1. A screen loads only a few images. The converter now takes ~3 min.
  - It needs `sharp` as a **dev dependency, used only by the converter**, so there's nothing for Ryndean to add.
  - The minimap-colour output is gone.
- **Zoom steps** (screen pixels per tile): 0.25, 0.5, 1, 2, 4, 8 = overview images only; 16 and up = live sprites (roofs come off per building as you zoom over it, see above). From 32 up, a game pixel is a whole number of screen pixels, so it's sharp. The overview images are drawn under the live sprites as a quick placeholder while chunks load.
- **Floors underground** (8–15) are always drawn alone.
- **Controls:**
  - drag to pan, with a short glide after a flick
  - mouse wheel: one zoom step per notch, around the cursor
  - pinch follows the fingers and snaps to the nearest step
  - arrows pan, `+`/`-` zoom, Page Up/Page Down change floor
  - the client's compass rose pans half a screen; the client's zoom and floor buttons (from `Tibia.pic`, as in the planner)
- **Panel:** a 176-client-pixel stone side panel (under the map on phones), scaled with CSS `zoom` to whole screen pixels per client pixel. It shows the floor ("Floor 8 (-1)"), the position under the cursor, and a "Go to position" field (any separators, z optional). Going to a position zooms in to at least 64.
- **Text is plain Verdana 11px for now.** The client's bitmap font, as in the planner, may come later.
- **URL:** `#x,y,z,zoom`, updated 250 ms after the view stops. Pasting a link into the same tab also jumps there. Start position: Thais (32369, 32221, 7) at zoom 32.
- The view centre stays inside the map's bounds.
- **Black squares on grass-stone edges (fixed 2026-11-12, reported by the user at 32427..32430, 32141..32144, 7).** 61 map items in this dat (grass and edge grounds such as 170–181, 244–279) have `patternZ = 2`. The engine picks the set by `z % 2`, as the client does, so floor 7 uses the second set. That set is a different look (rougher stone) and is completely empty for some items, e.g. 272, which drew nothing. **Fix:** an empty sprite in the chosen set falls back to the first set.
- Dev gotcha: Vite only serves public files that existed when it started. After a convert that adds new files, restart the dev server.
- **Not done in slice 1:**
  - water and other animations (phase 0 only)
  - roofs cut away per building
  - the client's bitmap font
