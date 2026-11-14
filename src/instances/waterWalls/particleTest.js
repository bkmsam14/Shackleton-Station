// particleTest.js — the "particle test" window in the Water Walls panel.
// Fast particles fly from the Sun (left) toward the astronaut (right). Each one that reaches
// the shelter wall gets through with chance = shieldFactor('shelter', wallKg) — the same
// number the game uses for your dose — so what kids see is exactly what the game computes.
// The wall's blue water layer grows with the slider. Under "reduce motion" we draw one still
// frame (the numbers next to it still tell the story).
import { RADIATION } from '../../config/gameplay.js';
import { shieldFactor } from '../../systems/radiation.js';

const W = 360;
const H = 170;
const WALL_X = 200; // left edge of the shelter wall
const ROCK_W = 14; // the shelter's own walls + supplies
const WATER_MAX_W = 46; // drawn width of a full water wall
const SPAWN_PER_S = 9; // GAME BALANCE (not real data) — just enough dots to read
const SPEED = 170; // px per second

export function createParticleTest(canvas) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  let wallKg = 0;
  let dots = []; // { x, y, vy, state: 'fly' | 'pass' | 'stop', t }
  let debt = 0;
  let raf = 0;
  let last = 0;
  let stopped = 0;
  let passed = 0;

  const waterW = () => (wallKg / RADIATION.WALL_CAPACITY_KG) * WATER_MAX_W;
  const wallEnd = () => WALL_X + ROCK_W + waterW();

  function spawn() {
    dots.push({ x: 26, y: 30 + Math.random() * (H - 60), vy: (Math.random() - 0.5) * 30, state: 'fly', t: 0 });
  }

  function step(dt) {
    debt += SPAWN_PER_S * dt;
    while (debt >= 1) {
      debt -= 1;
      spawn();
    }
    for (const d of dots) {
      d.t += dt;
      if (d.state === 'stop') continue;
      d.x += SPEED * dt;
      d.y += d.vy * dt;
      if (d.state === 'fly' && d.x >= WALL_X) {
        if (Math.random() < shieldFactor('shelter', wallKg)) {
          d.state = 'pass';
          passed++;
        } else {
          d.state = 'stop';
          d.x = WALL_X + Math.random() * (wallEnd() - WALL_X);
          d.t = 0;
          stopped++;
        }
      }
    }
    dots = dots.filter((d) => (d.state === 'stop' ? d.t < 0.5 : d.x < W + 10));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // Sun
    const g = ctx.createRadialGradient(0, H / 2, 4, 0, H / 2, 60);
    g.addColorStop(0, '#fff3b0');
    g.addColorStop(0.4, '#ffb547');
    g.addColorStop(1, 'rgba(255,181,71,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 70, H);
    // shelter wall (grey) + water layer (blue)
    ctx.fillStyle = '#7d8aa8';
    ctx.fillRect(WALL_X, 10, ROCK_W, H - 20);
    if (waterW() > 0) {
      ctx.fillStyle = '#3d8bff';
      ctx.fillRect(WALL_X + ROCK_W, 10, waterW(), H - 20);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(WALL_X + ROCK_W, 10, waterW(), 6);
    }
    // astronaut (simple helmet + body)
    const ax = W - 46;
    const ay = H / 2;
    ctx.fillStyle = '#f6f8ff';
    ctx.beginPath();
    ctx.arc(ax, ay - 18, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(ax - 13, ay - 4, 26, 34);
    ctx.fillStyle = '#4fd1e8';
    ctx.beginPath();
    ctx.ellipse(ax + 3, ay - 19, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // particles
    for (const d of dots) {
      if (d.state === 'stop') {
        ctx.globalAlpha = 1 - d.t / 0.5; // fades where it was stopped
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(d.x, d.y, 3 + d.t * 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = d.state === 'pass' ? '#ff7a59' : '#ffe066';
        ctx.beginPath();
        ctx.arc(d.x, d.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function frame(t) {
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
    last = t;
    step(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }

  if (still) {
    for (let i = 0; i < 40; i++) step(0.05);
    draw();
  } else {
    raf = requestAnimationFrame(frame);
  }

  return {
    setWallKg(kg) {
      wallKg = kg;
      if (still) draw();
    },
    /** what the kid has watched so far (for Volt's comment) */
    counts: () => ({ stopped, passed }),
    destroy() {
      cancelAnimationFrame(raf);
    },
  };
}
