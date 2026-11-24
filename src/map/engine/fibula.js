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
