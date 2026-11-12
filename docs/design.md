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
    - **Also underground (2026-11-12, user: "go underground with that ctrl -/+").** Ctrl + wheel is now a depth control:
      - **Going in:** layers come off until only this floor is left, then each step goes a floor down (8..15).
      - **Going out:** up the underground floors to the ground floor (still without roofs), then the layers come back.
      - Floors with nothing on screen are skipped.
      - **Ctrl + `+`/`-`** on the keyboard does the same while the map has focus, instead of the browser's page zoom.
      - **Panel:** "All layers", "Layers from floor N", or "This floor only" (also underground).
      - Tested in Thais: from floor 2 down to 6, then this floor only, then floors 8 to 12, and back up to 7.
    - **Phones: no depth control (decided 2026-11-12).** The user expects little phone use; on phones the floor buttons are enough.
    - Layers don't apply to the far-zoom overview images (below 16).
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

## Slice 2 plan: places, NPCs and search (proposed 2026-11-12, to agree with the user)

**What the 7.1 data gives us**
- **NPC positions:** `Tibia71-spawn.xml` has 265 NPCs with their 7.1 positions (`npcname=`, ported from TVP 7.4; see the port report).
- **Towns:** the map's town list (OTBM TOWNS) has 47 entries with a temple position. That's the real towns (Rookgaard, Thais, Carlin, Kazordoon, Ab'Dendriel, Edron, Darashia, Venore, Fibula, Senja, Folda, Vega, …) plus internal names (Mists, Drefia, Minoroom, Home, …). Ankrahmun is listed but not on the 7.1 map. Use only entries whose temple tile exists.
- **Depots:** lockers (items.xml "locker": 1732–1735, 2589, …) found on the map, grouped per town.
- **Houses:** 677 in `Tibia71-house.xml` (searchable later).
- **Trade and travel:** the `.npc` behaviour scripts (TVP 7.6 as stand-ins until Ryndean's 7.1 files arrive).
  - `"sell","x" -> Type=, Price=` = the NPC buys from you.
  - Plain `"x" -> Type=, Price=` = the NPC sells to you.
  - `Teleport(x,y,z)` with `Price=` = passages.

**Converter → `npcs.json`, `places.json`**
- **Per NPC:**
  - name and position
  - outfit (from `npc/*.xml` look type and colours)
  - buys (item, price)
  - sells (item, price)
  - travel (destination, price, target position)
- Item names come from items.xml. Their icons are added to the sprite atlas.
- **Places:** towns (with temple) and depots.

**Viewer**
- **NPCs on the map**, clickable. How they look is an open question below.
- **NPC window** (client style): name and position; "Buys", "Sells" and "Travel" lists with item icons and prices. A travel destination jumps the map there.
- **Search field** in the panel: towns, depots, NPCs, coordinates. A result flies the map there (animated pan and zoom). An NPC result also selects it and switches to its floor with "This floor only", so it's visible under roofs. That replaces the old idea of cutting roofs per building.

**Answered by the user (2026-11-12)**
- **NPC look: real outfits plus a marker.** Zoomed in, the NPC stands on its tile in its real outfit and colours, like in the game. Zoomed out, a small marker. Both are clickable.
- **Town names: yes, zoomed out only.** Drawn in the client's font over the overview levels, gone once the sprites show.
- **Internal place names: include them.** Mists, Drefia, Necropolis, Minoroom, Home, … are also searchable places, under their internal names.
- **Item search: yes, now.** Typing an item lists the NPCs that buy or sell it, with prices. Picking one flies there.

**Sub-slices** (one at a time)
- **2a.** Converter `npcs.json` and `places.json`; NPC outfits on the map and markers zoomed out; clicking opens the NPC window (buys, sells, travel).
- **2b.** Search (places, depots, NPCs, items, coordinates) with fly-to. An NPC result switches to its floor with "This floor only".
- **2c.** Town names over the zoomed-out map.

## Decisions made while building

### Slice 2b: search (built 2026-11-12)
- **Converter → `places.json`** (`{ n, k: town | place | depot, p }`):
  - **Towns** from the map's town list (OTBM TOWNS), at their temple, only where the temple tile exists: 43 of 47 (Ankrahmun and others aren't on the 7.1 map).
  - REAL_TOWNS (Rookgaard, Thais, Carlin, Kazordoon, Ab'Dendriel, Edron, Darashia, Venore, Fibula, Senja, Folda, Vega, Isle of Solitude) are `town`. The other 30 internal names are `place` (the user wanted them included).
  - **Depots:** found by their lockers (items.xml "locker", 218 on the map). Lockers within 16 tiles of each other on any floor are one depot, since depots span floors (Thais 5–8, Ab'Dendriel 3–8). It's placed on its floor closest to 7 (where you walk in), on the locker nearest the middle there. Named after the nearest **real** town; at first "HellsGate" claimed the Ab'Dendriel depot. Result: 8 depots (Ab'Dendriel, Carlin, Kazordoon, Thais, Edron, Venore ×2, Darashia).
- **Search field** in the side panel replaces "Go to position". It searches places, depots, NPCs, the items NPCs trade, and coordinates.
  - **Ranking:** names starting with the text, then a word starting with it, then containing it; shorter names first; at most 12 results.
  - **Keys:** arrow keys and Enter, or a click; Esc closes the list. Enter with nothing highlighted takes the first result.
- **Picking a result flies the map there** (eased pan, 250–1000 ms by distance). Dragging or zooming stops the flight.
  - **Town / place:** an overview with roofs (zoom 16) from the temple, on the surface unless it's underground.
  - **Depot:** its floor, this floor only, zoom 64 or closer.
  - **NPC:** its floor, this floor only, and its window opens.
  - **Position:** that tile.
  - **Item:** opens the **item window**: icon, "Sold by" (cheapest first) and "Bought by" (best price first), each NPC with its nearest real town; clicking one flies there and opens the NPC.
- Travel buttons in the NPC window fly too.
- **Scrollbars like the house planner (user, 2026-11-12: "the scrollbar is not nice").** The NPC/item window and the search results use the client's 12 px scrollbar: stone track, bevelled thumb, arrow buttons from gui.png (-234/-246, -122). It's the same CSS as the planner with `tm-` names; Firefox gets a thin dark bar.
- Tested: "plate" → plate armor (sold by Kroox, Kazordoon 1200 gp; bought by Willard, Yanni, Turvy, Sam, Shanar 400 gp …); Willard flies to Edron floor 6 with his window; venore / thais dep / al d / coordinates / mists.

### Slice 2a: NPCs on the map (built 2026-11-12)
- **User (2026-11-12): use the 7.6 files for whatever we don't have in 7.1 yet.** Positions are 7.1 (`Tibia71-spawn.xml`). Names, outfits, trade and travel come from the TVP 7.6 NPC files.
- **Converter** (`tools/lib/npcs.js`, `--spawn`): 265 NPCs, 108 traders, 16 with travel.
  - **Travel to places not on the 7.1 map is left out** and logged: Port Hope and Ankrahmun, from Captain Seahorse, Captain Fearless, Captain Bluebear and Petros.
  - **Trade lines:** `"sell",…` = the NPC buys from you; otherwise the NPC sells to you. Price per piece; packs (Amount other than 1 or %1, e.g. sixpacks of worms) are skipped. `Data=` is the fluid type (e.g. "vial of oil").
  - **Travel:** a keyword with `Price=` and `Topic=N`, whose `Topic=N,"yes"` line has `Teleport(x,y,z)`.
  - **Outfits** are pre-coloured in the converter, using the client's 133-colour palette and the outfit's colour mask, facing the spawn direction, standing frame. They go into `npcs.png`; a `typeex` look uses the item's sprite.
  - `items.json` now has item names (`n`) and fluid names; traded items are added to the sprite atlas for their icons.
- **On the map:**
  - **Zoom 32 and closer:** NPCs are drawn on their tiles, after the tile's items like the client draws creatures, so walls south and east of them overlap as in the game. They come off with their floor's layer.
  - **Zoomed out (below 32):** small yellow markers with a black border (white when selected). Floors 0–7 are shifted like the client draws them; underground, only that floor's NPCs.
  - The selected NPC gets a thin white frame around its tile.
- **Click** (a press without dragging) on an NPC opens it, on the outfit or its tile, or within 6 client px of a marker. A click elsewhere closes it. The mouse cursor becomes a pointer over NPCs.
- **NPC window** (side panel, client style, scrolls):
  - name and position
  - **Sells** and **Buys**: item icon in a slot, name, price per piece, sorted by name
  - **Travel**: buttons with price ("free" for 0) that jump the map to the arrival spot
- Tested: Al Dee (sells 26, buys 24); Captain Bluebear → Edron jumps to the Edron ship.
- **Changed after user feedback (2026-11-12): main level and NPCs over the roofs.**
  - **Main level** (user: "when you zoom in close enough it should go to the main level, … main level is the most important level; around Venore it should go to +1, as that is where the normal roads are"):
    - Zooming in to 64 (MAIN_FROM) switches to the main level of the place zoomed into, "This floor only". From there Ctrl + wheel goes up or down. Zooming back out below 64 brings the roofs back.
    - The main level is floor 7, except in MAIN_LEVELS: Venore x 32915–33060, y 32015–32140 → floor 6. The box comes from where floor 6 has many ground tiles (the raised streets around the temple at 32957,32076).
    - The same applies to links opened at zoom 64+, Go to and travel jumps (that floor only), the floor buttons (zoomed in: this floor only), and pinch.
    - Underground (after Ctrl + wheel) the floor stays as it is.
    - This brings back the earlier "inside at 64" switch, now with the main level and Ctrl + wheel to move from it.
  - **NPCs** (user: "the yellow markers are a little small, maybe just show the NPC outfit and name over the roofs"):
    - The markers are gone. NPCs are drawn over everything (roofs too) from zoom 4, back to front, with their names from zoom 16.
    - **Names:** the client's outlined font (`font-outlined.png` + `fonts.json` from Tibia.pic, text.js from the planner), centred above the outfit, green #00c000 like a creature at full health, white when selected.
    - **Outfit size:** zoomed out, outfits keep at least 0.75 of their client size (24 client px per 32), so they stay findable like map pins. Name scale: whole screen pixels per font pixel, at least the panel's.
    - They're no longer drawn inside the chunk canvases, so walls in front of them don't cover them any more.
    - **Clicking:** the outfit, its tile or its name opens the NPC; the front-most wins.
    - The white frame around the selected NPC's tile shows from zoom 32.
  - Tested: Thais at 32 (names over roofs), 32 → 64 (this floor only), Venore 32 → 64 (floor 6), Thais at 8.
- **Known:**
  - The close button is a plain "×" for now.
  - One NPC in the sheet has no picture (empty outfit).
  - Names can overlap where NPCs stand close together.

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
