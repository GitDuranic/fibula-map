// Streaming reader for the OpenTibia binary node format used by items.otb and map.otbm.
// 0xFE = node start, 0xFF = node end, 0xFD = escape next byte.
import fs from 'node:fs';

const START = 0xfe, END = 0xff, ESC = 0xfd;

// Calls visit(node, depth) for each node in document order, where node = { type, data: Buffer, parent }.
// If visit returns false the node's children are skipped (still parsed for structure).
export function walkNodes(file, visit) {
  const buf = fs.readFileSync(file);
  let p = 4; // 4-byte identifier
  if (buf[p] !== START) throw new Error('Not a node file: ' + file);
  const stack = [];
  const scratch = Buffer.alloc(1 << 20);
  while (p < buf.length) {
    const b = buf[p++];
    if (b === START) {
      const type = buf[p++];
      let n = 0;
      // read data until next unescaped START/END
      while (p < buf.length) {
        const c = buf[p];
        if (c === START || c === END) break;
        if (c === ESC) { scratch[n++] = buf[p + 1]; p += 2; } else { scratch[n++] = c; p++; }
      }
      const parent = stack[stack.length - 1] || null;
      const node = { type, data: Buffer.from(scratch.subarray(0, n)), parent, skip: parent?.skip || false };
      if (!node.skip && visit(node, stack.length) === false) node.skip = true;
      stack.push(node);
    } else if (b === END) {
      stack.pop();
      if (stack.length === 0) break;
    } else {
      throw new Error(`Unexpected byte ${b} at ${p - 1}`);
    }
  }
}

export class Reader {
  constructor(buf) { this.b = buf; this.p = 0; }
  get left() { return this.b.length - this.p; }
  u8() { return this.b[this.p++]; }
  u16() { const v = this.b.readUInt16LE(this.p); this.p += 2; return v; }
  u32() { const v = this.b.readUInt32LE(this.p); this.p += 4; return v; }
  str() { const n = this.u16(); const s = this.b.toString('latin1', this.p, this.p + n); this.p += n; return s; }
  skip(n) { this.p += n; }
}

// items.otb -> Map(serverId -> clientId), plus version info.
export function parseOtb(file) {
  const map = new Map();
  const flags = new Map(); // serverId -> otb flags (bit 32 pickupable, 64 moveable)
  let version = null;
  walkNodes(file, (node, depth) => {
    const r = new Reader(node.data);
    const nodeFlags = r.u32();
    if (depth === 0) {
      if (r.left > 0 && r.u8() === 0x01) { r.u16(); version = { major: r.u32(), minor: r.u32(), build: r.u32() }; }
      return;
    }
    let sid = 0, cid = 0;
    while (r.left > 0) {
      const attr = r.u8(), len = r.u16();
      if (attr === 0x10) sid = r.b.readUInt16LE(r.p);
      else if (attr === 0x11) cid = r.b.readUInt16LE(r.p);
      r.skip(len);
    }
    if (sid) { map.set(sid, cid); flags.set(sid, nodeFlags); }
  });
  return { version, map, flags };
}
