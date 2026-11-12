// Decoders for the old (pre-9.6) Tibia.spr and Tibia.pic formats.
import fs from 'node:fs';

// Decode one RLE sprite at `offset` (pointing at the 3-byte color key) into 32x32 RGBA.
function decodeRle(buf, offset, hasColorKey = true) {
  const out = new Uint8Array(32 * 32 * 4);
  let p = offset + (hasColorKey ? 3 : 0);
  const size = buf.readUInt16LE(p); p += 2;
  const end = p + size;
  let px = 0;
  while (p < end && px < 1024) {
    const transparent = buf.readUInt16LE(p); p += 2;
    const colored = buf.readUInt16LE(p); p += 2;
    px += transparent;
    for (let i = 0; i < colored && px < 1024; i++, px++) {
      out[px * 4] = buf[p++]; out[px * 4 + 1] = buf[p++]; out[px * 4 + 2] = buf[p++]; out[px * 4 + 3] = 255;
    }
  }
  return out;
}

export function openSpr(file) {
  const buf = fs.readFileSync(file);
  const signature = buf.readUInt32LE(0);
  const count = buf.readUInt16LE(4);
  const cache = new Map();
  return {
    signature, count,
    // Returns RGBA Uint8Array(4096) or null for an empty sprite.
    get(id) {
      if (id <= 0 || id > count) return null;
      if (cache.has(id)) return cache.get(id);
      const off = buf.readUInt32LE(6 + (id - 1) * 4);
      const px = off === 0 ? null : decodeRle(buf, off);
      cache.set(id, px);
      return px;
    },
  };
}

// Tibia.pic: u32 signature, u16 count, then per image: u8 w, u8 h (in 32px cells), 3-byte color key,
// then w*h u32 offsets to RLE sprite data (u16 size + runs, no color key).
export function readPic(file) {
  const buf = fs.readFileSync(file);
  const signature = buf.readUInt32LE(0);
  const count = buf.readUInt16LE(4);
  let p = 6;
  const images = [];
  for (let i = 0; i < count; i++) {
    const w = buf[p], h = buf[p + 1]; p += 5;
    const img = new Uint8Array(w * 32 * h * 32 * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const off = buf.readUInt32LE(p); p += 4;
      const cell = decodeRle(buf, off, false);
      blit(img, w * 32, cell, 32, 32, x * 32, y * 32);
    }
    images.push({ width: w * 32, height: h * 32, data: img });
  }
  return { signature, images };
}

// Copy an RGBA block into a destination RGBA image (alpha-respecting, no blending needed: 0 or 255).
export function blit(dst, dstW, src, srcW, srcH, dx, dy, dstH = Infinity) {
  for (let y = 0; y < srcH; y++) {
    const ty = dy + y;
    if (ty < 0 || ty >= dstH) continue;
    for (let x = 0; x < srcW; x++) {
      const tx = dx + x;
      if (tx < 0 || tx >= dstW) continue;
      const s = (y * srcW + x) * 4;
      if (src[s + 3] === 0) continue;
      const d = (ty * dstW + tx) * 4;
      dst[d] = src[s]; dst[d + 1] = src[s + 1]; dst[d + 2] = src[s + 2]; dst[d + 3] = src[s + 3];
    }
  }
}
