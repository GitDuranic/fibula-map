// A drafting aid (slice 13j): when quest-route.js finds no route, where the gap is. Walks backwards from the goal
// (which tiles can reach it: walkable tiles, 8 directions, the map's floor changes the right way round) and prints,
// per floor, how much can reach it and the tile closest to the start; the floor changes that lead into that area
// from outside it are listed too (they're the way in). A gap is usually a pick hole, a lever, or a teleport the
// map doesn't know.
// Usage: node tools/quest-reach.js <start x,y,z> <goal x,y,z>   (Mapper Coords work too, like quest-route.js)
import fs from 'fs';

const DATA = 'public/map-data';
const parse = (s) => { const [a, b, z] = s.split(','); const one = (v) => (v.includes('.') ? Number(v.split('.')[0]) * 256 + Number(v.split('.')[1]) : Number(v)); return [one(a), one(b), Number(z)]; };
const [from, to] = process.argv.slice(2).map(parse);
const map = JSON.parse(fs.readFileSync(`${DATA}/map.json`, 'utf8')), walk = fs.readFileSync(`${DATA}/walk.bin`);
const ord = new Map();
let o = 0;
for (let z = 0; z < 16; z++) for (const [cx, cy] of map.chunks[z] || []) ord.set(`${cx},${cy},${z}`, o++);
const speed = (x, y, z) => { const c = ord.get(`${x >> 5},${y >> 5},${z}`); return c == null ? 0 : walk[c * 1024 + ((y & 31) << 5) + (x & 31)]; };
const K = ['step', 'ladder', 'grate', 'rope', 'dig', 'teleport'];
const { links } = JSON.parse(fs.readFileSync(`${DATA}/links.json`, 'utf8'));
const into = new Map(); // landing tile -> links that land there
for (const l of links) { const k = `${l[3]},${l[4]},${l[5]}`; if (!into.has(k)) into.set(k, []); into.get(k).push(l); }
const linkAt = new Set(links.map((l) => `${l[0]},${l[1]},${l[2]}`));
const ok = (x, y, z) => speed(x, y, z) > 0 || linkAt.has(`${x},${y},${z}`);

// Backwards from the goal (a chest isn't walkable: start from the tiles around it too).
const seen = new Set(), queue = [];
const add = (x, y, z) => { const k = `${x},${y},${z}`; if (!seen.has(k) && ok(x, y, z)) { seen.add(k); queue.push([x, y, z]); } };
for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) add(to[0] + dx, to[1] + dy, to[2]);
while (queue.length && seen.size < 3e6) {
  const [x, y, z] = queue.shift();
  for (const l of into.get(`${x},${y},${z}`) || []) add(l[0], l[1], l[2]);
  // Off a link tile you don't walk on (you're moved): only plain walkable tiles spread.
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if ((dx || dy) && speed(x + dx, y + dy, z) > 0) add(x + dx, y + dy, z);
}
if (seen.has(from.join(','))) console.log('The start can reach the goal (quest-route.js should find it).');
const floors = new Map();
for (const k of seen) { const [x, y, z] = k.split(',').map(Number); const d = Math.max(Math.abs(x - from[0]), Math.abs(y - from[1])) + Math.abs(z - from[2]) * 20; const f = floors.get(z) || { n: 0, best: null, d: Infinity }; f.n++; if (d < f.d) { f.d = d; f.best = [x, y, z]; } floors.set(z, f); }
for (const [z, f] of [...floors].sort((a, b) => a[0] - b[0])) console.log(`floor ${z}: ${f.n} tiles can reach the goal; closest to the start: ${f.best.join(',')}`);
// The ways in: links from a tile outside the area into it.
const ways = links.filter((l) => !seen.has(`${l[0]},${l[1]},${l[2]}`) && seen.has(`${l[3]},${l[4]},${l[5]}`));
if (ways.length) console.log(`ways in from outside (none of them reachable from the start's area?):\n${ways.slice(0, 20).map((l) => `  ${K[l[6]]} ${l[0]},${l[1]},${l[2]} -> ${l[3]},${l[4]},${l[5]}`).join('\n')}`);
