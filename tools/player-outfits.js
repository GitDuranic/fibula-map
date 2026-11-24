// Writes player-outfits.png/json (see lib/playeroutfits.js) into an already converted map-data folder, so the whole
// map needn't be converted again. convert-map.js writes them too.
// Usage: node tools/player-outfits.js <map-data folder> [--assets <dir with Tibia.dat and Tibia.spr>]
import fs from 'fs';
import path from 'path';
import { parseDat } from './lib/dat.js';
import { openSpr } from './lib/spr.js';
import { writePng } from './lib/png.js';
import { buildPlayerOutfits } from './lib/playeroutfits.js';

const args = process.argv.slice(2), ai = args.indexOf('--assets');
const ASSETS = ai >= 0 ? args[ai + 1] : 'assets/client';
const dir = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--assets');
if (!dir) { console.log('Usage: node tools/player-outfits.js <map-data folder> [--assets <dir>]'); process.exit(1); }
const r = buildPlayerOutfits(parseDat(path.join(ASSETS, 'Tibia.dat')), openSpr(path.join(ASSETS, 'Tibia.spr')));
writePng(path.join(dir, 'player-outfits.png'), r.width, r.height, r.data);
fs.writeFileSync(path.join(dir, 'player-outfits.json'), JSON.stringify(r.json));
console.log(`${Object.keys(r.json.types).length} player outfits -> ${dir}`);
