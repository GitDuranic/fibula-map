// Slice 15c: every quest guide's legs (step to step, per segment, as the map builds them: questLegs in TibiaMap.jsx)
// routed on each map version, to find where a guide that works on one map has no route on another.
// All doors open, level 100, no climbing (as tools/lib/noderouter.js), so locked doors and Key steps don't count.
// Talk steps without a spot use that map's NPC position (NPCs can stand elsewhere on another map).
// Usage: node tools/quest-legs-check.js [data dir ...]   (default: public/map-data public/map-data-72)
// Reads the quest database with the public key from .env.local (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).
import fs from 'fs';
import { nodeRouter } from './lib/noderouter.js';

const dirs = process.argv.slice(2).length ? process.argv.slice(2) : ['public/map-data', 'public/map-data-72'];
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('='))
  .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const get = async (q) => {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${q}`, { headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` } });
  if (!res.ok) throw new Error(`${q}: ${res.status}`);
  return res.json();
};
const [quests, segs, steps] = await Promise.all([
  get('map_quests?select=id,name,sort,wiki_version&order=sort,id'),
  get('map_quest_segments?select=*&order=sort,id'),
  get('map_quest_steps?select=*&order=sort,id'),
]);

// One map version's data: its NPCs (Talk steps without a spot) and floor changes (a Go step onto one).
const maps = dirs.map((dir) => {
  const npcs = JSON.parse(fs.readFileSync(`${dir}/npcs.json`, 'utf8'));
  const { links } = JSON.parse(fs.readFileSync(`${dir}/links.json`, 'utf8'));
  return { dir, npcs: Array.isArray(npcs) ? npcs : npcs.npcs, linkAt: new Set(links.map((l) => `${l[0]},${l[1]},${l[2]}`)), router: nodeRouter(dir) };
});
const stepPos = (m, t) => {
  if (t.x != null) return [t.x, t.y, t.z];
  if (t.kind === 'talk' && t.npc) return m.npcs.find((n) => n.n.toLowerCase() === t.npc.toLowerCase())?.p || null;
  return null;
};

// The map version of a data folder ('7.1' for public/map-data, '7.2' for public/map-data-72), for parts and steps
// that are only on one version (slice 15d, map_only).
const versionOf = (dir) => { const m = /map-data-(\d)(\d+)$/.exec(dir); return m ? `${m[1]}.${m[2]}` : '7.1'; };
const onMap = (m, row) => !row.map_only || row.map_only === versionOf(m.dir);

// The legs of every segment of quest q on map m: [{ seg, n (step number), from, starts, to }].
function legsOf(m, q) {
  const qsegs = segs.filter((s) => s.quest_id === q.id && onMap(m, s));
  const all = qsegs.flatMap((s) => steps.filter((t) => t.segment_id === s.id && onMap(m, t)));
  const legs = [];
  for (const s of qsegs) {
    const first = all.findIndex((t) => t.segment_id === s.id);
    let prev = null, prevStep = null;
    for (let i = first - 1; i >= 0 && !prev; i--) { prev = stepPos(m, all[i]); prevStep = all[i]; }
    all.forEach((t, i) => {
      const pos = t.segment_id === s.id && stepPos(m, t);
      if (!pos) return;
      if (prev) {
        // After a Go step on another floor without a floor change on its spot: where you land (a pick hole).
        let starts = [prev];
        if (prevStep?.kind === 'go' && prev[2] !== pos[2] && !m.linkAt.has(prev.join(','))) {
          const d = Math.sign(pos[2] - prev[2]);
          for (let z = prev[2] + d; z !== pos[2] + d; z += d) starts.push([prev[0], prev[1], z]);
        }
        legs.push({ seg: s.name || `Part ${qsegs.indexOf(s) + 1}`, n: i + 1, from: prev, starts, to: pos });
      }
      prev = pos; prevStep = t;
    });
  }
  return legs;
}

const routeLeg = async (m, l) => {
  let res;
  for (const from of l.starts) { res = await m.router.route(from, l.to); if (res.routes) break; }
  return res.routes ? { ok: true, tiles: res.routes[0].path.length } : { ok: false, error: res.error };
};

const label = (d) => d.replace(/^.*map-data-?/, '') || '71';
const rows = { differ: [], bothFail: [], missingSpot: [] };
let total = 0;
for (const q of quests) {
  const per = maps.map((m) => legsOf(m, q));
  const n = Math.max(...per.map((l) => l.length));
  for (let k = 0; k < n; k++) {
    const res = [];
    for (let j = 0; j < maps.length; j++) res.push(per[j][k] ? await routeLeg(maps[j], per[j][k]) : null);
    total++;
    const l = per.find((p) => p[k])[k];
    const where = `${q.name} · ${l.seg} · step ${l.n} (${l.from.join(',')} -> ${l.to.join(',')})`;
    if (res.some((r) => !r)) rows.missingSpot.push(`${where}: a step has no spot on ${maps.filter((_, j) => !res[j]).map((m) => label(m.dir)).join(', ')}`);
    else if (res.every((r) => !r.ok)) rows.bothFail.push(`${where}: ${res[0].error}`);
    else if (res.some((r) => !r.ok)) rows.differ.push(`${where}: ${res.map((r, j) => `${label(maps[j].dir)} ${r.ok ? 'ok' : `NO ROUTE (${r.error})`}`).join(' · ')}`);
  }
}
console.log(`${quests.length} quests, ${total} legs, maps: ${maps.map((m) => label(m.dir)).join(', ')}\n`);
console.log(`Route on one map but not the other (${rows.differ.length}):`);
for (const r of rows.differ) console.log(`  ${r}`);
console.log(`\nNo route on any map (${rows.bothFail.length}):`);
for (const r of rows.bothFail) console.log(`  ${r}`);
console.log(`\nStep without a spot on one map (Talk step's NPC missing) (${rows.missingSpot.length}):`);
for (const r of rows.missingSpot) console.log(`  ${r}`);
