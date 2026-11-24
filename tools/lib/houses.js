// Houses (slice 17a, user 2026-11-24): where to show a house's renter on the map. The map's house tiles (OTBM
// HOUSETILE nodes carry the house id) and the house list (map-house.xml: id, name, entry) give each house a spot:
// the walkable house tile closest to the middle of the house's tiles on its entry's floor (else the floor with the
// most house tiles). houses.json: [[name, [[x, y, z], ...] free squares, [x, y, z, direction away from the door] front door or null]], names as in map-house.xml (the Fibula API uses the same names).
import fs from 'fs';
import { walkNodes, Reader } from './nodefile.js';

const OTBM = { TILE_AREA: 4, ITEM: 6, HOUSETILE: 14 };
const SPOTS = 24; // free squares kept per house

// House id -> [[x, y, z, items], ...] from the map (items: how many items lie on the tile, the ground included).
export function readHouseTiles(file) {
  const tiles = new Map();
  let area = null;
  walkNodes(file, (node) => {
    const r = new Reader(node.data);
    if (node.type === OTBM.TILE_AREA) { area = [r.u16(), r.u16(), r.u8()]; return true; }
    if (node.type === OTBM.HOUSETILE) {
      const x = area[0] + r.u8(), y = area[1] + r.u8(), id = r.u32();
      let items = 0;
      while (r.left > 0) { const a = r.u8(); if (a === 3) r.u32(); else if (a === 9) { r.u16(); items++; } else break; }
      if (!tiles.has(id)) tiles.set(id, []);
      const t = [x, y, area[2], items];
      tiles.get(id).push(t);
      node.houseTile = t;
      return true; // its items are counted below
    }
    if (node.type === OTBM.ITEM) { if (node.parent?.houseTile) node.parent.houseTile[3]++; return false; }
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

// The houses with their free squares and front door (see houses.json above). walkable(x, y, z): can you stand there (walk data).
export function houseSpots(list, tiles, walkable) {
  const out = [];
  for (const h of list) {
    const all = tiles.get(h.id);
    if (!all?.length) continue;
    const perFloor = new Map();
    for (const t of all) { if (!perFloor.has(t[2])) perFloor.set(t[2], []); perFloor.get(t[2]).push(t); }
    const z = perFloor.has(h.entry[2]) ? h.entry[2] : [...perFloor].sort((a, b) => b[1].length - a[1].length)[0][0];
    // Some house ids have tiles in more than one place on the 7.2 map (user 2026-11-24: "Darashia 3, Flat 01" and
    // "Flat 02" also cover tiles 40 squares away, and their names landed in another building): only the connected
    // group of tiles closest to the house's entry counts.
    const floor = nearestGroup(perFloor.get(z), h.entry);
    const mx = floor.reduce((s, t) => s + t[0], 0) / floor.length, my = floor.reduce((s, t) => s + t[1], 0) / floor.length;
    // Free squares (user 2026-11-24: the character stands 'on a real square in the house', a random one each visit):
    // walkable with nothing but their floor on them, else any walkable ones, else any; up to SPOTS, nearest the middle.
    const near = (list2) => list2.map((t) => [(t[0] - mx) ** 2 + (t[1] - my) ** 2, t]).sort((a, b) => a[0] - b[0]).slice(0, SPOTS).map(([, t]) => [t[0], t[1], t[2]]);
    const free = (t) => walkable(t[0], t[1], t[2]);
    const empty = floor.filter((t) => free(t) && t[3] <= 1), walk = floor.filter(free);
    const spots = near(empty.length ? empty : walk.length ? walk : floor);
    // The front door (user 2026-11-24: some renters stand 'in front of their front door facing away from the door'):
    // the entry square, outside the house, next to one of its tiles; the direction from that tile to the entry
    // (0 north, 1 east, 2 south, 3 west). Left out when the entry isn't walkable or not next to the house.
    const [ex, ey, ez] = h.entry, own = new Set(all.filter((t) => t[2] === ez).map((t) => `${t[0]},${t[1]}`));
    const door = walkable(ex, ey, ez) && [[0, 1, 0], [-1, 0, 1], [0, -1, 2], [1, 0, 3]].find(([dx, dy]) => own.has(`${ex + dx},${ey + dy}`));
    out.push([h.name, spots, door ? [ex, ey, ez, door[2]] : null]);
  }
  return out;
}

// The tiles (one floor) split into groups that touch (8 neighbours); the group with a tile closest to entry [x, y].
function nearestGroup(tiles, entry) {
  const key = (x, y) => `${x},${y}`, left = new Map(tiles.map((t) => [key(t[0], t[1]), t]));
  let best = null;
  while (left.size) {
    const [k0, t0] = left.entries().next().value;
    left.delete(k0);
    const group = [t0], todo = [t0];
    while (todo.length) {
      const [x, y] = todo.pop();
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const k = key(x + dx, y + dy), t = left.get(k);
        if (t) { left.delete(k); group.push(t); todo.push(t); }
      }
    }
    const d = Math.min(...group.map((t) => Math.max(Math.abs(t[0] - entry[0]), Math.abs(t[1] - entry[1]))));
    if (!best || d < best.d) best = { group, d };
  }
  return best.group;
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
