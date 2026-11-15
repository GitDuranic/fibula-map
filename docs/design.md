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
- ~~Passages locked behind a quest are shown as checkboxes~~ → replaced by **locked doors with keys** (2026-11-13, user):
  - Locked doors block routes by default.
  - Each one shows the key it needs (icon, name, key number) and can be unlocked by clicking it. It then looks open, with the key still shown.
  - A tick opens all locked doors at once.
  - 7.1 has no quest or level doors.
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
  - 2026-11-15: `assets/map71/Tibia71.otbm` replaced by Ryndean's **border fix batch 1** (`Tibia71-borderfix-1.zip`): 37,525 ground tiles with a built-in border (84 kinds: grass, sand, …) became a plain ground + a normal border item; tile count and everything else unchanged. He made it with `replace_solid_borders.py` + `solid_border_map.csv` (in `tibia assets`, reference only - his server layout, we don't run it); 409 kinds (~155k tiles) are still unmapped, so later batches are expected: swap the map in and reconvert.
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
- ~~Which passages are locked behind a quest?~~ Answered 2026-11-13: 7.1 has no quest or level doors; the user chose locked doors with keys instead (slice 4c–4e).
- Where does the "balanced" sell option sit between gold and time (e.g. gold per minute)?
- Mana and recasts of haste on long routes: show them or not?
- Can the house planner and the map share client components (as a shared package or a copy)? Remember the Ryndean sync.

## Delivery slices
Agree each slice before building it, then build one at a time.

1. **Map viewer.** A converter turns `map.otbm` into sprite chunks plus overview images for far zoom. A viewer with Google Maps-style pan, zoom and floors, a position readout and shareable links.
2. Places and NPC pins + search (town, NPC, coordinates).
3. Walking router (one floor, then floor changes) + run time with level and speed settings.
4. Boats, carpets, teleports + ~~quest checkboxes~~ locked doors with keys (built).
5. **Routes across floors** (added 2026-11-13): the route shows the step onto holes and stairs; route lines on other floors; seeing through the ground along an underground route; a preview of the floor above or below when hovering a hole or stairs.
6. **Monsters** (added 2026-11-13): spawns on the map, monster window (HP, XP, loot with drop chances), from loot to the sellers, a Back button, monster search.
7. Loot seller, usable without the map: search, backpack, quick entry, monster categories, NPC list + receipt. Because the map is optional here, this slice could also come before slices 5–6.
8. Sell route optimisation (max gold, fastest, balanced), shown in the NPC list and, when it's open, on the map.
9. Map pins, current position, route export for the overlay. (The spawn layer moved to slice 6.)
10. **Chests and quests** (asked for 2026-11-13, see its plan; order not agreed yet): what's in chests, and quests marked with their name.

Slices 5 and 6 were added on 2026-11-13; the slices after them moved up by two (the loot seller was 5).

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

## Slice 3 plan: walking route and run times (proposed 2026-11-12, to agree with the user)

**What the data gives us** (TVP; the 7.1 map uses TVP item ids)
- **Walkable** means a ground item and nothing on the tile that blocks movement (items.otb "block solid", the client's NOT_WALKABLE).
- **Ground speed** per tile comes from the ground item (the dat's GROUND value: grass, road, swamp, …). It's needed for run times.
- **Floor changes:**
  - **Stepping on:** stairs, ramps and holes (items.xml `floorchange`: down 41 items, north/south/east/west 24).
  - **Using:** ladders 1386, 3678 (up) and sewer grate 430 (down), from `actions/other/teleport.lua`.
  - **Rope:** rope spots 384, 418 (`ropeSpots` in global.lua).
  - **Shovel:** loose stone piles 468, 481, 483 become holes (`holes`).
- **Doors** (global.lua): closed doors open on use; there are also locked doors (key), quest doors, level doors and house doors.
- **Speed** (TVP source, see "Run times" above): step time = ceil50(1000 · ground speed / speed); a diagonal costs ×3, so a fastest route only goes diagonal when that saves time.

**Sub-slices**
- **3a. Walk data.** The converter writes, per tile, walkable yes/no plus its ground speed, and a list of floor-change links (from, to, kind: stairs / hole / ladder / grate / rope / shovel / door type). A hidden debug view (`?debug=walk`) shows walkable tiles and links, to check them against the game.
- **3b. Route.** A* path search in a web worker, over the tiles and links. Start and destination are set on the map or from search. The route is drawn as a line on the map (dimmed on other floors) with markers where the floor changes. The panel shows the distance in tiles and the floor changes.
- **3c. Run time.** Character settings: level, haste / strong haste, boots of haste. The time per step uses the ground speed and diagonals; floor changes get their own cost. The panel shows the total time.

**Answered by the user (2026-11-12)**
- **Doors: ignore them.** Every door counts as open (normal, locked, quest, level and house doors). This is simplest, but a route may go where a normal player can't.
- **Rope and shovel: always.** Routes may use rope spots and dig loose stone piles, with no checkboxes.
- **Start and destination, all three ways:**
  - a right-click menu on the map ("Route from here" / "Route to here", client style)
  - From / To fields in the side panel that use the search
  - "Route here" buttons (NPC window, search results)
- **Haste: always on, plus casts.** Haste is assumed to be recast the moment it runs out. The run time shows how many casts the route needs, and the mana.

## Slice 4 plan: boats, carpets and teleports (proposed 2026-11-13, to agree with the user)

**What the data gives us**
- **NPC passages:** 16 NPCs with boats or carpets (already parsed in 2a): price, destination tile. Passages to places not on the 7.1 map are already left out.
- **A quest discount:** almost every boat and carpet line has a second, **cheaper price with `QuestValue(250)>2`** (e.g. Captain Seagull → Thais 130 gp, 120 with the quest). The parser currently ignores those lines, so routes use the normal price.
- **The Oracle** (Rookgaard) sends you one way to Thais, Carlin, Venore or Edron (`Teleport` per choice, level 8 needed).
- **Magic forcefields** (item 1387 with a teleport destination): 64 on the 7.1 map. Some have destination 0,0,0 (scripted or broken) and are left out.

**Sub-slices**
- **4a. Data.**
  - The converter adds links: `teleport` (forcefields, stepped onto like stairs), `npc` (a passage: from the tiles near the NPC, with price and NPC name) and `oracle` (one way from Rookgaard).
  - The debug view shows them.
- **4b. Route.**
  - The router uses them, with a time per passage (talking to the NPC) and the gold.
  - The panel lists the route in legs ("Walk to Captain Bluebear, Thais → boat to Carlin, 110 gp → walk …") with total time and gold.
  - On the map a passage is drawn as a jump (an arc) between the two harbours.

**Decided with the user (2026-11-13):**
- **No quest discount.** The cheaper price is the grand postman rank from the Postman Missions (Kevin Postner, `QuestValue(250)`), which very likely came after 7.1. Routes use the normal price. To check again when Ryndean's 7.1 NPC files arrive.
- **Two routes: fastest and cheapest.** The panel shows both when they differ.

- **2 seconds per passage** for talking to the NPC (players type the combo fast), on top of the walk to the NPC.
- **The Oracle** is used only when the character's level is 8 or higher (the level setting in the route panel).

## Slice 4c–4e plan: locked doors and keys (agreed with the user 2026-11-13)

**What the data gives us** (scanned 2026-11-13)
- The 7.1 map has 309 locked doors, but only 4 carry a key number (3 on Rookgaard, 1 near Venore). The numbers seem to have been lost when the map was converted to TVP format.
- **The TVP 7.6 map** has numbers on 109 of its 379 locked doors. 101 of those are at exactly the spot of a 7.1 locked door (65 different keys), so about 105 doors get a known key.
  - The other ~200 doors have no number in either map. Only Ryndean's original 7.1 files could fill them in.
  - 9 numbered 7.6 doors aren't locked doors on the 7.1 map and are left out.
- Keys (wooden, copper, silver, golden, …) carry the number. A door only has the number, so a key's look and name come from keys with that number lying in chests on either map. Otherwise it's a plain key, "Key 3801".
- Unlocking: a locked door turns into the open door (server id + 2, TVP doors.lua).

**Sub-slices**
- **4c. Data:** the converter adds each locked door with its key number (from 7.1, else 7.6 at the same spot) and the matching key's look and name.
- **4d. Map:**
  - Locked doors show the key's icon.
  - Clicking one gives a small window with the key's icon, name and number, and an Unlock/Lock button.
  - An unlocked door is drawn open, with the key still shown.
  - A tick "Open all locked doors".
  - Remembered in this browser.
- **4e. Routes:** locked doors block routes until unlocked (or all opened). Doors with an unknown key work the same way, labelled "key unknown".

## Slice 5 plan: routes across floors (asked for 2026-11-13, sub-slices to agree)

**What the user asked for**
- **The step onto the hole, stairs or ladder.**
  - Today the route line stops on the tile before a hole or stairs and then jumps to where you land. So you can't see *which* hole to take, and sometimes two holes are next to each other.
  - The route must always show the step onto the hole, stairs, ramp or grate itself. For things used from next to them (ladders, rope spots), it shows the tile that is used.
- **Route lines on other floors:**
  - Above the ground (floors 0–7), the yellow line may show on all floors, as now.
  - Underground, the line shows at most **2 floors below** the current floor, more see-through the further away the floor is.
- **Seeing where you go underground** (an experiment):
  - Where the route goes down, the floor you're on becomes see-through *along the path*, so you can see the floor underneath with the route on it.
  - At most 2 floors deep, each one fainter, like the route line.
- **Hover preview without a route:**
  - Hovering a hole, stairs, ladder or other floor change shows the floor it leads to (below or above) around that spot, in the same see-through way.
  - Clicking it goes to that floor.

**Sub-slices (proposed)**
- **5a. The step onto floor changes.** The router keeps the link tile in the path, without changing the time (the step onto it is the move to the other floor). The line goes onto the hole or stairs. For things used from next to them, a short line marks the tile that is used.
- **5b. Route lines on other floors.** Above the ground: all floors (as now). Underground: up to 2 floors below the current one, fading (e.g. 55 % and 30 %).
- **5c. See-through along the route.** A band along the path (e.g. 3 tiles on each side) where the floor drawn on top becomes see-through and up to 2 floors below show through, fainter with depth, with their part of the route.
- **5d. Hover preview and click to change floor.** The same see-through drawing in a small area around a floor change under the mouse; a click goes to the floor it leads to (keeping this-floor-only).

**Decided with the user (2026-11-13)**
- **The see-through band and the hover preview fade out at the edge:** fully see-through for 3 tiles from the path (or from the hole or stairs), then fading out over a few more tiles (e.g. to 6) and very faint there.
- **Going up shows through too:** the floor above along the path, and in the hover preview of stairs and ladders going up.
- **Slice 5 (routes) is built before slice 6 (monsters).**

**Still open** (my proposal, unless the user says otherwise)
- How see-through the top floor is inside the band: to try out while building 5c.
- A click on a hole or stairs with an NPC or locked door on it: the NPC or door first, then the floor change.

## Slice 6 plan: monsters (asked for 2026-11-13, sub-slices to agree)

**What the user asked for**
- **Spawns on the map.** Click a monster to see its HP, XP and loot (with drop chances).
  - From an item in the loot you see where it can be sold, and you can fly to the seller.
  - A **Back** button returns to where you were.
- **A whole spawn.** Where a spawn has different monsters, a user-friendly way to see all of them and all the loot you can get there.
- **Floors:**
  - Monsters show **only on the floor they spawn on**.
  - NPCs stay drawn over roofs, but **not through the ground**: an underground NPC isn't drawn on the surface.
- **Search:**
  - Monsters can be searched. All monsters of that kind are drawn **bigger**, and the view zooms to fit just them.
  - While searched, they show even when they're on another floor. Clicking one goes to its floor.

**What the data gives us** (checked 2026-11-13)
- **Spawns:** the 7.1 spawn file has 3,941 monster entries: centre x, y, z, monster name, amount, radius, spawn time.
  - Example: "dwarf guard, amount 3, radius 1" at 32587,31927,1.
- **Monsters:** TVP has 158 monster files (`data/monster/monsters/*.xml`, 7.6 stand-ins until Ryndean's 7.1 data arrives): name, experience, health, outfit (look type + colours), corpse and **loot with drop chances**.
  - Chances are out of 100,000, e.g. rotworm gold coin 30000 = 30 %, katana 300 = 0.3 %.
  - Loot can be nested in containers (bags inside the corpse).
- **TibiaWiki** (`tibiawiki/creatures.json`, 2,846 entries): only the name and the version a creature was added in, **no drop chances**. So the chances come from the TVP files.
  - The "implemented" version can flag monsters that didn't exist in 7.1.
  - If wiki drop chances are wanted, the wiki loot statistics would need to be fetched separately; to ask.

**Sub-slices (proposed)**
- **6a. Data.** The converter writes monsters.json and the outfits (as for NPCs).
  - monsters.json: name, HP, XP, outfit and loot (item, max count, chance) for each kind; spawns as [x, y, z, kind, amount, radius].
  - Spawn points close together on the same floor become one **spawn group**, e.g. within 10 tiles.
- **6b. On the map.**
  - Monsters are drawn on their own floor only, standing still, at their spawn.
  - Clicking one opens a **monster window**: HP, XP, loot (with drop chances only if a 7.1 source is found, see below).
  - Clicking a mixed spawn group (a spawn button or the group's outline) opens a **spawn window**: every kind in the group with amounts, and all the loot you can get there.
  - The NPC rule: underground NPCs aren't drawn on the surface.
- **6c. From loot to the seller, and Back.**
  - An item in the loot opens the item window (who buys it, for how much). Clicking a seller flies there.
  - A **Back** button (and the browser's back key) returns to the previous view and window: a history of view + open window.
- **6d. Monster search.**
  - Monsters in the search. Picking one draws every monster of that kind bigger, on every floor, and zooms to fit them all.
  - Clicking one goes to its floor. Clearing the search ends it.

**Decided with the user (2026-11-13)**
- **Counts are allowed on the map:** monsters of one kind spawning close together are drawn as **one monster with "2x", "3x", …**.
  - Zoomed in far enough, they split into one monster on each tile that spawns them.
  - This is an exception to the earlier "no text on the map" preference: the user asked for it.
- **Drop chances only from TibiaWiki for 7.1, else none:** the user doesn't want wrong rates shown.
  - The TVP (7.6) chances are not shown. Without a 7.1 source the loot list has no percentages.
  - ~~To check in 6a: whether TibiaWiki has 7.1-era drop chances at all.~~ Checked 2026-11-13: **it doesn't.** The oldest loot statistics on TibiaWiki are "after Update 8.2" (2008); Rotworm and Dragon go from 8.2 to 8.6 (2010) and later (Dragon also 13.21, 2023). So the loot shows **without chances**.
- **Monsters show from zoom 16** (to start with).
- Slice 5 (routes) comes first.

**Still open** (my proposal, unless the user says otherwise)
- How close together counts as one spawn group, and as "close together" for the count: 10 tiles on the same floor for the group; same kind within the spawn's radius for the count.
- The zoom where counts split into single monsters: 64 to start with.
- Which loot to list when the TVP list doesn't match 7.1 (it's a 7.6 stand-in): the TVP items, until Ryndean's 7.1 monster files arrive.

## Slice 10 plan: chests and quests (asked for 2026-11-13, to agree with the user)

**What the user asked for:** "fill chests around the world with what spawns in them, and mark quests (use wiki for 7.1 data) with their quest name".

**What the data gives us** (scanned 2026-11-13)
- **The 7.1 map** (converted) has almost nothing:
  - Only 259 containers hold items, and those are decoration: 215 bookcases with books, 15 chests (keys, a scale armor, books, gold), drawers, dead humans, barrels.
  - No container has an action or unique id, so there are no quest markers.
  - At many quest spots the chest itself seems lost in the conversion, while its reward lies on the floor (e.g. a copper key on a dirt floor where the 7.6 map has a quest chest).
- **TVP 7.6** (`data/scripts/actions/map/quests.lua`): 222 quest chests by action id (1000–2000), each with its reward: items, keys with numbers, bags with contents, books with text. The Annihilator's 4 rewards are separate.
  - 216 of them are placed on the 7.6 map: chests, boxes, dead humans, piles of bones, coffins, dead trees, and so on.
  - Against the 7.1 map:

    | On the 7.1 map | Quest spots |
    |---|---|
    | The same item on the same tile | 53 |
    | The same item on a neighbouring tile | 16 |
    | The tile exists, with other items (sometimes the reward lying there) | 110 |
    | No tile (areas not in 7.1) | 37 |

  - The rewards are 7.6 stand-ins and may differ in 7.1.
- **Quest names:** neither the map nor TVP has them. They would come from TibiaWiki: its quest pages give the name, the version it came in, the location (often with map coordinates) and the reward.
  - The wiki refuses the fetch tool but can be read in the browser.
  - Matching a quest to a chest would be by position and reward.

**Decided with the user (2026-11-13):** the chests on the 7.1 map are the ones that count; what's in them for 7.1 comes from TibiaWiki, plus the quest's name if it's a quest. Reading the wiki in the browser is OK.

**Slice 10a findings (2026-11-13)**
- **The 7.1 map** has 1,927 chest-like items (465 chests, 575 boxes, 887 crates), nearly all empty decoration.
- **TibiaWiki, read in the browser** (the API from the page; the fetch tool is refused). Saved in `tools/data/wikiquests.json`.
  - 46 quest overview pages say they came in 7.1 or earlier; another 41 give no version (e.g. Life Ring, Power Ring, Mintwallin). 87 quests in all, 65 with coordinates in their spoiler.
  - **The coordinates are mostly entrances and route points** ("go down the hole here"), not the chests, which are usually floors deeper. Several unversioned quests share 32356,32171,7, a placeholder.
  - **The reward is per quest, not per chest.**
  - Getting the data out of the browser: the tool returns ~1,300 characters per call, a download was blocked (no user click), and Chrome won't let a public page post to localhost. What worked: put the JSON in the page as text and read it with the page-text tool.
- **Matching** (script: TVP quest chests' contents and 7.6 positions against the wiki rewards, within 200 tiles of the quest's coordinates):
  - 72 of the 87 wiki quests found their chests, e.g. Katana Quest (katana, viking helmet: 32174,32149,11 and 32175,32145,11), Time Ring Quest (3 chests at 33038–33040,32171,9), Black Knight (crown armor, crown shield, floor 11).
  - **But many of those chests are missing from the converted 7.1 map.** Of the 216 TVP quest chests, only 69 have a chest or box on the 7.1 tile (or next to it). At the others the tile has only its floor (dirt, muddy floor, marble): the chest was dropped when the map was converted to TVP format, e.g. Rapier Quest (32099,32198,9), Ring Quest (33131,31624,15), Thais Lighthouse (32225,32265,10).
  - Of the 146 chests matched to a wiki quest, 47 are on the 7.1 map.

**Decided with the user (2026-11-13), after the findings**
- **Start with the 47 quest chests that are on the 7.1 map.** The ones missing from the converted map wait (perhaps Ryndean's original map has them).
- **Contents: only what the wiki confirms for 7.1** ("just the wiki for 7.1 items"): items in the chest that the wiki's reward names. Anything else (a vial the wiki doesn't mention) is left out.
- **On the map: a chest icon with the quest's name as a label.**
- **Slice 10 comes before the loot seller** (the user isn't sure the loot seller is still wanted).

**Sub-slices**
- **10b. Data:** the converter matches the quest chests itself and writes quests.json (quest name, version, wiki reward text, and per chest its 7.1 position and the confirmed items).
- **10c. On the map:**
  - A chest icon on each quest chest, with the quest's name as a label.
  - Clicking it opens a quest window: name, version, what's in this chest (items open their item window), and the quest's whole reward as the wiki gives it.

## Decisions made while building

### Minimap (built 2026-11-15, asked for by Ryndean)
- **Where:** at the top of the side panel, where the client has its minimap. It **replaces the compass rose**: dragging the map does the same job, and the arrow keys still pan. The zoom and floor buttons stay under it as before, with the floor and layer lines beside them.
- **What it shows:** like the client's minimap, the map's floor only, each tile one pixel in its automap colour (not the sprites). The converter writes these again as `minimap/<z>/<mx>_<my>.png` (256×256 tiles per image, 1 px per tile, about the same code as the minimap colours that were dropped from the far zoom on 2026-11-12): a tile's colour is the automap colour of the last item in its stack that has one, from the client's 8-bit palette.
- It **follows the map's zoom**: at zoom 32 it has 1 client pixel per tile, the client's own minimap scale, and further out it stops once the whole world fits. Zoomed in it shows sharp squares; shrunk below 1 px per tile it's smoothed. The map's view is a white frame on it.
- It is centred on the map's centre, except near the world's edge, where it stops at the edge and the frame moves off centre instead.
- **Click** on it: the map goes there (same floor, zoom and layers). **Drag** it: the map is pulled along, like dragging the map itself but faster. Hovering shows the position under the mouse.
- Size: `MINI_W` × `MINI_H` (158 × 158 client pixels, inside a 1 px inset border); the scale is `MINI_PER_TILE` in `TibiaMap.jsx`.

### Faster routes (built 2026-11-14, user: "path finding is kind of slow")
- **Measured first** (Node benchmark on the real data, level 8, no haste):
  - The slow part was the cheapest route: walking only, and walking routes wind around water and mountains, so the search covers 200k–600k tiles.
  - "No route" searched the whole map twice (locked doors closed, then all open): 6–14 s.
  - Each tile cost about 5 µs, mostly bookkeeping: Maps with large number keys, small arrays, and an estimate that looked at every passage and forcefield for every tile.
- **Ideas considered and dropped:**
  - A quick first path, improved afterwards: the usual way (weighting the estimate ×2, so the search heads straight for the goal) made it 2–4 times *slower*. Islands and winding tunnels lead the straight line into dead ends.
  - Ignoring ground speed behind a checkbox: a tighter estimate only saved 5–20% of the work, and routes would no longer be the fastest. Level and character speed cost nothing in the search: level only decides the Oracle, and speed scales every step equally.
  - A Fastest/Cheapest mode switch before searching: the user preferred showing the fastest first and the cheapest after.
- **What was built** (the routes are exactly the same as before: steps, gold and time, checked on 6 routes):
  - **Fastest first:** the fastest route is shown as soon as it's found. When it costs gold, "Looking for a cheaper way..." shows while the cheapest is searched, and the Fastest/Cheapest buttons appear when a cheaper one exists. A new route request (or Clear route) stops that search: it pauses every 65,536 tiles to let messages in.
  - **Typed arrays:** every tile has a number (its place in walk.bin), and tiles the search uses (walkable, or a link's start or end) have a compact number, so the bookkeeping is in typed arrays reused between searches. Links and locked doors are flagged per tile, so most neighbours need no lookup. Neighbours inside a chunk are found by offset (±1, ±32).
  - **A better estimate:** Manhattan distance instead of Chebyshev (a diagonal step costs 3 straight ones, so walking takes at least the Manhattan distance in steps). It's worked out once per tile per search. For the cheapest route, passages that cost gold are left out of it.
  - **"Not connected" at once:** at load, the map is split into walking areas (all doors open; stairs, holes and forcefields don't join areas), joined one way by floor changes and passages (with their level). A small search over that graph rules out impossible routes before the real search. Locked doors still need the real search (with doors, then all open).
- **Result** (same machine; before: both routes together):

  | Route | Before | Fastest shown | Cheapest too |
  |---|---|---|---|
  | Thais → Carlin | 3.0 s | 20 ms | 0.3 s |
  | Thais → Darashia | 5.8 s | 73 ms | 0.5 s |
  | Fibula → Demona | 7.1 s | 0.3 s | 0.6 s |
  | Thais → Fibula dragons (not connected) | 12.3 s | 1 ms | – |

  - Loading the router (once, on the first route) takes about 0.3 s and 54 MB.
- **Later, if long routes are still too slow:** a network of main routes prepared by the converter (hierarchical path finding).

### Named locations (built 2026-11-13, user)
- **What the user asked:** add searchable locations by right-clicking → "Add location here" and typing a name; more than one name per square; the names are searchable. "Later on we can remove the function to add locations … I just want to use this to mark some locations with new names."
- **Stored in the repo** (`tools/data/custom-places.json`, `[{ n, p }]`), so the names stay when the adding goes. The dev server has a small endpoint for it (`/__custom-places` in vite.config.js: GET the list, POST `{ add }` or `{ remove }`); the file is kept out of Vite's file watching.
- **Right-click menu:**
  - "Add location here" opens a name field in the menu (Enter or Add saves, Escape cancels; up to 60 characters).
  - Each name already on that square shows as "Remove '…'" (for typos).
  - Only when the dev server answers, so on a built site (Ryndean's) the menu doesn't offer it.
- **Search:** the names are "Location" results; picking one flies to the square (a jump, Back returns). New names are searchable at once.
- **The converter** adds them to places.json (kind `custom`), so they're searchable without the dev server too. In development the live list from the dev server replaces those.
- A failed save shows as a line under the search, not over the map.
- Seen in the browser: two names on one square in the Thais temple, both found in the search, both removed again (the file is empty).

### Slice 10b–10c: quest chests on the map (built 2026-11-13)
- **10b, data** (`tools/lib/quests.js`, quests.json `[{ n, v, reward, chests: [{ p, id, items: [[id, count, key?]] }] }]`):
  - The converter's pass over the 7.6 map (for key numbers) also notes every item with an action id 1000–2000: TVP's quest spots (220).
  - **On the 7.1 map** (changed after user feedback): the user pointed out that quest items don't only come from chests ("like the blood herb quest, you click a tree in 7.1").
    - The first rule (the same object on the 7.1 tile, or next to it) found only 69 spots. The 7.1 map often has another object there: a chest where 7.6 has a box, a sycamore for a dead tree, the Paradox Tower rewards lying on a counter.
    - Now: on the spot itself any object that isn't ground or a wall counts; next to it, the same object or any container-like one (chest, box, crate, coffin, dead body, …). That gives 97 spots on the 7.1 map.
  - **The quest:** a spot belongs to a wiki quest when the wiki's reward names items TVP has there (keys by number, "Key 4603"), and the spot is within 200 tiles of the quest's coordinates. The shared placeholder 32356,32171,7 doesn't count; a quest without coordinates needs two items in common.
  - **Contents: only the items the wiki names**, with the wiki's count where it gives one ("30 Burst Arrows", "two …"); bags and backpacks aren't shown.
  - **Result: 55 spots in 31 quests**, e.g. Time Ring Quest (3), Katana Quest (3), Minotaur Hell (4), Demon Helmet (4), Black Knight (2), Blood Herb (1), Alawar's Vault (3).
- **10c, map:**
  - From zoom 16, where their floor is shown (`npcFrame`): each quest spot gets a gold ring (white when its window is open) with the spot's item inside, and the quest's name in gold above each group of its spots (same floor, within 6 tiles).
  - **Quest window** (click a spot; after NPCs and searched monsters, before monsters and doors): the quest name, the version ("Came in 7.1" / "Version unknown"), the position, how many spots, "Found here" (the confirmed items; click for the item window), and the quest's whole reward as TibiaWiki gives it.
  - **Quests are in the search:** picking one jumps to its first spot and opens its window (Back returns).
- Seen in the browser:
  - The Time Ring Quest's three chests at 33038–33040,32171,9 with the label; the middle one holds the time ring.
  - "Blood Herb" in the search flew to the dead tree in the swamp (32769,31968,7), with the blood herb.
- Not yet: the quest chests that are missing from the converted 7.1 map (see the plan).

### Slice 6d: monster search (built 2026-11-13)
- **Monsters are in the search** ("Monster" results): every kind that spawns on the map.
- **Picking one:**
  - Every monster of that kind is drawn **bigger** with a **gold ring**, on **every floor** and at every zoom (also zoomed far out, where other monsters aren't shown). Those on other floors are fainter (55 %).
  - The size is 1.5× the normal monster size, but never smaller than 60 % of the game size, so zoomed far out they don't crowd each other. Counts ("3x") sit at the ring's bottom right.
  - Markers and the split per tile from zoom 64 work as for other monsters (6b).
- **The view fits them all**: centred on their spawns, at the closest zoom (up to 32) where they all fit, ~~on the floor where most of them are~~ **on the surface, floor 7** (user, 2026-11-13: it sometimes went underground). Those on other floors show there, fainter, with their ring. This is a jump, so Back returns.
- **Clicking a searched monster**: on another floor, the map goes there (a jump, zoom at least 32), then opens its monster window; on this floor, just the window. Within a ring counts as a hit; this floor's monsters come first, then the nearest.
- **The search ends** when the search field is cleared or another result is picked.
- Seen in the browser: "Dragon" fitted all dragon spawns at zoom 1 on floor 10 (most dragons are there). Clicking the one between Ab'Dendriel and Edron went to floor 9, where its spawn shares a group with 4 orc leaders, and opened the window.

### Slice 6c: from loot to the seller, and Back (built 2026-11-13)
- **From loot to the seller** came with 6b: a loot item opens its item window (sold by / bought by, best price first). Clicking an NPC there flies to them and opens their window.
- **Back:**
  - Before each **jump**, the map remembers where you are: the exact view (position, floor, zoom, layer cut) and the open windows (NPC, monster, locked door, item).
  - Jumps are: picking a search result (place, NPC, depot, position), an NPC in an item window, and a boat trip in an NPC window. Panning, zooming, clicking things on the map and fitting a route are not jumps.
  - The **Back** button (next to Route above the search) returns to the last place remembered, with its windows. It's greyed out when there's nothing to go back to. Up to 50 places are kept.
  - **The browser's back key does the same** when the map keeps its view in the URL (`syncUrl`):
    - Each jump marks the current history entry (`tmBack`) and adds a new one.
    - Going back to a marked entry restores that place.
    - The hash updates keep that mark (`replaceState` with the current state).
    - The Back button then simply goes back in the browser's history, so both stay in step.
  - Embedded without the URL (Ryndean's site, `syncUrl` off), only the button works, from its own list.
- **Home** (added 2026-11-13, user: "its easy to get lost"):
  - The Home button (next to Back) and the Home key show the whole world: the surface (floor 7) with all layers, centred on the map's bounds, at the closest zoom step where it fits (0.5 on a normal screen).
  - It's a jump, so Back returns to where you were.
- Seen in the browser: troll spawn → wooden shield (loot) → Willard in Edron (flew there) → Back: the troll spawn again, with the troll and wooden shield windows open.

### Slice 6b: monsters on the map (built 2026-11-13)
- ~~Only on the floor they spawn on~~ → **where their floor is shown** (fixed after user feedback, 2026-11-13), from zoom 16 (`MONSTERS_FROM`), drawn under the doors' keys and the NPCs, at the same scale as NPCs.
  - The user: "Some monsters are missing? I don't see the 2 dragons above Edron, did I say we shouldn't draw monsters that are upstairs?" They spawn on floor 6 (33100,31696 and 33089,31702), on the mountain.
  - The first version drew only the floor being looked at. But on the surface the map draws floors 0–7 together, so 314 spawn points on floors 1–6 were missing.
  - Now the NPCs' rule (`npcFrame`): underground only their own floor; on the surface every surface floor that is drawn (above the layer cut), shifted like that floor. So "only the floor they spawn on" means not through the ground, not hiding upper surface floors.
  - Seen in the browser: both dragons on the mountain above Edron from floor 7 at zoom 16.
- **Markers** (zoom 16–32):
  - Monsters of one kind in one spawn group, within 3 tiles of each other (chained), are one marker. It shows one outfit with "3x" in the client's outlined font (white) at the tile's bottom right, at the spawn point nearest their middle.
  - The count is all of them together (spawn amounts added up).
- **One per tile** from zoom 64 (`MONSTERS_SPLIT`): each spawn point's monsters stand on their own tiles, spread from the centre outwards within the spawn's radius.
  - The server picks random tiles in the radius, so this only shows *about* where they are.
  - It doesn't check whether the tile can be walked on (that would need the 7 MB walk data on the page).
- **Monster window** (click a monster; NPCs come first, then monsters, then locked doors, then floor changes):
  - The monster's outfit, HP and XP, and the loot (icon, name, "up to N"). The note "No drop chances: none are known for 7.1" sits under the loot.
  - Clicking a loot item opens its item window (who sells and buys it); the monster window stays open.
  - **A spawn with more than one kind** lists them at the top ("In this spawn": outfit, name, total count; click to switch) plus "All loot in this spawn": every item any of them drops, with the highest max count and who drops it, e.g. "meat (troll, wolf), up to 2".
  - The monsters of the chosen kind in that spawn group (or all of them) get a white frame on the map.
- **NPCs underground** were already only drawn on their own floor (`npcFrame`), so they don't show through the ground on the surface. Nothing to change.
- Seen in the browser near 32463,32242 (Troll 8x + Wolf 3x in one group): "3x" and "5x" markers at zoom 32, the window with both kinds, all loot, and at zoom 64 the 3 wolves and 5 trolls each on a tile.
- Note: at zoom 16–32 the sprites are at their game size, so small monsters (wolves, rats) are easy to miss. Monster search (6d) will draw them bigger.

### Slice 6a: monster data (built 2026-11-13)
- **monsters.json + monsters.png** (`tools/lib/monsters.js`), written by the converter:
  - `kinds`: [{ n name, hp, xp, img [x, y, w, h] in monsters.png, d displacement, loot [[client id, max count]] }]
  - `spawns`: [[x, y, z, kind, amount, radius, group]]
- **Spawns:** from the 7.1 spawn file (`--spawn`): 3,941 spawn points, 10,103 creatures, 71 kinds. Names are matched to the TVP monster files case-insensitively; all 71 have one.
- **Stats, outfits and loot** come from the TVP monster files (7.6 stand-ins). Outfits are drawn facing south with their colours, as for NPCs; all 71 have one.
- **Loot:** the items and their max count. Two lines of the same item are added up (dragon gold coin 60 + 45 = up to 105).
  - **Drop chances are not read at all**, so they can't show by mistake: the user only wants 7.1 rates, and TibiaWiki has none (see the plan).
  - Loot items get into the sprite atlas for their icons (1,750 items now, was 1,650).
- **Spawn groups:** spawn points on the same floor within 10 tiles of each other, chained, are one group (`spawnGroups`). That gives 2,365 groups; the biggest has 20 spawn points, and 498 groups have more than one kind of monster.
- TibiaWiki checked in the browser (the fetch tool is refused by the site): no drop chances older than 8.2.

### Slice 5d: hover preview and click to change floor (built 2026-11-13)
- **Without a route**, zoomed in to 16 or closer: hovering a floor change on the floor you're looking at shows the floor it leads to around where you land. That covers stairs, ramps, holes, ladders, grates, rope spots and stone piles. ~~Forcefields can go far away, so they're left out.~~ Forcefields have their own hover and click, see below.
  - It uses the same see-through drawing as along a route: full for 3 tiles, fading out to 7, at 80 %.
  - The hovered tile itself stays clear, so you still see the hole or stairs you point at.
  - A floor above that is already drawn (the surface at zoom 16, with its roofs) gets no preview.
- **Clicking it goes to that floor** (the floor buttons' rule: zoomed in, this floor only). An NPC or locked door on the tile comes first, as proposed. The cursor is a pointer over floor changes.
- ~~With a route planned there's no hover preview or click to another floor.~~ **Changed (user, 2026-11-13): also with a route.** The hover preview (see-through and arrow) is drawn on top of the see-through along the route (5c), and a click still goes to that floor. Seen in the browser: on the Thais depot route, hovering the stairs shows floor 6 with the orange up arrow.
- **Forcefields too (user, 2026-11-13: "teleporters should also be clickable to go to their location"):**
  - Hovering a magic forcefield draws a purple ring on it. When it leads somewhere on the same floor that's in view, a dashed line goes to a second ring there. There's no see-through preview, because the destination is often far away.
  - Clicking it flies to where it leads, at the same zoom. It's a jump, so Back returns.
  - The route planner already used forcefields since slice 4 (26 on 7.1, Rookgaard ones left out); they show as purple on the route.
- **Code:**
  - The see-through drawing is now one function for a floor in a band (`seeBand`), used by `seeThrough` (route) and `seePreview` (hover).
  - The World loads only links.json (160 KB) for this (`loadLinks`, `floorChangeAt`), when the map has loaded; `loadWalk` (debug view) reuses it.
- Seen in the browser: hovering the hole at 33309,31996,7 showed floor 8 with its stairs around the hole, and clicking it went to floor 8.
- **Up and down arrows** (user, 2026-11-13: "to show if you're going up or down it should show a small up or down arrow on the ladder or hole"):
  - The hovered floor change gets an arrow: orange pointing up, blue pointing down, with a black outline, about 0.6 of a tile (at least 12 px).
  - On a planned route, each floor change gets the same arrow (0.5 of a tile) instead of the big dot, at that floor's visibility (5b). Forcefields and boats on the same floor keep their dots.
  - Seen in the browser: a blue down arrow on the hole at 33309,31996,7; on the Thais depot route an orange up arrow on the stairs and a fainter blue down arrow on floor 6.

### Slice 5c: see-through along the route (built 2026-11-13, an experiment to tune with the user)
- **Where the route is on another floor up to 2 floors away** (above or below), that floor is drawn over the current one in a band along the path. So the floor you're on looks see-through there.
- **The band:** fully see-through within 3 tiles of the path (`SEE_BAND`), then fading from 40 % to nothing at 7 tiles (`SEE_EDGE`, `SEE_FADE`). The distance is measured round (Euclidean), per tile, and smoothed between tiles.
- **How strong:** 80 % for the next floor, 50 % for the one after (`SEE_FLOOR_ALPHA`); the farther floor is drawn first.
- **Floors above** that are already drawn (the surface with its upper floors, below the layer cut) are skipped. Seen from the surface, floors 0–7 are shifted one tile up-left per floor, as the map draws them.
- **Only with the game sprites** (zoom 16 and closer). Each floor is drawn from its own cached chunk pictures into a scratch canvas, cut to the band with a mask of one pixel per tile (scaled up smoothly), then laid over the map. The route lines are drawn on top as before.
- Seen in the browser on Thais → Kazordoon: at 33310,31997 the cave of floor 8 shows through the grass around the hole; on floor 10 near 32622,31935 the corridors of floors 9 and 11 along the route show as a faint band.
- **Changed after user feedback (2026-11-13): the path on the floor you're looking at always comes first.**
  - The user: "the main path on the main layer should always be the most visible … the layer underneath shows over, which is fine when you're a bit away from the path but … it's more confusing than it was."
  - Now nothing shows through around the route on the current floor: clear within 1 tile of it (`SEE_CLEAR`), back to the full band at 3 tiles (`SEE_CLEAR_EDGE`). The band is multiplied by (1 − that).
  - Seen on floor 10 near 32622,31935: the holes on the path show as holes again (before, the floor 9/11 stairs drawn over them hid them), and the corridors of the other floors still show further from the path.
- **Changed after user feedback (2026-11-13): only the way ahead.**
  - The user: "we know a 'to' and 'from' … you only see the layers of the direction ahead of you."
  - A stretch of the route on another floor now only shows through when the route has already been on the floor you're looking at before it. You see where you're going, not where you came from.
  - Example, Thais → Kazordoon going down at 33310,31997: from floor 9 you see 10 and 11 ahead, no longer 8 behind.
  - ~~If the route visits a floor twice, everything after the first visit counts as ahead.~~
  - **Only 2 floor changes ahead** (user, 2026-11-13: "if a path goes down 1 and down 1 again, then up 1 again, it shouldn't show that path yet … otherwise there's too much information on the screen").
    - From where the route leaves the floor you're looking at, only the stretches up to the 2nd floor change show through (`SEE_CHANGES`). The 3rd change and beyond wait until you're further along.
    - Each time the route is back on your floor, the count starts again.
    - Boats and forcefields on the same floor don't count as a change.
  - The route lines on other floors (5b) are unchanged; this is only the see-through.
- **To tune with the user:** the band width, the fade, the clear zone and the strength per floor (all constants at the top of `seeThrough` in TibiaMap.jsx).

### Slice 5b: route lines on other floors (built 2026-11-13)
- **How visible the route is on floor z when looking at floor vz** (`routeAlpha`):
  - On this floor: full, solid line.
  - Looking at the surface, the other surface floors (0–7): 55 % dashes, as before.
  - Underground floors, and anything seen from underground: up to 2 floors away, 55 % and 30 % dashes; further away it's not drawn. From floor 7 you see floors 8 and 9 of the route; from floor 11, floors 9, 10, 12 and 13.
- The floor-change dots, the dashed "use" lines and the boat arcs follow the same rule (an arc takes the more visible of its two ends).
- Seen in the browser on Thais → Kazordoon, where the route goes down floor by floor (8–15) near 33310,31997. The stairs and holes there are stacked on top of each other, so nearby floors' dashes lie close together. 5c (see-through along the route) should make that clearer.

### Slice 5a: the step onto floor changes (built 2026-11-13)
- **The router keeps the floor change's own tile in the path**, as an entry without time of its own. The time is still counted on the landing entry, so run times don't change (Thais temple → depot: 67 steps, 24 s, as before).
  - `onto`: stairs, ramps, holes and forcefields, which you step onto.
  - `use`: ladders, grates, rope spots and stone piles, used from the tile next to them. Left out when you already stand on it.
- **On the map:**
  - The yellow line goes onto the stairs or hole, so you can see which one to take.
  - A used ladder or rope spot gets a short dashed line from where you stand.
  - The floor-change dot (orange up, blue down, purple forcefield) sits on the stairs, hole or ladder itself.
- The step counts and the legs in the panel don't count these entries (they're part of the move to the other floor).
- Seen in the browser: the Thais depot stairs.
- Found on the way, not changed: from the Thais temple the route goes up the depot stairs and straight back down to get past them (two steps, a real way in the map data).

### Slice 4c–4e: locked doors and keys (built 2026-11-13)
- **4c, data** (`tools/lib/doors.js`, doors.json `[[x, y, z, door id, open door id, key number, key id]]`, client ids):
  - The converter reads all item attributes (TVP item.h: action id 4, key number 23, keyhole 24, …) and looks inside containers too, for keys in chests.
  - Keys on the 7.1 map carry their number as an **action id**; on the 7.6 map as a key number. Both are read.
  - Result: 309 locked doors; key number known for 101 (4 from 7.1, 97 from the 7.6 map at the same spot), 65 different keys.
  - Only 28 of those doors have a key of known look (a key with that number lies on a map). The rest, and doors with no number, show a **copper key**.
  - Reading the 7.6 map for this takes about 2 s.
- **4d, map:**
  - The key's icon is drawn on each locked door from zoom 16, at 0.8 of a tile (faint when the number is unknown). Note: key sprites are small, so the icon is easy to miss.
  - Clicking a door opens a "Locked door" window: the key's icon, name and number ("Key unknown" without one), the position, Unlock/Lock, and the "Open all locked doors" tick. The tick is also in the route panel.
  - **A key opens every door with its number:** unlocking a door with a known number unlocks all doors with that key (the button says how many). A door without a number is unlocked on its own.
  - An unlocked door is drawn as the open door (server id + 2), with the key still on it; all chunk pictures are drawn again (rare).
  - The state (`{ all, open: ['k25', 'p32100,31569,9', …] }`) is remembered in this browser (`tm-doors`).
- **4e, routes:**
  - Locked doors block unless unlocked or all opened. Unlocking, locking or the tick searches the route again **without moving the view**; a level change across 8 does the same now.
  - When there's no route, the search runs again with all doors open. If that finds one, the panel says which locked doors are in the way ("key 25", or "a door at x, y, z (key unknown)").
- Tested in Node and in the browser: Thais temple → the room behind the key-25 door (32357,32195,7) has no route while locked ("key 25" in the way), a 59-step route once unlocked, and the door is drawn open.
- **Fixed on the way:** stopping the dev server's background task only stopped `npx`, and the old Vite kept port 5180 (the new one moved to 5181 and doors.json wasn't served). The server is now started with `--strictPort`, and the old node process stopped by port.

### Slice 4b: routes with passages (built 2026-11-13)
- **Forcefields:** stepping onto one is one step on the forcefield's own ground (diagonal ×3 as usual), and then you're at its destination.
- **NPC passages:** you can take one from any tile within 3 of the NPC on its floor (TVP npcbehavior.cpp, `areInRange<3, 3>`). It takes 2 s for talking, then you're at the destination, and it costs its price. The Oracle only counts when the level in the panel is 8 or higher. The route is searched again when the level crosses 8.
- **No way back to Rookgaard:** the converter drops any teleport or passage that goes from the mainland into Rookgaard (the box x 31900–32255, y 32000–32300, every floor).
  - Found while testing: a GM forcefield 6 tiles from the Thais temple (32366,32235,7) goes to Rookgaard. With doors counted as open, every route went Thais → Rookgaard → the Oracle for free.
  - Because nothing leads to Rookgaard any more, the Oracle can only be reached from Rookgaard.
- **Two routes:** the fastest, and the cheapest (least gold, then fastest; gold counts 10⁹ ms per gp in the search).
  - The cheapest is only searched when the fastest costs gold, and shown only when it is cheaper.
  - The panel has two buttons (name, time, gold) to switch between them; the fastest is shown first.
- **Estimate with jumps:** a passage or forcefield can cover any distance, so the straight-line estimate alone would over-estimate. The estimate is the smaller of:
  - walking straight to the goal;
  - walking to the nearest jump (counting the talk range), then walking from the jump destination closest to the goal.

  This never over-estimates, so the routes are still the best ones.
- **Panel:** the total time (bold), the gold, the haste casts, and the route in legs: "Walk 64 steps, 2 floor changes (22 s)", "**Captain Greyhound**: to Thais, 110 gp", and so on.
- **On the map:** a passage is a dashed light-blue arc from where you talk to the NPC to where you arrive (curving to the right of the direction of travel). Forcefields get purple dots; floor changes keep their orange and blue dots.
- Tested in Node (level 50, speed 318):

  | Route | Fastest | Cheapest | Search |
  |---|---|---|---|
  | Thais → Carlin | 0:55, Captain Bluebear 110 gp | 7:39, walking | 2.5 s |
  | Thais → Edron | 1:04, Captain Bluebear 160 gp | 7:18, walk to Venore + Captain Fearless 40 gp | 4.2 s |
  | Thais → Venore | 0:45, 170 gp | 6:25, walking | 1.8 s |
  | Carlin → Thais depot | 0:44, Captain Greyhound 110 gp | 7:44, walking | 2.3 s |
  | Rookgaard → Thais, level 1 / 8 | not connected / 0:16 through the Oracle | – | |

  Almost all of the search time is the cheapest route: it walks through 200,000–500,000 tiles, and the estimate checks all 73 jumps for each one. Seen in the browser too (Thais → Edron, both routes and the arc).

### Slice 4a: passage data (built 2026-11-13)
- **Forcefields:** the converter now reads the map's item attributes for text (6, 7) and the teleport destination (8).
  - 64 items have one: 27 become `teleport` links (stepped onto, like stairs), and 37 go to 0,0,0 and are left out (the converter lists them).
- **Passages** are a separate list in links.json, `passages: [[NPC, destination, price, min level, NPC x,y,z, to x,y,z]]`, because they carry a price and a level.
  - That's 47 in all: boats and carpets from 16 NPCs (their trips to places not on the 7.1 map are left out), plus the Oracle's 4 one-way trips (level 8, free).
  - Prices are the normal ones; the quest lines are still ignored (see above).
- **The Oracle** has its own small parser (`parseOracle`): the town comes from a Data value on topic 1, and the "yes" on topic 3 with that Data teleports. The level comes from its greeting (`Level>=8`).
- **Debug view** (`?debug=walk`):
  - Teleport tiles are purple ("T", with an arrow when the floor changes).
  - Teleports and passages are drawn as a line to where they go: purple for teleports, green for passages, dashed when the other end is on another floor, with a dot at the arrival.
  - Next to the NPC there's a label per trip (destination, price, level).
- The router skips teleport links until 4b.

### Slice 3c: run times (built 2026-11-13)
- **Speed** (TVP source, checked): base = 70 + (level − 1).
  - Haste adds floor(base · 30 / 100); strong haste adds floor(base · 70 / 100).
  - Boots of haste add 20 (movement.cpp changeSpeed → +40 in the shown speed).
  - Speed = 2 · (base + extra) + 80, e.g. level 50 = 318.
- **Step time** (creature.cpp onCreatureMove, checked): the ground of the tile stepped **onto**, 50 · ceil(1000 · ground / speed / 50) ms in the server's integer maths; diagonal ×3. Grass (150) at speed 318: 500 ms, 1500 ms diagonal.
  - Note: the server takes the ground speed from items.otb/xml, the converter from the dat's GROUND value. These are assumed to be the same; to verify.
- **Floor changes** are one move to the new floor: one step time on the landing tile, never ×3, because the floor changes.
  - Stairs, ramps and holes, and ladders, grates and rope spots (used from the tile or a neighbour), all work this way.
  - A loose stone pile is two steps: dig, step into the hole, land below.
  - This replaces the rough fixed times from 3b.
- **Each tile on the path keeps its ground speed** (`[x,y,z, how, ground, ground2]`), so `routeTime(path, speed)` works out the time again straight away when the settings change, without searching again. The search itself uses the speed at the time it's started.
- **Haste** (TVP spells; the user's choice: always on): Haste 60 s, 60 mana (magic level 4, every vocation); Strong haste 42.5 s, 100 mana (magic level 8, sorcerers and druids). Casts = ceil(time / duration), shown with the mana.
- **Route panel:** level (1–999), haste (none / Haste / Strong haste), "Boots of haste", speed shown. The time is in bold; the haste line shows casts and mana.
  - The settings are remembered in this browser (localStorage, `tm-char`). Without storage it still works, just not remembered.
  - **Default (user, 2026-11-13): level 8, no haste, no boots of haste** (was level 50; `CHAR_DEFAULT`). Saved settings still win: a browser that already saved others keeps them until they're changed.
  - **Layout (user, 2026-11-13):** level and haste on their own rows, the level box 64 px wide, so its up/down arrows fit (they didn't next to the haste list).
- Tested (Thais → Carlin, 1077 steps):

  | Character | Speed | Time | Haste |
  |---|---|---|---|
  | Level 50 | 318 | 7:39 | – |
  | + haste | 388 | 6:19 | 7 casts, 420 mana |
  | + boots of haste | 428 | 5:44 | 6 casts, 360 mana |
  | Level 100 | 558 | 4:31 | 5 casts |
  | Level 100, strong haste, BoH | 694 | 3:52 | 6 casts, 600 mana |

- **Fixed: the map could crash while loading** (very likely the user's "everything is grey").
  - Cause: React runs the loading effect twice in development, and a dataUrl change does the same. The first World set "ready", then a second, half-loaded World took its place. Any re-render (moving the mouse) then read its missing floor list, and the whole component disappeared.
  - Fix: "ready" is reset when a World starts loading and only set by the World still in use; the panel only gets the world once it's ready.

### Slice 3b: route (built 2026-11-12)
- **Route finder** (`src/map/engine/router.js`): A* in a **web worker**.
  - The worker is built from a function's source (Blob URL), not `new URL(..., import.meta.url)`, so it works the same with Vite and on Ryndean's webpack site, with no extra package.
  - It loads walk.bin, links.json and map.json itself (~7 MB raw, mostly zeros), on the first route.
- **Moves:**
  - **Walking:** 8 neighbours that can be walked on. Step time on the tile stepped onto is ceil50(1000 · ground speed / speed); a diagonal costs ×3.
  - **Step links** (stairs, ramps, holes): stepping onto one moves you to its destination.
  - **Use links** are used from the tile itself or one of its 8 neighbours, with fixed extra times: ladder and grate 600 ms, rope 1000 ms, dig 1600 ms. These are rough figures, to check in 3c.
  - **Estimate:** Chebyshev distance × the step time on the fastest ground (90), so it never over-estimates.
  - At most 4 million tiles are searched.
- **Start / destination on a tile you can't stand on** (a depot locker, an NPC behind its counter) moves to the nearest walkable tile within 3 on that floor.
- Tested in Node: Thais temple → Thais depot 68 steps; Thais → Carlin 1079 steps (4 floor changes, ~0.6 s to find); into the Thais sewers by a grate. Thais → Edron and Thais → Rookgaard are "not connected by walking" (boats come in slice 4).
- **Ways to set it (all three, as the user chose):**
  - **Right-click** on the map: a client-style menu at the mouse with "Route from here", "Route to here", and "Clear route" when there is one. It uses the tile under the mouse on the floor you're on.
  - A **Route** button by the search opens the **route panel**, with From / To fields using the same search (towns, places, depots, NPCs, positions; no items), plus **Swap** and **Show** (fit the whole route).
  - **"Route here"** in the NPC window sets that NPC as the destination.
- **On the map:**
  - The route is a yellow line with a dark edge on this floor, faint yellow dashes on other floors. Surface floors are shifted like the client draws them.
  - Dots: green start, red end; orange/blue where you go up/down (a big dot where you change floor, a small one where you arrive).
  - When a route is found, the map flies to show all of it (the closest zoom where it fits, up to 64), on the floor it starts on.
- **Panel:** steps, floor changes, and a first time estimate "(level 50, no haste)". The real character settings come in 3c.

### Slice 3a: walk data (built 2026-11-12)
- **Converter** (`tools/lib/walk.js`) writes `walk.bin` and `links.json`.
  - `walk.bin` has one byte per tile, in map.json chunk order: 0 = can't walk, otherwise ground speed ÷ 2. It's 7.2 MB raw, mostly zeros, so it compresses well.
  - `links.json` holds the floor changes: `[x,y,z, tx,ty,tz, kind]`.
- **Walkable:** a ground item (the dat's GROUND speed; 0 counts as 100) and nothing with items.otb flag 1 ("block solid"). All door ids from global.lua (78) count as open, as the user chose.
- **Floor changes**, as the TVP server does them:
  - **step** (stairs, ramps, holes; items.xml `floorchange`): up = z−1 shifted one tile in the stairs' direction. Down = the tile below, shifted by that tile's own direction (north +y, south −y, east −x, west +x).
  - **ladder** (1386, 3678) and **rope** (ropeSpots 384, 418): one floor up, on the tile south of the spot. If that's not walkable, the first walkable of N, E, W, W, SW, SE, NW, NE (Position:moveUpstairs).
  - **grate** (430): the tile straight below.
  - **dig** (holes 468, 481, 483, loose stone piles): like a hole (down).
  - **well** (added 2026-11-13, user: "the well in fibula is also something that's clickable to go down"): a draw well (an item named "… well") with a ladder straight below it goes down to that ladder's tile, used from the well or next to it, like a grate. TVP has no script for wells, so wells without a ladder below stay plain decoration. On 7.1 that's the Fibula well (32172,32439,7 → floor 8). New kinds go at the end of `LINK_KINDS`, because links.json stores the index.
- **Scripted floor changes** (added 2026-11-13, user: the Demona hole "should also be routable"):
  - Some holes are opened by a lever script, so the map only shows plain floor there.
  - They're listed by hand in `tools/data/scripted-links.json` (`from`, `to`, `kind`, `note`), and the converter adds them to links.json. They then work like any other floor change: hover preview, click, routes.
  - **Demona entrance:** 32483,31633,9 → 32483,31633,10. The lever is at 32528,31724,10, about 90 squares away and one floor down. In TVP's script the hole stays open once pulled (pulling again only moves the lever), so it counts as always open.
  - **Other lever spots in TVP**, not added yet: the Thais lighthouse entrance (32225,32276,8), the Kazordoon ladder lever (32605,31902,4), Port Hope's dworc hole (not on 7.1), the McRonald pig pen (32400,32239–41,6).
- **7.1 result:** 791,795 walkable tiles; ground speeds 90–200. Links: step 2920, ladder 1195, grate 76, rope 546, dig 108. 2 links have no destination tile and are left out.
- **Debug view** `?debug=walk` (zoom 16+, the floor you're on): red = a tile that exists but can't be walked on; a blue ↓ / orange ↑ square with the kind's letter (S step, L ladder, G grate, R rope, D dig) = a floor change. Checked in Thais (streets, houses, stairs, grates) and on floor 8 below Thais (tunnels, ladders).
- The walk data loads only in debug mode for now; the router (3b) will load it in a web worker.

### Slice 2c: town names (built 2026-11-12)
- **Town names over the zoomed-out map**, below zoom 16; gone once the sprites show.
  - Centred on the temple, white, in the client's outlined font at 2 client pixels per font pixel (whole screen pixels), drawn over everything.
  - Only real towns are labelled; the internal places stay search-only.
  - **"Isle of Solitude" is now a place, not a town:** it's the GM island, not a player town. REAL_TOWNS is now 12 towns.
  - A name that would overlap one already drawn is skipped (e.g. Vega next to Senja on the world view) and shows again when zoomed in.
- Tested: the world view at 0.5 (11 names, no overlap) and Thais at 4.

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
    - Zooming in to 32 (MAIN_FROM; 64 until 2026-11-13) switches to the main level of the place zoomed into, "This floor only". From there Ctrl + wheel goes up or down. Zooming back out below 32 brings the roofs back.
    - **Moved from 64 to 32 (2026-11-13, user):** one zoom step earlier, so you can see into buildings sooner while zooming in. Go to, search results and "Show" route still fly in to at least 64 (FLY_ZOOM), and routes are still fitted at 64 at the closest.
    - The main level is floor 7, except in MAIN_LEVELS: Venore x 32915–33060, y 32015–32140 → floor 6. The box comes from where floor 6 has many ground tiles (the raised streets around the temple at 32957,32076).
    - The same applies to links opened at zoom 32+, Go to and travel jumps (that floor only), the floor buttons (zoomed in: this floor only), and pinch.
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
- **The converter no longer empties the live data folder (2026-11-12, user: "everything is grey").** It used to delete `public/map-data` first and rebuild it over ~3 min, so a page opened or reloaded meanwhile found no data: grey, or tiles remembered as missing until a reload. It now builds into `public/map-data.building` and swaps it in at the end (old folder → `.old` → removed); both side folders are ignored by git and Vite.
- Dev gotcha: Vite only serves public files that existed when it started. After a convert that adds new files, restart the dev server.
- **Not done in slice 1:**
  - water and other animations (phase 0 only)
  - roofs cut away per building
  - the client's bitmap font
