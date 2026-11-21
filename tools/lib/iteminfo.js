// Shared item info from the TVP server data: client id <-> server id, names and attributes.
import fs from 'node:fs';
import path from 'node:path';
import { parseOtb } from './nodefile.js';

// Every rune is "spell rune" in items.xml (the game said which one when you looked at it), so pickers and lists
// couldn't tell them apart: a rune gets its spell's name from its words ("adura vita" -> "ultimate healing rune").
const RUNES = {
  'adito grav': 'destroy field', 'adevo mas vis': 'energy bomb', 'adura gran': 'intense healing', 'adana pox': 'antidote',
  'adori vita vis': 'sudden death', 'adevo grav vita': 'wild growth', 'adura vita': 'ultimate healing', 'adevo grav vis': 'energy field',
  'adana ani': 'paralyze', 'adevo mas grav vis': 'energy wall', 'adevo grav pox': 'poison field', 'adevo mas pox': 'poison bomb',
  'adori': 'light magic missile', 'adevo mas grav pox': 'poison wall', 'adeta sio': 'convince creature', 'adevo ina': 'chameleon',
  'adevo res pox': 'envenom', 'adevo grav tera': 'magic wall', 'adevo grav flam': 'fire field', 'adori flam': 'fireball',
  'adevo mas grav flam': 'fire wall', 'adori gran flam': 'great fireball', 'adevo mas flam': 'fire bomb', 'adevo res flam': 'soulfire',
  'adito tera': 'desintegrate', 'adori gran': 'heavy magic missile', 'adevo mas hur': 'explosion', 'adana mort': 'animate dead',
};
export const runeName = (name, words) => (name === 'spell rune' && words ? (RUNES[words] ? `${RUNES[words]} rune` : `spell rune (${words})`) : null);

export function loadItemInfo(tvpDataDir) {
  const otb = parseOtb(path.join(tvpDataDir, 'items/items.otb'));
  const toClient = (sid) => otb.map.get(sid) || 0;
  const toServer = new Map();
  for (const [s, c] of otb.map) if (!toServer.has(c)) toServer.set(c, s);
  const xml = fs.readFileSync(path.join(tvpDataDir, 'items/items.xml'), 'latin1');
  const server = new Map(); // sid -> { name, article, attrs }
  const re = /<item\s+([^>]*?)(\/?)>([\s\S]*?)(?=<item\s|<\/items>)/g;
  let m;
  while ((m = re.exec(xml))) {
    const a = Object.fromEntries([...m[1].matchAll(/(\w+)="([^"]*)"/g)].map((x) => [x[1], x[2]]));
    const attrs = Object.fromEntries([...m[3].matchAll(/key="(\w+)"\s+value="([^"]*)"/g)].map((x) => [x[1].toLowerCase(), x[2]]));
    const info = { name: runeName(a.name, attrs.runespellname) || a.name || '', article: a.article || '', plural: a.plural || '', attrs };
    if (a.id) server.set(+a.id, info);
    else if (a.fromid) for (let i = +a.fromid; i <= +a.toid; i++) server.set(i, info);
  }
  const byClient = (cid) => server.get(toServer.get(cid));
  return { otb, toClient, toServer, server, byClient };
}
