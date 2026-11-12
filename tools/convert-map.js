// Converts Tibia client files + server map into web data for the Tibia map viewer.
//
// Usage: node tools/convert-map.js [--assets "<dir>"] [--data "<server data dir>"] [--map "<map.otbm>"] [--out public/map-data]
//
// Inputs:
//   <assets>/Tibia.dat, Tibia.spr                    client files (7.6 format, 7.1 item data)
//   <data>/items/items.otb                           TVP item list (server id -> client id)
//   <map>                                            the 7.1 map (default: tibia71-tvp-converted/Tibia71.otbm, TVP item ids)
// Outputs (in <out>/):
//   items.json            draw info for every item on the map (keyed by client id)
//   sprites-N.png         sprite atlases (64x64 cells of 32px)
//   gui.png, stone.png    client interface graphics from Tibia.pic (skin + tileable stone texture)
//   map.json              bounds, chunk size, which chunks exist per floor
//   chunks/<z>/<cx>_<cy>.json   one 32x32 tile chunk, tiles in row order: 0 (none), an item, or [item, item, ...]
//                         item = client id, or [client id, count] for stack counts / fluid types
//   minimap/<variant>/<z>/<mx>_<my>.png   minimap colours, 1 px per tile, 256x256 tiles per image
//                         variant "floor" = this floor only, "above" = seen from above (higher floors on top)
import fs from 'node:fs';
import path from 'node:path';
import { parseDat } from './lib/dat.js';
import { openSpr, readPic, blit } from './lib/spr.js';
import { walkNodes, Reader, parseOtb } from './lib/nodefile.js';
import { writePng } from './lib/png.js';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? a.concat([[v.slice(2), arr[i + 1]]]) : a), []));
const ASSETS = args.assets || 'C:/git/tibia assets';
const DATA = args.data || path.join(ASSETS, 'TVP-main/TVP-main/data');
const MAP = args.map || 'C:/git/tibia assets/tibia71-tvp-converted/Tibia71.otbm'; // 7.1 map in TVP item ids
const OUT = args.out || 'public/map-data';
const CHUNK = 32; // tiles per data chunk side
const MINI = 256; // tiles per minimap image side

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

log('Reading client files');
const dat = parseDat(path.join(ASSETS, 'Tibia.dat'));
const spr = openSpr(path.join(ASSETS, 'Tibia.spr'));
const otb = parseOtb(path.join(DATA, 'items/items.otb'));
const toClient = (sid) => otb.map.get(sid) || 0;

// ---------- map ----------
// floors[z] = Map(chunkKey "cx,cy" -> Map(tileIndex -> items[]))
const OTBM = { TILE_AREA: 4, TILE: 5, ITEM: 6, HOUSETILE: 14 };
const floors = Array.from({ length: 16 }, () => new Map());
const usedItems = new Set();
const missing = new Map();
const bounds = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
let tileCount = 0;
log('Reading map');
{
  let area = null, tile = null;
  const addItem = (sid, count) => {
    const cid = toClient(sid);
    if (!cid || !dat.items.has(cid)) { missing.set(sid, (missing.get(sid) || 0) + 1); return; }
    usedItems.add(cid);
    tile.push(count != null ? [cid, count] : cid);
  };
  walkNodes(MAP, (node) => {
    const r = new Reader(node.data);
    switch (node.type) {
      case OTBM.TILE_AREA: area = { x: r.u16(), y: r.u16(), z: r.u8() }; tile = null; return true;
      case OTBM.TILE: case OTBM.HOUSETILE: {
        const x = area.x + r.u8(), y = area.y + r.u8(), z = area.z;
        if (node.type === OTBM.HOUSETILE) r.u32();
        tile = [];
        while (r.left > 0) {
          const attr = r.u8();
          if (attr === 3) r.u32();
          else if (attr === 9) addItem(r.u16());
          else break;
        }
        const ck = `${Math.floor(x / CHUNK)},${Math.floor(y / CHUNK)}`;
        let chunk = floors[z].get(ck);
        if (!chunk) floors[z].set(ck, (chunk = new Map()));
        chunk.set((y % CHUNK) * CHUNK + (x % CHUNK), tile);
        tileCount++;
        if (x < bounds.x1) bounds.x1 = x; if (y < bounds.y1) bounds.y1 = y;
        if (x > bounds.x2) bounds.x2 = x; if (y > bounds.y2) bounds.y2 = y;
        return true;
      }
      case OTBM.ITEM: {
        if (!tile || (node.parent?.type !== OTBM.TILE && node.parent?.type !== OTBM.HOUSETILE)) return false;
        const sid = r.u16();
        let count = null;
        while (r.left > 0) {
          const attr = r.u8();
          if (attr === 15 || attr === 12) count = r.u8();
          else if (attr === 4 || attr === 5 || attr === 10 || attr === 22) r.u16();
          else if (attr === 14) r.u8();
          else break; // other attributes don't matter for drawing
        }
        addItem(sid, count);
        return false; // skip container contents
      }
      default: return true;
    }
  });
}
log(`${tileCount} tiles, bounds ${JSON.stringify(bounds)}, ${usedItems.size} different items`);
if (missing.size) log(`Items without a client sprite: ${missing.size} ids (${[...missing.values()].reduce((a, b) => a + b, 0)} placements)`);

// ---------- chunks ----------
log('Writing chunks');
const chunkIndex = {};
let chunkBytes = 0;
for (let z = 0; z < 16; z++) {
  if (!floors[z].size) continue;
  fs.mkdirSync(path.join(OUT, 'chunks', String(z)), { recursive: true });
  chunkIndex[z] = [];
  for (const [ck, tiles] of floors[z]) {
    const [cx, cy] = ck.split(',').map(Number);
    // One entry per tile in row order, trailing empty tiles left out: 0 = no tile, a number = a tile with
    // just that item, an array = the tile's items (each a client id or [id, count]).
    const list = [];
    for (const [i, items] of tiles) {
      list[i] = items.length === 1 && !Array.isArray(items[0]) ? items[0] : items.length ? items : 0;
    }
    for (let i = 0; i < list.length; i++) if (list[i] === undefined) list[i] = 0;
    const s = JSON.stringify(list);
    chunkBytes += s.length;
    fs.writeFileSync(path.join(OUT, 'chunks', String(z), `${cx}_${cy}.json`), s);
    chunkIndex[z].push([cx, cy]);
  }
}
log(`${Object.values(chunkIndex).reduce((a, l) => a + l.length, 0)} chunks, ${(chunkBytes / 1e6).toFixed(1)} MB`);

// ---------- minimap ----------
// The client's 8-bit automap palette: index c -> 6x6x6 colour cube.
const palette = (c) => [Math.floor(c / 36) % 6 * 51, Math.floor(c / 6) % 6 * 51, c % 6 * 51];
const tileAt = (x, y, z) => floors[z]?.get(`${Math.floor(x / CHUNK)},${Math.floor(y / CHUNK)}`)?.get((y % CHUNK) * CHUNK + (x % CHUNK));
// A tile's minimap colour: the last item in the stack that has one (as the client draws its automap), or -1.
const colourOf = (items) => {
  if (!items) return -1;
  let c = -1;
  for (const it of items) {
    const f = dat.items.get(Array.isArray(it) ? it[0] : it).flags;
    if (f.MINIMAP_COLOR !== undefined) c = f.MINIMAP_COLOR;
  }
  return c;
};
log('Writing minimap');
const miniIndex = {};
for (const variant of ['floor', 'above']) {
  miniIndex[variant] = {};
  for (let z = 0; z < 16; z++) {
    if (!floors[z].size) continue;
    // "above" only differs from "floor" at or over the surface: underground nothing higher is visible.
    // Seen from above, top floor first: 0, 1, ... 7 (the client shows the surface floors 0-7 together).
    const order = variant === 'above' && z <= 7 ? [0, 1, 2, 3, 4, 5, 6, 7] : [z];
    const dir = path.join(OUT, 'minimap', variant, String(z));
    fs.mkdirSync(dir, { recursive: true });
    miniIndex[variant][z] = [];
    const mx1 = Math.floor(bounds.x1 / MINI), mx2 = Math.floor(bounds.x2 / MINI);
    const my1 = Math.floor(bounds.y1 / MINI), my2 = Math.floor(bounds.y2 / MINI);
    for (let my = my1; my <= my2; my++) for (let mx = mx1; mx <= mx2; mx++) {
      const img = new Uint8Array(MINI * MINI * 4);
      let any = false;
      for (let ty = 0; ty < MINI; ty++) for (let tx = 0; tx < MINI; tx++) {
        const x = mx * MINI + tx, y = my * MINI + ty;
        for (const zz of order) {
          const d = z - zz; // a higher floor (zz < z) is drawn one tile up-left per floor
          const c = colourOf(tileAt(x + d, y + d, zz));
          if (c < 0) continue;
          const [r, g, b] = palette(c);
          const p = (ty * MINI + tx) * 4;
          img[p] = r; img[p + 1] = g; img[p + 2] = b; img[p + 3] = 255;
          any = true;
          break;
        }
      }
      if (!any) continue;
      writePng(path.join(dir, `${mx}_${my}.png`), MINI, MINI, img);
      miniIndex[variant][z].push([mx, my]);
    }
  }
}

// ---------- sprite atlases ----------
log(`Packing sprites for ${usedItems.size} items`);
const SHEET_CELLS = 64, PER_SHEET = SHEET_CELLS * SHEET_CELLS;
const spriteSlot = new Map(); // spr id -> atlas index (0 = empty)
let nextSlot = 1;
const slotOf = (sid) => {
  if (!sid || !spr.get(sid)) return 0;
  if (!spriteSlot.has(sid)) spriteSlot.set(sid, nextSlot++);
  return spriteSlot.get(sid);
};
const FLAG_KEYS = ['GROUND', 'GROUND_BORDER', 'ON_BOTTOM', 'ON_TOP', 'STACKABLE', 'FLUID_CONTAINER', 'SPLASH',
  'HANGABLE', 'HOOK_SOUTH', 'HOOK_EAST', 'DONT_HIDE', 'FLOOR_CHANGE', 'FULL_GROUND', 'DISPLACEMENT', 'ELEVATION', 'MINIMAP_COLOR'];
const itemsOut = {};
for (const id of [...usedItems].sort((a, b) => a - b)) {
  const t = dat.items.get(id);
  const f = {};
  for (const k of FLAG_KEYS) if (t.flags[k] !== undefined) f[k] = t.flags[k];
  itemsOut[id] = { f, w: t.width, h: t.height, l: t.layers, px: t.patternX, py: t.patternY, pz: t.patternZ, a: t.phases, s: t.sprites.map(slotOf) };
}
const sheetCount = Math.ceil(nextSlot / PER_SHEET);
for (let sh = 0; sh < sheetCount; sh++) {
  const W = SHEET_CELLS * 32;
  const rows = Math.ceil(Math.min(PER_SHEET, nextSlot - sh * PER_SHEET) / SHEET_CELLS);
  const H = rows * 32;
  const img = new Uint8Array(W * H * 4);
  for (const [sid, slot] of spriteSlot) {
    if (Math.floor(slot / PER_SHEET) !== sh) continue;
    const i = slot % PER_SHEET;
    blit(img, W, spr.get(sid), 32, 32, (i % SHEET_CELLS) * 32, Math.floor(i / SHEET_CELLS) * 32, H);
  }
  writePng(path.join(OUT, `sprites-${sh}.png`), W, H, img);
}
log(`${nextSlot - 1} sprites in ${sheetCount} sheet(s)`);

// ---------- interface graphics from Tibia.pic ----------
{
  const g = readPic(path.join(ASSETS, 'Tibia.pic')).images[3];
  writePng(path.join(OUT, 'gui.png'), g.width, g.height, g.data);
  // The client's stone background texture (top-left 96x96 of the skin) as a separate tileable image.
  const S = 96, img = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) img.set(g.data.subarray((y * g.width) * 4, (y * g.width + S) * 4), y * S * 4);
  writePng(path.join(OUT, 'stone.png'), S, S, img);
}

fs.writeFileSync(path.join(OUT, 'items.json'), JSON.stringify({ sheetCells: SHEET_CELLS, sheets: sheetCount, items: itemsOut }));
fs.writeFileSync(path.join(OUT, 'map.json'), JSON.stringify({ chunk: CHUNK, mini: MINI, bounds, chunks: chunkIndex, minimap: miniIndex }));
log(`Done -> ${OUT}`);
