// Quests for the map (slice 12): the user's Project Fibula quest list (tools/data/fibula-quests.json) merged with
// the spots found automatically (slice 10: TVP quest chests on the 7.1 map, matched to TibiaWiki). Used by the
// converter (quests.json) and, in development, by the map itself, so edits show at once.
//
// list: { quests: [{ n, level, area, reward, mark (✅ on the user's list), checked (gone through on the map),
//                    spots: null (use the automatic ones) | [{ p [x, y, z], id (object shown), items [[id, count, key?]] }] }] }
// auto: [{ n, v, reward (TibiaWiki), chests: [{ p, id, items }] }]
// Returns [{ n, level, area, reward, mark, checked, onList, edited, v, wiki, chests }]: the list's quests in its
// order, then automatic quests that aren't on it (onList false).

export const questKey = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function mergeQuests(list, auto) {
  const autoBy = new Map(auto.map((q) => [questKey(q.n), q]));
  const out = [];
  const seen = new Set();
  for (const q of list?.quests || []) {
    const k = questKey(q.n), a = autoBy.get(k);
    seen.add(k);
    out.push({
      n: q.n, level: q.level ?? null, area: q.area || '', reward: q.reward || '', mark: !!q.mark, checked: !!q.checked,
      onList: true, edited: Array.isArray(q.spots), v: a?.v || '', wiki: a?.reward || '',
      chests: (Array.isArray(q.spots) ? q.spots : a?.chests || []).map((c) => ({ p: c.p, id: c.id || 0, items: c.items || [] })),
    });
  }
  for (const a of auto) {
    if (seen.has(questKey(a.n))) continue;
    out.push({ n: a.n, level: null, area: '', reward: '', mark: false, checked: false, onList: false, edited: false, v: a.v || '', wiki: a.reward || '', chests: a.chests });
  }
  return out;
}
