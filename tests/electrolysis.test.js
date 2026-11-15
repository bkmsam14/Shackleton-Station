import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ELECTROLYSIS, POWER, OXYGEN } from '../src/config/gameplay.js';
import { createGauges, powerPercent } from '../src/systems/gauges.js';
import {
  createElectrolysisState,
  batchCost,
  checkAfford,
  applyBatch,
  scoreRound,
} from '../src/systems/electrolysis.js';

const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;
const batch = (id) => ELECTROLYSIS.BATCHES.find((b) => b.id === id);
/** oxygen % that leaves exactly `kg` of room in the supply */
const roomFor = (kg) => 100 - (kg / OXYGEN.CAPACITY_KG) * 100;

test('physics minimum is about 4.96 kWh per kg of oxygen', () => {
  assert.ok(near(ELECTROLYSIS.KWH_PER_KG_O2_MIN, 4.962, 0.001));
});

test('batch cost follows 2 H2O -> 2 H2 + O2 (1.125 kg water per kg O2)', () => {
  const c = batchCost('medium');
  const kg = batch('medium').o2Kg;
  assert.equal(c.o2Kg, kg);
  assert.ok(near(c.waterKg, 1.125 * kg));
  assert.ok(near(c.kwh, ELECTROLYSIS.KWH_PER_KG_O2_MIN * kg));
  // real ISS time at 5.4 kg/day → 1 kg takes 24 / 5.4 ≈ 4.44 h
  assert.ok(near(c.realHours, (24 / 5.4) * kg));
});

test('unknown batch id throws a clear error', () => {
  assert.throws(() => batchCost('huge'), /Unknown electrolysis batch/);
});

test('checkAfford: ok when there is water, power and room for the oxygen', () => {
  const g = createGauges({ oxygen: roomFor(batch('big').o2Kg) - 1 });
  assert.deepEqual(checkAfford(g, createElectrolysisState(), 'big'), { ok: true, reason: null });
});

test('checkAfford: refuses when the tank lacks water', () => {
  const g = createGauges({ oxygen: roomFor(batch('big').o2Kg) - 1 });
  const r = checkAfford(g, { tankKg: 0.1 }, 'big');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'water');
});

test('checkAfford: refuses a batch that would not fit in the oxygen supply (no wasted water)', () => {
  const g = createGauges({ oxygen: roomFor(batch('small').o2Kg) + 5 }); // a little less room than Small makes
  const r = checkAfford(g, createElectrolysisState(), 'small');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'full');
  assert.equal(checkAfford(createGauges({ oxygen: roomFor(batch('big').o2Kg) - 1 }), createElectrolysisState(), 'big').ok, true);
});

test('checkAfford: refuses if paying would drop the battery under the floor', () => {
  const floorKwh = (ELECTROLYSIS.POWER_FLOOR_PERCENT / 100) * POWER.BATTERY_CAPACITY_KWH;
  const g = createGauges({ oxygen: 10, batteryKwh: floorKwh + batchCost('small').kwh / 2 }); // half of what Small needs
  const r = checkAfford(g, createElectrolysisState(), 'small');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'power');
});

test('applyBatch pays water + power and adds oxygen through addOxygen', () => {
  const g = createGauges({ oxygen: 10, batteryKwh: 20 });
  const s = createElectrolysisState();
  const kwh0 = g.batteryKwh;
  const res = applyBatch(g, s, 'medium', 4);
  const c = batchCost('medium');
  assert.ok(near(s.tankKg, ELECTROLYSIS.TANK_START_KG - c.waterKg));
  assert.ok(near(kwh0 - g.batteryKwh, c.kwh + 4 * ELECTROLYSIS.MISS_EXTRA_KWH));
  assert.ok(near(res.storedKg, batch('medium').o2Kg));
  assert.ok(g.oxygen > 10);
});

test('applyBatch fills to exactly full and never drives power below 0', () => {
  const g = createGauges({ oxygen: roomFor(batch('big').o2Kg) - 1e-9, batteryKwh: 4 }); // affordable, but 1000 misses would overspend
  applyBatch(g, createElectrolysisState(), 'big', 1000);
  assert.ok(near(g.oxygen, 100));
  assert.ok(g.batteryKwh >= 0);
  assert.ok(powerPercent(g) >= 0);
});

test('heat from misses is capped at a share of the batch power', () => {
  const g = createGauges({ oxygen: 40 });
  const res = applyBatch(g, createElectrolysisState(), 'small', 10000);
  assert.ok(near(res.heatKwh, res.kwh * ELECTROLYSIS.MAX_HEAT_FRACTION));
});

test('applyBatch refuses a batch it cannot afford (no free oxygen)', () => {
  const g = createGauges({ oxygen: 40 });
  assert.throws(() => applyBatch(g, { tankKg: 0 }, 'small', 0), /Cannot afford/);
  assert.equal(g.oxygen, 40);
});

test('scoreRound: 1 star minimum, 2 for accurate play, +1 for the quiz, max 3', () => {
  assert.equal(scoreRound({ hits: 8, misses: 20, quizCorrect: false }), 1);
  assert.equal(scoreRound({ hits: 8, misses: 1, quizCorrect: false }), 2);
  assert.equal(scoreRound({ hits: 8, misses: 1, quizCorrect: true }), 3);
  assert.equal(scoreRound({ hits: 8, misses: 20, quizCorrect: true }), 2);
  assert.equal(scoreRound({ hits: 0, misses: 0, quizCorrect: false }), 2); // no misses = accurate
});
