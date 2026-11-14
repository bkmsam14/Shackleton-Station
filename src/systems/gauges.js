// gauges.js — survival gauges and base power. PURE LOGIC: no Three.js, no DOM.
// All rates come from src/config/gameplay.js (BVAD values + marked game-balance numbers).
//
//  Oxygen (astronaut): drains at the BVAD nominal rate inside, at the BVAD spacewalk rate
//    outside (~2.3× faster). Inside a pressurized module WITH power it refills — and the
//    refill adds an extra load on base power (no free refills).
//  Food (astronaut): drains at the BVAD daily rate, all the time.
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
  food: percentPerRealSecond(BVAD.FOOD_KG_PER_DAY_DRY / 24, FOOD.CAPACITY_KG),
};

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
 * @param {boolean} p.refillingO2   habitat/greenhouse is topping up your oxygen
 */
export function computePowerFlow({ sunVisibility, alignment, refillingO2 }) {
  const solarKw = POWER.SOLAR_ARRAY_PEAK_KW * clamp(sunVisibility, 0, 1) * clamp(alignment, 0, 1);
  const loads = {
    habitat: POWER.HABITAT_LOAD_KW,
    greenhouse: POWER.GREENHOUSE_LED_LOAD_KW,
    airRefill: refillingO2 ? POWER.O2_REFILL_LOAD_KW : 0,
  };
  const loadKw = loads.habitat + loads.greenhouse + loads.airRefill;
  return { solarKw, loadKw, netKw: solarKw - loadKw, loads };
}

/**
 * Advance the gauges by dt real seconds.
 * ctx: { pressurized: boolean, sunVisibility, alignment }
 * Returns a report the HUD and game can use (rates, flags, events).
 */
export function stepGauges(g, dt, ctx) {
  const before = { oxygen: g.oxygen, food: g.food, power: powerPercent(g) };

  // Is the base powered? (battery has charge, or the Sun alone covers the load)
  const baseFlow = computePowerFlow({ ...ctx, refillingO2: false });
  const hasPower = g.batteryKwh > 0.01 || baseFlow.solarKw >= baseFlow.loadKw;

  // --- oxygen
  const canRefill = ctx.pressurized && hasPower;
  const refillingO2 = canRefill && g.oxygen < 100;
  let oxygenRate; // % per real second (+ refill, − drain)
  if (canRefill) oxygenRate = refillingO2 ? OXYGEN.REFILL_PERCENT_PER_REAL_SECOND : 0;
  else oxygenRate = -(ctx.pressurized ? RATES.oxygenInside : RATES.oxygenOutside);
  g.oxygen = clamp(g.oxygen + oxygenRate * dt, 0, 100);

  // --- food
  const foodRate = -RATES.food;
  g.food = clamp(g.food + foodRate * dt, 0, 100);

  // --- power
  const flow = computePowerFlow({ ...ctx, refillingO2 });
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
    refillingO2,
    flow,
    rates: { oxygen: oxygenRate, food: foodRate, power: powerRate }, // % per real second
    crossedLow,
    oxygenEmpty: g.oxygen <= 0,
    foodEmpty: g.food <= 0,
  };
}

/** Real seconds until a gauge hits 0 at the current rate (Infinity if not draining). */
export function secondsUntilEmpty(percent, ratePerSecond) {
  return ratePerSecond < 0 ? percent / -ratePerSecond : Infinity;
}

/** Gentle failure: restore the astronaut gauges partly (never fully). */
export function applyRecovery(g, { oxygen, food }) {
  g.oxygen = Math.max(g.oxygen, oxygen);
  g.food = Math.max(g.food, food);
}
