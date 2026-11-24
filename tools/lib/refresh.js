// Refresh tiles (user 2026-11-24): the OTBM tile flag 0x20 (CipSoft's "refresh"). On Ryndean's 7.2 map it marks
// town areas (temples, depots, streets), not caves: most likely the tiles restored at server save. The converted 7.1
// map has no such flags, so 7.1 borrows them from the 7.2 map (user's choice).
// refresh.bin: one bit per tile (bit i of byte i >> 3 = tile i in row order), 128 bytes per chunk, chunks in the order
// of map.json "chunks" (as walk.bin).
import { walkNodes, Reader } from './nodefile.js';

const OTBM = { TILE_AREA: 4, TILE: 5, HOUSETILE: 14 };
export const REFRESH_FLAG = 0x20;

// The refresh tiles of an OTBM map: Set of "x,y,z".
export function readRefresh(file) {
  const set = new Set();
  let area = null;
  walkNodes(file, (node) => {
    const r = new Reader(node.data);
    if (node.type === OTBM.TILE_AREA) { area = [r.u16(), r.u16(), r.u8()]; return true; }
    if (node.type === OTBM.TILE || node.type === OTBM.HOUSETILE) {
      const x = area[0] + r.u8(), y = area[1] + r.u8();
      if (node.type === OTBM.HOUSETILE) r.u32();
      while (r.left > 0) {
        const a = r.u8();
        if (a === 3) { if (r.u32() & REFRESH_FLAG) set.add(`${x},${y},${area[2]}`); } else if (a === 9) r.u16(); else break;
      }
      return false;
    }
    return true;
  });
  return set;
}

// refresh.bin for the chunks of map.json (chunks[z] = [[cx, cy], ...]).
export function refreshBin(set, chunks, CHUNK = 32) {
  const per = (CHUNK * CHUNK) / 8, parts = [];
  for (let z = 0; z < 16; z++) {
    for (const [cx, cy] of chunks[z] || []) {
      const buf = Buffer.alloc(per);
      for (let i = 0; i < CHUNK * CHUNK; i++) {
        if (set.has(`${cx * CHUNK + (i % CHUNK)},${cy * CHUNK + Math.floor(i / CHUNK)},${z}`)) buf[i >> 3] |= 1 << (i & 7);
      }
      parts.push(buf);
    }
  }
  return Buffer.concat(parts);
}
