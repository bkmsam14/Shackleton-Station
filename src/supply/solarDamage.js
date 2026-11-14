// solarDamage.js — micrometeorite damage to the solar array (PURE LOGIC).
// The game had no solar damage before; this is the smallest addition the repair kit needs:
//  - now and then a micrometeorite damages the array (random, average SOLAR_DAMAGE.MEAN_GAME_DAYS_BETWEEN_HITS);
//  - a damaged array makes SOLAR_DAMAGE.DAMAGED_OUTPUT of its power (main.js scales the
//    array's alignment by solarOutputFactor — a healthy array is unchanged: factor 1);
//  - a Solar Panel Repair Kit fixes it. The kit is only used if the repair happens.
import { SOLAR_DAMAGE, TIME } from '../config/gameplay.js';
import { countOf, removeItem } from '../farming/inventory.js';

const KIT = 'solar-repair-kit';

export function createSolarDamageState(saved = null) {
  return {
    damaged: Boolean(saved?.damaged),
    playSeconds: Number.isFinite(saved?.playSeconds) ? saved.playSeconds : 0,
    repairs: Number.isInteger(saved?.repairs) ? saved.repairs : 0, // picks the lesson's quiz question
  };
}

/** Chance of a hit per play second (average gap = MEAN_GAME_DAYS_BETWEEN_HITS game days). */
export const HIT_RATE_PER_SECOND = 1 / (SOLAR_DAMAGE.MEAN_GAME_DAYS_BETWEEN_HITS * TIME.REAL_SECONDS_PER_GAME_DAY);
const GRACE_SECONDS = (SOLAR_DAMAGE.GRACE_GAME_HOURS * 3600) / TIME.SCALE;

/**
 * Advance time. Returns 'hit' when a micrometeorite damages the array, else null.
 * everySeconds (testing): hit on a fixed timer instead, counted while the array is healthy.
 */
export function stepSolarDamage(s, dt, rand = Math.random, { everySeconds = null } = {}) {
  if (!(dt > 0)) return null;
  s.playSeconds += dt;
  if (everySeconds) {
    if (s.damaged) return null;
    s.testTimer = (s.testTimer ?? 0) + dt;
    if (s.testTimer < everySeconds) return null;
    s.testTimer = 0;
    s.damaged = true;
    return 'hit';
  }
  if (s.damaged || s.playSeconds < GRACE_SECONDS) return null;
  if (rand() < 1 - Math.exp(-HIT_RATE_PER_SECOND * dt)) {
    s.damaged = true;
    return 'hit';
  }
  return null;
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
