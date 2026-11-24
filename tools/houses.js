// Writes houses.json (each house's name and a spot inside it, see lib/houses.js) into an already converted map-data
// folder, so the whole map needn't be converted again. convert-map.js writes it too (--houses <map-house.xml>).
// Usage: node tools/houses.js <map.otbm> <map-house.xml> <map-data folder>
//   e.g. node tools/houses.js "C:/git/tibia assets/tibia7.2/map72.otbm" "C:/git/tibia assets/tibia7.2/map-house.xml" public/map-data-72
import fs from 'fs';
import path from 'path';
import { readHouseTiles, readHouseList, houseSpots, walkableFromData } from './lib/houses.js';

const [otbm, xml, dir] = process.argv.slice(2);
if (!otbm || !xml || !dir) { console.log('Usage: node tools/houses.js <map.otbm> <map-house.xml> <map-data folder>'); process.exit(1); }
const map = JSON.parse(fs.readFileSync(path.join(dir, 'map.json'), 'utf8'));
const walkable = walkableFromData(map, fs.readFileSync(path.join(dir, 'walk.bin')));
const list = readHouseList(xml);
const spots = houseSpots(list, readHouseTiles(otbm), walkable);
fs.writeFileSync(path.join(dir, 'houses.json'), JSON.stringify(spots));
console.log(`${list.length} houses in the list, ${spots.length} with a spot -> ${path.join(dir, 'houses.json')}`);
