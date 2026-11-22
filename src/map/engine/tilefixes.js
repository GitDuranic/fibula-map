// Editors' tile fixes (slice 14a, database step 15): tiles marked in Supabase so routes go through them, per map
// version (map.json "map"). 14a: a locked door that isn't locked. Everyone reads them over plain REST (as quests,
// questdb.js); the editors add and remove them with the logged-in client (questauth.js). Without the table (step 15
// not run) or without database settings there are no fixes and the map works as before.

import { dbClient } from './questauth.js';

// The marked tiles of one map: a Set of 'x,y,z'.
export async function fetchTileFixes(cfg, map) {
  const res = await fetch(`${cfg.url}/rest/v1/map_tile_fixes?select=x,y,z&kind=eq.passable&map=eq.${encodeURIComponent(map)}`, {
    headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` },
  });
  if (!res.ok) throw new Error(`tile fixes: ${res.status}`);
  return new Set((await res.json()).map((r) => `${r.x},${r.y},${r.z}`));
}

// Marks tile [x, y, z] of a map as passable (on) or removes the mark. Fails if you're not an editor.
export async function setTilePassable(cfg, map, [x, y, z], on) {
  const c = await dbClient(cfg);
  const { data, error } = on
    ? await c.from('map_tile_fixes').insert({ map, x, y, z, kind: 'passable' }).select()
    : await c.from('map_tile_fixes').delete().match({ map, x, y, z }).select();
  if (error?.code === '23505') return; // already marked
  if (error) {
    if (/does not exist|schema cache/.test(error.message)) throw new Error('Database step 15 has not been run yet.');
    if (/row-level security/.test(error.message)) throw new Error('Not saved: this account may not edit the map.');
    throw new Error(error.message);
  }
  if (!on && !data?.length) throw new Error('Not removed: this account may not edit the map.');
}
