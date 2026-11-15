// interact.js — finds the interactable the player is looking at (pure logic, no Three.js).
// Interactables are plain data: { id, zone, x, z, prompt, action, reach? }. Only things in the
// player's current zone count, so you can never use a door through a wall.
import { PLAYER } from '../config/gameplay.js';

const FACING_COS = Math.cos((65 * Math.PI) / 180);

export function findInteractable(interactables, zoneId, px, pz, fwd) {
  let best = null;
  let bestD = Infinity;
  const fl = Math.hypot(fwd.x, fwd.z) || 1;
  for (const it of interactables) {
    if (it.zone !== zoneId) continue;
    const dx = it.x - px;
    const dz = it.z - pz;
    const d = Math.hypot(dx, dz);
    if (d > (it.reach ?? PLAYER.INTERACT_DISTANCE)) continue; // reach: a shorter range (e.g. a hatch up a stair)
    const facing = d < 0.9 ? 1 : (dx * fwd.x + dz * fwd.z) / (d * fl);
    if (facing < FACING_COS) continue;
    if (d < bestD) {
      bestD = d;
      best = it;
    }
  }
  return best;
}
