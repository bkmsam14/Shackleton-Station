// gauges.js — survival gauges and base power. PURE LOGIC: no Three.js, no DOM.
// All rates come from src/config/gameplay.js (BVAD values + marked game-balance numbers).
//
//  Oxygen: the base's ONE shared supply (habitat + greenhouse + suit; the suit is kept
//    topped up from it). The astronaut breathes from it at the BVAD nominal rate inside
//    and at the BVAD spacewalk rate outside (~2.3× faster). Nothing refills it in Demo 0 —
//    making oxygen comes with the electrolysis mini-game, which will call addOxygen().
//  Food: drains at the BVAD daily rate inside, and ~2× faster outside (BVAD spacewalk
//    food energy, Table 4-70).
//  Power (whole base): battery charged by the solar array (Sun visible × panel facing),
//    drained by the base loads.

import { TIME, BVAD, OXYGEN, FOOD, POWER, WARNING_THRESHOLD_PERCENT } from '../config/gameplay.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** % per real second for a consumption rate in kg per GAME hour and a capacity in kg. */
function percentPerRealSecond(kgPerGameHour, capacityKg) {
  return ((kgPerGameHour * TIME.GAME_HOURS_PER_REAL_SECOND) / capacityKg) * 100;
}

export const RATES = {
  oxygenInside: percentPerRealSecond(BVAD.O2_KG_PER_DAY_NOMINAL / 24, OXYGEN.CAPACITY_KG),
  oxygenOutside: percentPerRealSecond(BVAD.O2_KG_PER_HOUR_EVA, OXYGEN.CAPACITY_KG),
  foodInside: percentPerRealSecond(BVAD.FOOD_KG_PER_DAY_DRY / 24, FOOD.CAPACITY_KG),
};
RATES.foodOutside = RATES.foodInside * BVAD.EVA_TO_NOMINAL_FOOD_RATIO;

export function createGauges(overrides = {}) {
  return {
    oxygen: OXYGEN.START_PERCENT,
    food: FOOD.START_PERCENT,
    batteryKwh: (POWER.START_PERCENT / 100) * POWER.BATTERY_CAPACITY_KWH,
    ...overrides,
  };
}

export function powerPercent(g) {
  return (g.batteryKwh / POWER.BATTERY_CAPACITY_KWH) * 100;
}

/**
 * Power flows for this moment (kW, game time).
 * @param {object} p
 * @param {number} p.sunVisibility  0..1 (0 = Sun behind the ridge)
 * @param {number} p.alignment      0..1 (how well the panel faces the Sun)
 * @param {number} [p.extraLoadKw]  other loads right now (e.g. suit heaters in a cold trap)
 */
export function computePowerFlow({ sunVisibility, alignment, extraLoadKw = 0 }) {
  const solarKw = POWER.SOLAR_ARRAY_PEAK_KW * clamp(sunVisibility, 0, 1) * clamp(alignment, 0, 1);
  const loads = {
    habitat: POWER.HABITAT_LOAD_KW,
    greenhouse: POWER.GREENHOUSE_LED_LOAD_KW,
    other: Math.max(0, extraLoadKw),
  };
  const loadKw = loads.habitat + loads.greenhouse + loads.other;
  return { solarKw, loadKw, netKw: solarKw - loadKw, loads };
}

/**
 * Advance the gauges by dt real seconds.
 * ctx: { pressurized: boolean, sunVisibility, alignment, extraLoadKw? }
 * Returns a report the HUD and game can use (rates, flags, events).
 */
export function stepGauges(g, dt, ctx) {
  const before = { oxygen: g.oxygen, food: g.food, power: powerPercent(g) };

  // --- oxygen: the astronaut breathes from the shared supply
  const oxygenRate = -(ctx.pressurized ? RATES.oxygenInside : RATES.oxygenOutside); // % per real s
  g.oxygen = clamp(g.oxygen + oxygenRate * dt, 0, 100);

  // --- food
  const foodRate = -(ctx.pressurized ? RATES.foodInside : RATES.foodOutside);
  g.food = clamp(g.food + foodRate * dt, 0, 100);

  // --- power
  const flow = computePowerFlow(ctx);
  g.batteryKwh = clamp(
    g.batteryKwh + flow.netKw * dt * TIME.GAME_HOURS_PER_REAL_SECOND,
    0,
    POWER.BATTERY_CAPACITY_KWH,
  );
  const powerRate = (flow.netKw * TIME.GAME_HOURS_PER_REAL_SECOND * 100) / POWER.BATTERY_CAPACITY_KWH;

  const after = { oxygen: g.oxygen, food: g.food, power: powerPercent(g) };
  const low = WARNING_THRESHOLD_PERCENT;
  const crossedLow = {};
  for (const k of Object.keys(after)) crossedLow[k] = before[k] >= low && after[k] < low;

  return {
    hasPower: g.batteryKwh > 0.01 || flow.solarKw >= flow.loadKw,
    flow,
    rates: { oxygen: oxygenRate, food: foodRate, power: powerRate }, // % per real second
    crossedLow,
    oxygenEmpty: g.oxygen <= 0,
    foodEmpty: g.food <= 0,
  };
}

/**
 * HOOK for the future electrolysis mini-game: add oxygen (kg) to the shared supply.
 * The mini-game must charge its own cost (water + base power) — no free refills.
 * Returns the kg actually stored (the supply cannot go above full).
 */
export function addOxygen(g, kg) {
  const space = ((100 - g.oxygen) / 100) * OXYGEN.CAPACITY_KG;
  const stored = clamp(kg, 0, space);
  g.oxygen += (stored / OXYGEN.CAPACITY_KG) * 100;
  return stored;
}

/**
 * Eat food (kg dry mass, like the BVAD food figures). Returns the kg actually eaten
 * (the gauge cannot go above full).
 */
export function addFood(g, kg) {
  const space = ((100 - g.food) / 100) * FOOD.CAPACITY_KG;
  const eaten = clamp(kg, 0, space);
  g.food += (eaten / FOOD.CAPACITY_KG) * 100;
  return eaten;
}

/** Real seconds until a gauge hits 0 at the current rate (Infinity if not draining). */
export function secondsUntilEmpty(percent, ratePerSecond) {
  return ratePerSecond < 0 ? percent / -ratePerSecond : Infinity;
}

/** Gentle failure: restore the gauges partly (never fully). */
export function applyRecovery(g, { oxygen, food }) {
  g.oxygen = Math.max(g.oxygen, oxygen);
  g.food = Math.max(g.food, food);
}
