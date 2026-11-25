// Find Person ("exiva", user 2026-11-25): what the spell says about someone, and where they can be after several
// casts. The answer is worked out exactly as the spell does it (TVP data/scripts/spells/support/find_person.lua):
// distance is the larger of the x and y differences (under 5 next to you, up to 100 "to the", up to 249 "far to
// the", then "very far to the"); the direction is one of 8 slices with edges at 22.5 degrees (tangents 0.4142 and
// 2.4142). The floor only changes the wording ("above you", "on a lower level to the"), not the zone.

// Directions in canvas angle order (0 = east, then clockwise on screen since y grows south).
export const EXIVA_DIRS = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
export const EXIVA_BANDS = ['next to you', 'to the', 'far to the', 'very far to the'];

// The answer for a caster at (cx, cy) and a person at (tx, ty): { band: 0-3, dir: 0-7 (-1 when next to you) }.
export function exivaAnswer(cx, cy, tx, ty) {
  const dx = cx - tx, dy = cy - ty, m = Math.max(Math.abs(dx), Math.abs(dy));
  if (m < 5) return { band: 0, dir: -1 };
  const band = m < 101 ? 1 : m < 250 ? 2 : 3;
  const t = dx !== 0 ? dy / dx : 10, a = Math.abs(t);
  let dir;
  if (a < 0.4142) dir = dx > 0 ? 4 : 0;
  else if (a < 2.4142) dir = t > 0 ? (dy > 0 ? 5 : 1) : (dx > 0 ? 3 : 7);
  else dir = dy > 0 ? 6 : 2;
  return { band, dir };
}

export const exivaText = (ans) => (ans.band === 0 ? EXIVA_BANDS[0] : `${EXIVA_BANDS[ans.band]} ${EXIVA_DIRS[ans.dir]}`);
export const sameAnswer = (a, b) => a.band === b.band && (a.band === 0 || a.dir === b.dir);

// Every answer the spell can give, for the answer picker: next to you, then each band's 8 directions.
export const EXIVA_ANSWERS = [{ band: 0, dir: -1 }, ...[1, 2, 3].flatMap((band) => EXIVA_DIRS.map((_, dir) => ({ band, dir })))];

// Where the person can be after the answered casts (readings: [{ p: [x, y, z], ans }]), on a grid of `cell` tiles
// over the map's bounds (the middle tile of each cell is tested). Returns { canvas, x0, y0, cell, left } where the
// canvas has one pixel per cell, dark where they can't be, clear where they can; left: how many cells are left.
export function exivaOverlap(bounds, readings, cell = 2) {
  const x0 = Math.floor(bounds.x1 / cell) * cell, y0 = Math.floor(bounds.y1 / cell) * cell;
  const w = Math.ceil((bounds.x2 + 1 - x0) / cell), h = Math.ceil((bounds.y2 + 1 - y0) / cell);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d'), img = ctx.createImageData(w, h), px = img.data;
  const half = Math.floor(cell / 2);
  let left = 0;
  for (let j = 0; j < h; j++) {
    const ty = y0 + j * cell + half;
    for (let i = 0; i < w; i++) {
      const tx = x0 + i * cell + half;
      let ok = true;
      for (const r of readings) if (!sameAnswer(exivaAnswer(r.p[0], r.p[1], tx, ty), r.ans)) { ok = false; break; }
      const o = (j * w + i) * 4;
      if (ok) left++;
      else { px[o + 3] = 150; } // black at about 60%
    }
  }
  ctx.putImageData(img, 0, 0);
  return { canvas, x0, y0, cell, left };
}
