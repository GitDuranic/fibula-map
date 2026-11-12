// The route finder. It runs in a web worker (built from routerMain's source, so it works with any bundler:
// Vite here, webpack on Ryndean's site), loads the walk data itself and answers route requests.
//
// Moves (rules from the TVP server, see the design doc, slices 3a and 3c):
// - a step to one of 8 neighbours that can be walked on; the time is the server's step time on the tile stepped
//   onto: ceil to 50 ms of 1000 * ground speed / speed; a diagonal step takes 3 times as long;
// - stepping onto a stairs / ramp / hole tile ("step" link) takes you straight to its destination;
// - ladders, sewer grates, rope spots and loose stone piles ("use" links) are used from the tile itself or one of its
//   8 neighbours, with a fixed extra time.

// Runs inside the worker. Must not use anything from outside this function.
export function routerMain() {
  let W = null; // { bytes, offset: Map(chunkKey -> byte offset), stepLinks: Map(tileKey -> [to]), useLinks: Map(tileKey -> [[to, kind]]) }
  const C = 32;
  const key = (x, y, z) => (z * 65536 + y) * 65536 + x;
  const ck = (z, cx, cy) => (z * 4096 + cx) * 4096 + cy;
  const speedAt = (x, y, z) => {
    const cx = Math.floor(x / C), cy = Math.floor(y / C), o = W.offset.get(ck(z, cx, cy));
    return o === undefined ? 0 : W.bytes[o + (y - cy * C) * C + (x - cx * C)] * 2;
  };
  const USE_TIME = { ladder: 600, grate: 600, rope: 1000, dig: 1600 }; // ms: walking up to it, using it

  async function load(base) {
    const [bin, linksJson, map] = await Promise.all([
      fetch(`${base}/walk.bin`).then((r) => r.arrayBuffer()),
      fetch(`${base}/links.json`).then((r) => r.json()),
      fetch(`${base}/map.json`).then((r) => r.json()),
    ]);
    const offset = new Map();
    let i = 0;
    for (let z = 0; z < 16; z++) for (const [cx, cy] of map.chunks[z] || []) offset.set(ck(z, cx, cy), (i++) * C * C);
    const stepLinks = new Map(), useLinks = new Map();
    for (const [x, y, z, tx, ty, tz, k] of linksJson.links) {
      const kind = linksJson.kinds[k], to = [tx, ty, tz];
      if (kind === 'step') stepLinks.set(key(x, y, z), to);
      else {
        const kk = key(x, y, z);
        if (!useLinks.has(kk)) useLinks.set(kk, []);
        useLinks.get(kk).push([to, kind]);
      }
    }
    W = { bytes: new Uint8Array(bin), offset, stepLinks, useLinks };
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

  // A* from `from` to `to` ([x, y, z]) for a character with `speed` (client speed value).
  // Returns { path: [[x, y, z, how]], time (ms), steps } or { error }. how: 'walk' | 'diagonal' | link kind.
  function route(from, to, speed) {
    const stepTime = (ground, diagonal) => Math.ceil((1000 * ground / speed) / 50) * 50 * (diagonal ? 3 : 1);
    const minStep = stepTime(90, false); // the fastest ground: keeps the estimate below the real time
    const goal = key(...to);
    const h = (x, y, z) => Math.max(Math.abs(x - to[0]), Math.abs(y - to[1])) * minStep + (z === to[2] ? 0 : 0);
    const g = new Map(), came = new Map(), heap = Heap();
    const start = key(...from);
    g.set(start, 0);
    heap.push(h(...from), start);
    const coords = (k) => { const x = k % 65536, r = (k - x) / 65536, y = r % 65536; return [x, y, (r - y) / 65536]; };
    let expanded = 0;
    const relax = (k, cost, prev, how, x, y, z) => {
      const old = g.get(k);
      if (old !== undefined && old <= cost) return;
      g.set(k, cost);
      came.set(k, [prev, how]);
      heap.push(cost + h(x, y, z), k);
    };
    while (heap.size) {
      const [f, k] = heap.pop();
      const cost = g.get(k);
      const [x, y, z] = coords(k);
      if (f > cost + h(x, y, z) + 1e-6) continue; // an outdated entry
      if (k === goal) {
        const path = [];
        for (let c = k; c !== undefined;) { const [px, py, pz] = coords(c); const cf = came.get(c); path.push([px, py, pz, cf ? cf[1] : 'start']); c = cf?.[0]; }
        path.reverse();
        return { path, time: cost, steps: path.length - 1, expanded };
      }
      if (++expanded > 4000000) return { error: 'No route found (searched too far).' };
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = x + dx, ny = y + dy, diag = dx && dy, nk = key(nx, ny, z);
        const step = W.stepLinks.get(nk);
        const ground = speedAt(nx, ny, z);
        if (step) {
          // Stairs, ramp or hole: stepping on it takes you to the other floor.
          relax(key(...step), cost + stepTime(ground || 100, diag), k, 'step', ...step);
          continue;
        }
        if (ground) relax(nk, cost + stepTime(ground, diag), k, diag ? 'diagonal' : 'walk', nx, ny, z);
      }
      // Ladders, grates, rope spots, loose stone piles on this tile or next to it.
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        for (const [dest, kind] of W.useLinks.get(key(x + dx, y + dy, z)) || []) {
          relax(key(...dest), cost + USE_TIME[kind], k, kind, ...dest);
        }
      }
    }
    return { error: 'No route found: these two places are not connected by walking.' };
  }

  self.onmessage = async (e) => {
    const { id, type, base, from, to, speed } = e.data;
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
      const r = route(a, b, speed);
      self.postMessage({ id, ...r, ms: Math.round(performance.now() - t0) });
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
    // from, to: [x, y, z]; speed: the character's speed (client value). Resolves to { path, time, steps } or { error }.
    route: async (from, to, speed) => { await ready; return ask({ type: 'route', from, to, speed }); },
    terminate: () => worker.terminate(),
  };
}
