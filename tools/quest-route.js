// A drafting aid (slice 13j): the floor changes on the fastest route between two spots, so a draft's
// "go down the hole" steps can point at the real hole. All doors open, rope and shovel, level 100.
// Usage: node tools/quest-route.js 33165,31828,7 33143,31719,10   (wiki Mapper Coords also work: 129.141,124.84,7)
import fs from 'fs';
import { nodeRouter, floorChanges } from './lib/noderouter.js';

const parse = (s) => {
  const [a, b, z] = s.split(',');
  const one = (v) => (v.includes('.') ? Number(v.split('.')[0]) * 256 + Number(v.split('.')[1]) : Number(v));
  return [one(a), one(b), Number(z)];
};
// --data=<dir>: another map version's data (e.g. --data=public/map-data-72).
const dataArg = process.argv.find((s) => s.startsWith('--data='));
const DATA = dataArg ? dataArg.slice(7) : 'public/map-data';
const [from, to] = process.argv.slice(2).filter((s) => !s.startsWith('--data=')).map(parse);
const res = await nodeRouter(DATA).route(from, to);
if (res.error) { console.log(res.error, res.locked || ''); process.exit(1); }
const path = res.routes[0].path;
console.log(`${from.join(',')} -> ${to.join(',')}: ${path.length} tiles`);
for (const c of floorChanges(path)) console.log(`  ${c.how.padEnd(8)} ${c.via || ''} at ${c.p.join(',')} -> ${c.to.join(',')}`);
// The monsters that spawn along the route (7.1 spawn file, within 5 tiles of the path), per floor.
const { kinds, spawns } = JSON.parse(fs.readFileSync(`${DATA}/monsters.json`, 'utf8'));
const near = new Map();
for (const [sx, sy, sz, k, n = 1] of spawns) {
  if (!path.some(([x, y, z]) => z === sz && Math.abs(x - sx) <= 5 && Math.abs(y - sy) <= 5)) continue;
  const f = near.get(sz) || {};
  f[kinds[k].n] = (f[kinds[k].n] || 0) + n;
  near.set(sz, f);
}
for (const [z, f] of [...near].sort((a, b) => a[0] - b[0])) console.log(`  floor ${z}: ${Object.entries(f).map(([m, n]) => `${n} ${m}`).join(', ')}`);
