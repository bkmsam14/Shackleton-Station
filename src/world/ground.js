// ground.js — how high the walkable surface is outside: the terrain, plus the habitat's
// airlock stairs (so you can climb up to the outer hatch). PURE LOGIC: no Three.js.
// The stairs are walked as a smooth slope through the middle of each step, so the camera
// doesn't jolt up 36 cm at every step.
import { LAYOUT } from './layout.js';
import { heightAt } from './heightfield.js';

const H = LAYOUT.HABITAT;
const A = H.airlock;
const S = H.stairs;

/** The stairs in world coordinates: x range, z from the hatch (top) to the ground (bottom). */
export const STAIRS = {
  minX: H.x + A.x - S.width / 2,
  maxX: H.x + A.x + S.width / 2,
  topZ: H.z + A.zEnd,
  bottomZ: H.z + A.zEnd + S.run * S.steps,
  topY: H.floorY - 0.15, // the airlock floor, just below the habitat floor
};
const RISE = STAIRS.topY / S.steps;

/** Height of the stair surface at (x, z), or null when not on the stairs. */
export function stairHeight(x, z) {
  if (x < STAIRS.minX || x > STAIRS.maxX || z < STAIRS.topZ || z > STAIRS.bottomZ) return null;
  const t = (z - STAIRS.topZ) / (STAIRS.bottomZ - STAIRS.topZ); // 0 at the hatch, 1 at the ground
  return Math.min(STAIRS.topY, STAIRS.topY * (1 - t) + RISE * 0.5);
}

/** Walkable height outside: the terrain, or the stairs where they are higher. */
export function groundHeight(x, z) {
  const g = heightAt(x, z);
  const s = stairHeight(x, z);
  return s === null ? g : Math.max(g, s);
}

/**
 * Colliders for the airlock outside: the module itself (up to its hatch) and a thin wall
 * under each handrail, so the stairs can only be climbed from the front.
 */
export function airlockColliders() {
  const rail = (sx) => {
    const x = H.x + A.x + sx * (S.width / 2 + 0.08);
    return { type: 'box', minX: x - 0.06, maxX: x + 0.06, minZ: STAIRS.topZ, maxZ: STAIRS.bottomZ };
  };
  return [
    { type: 'box', minX: H.x + A.x - 1.45, maxX: H.x + A.x + 1.45, minZ: H.z + A.zStart, maxZ: STAIRS.topZ + 0.05 },
    rail(-1),
    rail(1),
  ];
}
