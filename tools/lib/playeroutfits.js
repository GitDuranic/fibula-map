// Player outfits for "Players in houses" (slice 17b): players can have any colours, so their outfits can't be
// pre-coloured like NPCs. This writes each player outfit standing, facing south, twice: the plain sprite and its
// colour mask (yellow head, red body, green legs, blue feet); the map colours them itself (engine/outfit.js).
// player-outfits.png: one 64x64 cell per outfit, plain sprite in row 0, mask in row 1.
// player-outfits.json: { cell: 64, types: { looktype: [column, width, height, displacement x, displacement y] } }
import { spriteIndex } from './dat.js';
import { blit } from './spr.js';

// The 7.x player outfits (male 128-134, female 136-142; 135 is not a player outfit but harmless).
export const PLAYER_LOOKTYPES = Array.from({ length: 15 }, (_, i) => 128 + i);
const CELL = 64, SOUTH = 2;

function layer(spr, t, n) {
  const W = t.width * 32, H = t.height * 32, img = new Uint8Array(W * H * 4);
  const px = Math.min(SOUTH, t.patternX - 1);
  for (let h = 0; h < t.height; h++) for (let w = 0; w < t.width; w++) {
    const s = spr.get(t.sprites[spriteIndex(t, w, h, n, px, 0, 0, 0)]);
    if (!s) continue;
    const ox = (t.width - 1 - w) * 32, oy = (t.height - 1 - h) * 32;
    for (let p = 0; p < 1024; p++) {
      if (!s[p * 4 + 3]) continue;
      const d = ((oy + (p >> 5)) * W + ox + (p & 31)) * 4;
      for (let k = 0; k < 4; k++) img[d + k] = s[p * 4 + k];
    }
  }
  return { width: W, height: H, data: img };
}

export function buildPlayerOutfits(dat, spr) {
  const types = {}, cols = PLAYER_LOOKTYPES.length, W = cols * CELL, H = 2 * CELL;
  const sheet = new Uint8Array(W * H * 4);
  PLAYER_LOOKTYPES.forEach((type, i) => {
    const t = dat.outfits[type - 1];
    if (!t || t.width * 32 > CELL || t.height * 32 > CELL) return;
    const base = layer(spr, t, 0);
    blit(sheet, W, base.data, base.width, base.height, i * CELL, 0, H);
    if (t.layers > 1) { const mask = layer(spr, t, 1); blit(sheet, W, mask.data, mask.width, mask.height, i * CELL, CELL, H); }
    const disp = t.flags.DISPLACEMENT;
    types[type] = [i, base.width, base.height, disp ? disp.x : 0, disp ? disp.y : 0];
  });
  return { width: W, height: H, data: sheet, json: { cell: CELL, types } };
}
