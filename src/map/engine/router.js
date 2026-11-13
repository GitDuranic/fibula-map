// The route finder. It runs in a web worker (built from routerMain's source, so it works with any bundler:
// Vite here, webpack on Ryndean's site), loads the walk data itself and answers route requests.
//
// Moves and their times (rules from the TVP server, src/creature.cpp onCreatureMove; see the design doc, 3c and 4b):
// - a step to one of 8 neighbours that can be walked on: the step time on the tile stepped onto,
//   50 * ceil(1000 * ground speed / speed / 50) ms (integer maths as the server); a diagonal step 3 times that;
// - stepping onto stairs / a ramp / a hole ("step" link) is one move straight to the other floor: one step time on
//   the tile you land on (never diagonal: the floor changes);
// - stepping onto a magic forcefield ("teleport" link): one step onto the forcefield, then you're at its destination;
// - ladders, sewer grates and rope spots ("use" links, used from the tile or a neighbour) move you the same way:
//   one step time on the tile you land on; a loose stone pile is dug first and then stepped into (two steps);
// - an NPC passage (boat, carpet, the Oracle): from any tile within 3 of the NPC on its floor (TVP npcbehavior.cpp,
//   areInRange<3, 3>), PASSAGE_MS for talking, then you're at the destination. It costs its price in gold.
// Each tile on the path carries what sets its time (ground speeds, or the passage), so the time can be worked out
// again for another speed without searching again (routeTime).
//
// Two routes are searched: the fastest, and the cheapest (least gold, then fastest), shown when they differ.
// Locked doors block unless unlocked (by key number, or the door itself when its number isn't known) or all opened.
// When that leaves no route, the search is done again with all doors open, to tell which locked doors are in the way.

export const PASSAGE_MS = 2000; // talking to the NPC (user: players type the combo in about 2 seconds)
export const TALK_RANGE = 3;

// The server's step time: 50 * ceil(1000 * ground / speed / 50) ms, 3x for a diagonal step.
export function stepTime(ground, speed, diagonal = false) {
  const t = 50 * Math.floor((50 + Math.floor(1000 * ground / speed) - 1) / 50);
  return diagonal ? 3 * t : t;
}

// The time of one path entry ([x, y, z, how, ground, ground2, passage]) for a speed.
// how: 'start' | 'walk' | 'diagonal' | 'npc' | link kind.
function entryTime([, , , how, ground, ground2], speed) {
  if (how === 'start') return 0;
  if (how === 'npc') return PASSAGE_MS;
  let t = stepTime(ground, speed, how === 'diagonal');
  if (how === 'dig') t += stepTime(ground2, speed); // dig the pile, step into the hole, land below
  return t;
}

// The time of a path for a speed.
export function routeTime(path, speed) {
  let t = 0;
  for (const e of path) t += entryTime(e, speed);
  return t;
}

// The route in legs, for the panel: walking parts and passages, in order.
// [{ kind: 'walk', from, to, steps, floors (floor changes), teleports, time }
//  | { kind: 'npc', npc, dest, price, from, to, time }]   (from/to: [x, y, z])
export function routeLegs(path, speed) {
  const legs = [];
  let walk = null;
  for (let i = 1; i < path.length; i++) {
    const e = path[i], prev = path[i - 1];
    if (e[3] === 'npc') {
      walk = null;
      const [npc, dest, price] = e[6];
      legs.push({ kind: 'npc', npc, dest, price, from: prev.slice(0, 3), to: e.slice(0, 3), time: PASSAGE_MS });
      continue;
    }
    if (!walk) legs.push((walk = { kind: 'walk', from: prev.slice(0, 3), to: null, steps: 0, floors: 0, teleports: 0, time: 0 }));
    walk.to = e.slice(0, 3);
    walk.steps++;
    walk.time += entryTime(e, speed);
    if (e[3] === 'teleport') walk.teleports++;
    else if (e[2] !== prev[2]) walk.floors++;
  }
  return legs;
}

// Runs inside the worker. Must not use anything from outside this function.
export function routerMain() {
  // { bytes, offset: Map(chunkKey -> byte offset), stepLinks: Map(tileKey -> [to, kind]),
  //   useLinks: Map(tileKey -> [[to, kind]]), passages: [[NPC, dest, price, level, x, y, z, tx, ty, tz]] }
  let W = null;
  const C = 32;
  const PASSAGE_MS = 2000, TALK_RANGE = 3; // as outside (this function can't see them)
  const GOLD = 1e9; // cheapest route: 1 gold weighs more than any walking time (ms)
  const key = (x, y, z) => (z * 65536 + y) * 65536 + x;
  const ck = (z, cx, cy) => (z * 4096 + cx) * 4096 + cy;
  const speedAt = (x, y, z) => {
    const cx = Math.floor(x / C), cy = Math.floor(y / C), o = W.offset.get(ck(z, cx, cy));
    return o === undefined ? 0 : W.bytes[o + (y - cy * C) * C + (x - cx * C)] * 2;
  };

  async function load(base) {
    const [bin, linksJson, map, doors] = await Promise.all([
      fetch(`${base}/walk.bin`).then((r) => r.arrayBuffer()),
      fetch(`${base}/links.json`).then((r) => r.json()),
      fetch(`${base}/map.json`).then((r) => r.json()),
      fetch(`${base}/doors.json`).then((r) => r.json()).catch(() => []), // older data: no locked doors
    ]);
    const offset = new Map();
    let i = 0;
    for (let z = 0; z < 16; z++) for (const [cx, cy] of map.chunks[z] || []) offset.set(ck(z, cx, cy), (i++) * C * C);
    const stepLinks = new Map(), useLinks = new Map();
    for (const [x, y, z, tx, ty, tz, k] of linksJson.links) {
      const kind = linksJson.kinds[k], to = [tx, ty, tz];
      if (kind === 'step' || kind === 'teleport') stepLinks.set(key(x, y, z), [to, kind]);
      else {
        const kk = key(x, y, z);
        if (!useLinks.has(kk)) useLinks.set(kk, []);
        useLinks.get(kk).push([to, kind]);
      }
    }
    const teleports = linksJson.links.filter((l) => linksJson.kinds[l[6]] === 'teleport');
    // Locked doors by tile: [key number (0 = unknown), x, y, z].
    const lockedAt = new Map(doors.map(([x, y, z, , , num]) => [key(x, y, z), [num, x, y, z]]));
    W = { bytes: new Uint8Array(bin), offset, stepLinks, useLinks, teleports, passages: linksJson.passages || [], lockedAt };
  }

  // A binary min-heap of [priority, key].
  function Heap() {
    const a = [];
    return {
      get size() { return a.length; },
      push(p, k) {
        a.push([p, k]);
        let i = a.length - 1;
        while (i > 0) { const j = (i - 1) >> 1; if (a[j][0] <= a[i][0]) break; [a[i], a[j]] = [a[j], a[i]]; i = j; }
      },
      pop() {
        const top = a[0], last = a.pop();
        if (a.length) {
          a[0] = last;
          let i = 0;
          for (;;) {
            const l = 2 * i + 1, r = l + 1;
            let m = i;
            if (l < a.length && a[l][0] < a[m][0]) m = l;
            if (r < a.length && a[r][0] < a[m][0]) m = r;
            if (m === i) break;
            [a[i], a[m]] = [a[m], a[i]]; i = m;
          }
        }
        return top;
      },
    };
  }

  // A* from `from` to `to` ([x, y, z]) for a character with `speed` (client speed value) and `level`.
  // cheap: least gold first, then fastest. Returns { path, steps, gold, expanded } or { error }.
  // locked(tileKey): is there a locked door here that is still locked?
  function route(from, to, speed, level, cheap, locked) {
    const stepTime = (ground, diagonal) => { const t = 50 * Math.floor((50 + Math.floor(1000 * ground / speed) - 1) / 50); return diagonal ? 3 * t : t; };
    const minStep = stepTime(90, false); // the fastest ground: keeps the estimate below the real time
    const goal = key(...to);
    // Passages this character can take, by the tiles they can be taken from (within talk range, same floor).
    const passages = W.passages.filter((p) => p[3] <= level);
    const passagesFrom = new Map();
    for (const p of passages) {
      for (let dy = -TALK_RANGE; dy <= TALK_RANGE; dy++) for (let dx = -TALK_RANGE; dx <= TALK_RANGE; dx++) {
        const k = key(p[4] + dx, p[5] + dy, p[6]);
        if (!passagesFrom.has(k)) passagesFrom.set(k, []);
        passagesFrom.get(k).push(p);
      }
    }
    // The estimate: walking straight there, or walking to the nearest jump (passage or teleport) and walking on from
    // the jump destination closest to the goal. Never more than the real time, as jumps can cover any distance.
    const cheb = (x, y, a, b) => Math.max(Math.abs(x - a), Math.abs(y - b));
    const jumps = [
      ...passages.map((p) => [p[4], p[5], TALK_RANGE, p[7], p[8]]),
      ...W.teleports.map((l) => [l[0], l[1], 0, l[3], l[4]]),
    ];
    const toGoal = jumps.reduce((m, j) => Math.min(m, cheb(j[3], j[4], to[0], to[1])), Infinity);
    const h = (x, y) => {
      const direct = cheb(x, y, to[0], to[1]);
      if (direct <= toGoal) return direct * minStep;
      let reach = Infinity;
      for (const j of jumps) { const d = Math.max(0, cheb(x, y, j[0], j[1]) - j[2]); if (d < reach) reach = d; }
      return Math.min(direct, reach + toGoal) * minStep;
    };
    const g = new Map(), came = new Map(), heap = Heap();
    const start = key(...from);
    g.set(start, 0);
    heap.push(h(from[0], from[1]), start);
    const coords = (k) => { const x = k % 65536, r = (k - x) / 65536, y = r % 65536; return [x, y, (r - y) / 65536]; };
    let expanded = 0;
    const relax = (k, cost, prev, how, x, y, ground, ground2, passage) => {
      const old = g.get(k);
      if (old !== undefined && old <= cost) return;
      g.set(k, cost);
      came.set(k, [prev, how, ground, ground2, passage]);
      heap.push(cost + h(x, y), k);
    };
    const groundAt = (x, y, z) => speedAt(x, y, z) || 100; // a landing tile without walk data: plain ground
    while (heap.size) {
      const [f, k] = heap.pop();
      const cost = g.get(k);
      const [x, y, z] = coords(k);
      if (f > cost + h(x, y) + 1e-6) continue; // an outdated entry
      if (k === goal) {
        const path = [];
        let gold = 0;
        for (let c = k; c !== undefined;) {
          const [px, py, pz] = coords(c), cf = came.get(c);
          if (cf?.[4]) gold += cf[4][2];
          path.push(cf ? [px, py, pz, cf[1], cf[2], cf[3], cf[4]] : [px, py, pz, 'start']);
          c = cf?.[0];
        }
        path.reverse();
        return { path, steps: path.filter((e) => e[3] !== 'start' && e[3] !== 'npc').length, gold, expanded };
      }
      if (++expanded > 6000000) return { error: 'No route found (searched too far).' };
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy, diag = dx && dy, nk = key(nx, ny, z);
        const link = W.stepLinks.get(nk);
        const ground = speedAt(nx, ny, z);
        if (link) {
          const [dest, kind] = link;
          if (kind === 'teleport') {
            // One step onto the forcefield (its own ground), and you're at its destination.
            const gt = ground || 100;
            relax(key(...dest), cost + stepTime(gt, diag), k, 'teleport', dest[0], dest[1], gt);
          } else {
            // Stairs, ramp or hole: stepping on it is one move to the other floor.
            const gd = groundAt(...dest);
            relax(key(...dest), cost + stepTime(gd, false), k, 'step', dest[0], dest[1], gd);
          }
          continue;
        }
        if (ground && !locked(nk)) relax(nk, cost + stepTime(ground, diag), k, diag ? 'diagonal' : 'walk', nx, ny, ground);
      }
      // Ladders, grates, rope spots, loose stone piles on this tile or next to it.
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        for (const [dest, kind] of W.useLinks.get(key(x + dx, y + dy, z)) || []) {
          const gd = groundAt(...dest);
          if (kind === 'dig') {
            // Dig the pile, step into the hole (its ground), land below.
            const gp = groundAt(x + dx, y + dy, z);
            relax(key(...dest), cost + stepTime(gp, false) + stepTime(gd, false), k, kind, dest[0], dest[1], gp, gd);
          } else relax(key(...dest), cost + stepTime(gd, false), k, kind, dest[0], dest[1], gd);
        }
      }
      // Boats, carpets and the Oracle: talk, pay, arrive.
      for (const p of passagesFrom.get(k) || []) {
        relax(key(p[7], p[8], p[9]), cost + PASSAGE_MS + (cheap ? p[2] * GOLD : 0), k, 'npc', p[7], p[8], 0, 0, p);
      }
    }
    return { error: 'No route found: these two places are not connected.' };
  }

  self.onmessage = async (e) => {
    const { id, type, base, from, to, speed, level, doors = { all: false, open: [] } } = e.data;
    try {
      if (type === 'load') { await load(base); self.postMessage({ id, ok: true }); return; }
      if (!W) throw new Error('Walk data not loaded');
      // A spot you can't stand on (a depot locker, an NPC behind its counter, a wall): the nearest walkable tile
      // on the same floor, within 3 tiles.
      const snap = ([x, y, z]) => {
        for (let r = 0; r <= 3; r++) {
          for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) === r && speedAt(x + dx, y + dy, z)) return [x + dx, y + dy, z];
          }
        }
        return null;
      };
      const a = snap(from), b = snap(to);
      if (!a) { self.postMessage({ id, error: 'The start is not near a tile you can walk on.' }); return; }
      if (!b) { self.postMessage({ id, error: 'The destination is not near a tile you can walk on.' }); return; }
      const t0 = performance.now();
      const open = new Set(doors.open);
      const unit = ([num, x, y, z]) => (num ? `k${num}` : `p${x},${y},${z}`);
      const locked = (k) => { const d = !doors.all && W.lockedAt.get(k); return !!d && !open.has(unit(d)); };
      const fast = route(a, b, speed, level, false, locked);
      if (fast.error) {
        // Would it go with all doors open? Then tell which locked doors are in the way.
        let lockedOnPath;
        if (!doors.all) {
          const any = route(a, b, speed, level, false, () => false);
          if (any.path) {
            const seen = new Map();
            for (const [x, y, z] of any.path) {
              const d = W.lockedAt.get(key(x, y, z));
              if (d && locked(key(x, y, z)) && !seen.has(unit(d))) seen.set(unit(d), { key: d[0], p: d.slice(1) });
            }
            lockedOnPath = [...seen.values()];
          }
        }
        self.postMessage({ id, ...fast, locked: lockedOnPath, ms: Math.round(performance.now() - t0) });
        return;
      }
      const routes = [{ name: 'Fastest', ...fast }];
      // The cheapest route, when the fastest one costs gold and there may be a cheaper way.
      if (fast.gold > 0) {
        const cheap = route(a, b, speed, level, true, locked);
        if (cheap.path && cheap.gold < fast.gold) routes.push({ name: 'Cheapest', ...cheap });
      }
      self.postMessage({ id, routes, ms: Math.round(performance.now() - t0) });
    } catch (err) {
      self.postMessage({ id, error: String(err.message || err) });
    }
  };
}

// The main-thread side: one worker, requests answered by id.
export function createRouter(base) {
  const src = `(${routerMain.toString()})()`;
  const worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
  const pending = new Map();
  let next = 1;
  worker.onmessage = (e) => { const p = pending.get(e.data.id); if (p) { pending.delete(e.data.id); p(e.data); } };
  const ask = (msg) => new Promise((resolve) => { const id = next++; pending.set(id, resolve); worker.postMessage({ ...msg, id }); });
  const absBase = new URL(base, window.location.href).href.replace(/\/$/, '');
  const ready = ask({ type: 'load', base: absBase });
  return {
    // from, to: [x, y, z]; speed: the character's speed (client value); level: for the Oracle.
    // Resolves to { routes: [{ name: 'Fastest' | 'Cheapest', path, steps, gold }] } or { error }.
    // doors: { all, open: [unit] } (see the map's doorUnit). Also { error, locked: [{ key, p }] } when locked doors are in the way.
    route: async (from, to, speed, level, doors) => { await ready; return ask({ type: 'route', from, to, speed, level, doors }); },
    terminate: () => worker.terminate(),
  };
}
