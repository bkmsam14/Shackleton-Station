import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGauges, stepGauges, RATES, powerPercent, computePowerFlow, addOxygen } from '../src/systems/gauges.js';
import { BVAD } from '../src/config/gameplay.js';
import { sunVisibility } from '../src/systems/daycycle.js';

const sunny = { sunVisibility: 1, alignment: 1 };
const dark = { sunVisibility: 0, alignment: 1 };

test('oxygen drains ~2.3x faster outside than inside (BVAD ratio)', () => {
  assert.ok(Math.abs(RATES.oxygenOutside / RATES.oxygenInside - BVAD.EVA_TO_NOMINAL_O2_RATIO) < 1e-9);
});

test('food drains ~2x faster outside (BVAD EVA food energy ratio)', () => {
  assert.ok(Math.abs(RATES.foodOutside / RATES.foodInside - BVAD.EVA_TO_NOMINAL_FOOD_RATIO) < 1e-9);
  assert.ok(Math.abs(BVAD.EVA_TO_NOMINAL_FOOD_RATIO - 1.995) < 0.01);
});

test('outside: oxygen drains, food drains', () => {
  const g = createGauges({ oxygen: 100, food: 100 });
  const r = stepGauges(g, 10, { pressurized: false, ...sunny });
  assert.ok(g.oxygen < 100 && g.food < 100);
  assert.ok(r.rates.oxygen < 0);
});

test('inside: the shared oxygen supply still drains, at the slower nominal rate (no free refill)', () => {
  const g = createGauges({ oxygen: 50 });
  const r = stepGauges(g, 1, { pressurized: true, ...sunny });
  assert.ok(g.oxygen < 50);
  assert.ok(Math.abs(r.rates.oxygen + RATES.oxygenInside) < 1e-12);
});

test('addOxygen hook (future electrolysis) stores kg and never overfills', () => {
  const g = createGauges({ oxygen: 90 });
  const stored = addOxygen(g, 10);
  assert.equal(g.oxygen, 100);
  assert.ok(stored > 0 && stored < 10);
});

test('power charges in sunlight and drains in the dark', () => {
  const g = createGauges();
  const p0 = powerPercent(g);
  stepGauges(g, 10, { pressurized: false, ...sunny });
  assert.ok(powerPercent(g) > p0);
  const p1 = powerPercent(g);
  stepGauges(g, 10, { pressurized: false, ...dark });
  assert.ok(powerPercent(g) < p1);
});

test('a panel turned away from the Sun makes no power', () => {
  assert.equal(computePowerFlow({ sunVisibility: 1, alignment: 0 }).solarKw, 0);
});

test('reports crossing below 25% once', () => {
  const g = createGauges({ food: 25.01 });
  const r = stepGauges(g, 1, { pressurized: true, ...sunny });
  assert.equal(r.crossedLow.food, true);
  const r2 = stepGauges(g, 1, { pressurized: true, ...sunny });
  assert.equal(r2.crossedLow.food, false);
});

test('the real LOLA horizon hides the low Sun only behind real ridges', () => {
  // game azimuth = lunar longitude + 150° (lon 205° is behind the high ridge next to the base)
  assert.equal(sunVisibility(205 + 150, 1.5), 0);
  assert.equal(sunVisibility(100 + 150, 1.5), 1);
  // a Sun right on the skyline is half hidden
  assert.ok(sunVisibility(205 + 150, 9) > 0.99);
});
