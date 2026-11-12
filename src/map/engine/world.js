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
          const t = this.tile(x0 + sx + d, y0 + sy + d, zz);
          if (!t || !t.items.length) continue;
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
