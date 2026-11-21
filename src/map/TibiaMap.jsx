// Tibia Map: a Google Maps-style viewer of the Tibia 7.1 world, drawn with the real game sprites.
// Props: dataUrl (where the converted map data lives), height (CSS height of the map), syncUrl (keep the view in the URL hash).
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { World } from './engine/world.js';
import NpcWindow from './NpcWindow.jsx';
import NpcTalk from './NpcTalk.jsx';
import DoorWindow from './DoorWindow.jsx';
import MonsterWindow from './MonsterWindow.jsx';
import QuestWindow from './QuestWindow.jsx';
import QuestList from './QuestList.jsx';
import ItemWindow from './ItemWindow.jsx';
import RoutePanel, { speedOf, climbOf } from './RoutePanel.jsx';
import { createRouter, routeTime } from './engine/router.js';
import { drawText, textWidth } from './engine/text.js';
import { questDbConfig, questOn, setQuestOn } from './engine/questdb.js';
import { restoreLoginHash, watchLogin, isEditor, logIn, logOut, saveQuest } from './engine/questauth.js';
import * as qg from './engine/questguide.js';
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

// Places the conversation window el (NpcTalk) next to NPC n on the map: right of its tile, or left when there's no
// room, its top level with the NPC's tile, kept inside the map. Hidden while the NPC is out of view or on a floor that
// isn't shown. v, ox, oy, s, W, H: the view as draw() has it (canvas pixels); el is in CSS pixels.
function placeTalk(el, n, v, ox, oy, s, W, H) {
  if (!el || !n) return;
  const f = npcFrame(n, v.z, v.cut);
  const d = window.devicePixelRatio || 1;
  const x1 = (ox + f?.[0] * s) / d, x2 = x1 + s / d, y1 = (oy + f?.[1] * s) / d;
  const cw = W / d, ch = H / d;
  if (!f || x2 < 0 || x1 > cw || y1 + s / d < 0 || y1 > ch) { el.style.visibility = 'hidden'; return; }
  const win = el.firstChild, z = parseFloat(win.style.zoom) || 1;
  win.style.maxHeight = `${Math.max(120, Math.min(380, (ch - 8) / z))}px`; // at most the map's height
  const r = el.getBoundingClientRect(), gap = 8;
  let left = x2 + gap;
  if (left + r.width > cw - 4) left = x1 - gap - r.width;
  left = Math.max(4, Math.min(cw - r.width - 4, left));
  const top = Math.max(4, Math.min(ch - r.height - 4, y1)); // level with the tile: the name above stays clear
  el.style.visibility = 'visible';
  el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
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
// User 2026-11-15: better without ("maybe that feature is just not worth it"): false = the route only on the floor you're
// looking at, no see-through band (5c) and no lines/dots on other floors (5b). true brings both back.
const ROUTE_OTHER_FLOORS = false;
// User 2026-11-21: the quest route (a guide's segment, 13e) does show on other floors, dashed (the Route panel's route not).
// User 2026-11-15: on the surface or above it, the route on every surface floor (0-7) always shows, the parts on
// other floors than yours dashed, at this alpha (also behind you; underground parts don't show).
const ROUTE_SURFACE_ALPHA = 0.8;
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

// Only the way ahead (user): a stretch on another floor shows (see-through and its route line) only when the route
// has already been on floor vz before it, so you see where you're going, not where you came from; and only up to
// SEE_CHANGES floor changes after leaving this floor (down, down again: shown; back up after that: not yet). Back on
// this floor, the count starts again. { ahead: per path entry 1 = this floor or ahead, onRoute: the route is on vz }
function routeAhead(rp, vz) {
  const ahead = new Uint8Array(rp.length);
  let been = false, changes = 0;
  for (let i = 0; i < rp.length; i++) {
    const z = rp[i][2];
    if (z === vz) { been = true; changes = 0; ahead[i] = 1; continue; }
    if (i > 0 && z !== rp[i - 1][2]) changes++;
    ahead[i] = been && changes <= SEE_CHANGES ? 1 : 0;
  }
  return { ahead, onRoute: been };
}

// See-through along the route (5c): the floors ahead on the route, in a band along it.
function seeThrough(ctx, world, v, rp, g, budget, offRef) {
  const floors = new Map(); // floor -> route tiles on it
  const { ahead } = routeAhead(rp, v.z);
  for (let i = 0; i < rp.length; i++) {
    const e = rp[i], z = e[2], dz = Math.abs(z - v.z);
    if (!dz || !ahead[i] || dz > 2) continue;
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

// Monsters (6b): from MONSTERS_FROM, only the ones on the floor you are on, on the surface too (unlike NPCs, which
// show from every surface floor drawn). User 2026-11-15: at Darashia's minotaurs you couldn't tell which floor a
// monster was on; this replaces the earlier "dragons on floor 6 above Edron must show": go up a floor, or search for
// them (searchedMonsters shows every floor). Zoomed out, the monsters of one kind spawning
// close together are one marker with a count ("3x"); from MONSTERS_SPLIT each one stands on its own tile, spread
// over its spawn's radius from the centre outwards (the server picks random tiles in the radius; this is a stand-in).
// "The floor you are on" is the top floor drawn: on the surface Ctrl + wheel puts layers back (floors above, drawn
// shifted up-left) without changing v.z, and then the monsters of that top layer show (user 2026-11-15: stairs
// worked, the wheel didn't). With all layers (cut 0, the zoomed-out overview) it stays the view's own floor.
const MONSTERS_FROM = 16, MONSTERS_SPLIT = 64;
function monsterFloor(world, v, left, top, right, bottom) {
  if (v.z > 7 || !v.cut || v.cut >= v.z) return v.z;
  const above = world.layersIn(v.z, Math.floor(left), Math.floor(top), Math.floor(right), Math.floor(bottom));
  return above.find((zz) => zz >= v.cut) ?? v.z;
}
const monFrame = (m, v, mz) => (m.p[2] === mz ? npcFrame(m, v.z, v.cut) : null);
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
  const mz = monsterFloor(world, v, left, top, right, bottom);
  if (v.zoom < MONSTERS_SPLIT) {
    for (const mk of world.monMarkers) {
      const f = monFrame(mk, v, mz);
      if (f && inView(f[0], f[1], 3)) out.push({ kind: mk.kind, f, count: mk.count, group: mk.group });
    }
  } else {
    for (const sp of world.spawnPoints) {
      const f = monFrame(sp, v, mz);
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

// A Reward step's ring (13i; it was the old quest chests' ring): centre and radius on the canvas.
const questRing = (f, ox, oy, s, k) => ({ cx: ox + (f[0] + 0.5) * s, cy: oy + (f[1] + 0.5) * s, r: Math.max(9 * k, s * 0.55) });

// The guide's step markers (13d-2), from zoom STEPS_FROM: a circle over the step's tile; the step you're on larger.
const STEPS_FROM = 4;
const stepRing = (f, ox, oy, s, k, state) => ({
  cx: ox + (f[0] + 0.5) * s, cy: oy + (f[1] + 0.5) * s, r: Math.max((state === 'cur' ? 10 : 8) * k, s * (state === 'cur' ? 0.6 : 0.45)),
});

// The character's settings before the user changes them (user, 2026-11-13).
// levitate / parcels: may routes climb and drop with exani hur up/down or 3 parcels (slice 11; off by default).

const CHAR_DEFAULT = { level: 8, haste: 'none', boh: false, levitate: false, parcels: false };

// The layer cut for a view opened at a zoom: zoomed in on the surface, that floor only (see MAIN_FROM).
const withCut = (v) => ({ ...v, cut: v.zoom >= MAIN_FROM && v.z <= 7 ? v.z : 0 });

// Minimap: at the top of the side panel, where the client has it, in place of the compass rose. Size in client
// pixels (inside its 1px border). Like the client's, it shows the map's floor only, one automap colour per tile
// (minimap/ in the map data), and follows the map's zoom: at zoom 32 it has 1 client pixel per tile (the client's
// own minimap scale), and further out it stops once the whole world fits.
const MINI_W = 158, MINI_H = 158;
const MINI_PER_TILE = 32; // map zoom (screen pixels per tile) for 1 client pixel per tile on the minimap

// Draws the minimap: the floor shown on the map, centred on the map's centre (but not past the world's edge), and
// the map's view as a white frame. Returns where it drew the world ({ ox, oy, sm }: canvas origin and canvas
// pixels per tile), for clicks and drags on it.
function drawMini(mc, world, v, s, box) {
  const k = Math.max(1, Math.round(window.devicePixelRatio || 1));
  const ctx = mc.getContext('2d'), W = mc.width, H = mc.height, b = world.bounds;
  const bw = b.x2 + 1 - b.x1, bh = b.y2 + 1 - b.y1;
  const sm = Math.max((s * k) / MINI_PER_TILE, Math.min(W / bw, H / bh));
  const centre = (len, lo, hi, c) => (hi - lo <= len ? (lo + hi) / 2 : Math.max(lo + len / 2, Math.min(hi - len / 2, c)));
  const cx = centre(W / sm, b.x1, b.x2 + 1, v.x), cy = centre(H / sm, b.y1, b.y2 + 1, v.y);
  const ox = Math.round(W / 2 - cx * sm), oy = Math.round(H / 2 - cy * sm);
  const left = -ox / sm, top = -oy / sm, right = left + W / sm, bottom = top + H / sm;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  // The floor's automap colours, 1 px per tile in each image: sharp squares when zoomed in, smoothed when shrunk.
  const S = world.map.minimap?.size || 256; // tiles per image
  ctx.imageSmoothingEnabled = sm < 1;
  for (let my = Math.floor(top / S); my <= Math.floor(bottom / S); my++) {
    for (let mx = Math.floor(left / S); mx <= Math.floor(right / S); mx++) {
      const img = world.minimap(v.z, mx, my);
      if (img) ctx.drawImage(img, ox + mx * S * sm, oy + my * S * sm, S * sm, S * sm);
    }
  }
  // The map's view.
  if (box) {
    const x1 = Math.round(ox + box.left * sm), y1 = Math.round(oy + box.top * sm);
    const x2 = Math.round(ox + box.right * sm), y2 = Math.round(oy + box.bottom * sm);
    ctx.lineWidth = k;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(x1 + k / 2, y1 + k / 2, Math.max(k, x2 - x1 - k), Math.max(k, y2 - y1 - k));
  }
  return { ox, oy, sm };
}

// supabaseUrl + supabaseKey (the public key, as for the house planner): the quest database (slice 13b).
export default function TibiaMap({ dataUrl = '/map-data', height = '80vh', syncUrl = true, supabaseUrl, supabaseKey }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const miniRef = useRef(null); // the minimap canvas
  const mini = useRef(null); // where the minimap drew the world last: { ox, oy, sm }
  const worldRef = useRef(null);
  // x, y = centre in tiles (fractional); z; zoom = target step; cut = top layer drawn (floors above it are left out, 0 = all)
  // (the return from the editors' Discord login lost the place in the URL: put it back first, slice 13c)
  const view = useRef(null);
  if (!view.current) { if (syncUrl) restoreLoginHash(); view.current = withCut({ ...START, ...(syncUrl && readHash()) }); }
  const anim = useRef({ s: view.current.zoom, anchor: null }); // shown scale (animates to view.zoom)
  const frame = useRef(0);
  const viewBox = useRef(null); // the tile area on screen, from the last draw
  const selected = useRef(null); // the NPC whose window is open (drawn with a frame)
  // The NPC whose conversation window is open next to it on the map (NpcTalk), and that window's element,
  // which draw() moves along with the NPC.
  const [talkNpc, setTalkNpc] = useState(null);
  const talkRef = useRef(null), talkEl = useRef(null);
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
  // The quest panel left of the map (13f-0; the list from 13b, the slice 12 checklist in development): open until
  // closed, remembered in the browser.
  const [questsOpen, setQuestsOpenState] = useState(() => { try { return localStorage.getItem('tm-quests-open') === '1'; } catch { return false; } });
  const setQuestsOpen = (fn) => setQuestsOpenState((o) => {
    const n = typeof fn === 'function' ? fn(o) : fn;
    try { localStorage.setItem('tm-quests-open', n ? '1' : '0'); } catch { /* private mode */ }
    return n;
  });
  const [onQuest, setOnQuestState] = useState(questOn); // "I'm on this quest" (13b), kept in the browser
  const setOnQuest = (name) => { setQuestOn(name); setOnQuestState(name); };
  // The quest database's settings, and the editors' Discord login (13c): { user, editor } (editor: may edit quests).
  const dbCfg = useMemo(() => questDbConfig({ url: supabaseUrl, key: supabaseKey }), [supabaseUrl, supabaseKey]);
  const [login, setLogin] = useState({ user: null, editor: false });
  useEffect(() => watchLogin(dbCfg, (user) => {
    setLogin((l) => (l.user?.id === user?.id ? l : { user, editor: false }));
    if (user) isEditor(dbCfg).then((editor) => setLogin((l) => (l.user?.id === user.id ? { user, editor } : l)));
  }), [dbCfg]);
  const [, setQuestRev] = useState(0); // bumped when a quest is saved (the world's quests changed in place)
  // Saves an editor's changes to quest q's database row; the map uses the stored row straight away.
  const saveDbQuest = async (q, changes) => {
    const row = await saveQuest(dbCfg, q.db.id, changes);
    if (onQuest === q.n && row.name !== q.n) setOnQuest(row.name);
    Object.assign(q.db, row);
    q.n = row.name;
    worldRef.current?.buildSearch();
    setQuestRev((r) => r + 1);
    redraw();
  };
  // The guides (13d): segments and steps per quest, fetched when needed: { [quest id]: { guide, error } }.
  // guideQ: the last opened quest that's in the database, the one editors add steps to; it stays when the quest
  // window closes, so an editor can click an NPC and add a talk step to it.
  const [guides, setGuides] = useState({});
  const [guideQ, setGuideQ] = useState(null);
  const guide = guideQ ? { quest: guideQ, guide: guides[guideQ.db.id]?.guide ?? null, error: guides[guideQ.db.id]?.error ?? null } : null;
  const [editStep, setEditStep] = useState(null); // the step whose form is open (editors)
  const loadGuide = useCallback(async (q) => {
    if (!dbCfg || !q?.db) return null;
    const id = q.db.id;
    try {
      const data = await qg.fetchGuide(dbCfg, id);
      setGuides((all) => ({ ...all, [id]: { guide: data, error: null } }));
      return data;
    } catch (e) {
      setGuides((all) => ({ ...all, [id]: { guide: all[id]?.guide ?? null, error: e.message || String(e) } }));
      return null;
    }
  }, [dbCfg]);
  // Where you are in each guide (kept in the browser): { [quest id]: step id | 'done' | null }.
  const [progress, setProgressState] = useState({});
  const atOf = (qid) => (qid in progress ? progress[qid] : qg.progressOf(qid));
  const setAt = (qid, stepId) => { qg.setProgress(qid, stepId); setProgressState((p) => ({ ...p, [qid]: stepId })); };
  // An editor's change to the guide, then the guide again; a quest with steps is checked when all its steps are.
  const editGuide = async (fn) => {
    const g = guide;
    if (!g?.guide) return null;
    const out = await fn(g.guide);
    const data = await loadGuide(g.quest);
    // (deleting the last step leaves it not checked: nothing has been gone through)
    if (data && (data.steps.length || g.guide.steps.length)) {
      const status = data.steps.length && data.steps.every((t) => t.checked) ? 'checked' : 'not checked';
      if (status !== g.quest.db.status) await saveDbQuest(g.quest, { status }).catch(() => {});
    }
    return out;
  };
  const guideEd = login.editor && guide?.guide ? { // (without database step 3 the panel says so and offers nothing)
    addNote: (segId) => editGuide((gd) => qg.addStep(dbCfg, gd, { kind: 'note' }, segId)).then((t) => t && setEditStep(t.id)),
    saveStep: (id, c) => editGuide(() => qg.updateStep(dbCfg, id, c)),
    deleteStep: (id) => editGuide(() => qg.deleteStep(dbCfg, id)),
    moveStep: (id, segId, beforeId) => editGuide((gd) => qg.moveStep(dbCfg, gd, id, segId, beforeId)),
    addSegment: () => editGuide((gd) => qg.addSegment(dbCfg, gd)),
    renameSegment: (id, name) => editGuide(() => qg.renameSegment(dbCfg, id, name)),
    deleteSegment: (id) => editGuide(() => qg.deleteSegment(dbCfg, id)),
    saveBring: (id, bring) => editGuide(() => qg.saveBring(dbCfg, id, bring)),
  } : null;
  // The top item on a tile that isn't ground (a Reward step's chest, box or corpse), or null.
  const topItemAt = ([x, y, z]) => {
    const world = worldRef.current, items = world?.tile(x, y, z)?.items || [];
    for (let i = items.length - 1; i >= 0; i--) if (!world.defs[items[i].id]?.f?.GROUND) return items[i].id;
    return null;
  };
  // Adds a step to the guide's quest (right-click "Add step here", NPC "Add talk step") and opens its form in the
  // quest window.
  const addGuideStep = async (fields) => {
    const q = guide?.quest;
    try {
      const t = await editGuide((gd) => qg.addStep(dbCfg, gd, fields));
      if (selectedQuest.current?.quest !== q) selectQuest({ quest: q });
      if (t) setEditStep(t.id);
    } catch (e) { setLocNote(`Could not add the step: ${e.message || e}`); }
  };
  // Opening a quest that's in the database makes it the guide's quest and loads its guide (another quest's step
  // form closes).
  const questSelQ = questSel?.quest;
  useEffect(() => {
    if (!questSelQ?.db || questSelQ === guideQ) return;
    setEditStep(null); setGuideQ(questSelQ); loadGuide(questSelQ);
  }, [questSelQ]); // eslint-disable-line react-hooks/exhaustive-deps
  const moveEditStep = (p) => {
    const id = editStep;
    editGuide(() => qg.updateStep(dbCfg, id, { x: p[0], y: p[1], z: p[2] })).catch((e) => setLocNote(`Could not move the step: ${e.message || e}`));
  };
  // The guide on the map (13d-2): the quest you're on, or for editors the quest whose window is open. Its current
  // segment's steps get numbered markers (stepMarks, drawn by draw()).
  const onQuestQ = ready && onQuest ? worldRef.current?.quests?.find((q) => q.n === onQuest && q.db) : null;
  const markQ = (login.editor && questSelQ?.db) ? questSelQ : onQuestQ || null;
  const markGuide = markQ ? guides[markQ.db.id]?.guide : null;
  useEffect(() => {
    if (markQ && !guides[markQ.db.id]) loadGuide(markQ);
  }, [markQ, guides, loadGuide]);
  const questNpcs = useRef(new Set()); // the NPCs in the guide's Talk steps (lower case): a click opens the conversation
  const stepMarks = useRef(null); // { quest, marks: [{ step, n, pos, state: 'cur' | 'done' | 'todo' }] }
  const markAt = markQ ? atOf(markQ.db.id) : null;
  useEffect(() => {
    const world = worldRef.current;
    stepMarks.current = null;
    if (markQ && markGuide?.steps.length && world) {
      const steps = markGuide.steps, cur = qg.currentIndex(markGuide, markAt);
      const seg = steps[Math.min(cur, steps.length - 1)].segment_id;
      const marks = [];
      steps.forEach((t, i) => {
        const pos = t.segment_id === seg && qg.stepPos(world, t);
        if (pos) marks.push({ step: t, n: i + 1, pos, state: i === cur ? 'cur' : i < cur ? 'done' : 'todo' });
      });
      stepMarks.current = { quest: markQ, marks };
    }
    questNpcs.current = new Set((markQ && markGuide?.steps || []).filter((t) => t.kind === 'talk' && t.npc).map((t) => t.npc.toLowerCase()));
    redraw();
  }, [markQ, markGuide, markAt]); // eslint-disable-line react-hooks/exhaustive-deps
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
      if (shownPath() && ROUTE_OTHER_FLOORS) seeThrough(ctx, world, v, shownPath(), g, budget, offRef);
      // Hover preview (5d): where the hole, stairs or ladder under the mouse leads, also with a route (user), on top.
      const hl = hoverLink.current, hoverTele = hl && world.isTeleport(hl);
      if (hl && !hoverTele && hl[2] === v.z && !(hl[5] < v.z && v.z <= 7 && hl[5] >= v.cut)) {
        seePreview(ctx, world, v, hl, g, budget, offRef); // (a floor above that is already drawn: nothing to add)
      }
      // A hovered forcefield: a purple ring on it, and where it leads when that's on this floor and close enough
      // to see, a ring there with a dashed line to it. Clicking goes there.
      if (hoverTele && hl[2] === v.z) {
        const kk = Math.max(1, Math.round(window.devicePixelRatio || 1));
        const ring = (x, y) => { ctx.beginPath(); ctx.arc(ox + (x + 0.5) * s, oy + (y + 0.5) * s, Math.max(8 * kk, s * 0.55), 0, 2 * Math.PI); ctx.stroke(); };
        ctx.strokeStyle = '#000'; ctx.lineWidth = 5 * kk; ring(hl[0], hl[1]);
        ctx.strokeStyle = '#c050ff'; ctx.lineWidth = 3 * kk; ring(hl[0], hl[1]);
        if (hl[5] === v.z && hl[3] >= left && hl[3] <= right && hl[4] >= top && hl[4] <= bottom) {
          ctx.setLineDash([6 * kk, 5 * kk]);
          ctx.beginPath(); ctx.moveTo(ox + (hl[0] + 0.5) * s, oy + (hl[1] + 0.5) * s); ctx.lineTo(ox + (hl[3] + 0.5) * s, oy + (hl[4] + 0.5) * s); ctx.stroke();
          ctx.setLineDash([]);
          ctx.strokeStyle = '#000'; ctx.lineWidth = 5 * kk; ring(hl[3], hl[4]);
          ctx.strokeStyle = '#c050ff'; ctx.lineWidth = 3 * kk; ring(hl[3], hl[4]);
        }
      }
      // The hovered floor change gets an arrow: up or down.
      if (hl && !hoverTele && hl[2] === v.z) {
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
        // Climbs and drops (slice 11): a bar on the tile's edge you face, orange up / blue down; solid = the spell
        // works, hollow = parcels only.
        for (const c of world.walk.climbsAt?.get(`${x},${y},${v.z}`) || []) {
          const dx = c[3] - x, dy = c[4] - y, w = Math.max(3 * k0, s / 6), up = c[5] < c[2];
          const bx = dx > 0 ? sx + s - w : sx, by = dy > 0 ? sy + s - w : sy;
          const bw = dx ? w : s, bh = dy ? w : s;
          ctx.fillStyle = ctx.strokeStyle = up ? 'rgba(255,140,0,0.95)' : 'rgba(0,140,255,0.95)';
          ctx.lineWidth = k0;
          if (c[6] & 1) ctx.fillRect(bx, by, bw, bh); else ctx.strokeRect(bx + k0 / 2, by + k0 / 2, bw - k0, bh - k0);
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


    // The guide's steps (13d-2): numbered circles on the current segment's steps (where their floor is shown, as
    // NPCs). The step you're on is white and larger, done steps are faint, the ones still to do gold.
    if (stepMarks.current && v.zoom >= STEPS_FROM) {
      const kq = Math.max(1, Math.round(window.devicePixelRatio || 1));
      const fq = Math.max(kq, Math.round(s / 32));
      ctx.imageSmoothingEnabled = false;
      const order = { done: 0, todo: 1, cur: 2 }; // the step you're on drawn last (on top)
      for (const m of [...stepMarks.current.marks].sort((a, b) => order[a.state] - order[b.state])) {
        const f = npcFrame({ p: m.pos }, v.z, v.cut);
        if (!f || f[0] < left - 2 || f[0] > right + 2 || f[1] < top - 2 || f[1] > bottom + 2) continue;
        const r = stepRing(f, ox, oy, s, kq, m.state);
        ctx.globalAlpha = m.state === 'done' ? 0.45 : 1;
        if (m.step.kind === 'reward') {
          // A Reward step (user 2026-11-20): its chest (object) in a gold ring, white when it's the step you're on,
          // with the step number small at the top right.
          const rr = Math.max(r.r, questRing(f, ox, oy, s, kq).r);
          ctx.beginPath(); ctx.arc(r.cx, r.cy, rr, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fill();
          ctx.strokeStyle = m.state === 'cur' ? '#ffffff' : '#ffd700'; ctx.lineWidth = (m.state === 'cur' ? 3 : 2) * kq; ctx.stroke();
          const size = Math.round(rr * 1.5);
          ctx.imageSmoothingEnabled = size < 32;
          ctx.drawImage(world.iconCanvas(m.step.object || qg.CHEST_ICON), Math.round(r.cx - size / 2), Math.round(r.cy - size / 2), size, size);
          ctx.imageSmoothingEnabled = false;
          const t = String(m.n);
          ctx.save();
          ctx.translate(Math.round(r.cx + rr * 0.6), Math.round(r.cy - rr - (world.font.cellH * kq) / 2));
          ctx.scale(kq, kq);
          drawText(ctx, world.font, t, 0, 0, m.state === 'cur' ? '#ffffff' : '#ffd700');
          ctx.restore();
          continue;
        }
        ctx.beginPath(); ctx.arc(r.cx, r.cy, r.r, 0, Math.PI * 2);
        ctx.fillStyle = m.state === 'cur' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.6)'; ctx.fill();
        ctx.strokeStyle = m.state === 'cur' ? '#ffffff' : '#ffd700'; ctx.lineWidth = (m.state === 'cur' ? 3 : 2) * kq; ctx.stroke();
        const t = String(m.n), w = textWidth(world.font, t) * fq;
        ctx.save();
        ctx.translate(Math.round(r.cx - w / 2), Math.round(r.cy - (world.font.cellH * fq) / 2));
        ctx.scale(fq, fq);
        drawText(ctx, world.font, t, 0, 0, m.state === 'cur' ? '#ffffff' : '#ffd700');
        ctx.restore();
      }
      ctx.globalAlpha = 1;
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
    // The quest route (13e): the guide's legs, on the floor you're looking at (the surface ones also from the other
    // surface floors, fainter, as the route). The leg to the step you're on bright, the ones still to do dimmer, done
    // legs faint; the leg in the Route panel is drawn as the route below. Floor changes and boats: only the line.
    if (questPaths.current?.length) {
      const fq = ([x, y, z]) => (v.z <= 7 && z <= 7 ? [x - (v.z - z), y - (v.z - z)] : [x, y]);
      const atq = (pt) => { const f = fq(pt); return [ox + (f[0] + 0.5) * s, oy + (f[1] + 0.5) * s]; };
      const order = { done: 0, todo: 1, cur: 2 };
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.setLineDash([]);
      for (const q of [...questPaths.current].sort((a, b) => order[a.state] - order[b.state])) {
        const p = q.path, base = q.state === 'cur' ? 1 : q.state === 'todo' ? 0.55 : 0.25;
        for (const here of [false, true]) { // other surface floors first, this floor on top
          ctx.beginPath();
          let any = false;
          for (let i = 1; i < p.length; i++) {
            const a = p[i - 1], b = p[i];
            if (a[2] !== b[2] || !['walk', 'diagonal', 'onto', 'use'].includes(b[3])) continue;
            const on = a[2] === v.z;
            if (on !== here || (!on && !(a[2] <= 7 && v.z <= 7))) continue;
            const [ax, ay] = atq(a), [bx, by] = atq(b);
            ctx.moveTo(ax, ay); ctx.lineTo(bx, by); any = true;
          }
          if (!any) continue;
          ctx.globalAlpha = here ? base : base * ROUTE_SURFACE_ALPHA;
          if (q.state === 'cur') { ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 5 * k; ctx.stroke(); }
          ctx.strokeStyle = '#ffd700'; ctx.lineWidth = (q.state === 'cur' ? 3 : 2) * k; ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }
    // The route: a line through the tiles, bright on this floor, fainter dashes on other floors (see routeAlpha);
    // markers where the floor changes, green at the start, red at the end. Line widths in client pixels.
    const rp = shownPath();
    if (rp && rp.length > 1) {
      const fr = ([x, y, z]) => (v.z <= 7 && z <= 7 ? [x - (v.z - z), y - (v.z - z)] : [x, y]);
      const at = (pt) => { const f = fr(pt); return [ox + (f[0] + 0.5) * s, oy + (f[1] + 0.5) * s]; };
      // How visible path entry i is: by its floor (routeAlpha), and on other floors only the way ahead (routeAhead,
      // user 2026-11-15: going down the Demona hole, the surface part behind you still showed). When the route
      // doesn't touch the floor you're looking at, all of it shows as before. The end dot always shows.
      const { ahead, onRoute } = routeAhead(rp, v.z);
      const alpha = (i) => {
        const z = rp[i][2];
        if (z === v.z) return 1;
        if (z <= 7 && v.z <= 7) return ROUTE_SURFACE_ALPHA; // the surface route always shows from the surface and above
        return (ROUTE_OTHER_FLOORS || !routePath.current) && (!onRoute || ahead[i]) ? routeAlpha(z, v.z) : 0;
      };
      // Runs of tiles walked on one floor (path indices). The line goes onto stairs, holes and forcefields ('onto'); a
      // ladder, grate or rope spot used from next to it ('use') gets a short dashed line from where you stand.
      const runs = [], uses = [];
      let run = [0];
      for (let i = 1; i < rp.length; i++) {
        const how = rp[i][3];
        if (how === 'walk' || how === 'diagonal' || how === 'onto') run.push(i);
        else if (how === 'use') uses.push(i);
        else { runs.push(run); run = [i]; }
      }
      runs.push(run);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const pass of [0, 1]) {
        for (const r of runs) {
          const here = rp[r[0]][2] === v.z, a = alpha(r[0]);
          if (r.length < 2 || !a || here !== (pass === 1)) continue;
          ctx.beginPath();
          r.forEach((pi, i) => { const [x, y] = at(rp[pi]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
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
      for (const ui of uses) {
        const a = rp[ui - 1], b = rp[ui];
        const here = a[2] === v.z, al = alpha(ui - 1), [ax, ay] = at(a), [bx, by] = at(b);
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
      const dot = (pi, color, r, a = alpha(pi)) => {
        if (!a) return;
        const [x, y] = at(rp[pi]);
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
        const a = Math.max(alpha(i - 1), alpha(i));
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
        const a = alpha(i - 1);
        if (rp[i][2] !== rp[i - 1][2] && a) {
          const [x, y] = at(rp[i - 1]);
          ctx.globalAlpha = a;
          drawArrow(ctx, x, y, Math.max(12 * k, s * 0.5), up, k);
          // Climbs (slice 11, user): what you need there, a spellbook (exani hur) or a parcel, beside the arrow.
          const iconId = (how === 'levitate' || how === 'parcels') && world.links?.climbIcons?.[how];
          if (iconId) {
            const size = Math.max(16 * k, Math.round(s * 0.7));
            ctx.drawImage(world.iconCanvas(iconId), Math.round(x + Math.max(6 * k, s * 0.25)), Math.round(y - size + Math.max(4 * k, s * 0.1)), size, size);
          }
          ctx.globalAlpha = 1;
        } else if (rp[i][2] === rp[i - 1][2]) dot(i - 1, color, 5 * k);
        dot(i, color, 3 * k);
      }
      dot(0, '#30c030', 6 * k);
      const last = rp.length - 1;
      dot(last, '#e03030', 6 * k, alpha(last));
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
    placeTalk(talkEl.current, talkRef.current, v, ox, oy, s, W, H);
    // The minimap follows every change of the map (and gets its images the same way).
    if (miniRef.current) mini.current = drawMini(miniRef.current, world, v, s, viewBox.current);
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

  // The guide step marker at canvas point p, or null (the step you're on wins when they overlap).
  const stepAtPoint = (p) => {
    const world = worldRef.current, c = canvasRef.current, v = view.current, s = anim.current.s;
    if (!world || !c || !stepMarks.current || v.zoom < STEPS_FROM) return null;
    const ox = Math.round(c.width / 2 - v.x * s), oy = Math.round(c.height / 2 - v.y * s);
    const k = Math.max(1, Math.round(window.devicePixelRatio || 1));
    let best = null;
    for (const m of stepMarks.current.marks) {
      const f = npcFrame({ p: m.pos }, v.z, v.cut);
      if (!f) continue;
      const r = stepRing(f, ox, oy, s, k, m.state);
      if (Math.hypot(p.x - r.cx, p.y - r.cy) <= r.r && (!best || m.state === 'cur')) best = m;
    }
    return best;
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
    const world = new World(dataUrl, () => redraw(), { questDb: dbCfg });
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
  }, [dataUrl, dbCfg, redraw, viewChanged]);

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

  // Changes the floor without moving what's on screen: a surface floor zz is drawn (v.z - zz) tiles up-left
  // (as in the client), so the view centre moves along by the difference (user 2026-11-19: Ctrl + wheel up
  // shifted the view a tile). Underground floors aren't shifted.
  const changeFloor = (z) => {
    const v = view.current, d = Math.min(v.z, 7) - Math.min(z, 7);
    v.x += d; v.y += d; v.z = z;
    const an = anim.current.anchor;
    if (an && d) { an.wx += d; an.wy += d; } // a zoom in progress keeps the same spot under the mouse
  };

  // Crossing MAIN_FROM: zooming in goes to the main level of the place zoomed into ("this floor only");
  // zooming out brings the roofs back. Underground (after Ctrl + wheel) the floor stays as it is.
  const mainLevel = (before, x, y) => {
    const v = view.current;
    if (before < MAIN_FROM && v.zoom >= MAIN_FROM && v.z <= 7) { changeFloor(mainLevelAt(x, y)); v.cut = v.z; }
    else if (before >= MAIN_FROM && v.zoom < MAIN_FROM && v.z <= 7) v.cut = 0;
  };

  // Depth (Ctrl + wheel, Ctrl + +/-): every step is one whole floor, forward = down, backward = up (user,
  // 2026-11-19: stepping through roof layers that barely showed felt like nothing happened). Roofs follow the
  // zoom as with the floor buttons: zoomed in this floor only, zoomed out with the floors above. Floors with
  // nothing on screen are skipped, so every step changes something.
  const layerBy = useCallback((dir) => {
    const v = view.current, world = worldRef.current, b = viewBox.current;
    if (!world || !b) return;
    const [x1, y1, x2, y2] = [b.left, b.top, b.right, b.bottom].map(Math.floor);
    const step = dir > 0 ? 1 : -1;
    for (let z = v.z + step; z >= 0 && z <= 15; z += step) {
      if (!world.floors.includes(z) || !world.hasData(z, x1, y1, x2, y2)) continue;
      changeFloor(z);
      v.cut = v.zoom >= MAIN_FROM ? z : 0;
      viewChanged();
      return;
    }
  }, [viewChanged]);

  const setFloor = useCallback((z) => {
    const world = worldRef.current;
    if (!world?.floors?.includes(z)) return; // also before the map has loaded
    changeFloor(z);
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
    if (sn.quest) setQuestsOpen(true);
    setItem(sn.item);
    viewChanged();
  };
  restoreBackRef.current = restoreBack;
  const goBack = () => (syncUrl ? window.history.back() : restoreBack());
  // A jump that Back can undo.
  const jump = (p, opts) => { pushBack(); goTo(p, opts); };
  // Monster search (6d): fit the view to every spawn of that kind, on the surface (floor 7; user: not the floor where
  // most of them are, which was often underground). Those on other floors still show there, fainter, with their ring.
  const fitMonsters = (kind) => {
    const world = worldRef.current, c = canvasRef.current;
    const pts = world?.spawnPoints.filter((sp) => sp.kind === kind) || [];
    if (!pts.length || !c) { redraw(); return; }
    const xs = pts.map((sp) => sp.p[0]), ys = pts.map((sp) => sp.p[1]);
    const x1 = Math.min(...xs), x2 = Math.max(...xs), y1 = Math.min(...ys), y2 = Math.max(...ys);
    const fit = [...ZOOMS].reverse().find((zz) => zz <= MAIN_FROM && (x2 - x1 + 10) * zz <= c.width * 0.9 && (y2 - y1 + 10) * zz <= c.height * 0.9) ?? ZOOMS[0];
    const z = 7;
    jump({ x: Math.round((x1 + x2) / 2), y: Math.round((y1 + y2) / 2), z }, { zoom: fit, cut: fit >= MAIN_FROM && z <= 7 ? z : 0 });
  };

  // Home: the whole world on the surface (floor 7, all layers), at the closest zoom where it fits. Back undoes it.
  const goHome = () => {
    const b = worldRef.current?.bounds, c = canvasRef.current;
    if (!b || !c) return;
    const fit = [...ZOOMS].reverse().find((zz) => (b.x2 - b.x1) * zz <= c.width && (b.y2 - b.y1) * zz <= c.height) ?? ZOOMS[0];
    jump({ x: Math.round((b.x1 + b.x2) / 2), y: Math.round((b.y1 + b.y2) / 2), z: 7 }, { zoom: fit, cut: 0 });
  };

  // Shows the whole route: centred, at the closest zoom where it fits, on the floor it starts on.
  const showRoute = useCallback((path) => {
    const c = canvasRef.current;
    if (!path?.length || !c) return;
    const xs = path.map((pt) => pt[0]), ys = path.map((pt) => pt[1]);
    const x1 = Math.min(...xs), x2 = Math.max(...xs), y1 = Math.min(...ys), y2 = Math.max(...ys);
    const fit = [...ZOOMS].reverse().find((z) => z <= FLY_ZOOM && (x2 - x1 + 6) * z <= c.width * 0.9 && (y2 - y1 + 6) * z <= c.height * 0.9) ?? ZOOMS[0];
    // The floor most of it is on (user 2026-11-21: a quest leg starts on the hole of the step before, so its first
    // tile's floor showed only the hole, not the way to the next step).
    const per = new Map();
    for (const pt of path) per.set(pt[2], (per.get(pt[2]) || 0) + 1);
    const z0 = [...per].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
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
        const args = [r.from.pos, r.to.pos, speed, Number(charRef.current.level) || 1, doorsRef.current, climbOf(charRef.current)];
        r.cheapBusy = false;
        // The fastest route first, shown as soon as it's found; then, when it costs gold, the cheapest is searched
        // and added when it's cheaper. A newer request stops that search in the worker.
        router.current.route(...args).then((res) => {
          if (seq !== routeSeq.current) return; // a newer request
          const path = res.routes?.[0].path || null;
          routePath.current = path;
          setRoute((cur) => ({ ...cur, busy: false, cheapBusy: !!res.cheaper, result: res, pick: 0 }));
          if (path && !keepView) showRoute(path); else redraw();
          if (!res.cheaper) return;
          router.current.cheapest(...args).then((c) => {
            if (seq !== routeSeq.current || c.cancelled) return;
            setRoute((cur) => {
              const fast = cur.result?.routes?.[0];
              const routes = c.path && fast && c.gold < fast.gold ? [fast, { name: 'Cheapest', ...c }] : cur.result.routes;
              return { ...cur, cheapBusy: false, result: { ...cur.result, routes } };
            });
          });
        });
      } else { r.busy = false; r.cheapBusy = false; r.result = null; }
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
  const climb = climbOf(char); // ... and when climbing is switched on or off
  const routeRef = useRef(route);
  routeRef.current = route;
  // ... and when doors are unlocked or locked.
  const doorsKey = `${doors.all}:${doors.open.join(';')}`;
  useEffect(() => {
    if (routeRef.current.from && routeRef.current.to) updateRoute({}, true);
  }, [oracleLevel, climb, doorsKey, updateRoute]);
  const clearRoute = () => { routeSeq.current++; router.current?.cancel(); routePath.current = null; setRoute({ open: false, from: null, to: null, result: null, pick: 0, busy: false }); redraw(); };

  // "I'm on this quest" (user 2026-11-21): the view goes straight to the end of the quest, its (last) Reward step,
  // else its last step with a spot, once the guide is loaded; the route through the current part is drawn as always.
  const flyToReward = useRef(null); // the quest's name, until it's flown to
  const followQuest = (name) => { setOnQuest(name); flyToReward.current = name; };
  useEffect(() => {
    const name = flyToReward.current, world = worldRef.current;
    if (!name || !world) return;
    const q = world.quests?.find((x) => x.n === name && x.db);
    if (!q) { flyToReward.current = null; return; }
    const g = guides[q.db.id];
    if (!g) { loadGuide(q); return; }
    if (!g.guide && !g.error) return; // still loading
    flyToReward.current = null;
    const spots = (g.guide?.steps || []).map((t) => [t, qg.stepPos(world, t)]).filter(([, p]) => p);
    const end = [...spots].reverse().find(([t]) => t.kind === 'reward') || spots[spots.length - 1];
    if (end) jump({ x: end[1][0], y: end[1][1], z: end[1][2] });
  }, [onQuest, guides]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- the quest route (13e) ----------
  // The legs of the guide on the map (markQ, as its markers): step to step through its current segment, steps
  // without a spot skipped. [{ step, n (its number, from 1), from, to: [x, y, z], state: 'done' | 'cur' | 'todo' }]
  const questLegs = useMemo(() => {
    const world = worldRef.current;
    if (!ready || !markQ || !markGuide?.steps.length || !world) return null;
    const steps = markGuide.steps, cur = qg.currentIndex(markGuide, markAt);
    const seg = steps[Math.min(cur, steps.length - 1)].segment_id;
    const legs = [];
    // The segment starts where the one before it ended (user 2026-11-21: its first step had no way to it).
    const first = steps.findIndex((t) => t.segment_id === seg);
    let prev = null;
    for (let i = first - 1; i >= 0 && !prev; i--) prev = qg.stepPos(world, steps[i]) || null;
    steps.forEach((t, i) => {
      const pos = t.segment_id === seg && qg.stepPos(world, t);
      if (!pos) return;
      if (prev) legs.push({ step: t, n: i + 1, from: prev, to: pos, state: i === cur ? 'cur' : i < cur ? 'done' : 'todo' });
      prev = pos;
    });
    return { quest: markQ, legs };
  }, [ready, markQ, markGuide, markAt]);
  // The legs found (fastest only), by where they go and what the router was told (as the panel searches again).
  // Asked one at a time, and only while the Route panel isn't searching: a leg's search in the shared worker would
  // stop the panel's cheapest search.
  const legBase = `${oracleLevel}:${climb}:${doorsKey}`;
  const legKey = (l) => `${l.from}>${l.to}|${legBase}`;
  const [legRes, setLegRes] = useState({}); // legKey -> { path } | { error, locked }
  const legBusy = useRef(false);
  useEffect(() => {
    if (!questLegs || legBusy.current || route.busy || route.cheapBusy) return;
    const l = questLegs.legs.find((x) => !(legKey(x) in legRes));
    if (!l) return;
    const key = legKey(l), c = charRef.current;
    legBusy.current = true;
    router.current ||= createRouter(dataUrl);
    router.current.route(l.from, l.to, speedOf(c), Number(c.level) || 1, doorsRef.current, climbOf(c)).then((res) => {
      legBusy.current = false;
      setLegRes((all) => ({ ...all, [key]: res.routes ? { path: res.routes[0].path } : { error: res.error || 'No route found.', locked: res.locked } }));
    });
  }, [questLegs, legRes, legBase, route.busy, route.cheapBusy, dataUrl]); // eslint-disable-line react-hooks/exhaustive-deps
  // For draw(): the whole segment's legs, one after another, are drawn as the route (floor-change markers, boat arcs,
  // dashed lines on other floors, see-through; user 2026-11-21: was only the leg to the step you're on), unless the
  // Route panel has a route of its own: that one wins and the legs are plain bright lines.
  // The quest route never touches the Route panel (user 2026-11-20: filling it overwrote your own From/To).
  // A leg without a route leaves a gap (each leg starts with a 'start' entry, which ends a line).
  const questPaths = useRef(null); // [{ path, state }]
  const questCur = useRef(null); // the segment's legs as one path while it's drawn as the route
  useEffect(() => {
    const found = questLegs?.legs.filter((l) => legRes[legKey(l)]?.path).map((l) => ({ path: legRes[legKey(l)].path, state: l.state })) || [];
    questCur.current = found.length && !routePath.current ? found.flatMap((q) => q.path) : null;
    questPaths.current = questCur.current ? [] : found;
    redraw();
  }, [questLegs, legRes, legBase, route]); // eslint-disable-line react-hooks/exhaustive-deps
  // Per step of the guide's quest: the leg to it ({ time, show } | { error, locked } | { busy }; show fits the view to
  // it), the segment's total and Show route (fits the view to all of it).
  const speedNow = speedOf(char);
  const legInfo = questLegs && (() => {
    const byStep = {};
    let total = 0, all = true;
    for (const l of questLegs.legs) {
      const r = legRes[legKey(l)];
      byStep[l.step.id] = !r ? { busy: true } : r.path ? { time: routeTime(r.path, speedNow), show: () => showRoute(r.path) } : { error: r.error, locked: r.locked };
      if (r?.path) total += byStep[l.step.id].time; else all = false;
    }
    const paths = questLegs.legs.map((l) => legRes[legKey(l)]?.path).filter(Boolean);
    return { quest: questLegs.quest, byStep, total, all, paths, show: paths.length ? () => showRoute(paths.flat()) : null };
  })();
  // The route the map draws as "the route": the Route panel's, else the quest's segment.
  const shownPath = () => routePath.current || questCur.current;

  // Opens an NPC's conversation next to it (or closes it: null).
  const openTalk = useCallback((n) => { talkRef.current = n; setTalkNpc(n); redraw(); }, [redraw]);
  const selectNpc = useCallback((n) => {
    if (n && talkRef.current && n !== talkRef.current) openTalk(null); // another NPC: its conversation closes
    selected.current = n;
    setNpc(n);
    if (n) { setItem(null); selectedDoor.current = null; setDoor(null); selectedMon.current = null; setMon(null); }
    redraw();
  }, [redraw, openTalk]);
  // Opens the monster window ({ kind | 'all', group }) or closes it (null).
  const selectMonster = useCallback((m) => {
    selectedMon.current = m;
    setMon(m);
    if (m) { setItem(null); selected.current = null; setNpc(null); selectedDoor.current = null; setDoor(null); }
    redraw();
  }, [redraw]);
  // Opens the quest window for a quest chest, or closes it (null).
  const selectQuest = useCallback((c) => {
    selectedQuest.current = c;
    setQuestSel(c);
    // The quest is in its own panel (13f-0): the right panel's windows stay; opening a quest opens the panel.
    if (c) setQuestsOpen(true);
    redraw();
  }, [redraw]); // eslint-disable-line react-hooks/exhaustive-deps
  const closeQuests = () => { setQuestsOpen(false); selectQuest(null); };
  // A Talk step's NPC (13f-0b): go to it, its window and its conversation.
  const talkTo = (n) => { jump({ x: n.p[0], y: n.p[1], z: n.p[2] }); selectNpc(n); openTalk(n); };
  // The development tools (slice 12 spot editing, named locations; only on the dev server) show only to a logged-in
  // editor (user 2026-11-20: players should see a clean quest panel).
  const devTools = !!login.editor;
  // A quest's window: on spot i (going there), or without a spot when it has none (slice 12).
  const goToQuest = useCallback((q) => selectQuest({ quest: q }), [selectQuest]);
  const selectDoor = useCallback((d) => {
    selectedDoor.current = d;
    setDoor(d);
    if (d) { setItem(null); selected.current = null; setNpc(null); selectedMon.current = null; setMon(null); }
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
  // The tile you see at canvas point p (right-click menu, position readout). Looking at a surface floor above 7, the
  // floors below show through where it has nothing, each one tile further down-right; so it's the highest floor from
  // the view's down to 7 with something on that spot (user 2026-11-20: quest steps added while looking at floor 1
  // landed in the air on floor 1, 6 tiles off, and no route could reach them).
  const seenTileAt = (p) => {
    const t = tileAt(p), v = view.current, world = worldRef.current;
    if (world && v.z < 7) {
      for (let zz = v.z; zz <= 7; zz++) {
        const x = t.x + (v.z - zz), y = t.y + (v.z - zz);
        if (world.tile(x, y, zz) || (world.walk && world.speedAt(x, y, zz))) return { x, y, z: zz };
      }
    }
    return t;
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

  // The floor change (or magic forcefield) at canvas point p, for the hover preview and a click to that floor or to
  // where the forcefield leads (with or without a route), zoomed in far enough to see the sprites. Null otherwise.
  // A climb or drop of the shown route (exani hur, parcels; slice 11) that starts on tile (x, y, z), as a floor
  // change [x, y, z, tx, ty, tz, -1], so its arrow can be hovered and clicked like stairs (user). Kept per route.
  const climbCache = useRef({ path: null, list: [] });
  const routeClimbAt = (x, y, z) => {
    const rp = shownPath();
    if (!rp) return null;
    if (climbCache.current.path !== rp) {
      const list = [];
      for (let i = 1; i < rp.length; i++) if (rp[i][3] === 'levitate' || rp[i][3] === 'parcels') list.push([...rp[i - 1].slice(0, 3), ...rp[i].slice(0, 3), -1]);
      climbCache.current = { path: rp, list };
    }
    return climbCache.current.list.find((l) => l[0] === x && l[1] === y && l[2] === z) || null;
  };
  const floorChangeAtPoint = (p) => {
    const world = worldRef.current, v = view.current;
    if (!world?.links || v.zoom < SPRITES_FROM) return null;
    const t = tileAt(p);
    const l = world.floorChangeAt(t.x, t.y, v.z) || world.teleportAt(t.x, t.y, v.z) || routeClimbAt(t.x, t.y, v.z);
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
      setHover(seenTileAt(p));
      const l = floorChangeAtPoint(p);
      setHoverLink(l);
      if (e.pointerType === 'mouse') e.currentTarget.style.cursor = stepAtPoint(p) || npcAtPoint(p) || searchedAtPoint(p) || monsterAtPoint(p) || doorAtPoint(p) || l ? 'pointer' : '';
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
      // A guide step marker (13d-2) is on top of everything: it opens the guide's quest.
      // A hole, stairs or ladder: go to the floor it leads to; a forcefield: to where it leads (Back returns).
      const takeLink = (l) => {
        setHoverLink(null);
        if (worldRef.current.isTeleport(l)) jump({ x: l[3], y: l[4], z: l[5] }, { zoom: view.current.zoom });
        else setFloor(l[5]);
      };
      const st = stepAtPoint(toCanvas(e));
      if (st) {
        const q = stepMarks.current.quest;
        if (selectedQuest.current?.quest !== q) selectQuest({ quest: q });
        // A Talk step's marker sits on its NPC: open the conversation too (13f-0b).
        const sn = st.step.kind === 'talk' && st.step.npc && worldRef.current.npcs?.find((x) => x.n.toLowerCase() === st.step.npc.toLowerCase());
        if (sn) { selectNpc(sn); openTalk(sn); return; }
        // A step on a hole or stairs (13j drafts put "go down" steps there): the click takes it too (user 2026-11-21).
        const sl = floorChangeAtPoint(toCanvas(e));
        if (sl) takeLink(sl);
        return;
      }
      const p = toCanvas(e), n = npcAtPoint(p), sm = !n && searchedAtPoint(p);
      const m = !n && !sm && monsterAtPoint(p);
      const dr = !n && !sm && !m && doorAtPoint(p), l = !n && !sm && !m && !dr && floorChangeAtPoint(p);
      // An NPC of the quest you're on opens its conversation straight away (13f-0b, user); others their window.
      if (n) { selectNpc(n); if (questNpcs.current.has(n.n.toLowerCase())) openTalk(n); }
      else if (sm) {
        // A searched monster: on another floor, go to it there (Back returns); then its window.
        if (!sm.here) jump({ x: sm.p[0], y: sm.p[1], z: sm.p[2] }, { zoom: Math.max(view.current.zoom, MAIN_FROM) });
        selectMonster({ kind: sm.kind, group: sm.group });
      }
      else if (m) selectMonster({ kind: m.kind, group: m.group });
      else if (l) takeLink(l);
      else { selectNpc(null); selectMonster(null); selectDoor(dr || null); }
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

  // Wheel: one zoom step per notch (trackpads add up small deltas); Ctrl + wheel: one floor per notch
  // (forward = down). Not passive, so the page neither scrolls nor zooms.
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
      Home: goHome,
    };
    if (keys[e.key]) { e.preventDefault(); keys[e.key](); }
  };

  // The minimap: a click moves the map there (same floor and zoom), a drag pulls the map along like dragging the map
  // itself (faster, as the minimap is further out). Hovering shows the position under the mouse.
  const miniDrag = useRef(null);
  const miniPoint = (e) => {
    const c = miniRef.current, r = c.getBoundingClientRect(), k = c.width / r.width;
    return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
  };
  const miniTile = (p) => {
    const m = mini.current;
    return { x: Math.floor((p.x - m.ox) / m.sm), y: Math.floor((p.y - m.oy) / m.sm), z: view.current.z };
  };
  const onMiniDown = (e) => {
    if ((e.button !== 0 && e.pointerType === 'mouse') || !mini.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    cancelAnimationFrame(glide.current);
    const p = miniPoint(e);
    miniDrag.current = { start: p, last: p, moved: false };
  };
  const onMiniMove = (e) => {
    if (!mini.current) return;
    const p = miniPoint(e), d = miniDrag.current;
    setHover(miniTile(p));
    if (!d) return;
    if (!d.moved && Math.hypot(p.x - d.start.x, p.y - d.start.y) < 3 * Math.max(1, Math.round(window.devicePixelRatio || 1))) return;
    d.moved = true;
    const v = view.current, sm = mini.current.sm;
    flight.current = null;
    anim.current.anchor = null;
    v.x -= (p.x - d.last.x) / sm; v.y -= (p.y - d.last.y) / sm;
    d.last = p;
    viewChanged();
  };
  const onMiniUp = (e) => {
    const d = miniDrag.current;
    miniDrag.current = null;
    if (!d || d.moved || e.type === 'pointercancel' || !mini.current) return;
    const v = view.current;
    goTo(miniTile(miniPoint(e)), { zoom: v.zoom, cut: v.cut });
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
    if (r.kind === 'Quest') { goToQuest(r.quest); return; }
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
      {/* The quest panel (13f-0): the quest list and the open quest, left of the map (the right panel is too narrow
          for steps and dialogs). Open until closed; the map gets narrower. */}
      {questsOpen && (
        <div className="tm-side tm-left" style={{ zoom: uiScale / dpr }}>
          {world && ready && !questSel && (
            <QuestList
              world={world} selected={questSel?.quest} onQuest={onQuest} onPick={goToQuest} onClose={closeQuests}
              login={dbCfg ? login : null} onLogIn={() => logIn(dbCfg)} onLogOut={() => logOut(dbCfg)}
            />
          )}
          {questSel && world && (
            <QuestWindow
              world={world} chest={questSel} onQuest={onQuest} setOn={followQuest}
              onSave={login.editor ? saveDbQuest : null}
              guide={dbCfg && questSel.quest.db ? {
                guide: guide?.quest === questSel.quest ? guide.guide : null, error: guide?.quest === questSel.quest ? guide.error : null,
                ed: guideEd, editStep, setEditStep, onGo: (p) => jump({ x: p[0], y: p[1], z: p[2] }),
                at: atOf(questSel.quest.db.id), setAt: (id) => setAt(questSel.quest.db.id, id),
                legs: legInfo?.quest.db.id === questSel.quest.db.id ? legInfo : null,
                // "Route here": the Route panel's To becomes the step (your own From stays), only when asked (13e).
                onRouteTo: (label, pos) => updateRoute({ to: { label: label.slice(0, 60), pos } }),
              onTalk: talkTo,
              } : null}
              onItem={(id) => setItem({ id, fluid: null })} onClose={closeQuests} onBack={() => selectQuest(null)}
            />
          )}
        </div>
      )}
      <div className="tm-map" ref={wrapRef} tabIndex={0} onKeyDown={onKeyDown}>
        <canvas
          ref={canvasRef} className="tm-canvas"
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          onPointerLeave={() => { setHover(null); setHoverLink(null); }}
          onContextMenu={(e) => {
            e.preventDefault();
            const r = wrapRef.current.getBoundingClientRect(), t = seenTileAt(toCanvas(e));
            setMenu({ x: e.clientX - r.left, y: e.clientY - r.top, tile: [t.x, t.y, t.z] });
          }}
        />
        {!ready && <div className="tm-loading">Loading map...</div>}
        {talkNpc && world && <NpcTalk world={world} npc={talkNpc} raw={!!login.editor} elRef={talkEl} zoom={uiScale / dpr} onResize={redraw} onClose={() => openTalk(null)} />}
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
                ...(devTools && world?.customEditable ? [['Add location here', () => { setLocName(''); setMenu({ ...menu, adding: true }); }, true]] : []),
                ...(guideEd && !guide.guide.missing ? [[`Add step here (${guide.quest.n.replace(/ Quest$/, '')})`, () => addGuideStep({ kind: 'go', x: menu.tile[0], y: menu.tile[1], z: menu.tile[2] })]] : []),
                // A Reward step (database step 6): the chest's spot; the object is the item on that tile when there is one.
                ...(guideEd && !guide.guide.missing ? [['Add reward step here', () => addGuideStep({ kind: 'reward', x: menu.tile[0], y: menu.tile[1], z: menu.tile[2], object: topItemAt(menu.tile) })]] : []),
                ...(guideEd && editStep ? [['Move step here', () => moveEditStep(menu.tile)]] : []),
                ...(devTools && world?.customEditable ? world.customAt(...menu.tile).map((n) => [`Remove '${n}'`, () => saveLocation({ remove: { n, p: menu.tile } })]) : []),
              ].map(([label, act, keepOpen]) => (
                <button type="button" key={label} className="tm-menu-item" onClick={() => { if (!keepOpen) setMenu(null); act(); }}>{label}</button>
              ))}
            </div>
            </div>
          </>
        )}
      </div>
      <div className="tm-side" style={{ zoom: uiScale / dpr }}>
        <div className="tm-panel tm-mini-panel">
          <canvas
            ref={miniRef} className="tm-mini" width={MINI_W * uiScale} height={MINI_H * uiScale} style={{ width: MINI_W, height: MINI_H }}
            title="Minimap: click to go there, drag to move the map"
            onPointerDown={onMiniDown} onPointerMove={onMiniMove} onPointerUp={onMiniUp} onPointerCancel={onMiniUp}
            onPointerLeave={() => setHover(null)}
          />
          <div className="tm-mini-row">
            <div className="tm-nav">
              <button type="button" className="tm-gbtn tm-gbtn-zoomout" onClick={() => zoomBy(-1)} disabled={ui.zoom === ZOOMS[0]} title="Zoom out (-)" aria-label="Zoom out" />
              <button type="button" className="tm-gbtn tm-gbtn-up" onClick={() => setFloor(ui.z - 1)} disabled={!world?.floors?.includes(ui.z - 1)} title="Floor up (Page Up)" aria-label="Floor up" />
              <button type="button" className="tm-gbtn tm-gbtn-zoomin" onClick={() => zoomBy(1)} disabled={ui.zoom === ZOOMS[ZOOMS.length - 1]} title="Zoom in (+)" aria-label="Zoom in" />
              <button type="button" className="tm-gbtn tm-gbtn-down" onClick={() => setFloor(ui.z + 1)} disabled={!world?.floors?.includes(ui.z + 1)} title="Floor down (Page Down)" aria-label="Floor down" />
            </div>
            <div className="tm-info">
              <div>Floor {ui.z}{ui.z === 7 ? ' (ground)' : ui.z < 7 ? ` (+${7 - ui.z})` : ` (-${ui.z - 7})`}</div>
              <div title="Ctrl + mouse wheel (or Ctrl + +/-): a floor down (forward) or up (backward)">
                {ui.z > 7 || ui.cut >= ui.z ? 'This floor only' : ui.cut ? `Layers from floor ${ui.cut}` : 'All layers'}
              </div>
              <div className="tm-pos">{hover ? `${hover.x}, ${hover.y}, ${hover.z}` : ' '}</div>
            </div>
          </div>
        </div>
        <form className="tm-panel tm-goto" onSubmit={onSearch} role="search">
          <div className="tm-search-head">
            <label htmlFor="tm-search">Search</label>
            <span className="tm-search-btns">
              <button type="button" className="tm-btn" onClick={goBack} disabled={!backCount} title="Back to where you were (or the browser's back key)">Back</button>
              <button type="button" className="tm-btn" onClick={goHome} title="Show the whole world (Home key)">Home</button>
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
          {/* Route and Quests on their own row: with Back and Home they don't fit the panel's width */}
          <div className="tm-goto-tools">
            <button type="button" className="tm-btn" onClick={() => setRoute((r) => ({ ...r, open: true }))} title="Plan a route (or right-click the map)">Route</button>
            <button type="button" className="tm-btn" onClick={() => (questsOpen ? closeQuests() : setQuestsOpen(true))} disabled={!ready} title="The quests, to look up and follow (a panel left of the map)">Quests</button>
          </div>
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
            onRoute={() => updateRoute({ to: { label: npc.n, pos: npc.p } })} onTalk={() => openTalk(npc)}
            addStepTo={guideEd && !guide.guide.missing ? guide.quest.n : null} onAddStep={() => addGuideStep({ kind: 'talk', npc: npc.n, x: npc.p[0], y: npc.p[1], z: npc.p[2] })}
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

