import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  server: { host: true },
  build: {
    target: 'es2020',
    rollupOptions: {
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
});
