// Writes supabase/migrations/0009_map_quest_spots_to_steps.sql (slice 13i, 2026-11-21): every old quest spot
// (slices 10 and 12: the user's spots in tools/data/fibula-quests.json, else the ones found automatically) becomes a
// draft Reward step of its quest in the database: its place, the object shown (chest, body...) and what it gives,
// not checked, source "old quest spot". The steps go at the end of the quest's last segment (a new "Part 1" when it
// has none). A quest that already has steps from old spots is left alone, so running it again changes nothing.
// Only quests in the database (matched by name) get steps. Usage: node tools/spots-to-steps-sql.js
import fs from 'fs';
import { mergeQuests, questKey } from '../src/map/engine/questdata.js';

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const db = await (await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/map_quests?select=id,name&order=sort`, { headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` } })).json();
if (!Array.isArray(db)) throw new Error(JSON.stringify(db));
const byKey = new Map(db.map((q) => [questKey(q.name), q]));

const list = JSON.parse(fs.readFileSync('tools/data/fibula-quests.json', 'utf8'));
const auto = JSON.parse(fs.readFileSync('public/map-data/quests-auto.json', 'utf8'));
const { items: defs } = JSON.parse(fs.readFileSync('public/map-data/items.json', 'utf8'));
const quests = mergeQuests(list, Array.isArray(auto) ? auto : auto.quests || []);

const blocks = [], report = [], missing = [];
let steps = 0;
for (const q of quests) {
  if (!q.chests.length) continue;
  const row = byKey.get(questKey(q.n));
  if (!row) { missing.push(`${q.n} (${q.chests.length})`); continue; }
  const values = q.chests.map((c, i) => {
    const items = c.items.map(([id, n]) => [id, n || 1]);
    const keys = c.items.filter((it) => it[2]).map((it) => `key ${it[2]}`);
    const text = keys.length ? `'The key is ${keys.join(', ')}.'` : 'null';
    return `(${row.id}, seg, base + ${(i + 1) * 10}, 'reward', ${text}, ${c.p[0]}, ${c.p[1]}, ${c.p[2]}, ${c.id || 'null'}, '${JSON.stringify(items)}'::jsonb, false, 'old quest spot')`;
  });
  steps += values.length;
  report.push(`--   ${q.n}: ${q.chests.map((c) => (c.items.length ? c.items.map(([id, n]) => `${n > 1 ? `${n} ` : ''}${defs[id]?.n || id}`).join(' + ') : 'nothing')).join(' | ')}`);
  blocks.push(`do $$
declare seg bigint; base integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = ${row.id} and source = 'old quest spot') then return; end if;
  select id into seg from public.map_quest_segments where quest_id = ${row.id} order by sort desc limit 1;
  if seg is null then
    insert into public.map_quest_segments (quest_id, sort) values (${row.id}, 10) returning id into seg;
  end if;
  select coalesce(max(sort), 0) into base from public.map_quest_steps where segment_id = seg;
  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, object, items, checked, source) values
    ${values.join(',\n    ')};
end $$;`);
}
const sql = `-- =====================================================================================
-- Tibia Map - database step 9: the old quest spots become Reward steps (slice 13i, 2026-11-21)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- Needs steps 3 and 6. Written by tools/spots-to-steps-sql.js. Each old spot (slices 10/12) becomes a draft Reward
-- step (not checked) at the end of its quest's last segment, with its object and what it gives. A quest that
-- already has steps from old spots is skipped, so running it again changes nothing.
--
-- ${steps} steps for ${blocks.length} quests (what each spot gives, per quest):
${report.join('\n')}
${missing.length ? `-- Not in the database (left out): ${missing.join(', ')}\n` : ''}-- =====================================================================================

${blocks.join('\n\n')}
`;
fs.writeFileSync('supabase/migrations/0009_map_quest_spots_to_steps.sql', sql);
console.log(report.join('\n'));
console.log(`${steps} steps for ${blocks.length} quests; not in the database: ${missing.join(', ') || 'none'}`);
