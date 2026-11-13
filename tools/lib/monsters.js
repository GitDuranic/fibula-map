// Monsters for the map: 7.1 spawns (the spawn file) + name, health, experience, outfit and loot from the TVP
// monster files (7.6 stand-ins until Ryndean's 7.1 monster files arrive; same format).
// Drop chances are NOT read: the user only wants rates that are right for 7.1 (see the design doc, slice 6).
import fs from 'node:fs';
import path from 'node:path';

const attrs = (s) => Object.fromEntries([...s.matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));

// One monster file: { name, xp, hp, look: { type, head, body, legs, feet } | { typeex }, loot: [{ sid, count }] }.
// Loot entries of the same item are added up (two gold coin lines of 60 and 45: up to 105).
export function parseMonster(xml) {
  const head = attrs(/<monster\s([^>]*)>/.exec(xml)?.[1] || '');
  const health = attrs(/<health\s([^>]*)\/>/.exec(xml)?.[1] || '');
  const lookA = attrs(/<look\s([^>]*)\/>/.exec(xml)?.[1] || '');
  const look = Object.fromEntries(Object.entries(lookA).filter(([k]) => ['type', 'typeex', 'head', 'body', 'legs', 'feet'].includes(k)).map(([k, val]) => [k, +val]));
  const loot = new Map();
  const lootXml = /<loot>([\s\S]*?)<\/loot>/.exec(xml)?.[1] || '';
  for (const m of lootXml.matchAll(/<item\s([^>]*?)\/?>/g)) {
    const a = attrs(m[1]);
    if (!a.id) continue;
    const sid = +a.id, count = +(a.countmax || 1);
    loot.set(sid, (loot.get(sid) || 0) + count);
  }
  return {
    name: head.name || '', xp: +(head.experience || 0), hp: +(health.max || health.now || 0), look,
    loot: [...loot].map(([sid, count]) => ({ sid, count })),
  };
}

// Returns { kinds: [monster + { key }], spawns: [{ x, y, z, kind (index), amount, radius }], missing: [names] }.
// Spawn names are matched to monster files case-insensitively.
export function loadMonsters({ spawnFile, monsterDir }) {
  const index = new Map();
  const list = fs.readFileSync(path.join(monsterDir, 'monsters.xml'), 'latin1');
  for (const m of list.matchAll(/<monster\s+name="([^"]+)"\s+file="([^"]+)"/g)) index.set(m[1].toLowerCase(), m[2]);
  const kinds = [], byName = new Map(), missing = new Set();
  const kindOf = (name) => {
    const key = name.toLowerCase();
    if (byName.has(key)) return byName.get(key);
    const file = index.get(key);
    let mon;
    if (file && fs.existsSync(path.join(monsterDir, file))) mon = parseMonster(fs.readFileSync(path.join(monsterDir, file), 'latin1'));
    else { missing.add(name); mon = { name: name.replace(/\b\w/g, (c) => c.toUpperCase()), xp: 0, hp: 0, look: {}, loot: [] }; }
    const i = kinds.push({ ...mon, key }) - 1;
    byName.set(key, i);
    return i;
  };
  const spawns = [];
  const spawn = fs.readFileSync(spawnFile, 'latin1');
  for (const m of spawn.matchAll(/<tvpspawn\s+([^>]*?)\/>/g)) {
    const a = attrs(m[1]);
    if (!a.monstername) continue;
    spawns.push({ x: +a.centerx, y: +a.centery, z: +a.centerz, kind: kindOf(a.monstername), amount: +(a.amount || 1), radius: +(a.radius || 0) });
  }
  return { kinds, spawns, missing: [...missing] };
}

// Spawn groups: spawn points on the same floor within `dist` tiles of each other (chained) are one group.
// Returns a group number per spawn.
export function spawnGroups(spawns, dist = 10) {
  const parent = spawns.map((_, i) => i);
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  // Bucket by floor and a grid of `dist`, so only neighbouring cells are compared.
  const cells = new Map();
  spawns.forEach((s, i) => {
    const k = `${s.z}:${Math.floor(s.x / dist)}:${Math.floor(s.y / dist)}`;
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k).push(i);
  });
  spawns.forEach((s, i) => {
    const cx = Math.floor(s.x / dist), cy = Math.floor(s.y / dist);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      for (const j of cells.get(`${s.z}:${cx + dx}:${cy + dy}`) || []) {
        if (j <= i) continue;
        const t = spawns[j];
        if (Math.max(Math.abs(s.x - t.x), Math.abs(s.y - t.y)) <= dist) parent[find(i)] = find(j);
      }
    }
  });
  const ids = new Map();
  return spawns.map((_, i) => { const r = find(i); if (!ids.has(r)) ids.set(r, ids.size); return ids.get(r); });
}
