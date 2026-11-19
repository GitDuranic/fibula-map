// The quest database (slice 13b): quests from Supabase (table map_quests, see supabase/migrations), read through
// Supabase's REST address with the public key, so reading needs no extra npm package.
//
// Settings come from the page that includes the map (<TibiaMap supabaseUrl=... supabaseKey=... />, as for the
// house planner on Ryndean's site), or else from Vite's VITE_SUPABASE_URL / _ANON_KEY (the local test server).
// Other bundlers don't have import.meta.env, so that's read defensively. Without settings: no database, and the
// map shows the quest list the converter wrote (quests.json).

let env = {};
try { env = import.meta.env ?? {}; } catch { /* not built with Vite */ }

export function questDbConfig({ url, key } = {}) {
  const u = url || env.VITE_SUPABASE_URL, k = key || env.VITE_SUPABASE_ANON_KEY;
  return u && k ? { url: u.replace(/\/$/, ''), key: k } : null;
}

// [{ id, name, sort, level, area, rewards, notes, status, fibula_mark, wiki_version, wiki_reward, updated_at }]
export async function fetchQuests(cfg) {
  const res = await fetch(`${cfg.url}/rest/v1/map_quests?select=*&order=sort,name`, {
    headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` },
  });
  if (!res.ok) throw new Error(`quests: ${res.status}`);
  return res.json();
}

// "I'm on this quest" (kept in this browser): the quest's name, or null.
const ON_KEY = 'tm-on-quest';
export function questOn() {
  try { return localStorage.getItem(ON_KEY); } catch { return null; }
}
export function setQuestOn(name) {
  try { if (name) localStorage.setItem(ON_KEY, name); else localStorage.removeItem(ON_KEY); } catch { /* private mode */ }
}
