// Players in houses (slice 17c): a one-off fill of map_house_renters (database step 28) until Ryndean's daily job
// runs. Asks the Project Fibula API what the job will ask (docs/house-renters-job.md) and writes an SQL file that
// calls map_replace_house_renters() with the list; run it in the Supabase SQL editor (it runs as the owner there, so
// it needs no service_role key).
//
//   node tools/house-renters-sql.js [out.sql]    (default supabase/migrations/0029_map_house_renters_fill.sql)
//
// About 680 renters, one gentle call each: takes a few minutes.

import fs from 'node:fs';

const API = 'https://api.projectfibula.org';
const out = process.argv[2] || 'supabase/migrations/0029_map_house_renters_fill.sql';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`${res.status}`);
      return await res.json();
    } catch (e) {
      if (i >= tries) throw new Error(`${url}: ${e.message}`);
      await sleep(2000 * i);
    }
  }
}

// The outfit image URL's numbers -> { looktype, head, body, legs, feet }, or all null.
function outfitOf(url) {
  const none = { looktype: null, head: null, body: null, legs: null, feet: null };
  try {
    const q = new URL(url).searchParams, n = (k) => Number(q.get(k)) || 0;
    return n('id') ? { looktype: n('id'), head: n('head'), body: n('body'), legs: n('legs'), feet: n('feet') } : none;
  } catch { return none; }
}

const byTown = await getJson(`${API}/houses?updates=false&owners=true`);
const houses = [];
for (const town of Object.values(byTown || {})) for (const h of Object.values(town || {})) if (h?.owner) houses.push({ house: h.name, renter: h.owner });
if (!houses.length) throw new Error('The API gave no rented houses: nothing written.');

const outfits = new Map(), names = [...new Set(houses.map((h) => h.renter))];
let failed = 0;
for (const [i, name] of names.entries()) {
  let o;
  try {
    const data = await getJson(`${API}/players/${encodeURIComponent(name)}?char_info=true&ranking_info=false&updates=false&deaths=false`);
    const p = data && (data[name] || Object.values(data)[0]);
    o = outfitOf(p?.info?.outfit);
  } catch (e) { failed++; console.warn(e.message); o = outfitOf(null); }
  outfits.set(name, o);
  if ((i + 1) % 50 === 0) console.log(`${i + 1} / ${names.length}`);
  await sleep(300);
}

const rows = houses.map((h) => ({ ...h, ...outfits.get(h.renter) }));
const noOutfit = rows.filter((r) => !r.looktype).length;
const json = JSON.stringify(rows).replace(/'/g, "''");
fs.writeFileSync(out, `-- =====================================================================================
-- Tibia Map - database step 29: fill map_house_renters once (slice 17c), needs step 28
--
-- Run this in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- Safe to run again (it replaces the whole list). Written by tools/house-renters-sql.js on ${new Date().toISOString().slice(0, 10)}
-- from the Project Fibula API: ${rows.length} rented houses, ${noOutfit} renters without an outfit.
-- Ryndean's daily job (docs/house-renters-job.md) replaces this list once it runs.
-- =====================================================================================

select public.map_replace_house_renters('${json}'::jsonb) as houses_stored;
`);
console.log(`${out}: ${rows.length} houses, ${noOutfit} without an outfit, ${failed} player calls failed`);
