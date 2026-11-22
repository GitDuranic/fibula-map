// Checks the AI quest drafts (slice 13j) and writes them as a database step: unchecked segments and steps.
// A draft (tools/data/quest-drafts/<quest key>.json, written from the quest's wiki walkthrough in
// tools/data/wiki-walkthroughs) may only point at real things; anything else becomes a Note step "Needs placing: ...":
//   talk    npc must be an NPC on the map; say: the words in order (["hi", "book", "yes"]), each must be something
//           you can say at that point of the NPC's script; they become the step's dialog (as the Dialog builder
//           makes it). The step has no spot of its own (the NPC's is used).
//   go/get/kill/reward  at [x, y, z]: a tile you can walk on, a floor change, or right next to one you can walk on
//           (a chest, a lever); a Go step without one isn't placed. kill: monster must be a monster kind.
//   get     items: [[item id or name, count]], each a real item.
//   key     at [x, y, z]: a locked door on the map (doors.json); the card shows its key (13l, database step 16).
//   note    just text.
//   draft.replaceSteps: [step ids]: hand-made steps the draft replaces (asked for by the user; e.g. Paradox Tower's
//           test steps): they're deleted and don't count as hand work.
//   draft.dropOldRewards: true drops the quest's old-spot Reward steps (the draft has its own Reward step).
//   rewards a marker, not a step: the quest's Reward steps from the old spots (database step 9) go here, in order;
//           without the marker they go at the end.
// Every step keeps its wiki sentence in source. Earlier drafts of a quest are replaced, unless anything in it was
// made, changed or ticked in the app (hand work): then the quest is skipped. Monsters only from the 7.1 spawn file
// (a Kill step's monster must spawn near it; the wiki lists later monsters too, e.g. troll champions, 8.10).
// Positions are also checked with the route finder: each step must be reachable from the one before it (all doors
// open, rope and shovel, exani hur and parcels); an unreachable one is only reported (exani hur, a boat...), it stays as it is.
// Usage: node tools/drafts-to-sql.js <database step number> <file name part> [quest keys...]   (no keys: all drafts)
//   e.g. node tools/drafts-to-sql.js 10 wiki_drafts_test "bear room quest" "troll cave quest"
import fs from 'fs';
import { questKey } from '../src/map/engine/questdata.js';
import { dialogLine, sayText } from '../src/map/engine/dialog.js';
import { nodeRouter } from './lib/noderouter.js';

const DATA = 'public/map-data', DRAFTS = 'tools/data/quest-drafts';
const [stepNo, namePart, ...keys] = process.argv.slice(2);
if (!stepNo || !namePart) { console.log('Usage: node tools/drafts-to-sql.js <step number> <file name part> [quest keys...]'); process.exit(1); }
const json = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

// The database's quests, by name.
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const rest = async (p) => { const r = await (await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${p}`, { headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` } })).json(); if (!Array.isArray(r)) throw new Error(JSON.stringify(r)); return r; };
const dbQuests = new Map((await rest('map_quests?select=id,name')).map((q) => [questKey(q.name), q]));
const dbSteps = await rest('map_quest_steps?select=id,quest_id,source,x,y,z,kind,checked,updated_by');

// What's real: NPCs, monsters, items, tiles.
const npcs = json(`${DATA}/npcs.json`);
const kinds = json(`${DATA}/monsters.json`).kinds;
const { items: defs } = json(`${DATA}/items.json`);
const itemByName = new Map();
for (const [id, d] of Object.entries(defs)) if (d?.n && !itemByName.has(d.n.toLowerCase())) itemByName.set(d.n.toLowerCase(), Number(id));
const map = json(`${DATA}/map.json`), walk = fs.readFileSync(`${DATA}/walk.bin`);
const chunkOrd = new Map();
let ord = 0;
for (let z = 0; z < 16; z++) for (const [cx, cy] of map.chunks[z] || []) chunkOrd.set(`${cx},${cy},${z}`, ord++);
const speed = (x, y, z) => { const o = chunkOrd.get(`${x >> 5},${y >> 5},${z}`); return o == null ? 0 : walk[o * 1024 + ((y & 31) << 5) + (x & 31)]; };
const { links } = json(`${DATA}/links.json`);
const linkTiles = new Set(links.map((l) => `${l[0]},${l[1]},${l[2]}`));
const near = ([x, y, z]) => { for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (speed(x + dx, y + dy, z)) return true; return false; };
const lockedDoors = new Set(json(`${DATA}/doors.json`).map((d) => d.slice(0, 3).join(',')));
const realSpot = (p) => Array.isArray(p) && p.length === 3 && p.every(Number.isInteger) && (speed(...p) > 0 || linkTiles.has(p.join(',')) || near(p));
const talks = new Map();
const talkOf = (npc) => { if (!talks.has(npc.t)) talks.set(npc.t, fs.existsSync(`${DATA}/talk/${npc.t}.json`) ? json(`${DATA}/talk/${npc.t}.json`) : null); return talks.get(npc.t); };

const { spawns } = json(`${DATA}/monsters.json`);
const spawnsNear = (kind, [x, y, z], r) => spawns.some(([sx, sy, sz, k]) => k === kind && sz === z && Math.abs(sx - x) <= r && Math.abs(sy - y) <= r);
const router = nodeRouter(DATA);
const q = (s) => (s == null ? 'null' : `'${String(s).replace(/'/g, "''")}'`);
const files = keys.length ? keys.map((k) => `${k}.json`) : fs.readdirSync(DRAFTS).filter((f) => f.endsWith('.json'));
const blocks = [], report = [];
let total = 0, placing = 0, usesKey = false;

for (const file of files) {
  const draft = json(`${DRAFTS}/${file}`);
  const row = dbQuests.get(questKey(draft.quest));
  if (!row) { report.push(`--   ${draft.quest}: NOT IN THE DATABASE, left out`); continue; }
  const notes = [];
  // Hand work: a step made in the app (no source), or any step changed or ticked there (updated_by / checked).
  const replace = draft.replaceSteps || [];
  const handWork = dbSteps.some((s) => s.quest_id === row.id && !replace.includes(s.id) && (s.source == null || s.updated_by || s.checked));
  const rewards = draft.dropOldRewards ? [] : dbSteps.filter((s) => s.quest_id === row.id && s.source === 'old quest spot');
  const needs = (st, why) => { notes.push(`${why}`); placing++; return { kind: 'note', text: `Needs placing: ${st.text || why}`, source: st.source, why }; };

  // Check each step; returns the row to insert (or a "needs placing" note).
  const check = (st) => {
    const base = { text: st.text || null, source: st.source || null };
    switch (st.kind) {
      case 'note': return { kind: 'note', ...base };
      case 'talk': {
        const npc = npcs.find((n) => n.n.toLowerCase() === (st.npc || '').toLowerCase());
        if (!npc) return needs(st, `no NPC "${st.npc}"`);
        const talk = talkOf(npc);
        if (!talk) return needs(st, `no conversation for ${npc.n}`);
        const dialog = [];
        let here = talk;
        for (const w of st.say || []) {
          let hit = null;
          for (const e of here) { const j = (e.k || []).findIndex((k) => sayText(k).toLowerCase() === w.toLowerCase()); if (j >= 0) { hit = [e, j]; break; } }
          if (!hit && here !== talk) for (const e of talk) { const j = (e.k || []).findIndex((k) => sayText(k).toLowerCase() === w.toLowerCase()); if (j >= 0) { hit = [e, j]; here = talk; break; } }
          if (!hit) return needs(st, `${npc.n} has nothing for "${w}" there`);
          dialog.push(dialogLine(here, hit[0], hit[1]));
          here = hit[0].n?.length ? hit[0].n : talk;
        }
        return { kind: 'talk', ...base, npc: npc.n, dialog };
      }
      case 'key': {
        if (!Array.isArray(st.at) || !lockedDoors.has(st.at.join(','))) return needs(st, `${st.at} is not a locked door`);
        usesKey = true;
        return { kind: 'key', ...base, at: st.at };
      }
      case 'go': case 'get': case 'kill': case 'reward': {
        if (st.at != null && !realSpot(st.at)) return needs(st, `${st.at} is not a real spot`);
        if (st.kind === 'go' && st.at == null) return needs(st, 'no spot');
        let monster = null, items = [];
        if (st.kind === 'kill') {
          const k = kinds.find((m) => m.n.toLowerCase() === (st.monster || '').toLowerCase());
          if (!k) return needs(st, `no monster "${st.monster}"`);
          monster = k.n;
          if (st.at && !spawnsNear(kinds.indexOf(k), st.at, 12)) notes.push(`no ${k.n} spawns within 12 tiles of ${st.at}`);
        }
        for (const [it, n = 1] of st.items || []) {
          const id = typeof it === 'number' ? (defs[it] ? it : null) : itemByName.get(String(it).toLowerCase());
          if (!id) return needs(st, `no item "${it}"`);
          items.push([id, n]);
        }
        return { kind: st.kind, ...base, at: st.at || null, monster, items, object: st.kind === 'reward' ? st.object || 2472 : null };
      }
      default: return needs(st, `unknown kind "${st.kind}"`);
    }
  };

  const segs = draft.segments.map((s) => ({ name: s.name || null, steps: s.steps.map((st) => (st.kind === 'rewards' ? { rewards: true } : check(st))) }));
  if (!segs.some((s) => s.steps.some((t) => t.rewards))) segs[segs.length - 1].steps.push({ rewards: true });

  // Reachability: walk the steps in order (Reward steps from the database included).
  // After a Go step on another floor than the next spot with no floor change on the map (a pick hole), the leg
  // starts on the same square on the floors below/above, the first with a route (as the app does).
  let prev = null, prevKind = null;
  for (const t of segs.flatMap((s) => s.steps.flatMap((x) => (x.rewards ? rewards.map((r) => ({ at: [r.x, r.y, r.z], kind: 'reward' })) : [x])))) {
    const at = t.at || (t.kind === 'talk' ? npcs.find((n) => n.n === t.npc)?.p : null);
    if (!at) continue;
    if (prev) {
      const starts = [prev];
      if (prevKind === 'go' && prev[2] !== at[2] && !linkTiles.has(prev.join(','))) for (let z = prev[2] + Math.sign(at[2] - prev[2]); z !== at[2] + Math.sign(at[2] - prev[2]); z += Math.sign(at[2] - prev[2])) starts.push([prev[0], prev[1], z]);
      let res;
      for (const from of starts) if (!(res = await router.route(from, at, { climb: 3 })).error) break; // exani hur and parcels allowed (the guide says when)
      if (res.error) notes.push(`can't walk ${prev} -> ${at} (${t.text || t.kind}): ${res.error}`);
    }
    prev = at; prevKind = t.kind;
  }

  const n = segs.reduce((a, s) => a + s.steps.filter((t) => !t.rewards).length, 0);
  total += n;
  report.push(`--   ${draft.quest}: ${segs.length} part${segs.length > 1 ? 's' : ''}, ${n} steps + ${rewards.length} Reward step${rewards.length === 1 ? '' : 's'}${handWork ? ' (HAS HAND WORK: the SQL skips it)' : ''}`);
  for (const x of notes) report.push(`--       ${x}`);

  const parts = segs.map((s, i) => {
    let sort = 0;
    const lines = [];
    for (const t of s.steps) {
      if (t.rewards) {
        lines.push(`  update public.map_quest_steps st set segment_id = seg, sort = ${sort} + r.n * 10 from (select id, row_number() over (order by sort, id) n from public.map_quest_steps where quest_id = ${row.id} and source = 'old quest spot') r where st.id = r.id;`);
        lines.push(`  select coalesce(max(sort), ${sort}) into sort_now from public.map_quest_steps where segment_id = seg;`);
        sort = null;
        continue;
      }
      const pos = t.at ? t.at.join(', ') : 'null, null, null';
      const sortExpr = sort == null ? 'sort_now + 10' : String((sort += 10));
      lines.push(`  insert into public.map_quest_steps (quest_id, segment_id, sort, kind, text, x, y, z, npc, monster, items, object, dialog, checked, source) values (${row.id}, seg, ${sortExpr}, '${t.kind}', ${q(t.text)}, ${pos}, ${q(t.npc)}, ${q(t.monster)}, '${JSON.stringify(t.items || [])}'::jsonb, ${t.object || 'null'}, ${q(JSON.stringify(t.dialog || []))}::jsonb, false, ${q(t.source)});`);
      if (sort == null) lines.push('  sort_now := sort_now + 10;');
    }
    return `  insert into public.map_quest_segments (quest_id, sort, name) values (${row.id}, ${(i + 1) * 10}, ${q(s.name)}) returning id into seg;
  new_segs := new_segs || seg;
${lines.join('\n')}`;
  });
  blocks.push(`-- ${draft.quest}
do $$
declare seg bigint; new_segs bigint[] := '{}'; sort_now integer;
begin
  if exists (select 1 from public.map_quest_steps where quest_id = ${row.id}${replace.length ? ` and not (id = any(array[${replace.join(', ')}]))` : ''} and (source is null or updated_by is not null or checked)) then return; end if;${replace.length ? `
  delete from public.map_quest_steps where quest_id = ${row.id} and id = any(array[${replace.join(', ')}]);` : ''}
  delete from public.map_quest_steps where quest_id = ${row.id} and source <> 'old quest spot';${draft.dropOldRewards ? `
  delete from public.map_quest_steps where quest_id = ${row.id} and source = 'old quest spot';` : ''}
${parts.join('\n')}
  delete from public.map_quest_segments s where s.quest_id = ${row.id} and not (s.id = any(new_segs))
    and not exists (select 1 from public.map_quest_steps t where t.segment_id = s.id);
end $$;`);
}

const out = `supabase/migrations/${String(stepNo).padStart(4, '0')}_map_quest_${namePart}.sql`;
fs.writeFileSync(out, `-- =====================================================================================
-- Tibia Map - database step ${stepNo}: AI drafts of quest guides from the TibiaWiki walkthroughs (slice 13j)
--
-- Run this once in Supabase (the house planner's project): SQL Editor -> New query -> paste everything -> Run.
-- Needs steps 3, 6, 7 and 9${usesKey ? ' and 16 (Key steps)' : ''}. Written by tools/drafts-to-sql.js from tools/data/quest-drafts. Every step is a draft
-- (not checked) with its wiki sentence as its source; what the checker couldn't tie to a real NPC, word, monster,
-- item or spot is a Note "Needs placing: ...". The quest's Reward steps from the old spots are moved into the draft.
-- Earlier drafts of these quests are replaced; a quest with anything made, changed or ticked in the app is skipped.
--
-- ${total} steps for ${blocks.length} quests (${placing} need placing):
${report.join('\n')}
-- =====================================================================================

${blocks.join('\n\n')}
`);
console.log(report.join('\n'));
console.log(`${total} steps, ${placing} need placing -> ${out}`);
