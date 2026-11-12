# Tibia Map — design doc

A Google Maps-style map of Tibia 7.6. It works out the best way to sell loot and the best route from A to B with every travel method, and it gives accurate run times for a given level and speed setup. The panels look like the old client, as in the house planner. The map itself loads fast and pans and zooms like Google Maps.

Status: design agreed on 2026-11-12, nothing built yet. Keep this doc current: every decision, even small ones made while building, goes in here straight away.

## Decisions

### Scope and hosting
- **Version: 7.6 only.** It follows the TVP data (map, NPCs, monsters). No version selector.
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
- **Real sprites.** The `map.otbm` + `.spr` are pre-rendered into an image tile pyramid. At the closest zoom you see real game sprites; zoomed far out it fades to the minimap colours. Pre-rendered tiles keep loading fast.
- Pan, zoom, and floor up/down feel like Google Maps (drag, scroll wheel, pinch).
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
- `C:\git\tibia assets\TVP-main\TVP-main\data\world\map.otbm`: the map
- `…\data\world\map-spawn.xml`, `map-house.xml`: spawns, houses
- `…\data\npc\*.xml` + `…\data\npc\behavior\*.npc` (376 scripts): trade lists, prices, passages (`Teleport(x,y,z)`)
- `…\data\monster\`: loot per monster
- `…\data\items\items.otb` / `items.xml`: ground speed, names, speed items
- `C:\git\tibia assets\Tibia.dat/.spr`: sprites (the 7.6 client)
- TibiaWiki (cached like the house planner's): places, quests, which quest unlocks which passage

## Open questions
- **Ryndean's overlay**: what is it, and how could it know the player's live position? Plan for now: the map can export a route as a list of `x,y,z` positions, so an overlay can draw it in the real game later. To ask Ryndean.
- Which passages are locked behind a quest in 7.6? Make a list from the `.npc` conditions plus TibiaWiki.
- Where does the "balanced" sell option sit between gold and time (e.g. gold per minute)?
- Mana and recasts of haste on long routes: show them or not?
- Can the house planner and the map share client components (as a shared package or a copy)? Remember the Ryndean sync.

## Delivery slices
Agree each slice before building it, then build one at a time.

1. **Map viewer.** A converter turns `map.otbm` into sprite tiles plus minimap tiles at different zooms. A viewer with Google Maps-style pan, zoom and floors, a position readout and shareable links.
2. Places and NPC pins + search (town, NPC, coordinates).
3. Walking router (one floor, then floor changes) + run time with level and speed settings.
4. Boats, carpets, teleports + quest checkboxes.
5. Loot seller, usable without the map: search, backpack, quick entry, monster categories, NPC list + receipt. Because the map is optional here, this slice could also come before slices 2–4.
6. Sell route optimisation (max gold, fastest, balanced), shown in the NPC list and, when it's open, on the map.
7. Map pins, current position, spawn layer, route export for the overlay.

## Decisions made while building
_(nothing yet)_
