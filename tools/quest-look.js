// A drafting aid (slice 13j): the objects around a spot, from the map chunks, so a draft can point at the real
// lever, chest, hole or door. Ground and plain walls are left out unless a filter asks for them.
// Usage: node tools/quest-look.js 32140,32110,11 [radius, default 8] [name filter, a regex: "lever|chest|hole"]
import fs from 'fs';

const DATA = 'public/map-data', C = 32;
const [at, r = '8', filter] = process.argv.slice(2);
const [px, py, pz] = at.split(',').map(Number);
const R = Number(r), re = filter ? new RegExp(filter, 'i') : null;
const { items: defs } = JSON.parse(fs.readFileSync(`${DATA}/items.json`, 'utf8'));
const chunks = new Map();
const chunk = (cx, cy) => {
  const k = `${cx}_${cy}`;
  if (!chunks.has(k)) { const f = `${DATA}/chunks/${pz}/${k}.json`; chunks.set(k, fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : []); }
  return chunks.get(k);
};
const BORING = /^(wall|earth|grass|dirt|sand|stone floor|wooden floor|floor|gravel|rock|cave|mountain|framework|archway|pillar|stone wall|tapestry)\b/i;
for (let y = py - R; y <= py + R; y++) {
  for (let x = px - R; x <= px + R; x++) {
    const e = chunk(x >> 5, y >> 5)[(y & 31) * C + (x & 31)];
    if (!e) continue;
    const list = (typeof e === 'number' ? [e] : e).map((v) => (Array.isArray(v) ? v : [v]));
    const names = list.slice(1).map(([id, ...inside]) => {
      const n = defs[id]?.n || `#${id}`;
      const content = inside.flat().filter((v) => typeof v === 'number' && defs[v]).map((v) => defs[v].n);
      return `${n} (${id})${content.length ? ` [${content.join(', ')}]` : ''}`;
    });
    const ground = defs[list[0][0]]?.n || `#${list[0][0]}`;
    const shown = re ? [ground, ...names].filter((n) => re.test(n)) : names.filter((n) => !BORING.test(n));
    if (shown.length) console.log(`${x},${y},${pz}: ${re ? shown.join(' | ') : `${shown.join(' | ')}  on ${ground}`}`);
  }
}
