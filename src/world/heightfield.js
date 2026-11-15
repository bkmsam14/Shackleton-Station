// heightfield.js — pure terrain height function (no Three.js).
// REAL TERRAIN: heights come from NASA LRO LOLA maps of the lunar south pole (world/lola.js,
// data/lolaTerrain.js): 5 m/px around the base, 80 m/px (with the Moon's curvature) out to 45 km.
// Game additions on top (labelled in SCIENCE.md): the levelled base pad, the small cold-trap
// crater, the telescope mound, tiny craters and sub-5-m bumps the 5 m map cannot show.
// Used both to build the terrain mesh and by the player to stand on the ground,
// so what you see is what you walk on.

import { LAYOUT } from './layout.js';
import { nearHeight, midHeight, NEAR_HALF_M } from './lola.js';

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
  // (the big made-up craters are gone: the real LOLA terrain has the real ones)
  const list = [
    // the ice-mining cold trap (deep for its size, so its floor stays in shadow)
    { x: LAYOUT.ICE_CRATER.x, z: LAYOUT.ICE_CRATER.z, r: LAYOUT.ICE_CRATER.r, depth: LAYOUT.ICE_CRATER.depth },
    // the telescope's little rise (a negative "crater" = a mound)
    { x: LAYOUT.TELESCOPE.x, z: LAYOUT.TELESCOPE.z, r: LAYOUT.TELESCOPE.rise.r, depth: -LAYOUT.TELESCOPE.rise.height },
  ];
  // tiny craters (a few metres across): smaller than the 5 m map can show — game detail
  for (let i = 0; i < 40; i++) {
    const r = 1 + rand() * rand() * 2.5;
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

/** The real LOLA ground (m, relative to the base site): 5 m map near, 80 m map further out. */
export function realHeight(x, z) {
  const r = Math.hypot(x, z);
  const blend0 = NEAR_HALF_M - 60;
  if (r <= blend0) return nearHeight(x, z) ?? midHeight(x, z);
  if (r >= NEAR_HALF_M) return midHeight(x, z);
  const w = smoothstep(blend0, NEAR_HALF_M, r);
  return (nearHeight(x, z) ?? midHeight(x, z)) * (1 - w) + midHeight(x, z) * w;
}

/** Ground height (metres) at world position x, z. */
export function heightAt(x, z) {
  const r = Math.hypot(x, z);
  // sub-5 m bumps (game detail), only near the base where you can see them
  const detail = r < 600 ? fbm(x * 0.11, z * 0.11, 2) * 0.25 : 0;
  const natural = realHeight(x, z) + detail + (r < 600 ? craterHeight(x, z) : 0);
  const m = baseMask(x, z);
  return natural * (1 - m) + LAYOUT.BASE_GROUND_Y * m;
}
