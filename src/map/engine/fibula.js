// The Project Fibula stats API (slice 17, user 2026-11-24: a friend's API, https://api.projectfibula.org/docs):
// who rents each house, for Settings "Players in houses". Only fetched while that setting is on. House owners rarely
// change, so the answer is kept in the browser for a day (a failed fetch falls back to the last one kept).
// The API sends no CORS header yet, so the browser can only read it through a proxy: the dev server has one at
// /fibula-api (vite.config.js); other sites pass their own base (the TibiaMap prop fibulaApi).

export const FIBULA_API = 'https://api.projectfibula.org';
const DAY = 24 * 60 * 60 * 1000;
const OWNERS_KEY = 'tm-fibula-owners';

const readCache = (key) => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
const writeCache = (key, data) => { try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), data })); } catch { /* full or private mode */ } };

// An outfit image URL from the API (`.../outfit.php?id=128&head=116&body=10&legs=68&feet=0`) -> [looktype, head,
// body, legs, feet], or null.
export function parseOutfit(url) {
  if (!url) return null;
  try {
    const q = new URL(url).searchParams, n = (k) => Number(q.get(k)) || 0;
    return n('id') ? [n('id'), n('head'), n('body'), n('legs'), n('feet')] : null;
  } catch { return null; }
}

// Players' outfits (slice 17b), fetched one player at a time (until the API has them in one call), only for the
// renters you're looking at, 3 at a time, and kept in the browser for 3 days (also "no outfit": the API has none
// while a character is in no highscores list). get(name): [looktype, head, body, legs, feet], null (none), or
// undefined (not known yet: asked for; onChange() is called when answers come in).
const OUTFITS_KEY = 'tm-fibula-outfits', OUTFIT_DAYS = 3;
export function outfitLoader(api = FIBULA_API, onChange = () => {}) {
  const cache = readCache(OUTFITS_KEY)?.data || {}; // name -> [time, outfit | null]
  const queue = [], asked = new Set();
  let running = 0, saveTimer = 0;
  const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => writeCache(OUTFITS_KEY, cache), 500); };
  const pump = () => {
    while (running < 3 && queue.length) {
      const name = queue.shift();
      running++;
      fetch(`${api}/players/${encodeURIComponent(name)}?char_info=true&ranking_info=false&updates=false&deaths=false`)
        .then(async (res) => {
          if (res.status === 404) return null;
          if (!res.ok) throw new Error(`player: ${res.status}`);
          const data = await res.json(), p = data[name] || Object.values(data)[0];
          return parseOutfit(p?.info?.outfit);
        })
        .then((o) => { cache[name] = [Date.now(), o]; save(); onChange(); }, () => { /* not kept: asked again next visit */ })
        .finally(() => { running--; pump(); });
    }
  };
  return {
    get(name) {
      const c = cache[name];
      if (c && Date.now() - c[0] < OUTFIT_DAYS * DAY) return c[1];
      if (!asked.has(name)) { asked.add(name); queue.push(name); pump(); }
      return c ? c[1] : undefined; // an old answer while a new one is on its way
    },
  };
}

// House name -> renter's name (houses without one left out). { owners: Map, stale?: true } or throws without any.
export async function fetchHouseOwners(api = FIBULA_API) {
  const cached = readCache(OWNERS_KEY);
  if (cached && Date.now() - cached.t < DAY) return { owners: new Map(Object.entries(cached.data)) };
  try {
    const res = await fetch(`${api}/houses?updates=false&owners=true`);
    if (!res.ok) throw new Error(`houses: ${res.status}`);
    const byTown = await res.json(), data = {};
    for (const town of Object.values(byTown)) for (const h of Object.values(town)) if (h?.owner) data[h.name] = h.owner;
    writeCache(OWNERS_KEY, data);
    return { owners: new Map(Object.entries(data)) };
  } catch (e) {
    if (cached) return { owners: new Map(Object.entries(cached.data)), stale: true };
    throw e;
  }
}
