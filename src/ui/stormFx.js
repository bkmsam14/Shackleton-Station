// stormFx.js — what a particle storm looks and sounds like on your suit display.
//
// Science: the particles themselves are INVISIBLE. What real spacecraft do show is "snow":
// white speckles in camera images when protons hit the sensor (famous in SOHO images during
// proton storms — NASA SVS 3159). We draw that snow on the screen, and a dosimeter ticks.
// Both follow the real-time dose rate (level 0..1), so the shelter and the water walls
// visibly and audibly calm them down.
//
// Kids' safety: no full-screen flashes — only small, short-lived dots that fade in and out.
// With "reduce motion" on, the snow is off (the dose ring and the ticking still tell the story).
import { RADIATION } from '../config/gameplay.js';
import { sfx } from './sfx.js';

export function createStormFx(root) {
  const canvas = document.createElement('canvas');
  canvas.className = 'storm-fx';
  canvas.setAttribute('aria-hidden', 'true');
  root.prepend(canvas); // under the HUD and the menus
  const ctx = canvas.getContext('2d');
  const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const flakes = []; // { x, y, r, len, angle, age, life }
  let spawnDebt = 0;
  let dirty = false;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  return {
    /** level: 0..1 = current dose rate ÷ the strongest unshielded storm. 0 = no storm. */
    update(dt, level) {
      const l = Math.max(0, Math.min(1, level));

      // dosimeter ticks: random (like real particle hits), faster with more dose
      // (chance of a tick this frame = ticks per second × frame time; at most one per frame)
      if (Math.random() < l * RADIATION.FX_CLICKS_PER_SECOND * dt) sfx.tick();

      if (calm) return;
      spawnDebt += l * RADIATION.FX_SNOW_PER_SECOND * dt;
      while (spawnDebt >= 1 && flakes.length < RADIATION.FX_SNOW_MAX) {
        spawnDebt -= 1;
        const streak = Math.random() < 0.25; // some hits leave a short track
        flakes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: 0.8 + Math.random() * 1.6,
          len: streak ? 6 + Math.random() * 14 : 0,
          angle: Math.random() * Math.PI,
          age: 0,
          life: 0.14 + Math.random() * 0.3,
        });
      }
      if (spawnDebt > 2) spawnDebt = 2;
      if (!flakes.length && !dirty) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dirty = flakes.length > 0;
      ctx.strokeStyle = ctx.fillStyle = '#ffffff';
      ctx.lineCap = 'round';
      for (let i = flakes.length - 1; i >= 0; i--) {
        const f = flakes[i];
        f.age += dt;
        if (f.age >= f.life) {
          flakes.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = 0.75 * Math.sin((f.age / f.life) * Math.PI); // fade in and out
        if (f.len) {
          ctx.lineWidth = f.r;
          ctx.beginPath();
          ctx.moveTo(f.x, f.y);
          ctx.lineTo(f.x + Math.cos(f.angle) * f.len, f.y + Math.sin(f.angle) * f.len);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    },
  };
}
