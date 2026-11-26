// Writes refresh.bin (the map's refresh tiles, see lib/refresh.js) into an already converted map-data folder, so the
// whole map needn't be converted again. convert-map.js writes it too (--refresh-map).
// Usage: node tools/refresh-tiles.js <map.otbm with refresh flags> <map-data folder>
//   e.g. node tools/refresh-tiles.js "C:/git/tibia assets/tibia7.2/map72.otbm" public/map-data-72
//        node tools/refresh-tiles.js "C:/git/tibia assets/tibia7.2/map72.otbm" public/map-data   (a map without them borrows another's)
import fs from 'fs';
import path from 'path';
import { readRefresh, refreshBin } from './lib/refresh.js';

const [otbm, dir] = process.argv.slice(2);
if (!otbm || !dir) { console.log('Usage: node tools/refresh-tiles.js <map.otbm> <map-data folder>'); process.exit(1); }
const map = JSON.parse(fs.readFileSync(path.join(dir, 'map.json'), 'utf8'));
const set = readRefresh(otbm);
const bin = refreshBin(set, map.chunks, map.chunk || 32);
fs.writeFileSync(path.join(dir, 'refresh.bin'), bin);
// Taken from another map's file: map.json says so, for the Settings note (as convert-map.js --refresh-map does).
const borrowed = path.basename(otbm, path.extname(otbm)) !== (map.map || 'Tibia71');
if (borrowed) map.refreshBorrowed = true; else delete map.refreshBorrowed;
fs.writeFileSync(path.join(dir, 'map.json'), JSON.stringify(map));
console.log(`${set.size} refresh tiles, ${bin.length} bytes -> ${path.join(dir, 'refresh.bin')}`);
