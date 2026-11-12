// Tibia Map: a Google Maps-style viewer of the Tibia 7.1 world, drawn with the real game sprites.
// Props: dataUrl (where the converted map data lives), height (CSS height of the map), syncUrl (keep the view in the URL hash).
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { World } from './engine/world.js';
import NpcWindow from './NpcWindow.jsx';
import ItemWindow from './ItemWindow.jsx';
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
const MAIN_FROM = 64;
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
  const [npc, setNpc] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [hover, setHover] = useState(null);
  const [ui, setUi] = useState({ z: view.current.z, zoom: view.current.zoom, cut: 0 });
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [active, setActive] = useState(0); // highlighted search result
  const [item, setItem] = useState(null); // the item whose window is open: { id, fluid }
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
          const upward = l[5] < l[2];
          ctx.fillStyle = upward ? 'rgba(255,160,0,0.8)' : 'rgba(0,120,255,0.8)';
          ctx.fillRect(sx + k0, sy + k0, s - 2 * k0, s - 2 * k0);
          ctx.fillStyle = '#fff';
          ctx.fillText((upward ? '↑' : '↓') + world.walk.kinds[l[6]][0].toUpperCase(), sx + s / 2, sy + s / 2);
        }
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
      if (window.location.hash !== h) window.history.replaceState(null, '', h);
    }, 250);
  }, [redraw, syncUrl]);

  // ---------- loading ----------
  useEffect(() => {
    const world = new World(dataUrl, () => redraw());
    worldRef.current = world;
    world.load().then(() => {
      const v = view.current;
      if (!world.floors.includes(v.z)) v.z = 7;
      if (DEBUG_WALK) world.loadWalk().then(() => redraw());
      setReady(true);
      viewChanged();
    }, (e) => setError(e.message));
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
    return () => window.removeEventListener('hashchange', onHash);
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
    if (!world || !world.floors.includes(z)) return;
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

  // Flies the map to tile (x, y) on floor z at a zoom (default: at least MAIN_FROM). Zoomed in on the surface it
  // shows that floor only, so the place isn't hidden under a roof; `cut` overrides that.
  const hashTimerFly = useRef(0);
  const goTo = useCallback((p, { zoom, cut } = {}) => {
    const v = view.current;
    if (worldRef.current?.floors.includes(p.z)) v.z = p.z;
    v.zoom = zoom ?? Math.max(v.zoom, MAIN_FROM);
    v.cut = cut ?? (v.zoom >= MAIN_FROM && v.z <= 7 ? v.z : 0);
    anim.current.anchor = null;
    const dist = Math.hypot(p.x + 0.5 - v.x, p.y + 0.5 - v.y);
    const dur = Math.min(1000, 250 + dist * 2);
    flight.current = { fx: v.x, fy: v.y, tx: p.x + 0.5, ty: p.y + 0.5, t0: performance.now(), dur };
    viewChanged();
    clearTimeout(hashTimerFly.current);
    hashTimerFly.current = setTimeout(viewChanged, dur + 50); // the URL once it has arrived
  }, [viewChanged]);

  const selectNpc = useCallback((n) => {
    selected.current = n;
    setNpc(n);
    if (n) setItem(null);
    redraw();
  }, [redraw]);

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

  const onPointerMove = (e) => {
    const p = toCanvas(e);
    if (!pointers.current.has(e.pointerId)) {
      setHover(tileAt(p));
      if (e.pointerType === 'mouse') e.currentTarget.style.cursor = npcAtPoint(p) ? 'pointer' : '';
      return;
    }
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
    if (d && !d.moved) { selectNpc(npcAtPoint(toCanvas(e))); return; } // a click: open the NPC there, or close
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
    setResults(worldRef.current ? worldRef.current.search(text) : []);
    setActive(0);
  };
  // Opens a search result: flies there (and opens the NPC), or opens the item window.
  const pick = (r) => {
    if (!r) return;
    setResults([]);
    setQuery(r.name);
    if (r.kind === 'Position') goTo(r.pos);
    else if (r.kind === 'NPC') { goTo({ x: r.npc.p[0], y: r.npc.p[1], z: r.npc.p[2] }); selectNpc(r.npc); }
    else if (r.kind === 'Depot') goTo({ x: r.place.p[0], y: r.place.p[1], z: r.place.p[2] });
    else if (r.kind === 'Item') { selectNpc(null); setItem(r.item); }
    else {
      // A town or place: an overview with the roofs on, from its temple (the surface, unless it's underground).
      const [x, y, z] = r.place.p;
      goTo({ x, y, z: z > 7 ? z : 7 }, { zoom: 16, cut: 0 });
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

  const world = worldRef.current;
  const skin = { '--tm-stone': `url(${dataUrl}/stone.png)`, '--tm-gui': `url(${dataUrl}/gui.png)` };
  if (error) return <div className="tm tm-loading" style={{ height }}>Could not load the map: {error}</div>;

  return (
    <div className="tm" style={{ ...skin, height }}>
      <div className="tm-map" ref={wrapRef} tabIndex={0} onKeyDown={onKeyDown}>
        <canvas
          ref={canvasRef} className="tm-canvas"
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          onPointerLeave={() => setHover(null)}
        />
        {!ready && <div className="tm-loading">Loading map...</div>}
      </div>
      <div className="tm-side" style={{ zoom: uiScale / dpr }}>
        <div className="tm-panel">
          <div className="tm-nav">
            <button type="button" className="tm-rose" onClick={onRose} title="Move the view (or use the arrow keys)" aria-label="Move the view" />
            <button type="button" className="tm-gbtn tm-gbtn-zoomout" onClick={() => zoomBy(-1)} disabled={ui.zoom === ZOOMS[0]} title="Zoom out (-)" aria-label="Zoom out" />
            <button type="button" className="tm-gbtn tm-gbtn-up" onClick={() => setFloor(ui.z - 1)} disabled={!world?.floors.includes(ui.z - 1)} title="Floor up (Page Up)" aria-label="Floor up" />
            <button type="button" className="tm-gbtn tm-gbtn-zoomin" onClick={() => zoomBy(1)} disabled={ui.zoom === ZOOMS[ZOOMS.length - 1]} title="Zoom in (+)" aria-label="Zoom in" />
            <button type="button" className="tm-gbtn tm-gbtn-down" onClick={() => setFloor(ui.z + 1)} disabled={!world?.floors.includes(ui.z + 1)} title="Floor down (Page Down)" aria-label="Floor down" />
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
          <label htmlFor="tm-search">Search</label>
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
        {npc && world && (
          <NpcWindow world={world} npc={npc} onClose={() => selectNpc(null)} onTravel={(t) => goTo({ x: t[2], y: t[3], z: t[4] })} />
        )}
        {item && world && (
          <ItemWindow
            world={world} item={item} onClose={() => setItem(null)}
            onNpc={(n) => { goTo({ x: n.p[0], y: n.p[1], z: n.p[2] }); selectNpc(n); }}
          />
        )}
      </div>
    </div>
  );
}

