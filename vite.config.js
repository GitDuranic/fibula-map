import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Native file watching misses some edits on this Windows setup; polling is reliable.
    watch: { usePolling: true, interval: 300, ignored: ['**/public/map-data*/**', '**/dist/**'] },
  },
});
