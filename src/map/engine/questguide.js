// Quest guides (slice 13d): a quest's segments and steps (tables map_quest_segments / map_quest_steps, database
// step 3), the editors' changes to them, and each player's place in a guide (kept in the browser).
//
// guide: { questId, segments: [{ id, sort, name, steps: [step] }], steps: [step] (all, in order) }
// step:  { id, segment_id, sort, kind, text, x, y, z, npc, monster, items: [[id, count]], any_group, checked, source }
import { dbClient } from './questauth.js';

export const KINDS = { talk: 'Talk', go: 'Go', get: 'Get', kill: 'Kill', note: 'Note' };
const GAP = 10; // sort numbers leave gaps

// Reads a quest's guide (REST with the public key, like the quest list: no npm package for players).
export async function fetchGuide(cfg, questId) {
  const get = async (table) => {
    const res = await fetch(`${cfg.url}/rest/v1/${table}?select=*&quest_id=eq.${questId}&order=sort,id`, {
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` },
    });
    if (res.status === 404) return null; // database step 3 not run yet
    if (!res.ok) throw new Error(`${table}: ${res.status}`);
    return res.json();
  };
  const [segs, steps] = await Promise.all([get('map_quest_segments'), get('map_quest_steps')]);
  return makeGuide(questId, segs || [], steps || [], !segs || !steps);
}

function makeGuide(questId, segs, steps, missing = false) {
  const segments = segs.map((s) => ({ ...s, steps: steps.filter((t) => t.segment_id === s.id) }));
  return { questId, segments, steps: segments.flatMap((s) => s.steps), missing };
}

// A step's place on the map: its own spot, or for a Talk step without one, the NPC's.
export function stepPos(world, step) {
  if (step.x != null) return [step.x, step.y, step.z];
  if (step.kind === 'talk' && step.npc) {
    const n = world.npcs?.find((m) => m.n.toLowerCase() === step.npc.toLowerCase());
    if (n) return n.p;
  }
  return null;
}

// What a step says when it has no text of its own.
export function stepTitle(world, step) {
  if (step.text) return step.text;
  switch (step.kind) {
    case 'talk': return step.npc ? `Talk to ${step.npc}` : 'Talk';
    case 'kill': return step.monster ? `Kill ${step.monster}` : 'Kill';
    case 'get': return step.items.length ? `Get ${step.items.map(([id, n]) => `${n > 1 ? `${n} ` : ''}${world.itemName(id)}`).join(', ')}` : 'Get';
    case 'go': return 'Go here';
    default: return 'Note';
  }
}

// ---------- the editors' changes (each one throws on failure; reload the guide afterwards) ----------
async function run(q) {
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}

export async function addSegment(cfg, guide, name = null) {
  const sort = (guide.segments.at(-1)?.sort ?? 0) + GAP;
  return run((await dbClient(cfg)).from('map_quest_segments').insert({ quest_id: guide.questId, sort, name }).select().single());
}

// Adds a step at the end of segment segId (default: the last segment; a quest without one gets its first).
export async function addStep(cfg, guide, fields, segId) {
  let seg = guide.segments.find((s) => s.id === segId) || guide.segments.at(-1);
  if (!seg) seg = { ...(await addSegment(cfg, guide)), steps: [] };
  const sort = (seg.steps.at(-1)?.sort ?? 0) + GAP;
  return run((await dbClient(cfg)).from('map_quest_steps').insert({ quest_id: guide.questId, segment_id: seg.id, sort, ...fields }).select().single());
}

export async function updateStep(cfg, id, changes) {
  return run((await dbClient(cfg)).from('map_quest_steps').update(changes).eq('id', id).select().single());
}
export async function deleteStep(cfg, id) {
  return run((await dbClient(cfg)).from('map_quest_steps').delete().eq('id', id));
}
export async function renameSegment(cfg, id, name) {
  return run((await dbClient(cfg)).from('map_quest_segments').update({ name: name || null }).eq('id', id).select().single());
}
// Only empty segments can be deleted (the panel offers it only then).
export async function deleteSegment(cfg, id) {
  return run((await dbClient(cfg)).from('map_quest_segments').delete().eq('id', id));
}

// Moves step id into segment segId before step beforeId (null: at the end), renumbering that segment.
export async function moveStep(cfg, guide, id, segId, beforeId) {
  const seg = guide.segments.find((s) => s.id === segId);
  const step = guide.steps.find((t) => t.id === id);
  if (!seg || !step || id === beforeId) return;
  const list = seg.steps.filter((t) => t.id !== id);
  const at = beforeId == null ? list.length : list.findIndex((t) => t.id === beforeId);
  list.splice(at < 0 ? list.length : at, 0, step);
  const c = await dbClient(cfg);
  const changes = list.map((t, i) => ({ t, sort: (i + 1) * GAP })).filter(({ t, sort }) => t.sort !== sort || t.id === id);
  await Promise.all(changes.map(({ t, sort }) => run(c.from('map_quest_steps').update(t.id === id ? { sort, segment_id: segId } : { sort }).eq('id', t.id))));
}

// ---------- where each player is (kept in this browser) ----------
// { [quest id]: id of the step you're on (null/missing: the first; 'done': all done) }
const PROGRESS_KEY = 'tm-quest-progress';
function readProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; } catch { return {}; }
}
export function progressOf(questId) {
  return readProgress()[questId] ?? null;
}
export function setProgress(questId, stepId) {
  const all = readProgress();
  if (stepId == null) delete all[questId]; else all[questId] = stepId;
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(all)); } catch { /* private mode */ }
}
// The index (in guide.steps) of the step you're on: steps before it are done; steps.length = all done.
export function currentIndex(guide, at) {
  if (at === 'done') return guide.steps.length;
  const i = guide.steps.findIndex((t) => t.id === at);
  return i < 0 ? 0 : i;
}
