// Climb and drop spots: where you can go a floor up or down with exani hur (levitate) or with 3 parcels.
// Worked out once by the converter (the map doesn't change), so the router only looks them up.
// Rules from the TVP server (see the design doc, slice 11):
// - data/scripts/spells/support/levitate.lua ("exani hur up" / "exani hur down", in the direction you face);
// - src/game.cpp internalMoveCreature: stepping off a tile with 3 height items goes up, stepping into open air above
//   a tile with 3 height items goes down (players only, not diagonally).
// "No ground" below is the server's test: no tile there, or a tile without a ground item and without (immovable)
// blocking items.

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // north, east, south, west: you face one of these
// Up only facing north or west, down only facing east or south, with the spell and with parcels (user, 2026-11-15;
// TVP allows every direction).
const UP_DIR = (dx, dy) => dy < 0 || dx < 0, DOWN_DIR = (dx, dy) => dy > 0 || dx > 0;
export const CLIMB_SPELL = 1, CLIMB_PARCELS = 2; // bits in a climb's "ways"

// tileInfo(x, y, z) -> undefined (no tile) or { ground, block, fixedBlock, change, height }:
//   ground: has a ground item; block: anything blocks (walls, also crates); fixedBlock: something immovable blocks;
//   change: a floor change (stairs, hole, ...); height: how many height items (parcels, boxes, ...).
// walkable(x, y, z): the router's walkable test (ground, nothing blocking).
// Returns [[x, y, z, to x, to y, to z, ways]].
export function buildClimbs({ tiles, tileInfo, walkable }) {
  const out = [];
  // The tile above or in front is open air for a spell (fixedBlock) or for walking (block).
  const open = (t, key) => !t || (!t.ground && !t[key]);
  // A landing tile: walkable and not a floor change.
  const lands = (x, y, z) => walkable(x, y, z) && !tileInfo(x, y, z).change;
  for (const [x, y, z] of tiles) {
    if (!lands(x, y, z)) continue; // where you stand (also: parcels can be put down here)
    const above = tileInfo(x, y, z - 1);
    for (const [dx, dy] of DIRS) {
      const fx = x + dx, fy = y + dy;
      // Up (not from floor 8 to 7): open air above you, ground in front of you one floor up.
      if (UP_DIR(dx, dy) && z !== 8 && z > 0 && lands(fx, fy, z - 1)) {
        let ways = 0;
        if (open(above, 'fixedBlock')) ways |= CLIMB_SPELL;
        if (open(above, 'block') && !tileInfo(fx, fy, z - 1).height) ways |= CLIMB_PARCELS;
        if (ways) out.push([x, y, z, fx, fy, z - 1, ways]);
      }
      // Down (not from floor 7 to 8): open air in front of you, ground below it. With parcels they're thrown down
      // onto that tile first, so it must take items: walkable is enough here.
      if (DOWN_DIR(dx, dy) && z !== 7 && z < 15 && open(tileInfo(fx, fy, z), 'block') && lands(fx, fy, z + 1)) {
        out.push([x, y, z, fx, fy, z + 1, CLIMB_SPELL | CLIMB_PARCELS]);
      }
    }
  }
  return out;
}
