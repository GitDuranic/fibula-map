// Draws map tiles the way the 7.x client does (adapted from the house planner's engine):
// floors bottom-up, tiles row by row, each stack as ground, borders, bottom items, common items, top items.
export const TILE = 32;
const MAX_ELEVATION = 24;
// Server liquid types -> client fluid colors (0 empty, 1 blue, 2 red, 3 brown, 4 green, 5 yellow, 6 white, 7 purple).
const FLUID_COLOR = [0, 1, 7, 3, 3, 2, 4, 3, 5, 6, 7, 2, 5];

const G = { GROUND: 0, BORDER: 1, BOTTOM: 2, COMMON: 3, TOP: 4 };
function groupOf(def) {
  const f = def?.f || {};
  if (f.GROUND !== undefined) return G.GROUND;
  if (f.GROUND_BORDER) return G.BORDER;
  if (f.ON_BOTTOM) return G.BOTTOM;
  if (f.ON_TOP) return G.TOP;
  return G.COMMON;
}

// A tile's items in draw order, keeping the map order within a group.
function drawOrder(items, defs) {
  return items.map((it, i) => ({ it, i, g: groupOf(defs[it.id]) })).sort((a, b) => a.g - b.g || a.i - b.i).map((e) => e.it);
}

function stackPattern(count) {
  if (count <= 1) return 0;
  if (count < 5) return count - 1;
  if (count < 10) return 4;
  if (count < 25) return 5;
  if (count < 50) return 6;
  return 7;
}

function spriteIndex(d, w, h, layer, px, py, pz, phase) {
  return (((((phase * d.pz + pz) * d.py + py) * d.px + px) * d.l + layer) * d.h + h) * d.w + w;
}

function hookOf(t, defs) {
  for (const it of t.items) {
    const f = defs[it.id]?.f;
    if (f?.HOOK_SOUTH) return 'south';
    if (f?.HOOK_EAST) return 'east';
  }
  return null;
}

// Draws one tile with its top-left corner at (dx, dy). drawSprite(slot, x, y) draws a 32x32 atlas sprite.
export function drawTile(defs, t, dx, dy, drawSprite) {
  let elevation = 0;
  const hook = hookOf(t, defs);
  for (const it of drawOrder(t.items, defs)) {
    const def = defs[it.id];
    if (!def) continue;
    drawItem(def, it, t, dx - elevation, dy - elevation, drawSprite, hook);
    if (def.f.ELEVATION) elevation = Math.min(MAX_ELEVATION, elevation + def.f.ELEVATION);
  }
}

function itemPattern(def, it, t, hook) {
  const f = def.f;
  let px = 0, py = 0, pz = 0;
  if (f.STACKABLE) {
    const i = stackPattern(it.count ?? 1);
    px = i % def.px; py = Math.floor(i / def.px) % def.py;
  } else if (f.FLUID_CONTAINER || f.SPLASH) {
    const c = FLUID_COLOR[it.count ?? 0] ?? 0;
    px = c % def.px; py = Math.floor(c / def.px) % def.py;
  } else if (f.HANGABLE) {
    if (hook === 'south' && def.px >= 2) px = 1;
    else if (hook === 'east' && def.px >= 3) px = 2;
  } else {
    px = t.x % def.px; py = t.y % def.py; pz = t.z % def.pz;
  }
  return { px, py, pz };
}

function drawItem(def, it, t, dx, dy, drawSprite, hook) {
  const { px, py, pz } = itemPattern(def, it, t, hook);
  if (def.f.DISPLACEMENT) { dx -= def.f.DISPLACEMENT.x; dy -= def.f.DISPLACEMENT.y; }
  // Old clients draw every layer of an item (e.g. shore tiles = water + shoreline). Animation phase 0.
  for (let l = 0; l < def.l; l++) {
    for (let h = 0; h < def.h; h++) {
      for (let w = 0; w < def.w; w++) {
        // Some grounds in this dat have a second pattern-Z set that is empty (e.g. grass-stone edge 272):
        // fall back to the first set instead of drawing nothing (a black square).
        const slot = def.s[spriteIndex(def, w, h, l, px, py, pz, 0)] || (pz ? def.s[spriteIndex(def, w, h, l, px, py, 0, 0)] : 0);
        if (slot) drawSprite(slot, dx - w * TILE, dy - h * TILE);
      }
    }
  }
}
