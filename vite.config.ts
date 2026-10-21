import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';

/** Dev server: `/admin` opens the admin entry (admin.html). */
const adminRoute = (): Plugin => ({
  name: 'admin-route',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url && /^\/admin\/?(\?|$)/.test(req.url))
        req.url = req.url.replace(/^\/admin\/?/, '/admin.html');
      next();
    });
  },
});

// M6-2: `vite build` = player bundle only (index.html). `vite build --mode admin` builds the
// separate admin entry into dist-admin/, so no admin code can ship with the game.
export default defineConfig(({ mode }) => ({
  base: './',
  server: { host: true },
  plugins: [adminRoute()],
  publicDir: mode === 'admin' ? false : 'public',
  build: {
    target: 'es2020',
    outDir: mode === 'admin' ? 'dist-admin' : 'dist',
    rollupOptions: {
      input: mode === 'admin' ? { admin: 'admin.html' } : { main: 'index.html' },
      output: {
        // Three.js in its own long-cache vendor chunk, separate from game code.
        manualChunks(id: string) {
          // M3-5: three/examples (GLTFLoader + meshopt decoder) is dynamically imported; keep
          // it out of the three chunk so it loads lazily on its own.
          if (id.includes('node_modules/three/examples')) return undefined;
          if (id.includes('node_modules/three')) return 'three';
          return undefined;
        },
      },
    },
  },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
}));
