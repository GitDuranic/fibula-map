// Fetches the TibiaWiki walkthrough of quests (slice 13j): the quest's "/Spoiler" page (else the quest page itself)
// as wikitext, saved to tools/data/wiki-walkthroughs/<quest key>.txt so the drafts (tools/data/quest-drafts) can be
// written and checked again without the wiki. A quest whose file exists is skipped (delete it to fetch again).
// Usage: node tools/fetch-walkthroughs.js "Bear Room Quest" "Troll Cave Quest"   (no names: every quest in the database)
// The wiki's name can be given after a "=": node tools/fetch-walkthroughs.js "Ring Quest=The Ring Quest"
import fs from 'fs';
import { questKey } from '../src/map/engine/questdata.js';

const DIR = 'tools/data/wiki-walkthroughs';
fs.mkdirSync(DIR, { recursive: true });

async function wikitext(page) {
  const url = `https://tibia.fandom.com/api.php?action=parse&redirects=1&prop=wikitext&format=json&page=${encodeURIComponent(page.replace(/ /g, '_'))}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'tibia-map-tool' } });
  const j = await res.json();
  return j.parse ? { title: j.parse.title, text: j.parse.wikitext['*'] } : null;
}

let names = process.argv.slice(2);
if (!names.length) {
  const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
  const db = await (await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/map_quests?select=name&order=sort`, { headers: { apikey: env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}` } })).json();
  names = db.map((q) => q.name);
}
for (const arg of names) {
  const [name, wikiName = name] = arg.split('=');
  const file = `${DIR}/${questKey(name)}.txt`;
  if (fs.existsSync(file)) continue;
  const page = (await wikitext(`${wikiName}/Spoiler`)) || (await wikitext(wikiName));
  if (!page) { console.log(`not found: ${name}`); continue; }
  fs.writeFileSync(file, `<!-- ${name} | https://tibia.fandom.com/wiki/${page.title.replace(/ /g, '_')} | fetched ${new Date().toISOString().slice(0, 10)} -->\n${page.text}\n`);
  console.log(`${name}: ${page.title} (${page.text.length} chars)`);
}
