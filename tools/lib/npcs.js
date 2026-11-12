// NPCs for the map: 7.1 positions (spawn file) + names, outfits, trade and travel from the TVP NPC files
// (7.6 stand-ins until Ryndean's 7.1 NPC files arrive; same format).
import fs from 'node:fs';
import path from 'node:path';
import { spriteIndex } from './dat.js';

// ---------- outfit colours (the client's 133-colour HSI palette) ----------
export function outfitColor(color) {
  const H = 19, SI = 7;
  if (color >= H * SI) color = 0;
  let h = 0, s = 0, i;
  if (color % H !== 0) {
    h = (color % H) / 18;
    [s, i] = [[0.25, 1], [0.25, 0.75], [0.5, 0.75], [0.667, 0.75], [1, 1], [1, 0.75], [1, 0.5]][Math.floor(color / H)];
  } else {
    i = 1 - color / H / SI;
  }
  if (i === 0) return [0, 0, 0];
  if (s === 0) return [i * 255, i * 255, i * 255].map(Math.round);
  let r, g, b;
  if (h < 1 / 6) { r = i; b = i * (1 - s); g = b + (i - b) * 6 * h; }
  else if (h < 2 / 6) { g = i; b = i * (1 - s); r = g - (i - b) * (6 * h - 1); }
  else if (h < 3 / 6) { g = i; r = i * (1 - s); b = r + (i - r) * (6 * h - 2); }
  else if (h < 4 / 6) { b = i; r = i * (1 - s); g = b - (i - r) * (6 * h - 3); }
  else if (h < 5 / 6) { b = i; g = i * (1 - s); r = g + (i - g) * (6 * h - 4); }
  else { r = i; g = i * (1 - s); b = r - (i - g) * (6 * h - 5); }
  return [r * 255, g * 255, b * 255].map(Math.round);
}

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

// ---------- all NPCs ----------
// Returns [{ name, x, y, z, dir, look, sells, buys, travel }] (offers still in server ids).
export function loadNpcs({ spawnFile, npcDir, log = () => {} }) {
  const spawn = fs.readFileSync(spawnFile, 'latin1');
  const out = [], missing = [];
  for (const m of spawn.matchAll(/<tvpspawn\s+([^>]*?)\/>/g)) {
    const a = Object.fromEntries([...m[1].matchAll(/(\w+)="([^"]*)"/g)].map((x) => [x[1], x[2]]));
    if (!a.npcname) continue;
    const npc = { name: titleCase(a.npcname), x: +a.centerx, y: +a.centery, z: +a.centerz, dir: +(a.direction ?? 2), look: null, sells: [], buys: [], travel: [] };
    const xmlFile = path.join(npcDir, `${a.npcname}.xml`);
    if (fs.existsSync(xmlFile)) {
      const xml = fs.readFileSync(xmlFile, 'latin1');
      const name = /<npc\s[^>]*name="([^"]*)"/.exec(xml)?.[1];
      if (name) npc.name = name;
      const look = /<look\s+([^>]*?)\/>/.exec(xml);
      if (look) npc.look = Object.fromEntries([...look[1].matchAll(/(\w+)="(\d+)"/g)].map((x) => [x[1], +x[2]]));
      const behaviour = /behavior="([^"]*)"/.exec(xml)?.[1];
      const bFile = behaviour && path.join(npcDir, 'behavior', behaviour);
      if (bFile && fs.existsSync(bFile)) Object.assign(npc, parseBehaviour(fs.readFileSync(bFile, 'latin1')));
    } else missing.push(a.npcname);
    out.push(npc);
  }
  if (missing.length) log(`NPCs without a TVP file (shown without trade/outfit): ${missing.join(', ')}`);
  return out;
}
