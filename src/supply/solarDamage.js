// solarDamage.js — micrometeorite damage to the solar array (PURE LOGIC).
// The game had no solar damage before; this is the smallest addition the repair kit needs:
//  - now and then a micrometeoroid damages the array (systems/micrometeoroids.js picks the
//    moment and the target: the array or the habitat, never both at once);
//  - a damaged array makes SOLAR_DAMAGE.DAMAGED_OUTPUT of its power (main.js scales the
//    array's alignment by solarOutputFactor — a healthy array is unchanged: factor 1);
//  - a Solar Panel Repair Kit fixes it. The kit is only used if the repair happens.
import { SOLAR_DAMAGE } from '../config/gameplay.js';
import { countOf, removeItem } from '../farming/inventory.js';

const KIT = 'solar-repair-kit';

export function createSolarDamageState(saved = null) {
  return {
    damaged: Boolean(saved?.damaged),
    repairs: Number.isInteger(saved?.repairs) ? saved.repairs : 0, // picks the lesson's quiz question
  };
}

/** A micrometeoroid hit the array (systems/micrometeoroids.js decides when). */
export function damageSolar(s) {
  if (s.damaged) return false;
  s.damaged = true;
  return true;
}

export const solarOutputFactor = (s) => (s.damaged ? SOLAR_DAMAGE.DAMAGED_OUTPUT : 1);

/** { ok, reason: null | 'not-damaged' | 'no-kit' }. Uses the kit only when the repair succeeds. */
export function repairSolar(s, inventory) {
  if (!s.damaged) return { ok: false, reason: 'not-damaged' };
  if (countOf(inventory, KIT) < SOLAR_DAMAGE.KITS_PER_REPAIR) return { ok: false, reason: 'no-kit' };
  removeItem(inventory, KIT, SOLAR_DAMAGE.KITS_PER_REPAIR);
  s.damaged = false;
  s.repairs = (s.repairs ?? 0) + 1;
  return { ok: true, reason: null };
}

export const kitsInInventory = (inventory) => countOf(inventory, KIT);
