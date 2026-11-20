// Writes supabase/migrations/0005_map_quest_reward_items_fill.sql: a first draft of every quest's reward items
// (2026-11-20, user: rewards as text + item icons). The reward texts from the Fibula list are mostly item names
// ("Brass Legs, Garlic Necklace", "3 White Pearls and 175 gp"); each part that names a game item becomes an item
// with its count, and only the parts that don't stay as text ("etc.", "Keys"). The SQL only touches quests whose
// reward text is still the one read here and that have no reward items yet, so hand work is never overwritten.
// Usage: node tools/reward-items-sql.js   (reads the quests over REST with the key in .env.local)
import fs from 'fs';

const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const url = env.VITE_SUPABASE_URL, key = env.VITE_SUPABASE_ANON_KEY;
const quests = await (await fetch(`${url}/rest/v1/map_quests?select=id,name,rewards,reward_items&order=sort`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })).json();
if (!Array.isArray(quests)) throw new Error(JSON.stringify(quests));

// Item names (lower case) -> id; the first id wins (the usual one; later ids are often decoration copies).
const { items } = JSON.parse(fs.readFileSync('public/map-data/items.json', 'utf8'));
const byName = new Map();
for (const [id, d] of Object.entries(items)) if (d?.n && !byName.has(d.n.toLowerCase())) byName.set(d.n.toLowerCase(), +id);
const ALIAS = { gp: 'gold coin', gold: 'gold coin', 'gold coins': 'gold coin', 'platinum coins': 'platinum coin', 'crystal coins': 'crystal coin' };
const find = (name) => {
  const n = name.toLowerCase().replace(/\s+/g, ' ').trim();
  for (const c of [ALIAS[n], n, n.replace(/s$/, ''), n.replace(/es$/, ''), n.replace(/ies$/, 'y')]) if (c && byName.has(c)) return byName.get(c);
  return null;
};

const WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, ten: 10 };
const sqlStr = (s) => (s == null ? 'null' : `'${s.replace(/'/g, "''")}'`);
const out = [], report = [];
for (const q of quests) {
  if (!q.rewards || (q.reward_items && q.reward_items.length)) continue;
  const got = [], rest = [];
  for (const raw of q.rewards.replace(/\.$/, '').split(/,|\band\b/)) {
    const part = raw.trim();
    if (!part) continue;
    const w = /^(a|an|one|two|three|four|five|ten)\s+(.+)$/i.exec(part); // "Two Small Rubies", "a Bronze Amulet"
    const m = (w && [w[0], String(WORDS[w[1].toLowerCase()]), w[2]]) || /^(\d+)\s*x?\s+(.+)$/i.exec(part) || /^(.+?)\s+x\s*(\d+)$/i.exec(part);
    const [count, name] = m ? (/^\d/.test(m[1]) ? [+m[1], m[2]] : [+m[2], m[1]]) : [1, part];
    const id = find(name);
    if (id) got.push([id, count]); else rest.push(part);
  }
  if (!got.length) { report.push(`  -- ${q.name}: nothing matched ("${q.rewards}")`); continue; }
  const text = rest.length ? rest.join(', ') : null;
  report.push(`  -- ${q.name}: ${got.map(([id, c]) => `${c > 1 ? `${c} ` : ''}${items[id].n}`).join(', ')}${text ? `  | text left: ${text}` : ''}`);
  out.push(`update public.map_quests set reward_items = '${JSON.stringify(got)}'::jsonb, rewards = ${sqlStr(text)}\n  where id = ${q.id} and rewards = ${sqlStr(q.rewards)} and reward_items = '[]'::jsonb;`);
}
const sql = `-- =====================================================================================
-- Tibia Map - database step 5: a first draft of the quests' reward items (2026-11-20)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- Needs step 4. Written by tools/reward-items-sql.js from the reward texts: each part that names a game item
-- becomes an item icon (with its count); the parts that don't stay as text. A quest is only changed while its
-- reward text is still the one read and it has no reward items yet, so running it again (or after hand edits)
-- changes nothing. Check the result per quest in the map (Edit) - it's a draft.
--
-- What it does, per quest:
${report.join('\n')}
-- =====================================================================================

${out.join('\n')}
`;
fs.writeFileSync('supabase/migrations/0005_map_quest_reward_items_fill.sql', sql);
console.log(report.join('\n'));
console.log(`${out.length} quests get items`);
