import { defineConfig } from 'vite';

// GitHub Pages serves the site at https://<user>.github.io/Shackleton-Station/
// so production builds need that base path. Dev server stays at "/".
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Shackleton-Station/' : '/',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
  },
  // Pre-bundle three + the addons together so the dev server never loads two copies.
  optimizeDeps: {
    include: [
      'three',
      'three/addons/controls/OrbitControls.js',
      'three/addons/controls/PointerLockControls.js',
    ],
  },
  server: {
    port: 5173,
    strictPort: false,
  },
}));
