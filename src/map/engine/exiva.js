// Find Person ("exiva", user 2026-11-25): what the spell says about someone, and where they can be after several
// casts. The answer is worked out exactly as the spell does it (TVP data/scripts/spells/support/find_person.lua):
// distance is the larger of the x and y differences (under 5 next to you, up to 100 "to the", up to 249 "far to
// the", then "very far to the"); the direction is one of 8 slices with edges at 22.5 degrees (tangents 0.4142 and
// 2.4142). The floor only changes the wording ("above you", "on a lower level to the"), not the zone.

// Directions in canvas angle order (0 = east, then clockwise on screen since y grows south).
export const EXIVA_DIRS = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
export const EXIVA_BANDS = ['next to you', 'to the', 'far to the', 'very far to the'];

// The answer for a caster at (cx, cy) and a person at (tx, ty): { band: 0-3, dir: 0-7 (-1 when next to you) }.
export function exivaAnswer(cx, cy, tx, ty) {
  const dx = cx - tx, dy = cy - ty, m = Math.max(Math.abs(dx), Math.abs(dy));
  if (m < 5) return { band: 0, dir: -1 };
  const band = m < 101 ? 1 : m < 250 ? 2 : 3;
  const t = dx !== 0 ? dy / dx : 10, a = Math.abs(t);
  let dir;
  if (a < 0.4142) dir = dx > 0 ? 4 : 0;
  else if (a < 2.4142) dir = t > 0 ? (dy > 0 ? 5 : 1) : (dx > 0 ? 3 : 7);
  else dir = dy > 0 ? 6 : 2;
  return { band, dir };
}

export const exivaText = (ans) => (ans.band === 0 ? EXIVA_BANDS[0] : `${EXIVA_BANDS[ans.band]} ${EXIVA_DIRS[ans.dir]}`);
export const sameAnswer = (a, b) => a.band === b.band && (a.band === 0 || a.dir === b.dir);

// Every answer the spell can give, for the answer picker: next to you, then each band's 8 directions.
export const EXIVA_ANSWERS = [{ band: 0, dir: -1 }, ...[1, 2, 3].flatMap((band) => EXIVA_DIRS.map((_, dir) => ({ band, dir })))];

// Where the person can be after the answered casts (readings: [{ p: [x, y, z], ans }]), on a grid of `cell` tiles
// over the map's bounds (the middle tile of each cell is tested). Returns { canvas, x0, y0, cell, left, spots } where
// the canvas has one pixel per cell, dark where they can't be, clear where they can; left: how many cells are left;
// spots: the middle tiles of those cells ([x, y, x, y, ...], at most about 60000: evenly thinned out), for
// exivaSuggest.
// land (slice 3, optional: exivaLand for the same grid): cells nobody can stand in (water, walls on every floor)
// stay lit, so the zones keep their shape, but don't count in `left` or `spots`; tiles: about how many tiles that is.
export const exivaGrid = (bounds, cell = 2) => {
  const x0 = Math.floor(bounds.x1 / cell) * cell, y0 = Math.floor(bounds.y1 / cell) * cell;
  return { x0, y0, cell, w: Math.ceil((bounds.x2 + 1 - x0) / cell), h: Math.ceil((bounds.y2 + 1 - y0) / cell) };
};
export function exivaOverlap(bounds, readings, cell = 2, land = null) {
  const { x0, y0, w, h } = exivaGrid(bounds, cell);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d'), img = ctx.createImageData(w, h), px = img.data;
  const half = Math.floor(cell / 2);
  let left = 0;
  const ok8 = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) {
    const ty = y0 + j * cell + half;
    for (let i = 0; i < w; i++) {
      const tx = x0 + i * cell + half;
      let ok = true;
      for (const r of readings) if (!sameAnswer(exivaAnswer(r.p[0], r.p[1], tx, ty), r.ans)) { ok = false; break; }
      const o = (j * w + i) * 4;
      if (!ok) { px[o + 3] = 150; continue; } // black at about 60%
      if (land && !land[j * w + i]) continue;
      left++; ok8[j * w + i] = 1;
    }
  }
  ctx.putImageData(img, 0, 0);
  const step = Math.max(1, Math.ceil(left / 60000)), spots = [];
  for (let k = 0, n = 0; k < ok8.length; k++) if (ok8[k] && n++ % step === 0) spots.push(x0 + (k % w) * cell + half, y0 + Math.floor(k / w) * cell + half);
  return { canvas, x0, y0, cell, left, spots, tiles: left * cell * cell, land: !!land };
}

// Slice 3: which cells of the grid (exivaGrid) someone can stand in: a walkable tile on any floor (the spell ignores
// the floor). walk: World.loadWalk()'s { bytes, offset: Map("z:cx:cy" -> byte offset) }, C: the chunk size.
export function exivaLand(walk, C, grid) {
  const { x0, y0, cell, w, h } = grid, out = new Uint8Array(w * h);
  for (const [key, o] of walk.offset) {
    const [, cx, cy] = key.split(':').map(Number);
    for (let ty = 0; ty < C; ty++) {
      const j = Math.floor((cy * C + ty - y0) / cell);
      if (j < 0 || j >= h) continue;
      for (let tx = 0; tx < C; tx++) {
        if (!walk.bytes[o + ty * C + tx]) continue;
        const i = Math.floor((cx * C + tx - x0) / cell);
        if (i >= 0 && i < w) out[j * w + i] = 1;
      }
    }
  }
  return out;
}

// Slice 3: how many rides (and how much gold) from `at` (where you cast last) to each stop. A stop offers the
// passages whose NPC stands within 40 tiles of it (the same harbour); from `at` you may walk up to 120 tiles to one. Fewest rides first, then least gold.
// Returns Map(stop -> { rides, gold }); stops you can't reach by ride from there are missing.
export function exivaRides(passages, stops, at) {
  const near = (p, q, r) => Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1])) <= r;
  const byPos = new Map(stops.map((s) => [s.p.join(','), s]));
  const best = new Map(), todo = [{ p: at, rides: 0, gold: 0, walk: 120 }];
  const better = (a, b) => !b || a.rides < b.rides || (a.rides === b.rides && a.gold < b.gold);
  // Stops within walking distance (120 tiles) of where you are: no ride.
  for (const stop of stops) if (stop.p[2] === at[2] && near(stop.p, at, 120)) { best.set(stop, { rides: 0, gold: 0 }); todo.push({ p: stop.p, rides: 0, gold: 0 }); }
  while (todo.length) {
    todo.sort((a, b) => a.rides - b.rides || a.gold - b.gold);
    const cur = todo.shift();
    for (const [npc, , price, , x, y, z, tx, ty, tz] of passages || []) {
      if (npc === 'The Oracle' || npc === 'The Gatekeeper' || !near([x, y, z], cur.p, cur.walk || 40)) continue;
      const stop = byPos.get(`${tx},${ty},${tz}`);
      if (!stop) continue;
      const got = { rides: cur.rides + 1, gold: cur.gold + price };
      if (!better(got, best.get(stop))) continue;
      best.set(stop, got);
      todo.push({ p: stop.p, ...got });
    }
  }
  return best;
}

// The quick ways to move far (slice 2): where the boats and carpets put you, from the passages in links.json
// ([NPC, destination, price, min level, x, y, z, tx, ty, tz]). Not the Oracle and the Gatekeeper (Rookgaard, once).
// [{ name: 'Venore (boat)', p: [x, y, z] }], one per arrival spot.
const CARPETS = new Set(['Pino', 'Uzon', 'Chemar']), STEAMSHIP = new Set(['Brodrosch', 'Gurbasch']);
export function exivaStops(passages) {
  const byPos = new Map();
  for (const [npc, dest, , , , , , tx, ty, tz] of passages || []) {
    if (npc === 'The Oracle' || npc === 'The Gatekeeper') continue;
    const k = `${tx},${ty},${tz}`;
    const kind = CARPETS.has(npc) ? 'carpet' : STEAMSHIP.has(npc) ? 'steamship' : 'boat';
    if (!byPos.has(k)) byPos.set(k, { name: `${dest} (${kind})`, p: [tx, ty, tz] });
  }
  return [...byPos.values()];
}

// Which stop to exiva from next (slice 2): for each stop, the place left after its answer, on average over where
// the person may be (the spots of exivaOverlap, each as likely): the sum over its possible answers of (spots giving
// that answer)^2 / spots. The smallest is the best next question. Returns the best `max` as
// [{ stop, left: the share of the area expected to be left (0-1), rides, gold }], leaving out stops that can't narrow
// it down. rides (slice 3, optional: exivaRides from where you are): each ride counts as RIDE_COST of the area, so a
// stop one ride away beats a slightly better one three rides away; a stop with no ride from here counts as 3 rides.
export const RIDE_COST = 0.08;
export function exivaSuggest(overlap, stops, max = 3, rides = null) {
  const sp = overlap?.spots, n = sp ? sp.length / 2 : 0;
  if (n < 2) return [];
  const out = [];
  for (const stop of stops) {
    const counts = new Map();
    for (let i = 0; i < sp.length; i += 2) {
      const a = exivaAnswer(stop.p[0], stop.p[1], sp[i], sp[i + 1]), k = a.band * 8 + a.dir;
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    let e = 0;
    for (const c of counts.values()) e += c * c;
    const left = e / n / n;
    const ride = rides?.get(stop);
    if (left < 0.999) out.push({ stop, left, rides: ride?.rides ?? null, gold: ride?.gold ?? null, score: left + (rides ? RIDE_COST * (ride?.rides ?? 3) : 0) });
  }
  return out.sort((a, b) => a.score - b.score).slice(0, max);
}
