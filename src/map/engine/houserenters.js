// Players in houses (slice 17): who rents each house on Project Fibula and in which outfit. One of Ryndean's servers
// asks the Project Fibula stats API (https://api.projectfibula.org) once a day and stores the answer in Supabase
// (table map_house_renters, database step 28; slice 17c, user 2026-11-25: one daily call instead of every browser
// calling the API). The map reads it over plain REST with the public key, as quests (questdb.js), only while the
// setting is on, once per page load.

let cached = null; // { key, promise }

// House name -> { renter, outfit: [looktype, head, body, legs, feet] or null (no outfit known) }. Throws without
// database settings or when the table isn't there (step 28 not run).
export function fetchHouseRenters(cfg) {
  if (!cfg) return Promise.reject(new Error('Players in houses needs the database settings.'));
  const key = `${cfg.url} ${cfg.key}`;
  if (cached?.key === key) return cached.promise;
  const promise = (async () => {
    const res = await fetch(`${cfg.url}/rest/v1/map_house_renters?select=house,renter,looktype,head,body,legs,feet`, {
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` },
    });
    if (res.status === 404) throw new Error('Database step 28 has not been run yet.');
    if (!res.ok) throw new Error(`house renters: ${res.status}`);
    const out = new Map();
    for (const r of await res.json()) {
      out.set(r.house, { renter: r.renter, outfit: r.looktype ? [r.looktype, r.head || 0, r.body || 0, r.legs || 0, r.feet || 0] : null });
    }
    return out;
  })();
  cached = { key, promise };
  promise.catch(() => { if (cached?.promise === promise) cached = null; }); // asked again next time
  return promise;
}
