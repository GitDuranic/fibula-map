// Loads the converted map data and draws it in chunks, cached as canvases.
import { drawTile, TILE } from './render.js';

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('Could not load ' + src));
  img.src = src;
});

const loadJson = async (src) => {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Could not load ${src} (${res.status})`);
  return res.json();
};

// Big sprites (up to 2x2 tiles) and elevation reach up-left out of their tile, so a chunk also draws
// this many tiles of its right and bottom neighbours.
const OVERHANG = 2;
// Chunk canvases kept in memory, in pixels (~4 bytes each).
const CACHE_PIXELS = 48 * 1024 * 1024;

// The floors drawn for a view, bottom first. "above": the surface floors seen from above, like the
// client outdoors (floors 7 up to 0); "floor": only this floor.
export function floorsFor(z, mode) {
  if (mode === 'above' && z <= 7) return [7, 6, 5, 4, 3, 2, 1, 0];
  return [z];
}

export class World {
  constructor(base, onChange) {
    this.base = base;
    this.onChange = onChange; // called when new data arrives (redraw)
    this.chunks = new Map(); // "z:cx:cy" -> tiles[] (index = row-major) | 'loading' | 'missing'
    this.canvases = new Map(); // key -> { canvas, pixels }
    this.cachedPixels = 0;
    this.overviews = new Map(); // "set:level:bx:by" -> Image | 'loading' | 'missing'
    this.minis = new Map(); // "z:mx:my" -> Image | 'loading' | 'missing'
  }

  async load() {
    const [items, map, npcs, npcSheet, fonts, fontImg] = await Promise.all([
      loadJson(`${this.base}/items.json`), loadJson(`${this.base}/map.json`),
      loadJson(`${this.base}/npcs.json`), loadImage(`${this.base}/npcs.png`),
      loadJson(`${this.base}/fonts.json`), loadImage(`${this.base}/font-outlined.png`),
    ]);
    // The client's outlined font, tintable: only the white glyph pixels take the colour, the outline stays black.
    const tints = new Map();
    this.font = {
      ...fonts.outlined,
      tint: (color) => {
        if (tints.has(color)) return tints.get(color);
        const c = document.createElement('canvas');
        c.width = fontImg.width; c.height = fontImg.height;
        const cx = c.getContext('2d');
        cx.drawImage(fontImg, 0, 0);
        cx.globalCompositeOperation = 'multiply';
        cx.fillStyle = color;
        cx.fillRect(0, 0, c.width, c.height);
        cx.globalCompositeOperation = 'destination-in';
        cx.drawImage(fontImg, 0, 0);
        tints.set(color, c);
        return c;
      },
    };
    this.defs = items.items;
    this.fluids = items.fluids || [];
    this.sheetCells = items.sheetCells;
    this.sheets = await Promise.all(Array.from({ length: items.sheets }, (_, i) => loadImage(`${this.base}/sprites-${i}.png`)));
    // NPCs: { n name, p [x,y,z], img [x,y,w,h] in npcSheet, d displacement, sells, buys, travel } (see the converter).
    this.npcs = npcs;
    this.npcSheet = npcSheet;
    this.npcAt = new Map(npcs.map((n) => [n.p.join(','), n]));
    // Places: { n name, k 'town' | 'place' | 'depot', p [x,y,z] } (towns at their temple).
    this.places = await loadJson(`${this.base}/places.json`);
    // Locations the user named (kind 'custom'): in development the live list from the dev server, which can also
    // add and remove them (customEditable); otherwise the ones the converter put into places.json.
    this.customEditable = false;
    try {
      const res = await fetch('/__custom-places');
      if (res.ok && (res.headers.get('content-type') || '').includes('json')) {
        const list = await res.json();
        if (Array.isArray(list)) { this.customEditable = true; this.setCustomPlaces(list, false); }
      }
    } catch { /* no dev server: the built list only */ }
    // Locked doors: { p [x,y,z], id (door), open (the open door), key (number, 0 = unknown), keyId (key item) }.
    // Older data without doors.json: no locked doors.
    const doors = await loadJson(`${this.base}/doors.json`).catch(() => []);
    this.doors = doors.map(([x, y, z, id, open, key, keyId]) => ({ p: [x, y, z], id, open, key, keyId }));
    this.doorAt = new Map(this.doors.map((d) => [d.p.join(','), d]));
    this.isDoorOpen = () => false; // set by the map (unlocked doors, or all opened)
    await this.loadMonsters();
    await this.loadQuests();
    this.buildSearch();
    this.map = map;
    this.CHUNK = map.chunk;
    this.bounds = map.bounds;
    this.exists = new Set();
    for (const [z, list] of Object.entries(map.chunks)) for (const [cx, cy] of list) this.exists.add(`${z}:${cx}:${cy}`);
    this.miniExists = new Set(); // minimap images (older map data has none: the minimap then stays black)
    for (const [z, list] of Object.entries(map.minimap?.floors || {})) for (const [mx, my] of list) this.miniExists.add(`${z}:${mx}:${my}`);
    this.ovExists = new Set();
    for (const [set, levels] of Object.entries(map.overview.sets)) {
      for (const [level, list] of Object.entries(levels)) for (const [bx, by] of list) this.ovExists.add(`${set}:${level}:${bx}:${by}`);
    }
    this.floors = Object.keys(map.chunks).map(Number).sort((a, b) => a - b);
  }

  // ---------- locations the user named ----------

  // Replaces the named locations ([{ n, p }]) and, unless told not to, rebuilds the search.
  setCustomPlaces(list, rebuild = true) {
    this.places = this.places.filter((p) => p.k !== 'custom').concat(list.map((c) => ({ n: c.n, k: 'custom', p: c.p })));
    if (rebuild) this.buildSearch();
  }

  // The names the user gave square (x, y, z).
  customAt(x, y, z) {
    return this.places.filter((p) => p.k === 'custom' && p.p[0] === x && p.p[1] === y && p.p[2] === z).map((p) => p.n);
  }

  // ---------- quest chests (slice 10) ----------

  // Loads quests.json (older data without it: none).
  //   quests: [{ n, v (version, '' = unknown), reward (TibiaWiki's text), chests: [{ p, items: [[id, count, key?]] }] }]
  //   questChests: every chest: { p, items, quest }
  //   questLabels: one name label per group of a quest's chests on one floor within 6 tiles: { p (the top chest), quest }
  async loadQuests() {
    const quests = await loadJson(`${this.base}/quests.json`).catch(() => []);
    this.quests = quests;
    this.questChests = quests.flatMap((q) => q.chests.map((c) => ({ p: c.p, items: c.items, quest: q })));
    const labels = [];
    for (const q of quests) {
      const left = [...q.chests];
      while (left.length) {
        const group = [left.shift()];
        for (let i = 0; i < group.length; i++) {
          for (let j = left.length - 1; j >= 0; j--) {
            const a = group[i].p, b = left[j].p;
            if (a[2] === b[2] && Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1])) <= 6) group.push(...left.splice(j, 1));
          }
        }
        const top = group.reduce((t, c) => (c.p[1] < t.p[1] || (c.p[1] === t.p[1] && c.p[0] < t.p[0]) ? c : t));
        const xs = group.map((c) => c.p[0]);
        labels.push({ p: [Math.round((Math.min(...xs) + Math.max(...xs)) / 2), top.p[1], top.p[2]], quest: q });
      }
    }
    this.questLabels = labels;
  }

  // ---------- monsters ----------

  // Loads monsters.json and monsters.png (older data without them: no monsters).
  //   monKinds: [{ n, hp, xp, img, d, loot: [[item id, max count]] }]
  //   spawnPoints: [{ p: [x, y, z], kind, amount, radius, group }]
  //   monMarkers: what the map draws zoomed out: monsters of one kind in one spawn group within MARKER_JOIN tiles
  //     of each other (chained) are one marker { p (the point nearest their middle), kind, count, points, group }.
  //   spawnGroups: Map(group -> { kinds: Map(kind -> count), points })
  async loadMonsters() {
    let data, sheet;
    try {
      [data, sheet] = await Promise.all([loadJson(`${this.base}/monsters.json`), loadImage(`${this.base}/monsters.png`)]);
    } catch { data = { kinds: [], spawns: [] }; sheet = null; }
    this.monKinds = data.kinds;
    this.monSheet = sheet;
    this.spawnPoints = data.spawns.map(([x, y, z, kind, amount, radius, group]) => ({ p: [x, y, z], kind, amount, radius, group }));
    const MARKER_JOIN = 3;
    const groups = new Map();
    for (const sp of this.spawnPoints) {
      if (!groups.has(sp.group)) groups.set(sp.group, { kinds: new Map(), points: [] });
      const g = groups.get(sp.group);
      g.points.push(sp);
      g.kinds.set(sp.kind, (g.kinds.get(sp.kind) || 0) + sp.amount);
    }
    this.spawnGroups = groups;
    const markers = [];
    for (const g of groups.values()) {
      const byKind = new Map();
      for (const sp of g.points) { if (!byKind.has(sp.kind)) byKind.set(sp.kind, []); byKind.get(sp.kind).push(sp); }
      for (const [kind, pts] of byKind) {
        const left = new Set(pts);
        while (left.size) {
          const first = left.values().next().value, cl = [first];
          left.delete(first);
          for (let i = 0; i < cl.length; i++) {
            for (const o of [...left]) {
              if (Math.max(Math.abs(o.p[0] - cl[i].p[0]), Math.abs(o.p[1] - cl[i].p[1])) <= MARKER_JOIN) { cl.push(o); left.delete(o); }
            }
          }
          const mx = cl.reduce((a, q) => a + q.p[0], 0) / cl.length, my = cl.reduce((a, q) => a + q.p[1], 0) / cl.length;
          const mid = cl.reduce((b, q) => (Math.hypot(q.p[0] - mx, q.p[1] - my) < Math.hypot(b.p[0] - mx, b.p[1] - my) ? q : b));
          markers.push({ p: mid.p, kind, count: cl.reduce((a, q) => a + q.amount, 0), points: cl, group: first.group });
        }
      }
    }
    this.monMarkers = markers;
  }

  // ---------- map data ----------

  // The chunk's tiles, or null while loading (a fetch is started) / when there is none.
  chunk(z, cx, cy) {
    const k = `${z}:${cx}:${cy}`;
    const c = this.chunks.get(k);
    if (c !== undefined) return typeof c === 'string' ? null : c;
    if (!this.exists.has(k)) { this.chunks.set(k, 'missing'); return null; }
    this.chunks.set(k, 'loading');
    loadJson(`${this.base}/chunks/${z}/${cx}_${cy}.json`).then((list) => {
      const C = this.CHUNK, tiles = new Array(C * C).fill(null);
      list.forEach((e, i) => {
        if (!e) return;
        const items = (typeof e === 'number' ? [e] : e).map((v) => (Array.isArray(v) ? { id: v[0], count: v[1] } : { id: v }));
        tiles[i] = { x: cx * C + (i % C), y: cy * C + Math.floor(i / C), z, items };
      });
      this.chunks.set(k, tiles);
      this.onChange();
    }, () => { this.chunks.set(k, 'missing'); this.onChange(); });
    return null;
  }

  // Is the chunk known (loaded, or there is none)? Starts loading it if not.
  chunkReady(z, cx, cy) {
    this.chunk(z, cx, cy);
    const c = this.chunks.get(`${z}:${cx}:${cy}`);
    return c !== 'loading';
  }

  tile(x, y, z) {
    const C = this.CHUNK;
    const c = this.chunks.get(`${z}:${Math.floor(x / C)}:${Math.floor(y / C)}`);
    if (!c || typeof c === 'string') return null;
    return c[(y - Math.floor(y / C) * C) * C + (x - Math.floor(x / C) * C)];
  }

  // ---------- layers ----------

  // The floors above z (lowest number first) with any map data in frame-z tile range [x1, x2] x [y1, y2]:
  // the layers that can be taken off there (roofs, upper floors). Floor zz is drawn (z - zz) tiles up-left.
  layersIn(z, x1, y1, x2, y2) {
    const C = this.CHUNK, found = [];
    if (z > 7) return found; // underground: nothing above is drawn
    for (let zz = 0; zz < z; zz++) {
      const d = z - zz;
      let any = false;
      for (let cy = Math.floor((y1 + d) / C); cy <= Math.floor((y2 + d) / C) && !any; cy++)
        for (let cx = Math.floor((x1 + d) / C); cx <= Math.floor((x2 + d) / C) && !any; cx++)
          if (this.exists.has(`${zz}:${cx}:${cy}`)) any = true;
      if (any) found.push(zz);
    }
    return found;
  }

  // Does floor z have any map data in tile range [x1, x2] x [y1, y2] (its own frame)?
  hasData(z, x1, y1, x2, y2) {
    const C = this.CHUNK;
    for (let cy = Math.floor(y1 / C); cy <= Math.floor(y2 / C); cy++)
      for (let cx = Math.floor(x1 / C); cx <= Math.floor(x2 / C); cx++)
        if (this.exists.has(`${z}:${cx}:${cy}`)) return true;
    return false;
  }

  // ---------- drawing ----------

  // A canvas with chunk (cx, cy) of floor z drawn at `ts` pixels per tile, or null if its data is not there yet.
  // `mode`: 'above' | 'floor' (see floorsFor). Floors above z are drawn one tile up-left per floor, like the client.
  // `budget.n`: how many new canvases may still be drawn this frame (keeps panning smooth); returns null when spent.
  // `cut`: the top layer drawn — floors above it (zz < cut: roofs, upper floors) are left out. 0 = everything.
  chunkCanvas(z, cx, cy, mode, ts, budget, cut = 0) {
    const C = this.CHUNK, floors = floorsFor(z, mode).filter((zz) => zz >= cut);
    const x0 = cx * C, y0 = cy * C;
    const key = `${mode}:${z}:${cx}:${cy}:${ts}:${cut}`;
    const hit = this.canvases.get(key);
    if (hit) { this.canvases.delete(key); this.canvases.set(key, hit); return hit.canvas; } // most recent last
    // Make sure every chunk this one needs is loaded.
    let ready = true, any = false;
    for (const zz of floors) {
      const d = z - zz;
      const ax = Math.floor((x0 + d) / C), bx = Math.floor((x0 + d + C + OVERHANG - 1) / C);
      const ay = Math.floor((y0 + d) / C), by = Math.floor((y0 + d + C + OVERHANG - 1) / C);
      for (let y = ay; y <= by; y++) for (let x = ax; x <= bx; x++) {
        if (!this.exists.has(`${zz}:${x}:${y}`)) continue;
        any = true;
        if (!this.chunkReady(zz, x, y)) ready = false;
      }
    }
    if (!any || !ready) return null;
    if (budget.n-- <= 0) return null;

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = C * ts;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = ts < TILE; // scaled down: smooth; full size: exact
    const k = ts / TILE, per = this.sheetCells * this.sheetCells;
    const drawSprite = (slot, dx, dy) => {
      const sheet = this.sheets[Math.floor(slot / per)], i = slot % per;
      ctx.drawImage(sheet, (i % this.sheetCells) * TILE, Math.floor(i / this.sheetCells) * TILE, TILE, TILE, dx * k, dy * k, ts, ts);
    };
    for (const zz of floors) {
      const d = z - zz;
      for (let sy = 0; sy < C + OVERHANG; sy++) {
        for (let sx = 0; sx < C + OVERHANG; sx++) {
          let t = this.tile(x0 + sx + d, y0 + sy + d, zz);
          if (!t || !t.items.length) continue;
          // An unlocked door is drawn open.
          const door = this.doorAt.get(`${t.x},${t.y},${t.z}`);
          if (door && this.isDoorOpen(door)) t = { ...t, items: t.items.map((it) => (it.id === door.id ? { id: door.open } : it)) };
          drawTile(this.defs, t, sx * TILE, sy * TILE, drawSprite);
        }
      }
    }
    const pixels = canvas.width * canvas.height;
    this.canvases.set(key, { canvas, pixels });
    this.cachedPixels += pixels;
    for (const [k2, v] of this.canvases) {
      if (this.cachedPixels <= CACHE_PIXELS) break;
      this.canvases.delete(k2); this.cachedPixels -= v.pixels;
    }
    return canvas;
  }

  // An item drawn once as a 32x32 canvas, kept (key icons on doors).
  iconCanvas(id) {
    this.icons ||= new Map();
    let c = this.icons.get(id);
    if (!c) {
      c = document.createElement('canvas');
      c.width = c.height = TILE;
      this.drawIcon(c.getContext('2d'), id);
      this.icons.set(id, c);
    }
    return c;
  }

  // Doors were unlocked or locked: the chunk pictures are drawn again (rare, so all of them).
  doorsChanged() {
    this.canvases.clear();
    this.cachedPixels = 0;
  }

  // Draws an item as a 32x32 icon (bottom-right anchored, like the client's inventory slots).
  // count: stack size, or the fluid type for fluid containers.
  drawIcon(ctx, id, count = 1, dx = 0, dy = 0) {
    const per = this.sheetCells * this.sheetCells;
    const drawSprite = (slot, x, y) => {
      const sheet = this.sheets[Math.floor(slot / per)], i = slot % per;
      ctx.drawImage(sheet, (i % this.sheetCells) * TILE, Math.floor(i / this.sheetCells) * TILE, TILE, TILE, x, y, TILE, TILE);
    };
    drawTile(this.defs, { x: 0, y: 0, z: 0, items: [{ id, count }] }, dx, dy, drawSprite);
  }

  // ---------- walk data (router) ----------

  // Loads walk.bin (per tile: 0 = blocked, else ground speed / 2; chunks in map.json order) and links.json.
  // Loads links.json only (floor changes, teleports, passages; small): { kinds, links, linksAt: Map("x,y,z" ->
  // links), passages }. Used by the hover preview of floor changes and by loadWalk.
  loadLinks() {
    this.linksPromise ||= loadJson(`${this.base}/links.json`).then((links) => {
      const linksAt = new Map();
      for (const l of links.links) {
        const k = `${l[0]},${l[1]},${l[2]}`;
        if (!linksAt.has(k)) linksAt.set(k, []);
        linksAt.get(k).push(l);
      }
      // NPC passages (boats, carpets, the Oracle): [NPC, destination, price, min level, x, y, z, tx, ty, tz].
      // Climbs and drops (exani hur, 3 parcels; slice 11): "x,y,z" -> [[x, y, z, tx, ty, tz, ways]], for ?debug=walk.
      const climbsAt = new Map();
      for (const c of links.climbs || []) {
        const k = `${c[0]},${c[1]},${c[2]}`;
        if (!climbsAt.has(k)) climbsAt.set(k, []);
        climbsAt.get(k).push(c);
      }
      this.links = { kinds: links.kinds, links: links.links, linksAt, climbsAt, climbIcons: links.climbIcons || {}, passages: links.passages || [] };
      return this.links;
    });
    return this.linksPromise;
  }

  // The floor change on tile (x, y, z) (stairs, hole, ladder, ...; not forcefields): [x, y, z, tx, ty, tz, kind],
  // or null. Needs loadLinks.
  floorChangeAt(x, y, z) {
    const list = this.links?.linksAt.get(`${x},${y},${z}`);
    return list?.find((l) => l[5] !== l[2] && this.links.kinds[l[6]] !== 'teleport') || null;
  }

  // The magic forcefield on tile (x, y, z): [x, y, z, tx, ty, tz, kind], or null. Needs loadLinks.
  teleportAt(x, y, z) {
    const list = this.links?.linksAt.get(`${x},${y},${z}`);
    return list?.find((l) => this.isTeleport(l)) || null;
  }

  isTeleport(l) { return this.links?.kinds[l[6]] === 'teleport'; }

  async loadWalk() {
    if (this.walk) return this.walk;
    const [bin, links] = await Promise.all([
      fetch(`${this.base}/walk.bin`).then((r) => r.arrayBuffer()),
      this.loadLinks(),
    ]);
    const offset = new Map();
    let i = 0;
    for (let z = 0; z < 16; z++) for (const [cx, cy] of this.map.chunks[z] || []) offset.set(`${z}:${cx}:${cy}`, (i++) * this.CHUNK * this.CHUNK);
    this.walk = { bytes: new Uint8Array(bin), offset, ...links };
    return this.walk;
  }

  // Ground speed of a walkable tile, or 0 (needs loadWalk).
  speedAt(x, y, z) {
    const C = this.CHUNK, cx = Math.floor(x / C), cy = Math.floor(y / C);
    const o = this.walk.offset.get(`${z}:${cx}:${cy}`);
    return o === undefined ? 0 : this.walk.bytes[o + (y - cy * C) * C + (x - cx * C)] * 2;
  }

  // ---------- search ----------

  // One list of everything that can be searched: places, depots, NPCs and the items NPCs trade.
  buildSearch() {
    const entries = [];
    const label = { town: 'Town', place: 'Place', depot: 'Depot', custom: 'Location' };
    for (const p of this.places) entries.push({ kind: label[p.k], name: p.n, place: p });
    for (const n of this.npcs) entries.push({ kind: 'NPC', name: n.n, npc: n });
    const items = new Map();
    for (const n of this.npcs) {
      for (const [id, , fluid] of [...n.sells, ...n.buys]) {
        const key = `${id}:${fluid ?? ''}`;
        if (!items.has(key)) items.set(key, { kind: 'Item', name: this.itemName(id, fluid), item: { id, fluid: fluid ?? null } });
      }
    }
    entries.push(...items.values());
    // Monsters that spawn on the map (6d): picking one shows all of them.
    const spawning = new Set((this.spawnPoints || []).map((sp) => sp.kind));
    (this.monKinds || []).forEach((m, i) => { if (spawning.has(i)) entries.push({ kind: 'Monster', name: m.n, mon: i }); });
    // Quests with a chest on the map (slice 10): picking one goes to its first chest.
    for (const q of this.quests || []) entries.push({ kind: 'Quest', name: q.n, quest: q });
    for (const e of entries) e.lower = e.name.toLowerCase();
    this.searchEntries = entries;
  }

  // Search results for text q, best first (at most `limit`): names starting with it, then a word starting with
  // it, then containing it; shorter names first. Coordinates ("32369, 32221, 7") give a position.
  search(q, limit = 12) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    const n = q.match(/\d+/g)?.map(Number);
    if (n && n.length >= 2 && /^[\d\s,.;:/-]+$/.test(q)) {
      const z = n.length > 2 && n[2] <= 15 ? n[2] : 7;
      return [{ kind: 'Position', name: `${n[0]}, ${n[1]}, ${z}`, pos: { x: n[0], y: n[1], z } }];
    }
    const rank = (e) => (e.lower.startsWith(q) ? 0 : e.lower.includes(` ${q}`) || e.lower.includes(`'${q}`) ? 1 : e.lower.includes(q) ? 2 : -1);
    return this.searchEntries
      .map((e) => ({ e, r: rank(e) }))
      .filter((x) => x.r >= 0)
      .sort((a, b) => a.r - b.r || a.e.name.length - b.e.name.length || a.e.name.localeCompare(b.e.name))
      .slice(0, limit)
      .map((x) => x.e);
  }

  // The NPCs selling and buying an item: { sells: [{ npc, price }] cheapest first, buys: [...] best price first }.
  traders(item) {
    const match = (o) => o[0] === item.id && (o[2] ?? null) === item.fluid;
    const sells = [], buys = [];
    for (const n of this.npcs) {
      for (const o of n.sells) if (match(o)) sells.push({ npc: n, price: o[1] });
      for (const o of n.buys) if (match(o)) buys.push({ npc: n, price: o[1] });
    }
    return { sells: sells.sort((a, b) => a.price - b.price), buys: buys.sort((a, b) => b.price - a.price) };
  }

  // The nearest real town to a position (for "Al Dee, Rookgaard").
  townOf(p) {
    let best = null;
    for (const t of this.places) {
      if (t.k !== 'town') continue;
      const d = Math.hypot(t.p[0] - p[0], t.p[1] - p[1]);
      if (!best || d < best.d) best = { t, d };
    }
    return best?.t.n || '';
  }

  // An item's name as an NPC offers it, e.g. "vial of oil" for a vial with fluid type 7.
  itemName(id, fluid) {
    const def = this.defs[id], name = def?.n || `item ${id}`;
    return fluid != null && (def?.f.FLUID_CONTAINER || def?.f.SPLASH) && this.fluids[fluid] ? `${name} of ${this.fluids[fluid]}` : name;
  }

  // An overview image (the map pre-drawn with sprites at `level` px per tile, map.overview.px square),
  // or null while loading / when there is none. set: "surface" or an underground floor "8".."15".
  overview(set, level, bx, by) {
    const k = `${set}:${level}:${bx}:${by}`;
    const m = this.overviews.get(k);
    if (m !== undefined) return typeof m === 'string' ? null : m;
    if (!this.ovExists.has(k)) { this.overviews.set(k, 'missing'); return null; }
    this.overviews.set(k, 'loading');
    loadImage(`${this.base}/overview/${set}/${level}/${bx}_${by}.webp`).then(
      (img) => { this.overviews.set(k, img); this.onChange(); },
      () => { this.overviews.set(k, 'missing'); },
    );
    return null;
  }

  // A minimap image (floor z only, in the client's automap colours, 1 px per tile, map.minimap.size square),
  // or null while loading / when there is none.
  minimap(z, mx, my) {
    const k = `${z}:${mx}:${my}`;
    const m = this.minis.get(k);
    if (m !== undefined) return typeof m === 'string' ? null : m;
    if (!this.miniExists.has(k)) { this.minis.set(k, 'missing'); return null; }
    this.minis.set(k, 'loading');
    loadImage(`${this.base}/minimap/${z}/${mx}_${my}.png`).then(
      (img) => { this.minis.set(k, img); this.onChange(); },
      () => { this.minis.set(k, 'missing'); },
    );
    return null;
  }
}
