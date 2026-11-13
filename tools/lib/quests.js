// Quest chests for the map (slice 10): the chests that are on the 7.1 map, what's in them for 7.1 according to
// TibiaWiki, and the quest's name.
//
// Sources:
//   - TVP data/scripts/actions/map/quests.lua: each quest chest (by action id) with its contents (7.6 stand-in).
//   - The TVP 7.6 map: where each of those chests is (questSpots from scanDoorsAndKeys).
//   - tools/data/wikiquests.json: TibiaWiki quests that came in 7.1 or earlier (or give no version): name, version,
//     reward text, and coordinates (mostly entrances and route points).
//   - The 7.1 map: only chests that are there count (the user: start with these).
// A chest belongs to a wiki quest when the wiki's reward names items in it and it lies within MAX_DIST of the quest's
// coordinates. Its contents are only the items the wiki names (the user: "just the wiki for 7.1 items"), with the
// wiki's count where it gives one.
import fs from 'node:fs';

const MAX_DIST = 200; // tiles from the nearest coordinate the wiki gives for the quest (entrances can be far off)
const PLACEHOLDER = '32356,32171,7'; // a spot several unrelated quest pages give (Thais Ancient Temple entrance)
const CONTAINERS = /^(bag|backpack|present|\w+ bag|\w+ backpack)$/; // only hold the reward; not shown themselves

// quests.lua: Map(action id -> [{ sid, count, key }]) (an item and the contents of a bag, flattened).
export function parseQuestChests(lua) {
  const chests = new Map();
  for (const m of lua.matchAll(/^\t\[(\d+)\] = \{([\s\S]*?)^\t\},?$/gm)) {
    const items = [...m[2].matchAll(/\{id = (\d+)(?:, count = (\d+))?(?:, keynumber = (\d+))?/g)]
      .map((x) => ({ sid: +x[1], count: +(x[2] || 1), key: x[3] ? +x[3] : null }));
    chests.set(+m[1], items);
  }
  return chests;
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const plurals = (a) => [a, `${a}s`, `${a}es`, a.endsWith('y') ? `${a.slice(0, -1)}ies` : null].filter(Boolean);
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

// Does the wiki reward text name this item? Returns { count } (the count before it, else 1), or null.
function inReward(rewardNorm, name, key) {
  if (key) return new RegExp(`\\bkey ${key}\\b`).test(rewardNorm) ? { count: 1 } : null;
  for (const form of plurals(norm(name))) {
    const m = new RegExp(`(?:^|\\s)(?:(\\d+|${Object.keys(WORDS).join('|')}) )?${form}(?:\\s|$)`).exec(rewardNorm);
    if (m) return { count: m[1] ? +(m[1] in WORDS ? WORDS[m[1]] : m[1]) : 1 };
  }
  return null;
}

// spots76: [{ p, sid, aid }]; chestItems: from parseQuestChests; wiki: wikiquests.json quests;
// nameOf(sid) -> item name; on71(p, name) -> [x, y, z] where the 7.1 map has an item of that name (on p or next to
// it), or null.
// Returns { quests: [{ name, version, reward, chests: [{ p, sid (the chest item), items: [{ sid, count, key }] }] }], stats }.
export function matchQuests({ spots76, chestItems, wiki, nameOf, on71 }) {
  const byQuest = new Map();
  const stats = { spots: spots76.length, on71: 0, matched: 0 };
  for (const s of spots76) {
    const items = (chestItems.get(s.aid) || []).filter((i) => !CONTAINERS.test(nameOf(i.sid) || ''));
    if (!items.length) continue;
    const at71 = on71(s.p, nameOf(s.sid));
    if (!at71) continue;
    stats.on71++;
    let best = null;
    for (const q of wiki) {
      const rw = norm(q.reward);
      const found = items.map((i) => ({ i, hit: inReward(rw, nameOf(i.sid) || '', i.key) })).filter((x) => x.hit);
      if (!found.length) continue;
      const pts = q.coords.filter((c) => c.join(',') !== PLACEHOLDER);
      const dist = pts.length ? Math.min(...pts.map((c) => Math.max(Math.abs(c[0] - s.p[0]), Math.abs(c[1] - s.p[1])))) : null;
      if (dist != null && dist > MAX_DIST) continue;
      if (dist == null && found.length < 2) continue; // no place to check: only with two or more items in common
      if (!best || found.length > best.found.length || (found.length === best.found.length && (dist ?? 1e9) < (best.dist ?? 1e9))) best = { q, found, dist };
    }
    if (!best) continue;
    stats.matched++;
    const key = best.q.name;
    if (!byQuest.has(key)) byQuest.set(key, { name: best.q.name, version: best.q.implemented, reward: best.q.reward, chests: [] });
    byQuest.get(key).chests.push({ p: at71, sid: s.sid, items: best.found.map(({ i, hit }) => ({ sid: i.sid, count: hit.count, key: i.key })) });
  }
  return { quests: [...byQuest.values()], stats };
}

export const loadWikiQuests = (file) => JSON.parse(fs.readFileSync(file, 'utf8')).quests;
