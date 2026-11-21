// The map's route finder (src/map/engine/router.js, routerMain) run in Node for the tools (slice 13j): the same
// code as the web worker, with its fetch reading public/map-data and its messages answered by id.
import fs from 'fs';
import path from 'path';
import { routerMain } from '../../src/map/engine/router.js';


export function nodeRouter(dir = 'public/map-data') {
  const pending = new Map();
  let next = 1;
  const self = { postMessage: (d) => { const p = pending.get(d.id); if (p) { pending.delete(d.id); p(d); } } };
  const read = (url) => {
    const file = path.join(dir, url.replace(/^local:\/*/, ''));
    if (!fs.existsSync(file)) return Promise.resolve({ ok: false, json: () => Promise.reject(new Error('missing')), arrayBuffer: () => Promise.reject(new Error('missing')) });
    const buf = fs.readFileSync(file);
    return Promise.resolve({ ok: true, json: async () => JSON.parse(buf.toString('utf8')), arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) });
  };
  // routerMain sets self.onmessage and uses fetch: both are given here instead of the worker's globals.
  new Function('self', 'fetch', `(${routerMain.toString()})()`)(self, read);
  const ask = (msg) => new Promise((resolve) => { const id = next++; pending.set(id, resolve); self.onmessage({ data: { ...msg, id } }); });
  const ready = ask({ type: 'load', base: 'local:' });
  return {
    ready,
    // The fastest route from -> to ([x, y, z]); all doors open, rope and shovel as on the map, level 100.
    route: async (from, to, { speed = 220, level = 100, climb = 0 } = {}) => { await ready; return ask({ type: 'route', from, to, speed, level, doors: { all: true, open: [] }, climb }); },
  };
}

// The floor changes and passages on a path: [{ p: the hole/ladder/stairs tile (for an NPC: where you talk), via: 'onto' | 'use',
// how: step, ladder, grate, rope, dig, teleport, npc, ..., to: where you land }]. A path marks a floor change with an
// entry [x, y, z, 'onto' | 'use'] before the landing entry [x, y, z, how, ...].
export function floorChanges(path) {
  const out = [];
  for (let i = 1; i < path.length; i++) {
    const e = path[i], next = path[i + 1];
    if (e[3] === 'onto' || e[3] === 'use') out.push({ p: e.slice(0, 3), via: e[3], how: next?.[3], to: next?.slice(0, 3) });
    else if ((e[3] === 'npc' || e[3] === 'teleport') && path[i - 1][3] !== 'onto') out.push({ p: path[i - 1].slice(0, 3), how: e[3], to: e.slice(0, 3) });
  }
  return out;
}
