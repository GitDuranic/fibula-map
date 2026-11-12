// Shared item info from the TVP server data: client id <-> server id, names and attributes.
import fs from 'node:fs';
import path from 'node:path';
import { parseOtb } from './nodefile.js';

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
    const info = { name: a.name || '', article: a.article || '', plural: a.plural || '', attrs };
    if (a.id) server.set(+a.id, info);
    else if (a.fromid) for (let i = +a.fromid; i <= +a.toid; i++) server.set(i, info);
  }
  const byClient = (cid) => server.get(toServer.get(cid));
  return { otb, toClient, toServer, server, byClient };
}
