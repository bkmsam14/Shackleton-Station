import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// meSpeak's ESpeak.js (Volt's robot voice engine) has a few Latin-1 characters in its
// comments, which the bundler rejects as invalid UTF-8. Read just that file as Latin-1.
// Used for the build AND the dev-server pre-bundler (they load files separately).
const isESpeak = (id) => /mespeak[\\/]src[\\/]ESpeak\.js$/.test(id.split('?')[0]);
const mespeakLatin1 = {
  name: 'mespeak-latin1',
  enforce: 'pre',
  load(id) {
    if (isESpeak(id)) return readFileSync(id.split('?')[0], 'latin1');
    return null;
  },
};

// GitHub Pages serves the site at https://<user>.github.io/Shackleton-Station/
// so production builds need that base path. Dev server stays at "/".
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/Shackleton-Station/' : '/',
  plugins: [mespeakLatin1],
  // Volt's speech engine runs in a module worker (src/ui/voltVoice.worker.js)
  worker: { format: 'es', plugins: () => [mespeakLatin1] },
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
      'mespeak',
    ],
    rolldownOptions: { plugins: [mespeakLatin1] },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  // `vite preview` behind a Cloudflare quick tunnel (random *.trycloudflare.com address).
  preview: {
    port: 4173,
    allowedHosts: ['.trycloudflare.com'],
  },
}));
