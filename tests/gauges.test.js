import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGauges, stepGauges, RATES, powerPercent, computePowerFlow } from '../src/systems/gauges.js';
import { BVAD } from '../src/config/gameplay.js';
import { sunVisibility } from '../src/systems/daycycle.js';

const sunny = { sunVisibility: 1, alignment: 1 };
const dark = { sunVisibility: 0, alignment: 1 };

test('oxygen drains ~2.3x faster outside than inside (BVAD ratio)', () => {
  assert.ok(Math.abs(RATES.oxygenOutside / RATES.oxygenInside - BVAD.EVA_TO_NOMINAL_O2_RATIO) < 1e-9);
});

test('outside: oxygen drains, food drains', () => {
  const g = createGauges({ oxygen: 100, food: 100 });
  const r = stepGauges(g, 10, { pressurized: false, ...sunny });
  assert.ok(g.oxygen < 100 && g.food < 100);
  assert.ok(r.rates.oxygen < 0);
  assert.equal(r.refillingO2, false);
});

test('inside with power: oxygen refills and costs extra base power', () => {
  const g = createGauges({ oxygen: 50 });
  const r = stepGauges(g, 1, { pressurized: true, ...dark });
  assert.ok(g.oxygen > 50);
  assert.equal(r.refillingO2, true);
  assert.ok(r.flow.loads.airRefill > 0); // no free refills
});

test('inside with NO power: no refill, oxygen drains slowly (nominal rate)', () => {
  const g = createGauges({ oxygen: 50, batteryKwh: 0 });
  const r = stepGauges(g, 1, { pressurized: true, ...dark });
  assert.ok(g.oxygen < 50);
  assert.ok(Math.abs(r.rates.oxygen + RATES.oxygenInside) < 1e-12);
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
  assert.equal(computePowerFlow({ sunVisibility: 1, alignment: 0, refillingO2: false }).solarKw, 0);
});

test('reports crossing below 25% once', () => {
  const g = createGauges({ food: 25.01 });
  const r = stepGauges(g, 1, { pressurized: true, ...sunny });
  assert.equal(r.crossedLow.food, true);
  const r2 = stepGauges(g, 1, { pressurized: true, ...sunny });
  assert.equal(r2.crossedLow.food, false);
});

test('ridge hides the Sun only inside its sector', () => {
  assert.equal(sunVisibility(200), 1);
  assert.equal(sunVisibility(322.5), 0);
  assert.ok(sunVisibility(300) > 0 && sunVisibility(300) < 1);
});
