// Walk data for the router: which tiles can be walked on, how fast, and where floors connect.
// Rules from the TVP server (src/tile.cpp queryDestination, data/lib/core/position.lua moveUpstairs,
// data/global.lua, data/scripts/actions/other/teleport.lua); see the design doc, slice 3.
import fs from 'node:fs';
import path from 'node:path';

export const LINK_KINDS = ['step', 'ladder', 'grate', 'rope', 'dig', 'teleport'];
const LADDERS_UP = new Set([1386, 3678]); // teleport.lua: used to go up
const GRATES_DOWN = new Set([430]); // teleport.lua: used to go down

// A Lua table of numbers by name from global.lua, e.g. "ropeSpots = { 384, 418 }".
function luaTable(text, name) {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*=\\s*\\{([^}]*)\\}`).exec(text);
  return m ? [...m[1].matchAll(/\d+/g)].map((x) => +x[0]) : [];
}

// Per client id: { block, door, change: 'down'|'north'|'south'|'east'|'west'|null, use: link kind or null }.
export function walkRules({ dataDir, itemInfo, dat }) {
  const global = fs.readFileSync(path.join(dataDir, 'global.lua'), 'latin1');
  const doors = new Set(['openDoors', 'closedDoors', 'lockedDoors', 'openExtraDoors', 'closedExtraDoors', 'openHouseDoors',
    'closedHouseDoors', 'openQuestDoors', 'closedQuestDoors', 'openLevelDoors', 'closedLevelDoors'].flatMap((t) => luaTable(global, t)));
  const ropeSpots = new Set(luaTable(global, 'ropeSpots'));
  const digSpots = new Set(luaTable(global, 'holes'));
  const rules = new Map();
  for (const [cid, t] of dat.items) {
    const sid = itemInfo.toServer.get(cid);
    if (!sid) continue;
    const flags = itemInfo.otb.flags.get(sid) || 0;
    const change = itemInfo.server.get(sid)?.attrs.floorchange || null;
    let use = null;
    if (LADDERS_UP.has(sid)) use = 'ladder';
    else if (GRATES_DOWN.has(sid)) use = 'grate';
    else if (ropeSpots.has(sid)) use = 'rope';
    else if (digSpots.has(sid)) use = 'dig';
    const door = doors.has(sid);
    // items.otb flag 1 = blocks movement ("block solid"). Doors count as open (user: ignore doors).
    const block = !!(flags & 1) && !door;
    if (block || door || change || use || t.flags.GROUND !== undefined) rules.set(cid, { block, door, change, use, ground: t.flags.GROUND });
  }
  return { rules, counts: { doors: doors.size, ropeSpots: ropeSpots.size, digSpots: digSpots.size } };
}

// Builds the walk grid and floor links from the map.
// tileAt(x, y, z) -> items (client ids or [id, count]) or undefined.
// Returns { speedAt(x, y, z) -> 0 (blocked) or ground speed, links: [[x, y, z, tx, ty, tz, kind index]], skipped }.
export function buildWalk({ tileAt, rules }) {
  const ids = (items) => items.map((v) => (Array.isArray(v) ? v[0] : v));
  const speedCache = new Map();
  // Ground speed of a walkable tile, or 0.
  const speedAt = (x, y, z) => {
    const k = `${x},${y},${z}`;
    if (speedCache.has(k)) return speedCache.get(k);
    const items = tileAt(x, y, z);
    let speed = 0;
    if (items) {
      let ground = 0, blocked = false;
      for (const id of ids(items)) {
        const r = rules.get(id);
        if (!r) continue;
        if (r.ground !== undefined && !ground) ground = r.ground || 100;
        if (r.block) blocked = true;
      }
      speed = ground && !blocked ? ground : 0;
    }
    speedCache.set(k, speed);
    return speed;
  };
  const changeOf = (x, y, z) => {
    const items = tileAt(x, y, z);
    if (!items) return null;
    for (const id of ids(items)) { const c = rules.get(id)?.change; if (c) return c; }
    return null;
  };
  // Going down (hole, stairs down, dug hole): the tile below, shifted by its own floor-change direction.
  const down = (x, y, z) => {
    const dz = z + 1;
    if (!tileAt(x, y, dz)) return null;
    const c = changeOf(x, y, dz);
    if (c === 'north') y++;
    else if (c === 'south') y--;
    else if (c === 'east') x--;
    else if (c === 'west') x++;
    return tileAt(x, y, dz) ? [x, y, dz] : null;
  };
  // Going up by ladder or rope: one floor up, the tile south of it, else the first walkable neighbour
  // (north, east, west, west, south-west, south-east, north-west, north-east, as the server tries them).
  const up = (x, y, z) => {
    const dz = z - 1;
    if (speedAt(x, y + 1, dz)) return [x, y + 1, dz];
    for (const [dx, dy] of [[0, -1], [1, 0], [-1, 0], [-1, 0], [-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      if (speedAt(x + dx, y + dy, dz)) return [x + dx, y + dy, dz];
    }
    return speedAt(x, y + 1, dz) || tileAt(x, y + 1, dz) ? [x, y + 1, dz] : null;
  };
  const links = [];
  let skipped = 0;
  const addLink = (x, y, z, to, kind) => {
    if (!to) { skipped++; return; }
    links.push([x, y, z, ...to, LINK_KINDS.indexOf(kind)]);
  };
  // Every tile with a floor change or something to use.
  const visitTile = (x, y, z, items) => {
    let change = null, use = null;
    for (const id of ids(items)) {
      const r = rules.get(id);
      if (r?.change && !change) change = r.change;
      if (r?.use && !use) use = r.use;
    }
    if (change === 'down') addLink(x, y, z, down(x, y, z), 'step');
    else if (change) {
      const [dx, dy] = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] }[change] || [0, 0];
      addLink(x, y, z, tileAt(x + dx, y + dy, z - 1) ? [x + dx, y + dy, z - 1] : null, 'step');
    }
    if (use === 'ladder' || use === 'rope') addLink(x, y, z, up(x, y, z), use);
    else if (use === 'grate') addLink(x, y, z, tileAt(x, y, z + 1) ? [x, y, z + 1] : null, 'grate');
    else if (use === 'dig') addLink(x, y, z, down(x, y, z), 'dig');
  };
  return { speedAt, links, visitTile, skipped: () => skipped };
}
