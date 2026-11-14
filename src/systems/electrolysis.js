// electrolysis.js — rules of the electrolysis station. PURE LOGIC: no Three.js, no DOM.
//
// 2 H₂O → 2 H₂ + O₂. Making oxygen is never free (CLAUDE.md rule 4):
//  - water comes from the station's own tank (1.125 kg of water per kg of O₂, stoichiometry);
//  - power comes from the base battery (physics minimum 4.96 kWh per kg of O₂, NIST);
//  - missed zaps waste a little extra power (lost as heat).
// All numbers live in src/config/gameplay.js → ELECTROLYSIS.
import { ELECTROLYSIS, POWER, TIME, OXYGEN } from '../config/gameplay.js';
import { addOxygen } from './gauges.js';

export function createElectrolysisState(overrides = {}) {
  return { tankKg: ELECTROLYSIS.TANK_START_KG, ...overrides };
}

export function findBatch(batchId) {
  const batch = ELECTROLYSIS.BATCHES.find((b) => b.id === batchId);
  if (!batch) throw new Error(`Unknown electrolysis batch: "${batchId}"`);
  return batch;
}

/**
 * What a batch costs, and how long the real ISS machine would take to make it.
 * realHours uses the ISS Oxygen Generation Assembly's nominal rate (shown to the player);
 * gameHours is the same span (the life-support clock is just sped up, see TIME.SCALE).
 */
export function batchCost(batchId) {
  const b = findBatch(batchId);
  const realHours = (b.o2Kg / ELECTROLYSIS.ISS_O2_KG_PER_DAY_NOMINAL) * 24;
  return {
    id: b.id,
    label: b.label,
    zaps: b.zaps,
    o2Kg: b.o2Kg,
    waterKg: b.o2Kg * ELECTROLYSIS.WATER_PER_KG_O2,
    kwh: b.o2Kg * ELECTROLYSIS.KWH_PER_KG_O2_MIN,
    realHours,
    realSecondsInGame: (realHours * 3600) / TIME.SCALE,
  };
}

/**
 * Can the base run this batch? reason: null | 'full' | 'water' | 'power'.
 *  - 'full': the oxygen would not fit in the supply (no water or power wasted on it);
 *  - power must stay above the floor so electrolysis never empties the battery.
 */
export function checkAfford(gauges, state, batchId) {
  const c = batchCost(batchId);
  const spaceKg = ((100 - gauges.oxygen) / 100) * OXYGEN.CAPACITY_KG;
  if (spaceKg + 1e-9 < c.o2Kg) return { ok: false, reason: 'full' };
  if (state.tankKg + 1e-9 < c.waterKg) return { ok: false, reason: 'water' };
  const floorKwh = (ELECTROLYSIS.POWER_FLOOR_PERCENT / 100) * POWER.BATTERY_CAPACITY_KWH;
  if (gauges.batteryKwh - c.kwh < floorKwh) return { ok: false, reason: 'power' };
  return { ok: true, reason: null };
}

/**
 * Pay for a finished batch and store the oxygen. The batch must be affordable (checked
 * before the round started). Misses add a small heat loss, but never below 0 kWh.
 */
export function applyBatch(gauges, state, batchId, misses = 0) {
  const afford = checkAfford(gauges, state, batchId);
  if (!afford.ok) throw new Error(`Cannot afford electrolysis batch "${batchId}" (${afford.reason})`);
  const c = batchCost(batchId);
  const heatKwh = Math.min(
    Math.max(0, misses) * ELECTROLYSIS.MISS_EXTRA_KWH,
    c.kwh * ELECTROLYSIS.MAX_HEAT_FRACTION,
  );
  state.tankKg = Math.max(0, state.tankKg - c.waterKg);
  gauges.batteryKwh = Math.max(0, gauges.batteryKwh - c.kwh - heatKwh);
  const storedKg = addOxygen(gauges, c.o2Kg);
  return { ...c, heatKwh, storedKg };
}

/** Stars: 1 for finishing, +1 for accurate zapping, +1 for a right quiz answer (max 3). */
export function scoreRound({ hits = 0, misses = 0, quizCorrect = false }) {
  const tries = hits + misses;
  const accuracy = tries === 0 ? 1 : hits / tries;
  let stars = 1;
  if (accuracy >= ELECTROLYSIS.STAR_ACCURACY) stars++;
  if (quizCorrect) stars++;
  return Math.min(3, stars);
}

/** How many full oxygen batches of this size the tank can still make. */
export function batchesLeft(state, batchId) {
  return Math.floor((state.tankKg + 1e-9) / batchCost(batchId).waterKg);
}
