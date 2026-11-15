// heightfield.js — pure terrain height function (no Three.js).
// Used both to build the terrain mesh and by the player to stand on the ground,
// so what you see is what you walk on.

import { LAYOUT } from './layout.js';

// --- deterministic noise ----------------------------------------------------
function hash2(ix, iz) {
  let h = (ix * 374761393 + iz * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function valueNoise(x, z) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz; // 0..1
}

function fbm(x, z, octaves) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * (valueNoise(x * freq, z * freq) * 2 - 1);
    freq *= 2.03;
    amp *= 0.5;
  }
  return sum; // about −1..1
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

// --- craters (placed once, deterministic) -------------------------------------
// Small impact craters: bowl + raised rim. Positions avoid the flat base area.
export const CRATERS = (() => {
  const rand = mulberry32(1969);
  const list = [
    { x: -42, z: -30, r: 14, depth: 3.2 },
    { x: 58, z: 12, r: 18, depth: 4 },
    { x: 20, z: 78, r: 11, depth: 2.4 },
    { x: -70, z: 55, r: 24, depth: 5 },
    // the ice-mining cold trap (deep for its size, so its floor stays in shadow)
    { x: LAYOUT.ICE_CRATER.x, z: LAYOUT.ICE_CRATER.z, r: LAYOUT.ICE_CRATER.r, depth: LAYOUT.ICE_CRATER.depth },
    // the telescope's little rise (a negative "crater" = a mound)
    { x: LAYOUT.TELESCOPE.x, z: LAYOUT.TELESCOPE.z, r: LAYOUT.TELESCOPE.rise.r, depth: -LAYOUT.TELESCOPE.rise.height },
  ];
  for (let i = 0; i < 40; i++) {
    const r = 1.5 + rand() * rand() * 9;
    const x = (rand() * 2 - 1) * 210;
    const z = (rand() * 2 - 1) * 210;
    if (baseMask(x, z) > 0.05) continue;
    if (Math.hypot(x - LAYOUT.ICE_CRATER.x, z - LAYOUT.ICE_CRATER.z) < LAYOUT.ICE_CRATER.r * 2 + r) continue;
    if (Math.hypot(x - LAYOUT.TELESCOPE.x, z - LAYOUT.TELESCOPE.z) < LAYOUT.TELESCOPE.rise.r * 2 + r) continue;
    list.push({ x, z, r, depth: r * (0.18 + rand() * 0.1) });
  }
  return list;
})();

/** 1 inside the flat base area, fading to 0 outside it. */
export function baseMask(x, z) {
  const b = LAYOUT.FLAT_AREA;
  const dx = Math.max(b.minX - x, 0, x - b.maxX);
  const dz = Math.max(b.minZ - z, 0, z - b.maxZ);
  const d = Math.hypot(dx, dz);
  return 1 - smoothstep(0, b.blend, d);
}

function craterHeight(x, z) {
  let h = 0;
  for (let i = 0; i < CRATERS.length; i++) {
    const c = CRATERS[i];
    const dx = x - c.x;
    const dz = z - c.z;
    const d2 = dx * dx + dz * dz;
    const reach = c.r * 1.8;
    if (d2 > reach * reach) continue;
    const d = Math.sqrt(d2) / c.r; // 0 at centre, 1 at rim
    const bowl = d < 1 ? -c.depth * (1 - d * d) : 0;
    const rim = c.depth * 0.35 * Math.exp(-((d - 1) * (d - 1)) / 0.09);
    h += bowl + rim;
  }
  return h;
}

/** Ground height (metres) at world position x, z. */
export function heightAt(x, z) {
  const rough = fbm(x * 0.018, z * 0.018, 4) * 2.2 + fbm(x * 0.11, z * 0.11, 2) * 0.25;
  const far = Math.hypot(x, z);
  const rise = smoothstep(120, 260, far) * 6; // land rises gently toward the far hills
  const natural = rough + craterHeight(x, z) + rise;
  const m = baseMask(x, z);
  return natural * (1 - m) + LAYOUT.BASE_GROUND_Y * m;
}
