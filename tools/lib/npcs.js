// NPCs for the map: 7.1 positions (spawn file) + names, outfits, trade and travel from the TVP NPC files
// (7.6 stand-ins until Ryndean's 7.1 NPC files arrive; same format).
import fs from 'node:fs';
import path from 'node:path';
import { spriteIndex } from './dat.js';

// ---------- outfit colours: the client's 133-colour HSI palette (src/map/engine/outfit.js, shared with the map) ----------
import { outfitColor } from '../../src/map/engine/outfit.js';
export { outfitColor };

// Draws a creature outfit standing still, facing `dir` (0 north, 1 east, 2 south, 3 west), coloured by the
// outfit's colour mask (layer 2: yellow = head, red = body, green = legs, blue = feet).
// Returns { width, height, data } (RGBA), anchored like items: the bottom-right 32x32 cell is the tile.
export function renderOutfit(spr, t, dir, colors) {
  const W = t.width * 32, H = t.height * 32, img = new Uint8Array(W * H * 4);
  const [head, body, legs, feet] = colors.map(outfitColor);
  const px = Math.min(dir, t.patternX - 1);
  for (let h = 0; h < t.height; h++) for (let w = 0; w < t.width; w++) {
    const base = spr.get(t.sprites[spriteIndex(t, w, h, 0, px, 0, 0, 0)]);
    if (!base) continue;
    const mask = t.layers > 1 ? spr.get(t.sprites[spriteIndex(t, w, h, 1, px, 0, 0, 0)]) : null;
    const ox = (t.width - 1 - w) * 32, oy = (t.height - 1 - h) * 32;
    for (let p = 0; p < 1024; p++) {
      if (!base[p * 4 + 3]) continue;
      let c = null;
      if (mask && mask[p * 4 + 3]) {
        const [r, g, b] = [mask[p * 4], mask[p * 4 + 1], mask[p * 4 + 2]];
        if (r && g && !b) c = head; else if (r && !g && !b) c = body; else if (!r && g && !b) c = legs; else if (!r && !g && b) c = feet;
      }
      const d = ((oy + (p >> 5)) * W + ox + (p & 31)) * 4;
      for (let k = 0; k < 3; k++) img[d + k] = c ? Math.round(base[p * 4 + k] * c[k] / 255) : base[p * 4 + k];
      img[d + 3] = 255;
    }
  }
  return { width: W, height: H, data: img };
}

// ---------- behaviour scripts ----------
const words = (left) => [...left.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

// Trade and travel offers in a .npc script.
// sells: the NPC sells to you; buys: the NPC buys from you. Each { sid, data, price } (price per piece).
// travel: { name, price, to: [x, y, z] }.
export function parseBehaviour(text) {
  const sells = new Map(), buys = new Map(), topics = new Map(), travel = [];
  const lines = text.split(/\r?\n/).filter((l) => !/^\s*#/.test(l) && l.includes('->'));
  for (const line of lines) {
    const [left, right] = line.split('->');
    if (/^\s*Topic=|QuestValue|^\s*"yes"/.test(left)) continue;
    const type = /Type=(\d+)/.exec(right), price = /Price=(\d+)/.exec(right);
    const amount = /Amount=([^,\s]+)/.exec(right)?.[1];
    if (type && price) {
      if (amount && amount !== '1' && amount !== '%1') continue; // packs (e.g. sixpacks of worms)
      const w = words(left), data = /Data=(\d+)/.exec(right);
      const offer = { sid: +type[1], data: data ? +data[1] : null, price: +price[1] };
      const into = w[0] === 'sell' ? buys : sells;
      const k = `${offer.sid}:${offer.data}`;
      if (!into.has(k)) into.set(k, offer);
      continue;
    }
    // A passage offer: a keyword with a price that sets a topic; the topic's "yes" line teleports.
    const topic = /Topic=(\d+)/.exec(right);
    if (price && topic && !type) {
      const w = words(left).filter((x) => x !== 'yes');
      if (w.length) topics.set(+topic[1], { name: titleCase(w.join(' ')), price: +price[1] });
    }
  }
  for (const line of lines) {
    const m = /^\s*Topic=(\d+),"yes"/.exec(line), tp = /Teleport\((\d+),(\d+),(\d+)\)/.exec(line);
    if (!m || !tp || !topics.has(+m[1])) continue;
    const t = topics.get(+m[1]);
    if (!travel.some((x) => x.name === t.name)) travel.push({ ...t, to: [+tp[1], +tp[2], +tp[3]] });
  }
  return { sells: [...sells.values()], buys: [...buys.values()], travel };
}

// The Oracle's one-way trips (Rookgaard to the mainland): the town is picked by a Data value on topic 1, the
// "yes" on topic 3 with that Data teleports. Returns [{ name, price: 0, level, to }] (level from its greeting).
export function parseOracle(text) {
  const level = +(/Level>=(\d+)/.exec(text)?.[1] || 0);
  const towns = new Map();
  for (const m of text.matchAll(/Topic=1,"([^"]+)"[^\n]*->\s*Data=(\d+)/g)) towns.set(+m[2], titleCase(m[1]));
  const out = [];
  for (const m of text.matchAll(/Topic=3,Data=(\d+),"yes"[^\n]*Teleport\((\d+),(\d+),(\d+)\)/g)) {
    if (towns.has(+m[1])) out.push({ name: towns.get(+m[1]), price: 0, level, to: [+m[2], +m[3], +m[4]] });
  }
  return out;
}

// ---------- all NPCs ----------
// Returns [{ name, x, y, z, dir, look, sells, buys, travel, oracle, behaviour (script path) }] (offers in server ids).
export function loadNpcs({ spawnFile, npcDir, log = () => {} }) {
  const spawn = fs.readFileSync(spawnFile, 'latin1');
  const out = [], missing = [];
  for (const m of spawn.matchAll(/<tvpspawn\s+([^>]*?)\/>/g)) {
    const a = Object.fromEntries([...m[1].matchAll(/(\w+)="([^"]*)"/g)].map((x) => [x[1], x[2]]));
    if (!a.npcname) continue;
    const npc = { name: titleCase(a.npcname), x: +a.centerx, y: +a.centery, z: +a.centerz, dir: +(a.direction ?? 2), look: null, sells: [], buys: [], travel: [], oracle: [] };
    const xmlFile = path.join(npcDir, `${a.npcname}.xml`);
    if (fs.existsSync(xmlFile)) {
      const xml = fs.readFileSync(xmlFile, 'latin1');
      const name = /<npc\s[^>]*name="([^"]*)"/.exec(xml)?.[1];
      if (name) npc.name = name;
      const look = /<look\s+([^>]*?)\/>/.exec(xml);
      if (look) npc.look = Object.fromEntries([...look[1].matchAll(/(\w+)="(\d+)"/g)].map((x) => [x[1], +x[2]]));
      const behaviour = /behavior="([^"]*)"/.exec(xml)?.[1];
      const bFile = behaviour && path.join(npcDir, 'behavior', behaviour);
      if (bFile && fs.existsSync(bFile)) {
        npc.behaviour = bFile; // its conversation is read by talk.js
        const text = fs.readFileSync(bFile, 'latin1');
        Object.assign(npc, parseBehaviour(text));
        npc.oracle = parseOracle(text); // the Oracle's one-way trips (empty for everyone else)
      }
    } else missing.push(a.npcname);
    out.push(npc);
  }
  if (missing.length) log(`NPCs without a TVP file (shown without trade/outfit): ${missing.join(', ')}`);
  return out;
}
