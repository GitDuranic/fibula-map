import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Locations the user names by right-clicking the map (dev only, for now; the user will remove adding later, the
// names stay). Kept in tools/data/custom-places.json ([{ n name, p [x, y, z] }]); the converter puts them into
// places.json (kind 'custom'), so they're searchable on the built site too.
//   GET  /__custom-places                     -> the list
//   POST /__custom-places { add: { n, p } }   -> adds a name (more than one name per square is fine)
//   POST /__custom-places { remove: { n, p } } -> removes that name from that square
function customPlaces() {
  const file = path.resolve('tools/data/custom-places.json');
  const read = () => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; } };
  const write = (list) => fs.writeFileSync(file, `[\n${list.map((c) => `  ${JSON.stringify(c)}`).join(',\n')}\n]\n`);
  return {
    name: 'tm-custom-places',
    configureServer(server) {
      server.middlewares.use('/__custom-places', (req, res) => {
        const send = (code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
        if (req.method === 'GET') { send(200, read()); return; }
        if (req.method !== 'POST') { send(405, { error: 'GET or POST' }); return; }
        let body = '';
        req.on('data', (c) => { body += c; });
        req.on('end', () => {
          try {
            const { add, remove } = JSON.parse(body || '{}');
            const valid = (c) => c && typeof c.n === 'string' && c.n.trim() && Array.isArray(c.p) && c.p.length === 3 && c.p.every(Number.isInteger);
            let list = read();
            const same = (a, b) => a.n === b.n && a.p.join(',') === b.p.join(',');
            if (add && valid(add)) {
              const c = { n: add.n.trim().slice(0, 60), p: add.p };
              if (!list.some((x) => same(x, c))) list.push(c);
            } else if (remove && valid(remove)) list = list.filter((x) => !same(x, remove));
            else { send(400, { error: 'add or remove { n, p }' }); return; }
            write(list);
            send(200, list);
          } catch (e) { send(400, { error: String(e.message || e) }); }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), customPlaces()],
  server: {
    // The Project Fibula stats API (slice 17) sends no CORS header yet: the dev page reads it through here.
    proxy: { '/fibula-api': { target: 'https://api.projectfibula.org', changeOrigin: true, rewrite: (p) => p.replace(/^\/fibula-api/, '') } },
    // Native file watching misses some edits on this Windows setup; polling is reliable.
    watch: { usePolling: true, interval: 300, ignored: ['**/public/map-data*/**', '**/dist/**', '**/tools/data/**'] },
  },
});
