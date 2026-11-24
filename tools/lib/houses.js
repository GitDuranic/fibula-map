// Houses (slice 17a, user 2026-11-24): where to show a house's renter on the map. The map's house tiles (OTBM
// HOUSETILE nodes carry the house id) and the house list (map-house.xml: id, name, entry) give each house a spot:
// the walkable house tile closest to the middle of the house's tiles on its entry's floor (else the floor with the
// most house tiles). houses.json: [[name, x, y, z]], names as in map-house.xml (the Fibula API uses the same names).
import fs from 'fs';
import { walkNodes, Reader } from './nodefile.js';

const OTBM = { TILE_AREA: 4, HOUSETILE: 14 };

// House id -> [[x, y, z], ...] from the map.
export function readHouseTiles(file) {
  const tiles = new Map();
  let area = null;
  walkNodes(file, (node) => {
    const r = new Reader(node.data);
    if (node.type === OTBM.TILE_AREA) { area = [r.u16(), r.u16(), r.u8()]; return true; }
    if (node.type === OTBM.HOUSETILE) {
      const x = area[0] + r.u8(), y = area[1] + r.u8(), id = r.u32();
      if (!tiles.has(id)) tiles.set(id, []);
      tiles.get(id).push([x, y, area[2]]);
      return false;
    }
    return node.type !== 5; // plain tiles: nothing inside them matters here
  });
  return tiles;
}

// map-house.xml -> [{ id, name, entry: [x, y, z] }]
export function readHouseList(file) {
  const xml = fs.readFileSync(file, 'utf8');
  const attr = (tag, a) => { const m = tag.match(new RegExp(`\\b${a}="([^"]*)"`)); return m ? m[1] : null; };
  const unxml = (s) => s.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  return [...xml.matchAll(/<house\b[^>]*>/g)].map(([tag]) => ({
    id: Number(attr(tag, 'houseid')),
    name: unxml(attr(tag, 'name') || ''),
    entry: ['entryx', 'entryy', 'entryz'].map((a) => Number(attr(tag, a))),
  })).filter((h) => h.name && h.id);
}

// The houses with a spot: [[name, x, y, z]]. walkable(x, y, z): can you stand there (walk data).
export function houseSpots(list, tiles, walkable) {
  const out = [];
  for (const h of list) {
    const all = tiles.get(h.id);
    if (!all?.length) continue;
    const perFloor = new Map();
    for (const t of all) { if (!perFloor.has(t[2])) perFloor.set(t[2], []); perFloor.get(t[2]).push(t); }
    const z = perFloor.has(h.entry[2]) ? h.entry[2] : [...perFloor].sort((a, b) => b[1].length - a[1].length)[0][0];
    const floor = perFloor.get(z);
    const mx = floor.reduce((s, t) => s + t[0], 0) / floor.length, my = floor.reduce((s, t) => s + t[1], 0) / floor.length;
    const pick = (list2) => list2.reduce((best, t) => {
      const d = (t[0] - mx) ** 2 + (t[1] - my) ** 2;
      return !best || d < best.d ? { t, d } : best;
    }, null)?.t;
    const spot = pick(floor.filter((t) => walkable(...t))) || pick(floor);
    out.push([h.name, ...spot]);
  }
  return out;
}

// walkable(x, y, z) from a converted folder's map.json + walk.bin.
export function walkableFromData(map, walkBin) {
  const C = map.chunk, offset = new Map();
  let i = 0;
  for (let z = 0; z < 16; z++) for (const [cx, cy] of map.chunks[z] || []) offset.set(`${z}:${cx}:${cy}`, (i++) * C * C);
  return (x, y, z) => {
    const o = offset.get(`${z}:${Math.floor(x / C)}:${Math.floor(y / C)}`);
    return o !== undefined && walkBin[o + (y % C) * C + (x % C)] > 0;
  };
}
