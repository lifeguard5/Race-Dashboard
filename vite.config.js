// === RACE PIT WALL · vite.config.js ===
// MPA-Modus: jede HTML-Seite ist ein eigener Entry.
// base: GitHub-Pages-Projektpfad — lokal überschreibbar via CLI (--base=/).
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Race-Dashboard/',
  publicDir: 'public',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        notfound: resolve(__dirname, '404.html'),
      },
    },
  },
  test: {
    environment: 'happy-dom',
  },
});
