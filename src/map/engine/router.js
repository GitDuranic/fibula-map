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
// - a climb or drop (slice 11): exani hur up/down from the tile you stand on, or walking off / into open air with
//   3 parcels; one step time on the tile you land on, plus CLIMB_MS for saying the spell or putting the parcels
//   down. Only when the character has them (route option "climb": bit 1 = the spell, bit 2 = parcels);
// - an NPC passage (boat, carpet, the Oracle): from any tile within 3 of the NPC on its floor (TVP npcbehavior.cpp,
//   areInRange<3, 3>), PASSAGE_MS for talking, then you're at the destination. It costs its price in gold.
// The tile of a floor change is kept in the path as its own entry, without time of its own (5a): 'onto' for
// stairs, holes and forcefields (you step onto it, then you're on the other floor), 'use' for ladders, grates,
// rope spots and stone piles used from the tile next to them. So the route shows which hole or ladder to take.
// Each tile on the path carries what sets its time (ground speeds, or the passage), so the time can be worked out
// again for another speed without searching again (routeTime).
//
// Two routes are searched: the fastest first (shown at once), then, when it costs gold, the cheapest (least gold,
// then fastest), added when it's cheaper. A newer request stops a cheapest search that's still running.
// Locked doors block unless unlocked (by key number, or the door itself when its number isn't known) or all opened.
// When that leaves no route, the search is done again with all doors open, to tell which locked doors are in the way.

export const PASSAGE_MS = 2000; // talking to the NPC (user: players type the combo in about 2 seconds)
export const TALK_RANGE = 3;
// Climbing (slice 11): the extra time of one climb or drop, on top of the step onto the landing tile. Rough guesses,
// to tune with the user: saying "exani hur up", or putting 3 parcels down (or throwing them down first).
export const CLIMB_MS = { levitate: 1000, parcels: 2000 };
export const LEVITATE_MANA = 50; // TVP levitate.lua
export const CLIMB_SPELL = 1, CLIMB_PARCELS = 2; // the route option "climb", and the ways bits in links.json

// The server's step time: 50 * ceil(1000 * ground / speed / 50) ms, 3x for a diagonal step.
export function stepTime(ground, speed, diagonal = false) {
  const t = 50 * Math.floor((50 + Math.floor(1000 * ground / speed) - 1) / 50);
  return diagonal ? 3 * t : t;
}

// The time of one path entry ([x, y, z, how, ground, ground2, passage]) for a speed.
// how: 'start' | 'walk' | 'diagonal' | 'npc' | 'onto' | 'use' | link kind.
function entryTime([, , , how, ground, ground2], speed) {
  if (how === 'start' || how === 'onto' || how === 'use') return 0; // the move is counted on the landing entry
  if (how === 'npc') return PASSAGE_MS;
  if (how === 'levitate' || how === 'parcels') return CLIMB_MS[how] + stepTime(ground, speed);
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
// [{ kind: 'walk', from, to, steps, floors (floor changes), teleports, levitate, parcels (climbs), time }
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
    if (!walk) legs.push((walk = { kind: 'walk', from: prev.slice(0, 3), to: null, steps: 0, floors: 0, teleports: 0, levitate: 0, parcels: 0, time: 0 }));
    walk.to = e.slice(0, 3);
    if (e[3] === 'onto' || e[3] === 'use') continue; // part of the next move
    walk.steps++;
    walk.time += entryTime(e, speed);
    if (e[3] === 'teleport') walk.teleports++;
    else if (e[3] === 'levitate' || e[3] === 'parcels') walk[e[3]]++;
    else if (e[2] !== prev[2]) walk.floors++;
  }
  return legs;
}

// Runs inside the worker. Must not use anything from outside this function.
//
// Speed (2026-11-14, see the design doc): every tile is a plain number (its place in walk.bin: chunk order * 1024 +
// place in the chunk), and tiles that matter to the search (walkable, or the start or end of a link) also get a
// compact number, so the search keeps its bookkeeping in typed arrays instead of Maps and small arrays. Links and
// locked doors are flagged per tile, so a neighbour without one costs no lookup. The estimate is worked out once
// per tile per search. At load, the areas connected at all (all doors open) are worked out, so "not connected" is
// answered at once instead of after searching the whole map twice.
export function routerMain() {
  let W = null;
  const C = 32;
  const PASSAGE_MS = 2000, TALK_RANGE = 3; // as outside (this function can't see them)
  const CLIMB_MS = { levitate: 1000, parcels: 2000 }, CLIMB_SPELL = 1, CLIMB_PARCELS = 2;
  const GOLD = 1e9; // cheapest route: 1 gold weighs more than any walking time (ms)
  // What a path entry says it is ('how'), by code.
  const HOW = ['start', 'walk', 'diagonal', 'step', 'teleport', 'ladder', 'grate', 'rope', 'dig', 'well', 'npc', 'levitate', 'parcels'];
  const H = Object.fromEntries(HOW.map((s, i) => [s, i]));
  const VIA = [null, 'onto', 'use'];
  const popcnt = (v) => { v -= (v >>> 1) & 0x55555555; v = (v & 0x33333333) + ((v >>> 2) & 0x33333333); return (((v + (v >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24; };

  // Tile (x, y, z) -> its place in walk.bin, or -1 when its chunk has no walk data.
  const tileIndex = (x, y, z) => {
    const cx = (x >> 5) - W.cx0, cy = (y >> 5) - W.cy0;
    if (z < 0 || z > 15 || cx < 0 || cx >= W.cw || cy < 0 || cy >= W.ch) return -1;
    const ord = W.chunkOrd[(z * W.cw + cx) * W.ch + cy];
    return ord < 0 ? -1 : ord * 1024 + ((y & 31) << 5) + (x & 31);
  };
  const speedAt = (x, y, z) => { const t = tileIndex(x, y, z); return t < 0 ? 0 : W.bytes[t] * 2; };
  // Tile -> compact number (-1: not a tile the search uses).
  const cid = (t) => {
    const w = t >>> 5, b = 1 << (t & 31);
    return W.mask[w] & b ? W.rank[w] + popcnt(W.mask[w] & (b - 1)) : -1;
  };

  async function load(base) {
    const [bin, linksJson, map, doors] = await Promise.all([
      fetch(`${base}/walk.bin`).then((r) => r.arrayBuffer()),
      fetch(`${base}/links.json`).then((r) => r.json()),
      fetch(`${base}/map.json`).then((r) => r.json()),
      fetch(`${base}/doors.json`).then((r) => r.json()).catch(() => []), // older data: no locked doors
    ]);
    // Chunks: a table (floor, chunk x, chunk y) -> place in walk.bin order.
    let cx0 = Infinity, cy0 = Infinity, cx1 = -Infinity, cy1 = -Infinity;
    for (let z = 0; z < 16; z++) for (const [cx, cy] of map.chunks[z] || []) { cx0 = Math.min(cx0, cx); cy0 = Math.min(cy0, cy); cx1 = Math.max(cx1, cx); cy1 = Math.max(cy1, cy); }
    const cw = cx1 - cx0 + 1, ch = cy1 - cy0 + 1, chunkOrd = new Int32Array(16 * cw * ch).fill(-1);
    const ordX = [], ordY = [], ordZ = [];
    for (let z = 0; z < 16; z++) for (const [cx, cy] of map.chunks[z] || []) { chunkOrd[(z * cw + cx - cx0) * ch + cy - cy0] = ordX.length; ordX.push(cx); ordY.push(cy); ordZ.push(z); }
    const bytes = new Uint8Array(bin), N = bytes.length;
    W = { bytes, cx0, cy0, cw, ch, chunkOrd };
    const coordsOf = (t) => { const o = t >> 10, i = t & 1023; return [ordX[o] * C + (i & 31), ordY[o] * C + (i >> 5), ordZ[o]]; };

    // Links by tile; flags: 1 = stepped onto (stairs, hole, forcefield), 2 = used (ladder, grate, ...), 4 = locked door,
    // 8 = a climb or drop starts here (exani hur, parcels).
    const flags = new Uint8Array(N), stepLinks = new Map(), useLinks = new Map(), climbLinks = new Map();
    const words = (N + 31) >>> 5, mask = new Uint32Array(words);
    const mark = (t) => { mask[t >>> 5] |= 1 << (t & 31); };
    for (let t = 0; t < N; t++) if (bytes[t]) mark(t);
    const teleports = [];
    let skipped = 0;
    for (const [x, y, z, tx, ty, tz, k] of linksJson.links) {
      const kind = linksJson.kinds[k], s = tileIndex(x, y, z), d = tileIndex(tx, ty, tz);
      if (s < 0 || d < 0) { skipped++; continue; }
      mark(s); mark(d);
      if (kind === 'teleport') teleports.push([x, y, tx, ty]);
      if (kind === 'step' || kind === 'teleport') { stepLinks.set(s, [d, H[kind]]); flags[s] |= 1; }
      else {
        if (!useLinks.has(s)) useLinks.set(s, []);
        useLinks.get(s).push([d, H[kind]]);
        flags[s] |= 2;
      }
    }
    // Climbs and drops, worked out by the converter: [x, y, z, tx, ty, tz, ways] (ways: 1 spell, 2 parcels).
    for (const [x, y, z, tx, ty, tz, ways] of linksJson.climbs || []) {
      const s = tileIndex(x, y, z), d = tileIndex(tx, ty, tz);
      if (s < 0 || d < 0) { skipped++; continue; }
      mark(s); mark(d);
      if (!climbLinks.has(s)) climbLinks.set(s, []);
      climbLinks.get(s).push([d, ways]);
      flags[s] |= 8;
    }
    // NPC passages: [NPC, destination, price, min level, x, y, z, tx, ty, tz] (+ its destination tile).
    const passages = [];
    for (const p of linksJson.passages || []) {
      const d = tileIndex(p[7], p[8], p[9]);
      if (d < 0) { skipped++; continue; }
      mark(d);
      passages.push({ p, d });
    }
    // Locked doors by tile: [key number (0 = unknown), x, y, z].
    const lockedAt = new Map();
    for (const [x, y, z, , , num] of doors) { const t = tileIndex(x, y, z); if (t >= 0) { lockedAt.set(t, [num, x, y, z]); flags[t] |= 4; } }
    // Compact numbers: the rank of each marked tile.
    const rank = new Uint32Array(words);
    let M = 0;
    for (let w = 0; w < words; w++) { rank[w] = M; M += popcnt(mask[w]); }
    Object.assign(W, { flags, stepLinks, useLinks, climbLinks, mask, rank, M, teleports, passages, lockedAt });
    const X = new Uint16Array(M), Y = new Uint16Array(M), Z = new Uint8Array(M);
    for (let w = 0; w < words; w++) {
      let m = mask[w];
      while (m) {
        const b = 31 - Math.clz32(m & -m), t = w * 32 + b, c = cid(t), [x, y, z] = coordsOf(t);
        X[c] = x; Y[c] = y; Z[c] = z;
        m &= m - 1;
      }
    }
    // The search's bookkeeping, reused by every search (`stamp` says which search a tile's numbers belong to).
    Object.assign(W, {
      X, Y, Z, gen: 0, stamp: new Uint32Array(M), g: new Float64Array(M), hc: new Float32Array(M),
      prev: new Int32Array(M), how: new Uint8Array(M), via: new Int32Array(M), viaHow: new Uint8Array(M), pas: new Int16Array(M),
    });

    // Walking areas (union-find): tiles you can walk between on one floor, all doors open. Stairs, holes and
    // forcefields themselves don't join areas (stepping onto one takes you away). Then the one-way connections
    // between areas: floor changes and passages (with their level). reachable() searches that small graph, so a
    // route that can't exist is answered at once instead of after searching the whole map twice.
    const parent = new Int32Array(M);
    for (let i = 0; i < M; i++) parent[i] = i;
    const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
    const standable = (t) => t >= 0 && bytes[t] > 0 && !(flags[t] & 1);
    for (let c = 0; c < M; c++) {
      const x = X[c], y = Y[c], z = Z[c];
      if (!standable(tileIndex(x, y, z))) continue;
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
        const t = tileIndex(x + dx, y + dy, z);
        if (standable(t)) { const a = find(c), b = find(cid(t)); if (a !== b) parent[a] = b; }
      }
    }
    const area = new Int32Array(M);
    for (let c = 0; c < M; c++) area[c] = find(c);
    const edges = new Map(); // area -> [[area, min level, climb ways (0: anyone)]]
    const edge = (from, to, lvl, ways = 0) => { if (from === to) return; if (!edges.has(from)) edges.set(from, []); edges.get(from).push([to, lvl, ways]); };
    // From the tiles a link is taken from (its neighbours, and for a use link the tile itself) to its destination.
    const linkEdges = (s, d, self) => {
      const cs = cid(s);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!self && !dx && !dy) continue;
        const t = tileIndex(X[cs] + dx, Y[cs] + dy, Z[cs]);
        if (standable(t)) edge(area[cid(t)], area[cid(d)], 0);
      }
    };
    for (const [s, [d]] of stepLinks) linkEdges(s, d, false);
    for (const [s, list] of useLinks) for (const [d] of list) linkEdges(s, d, true);
    for (const { p, d } of passages) {
      for (let dy = -TALK_RANGE; dy <= TALK_RANGE; dy++) for (let dx = -TALK_RANGE; dx <= TALK_RANGE; dx++) {
        const t = tileIndex(p[4] + dx, p[5] + dy, p[6]);
        if (standable(t)) edge(area[cid(t)], area[cid(d)], p[3]);
      }
    }
    for (const [s, list] of climbLinks) for (const [d, ways] of list) edge(area[cid(s)], area[cid(d)], 0, ways);
    W.area = area;
    // a, b: compact tiles. Starting on stairs or a hole, you walk off it into the areas around it.
    W.reachable = (a, b, level, climb) => {
      const to = area[b], seen = new Set([area[a]]);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const t = tileIndex(X[a] + dx, Y[a] + dy, Z[a]);
        if (standable(t)) seen.add(area[cid(t)]);
      }
      const todo = [...seen];
      while (todo.length) {
        const cur = todo.pop();
        if (cur === to) return true;
        for (const [next, lvl, ways] of edges.get(cur) || []) if (lvl <= level && (!ways || ways & climb) && !seen.has(next)) { seen.add(next); todo.push(next); }
      }
      return false;
    };
    W.skipped = skipped;
  }

  // A binary min-heap of (priority, compact tile), in typed arrays that grow as needed.
  function Heap() {
    let pr = new Float64Array(1 << 16), id = new Int32Array(1 << 16), n = 0;
    return {
      get size() { return n; },
      push(p, k) {
        if (n === pr.length) { const p2 = new Float64Array(n * 2), i2 = new Int32Array(n * 2); p2.set(pr); i2.set(id); pr = p2; id = i2; }
        let i = n++;
        while (i > 0) { const j = (i - 1) >> 1; if (pr[j] <= p) break; pr[i] = pr[j]; id[i] = id[j]; i = j; }
        pr[i] = p; id[i] = k;
      },
      // Removes the smallest; its priority and tile are then in .p and .k.
      pop() {
        this.p = pr[0]; this.k = id[0];
        const lp = pr[--n], lk = id[n];
        let i = 0;
        for (;;) {
          const l = 2 * i + 1;
          if (l >= n) break;
          const m = l + 1 < n && pr[l + 1] < pr[l] ? l + 1 : l;
          if (pr[m] >= lp) break;
          pr[i] = pr[m]; id[i] = id[m]; i = m;
        }
        pr[i] = lp; id[i] = lk;
      },
    };
  }

  // A* from tile `from` to tile `to` ([x, y, z], walkable) for a character with `speed` (client speed value) and
  // `level`. climb: what the character can climb with (bits CLIMB_SPELL, CLIMB_PARCELS). cheap: least gold first, then fastest. Returns { path, steps, gold, expanded } or { error }.
  // locked(tile): is there a locked door here that is still locked? (Only asked for tiles flagged as locked doors.)
  // yieldEvery: the cheapest search lets other messages in now and then (see onmessage); it then stops when it
  // has been replaced (cancelled() is true) and returns { cancelled: true }.
  async function route(from, to, speed, level, climb, cheap, locked, cancelled) {
    const { bytes, flags, stepLinks, useLinks, climbLinks, X, Y, Z, stamp, g, hc, prev, how, via, viaHow, pas } = W;
    const gen = ++W.gen;
    // Step times by ground speed / 2 (walk.bin's unit): 50 * ceil(1000 * ground / speed / 50).
    const st = new Float64Array(256);
    for (let i = 0; i < 256; i++) st[i] = 50 * Math.floor((50 + Math.floor(1000 * i * 2 / speed) - 1) / 50);
    const stepTime = (ground) => st[ground >> 1];
    const minStep = stepTime(90); // the fastest ground: keeps the estimate below the real time
    const toT = tileIndex(...to), goal = cid(toT);
    // Passages this character can take, by the tiles they can be taken from (within talk range, same floor).
    const passages = W.passages.filter(({ p }) => p[3] <= level);
    const passagesFrom = new Map();
    for (const ps of passages) {
      const p = ps.p;
      for (let dy = -TALK_RANGE; dy <= TALK_RANGE; dy++) for (let dx = -TALK_RANGE; dx <= TALK_RANGE; dx++) {
        const t = tileIndex(p[4] + dx, p[5] + dy, p[6]);
        if (t < 0) continue;
        if (!passagesFrom.has(t)) passagesFrom.set(t, []);
        passagesFrom.get(t).push(ps);
      }
    }
    // The estimate: walking straight there, or walking to the nearest jump (passage or forcefield) and walking on
    // from the jump destination closest to the goal. Never more than the real time: a diagonal step costs 3
    // straight ones, so walking takes at least the Manhattan distance in steps, and jumps can cover any distance.
    // For the cheapest route, passages that cost gold are left out: any route using one costs more (GOLD) than
    // walking anywhere.
    const jumps = [
      ...passages.filter(({ p }) => !cheap || !p[2]).map(({ p }) => [p[4], p[5], TALK_RANGE, p[7], p[8]]),
      ...W.teleports.map(([x, y, tx, ty]) => [x, y, 0, tx, ty]),
    ];
    const tx = to[0], ty = to[1];
    const toGoal = jumps.reduce((m, j) => Math.min(m, Math.abs(j[3] - tx) + Math.abs(j[4] - ty)), Infinity);
    const nj = jumps.length, jx = new Int32Array(nj), jy = new Int32Array(nj), jr = new Int32Array(nj);
    jumps.forEach((j, i) => { jx[i] = j[0]; jy[i] = j[1]; jr[i] = j[2]; });
    const h = (x, y) => {
      const direct = Math.abs(x - tx) + Math.abs(y - ty);
      if (direct <= toGoal) return direct * minStep;
      let reach = direct - toGoal;
      for (let i = 0; i < nj && reach > 0; i++) {
        const d = Math.max(0, Math.abs(x - jx[i]) - jr[i]) + Math.max(0, Math.abs(y - jy[i]) - jr[i]);
        if (d < reach) reach = d;
      }
      return (reach + toGoal) * minStep;
    };
    const heap = Heap();
    // via: the floor change's own tile (stairs, hole, ladder, ...), kept in the path; vh: 1 'onto' | 2 'use'.
    const relax = (c, cost, from, hw, v, vh, ps) => {
      if (stamp[c] === gen) { if (g[c] <= cost) return; }
      else { stamp[c] = gen; hc[c] = h(X[c], Y[c]); }
      g[c] = cost; prev[c] = from; how[c] = hw; via[c] = v; viaHow[c] = vh; pas[c] = ps;
      heap.push(cost + hc[c], c);
    };
    const groundAt = (t) => (t >= 0 && bytes[t] * 2) || 100; // a landing tile without walk data: plain ground
    const start = cid(tileIndex(...from));
    relax(start, 0, -1, H.start, -1, 0, -1);
    let expanded = 0;
    while (heap.size) {
      heap.pop();
      const k = heap.k, cost = g[k];
      if (heap.p > cost + hc[k] + 1e-6) continue; // an outdated entry
      if (k === goal) return { ...pathTo(k, passages), expanded };
      if (++expanded > 6000000) return { error: 'No route found (searched too far).' };
      if (cancelled && (expanded & 0xffff) === 0) {
        await new Promise((r) => setTimeout(r, 0));
        if (cancelled()) return { cancelled: true };
        if (stamp[k] !== gen) return { cancelled: true }; // (another search used the bookkeeping)
      }
      const x = X[k], y = Y[k], z = Z[k], t0 = tileIndex(x, y, z);
      // Away from the chunk's edge, the neighbours are next to it in walk.bin too.
      const inner = (x & 31) > 0 && (x & 31) < 31 && (y & 31) > 0 && (y & 31) < 31;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nt = inner ? t0 + (dy << 5) + dx : tileIndex(x + dx, y + dy, z);
        if (nt < 0) continue;
        const f = flags[nt], diag = dx && dy;
        // Ladders, grates, rope spots, loose stone piles on this tile or next to it.
        if (f & 2) {
          for (const [d, kind] of useLinks.get(nt)) {
            const extra = kind === H.dig ? stepTime(groundAt(nt)) : 0; // dig the pile, step into the hole, land below
            relax(cid(d), cost + extra + stepTime(groundAt(d)), k, kind, cid(nt), 2, -1);
          }
        }
        if (!dx && !dy) continue;
        if (f & 1) {
          const [d, kind] = stepLinks.get(nt);
          if (kind === H.teleport) {
            // One step onto the forcefield (its own ground), and you're at its destination.
            const t1 = stepTime(bytes[nt] * 2 || 100);
            relax(cid(d), cost + (diag ? 3 * t1 : t1), k, kind, cid(nt), 1, -1);
          } else {
            // Stairs, ramp or hole: stepping on it is one move to the other floor.
            relax(cid(d), cost + stepTime(groundAt(d)), k, kind, cid(nt), 1, -1);
          }
          continue;
        }
        const sp = bytes[nt];
        if (sp && !((f & 4) && locked(nt))) { const t1 = st[sp]; relax(cid(nt), cost + (diag ? 3 * t1 : t1), k, diag ? H.diagonal : H.walk, -1, 0, -1); }
      }
      // Climbs and drops from this tile: the spell when the character has it (faster), else parcels.
      if (climb && flags[t0] & 8) {
        for (const [d, ways] of climbLinks.get(t0)) {
          const w = ways & climb;
          if (!w) continue;
          const kind = w & CLIMB_SPELL ? H.levitate : H.parcels;
          relax(cid(d), cost + CLIMB_MS[HOW[kind]] + stepTime(groundAt(d)), k, kind, -1, 0, -1);
        }
      }
      // Boats, carpets and the Oracle: talk, pay, arrive.
      const here = passagesFrom.get(t0);
      if (here) for (const ps of here) relax(cid(ps.d), cost + PASSAGE_MS + (cheap ? ps.p[2] * GOLD : 0), k, H.npc, -1, 0, passages.indexOf(ps));
    }
    return { error: 'No route found: these two places are not connected.' };
  }

  // The path to compact tile k: [[x, y, z, how, ground, ground2, passage]], start first (see routeTime).
  function pathTo(k, passages) {
    const { X, Y, Z, prev, how, via, viaHow, pas, bytes } = W;
    const groundAt = (c) => bytes[tileIndex(X[c], Y[c], Z[c])] * 2 || 100;
    const path = [];
    let gold = 0;
    for (let c = k; c >= 0; c = prev[c]) {
      const hw = how[c], p = pas[c] >= 0 ? passages[pas[c]].p : null;
      if (hw === H.start) { path.push([X[c], Y[c], Z[c], 'start']); break; }
      if (p) gold += p[2];
      let ground = 0, ground2 = 0;
      if (hw === H.walk || hw === H.diagonal || hw === H.step) ground = groundAt(c);
      else if (hw === H.teleport) ground = groundAt(via[c]);
      else if (hw === H.dig) { ground = groundAt(via[c]); ground2 = groundAt(c); }
      else if (hw !== H.npc) ground = groundAt(c); // ladder, grate, rope, well
      path.push([X[c], Y[c], Z[c], HOW[hw], ground, ground2, p]);
      // The floor change's tile, between the tile before and where you land (unless you stand on it already).
      if (via[c] >= 0 && via[c] !== prev[c]) path.push([X[via[c]], Y[via[c]], Z[via[c]], VIA[viaHow[c]]]);
    }
    path.reverse();
    return { path, steps: path.filter((e) => !['start', 'npc', 'onto', 'use'].includes(e[3])).length, gold };
  }

  // Every message replaces the cheapest search that may be running (it stops at its next pause).
  let current = 0;
  self.onmessage = async (e) => {
    const { id, type, base, from, to, speed, level, climb = 0, doors = { all: false, open: [] } } = e.data;
    const mine = ++current;
    try {
      if (type === 'load') { await load(base); self.postMessage({ id, ok: true }); return; }
      if (type === 'cancel') { self.postMessage({ id, cancelled: true }); return; }
      if (!W) throw new Error('Walk data not loaded');
      // A spot you can't stand on (a depot locker, an NPC behind its counter, a wall): the nearest walkable tile
      // on the same floor, within 3 tiles. Not a hole, stairs or forcefield either (13j: quest steps sit on holes):
      // you can't end up standing there, so the route goes to the tile next to it.
      const snap = ([x, y, z]) => {
        for (let r = 0; r <= 3; r++) {
          for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
            const t = tileIndex(x + dx, y + dy, z);
            if (Math.max(Math.abs(dx), Math.abs(dy)) === r && speedAt(x + dx, y + dy, z) && !(W.flags[t] & 1)) return [x + dx, y + dy, z];
          }
        }
        return null;
      };
      const a = snap(from), b = snap(to);
      if (!a) { self.postMessage({ id, error: 'The start is not near a tile you can walk on.' }); return; }
      if (!b) { self.postMessage({ id, error: 'The destination is not near a tile you can walk on.' }); return; }
      const t0 = performance.now();
      const open = new Set(doors.open), free = new Set(doors.free || []); // free: tiles editors marked passable (14a)
      const unit = ([num, x, y, z]) => (num ? `k${num}` : `p${x},${y},${z}`);
      const locked = (t) => { const d = !doors.all && W.lockedAt.get(t); return !!d && !open.has(unit(d)) && !free.has(`${d[1]},${d[2]},${d[3]}`); };
      if (type === 'cheapest') {
        // Least gold, then fastest. Asked after the fastest route is shown; lets other messages in now and then.
        const cheap = await route(a, b, speed, level, climb, true, locked, () => current !== mine);
        self.postMessage({ id, ...cheap, ms: Math.round(performance.now() - t0) });
        return;
      }
      // Can't be reached even with all doors open: no search needed.
      if (!W.reachable(cid(tileIndex(...a)), cid(tileIndex(...b)), level, climb)) {
        self.postMessage({ id, error: 'No route found: these two places are not connected.', ms: Math.round(performance.now() - t0) });
        return;
      }
      const fast = await route(a, b, speed, level, climb, false, locked);
      if (fast.error) {
        // Would it go with all doors open? Then tell which locked doors are in the way.
        let lockedOnPath;
        if (!doors.all) {
          const any = await route(a, b, speed, level, climb, false, () => false);
          if (any.path) {
            const seen = new Map();
            for (const [x, y, z] of any.path) {
              const t = tileIndex(x, y, z), d = W.lockedAt.get(t);
              if (d && locked(t) && !seen.has(unit(d))) seen.set(unit(d), { key: d[0], p: d.slice(1) });
            }
            lockedOnPath = [...seen.values()];
          }
        }
        self.postMessage({ id, ...fast, locked: lockedOnPath, ms: Math.round(performance.now() - t0) });
        return;
      }
      // cheaper: the fastest route costs gold, so a cheaper one may exist (ask with type 'cheapest').
      self.postMessage({ id, routes: [{ name: 'Fastest', ...fast }], cheaper: fast.gold > 0, ms: Math.round(performance.now() - t0) });
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
    // The fastest route. from, to: [x, y, z]; speed: the character's speed (client value); level: for the Oracle.
    // doors: { all, open: [unit], free: ['x,y,z'] } (see the map's doorUnit; free: tiles editors marked passable, 14a). climb: CLIMB_SPELL | CLIMB_PARCELS, what the character can climb with.
    // Resolves to { routes: [{ name: 'Fastest', path, steps, gold }], cheaper } or { error }, also with
    // locked: [{ key, p }] when locked doors are in the way. cheaper: ask cheapest() for a route with less gold.
    route: async (from, to, speed, level, doors, climb = 0) => { await ready; return ask({ type: 'route', from, to, speed, level, doors, climb }); },
    // The cheapest route (least gold, then fastest): { path, steps, gold } or { error }, or { cancelled } when a
    // newer request (or cancel()) replaced it.
    cheapest: async (from, to, speed, level, doors, climb = 0) => { await ready; return ask({ type: 'cheapest', from, to, speed, level, doors, climb }); },
    cancel: () => { ask({ type: 'cancel' }); },
    terminate: () => worker.terminate(),
  };
}
