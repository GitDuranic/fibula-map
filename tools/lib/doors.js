// Locked doors and keys: which doors are locked, and which key opens them.
// Door and key ids from TVP data/global.lua; a locked door turns into the open door (id + 2) when unlocked
// (data/scripts/actions/other/doors.lua). Key numbers from the item attributes in the map (TVP src/item.h).
import fs from 'node:fs';
import path from 'node:path';
import { walkNodes, Reader } from './nodefile.js';

const luaTable = (text, name) => {
  const m = new RegExp(`(?:^|\\n)\\s*${name}\\s*=\\s*\\{([^}]*)\\}`).exec(text);
  return new Set(m ? [...m[1].matchAll(/\d+/g)].map((x) => +x[0]) : []);
};

// { locked: Set(server id), keys: Set(server id) }
export function doorLists(dataDir) {
  const g = fs.readFileSync(path.join(dataDir, 'global.lua'), 'latin1');
  return { locked: luaTable(g, 'lockedDoors'), keys: luaTable(g, 'keys') };
}

// Reads an OTBM item's attributes (after its id): { count, tele: [x, y, z], actionId, keyNumber, keyhole }.
// Stops at an attribute it doesn't know (nothing after it is read).
export function readItemAttrs(r) {
  const a = {};
  while (r.left > 0) {
    const attr = r.u8();
    if (attr === 15 || attr === 12) a.count = r.u8(); // count, rune charges
    else if (attr === 4) a.actionId = r.u16();
    else if (attr === 23) a.keyNumber = r.u16();
    else if (attr === 24) a.keyhole = r.u16();
    else if (attr === 5 || attr === 10 || attr === 22 || (attr >= 25 && attr <= 27)) r.u16(); // unique id, depot, charges, door quest/level
    else if (attr === 14 || attr === 17) r.u8(); // house door id, decaying state
    else if (attr === 16) r.u32(); // duration
    else if (attr === 6 || attr === 7) r.str(); // text, description
    else if (attr === 8) a.tele = [r.u16(), r.u16(), r.u8()]; // teleport destination
    else break;
  }
  return a;
}

// Scans a map for locked doors with a key number and for numbered keys (also in containers).
// Returns { holes: Map("x,y,z" -> key number), keys: Map(key number -> key server id) }.
export function scanDoorsAndKeys(file, lists) {
  const holes = new Map(), keys = new Map();
  let area = null, pos = null;
  walkNodes(file, (node) => {
    const r = new Reader(node.data);
    if (node.type === 4) { area = { x: r.u16(), y: r.u16(), z: r.u8() }; return true; }
    if (node.type === 5 || node.type === 14) { pos = [area.x + r.u8(), area.y + r.u8(), area.z]; return true; }
    if (node.type === 6) {
      const sid = r.u16();
      if (!lists.locked.has(sid) && !lists.keys.has(sid)) return true;
      const a = readItemAttrs(r);
      const num = a.keyhole || a.actionId;
      if (lists.locked.has(sid) && num && pos) holes.set(pos.join(','), num);
      const keyNo = a.keyNumber || a.actionId; // 7.1 keys carry their number as action id
      if (lists.keys.has(sid) && keyNo && !keys.has(keyNo)) keys.set(keyNo, sid);
      return true;
    }
    return true;
  });
  return { holes, keys };
}
