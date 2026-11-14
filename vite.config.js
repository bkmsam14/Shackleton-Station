import { defineConfig } from 'vite';

// GitHub Pages serves the site at https://<user>.github.io/Shackleton-Station/
// so production builds need that base path. Dev server stays at "/".
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Shackleton-Station/' : '/',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
  },
  server: {
    port: 5173,
    strictPort: false,
  },
}));
