// Parser for the Tibia 7.55-7.72 client "Tibia.dat" (thing type definitions).
import fs from 'node:fs';

// Attribute ids as used by 7.55-7.72 clients.
export const ATTR = {
  GROUND: 0, GROUND_BORDER: 1, ON_BOTTOM: 2, ON_TOP: 3, CONTAINER: 4, STACKABLE: 5,
  FORCE_USE: 6, MULTI_USE: 7, WRITABLE: 8, WRITABLE_ONCE: 9, FLUID_CONTAINER: 10,
  SPLASH: 11, NOT_WALKABLE: 12, NOT_MOVEABLE: 13, BLOCK_PROJECTILE: 14, NOT_PATHABLE: 15,
  PICKUPABLE: 16, HANGABLE: 17, HOOK_SOUTH: 18, HOOK_EAST: 19, ROTATEABLE: 20, LIGHT: 21,
  DONT_HIDE: 22, FLOOR_CHANGE: 23, DISPLACEMENT: 24, ELEVATION: 25, LYING_CORPSE: 26,
  ANIMATE_ALWAYS: 27, MINIMAP_COLOR: 28, LENS_HELP: 29, FULL_GROUND: 30, LOOK: 31,
};

const FLAG_NAMES = Object.fromEntries(Object.entries(ATTR).map(([k, v]) => [v, k]));

export function parseDat(file) {
  const buf = fs.readFileSync(file);
  let p = 0;
  const u8 = () => buf[p++];
  const u16 = () => { const v = buf.readUInt16LE(p); p += 2; return v; };
  const u32 = () => { const v = buf.readUInt32LE(p); p += 4; return v; };

  const signature = u32();
  const itemCount = u16(), outfitCount = u16(), effectCount = u16(), missileCount = u16();
  const items = new Map();

  const readThing = (id) => {
    const t = { id, flags: {} };
    for (;;) {
      const a = u8();
      if (a === 0xff) break;
      const name = FLAG_NAMES[a];
      if (name === undefined) throw new Error(`Unknown dat attribute ${a} on thing ${id} at ${p - 1}`);
      switch (a) {
        case ATTR.GROUND: t.flags.GROUND = u16(); break;
        case ATTR.WRITABLE: case ATTR.WRITABLE_ONCE: t.flags[name] = u16(); break;
        case ATTR.LIGHT: t.flags.LIGHT = { intensity: u16(), color: u16() }; break;
        case ATTR.DISPLACEMENT: t.flags.DISPLACEMENT = { x: u16(), y: u16() }; break;
        case ATTR.ELEVATION: t.flags.ELEVATION = u16(); break;
        case ATTR.MINIMAP_COLOR: t.flags.MINIMAP_COLOR = u16(); break;
        case ATTR.LENS_HELP: t.flags.LENS_HELP = u16(); break;
        default: t.flags[name] = true;
      }
    }
    t.width = u8(); t.height = u8();
    t.exactSize = (t.width > 1 || t.height > 1) ? u8() : 32;
    t.layers = u8(); t.patternX = u8(); t.patternY = u8(); t.patternZ = u8();
    t.phases = u8();
    const n = t.width * t.height * t.layers * t.patternX * t.patternY * t.patternZ * t.phases;
    t.sprites = new Array(n);
    for (let i = 0; i < n; i++) t.sprites[i] = u16();
    return t;
  };

  for (let id = 100; id <= itemCount; id++) items.set(id, readThing(id));
  const outfits = [];
  for (let id = 1; id <= outfitCount; id++) outfits.push(readThing(id));
  for (let id = 1; id <= effectCount; id++) readThing(id);
  for (let id = 1; id <= missileCount; id++) readThing(id);

  if (p !== buf.length) throw new Error(`dat parse ended at ${p}, file is ${buf.length} bytes`);
  return { signature, itemCount, items, outfits };
}

// Index of a sprite within a thing's sprite array (OTClient ordering).
export function spriteIndex(t, w, h, layer, px, py, pz, phase) {
  return ((((((phase * t.patternZ + pz) * t.patternY + py) * t.patternX + px) * t.layers + layer) * t.height + h) * t.width + w);
}
