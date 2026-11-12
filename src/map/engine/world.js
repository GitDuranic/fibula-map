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
  }

  async load() {
    const [items, map] = await Promise.all([loadJson(`${this.base}/items.json`), loadJson(`${this.base}/map.json`)]);
    this.defs = items.items;
    this.sheetCells = items.sheetCells;
    this.sheets = await Promise.all(Array.from({ length: items.sheets }, (_, i) => loadImage(`${this.base}/sprites-${i}.png`)));
    this.map = map;
    this.CHUNK = map.chunk;
    this.bounds = map.bounds;
    this.exists = new Set();
    for (const [z, list] of Object.entries(map.chunks)) for (const [cx, cy] of list) this.exists.add(`${z}:${cx}:${cy}`);
    this.ovExists = new Set();
    for (const [set, levels] of Object.entries(map.overview.sets)) {
      for (const [level, list] of Object.entries(levels)) for (const [bx, by] of list) this.ovExists.add(`${set}:${level}:${bx}:${by}`);
    }
    this.floors = Object.keys(map.chunks).map(Number).sort((a, b) => a - b);
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

  // ---------- buildings (layers above a floor) ----------

  // The highest floor (lowest number) above z with something drawn over frame position (x, y) of floor z, or -1.
  // Floor zz's tile for frame position p is p + (z - zz): the client draws higher floors one tile up-left each.
  coverAt(x, y, z) {
    if (z > 7) return -1; // underground: nothing above is drawn
    let top = -1;
    for (let zz = z - 1; zz >= 0; zz--) {
      const t = this.tile(x + z - zz, y + z - zz, zz);
      if (t && t.items.length) top = zz;
    }
    return top;
  }

  // Is there something on floor zz drawn at frame position (x, y) of floor z?
  hasAt(x, y, z, zz) {
    const t = this.tile(x + z - zz, y + z - zz, zz);
    return !!(t && t.items.length);
  }

  // The frame positions connected to (x, y) for which test(x, y) holds: neighbours within 1 + gap tiles
  // (gap > 0 bridges small gaps between wall pieces). Null if more than maxTiles.
  area(x, y, test, gap, maxTiles) {
    const tiles = new Set([`${x},${y}`]), queue = [[x, y]];
    const box = { x1: x, y1: y, x2: x, y2: y }, r = 1 + gap;
    while (queue.length) {
      const [px, py] = queue.pop();
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const nx = px + dx, ny = py + dy, k = `${nx},${ny}`;
        if (tiles.has(k) || !test(nx, ny)) continue;
        if (tiles.size >= maxTiles) return null;
        tiles.add(k); queue.push([nx, ny]);
        box.x1 = Math.min(box.x1, nx); box.y1 = Math.min(box.y1, ny); box.x2 = Math.max(box.x2, nx); box.y2 = Math.max(box.y2, ny);
      }
    }
    return { tiles, box };
  }

  // Where to take layer zz (and everything above it) off, for frame position (x, y) of floor z:
  // 1. the whole building: everything at or above zz connected to (x, y), bridging 1-tile gaps between wall
  //    pieces (e.g. Darashia's open-walled buildings), if that stays small (a single building);
  // 2. otherwise (touching houses that would make a whole city block): just layer zz's own connected area.
  // Null if there is nothing, or even the layer is too big to be a building (mountain ranges).
  peelArea(x, y, z, zz) {
    if (!this.hasAt(x, y, z, zz)) return null;
    const above = (px, py) => { for (let f = 0; f <= zz; f++) if (this.hasAt(px, py, z, f)) return true; return false; };
    const a = this.area(x, y, above, 1, 400) || this.area(x, y, (px, py) => this.hasAt(px, py, z, zz), 0, 3000);
    if (!a) return null;
    const { box } = a;
    return { ...a, key: `${zz}@${box.x1},${box.y1},${box.x2},${box.y2}` };
  }

  // ---------- drawing ----------

  // A canvas with chunk (cx, cy) of floor z drawn at `ts` pixels per tile, or null if its data is not there yet.
  // `mode`: 'above' | 'floor' (see floorsFor). Floors above z are drawn one tile up-left per floor, like the client.
  // `budget.n`: how many new canvases may still be drawn this frame (keeps panning smooth); returns null when spent.
  // `opened`: buildings with layers taken off: [{ tiles, box, key, cut }] — floors above `cut` are not drawn there.
  chunkCanvas(z, cx, cy, mode, ts, budget, opened = []) {
    const C = this.CHUNK, floors = floorsFor(z, mode);
    const x0 = cx * C, y0 = cy * C;
    const here = opened.filter((b) => b.box.x2 >= x0 && b.box.x1 < x0 + C + OVERHANG && b.box.y2 >= y0 && b.box.y1 < y0 + C + OVERHANG);
    const key = `${mode}:${z}:${cx}:${cy}:${ts}${here.map((b) => `|${b.key}:${b.cut}`).join('')}`;
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
          const t = this.tile(x0 + sx + d, y0 + sy + d, zz);
          if (!t || !t.items.length) continue;
          if (zz < z && here.length) { // a layer taken off an opened building?
            const pk = `${x0 + sx},${y0 + sy}`;
            if (here.some((b) => zz < b.cut && b.tiles.has(pk))) continue;
          }
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
}
