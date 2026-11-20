// Discord login for the two quest editors (slice 13c), the same way as the house planner (cloud.js there): the
// Supabase library is only downloaded when it's needed (Log in pressed, the return from Discord, or a saved login),
// so players who never log in don't load it. Reading quests stays on plain REST (questdb.js).
//
// Who may edit is decided by the database (map_is_editor(), database step 2); the map only asks it to know whether
// to show the Edit button. Everyone else who logs in just sees "not an editor".

let client = null, loading = null, cfgUsed = null;
function sb(cfg) {
  if (loading && cfgUsed === cfg.url) return loading;
  cfgUsed = cfg.url;
  // pkce: Discord comes back as ?code=... (as in the planner)
  loading = import('@supabase/supabase-js').then(({ createClient }) => (client = createClient(cfg.url, cfg.key, { auth: { flowType: 'pkce' } })));
  return loading;
}

const ref = (cfg) => new URL(cfg.url).hostname.split('.')[0];
const HASH_KEY = 'tm-login-hash';

// Is there a login to pick up? (the return from Discord, or a saved session)
function loginPending(cfg) {
  try {
    if (new URLSearchParams(window.location.search).has('code')) return true;
    if (/access_token=|error_description=/.test(window.location.hash)) return true;
    return Object.keys(localStorage).some((k) => k.startsWith(`sb-${ref(cfg)}-auth-token`));
  } catch { return false; }
}

// Discord sends you back to the page without the map's place (#x,y,z,zoom): put it back before the map reads it.
export function restoreLoginHash() {
  try {
    const h = sessionStorage.getItem(HASH_KEY);
    if (!h) return;
    sessionStorage.removeItem(HASH_KEY);
    if (!window.location.hash && new URLSearchParams(window.location.search).has('code')) window.history.replaceState(window.history.state, '', h);
  } catch { /* private mode */ }
}

// Calls cb(user | null) on login changes; only loads Supabase when there's a login to pick up.
export function watchLogin(cfg, cb) {
  let stopped = false, unsub = () => {};
  if (cfg && loginPending(cfg)) {
    sb(cfg).then((c) => {
      if (stopped) return;
      const { data } = c.auth.onAuthStateChange((_e, session) => cb(session?.user ?? null));
      unsub = () => data.subscription.unsubscribe();
    });
  }
  return () => { stopped = true; unsub(); };
}

export async function logIn(cfg) {
  try { sessionStorage.setItem(HASH_KEY, window.location.hash); } catch { /* private mode */ }
  // back to this same page (the address must be in Supabase's allowed redirect URLs, as for the planner)
  const back = window.location.origin + window.location.pathname;
  return (await sb(cfg)).auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: back } });
}
export const logOut = async (cfg) => (await sb(cfg)).auth.signOut();

// The Discord name to show.
export function displayName(user) {
  const m = user?.user_metadata ?? {};
  return m.custom_claims?.global_name || m.full_name || m.name || 'Unknown';
}

// May this login edit quests? (false before database step 2 is run)
export async function isEditor(cfg) {
  const { data, error } = await (await sb(cfg)).rpc('map_is_editor');
  return !error && data === true;
}

// Saves changes to a quest; returns the row as stored. Fails if you're not an editor (the database says no).
export async function saveQuest(cfg, id, changes) {
  const { data, error } = await (await sb(cfg)).from('map_quests').update(changes).eq('id', id).select().maybeSingle();
  if (error) throw new Error(/duplicate key/.test(error.message) ? 'There is already a quest with that name.' : error.message);
  if (!data) throw new Error('Not saved: this account may not edit quests.');
  return data;
}

// The Supabase client, for the guide's writes (questguide.js).
export const dbClient = (cfg) => sb(cfg);
