// Editors' tile fixes (slice 14, database steps 15 and 27): tiles marked in Supabase so routes go through them, per
// map version (map.json "map"). 'passable' (14a): a locked door that isn't locked. 'walkable' (14b): a blocked tile
// routes may walk over (e.g. a lever bridge drawn as water). Everyone reads them over plain REST (as quests,
// questdb.js); the editors add and remove them with the logged-in client (questauth.js). Without the table (step 15
// not run) or without database settings there are no fixes and the map works as before.

import { dbClient } from './questauth.js';

// The marked tiles of one map: { passable: Set of 'x,y,z', walkable: Set of 'x,y,z' }.
export async function fetchTileFixes(cfg, map) {
  const res = await fetch(`${cfg.url}/rest/v1/map_tile_fixes?select=x,y,z,kind&map=eq.${encodeURIComponent(map)}`, {
    headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` },
  });
  if (!res.ok) throw new Error(`tile fixes: ${res.status}`);
  const out = { passable: new Set(), walkable: new Set() };
  for (const r of await res.json()) out[r.kind]?.add(`${r.x},${r.y},${r.z}`);
  return out;
}

// Marks tile [x, y, z] of a map (kind 'passable' or 'walkable', on) or removes its mark. Fails if you're not an editor.
export async function setTileFix(cfg, map, [x, y, z], kind, on) {
  const c = await dbClient(cfg);
  const { data, error } = on
    ? await c.from('map_tile_fixes').insert({ map, x, y, z, kind }).select()
    : await c.from('map_tile_fixes').delete().match({ map, x, y, z }).select();
  if (error?.code === '23505') return; // already marked
  if (error) {
    if (/does not exist|schema cache/.test(error.message)) throw new Error('Database step 15 has not been run yet.');
    if (error.code === '23514') throw new Error('Database step 27 has not been run yet.');
    if (/row-level security/.test(error.message)) throw new Error('Not saved: this account may not edit the map.');
    throw new Error(error.message);
  }
  if (!on && !data?.length) throw new Error('Not removed: this account may not edit the map.');
}
