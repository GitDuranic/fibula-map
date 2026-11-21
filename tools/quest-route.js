// A drafting aid (slice 13j): the floor changes on the fastest route between two spots, so a draft's
// "go down the hole" steps can point at the real hole. All doors open, rope and shovel, level 100.
// Usage: node tools/quest-route.js 33165,31828,7 33143,31719,10   (wiki Mapper Coords also work: 129.141,124.84,7)
import { nodeRouter, floorChanges } from './lib/noderouter.js';

const parse = (s) => {
  const [a, b, z] = s.split(',');
  const one = (v) => (v.includes('.') ? Number(v.split('.')[0]) * 256 + Number(v.split('.')[1]) : Number(v));
  return [one(a), one(b), Number(z)];
};
const [from, to] = process.argv.slice(2).map(parse);
const res = await nodeRouter().route(from, to);
if (res.error) { console.log(res.error, res.locked || ''); process.exit(1); }
const path = res.routes[0].path;
console.log(`${from.join(',')} -> ${to.join(',')}: ${path.length} tiles`);
for (const c of floorChanges(path)) console.log(`  ${c.how.padEnd(8)} ${c.via || ''} at ${c.p.join(',')} -> ${c.to.join(',')}`);
