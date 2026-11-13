// Tibia Map: a Google Maps-style viewer of the Tibia 7.1 world, drawn with the real game sprites.
// Props: dataUrl (where the converted map data lives), height (CSS height of the map), syncUrl (keep the view in the URL hash).
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { World } from './engine/world.js';
import NpcWindow from './NpcWindow.jsx';
import DoorWindow from './DoorWindow.jsx';
import MonsterWindow from './MonsterWindow.jsx';
import QuestWindow from './QuestWindow.jsx';
import ItemWindow from './ItemWindow.jsx';
import RoutePanel, { speedOf } from './RoutePanel.jsx';
import { createRouter } from './engine/router.js';
import { drawText, textWidth } from './engine/text.js';
import './tibia-map.css';

// Zoom steps in screen (device) pixels per tile. Whole pixels per game pixel from 32 up keep sprites sharp.
const ZOOMS = [0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 96, 128, 160];
const SPRITES_FROM = 16; // below this: only the pre-drawn overview images (live drawing is too slow that far out)
// ?debug=walk: show the router's walk data (red = can't walk, arrows = floor changes) to check it against the game.
const DEBUG_WALK = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'walk';
const START = { x: 32369, y: 32221, z: 7, zoom: 32 }; // Thais

const nearestZoom = (s) => ZOOMS.reduce((b, z) => (Math.abs(Math.log(z / s)) < Math.abs(Math.log(b / s)) ? z : b), ZOOMS[0]);

function readHash() {
  const m = /^#(\d+),(\d+),(\d+)(?:,([\d.]+))?/.exec(window.location.hash);
  if (!m) return null;
  return { x: +m[1] + 0.5, y: +m[2] + 0.5, z: +m[3], zoom: m[4] ? nearestZoom(+m[4]) : START.zoom };
}

// Where NPC n shows in the view of floor z (frame position, see World): on the surface the floors 0-7 are drawn
// together, each one tile up-left per floor higher; underground only that floor. Null if it isn't shown
// (another underground floor, or its floor is taken off with the layers).
function npcFrame(n, z, cut) {
  const [x, y, nz] = n.p;
  if (z > 7 || nz > 7) return nz === z ? [x, y] : null;
  if (nz < cut) return null;
  return [x - (z - nz), y - (z - nz)];
}

// NPCs are drawn over everything (roofs too) from NPCS_FROM, with their names from NAMES_FROM. Zoomed out, their
// outfit keeps at least OUTFIT_MIN of its client size (in client pixels), so they stay findable like map pins.
const NPCS_FROM = 4, NAMES_FROM = 16, OUTFIT_MIN = 0.75;

// Zooming in to MAIN_FROM switches to the area's main level, "this floor only": the ground floor, or the level of
// the streets where they are higher up (Venore: +1). Ctrl + wheel goes up or down from there; zooming back out
// brings the roofs back.
const MAIN_FROM = 32; // was 64; user 2026-11-13: one step earlier, to see into buildings sooner
// How close Go to, search results and "Show" route fly in (at least), and the closest zoom a route is fitted at.
const FLY_ZOOM = 64;
const MAIN_LEVELS = [
  { name: 'Venore', x1: 32915, y1: 32015, x2: 33060, y2: 32140, z: 6 }, // streets on +1 (floor-6 ground, see the doc)
];
const mainLevelAt = (x, y) => MAIN_LEVELS.find((a) => x >= a.x1 && x <= a.x2 && y >= a.y1 && y <= a.y2)?.z ?? 7;

// Where NPC n is drawn on the canvas: its outfit picture (x, y, w, h, scale) and its tile's centre.
// ox, oy: canvas position of tile (0, 0); s: screen pixels per tile; k: screen pixels per client pixel.
function npcRect(n, f, ox, oy, s, k) {
  const sc = Math.max(s / 32, OUTFIT_MIN * k);
  const [w, h] = n.img ? [n.img[2], n.img[3]] : [32, 32];
  const cx = ox + (f[0] + 0.5) * s, cy = oy + (f[1] + 0.5) * s;
  // The outfit's own tile (its bottom-right 32x32 cell, shifted by the displacement) centred on the NPC's tile.
  return { x: Math.round(cx + (16 - w - n.d[0]) * sc), y: Math.round(cy + (16 - h - n.d[1]) * sc), w: Math.round(w * sc), h: Math.round(h * sc), sc, cx, cy };
}

// The NPCs to draw for view v (tile area left..bottom), back to front: [{ n, f: frame position }].
function visibleNpcs(world, v, left, top, right, bottom) {
  if (v.zoom < NPCS_FROM) return [];
  const out = [];
  for (const n of world.npcs) {
    const f = npcFrame(n, v.z, v.cut);
    if (f && f[0] >= left - 3 && f[0] <= right + 3 && f[1] >= top - 3 && f[1] <= bottom + 3) out.push({ n, f });
  }
  return out.sort((a, b) => a.f[1] - b.f[1] || a.f[0] - b.f[0]);
}

// Locked doors: what unlocking works on. A key opens every door with its number; a door without a known number
// is unlocked on its own. The state: { all: open every locked door (the tick), open: [unit, ...] }.
const doorUnit = (d) => (d.key ? `k${d.key}` : `p${d.p.join(',')}`);
const doorOpen = (st, d) => st.all || st.open.includes(doorUnit(d));
// Key icons on locked doors from this zoom.
const KEYS_FROM = 16;
// The locked doors to draw for view v: [{ d, f: frame position }] (placed like NPCs, see npcFrame).
function visibleDoors(world, v, left, top, right, bottom) {
  if (v.zoom < KEYS_FROM || !world.doors) return [];
  const out = [];
  for (const d of world.doors) {
    const f = npcFrame(d, v.z, v.cut);
    if (f && f[0] >= left - 1 && f[0] <= right + 1 && f[1] >= top - 1 && f[1] <= bottom + 1) out.push({ d, f });
  }
  return out;
}

// How visible the route is on floor z when looking at floor vz (5b): 1 on this floor. Seen from the surface, the
// other surface floors (0-7) at 0.55, as before. Underground floors, and everything seen from underground: up to
// 2 floors away, 0.55 and 0.3; further away not drawn.
const ROUTE_FADE = [1, 0.55, 0.3];
function routeAlpha(z, vz) {
  if (z === vz) return 1;
  if (z <= 7 && vz <= 7) return ROUTE_FADE[1];
  return ROUTE_FADE[Math.abs(z - vz)] || 0;
}

// See-through along the route (5c): where the route is on another floor (up to 2 floors away), that floor is drawn
// over this one in a band along the path, so the floor you're on looks see-through there. The band is full for
// SEE_BAND tiles from the path and then fades out to SEE_EDGE (very faint, user: "a bit more but very faded").
// Floors further away are fainter (SEE_FLOOR_ALPHA by distance).
const SEE_BAND = 3, SEE_EDGE = 7, SEE_FADE = 0.4;
// Around the route on the floor you're looking at, nothing shows through (user: the main path on the main floor must
// always be the most visible): clear within SEE_CLEAR tiles, back to full at SEE_CLEAR_EDGE.
const SEE_CLEAR = 1, SEE_CLEAR_EDGE = 3;
const clearAlpha = (d) => (d <= SEE_CLEAR ? 1 : d >= SEE_CLEAR_EDGE ? 0 : 1 - (d - SEE_CLEAR) / (SEE_CLEAR_EDGE - SEE_CLEAR));
const SEE_FLOOR_ALPHA = [0, 0.8, 0.5];
const SEE_CHANGES = 2; // floor changes ahead that show through
const seeAlpha = (d) => (d <= SEE_BAND ? 1 : d >= SEE_EDGE ? 0 : SEE_FADE * (1 - (d - SEE_BAND) / (SEE_EDGE - SEE_BAND)));

// The mask grid of a draw: one cell per tile of the view (plus a margin).
function seeGrid({ left, top, right, bottom }) {
  const x0 = Math.floor(left) - 1, y0 = Math.floor(top) - 1;
  return { x0, y0, w: Math.ceil(right) + 2 - x0, h: Math.ceil(bottom) + 2 - y0 };
}

// Adds alpha(distance) around tile (x, y) to cells (keeping the highest value), up to distance r.
function spread(cells, gr, x, y, r, alpha) {
  if (x < gr.x0 - r || x >= gr.x0 + gr.w + r || y < gr.y0 - r || y >= gr.y0 + gr.h + r) return false;
  let any = false;
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const cx = x + dx - gr.x0, cy = y + dy - gr.y0;
    if (cx < 0 || cy < 0 || cx >= gr.w || cy >= gr.h) continue;
    const a = alpha(Math.hypot(dx, dy));
    if (a > cells[cy * gr.w + cx]) { cells[cy * gr.w + cx] = a; any = true; }
  }
  return any;
}

// Draws floor z over the map in a band around `tiles` ([[x, y, ...]] on floor z), see-through as SEE_BAND /
// SEE_EDGE say, at SEE_FLOOR_ALPHA for its distance; `keep` (cells, or null): where this floor stays clear.
// g: { ox, oy, s, W, H, left, top, right, bottom, C, ts } of the current draw; offRef: a ref for the scratch canvases.
function seeBand(ctx, world, v, z, tiles, keep, g, budget, offRef) {
  const { ox, oy, s, W, H, left, top, right, bottom, C, ts } = g;
  offRef.current ||= { off: document.createElement('canvas'), mask: document.createElement('canvas') };
  const { off, mask } = offRef.current;
  if (off.width !== W || off.height !== H) { off.width = W; off.height = H; }
  const octx = off.getContext('2d'), mctx = mask.getContext('2d');
  const gr = seeGrid(g);
  // Floors 0-7 seen from the surface sit one tile up-left per floor higher (as the client draws them).
  const d = v.z <= 7 && z <= 7 ? v.z - z : 0;
  const cells = new Float32Array(gr.w * gr.h);
  let any = false;
  const seen = new Set();
  for (const [x0, y0] of tiles) {
    const x = x0 - d, y = y0 - d, k = `${x},${y}`;
    if (seen.has(k)) continue;
    seen.add(k);
    if (spread(cells, gr, x, y, SEE_EDGE, seeAlpha)) any = true;
  }
  if (!any) return;
  mask.width = gr.w; mask.height = gr.h;
  const img = mctx.createImageData(gr.w, gr.h);
  for (let i = 0; i < cells.length; i++) img.data[i * 4 + 3] = Math.round(cells[i] * (keep ? 1 - keep[i] : 1) * 255);
  mctx.putImageData(img, 0, 0);
  // That floor on its own, then cut to the band.
  octx.globalCompositeOperation = 'source-over';
  octx.clearRect(0, 0, W, H);
  octx.imageSmoothingEnabled = s < ts;
  for (let cy = Math.floor((top + d) / C); cy <= Math.floor((bottom + d) / C); cy++) {
    for (let cx = Math.floor((left + d) / C); cx <= Math.floor((right + d) / C); cx++) {
      const c = world.chunkCanvas(z, cx, cy, 'floor', ts, budget);
      if (c) octx.drawImage(c, ox + (cx * C - d) * s, oy + (cy * C - d) * s, C * s, C * s);
    }
  }
  octx.globalCompositeOperation = 'destination-in';
  octx.imageSmoothingEnabled = true; // a soft edge between tile cells
  octx.drawImage(mask, ox + gr.x0 * s, oy + gr.y0 * s, gr.w * s, gr.h * s); // cell centres on tile centres
  octx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = SEE_FLOOR_ALPHA[Math.min(2, Math.abs(z - v.z))];
  ctx.drawImage(off, 0, 0);
  ctx.globalAlpha = 1;
}

// See-through along the route (5c): the floors ahead on the route, in a band along it.
function seeThrough(ctx, world, v, rp, g, budget, offRef) {
  const floors = new Map(); // floor -> route tiles on it
  // Only the way ahead (user): a stretch on another floor shows through only when the route has already been on
  // this floor before it, so you see where you're going, not where you came from; and only up to SEE_CHANGES
  // floor changes after leaving this floor (down, down again: shown; back up after that: not yet). Back on this
  // floor, the count starts again.
  let been = false, changes = 0;
  for (let i = 0; i < rp.length; i++) {
    const e = rp[i], z = e[2], dz = Math.abs(z - v.z);
    if (!dz) { been = true; changes = 0; continue; }
    if (i > 0 && z !== rp[i - 1][2]) changes++;
    if (!been || changes > SEE_CHANGES || dz > 2) continue;
    // A floor above that is already drawn (the surface with its upper floors, below the layer cut) needs nothing.
    if (z < v.z && v.z <= 7 && z >= v.cut) continue;
    if (!floors.has(z)) floors.set(z, []);
    floors.get(z).push(e);
  }
  if (!floors.size) return;
  // How much to keep this floor clear, per cell: near its own part of the route (see SEE_CLEAR).
  const gr = seeGrid(g), keep = new Float32Array(gr.w * gr.h);
  for (const [x, y, z] of rp) if (z === v.z) spread(keep, gr, x, y, SEE_CLEAR_EDGE, clearAlpha);
  // Farthest floor first, so the nearer one lies on top where both show.
  for (const [z, tiles] of [...floors].sort((a, b) => Math.abs(b[0] - v.z) - Math.abs(a[0] - v.z))) {
    seeBand(ctx, world, v, z, tiles, keep, g, budget, offRef);
  }
}

// Hover preview (5d): the floor a hole, stairs, ladder or other floor change leads to, around where you land, in the
// same see-through way. The hovered tile itself stays clear, so you still see what you point at.
// link: [x, y, z, tx, ty, tz, kind].
function seePreview(ctx, world, v, link, g, budget, offRef) {
  const gr = seeGrid(g), keep = new Float32Array(gr.w * gr.h);
  spread(keep, gr, link[0], link[1], 1, (d) => (d < 0.5 ? 1 : d >= 1 ? 0 : 1 - (d - 0.5) / 0.5));
  seeBand(ctx, world, v, link[5], [[link[3], link[4]]], keep, g, budget, offRef);
}

// A small arrow on a floor change, up or down (user: so you see whether you're going up or down), centred on
// (x, y), `size` screen pixels high, in `color` with a black outline (k: screen pixels per client pixel).
const FLOOR_UP = '#ffa000', FLOOR_DOWN = '#3080ff';
function drawArrow(ctx, x, y, size, up, k) {
  const h = size / 2, w = size * 0.42, sy = up ? 1 : -1;
  const pts = [[0, -h], [w, -h * 0.05], [w * 0.42, -h * 0.05], [w * 0.42, h], [-w * 0.42, h], [-w * 0.42, -h * 0.05], [-w, -h * 0.05]];
  ctx.beginPath();
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(x + px, y + py * sy) : ctx.moveTo(x + px, y + py * sy)));
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#000'; ctx.lineWidth = 2 * k; ctx.stroke();
  ctx.fillStyle = up ? FLOOR_UP : FLOOR_DOWN; ctx.fill();
}

// Monsters (6b): where their floor is shown, from MONSTERS_FROM: underground only on their own floor; on the surface
// on every surface floor that is drawn (floors 0-7 together, above the layer cut), shifted like that floor, as NPCs
// (npcFrame). (User: monsters upstairs, e.g. dragons on floor 6 above Edron, must show.) Zoomed out, the monsters of one kind spawning
// close together are one marker with a count ("3x"); from MONSTERS_SPLIT each one stands on its own tile, spread
// over its spawn's radius from the centre outwards (the server picks random tiles in the radius; this is a stand-in).
const MONSTERS_FROM = 16, MONSTERS_SPLIT = 64;
const SPIRAL = (() => {
  const out = [];
  for (let dy = -10; dy <= 10; dy++) for (let dx = -10; dx <= 10; dx++) out.push([dx, dy]);
  return out.sort((a, b) => Math.max(Math.abs(a[0]), Math.abs(a[1])) - Math.max(Math.abs(b[0]), Math.abs(b[1]))
    || Math.hypot(...a) - Math.hypot(...b) || Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]));
})();

// The monsters to draw for view v, back to front: [{ kind, f: [x, y], count, group }].
function visibleMonsters(world, v, left, top, right, bottom) {
  if (v.zoom < MONSTERS_FROM || !world.monMarkers) return [];
  const out = [], inView = (x, y, m) => x >= left - m && x <= right + m && y >= top - m && y <= bottom + m;
  if (v.zoom < MONSTERS_SPLIT) {
    for (const mk of world.monMarkers) {
      const f = npcFrame(mk, v.z, v.cut);
      if (f && inView(f[0], f[1], 3)) out.push({ kind: mk.kind, f, count: mk.count, group: mk.group });
    }
  } else {
    for (const sp of world.spawnPoints) {
      const f = npcFrame(sp, v.z, v.cut);
      if (!f || !inView(f[0], f[1], sp.radius + 3)) continue;
      const spots = SPIRAL.filter(([dx, dy]) => Math.max(Math.abs(dx), Math.abs(dy)) <= sp.radius);
      for (let i = 0; i < sp.amount; i++) {
        const [dx, dy] = spots[i % spots.length];
        out.push({ kind: sp.kind, f: [f[0] + dx, f[1] + dy], count: 1, group: sp.group });
      }
    }
  }
  return out.sort((a, b) => a.f[1] - b.f[1] || a.f[0] - b.f[0]);
}

// Monster search (6d): every monster of the searched kind, on every floor and at every zoom, drawn bigger with a
// gold ring, so they stand out; the ones on other floors fainter. Markers as at zoom 16-32 (with "3x"), split per
// tile from MONSTERS_SPLIT as usual. [{ kind, p: [x, y, z], f: frame position, count, group, here }]
const SEARCH_SCALE = 1.5, SEARCH_OTHER_FLOOR = 0.55;
function searchedMonsters(world, v, kind, left, top, right, bottom) {
  if (kind == null || !world.monMarkers) return [];
  const fr = (x, y, z) => (v.z <= 7 && z <= 7 ? [x - (v.z - z), y - (v.z - z)] : [x, y]);
  const out = [], m = 4;
  const add = (x, y, z, count, group) => {
    const f = fr(x, y, z);
    if (f[0] >= left - m && f[0] <= right + m && f[1] >= top - m && f[1] <= bottom + m) out.push({ kind, p: [x, y, z], f, count, group, here: z === v.z });
  };
  if (v.zoom < MONSTERS_SPLIT) {
    for (const mk of world.monMarkers) if (mk.kind === kind) add(mk.p[0], mk.p[1], mk.p[2], mk.count, mk.group);
  } else {
    for (const sp of world.spawnPoints) {
      if (sp.kind !== kind) continue;
      const spots = SPIRAL.filter(([dx, dy]) => Math.max(Math.abs(dx), Math.abs(dy)) <= sp.radius);
      for (let i = 0; i < sp.amount; i++) { const [dx, dy] = spots[i % spots.length]; add(sp.p[0] + dx, sp.p[1] + dy, sp.p[2], 1, sp.group); }
    }
  }
  // Other floors first, this floor on top; back to front.
  return out.sort((a, b) => a.here - b.here || a.f[1] - b.f[1] || a.f[0] - b.f[0]);
}
// Where a searched monster is drawn: its outfit (x, y, w, h) at SEARCH_SCALE (at least 60 % of its game size), and
// its ring.
function searchedRect(kd, f, ox, oy, s, k) {
  const sc = Math.max((s / 32) * SEARCH_SCALE, 0.6 * k); // zoomed far out: 60 % of the game size, so they don't crowd
  const [w0, h0] = [kd.img[2], kd.img[3]];
  const cx = ox + (f[0] + 0.5) * s, cy = oy + (f[1] + 0.5) * s;
  return { x: Math.round(cx + (16 - w0 - kd.d[0]) * sc), y: Math.round(cy + (16 - h0 - kd.d[1]) * sc), w: Math.round(w0 * sc), h: Math.round(h0 * sc), sc, cx, cy, r: Math.max(10 * k, 18 * sc) };
}

// Quest chests (slice 10): a chest icon in a gold ring on each quest chest, and the quest's name above each group
// of its chests, from QUESTS_FROM, where their floor is shown (as NPCs, npcFrame).
const QUESTS_FROM = 16;
function visibleQuestChests(world, v, left, top, right, bottom) {
  if (v.zoom < QUESTS_FROM || !world.questChests) return [];
  const out = [];
  for (const c of world.questChests) {
    const f = npcFrame(c, v.z, v.cut);
    if (f && f[0] >= left - 2 && f[0] <= right + 2 && f[1] >= top - 2 && f[1] <= bottom + 2) out.push({ c, f });
  }
  return out;
}
// A quest chest's ring on the canvas: centre and radius.
const questRing = (f, ox, oy, s, k) => ({ cx: ox + (f[0] + 0.5) * s, cy: oy + (f[1] + 0.5) * s, r: Math.max(9 * k, s * 0.55) });

// The character's settings before the user changes them (user, 2026-11-13).
const CHAR_DEFAULT = { level: 8, haste: 'none', boh: false };

// The layer cut for a view opened at a zoom: zoomed in on the surface, that floor only (see MAIN_FROM).
const withCut = (v) => ({ ...v, cut: v.zoom >= MAIN_FROM && v.z <= 7 ? v.z : 0 });

export default function TibiaMap({ dataUrl = '/map-data', height = '80vh', syncUrl = true }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const worldRef = useRef(null);
  // x, y = centre in tiles (fractional); z; zoom = target step; cut = top layer drawn (floors above it are left out, 0 = all)
  const view = useRef(withCut({ ...START, ...(syncUrl && readHash()) }));
  const anim = useRef({ s: view.current.zoom, anchor: null }); // shown scale (animates to view.zoom)
  const frame = useRef(0);
  const viewBox = useRef(null); // the tile area on screen, from the last draw
  const selected = useRef(null); // the NPC whose window is open (drawn with a frame)
  const selectedDoor = useRef(null); // the locked door whose window is open (drawn with a frame)
  const selectedQuest = useRef(null); // the quest chest whose window is open (drawn with a white ring)
  const selectedMon = useRef(null); // the monster window's { kind | 'all', group } (its spawn drawn with frames)
  const offRef = useRef(null); // scratch canvases for the see-through along the route
  const hoverLink = useRef(null); // the floor change under the mouse (no route planned): [x, y, z, tx, ty, tz, kind]
  const [npc, setNpc] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [hover, setHover] = useState(null);
  const [ui, setUi] = useState({ z: view.current.z, zoom: view.current.zoom, cut: 0 });
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [active, setActive] = useState(0); // highlighted search result
  const [item, setItem] = useState(null); // the item whose window is open: { id, fluid }
  const [door, setDoor] = useState(null); // the locked door whose window is open
  const [mon, setMon] = useState(null); // the monster window: { kind | 'all', group }
  const [questSel, setQuestSel] = useState(null); // the quest window: a quest chest
  const monSearch = useRef(null); // the searched monster kind (6d), or null
  // Back (6c): where you were before each jump (search result, item to seller, boat trip): the view and the open
  // windows. The Back button and the browser's back key return there.
  const backStack = useRef([]);
  const restoreBackRef = useRef(null); // restoreBack, for the popstate listener
  const [backCount, setBackCount] = useState(0);
  const itemRef = useRef(null);
  itemRef.current = item;
  // Unlocked doors (see doorUnit), remembered in this browser (a convenience; it works without storage too).
  const [doors, setDoorsState] = useState(() => {
    try { const d = JSON.parse(window.localStorage.getItem('tm-doors') || '{}'); return { all: !!d.all, open: Array.isArray(d.open) ? d.open : [] }; }
    catch { return { all: false, open: [] }; }
  });
  const doorsRef = useRef(doors);
  doorsRef.current = doors;
  // The route: { open, from, to: { label, pos: [x,y,z] }, result: { routes: [{ name, path, steps, gold }] } | { error },
  // pick: which of the routes is shown (fastest / cheapest), busy }.
  const [route, setRoute] = useState({ open: false, from: null, to: null, result: null, pick: 0, busy: false });
  const routePath = useRef(null); // the shown route's tiles, for drawing: [[x, y, z, how, ...]]
  const router = useRef(null); // the route finder (a web worker, made on first use)
  // The character for run times: level, haste ('none' | 'haste' | 'strong'), boots of haste. Default (user): level 8,
  // no haste, no boots of haste. Changes are remembered in this browser (a convenience; it works without storage too).
  const [char, setCharState] = useState(() => {
    try { return { ...CHAR_DEFAULT, ...JSON.parse(window.localStorage.getItem('tm-char') || '{}') }; }
    catch { return { ...CHAR_DEFAULT }; }
  });
  const charRef = useRef(char);
  const setChar = (c) => {
    charRef.current = c;
    setCharState(c);
    try { window.localStorage.setItem('tm-char', JSON.stringify(c)); } catch { /* storage blocked: fine */ }
  };
  const [menu, setMenu] = useState(null); // the right-click menu: { x, y (CSS px in the map), tile: [x,y,z], adding }
  const [locName, setLocName] = useState(''); // the name being typed for "Add location here"
  const [locNote, setLocNote] = useState(null); // a failed save, shown under the search
  // Named locations (the user's own, dev only): add or remove a name on a square through the dev server, then search
  // them right away.
  const saveLocation = async (change) => {
    try {
      const res = await fetch('/__custom-places', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(change) });
      const list = await res.json();
      if (!res.ok || !Array.isArray(list)) throw new Error(list?.error || res.status);
      worldRef.current?.setCustomPlaces(list);
      if (query) setResults(worldRef.current.search(query));
      setLocNote(null);
    } catch (e) { setLocNote(`Could not save the location: ${e.message || e}`); }
  };
  const flight = useRef(null); // a fly-to in progress: { fx, fy, tx, ty, t0, dur }
  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  const uiScale = Math.max(1, Math.round(dpr)); // whole screen pixels per client pixel in the side panel

  // ---------- drawing ----------
  const draw = useCallback(() => {
    frame.current = 0;
    const world = worldRef.current, canvas = canvasRef.current;
    if (!world?.map || !canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height, v = view.current, a = anim.current;
    let more = false;

    // Fly-to (search results, travel): ease the centre to the target.
    const fl = flight.current;
    if (fl) {
      const t = Math.min(1, (performance.now() - fl.t0) / fl.dur), e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      v.x = fl.fx + (fl.tx - fl.fx) * e; v.y = fl.fy + (fl.ty - fl.fy) * e;
      if (t < 1) more = true; else flight.current = null;
    }

    // Zoom animation: ease the shown scale towards the target, keeping the anchor point still.
    if (a.s !== v.zoom) {
      const next = a.s * Math.pow(v.zoom / a.s, 0.35);
      a.s = Math.abs(Math.log(next / v.zoom)) < 0.02 ? v.zoom : next;
      if (a.anchor) { v.x = a.anchor.wx - (a.anchor.sx - W / 2) / a.s; v.y = a.anchor.wy - (a.anchor.sy - H / 2) / a.s; }
      more = a.s !== v.zoom;
      if (!more) a.anchor = null;
    }
    const s = a.s;
    // Keep the centre on the map.
    const b = world.bounds;
    v.x = Math.max(b.x1, Math.min(b.x2 + 1, v.x)); v.y = Math.max(b.y1, Math.min(b.y2 + 1, v.y));
    // Whole-pixel origin: where tile (0, 0) would be on screen.
    const ox = Math.round(W / 2 - v.x * s), oy = Math.round(H / 2 - v.y * s);
    const left = -ox / s, top = -oy / s, right = left + W / s, bottom = top + H / s;
    viewBox.current = { left, top, right, bottom };

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Overview images (the map pre-drawn with sprites): the only layer when zoomed out, and a quick
    // first layer under the live sprites while their chunks load.
    const ov = world.map.overview;
    const level = ov.levels.find((l) => l >= v.zoom) ?? ov.levels[ov.levels.length - 1];
    const set = v.z <= 7 ? 'surface' : String(v.z);
    const shift = v.z <= 7 ? 7 - v.z : 0; // floors 0-6 use the surface image, shifted like the client does
    const B = ov.px / level; // tiles per image
    ctx.imageSmoothingEnabled = s !== level;
    for (let by = Math.floor((top - shift) / B); by <= Math.floor((bottom - shift) / B); by++) {
      for (let bx = Math.floor((left - shift) / B); bx <= Math.floor((right - shift) / B); bx++) {
        const img = world.overview(set, level, bx, by);
        if (img) ctx.drawImage(img, ox + (bx * B + shift) * s, oy + (by * B + shift) * s, B * s, B * s);
      }
    }

    // Game sprites.
    if (v.zoom >= SPRITES_FROM) {
      const C = world.CHUNK, ts = v.zoom >= 32 ? 32 : 16;
      const budget = { n: 6 };
      ctx.imageSmoothingEnabled = s < ts;
      // Chunks drawn last can overhang into earlier ones only up-left, so draw top-left to bottom-right.
      for (let cy = Math.floor(top / C); cy <= Math.floor(bottom / C); cy++) {
        for (let cx = Math.floor(left / C); cx <= Math.floor(right / C); cx++) {
          const c = world.chunkCanvas(v.z, cx, cy, 'above', ts, budget, v.cut);
          if (c) ctx.drawImage(c, ox + cx * C * s, oy + cy * C * s, C * s, C * s);
        }
      }
      // See-through along the route (5c): the floors above and below where the route goes show through.
      const g = { ox, oy, s, W, H, left, top, right, bottom, C, ts };
      if (routePath.current) seeThrough(ctx, world, v, routePath.current, g, budget, offRef);
      // Hover preview (5d): where the hole, stairs or ladder under the mouse leads, also with a route (user), on top.
      if (hoverLink.current && hoverLink.current[2] === v.z && !(hoverLink.current[5] < v.z && v.z <= 7 && hoverLink.current[5] >= v.cut)) {
        seePreview(ctx, world, v, hoverLink.current, g, budget, offRef); // (a floor above that is already drawn: nothing to add)
      }
      // The hovered floor change gets an arrow: up or down.
      if (hoverLink.current && hoverLink.current[2] === v.z) {
        const l = hoverLink.current, kk = Math.max(1, Math.round(window.devicePixelRatio || 1));
        drawArrow(ctx, ox + (l[0] + 0.5) * s, oy + (l[1] + 0.5) * s, Math.max(12 * kk, s * 0.6), l[5] < l[2], kk);
      }
      if (budget.n < 0) more = true;
    }

    // Debug: the walk data of this floor (see DEBUG_WALK).
    if (DEBUG_WALK && world.walk && v.zoom >= 16) {
      const k0 = Math.max(1, Math.round(window.devicePixelRatio || 1));
      ctx.font = `bold ${Math.max(9, Math.round(s / 3))}px Verdana`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let y = Math.floor(top); y <= bottom; y++) for (let x = Math.floor(left); x <= right; x++) {
        const t = world.tile(x, y, v.z), sx = ox + x * s, sy = oy + y * s;
        if (t && !world.speedAt(x, y, v.z)) { ctx.fillStyle = 'rgba(255,0,0,0.35)'; ctx.fillRect(sx, sy, s, s); }
        for (const l of world.walk.linksAt.get(`${x},${y},${v.z}`) || []) {
          const kind = world.walk.kinds[l[6]], upward = l[5] < l[2];
          // Teleports (purple) can stay on the same floor: an arrow for the floor, else none.
          ctx.fillStyle = kind === 'teleport' ? 'rgba(170,0,255,0.8)' : upward ? 'rgba(255,160,0,0.8)' : 'rgba(0,120,255,0.8)';
          ctx.fillRect(sx + k0, sy + k0, s - 2 * k0, s - 2 * k0);
          ctx.fillStyle = '#fff';
          ctx.fillText((l[5] === l[2] ? '' : upward ? '↑' : '↓') + kind[0].toUpperCase(), sx + s / 2, sy + s / 2);
        }
      }
      // Teleports and NPC passages: a line to where they go (dashed when the destination is on another floor),
      // the NPC end labelled with the destination, price and level.
      const lines = [
        ...world.walk.links.filter((l) => world.walk.kinds[l[6]] === 'teleport').map((l) => ({ a: l.slice(0, 3), b: l.slice(3, 6), c: '#a0f', t: '' })),
        ...world.walk.passages.map((p) => ({ a: p.slice(4, 7), b: p.slice(7, 10), c: '#0c4', t: `${p[1]} ${p[2]} gp${p[3] ? `, level ${p[3]}` : ''}` })),
      ];
      const byNpc = new Map();
      ctx.lineWidth = 2 * k0;
      for (const { a, b, c, t } of lines) {
        if (a[2] !== v.z && b[2] !== v.z) continue;
        const ax = ox + (a[0] + 0.5) * s, ay = oy + (a[1] + 0.5) * s, bx = ox + (b[0] + 0.5) * s, by = oy + (b[1] + 0.5) * s;
        ctx.strokeStyle = c;
        ctx.setLineDash(a[2] === b[2] ? [] : [6 * k0, 4 * k0]);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        if (b[2] === v.z) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(bx, by, s / 4, 0, 2 * Math.PI); ctx.fill(); }
        if (t && a[2] === v.z) { const k = `${a}`; byNpc.set(k, [...(byNpc.get(k) || []), t]); }
      }
      ctx.setLineDash([]);
      ctx.textAlign = 'left';
      for (const [k, list] of byNpc) {
        const [x, y] = k.split(',').map(Number);
        list.forEach((t, i) => {
          const tx = ox + (x + 1) * s, ty = oy + y * s + i * (s / 3 + 4);
          ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(tx, ty - s / 6 - 2, ctx.measureText(t).width + 6, s / 3 + 4);
          ctx.fillStyle = '#7f7'; ctx.fillText(t, tx + 3, ty);
        });
      }
      ctx.textAlign = 'center';
    }

    // Monsters on this floor (6b), under the doors' keys and the NPCs: outfit, and "3x" for a marker of several.
    // The monsters of the spawn whose window is open get a white frame.
    if (world.monSheet) {
      const km = Math.max(1, Math.round(window.devicePixelRatio || 1)), fsm = Math.max(km, Math.round(s / 32));
      const ms = visibleMonsters(world, v, left, top, right, bottom).filter((m) => m.kind !== monSearch.current), msel = selectedMon.current;
      for (const m of ms) {
        const kd2 = world.monKinds[m.kind];
        if (!kd2.img) continue;
        const r = npcRect(kd2, m.f, ox, oy, s, km);
        ctx.imageSmoothingEnabled = r.sc < 1;
        ctx.drawImage(world.monSheet, kd2.img[0], kd2.img[1], kd2.img[2], kd2.img[3], r.x, r.y, r.w, r.h);
        if (msel && m.group === msel.group && (msel.kind === 'all' || msel.kind === m.kind)) {
          ctx.strokeStyle = '#fff'; ctx.lineWidth = km;
          ctx.strokeRect(ox + m.f[0] * s + km / 2, oy + m.f[1] * s + km / 2, s - km, s - km);
        }
      }
      ctx.imageSmoothingEnabled = false;
      for (const m of ms) {
        if (m.count < 2) continue;
        const t = m.count + 'x', w = textWidth(world.font, t) * fsm;
        ctx.save();
        ctx.translate(Math.round(ox + (m.f[0] + 1) * s - w), Math.round(oy + (m.f[1] + 1) * s - 12 * fsm));
        ctx.scale(fsm, fsm);
        drawText(ctx, world.font, t, 0, 0, '#ffffff');
        ctx.restore();
      }
      // The searched kind (6d): bigger, with a gold ring, on every floor (other floors fainter).
      const found = searchedMonsters(world, v, monSearch.current, left, top, right, bottom);
      for (const m of found) {
        const kd2 = world.monKinds[m.kind];
        if (!kd2.img) continue;
        const r = searchedRect(kd2, m.f, ox, oy, s, km);
        ctx.globalAlpha = m.here ? 1 : SEARCH_OTHER_FLOOR;
        ctx.beginPath(); ctx.arc(r.cx, r.cy, r.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,215,0,0.22)'; ctx.fill();
        ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2 * km; ctx.stroke();
        ctx.imageSmoothingEnabled = r.sc < 1;
        ctx.drawImage(world.monSheet, kd2.img[0], kd2.img[1], kd2.img[2], kd2.img[3], r.x, r.y, r.w, r.h);
        if (m.count > 1) {
          const fsr = Math.max(km, Math.round(r.sc)), t = m.count + 'x', w = textWidth(world.font, t) * fsr;
          ctx.imageSmoothingEnabled = false;
          ctx.save();
          ctx.translate(Math.round(r.cx + r.r - w), Math.round(r.cy + r.r - 10 * fsr));
          ctx.scale(fsr, fsr);
          drawText(ctx, world.font, t, 0, 0, '#ffffff');
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }
    }

    // Quest chests (slice 10): the chest in a gold ring (white when its window is open), then the quests' names.
    {
      const kq = Math.max(1, Math.round(window.devicePixelRatio || 1));
      for (const { c, f } of visibleQuestChests(world, v, left, top, right, bottom)) {
        const r = questRing(f, ox, oy, s, kq), sel = selectedQuest.current === c;
        ctx.beginPath(); ctx.arc(r.cx, r.cy, r.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
        ctx.strokeStyle = sel ? '#ffffff' : '#ffd700'; ctx.lineWidth = 2 * kq; ctx.stroke();
        if (c.id) {
          const size = Math.round(r.r * 1.5);
          ctx.imageSmoothingEnabled = size < 32;
          ctx.drawImage(world.iconCanvas(c.id), Math.round(r.cx - size / 2), Math.round(r.cy - size / 2), size, size);
        }
      }
      if (v.zoom >= QUESTS_FROM && world.questLabels) {
        const fq = Math.max(kq, Math.round(s / 32));
        ctx.imageSmoothingEnabled = false;
        for (const l of world.questLabels) {
          const f = npcFrame(l, v.z, v.cut);
          if (!f || f[0] < left - 10 || f[0] > right + 10 || f[1] < top - 2 || f[1] > bottom + 2) continue;
          const r = questRing(f, ox, oy, s, kq), t = l.quest.n, w = textWidth(world.font, t) * fq;
          ctx.save();
          ctx.translate(Math.round(r.cx - w / 2), Math.round(r.cy - r.r - 13 * fq));
          ctx.scale(fq, fq);
          drawText(ctx, world.font, t, 0, 0, '#ffd700');
          ctx.restore();
        }
      }
    }

    // Locked doors: the key they need, over the door (faint when its number isn't known); a white frame on the
    // selected one. An unlocked door is drawn open by the World, its key stays.
    const kd = Math.max(1, Math.round(window.devicePixelRatio || 1));
    for (const { d, f } of visibleDoors(world, v, left, top, right, bottom)) {
      const icon = world.iconCanvas(d.keyId), size = Math.round(s * 0.8);
      ctx.imageSmoothingEnabled = size < 32;
      ctx.globalAlpha = d.key ? 1 : 0.6;
      ctx.drawImage(icon, Math.round(ox + f[0] * s + (s - size) / 2), Math.round(oy + f[1] * s + (s - size) / 2), size, size);
      ctx.globalAlpha = 1;
      if (d === selectedDoor.current) {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = kd;
        ctx.strokeRect(ox + f[0] * s + kd / 2, oy + f[1] * s + kd / 2, s - kd, s - kd);
      }
    }

    // NPCs over everything (roofs too): outfit, then the name above it in the client's outlined font, green like
    // a creature at full health (white when selected). Back to front, so the ones further south are on top.
    const k = Math.max(1, Math.round(window.devicePixelRatio || 1)), sel = selected.current;
    const sf = sel && npcFrame(sel, v.z, v.cut);
    if (sf && v.zoom >= 32) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = k;
      ctx.strokeRect(ox + sf[0] * s + k / 2, oy + sf[1] * s + k / 2, s - k, s - k);
    }
    const shown = visibleNpcs(world, v, left, top, right, bottom);
    for (const { n, f } of shown) {
      if (!n.img) continue;
      const r = npcRect(n, f, ox, oy, s, k);
      ctx.imageSmoothingEnabled = r.sc < 1;
      ctx.drawImage(world.npcSheet, n.img[0], n.img[1], n.img[2], n.img[3], r.x, r.y, r.w, r.h);
    }
    if (v.zoom >= NAMES_FROM) {
      const fs = Math.max(k, Math.round(s / 32));
      ctx.imageSmoothingEnabled = false;
      for (const { n, f } of shown) {
        const r = npcRect(n, f, ox, oy, s, k);
        const w = textWidth(world.font, n.n) * fs;
        ctx.save();
        ctx.translate(Math.round(r.cx - w / 2), Math.round(Math.min(r.y, r.cy - 16 * r.sc) - 14 * fs));
        ctx.scale(fs, fs);
        drawText(ctx, world.font, n.n, 0, 0, n === sel ? '#ffffff' : '#00c000');
        ctx.restore();
      }
    }
    // The route: a line through the tiles, bright on this floor, fainter dashes on other floors (see routeAlpha);
    // markers where the floor changes, green at the start, red at the end. Line widths in client pixels.
    const rp = routePath.current;
    if (rp && rp.length > 1) {
      const fr = ([x, y, z]) => (v.z <= 7 && z <= 7 ? [x - (v.z - z), y - (v.z - z)] : [x, y]);
      const at = (pt) => { const f = fr(pt); return [ox + (f[0] + 0.5) * s, oy + (f[1] + 0.5) * s]; };
      const alpha = (z) => routeAlpha(z, v.z);
      // Runs of tiles walked on one floor. The line goes onto stairs, holes and forcefields ('onto'); a ladder, grate
      // or rope spot used from next to it ('use') gets a short dashed line from where you stand.
      const runs = [], uses = [];
      let run = [rp[0]];
      for (let i = 1; i < rp.length; i++) {
        const how = rp[i][3];
        if (how === 'walk' || how === 'diagonal' || how === 'onto') run.push(rp[i]);
        else if (how === 'use') uses.push([rp[i - 1], rp[i]]);
        else { runs.push(run); run = [rp[i]]; }
      }
      runs.push(run);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const pass of [0, 1]) {
        for (const r of runs) {
          const here = r[0][2] === v.z, a = alpha(r[0][2]);
          if (r.length < 2 || !a || here !== (pass === 1)) continue;
          ctx.beginPath();
          r.forEach((pt, i) => { const [x, y] = at(pt); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
          if (here) {
            ctx.setLineDash([]);
            ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 5 * k; ctx.stroke();
            ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 3 * k; ctx.stroke();
          } else {
            ctx.globalAlpha = a;
            ctx.setLineDash([4 * k, 4 * k]);
            ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2 * k; ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }
      for (const [a, b] of uses) {
        const here = a[2] === v.z, al = alpha(a[2]), [ax, ay] = at(a), [bx, by] = at(b);
        if (!al) continue;
        ctx.globalAlpha = al;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
        ctx.setLineDash([3 * k, 3 * k]);
        if (here) { ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 4 * k; ctx.stroke(); }
        ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2 * k; ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.setLineDash([]);
      // A dot on its floor's visibility (none on floors not shown).
      const dot = (pt, color, r) => {
        const a = alpha(pt[2]);
        if (!a) return;
        const [x, y] = at(pt);
        ctx.globalAlpha = a;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = '#000'; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, r - k, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
        ctx.globalAlpha = 1;
      };
      // Passages (boat, carpet, the Oracle): an arc from where you talk to the NPC to where you arrive, curving to
      // the right of the direction of travel, solid when it starts or ends on this floor.
      for (let i = 1; i < rp.length; i++) {
        if (rp[i][3] !== 'npc') continue;
        const a = Math.max(alpha(rp[i - 1][2]), alpha(rp[i][2]));
        if (!a) continue;
        const [ax, ay] = at(rp[i - 1]), [bx, by] = at(rp[i]);
        const mx = (ax + bx) / 2, my = (ay + by) / 2, bend = 0.25;
        const cx = mx - (by - ay) * bend, cy = my + (bx - ax) * bend;
        const here = a === 1;
        ctx.globalAlpha = a;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(cx, cy, bx, by);
        ctx.setLineDash([8 * k, 5 * k]);
        if (here) { ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 5 * k; ctx.stroke(); }
        ctx.strokeStyle = '#7fd8ff'; ctx.lineWidth = (here ? 3 : 2) * k; ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.setLineDash([]);
      for (let i = 1; i < rp.length; i++) {
        const how = rp[i][3];
        if (how === 'walk' || how === 'diagonal' || how === 'onto' || how === 'use') continue;
        const up = rp[i][2] < rp[i - 1][2];
        // rp[i - 1] is the stairs, hole or ladder itself (5a), so the big dot sits on it.
        // Where you change floor (orange up, blue down), take a forcefield (purple) or a passage (light blue),
        // and a smaller dot where you arrive.
        const color = how === 'npc' ? '#7fd8ff' : how === 'teleport' ? '#b040ff' : up ? FLOOR_UP : FLOOR_DOWN;
        // A floor change gets an arrow (up or down) instead of the big dot.
        const a = alpha(rp[i - 1][2]);
        if (rp[i][2] !== rp[i - 1][2] && a) {
          const [x, y] = at(rp[i - 1]);
          ctx.globalAlpha = a;
          drawArrow(ctx, x, y, Math.max(12 * k, s * 0.5), up, k);
          ctx.globalAlpha = 1;
        } else dot(rp[i - 1], color, 5 * k);
        dot(rp[i], color, 3 * k);
      }
      dot(rp[0], '#30c030', 6 * k);
      dot(rp[rp.length - 1], '#e03030', 6 * k);
    }

    // Town names over the zoomed-out map (gone once the sprites show), centred on the temple, white in the
    // client's outlined font at whole screen pixels per font pixel (two client pixels each, so they stand out).
    if (v.zoom < SPRITES_FROM) {
      const fs = 2 * k, drawn = [];
      ctx.imageSmoothingEnabled = false;
      for (const t of world.places) {
        if (t.k !== 'town') continue;
        const [tx, ty] = t.p;
        if (tx < left - 64 || tx > right + 64 || ty < top - 64 || ty > bottom + 64) continue;
        const w = textWidth(world.font, t.n) * fs, h = 12 * fs;
        const lx = Math.round(ox + (tx + 0.5) * s - w / 2), ly = Math.round(oy + (ty + 0.5) * s - 8 * fs);
        // Skip a name that would overlap one already drawn (far out); it shows again when zoomed in.
        if (drawn.some((d) => lx < d.x + d.w && d.x < lx + w && ly < d.y + d.h && d.y < ly + h)) continue;
        drawn.push({ x: lx, y: ly, w, h });
        ctx.save();
        ctx.translate(lx, ly);
        ctx.scale(fs, fs);
        drawText(ctx, world.font, t.n, 0, 0, '#ffffff');
        ctx.restore();
      }
    }
    if (more) frame.current = requestAnimationFrame(draw);
  }, []);

  // The NPC drawn at canvas point p (its outfit, its tile or its name), or null. The front-most one wins.
  const npcAtPoint = (p) => {
    const world = worldRef.current, c = canvasRef.current, v = view.current, s = anim.current.s, b = viewBox.current;
    if (!world?.npcs || !c || !b) return null;
    const ox = Math.round(c.width / 2 - v.x * s), oy = Math.round(c.height / 2 - v.y * s);
    const k = Math.max(1, Math.round(window.devicePixelRatio || 1)), fs = Math.max(k, Math.round(s / 32));
    let hit = null;
    for (const { n, f } of visibleNpcs(world, v, b.left, b.top, b.right, b.bottom)) {
      const r = npcRect(n, f, ox, oy, s, k);
      const inPic = p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;
      const tx = ox + f[0] * s, ty = oy + f[1] * s;
      const inTile = p.x >= tx && p.x < tx + s && p.y >= ty && p.y < ty + s;
      let inName = false;
      if (v.zoom >= NAMES_FROM) {
        const w = textWidth(world.font, n.n) * fs, ny = Math.min(r.y, r.cy - 16 * r.sc) - 14 * fs;
        inName = p.x >= r.cx - w / 2 && p.x < r.cx + w / 2 && p.y >= ny && p.y < ny + 14 * fs;
      }
      if (inPic || inTile || inName) hit = n; // later = drawn on top
    }
    return hit;
  };

  // The monster drawn at canvas point p (its outfit or its tile), or null: { kind, group, ... }. The front one wins.
  const monsterAtPoint = (p) => {
    const world = worldRef.current, c = canvasRef.current, v = view.current, s = anim.current.s, b = viewBox.current;
    if (!world?.monSheet || !c || !b) return null;
    const ox = Math.round(c.width / 2 - v.x * s), oy = Math.round(c.height / 2 - v.y * s);
    const k = Math.max(1, Math.round(window.devicePixelRatio || 1));
    let hit = null;
    for (const m of visibleMonsters(world, v, b.left, b.top, b.right, b.bottom)) {
      const kd2 = world.monKinds[m.kind];
      if (!kd2.img) continue;
      const r = npcRect(kd2, m.f, ox, oy, s, k);
      const tx = ox + m.f[0] * s, ty = oy + m.f[1] * s;
      if ((p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h) || (p.x >= tx && p.x < tx + s && p.y >= ty && p.y < ty + s)) hit = m;
    }
    return hit;
  };

  // The searched monster (6d) at canvas point p (inside its ring), or null. This floor's first, then the nearest.
  const searchedAtPoint = (p) => {
    const world = worldRef.current, c = canvasRef.current, v = view.current, s = anim.current.s, b = viewBox.current;
    if (monSearch.current == null || !world?.monSheet || !c || !b) return null;
    const ox = Math.round(c.width / 2 - v.x * s), oy = Math.round(c.height / 2 - v.y * s);
    const k = Math.max(1, Math.round(window.devicePixelRatio || 1));
    let best = null, bestD = Infinity;
    for (const m of searchedMonsters(world, v, monSearch.current, b.left, b.top, b.right, b.bottom)) {
      const kd2 = world.monKinds[m.kind];
      if (!kd2.img) continue;
      const r = searchedRect(kd2, m.f, ox, oy, s, k), d = Math.hypot(p.x - r.cx, p.y - r.cy);
      if (d > r.r) continue;
      const score = d - (m.here ? 1e6 : 0);
      if (score < bestD) { bestD = score; best = m; }
    }
    return best;
  };

  // The quest chest at canvas point p (inside its ring), or null.
  const questAtPoint = (p) => {
    const world = worldRef.current, c = canvasRef.current, v = view.current, s = anim.current.s, b = viewBox.current;
    if (!world?.questChests || !c || !b) return null;
    const ox = Math.round(c.width / 2 - v.x * s), oy = Math.round(c.height / 2 - v.y * s);
    const k = Math.max(1, Math.round(window.devicePixelRatio || 1));
    for (const { c: ch, f } of visibleQuestChests(world, v, b.left, b.top, b.right, b.bottom)) {
      const r = questRing(f, ox, oy, s, k);
      if (Math.hypot(p.x - r.cx, p.y - r.cy) <= r.r) return ch;
    }
    return null;
  };

  // The locked door at canvas point p (its tile), or null.
  const doorAtPoint = (p) => {
    const world = worldRef.current, b = viewBox.current;
    if (!world?.doors || !b) return null;
    const t = tileAt(p);
    return visibleDoors(world, view.current, b.left, b.top, b.right, b.bottom).find(({ f }) => f[0] === t.x && f[1] === t.y)?.d || null;
  };

  const redraw = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(draw);
  }, [draw]);

  // Keep the view in the URL (shareable links), without flooding the history.
  const hashTimer = useRef(0);
  const viewChanged = useCallback(() => {
    redraw();
    const v = view.current;
    setUi((u) => (u.z === v.z && u.zoom === v.zoom && u.cut === v.cut ? u : { z: v.z, zoom: v.zoom, cut: v.cut }));
    if (!syncUrl) return;
    clearTimeout(hashTimer.current);
    hashTimer.current = setTimeout(() => {
      const h = `#${Math.floor(v.x)},${Math.floor(v.y)},${v.z},${v.zoom}`;
      if (window.location.hash !== h) window.history.replaceState(window.history.state, '', h); // keeps the Back marker
    }, 250);
  }, [redraw, syncUrl]);

  // ---------- loading ----------
  useEffect(() => {
    // "ready" belongs to this World only: React may run this twice (StrictMode in development, or a new dataUrl),
    // and a ready flag left over from the first one must not make the panel use the second one half-loaded.
    const world = new World(dataUrl, () => redraw());
    worldRef.current = world;
    setReady(false);
    world.load().then(() => {
      if (worldRef.current !== world) return; // replaced meanwhile
      const v = view.current;
      if (!world.floors.includes(v.z)) v.z = 7;
      if (DEBUG_WALK) world.loadWalk().then(() => redraw());
      world.loadLinks().catch(() => {}); // floor changes, for the hover preview (5d)
      world.isDoorOpen = (d) => doorOpen(doorsRef.current, d);
      setReady(true);
      viewChanged();
    }, (e) => { if (worldRef.current === world) setError(e.message); });
    return () => { worldRef.current = null; cancelAnimationFrame(frame.current); frame.current = 0; };
  }, [dataUrl, redraw, viewChanged]);

  // A link pasted into the same tab (only the hash changes) moves the view there.
  useEffect(() => {
    if (!syncUrl) return undefined;
    const onHash = () => {
      const h = readHash(), v = view.current;
      if (!h || (Math.floor(v.x) === Math.floor(h.x) && Math.floor(v.y) === Math.floor(h.y) && v.z === h.z && v.zoom === h.zoom)) return;
      Object.assign(v, withCut(h));
      anim.current = { s: h.zoom, anchor: null };
      viewChanged();
    };
    window.addEventListener('hashchange', onHash);
    // Back to an entry marked by pushBack: restore that place and its windows.
    const onPop = (e) => { if (e.state?.tmBack && backStack.current.length) restoreBackRef.current(); };
    window.addEventListener('popstate', onPop);
    return () => { window.removeEventListener('hashchange', onHash); window.removeEventListener('popstate', onPop); };
  }, [syncUrl, viewChanged]);

  // Canvas size follows the element, in device pixels.
  useEffect(() => {
    const el = wrapRef.current, canvas = canvasRef.current;
    if (!el || !canvas) return undefined;
    const ro = new ResizeObserver(() => {
      const r = window.devicePixelRatio || 1;
      canvas.width = Math.round(el.clientWidth * r);
      canvas.height = Math.round(el.clientHeight * r);
      redraw();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [redraw, ready]);

  // ---------- view changes ----------
  // sx, sy: the screen point zoomed around (default: the centre).
  const zoomBy = useCallback((steps, sx, sy) => {
    const v = view.current, canvas = canvasRef.current;
    const i = ZOOMS.indexOf(v.zoom), j = Math.max(0, Math.min(ZOOMS.length - 1, i + steps));
    if (i === j) return;
    sx ??= canvas.width / 2; sy ??= canvas.height / 2;
    const s = anim.current.s;
    const wx = v.x + (sx - canvas.width / 2) / s, wy = v.y + (sy - canvas.height / 2) / s;
    anim.current.anchor = { sx, sy, wx, wy };
    const before = v.zoom;
    flight.current = null;
    v.zoom = ZOOMS[j];
    mainLevel(before, wx, wy);
    viewChanged();
  }, [viewChanged]);

  // Crossing MAIN_FROM: zooming in goes to the main level of the place zoomed into ("this floor only");
  // zooming out brings the roofs back. Underground (after Ctrl + wheel) the floor stays as it is.
  const mainLevel = (before, x, y) => {
    const v = view.current;
    if (before < MAIN_FROM && v.zoom >= MAIN_FROM && v.z <= 7) { v.z = mainLevelAt(x, y); v.cut = v.z; }
    else if (before >= MAIN_FROM && v.zoom < MAIN_FROM && v.z <= 7) v.cut = 0;
  };

  // Depth (Ctrl + wheel, Ctrl + +/-): going in takes the top layer off the whole view (roofs first, then upper
  // floors); once only this floor is left, it goes a floor down, into the underground. Going out does the
  // same in reverse: up the underground floors to the ground floor (still without roofs), then the layers come
  // back. Floors with nothing on screen are skipped, so every step changes something.
  const layerBy = useCallback((dir) => {
    const v = view.current, world = worldRef.current, b = viewBox.current;
    if (!world || !b) return;
    const [x1, y1, x2, y2] = [b.left, b.top, b.right, b.bottom].map(Math.floor);
    const layers = v.z <= 7 ? world.layersIn(v.z, x1, y1, x2, y2) : [];
    const floorWithData = (from, step) => {
      for (let z = from; z >= 0 && z <= 15; z += step) if (world.floors.includes(z) && world.hasData(z, x1, y1, x2, y2)) return z;
      return -1;
    };
    if (dir > 0) {
      const f = layers.find((zz) => zz >= v.cut);
      if (f !== undefined) v.cut = f + 1; // take the next layer off
      else {
        const z = floorWithData(v.z + 1, 1); // only this floor left: go down
        if (z < 0) return;
        v.z = z; v.cut = z;
      }
    } else if (v.z > 7) {
      const z = floorWithData(v.z - 1, -1); // underground: go up (to the ground floor at most, without roofs)
      if (z < 0) return;
      v.z = z; v.cut = z;
    } else {
      if (!v.cut) return;
      const hidden = layers.filter((zz) => zz < v.cut);
      v.cut = hidden.length > 1 ? hidden[hidden.length - 1] : 0; // put the last layer back
    }
    viewChanged();
  }, [viewChanged]);

  const setFloor = useCallback((z) => {
    const world = worldRef.current;
    if (!world?.floors?.includes(z)) return; // also before the map has loaded
    view.current.z = z;
    view.current.cut = view.current.zoom >= MAIN_FROM ? z : 0; // zoomed in: this floor only
    viewChanged();
  }, [viewChanged]);

  const panBy = useCallback((dx, dy) => { // in device pixels
    const v = view.current, s = anim.current.s;
    flight.current = null;
    v.x -= dx / s; v.y -= dy / s;
    anim.current.anchor = null;
    viewChanged();
  }, [viewChanged]);

  // Flies the map to tile (x, y) on floor z at a zoom (default: at least FLY_ZOOM). Zoomed in on the surface it
  // shows that floor only, so the place isn't hidden under a roof; `cut` overrides that.
  const hashTimerFly = useRef(0);
  const goTo = useCallback((p, { zoom, cut } = {}) => {
    const v = view.current;
    if (worldRef.current?.floors.includes(p.z)) v.z = p.z;
    v.zoom = zoom ?? Math.max(v.zoom, FLY_ZOOM);
    v.cut = cut ?? (v.zoom >= MAIN_FROM && v.z <= 7 ? v.z : 0);
    anim.current.anchor = null;
    const dist = Math.hypot(p.x + 0.5 - v.x, p.y + 0.5 - v.y);
    const dur = Math.min(1000, 250 + dist * 2);
    flight.current = { fx: v.x, fy: v.y, tx: p.x + 0.5, ty: p.y + 0.5, t0: performance.now(), dur };
    viewChanged();
    clearTimeout(hashTimerFly.current);
    hashTimerFly.current = setTimeout(viewChanged, dur + 50); // the URL once it has arrived
  }, [viewChanged]);

  // ---------- route ----------
  // Back (6c). pushBack: remember where you are now (before a jump). With the URL in sync, the current history entry
  // is marked and a new one added, so the browser's back key comes back here too.
  const pushBack = () => {
    const st = backStack.current;
    st.push({ view: { ...view.current }, npc: selected.current, mon: selectedMon.current, door: selectedDoor.current, quest: selectedQuest.current, item: itemRef.current });
    if (st.length > 50) st.shift();
    setBackCount(st.length);
    if (syncUrl) {
      window.history.replaceState({ ...(window.history.state || {}), tmBack: true }, '', window.location.hash);
      window.history.pushState({}, '', window.location.hash);
    }
  };
  // Returns to the last place remembered: the exact view and the windows that were open.
  const restoreBack = () => {
    const sn = backStack.current.pop();
    setBackCount(backStack.current.length);
    if (!sn) return;
    flight.current = null;
    Object.assign(view.current, sn.view);
    anim.current = { s: sn.view.zoom, anchor: null };
    selected.current = sn.npc; setNpc(sn.npc);
    selectedMon.current = sn.mon; setMon(sn.mon);
    selectedDoor.current = sn.door; setDoor(sn.door);
    selectedQuest.current = sn.quest || null; setQuestSel(sn.quest || null);
    setItem(sn.item);
    viewChanged();
  };
  restoreBackRef.current = restoreBack;
  const goBack = () => (syncUrl ? window.history.back() : restoreBack());
  // A jump that Back can undo.
  const jump = (p, opts) => { pushBack(); goTo(p, opts); };
  // Monster search (6d): fit the view to every spawn of that kind, on the floor where most of them are.
  const fitMonsters = (kind) => {
    const world = worldRef.current, c = canvasRef.current;
    const pts = world?.spawnPoints.filter((sp) => sp.kind === kind) || [];
    if (!pts.length || !c) { redraw(); return; }
    const xs = pts.map((sp) => sp.p[0]), ys = pts.map((sp) => sp.p[1]);
    const x1 = Math.min(...xs), x2 = Math.max(...xs), y1 = Math.min(...ys), y2 = Math.max(...ys);
    const fit = [...ZOOMS].reverse().find((zz) => zz <= MAIN_FROM && (x2 - x1 + 10) * zz <= c.width * 0.9 && (y2 - y1 + 10) * zz <= c.height * 0.9) ?? ZOOMS[0];
    const perFloor = new Map();
    for (const sp of pts) perFloor.set(sp.p[2], (perFloor.get(sp.p[2]) || 0) + sp.amount);
    const z = [...perFloor].sort((a, b) => b[1] - a[1])[0][0];
    jump({ x: Math.round((x1 + x2) / 2), y: Math.round((y1 + y2) / 2), z }, { zoom: fit, cut: fit >= MAIN_FROM && z <= 7 ? z : 0 });
  };

  // Shows the whole route: centred, at the closest zoom where it fits, on the floor it starts on.
  const showRoute = useCallback((path) => {
    const c = canvasRef.current;
    if (!path?.length || !c) return;
    const xs = path.map((pt) => pt[0]), ys = path.map((pt) => pt[1]);
    const x1 = Math.min(...xs), x2 = Math.max(...xs), y1 = Math.min(...ys), y2 = Math.max(...ys);
    const fit = [...ZOOMS].reverse().find((z) => z <= FLY_ZOOM && (x2 - x1 + 6) * z <= c.width * 0.9 && (y2 - y1 + 6) * z <= c.height * 0.9) ?? ZOOMS[0];
    const z0 = path[0][2];
    goTo({ x: Math.round((x1 + x2) / 2), y: Math.round((y1 + y2) / 2), z: z0 }, { zoom: fit, cut: fit >= MAIN_FROM && z0 <= 7 ? z0 : 0 });
  }, [goTo]);

  // Sets the start and/or destination (each { label, pos } or null) and finds the route once both are set.
  // keepView: search again without moving the view (doors unlocked, level changed).
  const routeSeq = useRef(0);
  const updateRoute = useCallback((change, keepView = false) => {
    setRoute((old) => {
      const r = { ...old, ...change, open: true };
      routePath.current = null;
      if (r.from && r.to) {
        const seq = ++routeSeq.current;
        r.busy = true; r.result = null;
        router.current ||= createRouter(dataUrl);
        const speed = speedOf(charRef.current); // the time shown is worked out again when the settings change
        router.current.route(r.from.pos, r.to.pos, speed, Number(charRef.current.level) || 1, doorsRef.current).then((res) => {
          if (seq !== routeSeq.current) return; // a newer request
          const path = res.routes?.[0].path || null;
          routePath.current = path;
          setRoute((cur) => ({ ...cur, busy: false, result: res, pick: 0 }));
          if (path && !keepView) showRoute(path); else redraw();
        });
      } else { r.busy = false; r.result = null; }
      redraw();
      return r;
    });
  }, [dataUrl, redraw, showRoute]);
  useEffect(() => () => router.current?.terminate(), []);
  // Shows the fastest or the cheapest route.
  const pickRoute = (i) => {
    const path = route.result?.routes?.[i]?.path;
    if (!path) return;
    routePath.current = path;
    setRoute((cur) => ({ ...cur, pick: i }));
    showRoute(path);
  };
  // The Oracle needs level 8: search again when the level crosses it.
  const oracleLevel = Number(char.level) >= 8;
  const routeRef = useRef(route);
  routeRef.current = route;
  // ... and when doors are unlocked or locked.
  const doorsKey = `${doors.all}:${doors.open.join(';')}`;
  useEffect(() => {
    if (routeRef.current.from && routeRef.current.to) updateRoute({}, true);
  }, [oracleLevel, doorsKey, updateRoute]);
  const clearRoute = () => { routePath.current = null; setRoute({ open: false, from: null, to: null, result: null, pick: 0, busy: false }); redraw(); };

  const selectNpc = useCallback((n) => {
    selected.current = n;
    setNpc(n);
    if (n) { setItem(null); selectedDoor.current = null; setDoor(null); selectedMon.current = null; setMon(null); selectedQuest.current = null; setQuestSel(null); }
    redraw();
  }, [redraw]);
  // Opens the monster window ({ kind | 'all', group }) or closes it (null).
  const selectMonster = useCallback((m) => {
    selectedMon.current = m;
    setMon(m);
    if (m) { setItem(null); selected.current = null; setNpc(null); selectedDoor.current = null; setDoor(null); selectedQuest.current = null; setQuestSel(null); }
    redraw();
  }, [redraw]);
  // Opens the quest window for a quest chest, or closes it (null).
  const selectQuest = useCallback((c) => {
    selectedQuest.current = c;
    setQuestSel(c);
    if (c) { setItem(null); selected.current = null; setNpc(null); selectedDoor.current = null; setDoor(null); selectedMon.current = null; setMon(null); }
    redraw();
  }, [redraw]);
  const selectDoor = useCallback((d) => {
    selectedDoor.current = d;
    setDoor(d);
    if (d) { setItem(null); selected.current = null; setNpc(null); selectedMon.current = null; setMon(null); selectedQuest.current = null; setQuestSel(null); }
    redraw();
  }, [redraw]);
  // Unlocking and locking: the doors are drawn again (open or closed) and the route searched again.
  const setDoors = (st) => {
    doorsRef.current = st;
    setDoorsState(st);
    try { window.localStorage.setItem('tm-doors', JSON.stringify(st)); } catch { /* storage blocked: fine */ }
    worldRef.current?.doorsChanged();
    redraw();
  };
  const toggleDoor = (d) => {
    const u = doorUnit(d), st = doorsRef.current;
    setDoors({ ...st, open: st.open.includes(u) ? st.open.filter((x) => x !== u) : [...st.open, u] });
  };

  // ---------- pointer: drag to pan (with a little glide), wheel/pinch to zoom ----------
  const pointers = useRef(new Map());
  const drag = useRef(null);
  const glide = useRef(0);

  const toCanvas = (e) => {
    const r = canvasRef.current.getBoundingClientRect(), k = canvasRef.current.width / r.width;
    return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
  };
  const tileAt = (p) => {
    const v = view.current, s = anim.current.s, c = canvasRef.current;
    return { x: Math.floor(v.x + (p.x - c.width / 2) / s), y: Math.floor(v.y + (p.y - c.height / 2) / s), z: v.z };
  };

  const onPointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    cancelAnimationFrame(glide.current);
    flight.current = null;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, toCanvas(e));
    if (pointers.current.size === 1) drag.current = { last: toCanvas(e), start: toCanvas(e), moved: false, t: performance.now(), vx: 0, vy: 0 };
    else if (pointers.current.size === 2) {
      const [p, q] = [...pointers.current.values()];
      drag.current = { pinch: Math.hypot(p.x - q.x, p.y - q.y), s0: anim.current.s, zoom0: view.current.zoom };
    }
  };

  // The floor change at canvas point p, for the hover preview and a click to that floor (with or without a route),
  // zoomed in far enough to see the sprites. Null otherwise.
  const floorChangeAtPoint = (p) => {
    const world = worldRef.current, v = view.current;
    if (!world?.links || v.zoom < SPRITES_FROM) return null;
    const t = tileAt(p);
    const l = world.floorChangeAt(t.x, t.y, v.z);
    return l && world.floors.includes(l[5]) ? l : null;
  };
  const setHoverLink = (l) => {
    if (l === hoverLink.current) return;
    hoverLink.current = l;
    redraw();
  };

  const onPointerMove = (e) => {
    const p = toCanvas(e);
    if (!pointers.current.has(e.pointerId)) {
      setHover(tileAt(p));
      const l = floorChangeAtPoint(p);
      setHoverLink(l);
      if (e.pointerType === 'mouse') e.currentTarget.style.cursor = npcAtPoint(p) || searchedAtPoint(p) || questAtPoint(p) || monsterAtPoint(p) || doorAtPoint(p) || l ? 'pointer' : '';
      return;
    }
    setHoverLink(null);
    pointers.current.set(e.pointerId, p);
    const d = drag.current;
    if (!d) return;
    if (d.pinch && pointers.current.size === 2) {
      // Pinch: follow the fingers smoothly; snap to the nearest zoom step when they lift.
      const [a, b] = [...pointers.current.values()];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const s = Math.max(ZOOMS[0], Math.min(ZOOMS[ZOOMS.length - 1], d.s0 * Math.hypot(a.x - b.x, a.y - b.y) / d.pinch));
      const v = view.current, c = canvasRef.current, old = anim.current.s;
      const wx = v.x + (mid.x - c.width / 2) / old, wy = v.y + (mid.y - c.height / 2) / old;
      anim.current.s = s; v.zoom = s;
      v.x = wx - (mid.x - c.width / 2) / s; v.y = wy - (mid.y - c.height / 2) / s;
      d.mid = mid;
      redraw();
    } else if (!d.pinch) {
      const now = performance.now(), dt = Math.max(1, now - d.t);
      const dx = p.x - d.last.x, dy = p.y - d.last.y;
      if (Math.hypot(p.x - d.start.x, p.y - d.start.y) > 6) d.moved = true;
      d.vx = 0.8 * (dx / dt) + 0.2 * d.vx; d.vy = 0.8 * (dy / dt) + 0.2 * d.vy;
      d.last = p; d.t = now;
      panBy(dx, dy);
    }
  };

  const onPointerUp = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    const d = drag.current;
    if (d?.pinch) {
      const v = view.current, c = canvasRef.current, mid = d.mid || { x: c.width / 2, y: c.height / 2 };
      const s = anim.current.s;
      anim.current.anchor = { sx: mid.x, sy: mid.y, wx: v.x + (mid.x - c.width / 2) / s, wy: v.y + (mid.y - c.height / 2) / s };
      const before = d.zoom0 ?? v.zoom;
      v.zoom = nearestZoom(s);
      mainLevel(before, anim.current.anchor.wx, anim.current.anchor.wy);
      drag.current = null;
      viewChanged();
      return;
    }
    drag.current = null;
    if (d && !d.moved) {
      // A click: open the NPC there, else the monster, else the locked door, else go to the floor a hole, stairs or
      // ladder leads to, else close.
      const p = toCanvas(e), n = npcAtPoint(p), sm = !n && searchedAtPoint(p), qc = !n && !sm && questAtPoint(p);
      const m = !n && !sm && !qc && monsterAtPoint(p);
      const dr = !n && !sm && !qc && !m && doorAtPoint(p), l = !n && !sm && !qc && !m && !dr && floorChangeAtPoint(p);
      if (n) selectNpc(n);
      else if (qc) selectQuest(qc);
      else if (sm) {
        // A searched monster: on another floor, go to it there (Back returns); then its window.
        if (!sm.here) jump({ x: sm.p[0], y: sm.p[1], z: sm.p[2] }, { zoom: Math.max(view.current.zoom, MAIN_FROM) });
        selectMonster({ kind: sm.kind, group: sm.group });
      }
      else if (m) selectMonster({ kind: m.kind, group: m.group });
      else if (l) { setHoverLink(null); setFloor(l[5]); }
      else { selectNpc(null); selectMonster(null); selectQuest(null); selectDoor(dr || null); }
      return;
    }
    if (d && performance.now() - d.t < 80) {
      // Glide on after a flick, slowing down.
      let { vx, vy } = d, t = performance.now();
      const step = () => {
        const now = performance.now(), dt = now - t; t = now;
        vx *= Math.pow(0.994, dt); vy *= Math.pow(0.994, dt);
        if (Math.hypot(vx, vy) < 0.05) return;
        panBy(vx * dt, vy * dt);
        glide.current = requestAnimationFrame(step);
      };
      glide.current = requestAnimationFrame(step);
    }
  };

  // Wheel: one zoom step per notch (trackpads add up small deltas); Ctrl + wheel: one layer per notch
  // (forward = take the top layer off). Not passive, so the page neither scrolls nor zooms.
  const wheelAcc = useRef({ v: 0, ctrl: false });
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const acc = wheelAcc.current;
      if (acc.ctrl !== e.ctrlKey) { acc.v = 0; acc.ctrl = e.ctrlKey; }
      acc.v += e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
      if (Math.abs(acc.v) < 50) return;
      const dir = acc.v < 0 ? 1 : -1;
      acc.v = 0;
      if (e.ctrlKey) layerBy(dir);
      else { const p = toCanvas(e); zoomBy(dir, p.x, p.y); }
    };
    c.addEventListener('wheel', onWheel, { passive: false });
    return () => c.removeEventListener('wheel', onWheel);
  }, [zoomBy, layerBy, ready]);

  const onKeyDown = (e) => {
    if (e.target.tagName === 'INPUT') return;
    const c = canvasRef.current, step = Math.min(c.width, c.height) / 4;
    if (e.ctrlKey && ['+', '=', '-'].includes(e.key)) { // Ctrl + +/-: depth, like Ctrl + wheel (not the page zoom)
      e.preventDefault();
      layerBy(e.key === '-' ? -1 : 1);
      return;
    }
    const keys = {
      ArrowLeft: () => panBy(step, 0), ArrowRight: () => panBy(-step, 0),
      ArrowUp: () => panBy(0, step), ArrowDown: () => panBy(0, -step),
      '+': () => zoomBy(1), '=': () => zoomBy(1), '-': () => zoomBy(-1),
      PageUp: () => setFloor(view.current.z - 1), PageDown: () => setFloor(view.current.z + 1),
    };
    if (keys[e.key]) { e.preventDefault(); keys[e.key](); }
  };

  // The client's compass rose: click a direction to move the view half a screen that way.
  const onRose = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const c = canvasRef.current, ang = Math.atan2(dy, dx);
    const ux = Math.round(Math.cos(ang)), uy = Math.round(Math.sin(ang));
    panBy(-ux * c.width / 2, -uy * c.height / 2);
  };

  // ---------- search ----------
  const onQuery = (text) => {
    setQuery(text);
    if (!text.trim() && monSearch.current != null) { monSearch.current = null; redraw(); } // clearing the search ends it
    setResults(worldRef.current ? worldRef.current.search(text) : []);
    setActive(0);
  };
  // Opens a search result: flies there (and opens the NPC), or opens the item window.
  const pick = (r) => {
    if (!r) return;
    setResults([]);
    setQuery(r.name);
    monSearch.current = r.kind === 'Monster' ? r.mon : null;
    if (r.kind === 'Monster') { fitMonsters(r.mon); return; }
    if (r.kind === 'Quest') {
      const c = worldRef.current.questChests.find((x) => x.quest === r.quest);
      if (c) { jump({ x: c.p[0], y: c.p[1], z: c.p[2] }); selectQuest(c); }
      return;
    }
    redraw();
    if (r.kind === 'Position') jump(r.pos);
    else if (r.kind === 'NPC') { jump({ x: r.npc.p[0], y: r.npc.p[1], z: r.npc.p[2] }); selectNpc(r.npc); }
    else if (r.kind === 'Depot' || r.kind === 'Location') jump({ x: r.place.p[0], y: r.place.p[1], z: r.place.p[2] });
    else if (r.kind === 'Item') { selectNpc(null); selectDoor(null); setItem(r.item); }
    else {
      // A town or place: an overview with the roofs on, from its temple (the surface, unless it's underground).
      const [x, y, z] = r.place.p;
      jump({ x, y, z: z > 7 ? z : 7 }, { zoom: 16, cut: 0 });
    }
  };
  const onSearchKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Escape') setResults([]);
  };
  const onSearch = (e) => {
    e.preventDefault();
    pick(results[active] || worldRef.current?.search(query)[0]);
  };

  const world = ready ? worldRef.current : null; // only once loaded: a half-loaded map has no floors, places, ... yet
  const skin = { '--tm-stone': `url(${dataUrl}/stone.png)`, '--tm-gui': `url(${dataUrl}/gui.png)` };
  if (error) return <div className="tm tm-loading" style={{ height }}>Could not load the map: {error}</div>;

  return (
    <div className="tm" style={{ ...skin, height }}>
      <div className="tm-map" ref={wrapRef} tabIndex={0} onKeyDown={onKeyDown}>
        <canvas
          ref={canvasRef} className="tm-canvas"
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          onPointerLeave={() => { setHover(null); setHoverLink(null); }}
          onContextMenu={(e) => {
            e.preventDefault();
            const r = wrapRef.current.getBoundingClientRect(), t = tileAt(toCanvas(e));
            setMenu({ x: e.clientX - r.left, y: e.clientY - r.top, tile: [t.x, t.y, t.z] });
          }}
        />
        {!ready && <div className="tm-loading">Loading map...</div>}
        {menu && (
          <>
            <div className="tm-menu-catcher" onPointerDown={() => setMenu(null)} onContextMenu={(e) => { e.preventDefault(); setMenu(null); }} />
            <div className="tm-menu-at" style={{ left: menu.x, top: menu.y }}>
            <div className="tm-menu" style={{ zoom: uiScale / dpr }}>
              {menu.adding ? (
                // A name for this square: Enter or Add saves it, Escape cancels.
                <form className="tm-menu-add" onSubmit={(e) => { e.preventDefault(); if (locName.trim()) saveLocation({ add: { n: locName.trim(), p: menu.tile } }); setMenu(null); }}>
                  <input
                    className="tm-input" autoFocus value={locName} maxLength={60} placeholder="Name of this location"
                    onChange={(e) => setLocName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') setMenu(null); }}
                  />
                  <button type="submit" className="tm-btn" disabled={!locName.trim()}>Add</button>
                </form>
              ) : [
                ['Route from here', () => updateRoute({ from: { label: menu.tile.join(', '), pos: menu.tile } })],
                ['Route to here', () => updateRoute({ to: { label: menu.tile.join(', '), pos: menu.tile } })],
                ...(route.from || route.to ? [['Clear route', clearRoute]] : []),
                ...(world?.customEditable ? [['Add location here', () => { setLocName(''); setMenu({ ...menu, adding: true }); }, true]] : []),
                ...(world?.customEditable ? world.customAt(...menu.tile).map((n) => [`Remove '${n}'`, () => saveLocation({ remove: { n, p: menu.tile } })]) : []),
              ].map(([label, act, keepOpen]) => (
                <button type="button" key={label} className="tm-menu-item" onClick={() => { if (!keepOpen) setMenu(null); act(); }}>{label}</button>
              ))}
            </div>
            </div>
          </>
        )}
      </div>
      <div className="tm-side" style={{ zoom: uiScale / dpr }}>
        <div className="tm-panel">
          <div className="tm-nav">
            <button type="button" className="tm-rose" onClick={onRose} title="Move the view (or use the arrow keys)" aria-label="Move the view" />
            <button type="button" className="tm-gbtn tm-gbtn-zoomout" onClick={() => zoomBy(-1)} disabled={ui.zoom === ZOOMS[0]} title="Zoom out (-)" aria-label="Zoom out" />
            <button type="button" className="tm-gbtn tm-gbtn-up" onClick={() => setFloor(ui.z - 1)} disabled={!world?.floors?.includes(ui.z - 1)} title="Floor up (Page Up)" aria-label="Floor up" />
            <button type="button" className="tm-gbtn tm-gbtn-zoomin" onClick={() => zoomBy(1)} disabled={ui.zoom === ZOOMS[ZOOMS.length - 1]} title="Zoom in (+)" aria-label="Zoom in" />
            <button type="button" className="tm-gbtn tm-gbtn-down" onClick={() => setFloor(ui.z + 1)} disabled={!world?.floors?.includes(ui.z + 1)} title="Floor down (Page Down)" aria-label="Floor down" />
          </div>
          <div className="tm-info">
            <div>Floor {ui.z}{ui.z === 7 ? ' (ground)' : ui.z < 7 ? ` (+${7 - ui.z})` : ` (-${ui.z - 7})`}</div>
            <div title="Ctrl + mouse wheel (or Ctrl + +/-): take layers off and go underground, or come back up">
              {ui.z > 7 || ui.cut >= ui.z ? 'This floor only' : ui.cut ? `Layers from floor ${ui.cut}` : 'All layers'}
            </div>
            <div className="tm-pos">{hover ? `${hover.x}, ${hover.y}, ${hover.z}` : ' '}</div>
          </div>
        </div>
        <form className="tm-panel tm-goto" onSubmit={onSearch} role="search">
          <div className="tm-search-head">
            <label htmlFor="tm-search">Search</label>
            <span className="tm-search-btns">
              <button type="button" className="tm-btn" onClick={goBack} disabled={!backCount} title="Back to where you were (or the browser's back key)">Back</button>
              <button type="button" className="tm-btn" onClick={() => setRoute((r) => ({ ...r, open: true }))} title="Plan a route (or right-click the map)">Route</button>
            </span>
          </div>
          <input
            id="tm-search" className="tm-input" value={query} placeholder="Town, NPC, item or x, y, z"
            onChange={(e) => onQuery(e.target.value)} onKeyDown={onSearchKey} onBlur={() => setTimeout(() => setResults([]), 150)}
            onFocus={() => query && onQuery(query)} spellCheck={false} autoComplete="off"
          />
          {results.length > 0 && (
            <div className="tm-results" role="listbox">
              {results.map((r, i) => (
                <button
                  type="button" key={`${r.kind}:${r.name}:${i}`} role="option" aria-selected={i === active}
                  className={i === active ? 'tm-result tm-active' : 'tm-result'}
                  onMouseDown={(e) => { e.preventDefault(); pick(r); }} onMouseEnter={() => setActive(i)}
                >
                  <span className="tm-offer-name">{r.name}</span>
                  <span className="tm-result-kind">{r.kind}</span>
                </button>
              ))}
            </div>
          )}
        </form>
        {locNote && <div className="tm-panel tm-error">{locNote}</div>}
        {route.open && world && (
          <RoutePanel
            world={world} route={route} char={char} onChar={setChar}
            onFrom={(pt) => updateRoute({ from: pt })} onTo={(pt) => updateRoute({ to: pt })}
            onSwap={() => updateRoute({ from: route.to, to: route.from })}
            onShow={() => showRoute(route.result?.routes?.[route.pick]?.path)} onPick={pickRoute}
            onClose={clearRoute} doorsAll={doors.all} onDoorsAll={(all) => setDoors({ ...doors, all })}
          />
        )}
        {questSel && world && (
          <QuestWindow world={world} chest={questSel} onItem={(id) => setItem({ id, fluid: null })} onClose={() => selectQuest(null)} />
        )}
        {mon && world && (
          <MonsterWindow
            world={world} sel={mon} onPick={(kind) => selectMonster({ ...mon, kind })}
            onItem={(id) => setItem({ id, fluid: null })} onClose={() => selectMonster(null)}
          />
        )}
        {door && world && (
          <DoorWindow
            world={world} door={door} open={doorOpen(doors, door)} all={doors.all}
            same={door.key ? world.doors.filter((x) => x.key === door.key).length : 1}
            onToggle={() => toggleDoor(door)} onAll={(all) => setDoors({ ...doors, all })} onClose={() => selectDoor(null)}
          />
        )}
        {npc && world && (
          <NpcWindow
            world={world} npc={npc} onClose={() => selectNpc(null)} onTravel={(t) => jump({ x: t[2], y: t[3], z: t[4] })}
            onRoute={() => updateRoute({ to: { label: npc.n, pos: npc.p } })}
          />
        )}
        {item && world && (
          <ItemWindow
            world={world} item={item} onClose={() => setItem(null)}
            onNpc={(n) => { jump({ x: n.p[0], y: n.p[1], z: n.p[2] }); selectNpc(n); }}
          />
        )}
      </div>
    </div>
  );
}

