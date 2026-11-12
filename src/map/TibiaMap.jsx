// Tibia Map: a Google Maps-style viewer of the Tibia 7.1 world, drawn with the real game sprites.
// Props: dataUrl (where the converted map data lives), height (CSS height of the map), syncUrl (keep the view in the URL hash).
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { World } from './engine/world.js';
import './tibia-map.css';

// Zoom steps in screen (device) pixels per tile. Whole pixels per game pixel from 32 up keep sprites sharp.
const ZOOMS = [0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 96, 128, 160];
const SPRITES_FROM = 16; // below this: only the pre-drawn overview images (live drawing is too slow that far out)
const PEEL_FROM = 32; // from this zoom, zooming over a building also takes its layers off (roof, upper floors)
const START = { x: 32369, y: 32221, z: 7, zoom: 32 }; // Thais

const nearestZoom = (s) => ZOOMS.reduce((b, z) => (Math.abs(Math.log(z / s)) < Math.abs(Math.log(b / s)) ? z : b), ZOOMS[0]);

function readHash() {
  const m = /^#(\d+),(\d+),(\d+)(?:,([\d.]+))?/.exec(window.location.hash);
  if (!m) return null;
  return { x: +m[1] + 0.5, y: +m[2] + 0.5, z: +m[3], zoom: m[4] ? nearestZoom(+m[4]) : START.zoom };
}

// Parses "32369, 32221, 7" (any separators); z is optional.
function parsePosition(text, z) {
  const n = text.match(/\d+/g)?.map(Number);
  if (!n || n.length < 2) return null;
  return { x: n[0], y: n[1], z: n.length > 2 && n[2] <= 15 ? n[2] : z };
}

export default function TibiaMap({ dataUrl = '/map-data', height = '80vh', syncUrl = true }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const worldRef = useRef(null);
  const view = useRef({ ...START, ...(syncUrl && readHash()) }); // x, y = centre in tiles (fractional); z; zoom = target step
  const anim = useRef({ s: view.current.zoom, anchor: null }); // shown scale (animates to view.zoom)
  const frame = useRef(0);
  const opened = useRef([]); // buildings with layers taken off (see zoomBy)
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [hover, setHover] = useState(null);
  const [ui, setUi] = useState({ z: view.current.z, zoom: view.current.zoom });
  const [gotoText, setGotoText] = useState('');
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
          const c = world.chunkCanvas(v.z, cx, cy, 'above', ts, budget, opened.current);
          if (c) ctx.drawImage(c, ox + cx * C * s, oy + cy * C * s, C * s, C * s);
        }
      }
      if (budget.n < 0) more = true;
    }
    if (more) frame.current = requestAnimationFrame(draw);
  }, []);

  const redraw = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(draw);
  }, [draw]);

  // Keep the view in the URL (shareable links), without flooding the history.
  const hashTimer = useRef(0);
  const viewChanged = useCallback(() => {
    redraw();
    const v = view.current;
    setUi((u) => (u.z === v.z && u.zoom === v.zoom ? u : { z: v.z, zoom: v.zoom }));
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
      Object.assign(v, h);
      opened.current = [];
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
  // Zooming over a building also takes its layers off (in) or puts them back (out), one per step;
  // over the street it only zooms. sx, sy: the screen point zoomed around (default: the centre).
  const zoomBy = useCallback((steps, sx, sy) => {
    const v = view.current, canvas = canvasRef.current, world = worldRef.current;
    sx ??= canvas.width / 2; sy ??= canvas.height / 2;
    const s = anim.current.s;
    const wx = v.x + (sx - canvas.width / 2) / s, wy = v.y + (sy - canvas.height / 2) / s;
    const i = ZOOMS.indexOf(v.zoom), j = Math.max(0, Math.min(ZOOMS.length - 1, i + steps));
    let peeled = false;
    if (world && v.z <= 7 && steps > 0 && v.zoom >= PEEL_FROM) {
      // Take off the topmost layer still showing under the cursor, over its building (see World.peelArea).
      // It remembers the zoom it came off at: zooming back out past that puts it back.
      // The topmost layer still showing at (x, y), or -1.
      const topAt = (x, y) => {
        const pk = `${x},${y}`;
        for (let zz = 0; zz < v.z; zz++) {
          if (world.hasAt(x, y, v.z, zz) && !opened.current.some((o) => zz < o.cut && o.tiles.has(pk))) return zz;
        }
        return -1;
      };
      // Under the cursor, or else the nearest tile within 3 that has a layer showing: the cursor is often on an
      // open courtyard or a gap between wall pieces (Darashia's open-topped buildings).
      const cx0 = Math.floor(wx), cy0 = Math.floor(wy);
      let seed = null;
      for (let r = 0; r <= 3 && !seed; r++) {
        let best = null;
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; // this ring only
          const zz = topAt(cx0 + dx, cy0 + dy);
          if (zz >= 0 && (!best || zz < best.zz)) best = { x: cx0 + dx, y: cy0 + dy, zz };
        }
        seed = best;
      }
      if (seed) {
        const area = world.peelArea(seed.x, seed.y, v.z, seed.zz);
        if (area) { opened.current = [...opened.current, { ...area, cut: seed.zz + 1, zoom: ZOOMS[j] }]; peeled = true; }
      }
    } else if (steps < 0 && opened.current.length) {
      const keep = opened.current.filter((o) => o.zoom < v.zoom); // layers taken off at this zoom come back
      peeled = keep.length !== opened.current.length;
      opened.current = keep;
    }
    if (i === j) { if (peeled) viewChanged(); return; }
    anim.current.anchor = { sx, sy, wx, wy };
    v.zoom = ZOOMS[j];
    if (v.zoom < PEEL_FROM) opened.current = []; // zoomed out to the overview: every building closes again
    viewChanged();
  }, [viewChanged]);

  const setFloor = useCallback((z) => {
    const world = worldRef.current;
    if (!world || !world.floors.includes(z)) return;
    view.current.z = z;
    opened.current = [];
    viewChanged();
  }, [viewChanged]);

  const panBy = useCallback((dx, dy) => { // in device pixels
    const v = view.current, s = anim.current.s;
    v.x -= dx / s; v.y -= dy / s;
    anim.current.anchor = null;
    viewChanged();
  }, [viewChanged]);

  const goTo = useCallback((p) => {
    const v = view.current;
    v.x = p.x + 0.5; v.y = p.y + 0.5;
    if (worldRef.current?.floors.includes(p.z)) v.z = p.z;
    if (v.zoom < 64) { v.zoom = 64; anim.current.s = 64; }
    anim.current.anchor = null;
    viewChanged();
  }, [viewChanged]);

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
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, toCanvas(e));
    if (pointers.current.size === 1) drag.current = { last: toCanvas(e), t: performance.now(), vx: 0, vy: 0 };
    else if (pointers.current.size === 2) {
      const [p, q] = [...pointers.current.values()];
      drag.current = { pinch: Math.hypot(p.x - q.x, p.y - q.y), s0: anim.current.s };
    }
  };

  const onPointerMove = (e) => {
    const p = toCanvas(e);
    if (!pointers.current.has(e.pointerId)) { setHover(tileAt(p)); return; }
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
      v.zoom = nearestZoom(s);
      drag.current = null;
      viewChanged();
      return;
    }
    drag.current = null;
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

  // Wheel: one zoom step per notch (trackpads add up small deltas). Not passive, so the page doesn't scroll.
  const wheelAcc = useRef(0);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      wheelAcc.current += e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
      if (Math.abs(wheelAcc.current) < 50) return;
      const p = toCanvas(e);
      zoomBy(wheelAcc.current < 0 ? 1 : -1, p.x, p.y);
      wheelAcc.current = 0;
    };
    c.addEventListener('wheel', onWheel, { passive: false });
    return () => c.removeEventListener('wheel', onWheel);
  }, [zoomBy, ready]);

  const onKeyDown = (e) => {
    if (e.target.tagName === 'INPUT') return;
    const c = canvasRef.current, step = Math.min(c.width, c.height) / 4;
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

  const onGoto = (e) => {
    e.preventDefault();
    const p = parsePosition(gotoText, view.current.z);
    if (p) goTo(p);
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
            <div className="tm-pos">{hover ? `${hover.x}, ${hover.y}, ${hover.z}` : ' '}</div>
          </div>
        </div>
        <form className="tm-panel tm-goto" onSubmit={onGoto}>
          <label htmlFor="tm-goto-input">Go to position</label>
          <input
            id="tm-goto-input" className="tm-input" value={gotoText} placeholder="32369, 32221, 7"
            onChange={(e) => setGotoText(e.target.value)} spellCheck={false} autoComplete="off"
          />
        </form>
      </div>
    </div>
  );
}

