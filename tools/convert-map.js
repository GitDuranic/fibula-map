// Converts Tibia client files + server map into web data for the Tibia map viewer.
//
// Usage: node tools/convert-map.js [--assets "<dir>"] [--data "<server data dir>"] [--map "<map.otbm>"] [--spawn "<spawn.xml>"] [--out public/map-data]
//
// Inputs (all in the repo by default, see the README):
//   <assets>/Tibia.dat, Tibia.spr, Tibia.pic         client files (7.6 format, 7.1 item data)     default assets/client
//   <data>/items/items.otb, items.xml, global.lua,   TVP data: item list, door/key ids, NPCs,        default assets/tvp-data
//     npc/, monster/, scripts/actions/map/quests.lua,  monsters, quest chests, the 7.6 map (key numbers, quest spots)
//     world/map.otbm
//   <map>                                            the 7.1 map (TVP item ids)                    default assets/map71/Tibia71.otbm
//   <spawn>                                          7.1 NPC and monster spawns                    default assets/map71/Tibia71-spawn.xml
//   tools/data/wikiquests.json, custom-places.json   TibiaWiki quests; the user's named locations
// Outputs (in <out>/):
//   items.json            draw info and name for every item on the map or traded by an NPC (keyed by client id),
//                         plus fluid names by fluid type
//   quests.json           quest chests on the 7.1 map: quest name/version/reward (TibiaWiki), chests with items
//   doors.json            locked doors [[x,y,z, door id, open door id, key number (0 unknown), key id]] (client ids)
//   walk.bin, links.json  router data: per tile 0 (blocked) or ground speed / 2, in map.json chunk order;
//                         floor changes [[x,y,z, tx,ty,tz, kind]] (kinds: step, ladder, grate, rope, dig, teleport);
//                         passages [[NPC, destination, price, min level, x,y,z, tx,ty,tz]] (boats, carpets, Oracle)
//   places.json           [{ n name, k 'town' | 'depot', p [x,y,z] }] towns from the map's town list (temple), depots
//   monsters.json, monsters.png  monster kinds (stats, outfit, loot without chances) and 7.1 spawns, see below
//   npcs.json, npcs.png   NPCs: [{ n name, p [x,y,z], img [x,y,w,h] in npcs.png (outfit standing, coloured),
//                         d displacement, sells/buys [[client id, price(, fluid type)]], travel [[name, price, x,y,z]] }]
//                         (7.1 positions from --spawn; names/outfits/trade/travel from the TVP NPC files for now)
//   sprites-N.png         sprite atlases (64x64 cells of 32px)
//   gui.png, stone.png    client interface graphics from Tibia.pic (skin + tileable stone texture)
//   font-outlined.png, fonts.json   the client's outlined font (creature names) and its glyph widths
//   map.json              bounds, chunk size, which chunks exist per floor
//   chunks/<z>/<cx>_<cy>.json   one 32x32 tile chunk, tiles in row order: 0 (none), an item, or [item, item, ...]
//                         item = client id, or [client id, count] for stack counts / fluid types
//   overview/<set>/<level>/<bx>_<by>.webp  the map drawn with sprites for far zoom: level = px per tile (8, 4, 2, 1),
//                         1024x1024 px each; set "surface" (floors 7..0 from above) or "8".."15"

import fs from 'node:fs';
import path from 'node:path';
import { parseDat } from './lib/dat.js';
import { openSpr, readPic, blit } from './lib/spr.js';
import { walkNodes, Reader, parseOtb } from './lib/nodefile.js';
import { doorLists, readItemAttrs, scanDoorsAndKeys } from './lib/doors.js';
import { parseQuestChests, matchQuests, loadWikiQuests } from './lib/quests.js';
import { writePng } from './lib/png.js';
import sharp from 'sharp';
import { drawTile, TILE as TILE32 } from '../src/map/engine/render.js';
import { loadItemInfo } from './lib/iteminfo.js';
import { loadNpcs, renderOutfit } from './lib/npcs.js';
import { loadMonsters, spawnGroups } from './lib/monsters.js';
import { walkRules, buildWalk, LINK_KINDS } from './lib/walk.js';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? a.concat([[v.slice(2), arr[i + 1]]]) : a), []));
// The input files are in the repo (assets/, see the README); each can be pointed elsewhere with its option.
const ASSETS = args.assets || 'assets/client'; // Tibia.dat, Tibia.spr, Tibia.pic
const DATA = args.data || 'assets/tvp-data'; // the parts of TVP's data folder the converter reads
const MAP = args.map || 'assets/map71/Tibia71.otbm'; // 7.1 map in TVP item ids
// The TVP 7.6 map: only for key numbers on locked doors, which the converted 7.1 map mostly lacks.
const MAP76 = args.map76 || path.join(DATA, 'world/map.otbm');
const SPAWN = args.spawn || 'assets/map71/Tibia71-spawn.xml'; // 7.1 NPC and monster spawns
// The data is built in a separate folder and swapped in at the end, so a running map never sees it half-built
// (the old way deleted the folder first, and a page opened during a convert showed nothing but grey).
const FINAL_OUT = args.out || 'public/map-data';
const OUT = `${FINAL_OUT}.building`;
const CHUNK = 32; // tiles per data chunk side

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

log('Reading client files');
const dat = parseDat(path.join(ASSETS, 'Tibia.dat'));
const spr = openSpr(path.join(ASSETS, 'Tibia.spr'));
const otb = parseOtb(path.join(DATA, 'items/items.otb'));
const toClient = (sid) => otb.map.get(sid) || 0;
const itemInfo = loadItemInfo(DATA);
// Depot lockers (items.xml name "locker"): where the depots are.
const lockerSids = new Set([...itemInfo.server].filter(([, it]) => it.name === 'locker').map(([sid]) => sid));

// ---------- map ----------
// floors[z] = Map(chunkKey "cx,cy" -> Map(tileIndex -> items[]))
const OTBM = { TILE_AREA: 4, TILE: 5, ITEM: 6, TOWN: 13, HOUSETILE: 14 };
const towns = []; // { name, temple: [x, y, z] } from the map's town list
const lockers = []; // [x, y, z]
const teleports = []; // [x, y, z, to x, to y, to z]: items with a teleport destination (magic forcefields)
// Locked doors and keys (see tools/lib/doors.js): doors [{ pos, sid, num }], keys Map(key number -> key server id).
const DOOR_LISTS = doorLists(DATA);
const lockedDoors = [], keys71 = new Map();
const floors = Array.from({ length: 16 }, () => new Map());
const usedItems = new Set();
const missing = new Map();
const bounds = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
let tileCount = 0;
log('Reading map');
{
  let area = null, tile = null, pos = null;
  const addItem = (sid, count) => {
    if (lockerSids.has(sid)) lockers.push(pos);
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
        pos = [x, y, z];
        while (r.left > 0) {
          const attr = r.u8();
          if (attr === 3) r.u32();
          else if (attr === 9) { const sid = r.u16(); if (DOOR_LISTS.locked.has(sid)) lockedDoors.push({ pos, sid, num: 0 }); addItem(sid); }
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
        if (!tile) return false;
        const sid = r.u16();
        const a = readItemAttrs(r);
        // Inside a container: only keys matter (their number tells which key a locked door needs).
        if (node.parent?.type !== OTBM.TILE && node.parent?.type !== OTBM.HOUSETILE) {
          if (DOOR_LISTS.keys.has(sid) && (a.keyNumber || a.actionId) && !keys71.has(a.keyNumber || a.actionId)) keys71.set(a.keyNumber || a.actionId, sid);
          return true;
        }
        if (a.tele) teleports.push([...pos, ...a.tele]);
        if (DOOR_LISTS.locked.has(sid)) lockedDoors.push({ pos, sid, num: a.keyhole || a.actionId || 0 });
        if (DOOR_LISTS.keys.has(sid) && (a.keyNumber || a.actionId) && !keys71.has(a.keyNumber || a.actionId)) keys71.set(a.keyNumber || a.actionId, sid);
        addItem(sid, a.count);
        return true; // look inside containers too (keys in chests)
      }
      case OTBM.TOWN: { r.u32(); const name = r.str(); towns.push({ name, temple: [r.u16(), r.u16(), r.u8()] }); return false; }
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

const tileAt = (x, y, z) => floors[z]?.get(`${Math.floor(x / CHUNK)},${Math.floor(y / CHUNK)}`)?.get((y - Math.floor(y / CHUNK) * CHUNK) * CHUNK + (x - Math.floor(x / CHUNK) * CHUNK));

// ---------- walk data (router) ----------
// walk.bin: one byte per tile, chunk by chunk in the order of map.json "chunks" (per floor, as listed):
// 0 = can't walk there, else ground speed / 2. links.json: [[x, y, z, to x, to y, to z, kind]] floor changes.
log('Building walk data');
const { rules: walkRuleMap, counts: walkCounts } = walkRules({ dataDir: DATA, itemInfo, dat });
const walk = buildWalk({ tileAt, rules: walkRuleMap });
const walkBytes = [];
const speeds = new Map();
for (let z = 0; z < 16; z++) {
  for (const [cx, cy] of chunkIndex[z] || []) {
    const buf = new Uint8Array(CHUNK * CHUNK);
    for (const [i, items] of floors[z].get(`${cx},${cy}`)) {
      const x = cx * CHUNK + (i % CHUNK), y = cy * CHUNK + Math.floor(i / CHUNK);
      const sp = walk.speedAt(x, y, z);
      if (sp) { buf[i] = Math.max(1, Math.min(255, Math.round(sp / 2))); speeds.set(sp, (speeds.get(sp) || 0) + 1); }
      walk.visitTile(x, y, z, items);
    }
    walkBytes.push(buf);
  }
}
fs.writeFileSync(path.join(OUT, 'walk.bin'), Buffer.concat(walkBytes.map((b) => Buffer.from(b))));
// Magic forcefields: stepping onto one moves you to its destination. Destination 0,0,0 (scripted, or broken) or
// not on the map: left out.
// Nothing leads back to Rookgaard from the mainland in the game. With doors counted as open, a GM forcefield in
// the Thais temple (32366,32235,7) would otherwise send routes to Rookgaard and on through the Oracle.
const ROOKGAARD = { x1: 31900, y1: 32000, x2: 32255, y2: 32300 }; // the island, every floor
const inRook = (x, y) => x >= ROOKGAARD.x1 && x <= ROOKGAARD.x2 && y >= ROOKGAARD.y1 && y <= ROOKGAARD.y2;
const intoRook = (x, y, tx, ty) => !inRook(x, y) && inRook(tx, ty);
const badTeleports = [], rookTeleports = [];
for (const [x, y, z, tx, ty, tz] of teleports) {
  if (!tileAt(tx, ty, tz)) badTeleports.push(`${x},${y},${z} -> ${tx},${ty},${tz}`);
  else if (intoRook(x, y, tx, ty)) rookTeleports.push(`${x},${y},${z} -> ${tx},${ty},${tz}`);
  else walk.links.push([x, y, z, tx, ty, tz, LINK_KINDS.indexOf('teleport')]);
}
if (rookTeleports.length) log(`Teleports from the mainland to Rookgaard, left out: ${rookTeleports.join('; ')}`);
if (badTeleports.length) log(`Teleports without a destination on the map, left out: ${badTeleports.length} (${badTeleports.slice(0, 8).join('; ')}${badTeleports.length > 8 ? '; ...' : ''})`);
{
  const byKind = LINK_KINDS.map((k, i) => `${k} ${walk.links.filter((l) => l[6] === i).length}`).join(', ');
  const walkable = [...speeds.values()].reduce((a, b) => a + b, 0);
  log(`Walk: ${walkable} walkable tiles, ground speeds ${[...speeds.keys()].sort((a, b) => a - b).join('/')}; links: ${byKind}; ${walk.skipped()} without a destination; ${walkCounts.doors} door ids open`);
}

// ---------- locked doors (keys) ----------
// doors.json: [[x, y, z, door client id, open door client id, key number (0 = unknown), key client id]].
// The key number comes from the 7.1 map, else from the TVP 7.6 map at the same spot. The key's look and name come
// from a key with that number lying on either map, else a plain copper key.
log('Reading key numbers from the 7.6 map');
const map76 = scanDoorsAndKeys(MAP76, DOOR_LISTS);
const PLAIN_KEY = 2089; // copper key
const keySid = (num) => keys71.get(num) || map76.keys.get(num) || PLAIN_KEY;
let from71 = 0, from76 = 0;
const doorsOut = [];
for (const d of lockedDoors) {
  let num = d.num;
  if (num) from71++;
  else if ((num = map76.holes.get(d.pos.join(',')) || 0)) from76++;
  const cid = toClient(d.sid), open = toClient(d.sid + 2), key = toClient(num ? keySid(num) : PLAIN_KEY);
  if (!cid || !open || !key) continue;
  usedItems.add(open); usedItems.add(key);
  doorsOut.push([...d.pos, cid, open, num, key]);
}
fs.writeFileSync(path.join(OUT, 'doors.json'), JSON.stringify(doorsOut));
{
  const nums = doorsOut.filter((d) => d[5]);
  const typed = nums.filter((d) => keys71.has(d[5]) || map76.keys.has(d[5])).length;
  log(`Locked doors: ${doorsOut.length}, key number known for ${nums.length} (${from71} from 7.1, ${from76} from 7.6; ${new Set(nums.map((d) => d[5])).size} keys, ${typed} doors with a key of known look)`);
}

// ---------- quest chests (slice 10) ----------
// quests.json: [{ n quest name, v version ('' = the wiki gives none), reward (the wiki's text),
//                 chests: [{ p [x, y, z] on the 7.1 map, id (the chest item), items [[client id, count, key number?]] }] }]
// Only chests that are on the 7.1 map, with only the items TibiaWiki names (see tools/lib/quests.js).
{
  const lua = fs.readFileSync(path.join(DATA, 'scripts/actions/map/quests.lua'), 'latin1');
  const nameOf = (sid) => itemInfo.server.get(sid)?.name;
  // Where the quest spot is on the 7.1 map. The 7.1 map often has another object there than the 7.6 map (a chest
  // where 7.6 has a box, a sycamore for a dead tree, the rewards lying on a counter), and quest items don't only come
  // from chests (user: e.g. the Blood Herb Quest, where you use a tree). So:
  //   - on the spot itself: any object that isn't ground or a wall;
  //   - on a tile next to it: the same object, or any container-like one (chest, box, crate, coffin, dead body, ...).
  const CONTAINERISH = /chest|box|crate|coffin|sarcophag|dead|bones|corpse|trunk|barrel|drawers/;
  const objects = (x, y, z) => (tileAt(x, y, z) || []).map((v) => (Array.isArray(v) ? v[0] : v))
    .filter((cid) => dat.items.get(cid)?.flags.GROUND === undefined)
    .map((cid) => nameOf(itemInfo.toServer.get(cid)) || '')
    .filter((n) => n && !/wall|border|edge|pillar|archway|framework/.test(n));
  const on71 = (pt, name) => {
    if (objects(pt[0], pt[1], pt[2]).length) return pt;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      if (objects(pt[0] + dx, pt[1] + dy, pt[2]).some((n) => n === name || CONTAINERISH.test(n))) return [pt[0] + dx, pt[1] + dy, pt[2]];
    }
    return null;
  };
  const { quests, stats } = matchQuests({
    spots76: map76.questSpots, chestItems: parseQuestChests(lua), wiki: loadWikiQuests('tools/data/wikiquests.json'), nameOf, on71,
  });
  const questsOut = quests.map((q) => ({
    n: q.name, v: q.version, reward: q.reward,
    chests: q.chests.map((c) => ({
      p: c.p, id: (() => { const cid = toClient(c.sid); if (cid) usedItems.add(cid); return cid; })(), // the chest itself (icon)
      items: c.items.map((i) => { const cid = toClient(i.sid); if (cid) usedItems.add(cid); return i.key ? [cid, i.count, i.key] : [cid, i.count]; }).filter((x) => x[0]),
    })),
  }));
  fs.writeFileSync(path.join(OUT, 'quests.json'), JSON.stringify(questsOut));
  log(`Quest chests: ${stats.spots} on the 7.6 map, ${stats.on71} of them on the 7.1 map, ${stats.matched} with a TibiaWiki quest -> ${questsOut.length} quests, ${questsOut.reduce((a, q) => a + q.chests.length, 0)} chests`);
}

// ---------- NPCs ----------
// 7.1 positions from the spawn file; names, outfits, trade and travel from the TVP (7.6) NPC files for now.
log('Reading NPCs');
const FLUIDS = [''];
for (let t = 1; t <= 12; t++) FLUIDS.push(itemInfo.server.get(t)?.name || 'water');
const npcList = loadNpcs({ spawnFile: SPAWN, npcDir: path.join(DATA, 'npc'), log });
// An offer as [client id, price] or [client id, price, fluid type]; its item gets into the atlas for the icon.
const offerOut = (o) => {
  const cid = toClient(o.sid);
  if (!cid || !dat.items.has(cid)) return null;
  usedItems.add(cid);
  return o.data != null ? [cid, o.price, o.data] : [cid, o.price];
};
const NPC_CELL = 64, NPC_COLS = 16;
const npcSheetW = NPC_COLS * NPC_CELL, npcSheetH = Math.ceil(npcList.length / NPC_COLS) * NPC_CELL;
const npcSheet = new Uint8Array(npcSheetW * npcSheetH * 4);
const droppedTravel = [];
const npcsOut = npcList.map((n, i) => {
  let thing = null, colors = [0, 0, 0, 0];
  if (n.look?.type) { thing = dat.outfits[n.look.type - 1]; colors = [n.look.head || 0, n.look.body || 0, n.look.legs || 0, n.look.feet || 0]; }
  else if (n.look?.typeex) thing = dat.items.get(toClient(n.look.typeex));
  let img = null;
  if (thing) {
    const r = renderOutfit(spr, thing, n.dir, colors);
    const ax = (i % NPC_COLS) * NPC_CELL, ay = Math.floor(i / NPC_COLS) * NPC_CELL;
    blit(npcSheet, npcSheetW, r.data, r.width, r.height, ax, ay, npcSheetH);
    img = [ax, ay, r.width, r.height];
  }
  const disp = thing?.flags.DISPLACEMENT;
  // Passages to places that aren't on the 7.1 map (Port Hope, Ankrahmun, ...) are left out.
  const travel = n.travel.filter((t) => {
    const ok = !!tileAt(t.to[0], t.to[1], t.to[2]);
    if (!ok) droppedTravel.push(`${n.name} -> ${t.name}`);
    return ok;
  }).map((t) => [t.name, t.price, ...t.to]);
  return {
    n: n.name, p: [n.x, n.y, n.z], img, d: disp ? [disp.x, disp.y] : [0, 0],
    sells: n.sells.map(offerOut).filter(Boolean), buys: n.buys.map(offerOut).filter(Boolean), travel,
  };
});
// ---------- places: towns (the map's town list, also internal names like Mists or Minoroom) and depots ----------
// The real towns of 7.1 (the rest of the town list are internal names: hunting areas, quest spots, the GM
// island "Isle of Solitude", ...).
const REAL_TOWNS = new Set(['Rookgaard', 'Thais', 'Carlin', 'Kazordoon', "Ab'Dendriel", 'Edron', 'Darashia', 'Venore', 'Fibula', 'Senja', 'Folda', 'Vega']);
const placesOut = [];
const townsHere = towns.filter((t) => tileAt(...t.temple)); // e.g. Ankrahmun is listed but not on the 7.1 map
for (const t of townsHere) placesOut.push({ n: t.name, k: REAL_TOWNS.has(t.name) ? 'town' : 'place', p: t.temple });
// Depots: lockers within 16 tiles of each other, on any floor, are one depot (depots span floors, e.g. Thais 5-8).
// It is placed on its floor closest to the ground floor (where you walk in), at the middle of the lockers there.
const groups = [];
for (const l of lockers) {
  const near = groups.filter((g) => g.some((m) => Math.abs(m[0] - l[0]) <= 16 && Math.abs(m[1] - l[1]) <= 16));
  const merged = [l, ...near.flat()];
  for (const g of near) groups.splice(groups.indexOf(g), 1);
  groups.push(merged);
}
const nearestTown = (p) => townsHere.filter((t) => REAL_TOWNS.has(t.name)).reduce((b, t) => {
  const d = Math.hypot(t.temple[0] - p[0], t.temple[1] - p[1]);
  return !b || d < b.d ? { t, d } : b;
}, null)?.t.name || '';
const depotNames = new Map();
for (const g of groups) {
  const z = g.map((l) => l[2]).sort((a, b) => Math.abs(a - 7) - Math.abs(b - 7) || g.filter((l) => l[2] === b).length - g.filter((l) => l[2] === a).length)[0];
  const on = g.filter((l) => l[2] === z);
  const mx = on.reduce((a, l) => a + l[0], 0) / on.length, my = on.reduce((a, l) => a + l[1], 0) / on.length;
  const at = on.reduce((b, l) => (Math.hypot(l[0] - mx, l[1] - my) < Math.hypot(b[0] - mx, b[1] - my) ? l : b));
  const town = nearestTown(at), i = (depotNames.get(town) || 0) + 1;
  depotNames.set(town, i);
  placesOut.push({ n: i > 1 ? `${town} depot ${i}` : `${town} depot`, k: 'depot', p: at });
}
const depots = groups;
// Locations the user named on the map (tools/data/custom-places.json, added with the dev server): kind 'custom'.
{
  let custom = [];
  try { custom = JSON.parse(fs.readFileSync('tools/data/custom-places.json', 'utf8')); } catch { /* none */ }
  for (const c of custom) placesOut.push({ n: c.n, k: 'custom', p: c.p });
  log(`Named locations: ${custom.length}`);
}
fs.writeFileSync(path.join(OUT, 'places.json'), JSON.stringify(placesOut));
log(`Places: ${townsHere.length} towns (of ${towns.length} in the town list), ${depots.length} depots (${lockers.length} lockers)`);

writePng(path.join(OUT, 'npcs.png'), npcSheetW, npcSheetH, npcSheet);
fs.writeFileSync(path.join(OUT, 'npcs.json'), JSON.stringify(npcsOut));
log(`${npcsOut.length} NPCs, ${npcsOut.filter((n) => n.sells.length || n.buys.length).length} traders, ${npcsOut.filter((n) => n.travel.length).length} with travel`);
if (droppedTravel.length) log(`Passages to places not on this map, left out: ${droppedTravel.join(', ')}`);

// ---------- links.json: floor changes and teleports, plus NPC passages ----------
// passages: [[NPC name, destination name, price, min level, x, y, z (the NPC), to x, to y, to z]]: boats and
// carpets (talk to the NPC, pay, arrive), and the Oracle's one-way trips from Rookgaard (level 8, free).
const passages = [];
npcList.forEach((n, i) => {
  for (const [name, price, tx, ty, tz] of npcsOut[i].travel) {
    if (intoRook(n.x, n.y, tx, ty)) droppedTravel.push(`${n.name} -> ${name} (Rookgaard)`);
    else passages.push([n.name, name, price, 0, n.x, n.y, n.z, tx, ty, tz]);
  }
  for (const t of n.oracle) {
    if (tileAt(...t.to)) passages.push([n.name, t.name, t.price, t.level, n.x, n.y, n.z, ...t.to]);
    else droppedTravel.push(`${n.name} -> ${t.name}`);
  }
});
fs.writeFileSync(path.join(OUT, 'links.json'), JSON.stringify({ kinds: LINK_KINDS, links: walk.links, passages }));
log(`Passages: ${passages.length} (${new Set(passages.map((p) => p[0])).size} NPCs), of which ${passages.filter((p) => p[3]).length} need a level`);

// ---------- monsters ----------
// monsters.json: { kinds: [{ n name, hp, xp, img [x,y,w,h] in monsters.png, d displacement, loot [[client id, max count]] }],
//                  spawns: [[x, y, z, kind, amount, radius, group]] }   (group: spawn points within 10 tiles, same floor)
// 7.1 spawns from --spawn; stats, outfits and loot from the TVP monster files for now. No drop chances (see the doc).
log('Reading monsters');
const mons = loadMonsters({ spawnFile: SPAWN, monsterDir: path.join(DATA, 'monster') });
if (mons.missing.length) log(`Monsters without a TVP file (shown without stats/outfit): ${mons.missing.join(', ')}`);
const spawnGroup = spawnGroups(mons.spawns, 10);
const MON_CELL = 64, MON_COLS = 16;
const monSheetW = MON_COLS * MON_CELL, monSheetH = Math.max(1, Math.ceil(mons.kinds.length / MON_COLS)) * MON_CELL;
const monSheet = new Uint8Array(monSheetW * monSheetH * 4);
const kindsOut = mons.kinds.map((m, i) => {
  let thing = null, colors = [0, 0, 0, 0];
  if (m.look.type) { thing = dat.outfits[m.look.type - 1]; colors = [m.look.head || 0, m.look.body || 0, m.look.legs || 0, m.look.feet || 0]; }
  else if (m.look.typeex) thing = dat.items.get(toClient(m.look.typeex));
  let img = null;
  if (thing) {
    const r = renderOutfit(spr, thing, 2, colors); // facing south
    const ax = (i % MON_COLS) * MON_CELL, ay = Math.floor(i / MON_COLS) * MON_CELL;
    blit(monSheet, monSheetW, r.data, r.width, r.height, ax, ay, monSheetH);
    img = [ax, ay, r.width, r.height];
  }
  const disp = thing?.flags.DISPLACEMENT;
  const loot = m.loot.map(({ sid, count }) => {
    const cid = toClient(sid);
    if (!cid || !dat.items.has(cid)) return null;
    usedItems.add(cid);
    return [cid, count];
  }).filter(Boolean);
  return { n: m.name, hp: m.hp, xp: m.xp, img, d: disp ? [disp.x, disp.y] : [0, 0], loot };
});
const spawnsOut = mons.spawns.map((sp, i) => [sp.x, sp.y, sp.z, sp.kind, sp.amount, sp.radius, spawnGroup[i]]);
writePng(path.join(OUT, 'monsters.png'), monSheetW, monSheetH, monSheet);
fs.writeFileSync(path.join(OUT, 'monsters.json'), JSON.stringify({ kinds: kindsOut, spawns: spawnsOut }));
{
  const creatures = mons.spawns.reduce((a, sp) => a + sp.amount, 0);
  log(`Monsters: ${kindsOut.length} kinds, ${spawnsOut.length} spawn points (${creatures} creatures) in ${new Set(spawnGroup).size} spawn groups; ${kindsOut.filter((k) => !k.img).length} kinds without an outfit`);
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
  itemsOut[id] = { n: itemInfo.byClient(id)?.name || '', f, w: t.width, h: t.height, l: t.layers, px: t.patternX, py: t.patternY, pz: t.patternZ, a: t.phases, s: t.sprites.map(slotOf) };
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
  const pic = readPic(path.join(ASSETS, 'Tibia.pic'));
  const g = pic.images[3];
  writePng(path.join(OUT, 'gui.png'), g.width, g.height, g.data);
  // The client's outlined font (creature names): 16x16 cells, characters 32-255, with each glyph's width.
  const f = pic.images[4], cellW = 16, cellH = 16, cols = f.width / cellW, widths = [];
  for (let c = 32; c < 256; c++) {
    const i = c - 32, cx = (i % cols) * cellW, cy = Math.floor(i / cols) * cellH;
    let maxX = -1;
    for (let y = 0; y < cellH; y++) for (let x = 0; x < cellW; x++) if (f.data[((cy + y) * f.width + cx + x) * 4 + 3]) maxX = Math.max(maxX, x);
    widths.push(maxX + 1);
  }
  writePng(path.join(OUT, 'font-outlined.png'), f.width, f.height, f.data);
  fs.writeFileSync(path.join(OUT, 'fonts.json'), JSON.stringify({ outlined: { cellW, cellH, cols, widths } }));
  // The client's stone background texture (top-left 96x96 of the skin) as a separate tileable image.
  const S = 96, img = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) img.set(g.data.subarray((y * g.width) * 4, (y * g.width + S) * 4), y * S * 4);
  writePng(path.join(OUT, 'stone.png'), S, S, img);
}

fs.writeFileSync(path.join(OUT, 'items.json'), JSON.stringify({ sheetCells: SHEET_CELLS, sheets: sheetCount, fluids: FLUIDS, items: itemsOut }));

// ---------- overview images (zoomed out) ----------
// The map drawn with the real sprites at 8 px per tile (sprites shrunk 4x4 -> 1 px), then halved for
// 4, 2 and 1 px per tile. Every image is 1024x1024 px, so it covers 1024 / level tiles.
// Sets: "surface" = floors 7..0 seen from above in floor 7's frame (floors 0-6 reuse it, shifted one tile
// per floor, as the client draws them); "8".."15" = that underground floor alone.
const OV_PX = 1024, OV_LEVELS = [1, 2, 4, 8], OV_TOP = 8;
const SHRINK = TILE32 / OV_TOP; // 4
const sidOfSlot = [];
for (const [sid, slot] of spriteSlot) sidOfSlot[slot] = sid;
const smallCache = new Map();
// A sprite shrunk to 8x8 (box filter, colour weighted by alpha).
function smallSprite(slot) {
  let s = smallCache.get(slot);
  if (s) return s;
  const src = spr.get(sidOfSlot[slot]), N = TILE32 / SHRINK;
  s = new Uint8ClampedArray(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let a = 0, r = 0, g = 0, b = 0;
    for (let yy = 0; yy < SHRINK; yy++) for (let xx = 0; xx < SHRINK; xx++) {
      const p = ((y * SHRINK + yy) * TILE32 + x * SHRINK + xx) * 4, al = src[p + 3];
      a += al; r += src[p] * al; g += src[p + 1] * al; b += src[p + 2] * al;
    }
    const o = (y * N + x) * 4;
    if (a) { s[o] = r / a; s[o + 1] = g / a; s[o + 2] = b / a; s[o + 3] = a / (SHRINK * SHRINK); }
  }
  smallCache.set(slot, s);
  return s;
}
// Paints src (w x h, straight alpha) over dst at (dx, dy).
function paint(dst, W, src, w, h, dx, dy) {
  for (let y = 0; y < h; y++) {
    const ty = dy + y;
    if (ty < 0 || ty >= W) continue;
    for (let x = 0; x < w; x++) {
      const tx = dx + x;
      if (tx < 0 || tx >= W) continue;
      const s = (y * w + x) * 4, sa = src[s + 3] / 255;
      if (!sa) continue;
      const d = (ty * W + tx) * 4, da = dst[d + 3] / 255, oa = sa + da * (1 - sa);
      for (let c = 0; c < 3; c++) dst[d + c] = (src[s + c] * sa + dst[d + c] * da * (1 - sa)) / oa;
      dst[d + 3] = oa * 255;
    }
  }
}
const wrapTile = (items, x, y, z) => ({ x, y, z, items: items.map((v) => (Array.isArray(v) ? { id: v[0], count: v[1] } : { id: v })) });
// Is there anything of these floors in the frame-z tile square [x0, x0+n) x [y0, y0+n)?
function anyIn(floorsList, z, x0, y0, n) {
  for (const zz of floorsList) {
    const d = z - zz;
    for (let cy = Math.floor((y0 + d) / CHUNK); cy <= Math.floor((y0 + d + n + 2) / CHUNK); cy++)
      for (let cx = Math.floor((x0 + d) / CHUNK); cx <= Math.floor((x0 + d + n + 2) / CHUNK); cx++)
        if (floors[zz].has(`${cx},${cy}`)) return true;
  }
  return false;
}
// The 8 px/tile image of block (bx, by): 128x128 tiles of frame z.
function renderTop(floorsList, z, bx, by) {
  const n = OV_PX / OV_TOP, x0 = bx * n, y0 = by * n, img = new Uint8ClampedArray(OV_PX * OV_PX * 4);
  const drawSprite = (slot, dx, dy) => paint(img, OV_PX, smallSprite(slot), OV_TOP, OV_TOP, Math.round(dx / SHRINK), Math.round(dy / SHRINK));
  for (const zz of floorsList) { // bottom floor first
    const d = z - zz;
    for (let sy = 0; sy < n + 2; sy++) for (let sx = 0; sx < n + 2; sx++) {
      const items = tileAt(x0 + sx + d, y0 + sy + d, zz);
      if (items && items.length) drawTile(itemsOut, wrapTile(items, x0 + sx + d, y0 + sy + d, zz), sx * TILE32, sy * TILE32, drawSprite);
    }
  }
  return img;
}
// Halves a 1024 px image into one quadrant of another (box filter, colour weighted by alpha).
function halveInto(dst, src, qx, qy) {
  const H = OV_PX / 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < H; x++) {
    let a = 0, r = 0, g = 0, b = 0;
    for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const p = ((y * 2 + oy) * OV_PX + x * 2 + ox) * 4, al = src[p + 3];
      a += al; r += src[p] * al; g += src[p + 1] * al; b += src[p + 2] * al;
    }
    const o = ((qy * H + y) * OV_PX + qx * H + x) * 4;
    if (a) { dst[o] = r / a; dst[o + 1] = g / a; dst[o + 2] = b / a; dst[o + 3] = a / 4; }
  }
}
const overviewIndex = {};
let overviewBytes = 0;
async function writeOverview(set, level, bx, by, img) {
  const dir = path.join(OUT, 'overview', set, String(level));
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${bx}_${by}.webp`);
  await sharp(Buffer.from(img.buffer), { raw: { width: OV_PX, height: OV_PX, channels: 4 } }).webp({ quality: 80, alphaQuality: 60, effort: 4 }).toFile(file);
  overviewBytes += fs.statSync(file).size;
  ((overviewIndex[set] ||= {})[level] ||= []).push([bx, by]);
}
// Renders block (bx, by) of `level` (and everything under it), writes it, returns its pixels or null if empty.
async function overview(set, floorsList, z, level, bx, by) {
  const n = OV_PX / level;
  if (!anyIn(floorsList, z, bx * n, by * n, n)) return null;
  let img;
  if (level === OV_TOP) img = renderTop(floorsList, z, bx, by);
  else {
    img = new Uint8ClampedArray(OV_PX * OV_PX * 4);
    for (const [qx, qy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      const child = await overview(set, floorsList, z, level * 2, bx * 2 + qx, by * 2 + qy);
      if (child) halveInto(img, child, qx, qy);
    }
  }
  await writeOverview(set, level, bx, by, img);
  return img;
}
log('Rendering overview images');
const sets = [['surface', [7, 6, 5, 4, 3, 2, 1, 0], 7]];
for (let z = 8; z < 16; z++) if (floors[z].size) sets.push([String(z), [z], z]);
for (const [set, floorsList, z] of sets) {
  const n = OV_PX / OV_LEVELS[0];
  for (let by = Math.floor((bounds.y1 - 8) / n); by <= Math.floor(bounds.y2 / n); by++)
    for (let bx = Math.floor((bounds.x1 - 8) / n); bx <= Math.floor(bounds.x2 / n); bx++)
      await overview(set, floorsList, z, OV_LEVELS[0], bx, by);
  log(`  ${set}: ${OV_LEVELS.map((l) => `${l}px ${overviewIndex[set]?.[l]?.length || 0}`).join(', ')}`);
}
log(`Overview images: ${(overviewBytes / 1e6).toFixed(1)} MB`);

fs.writeFileSync(path.join(OUT, 'map.json'), JSON.stringify({ chunk: CHUNK, bounds, chunks: chunkIndex, overview: { px: OV_PX, levels: OV_LEVELS, sets: overviewIndex } }));
// Swap the new data in: old folder aside, new one in place, then remove the old one.
const OLD = `${FINAL_OUT}.old`;
fs.rmSync(OLD, { recursive: true, force: true });
if (fs.existsSync(FINAL_OUT)) fs.renameSync(FINAL_OUT, OLD);
fs.renameSync(OUT, FINAL_OUT);
fs.rmSync(OLD, { recursive: true, force: true });
log(`Done -> ${FINAL_OUT}`);
