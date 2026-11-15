import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RADIATION } from '../src/config/gameplay.js';
import { createGauges } from '../src/systems/gauges.js';
import { createElectrolysisState, checkAfford } from '../src/systems/electrolysis.js';
import {
  createRadiationState,
  stepRadiation,
  shieldFactor,
  wallFactor,
  doseRate,
  expectedStormDose,
  moveWater,
  hoursToArrival,
} from '../src/systems/radiation.js';

const storm = (over = {}) => ({ id: 's1', warnGameHour: 10, arriveGameHour: 14, intensity: 1, flare: { classType: 'X5.8' }, ...over });

/** Run the clock from `from` to `to` game hours in small steps; collect event types. */
function run(state, from, to, ctx, step = 0.1) {
  const types = [];
  for (let h = from + step; h <= to + 1e-9; h += step) for (const e of stepRadiation(state, h, step, ctx)) types.push(e.type);
  return types;
}

test('shelter + water walls block more than the habitat, which blocks more than outside', () => {
  assert.ok(shieldFactor('shelter') < shieldFactor('habitat'));
  assert.ok(shieldFactor('habitat') < shieldFactor('outside'));
  assert.ok(shieldFactor('shelter', 6) < shieldFactor('shelter', 0));
  assert.equal(wallFactor(RADIATION.WALL_HALF_KG), 0.5);
});

test('the strongest storm: outside and the bare shelter reach the limit; water walls save you', () => {
  assert.ok(expectedStormDose(storm(), 'outside') >= 100);
  assert.ok(expectedStormDose(storm(), 'shelter') >= 100); // GAME BALANCE: walls needed (SCIENCE.md)
  assert.ok(expectedStormDose(storm(), 'shelter', 2) < 100);
  assert.ok(expectedStormDose(storm({ intensity: 0.7 }), 'shelter') < 100); // weaker storms: shelter alone
  assert.ok(doseRate(storm({ intensity: 0.25 }), 'outside') < doseRate(storm(), 'outside'));
});

test('storm phases: calm → warning → storm → calm, with a summary', () => {
  const s = createRadiationState([storm()]);
  const types = run(s, 0, 9.9, { place: 'habitat', wallKg: 0 });
  assert.deepEqual(types, []);
  assert.deepEqual(run(s, 9.9, 10.1, { place: 'habitat', wallKg: 0 }), ['warning']);
  assert.ok(Math.abs(hoursToArrival(s, 12) - 2) < 1e-9);
  const rest = run(s, 10.1, 14 + RADIATION.STORM_GAME_HOURS + 0.2, { place: 'shelter', wallKg: 3 });
  assert.deepEqual(rest, ['storm-start', 'storm-end']);
  assert.equal(s.phase, 'calm');
  assert.equal(s.history.length, 1);
  assert.ok(s.history[0].shelteredShare > 0.95);
  assert.ok(Math.abs(s.history[0].dose - expectedStormDose(storm(), 'shelter', 3)) < 1);
});

test('staying outside in a strong storm hits the limit once', () => {
  const s = createRadiationState([storm()]);
  const types = run(s, 0, 20, { place: 'outside', wallKg: 0 });
  assert.equal(types.filter((t) => t === 'limit').length, 1);
  assert.equal(s.history[0].dose, 100);
});

test('mission dose only grows, even after a storm ends', () => {
  const s = createRadiationState([storm(), storm({ id: 's2', warnGameHour: 30, arriveGameHour: 34 })]);
  run(s, 0, 25, { place: 'habitat', wallKg: 0 });
  const after1 = s.missionDose;
  assert.ok(after1 > 0);
  run(s, 25, 45, { place: 'habitat', wallKg: 0 });
  assert.ok(s.missionDose > after1);
});

test('water walls: moving water shields the shelter but the tank can no longer use it for oxygen', () => {
  const g = createGauges({ oxygen: 40 });
  const st = { ...createElectrolysisState({ tankKg: 10 }), wallKg: 0 };
  const r = moveWater(st, g, 6);
  assert.equal(r.movedKg, 6);
  assert.equal(st.tankKg, 4);
  assert.ok(r.kwh > 0);
  // only 4 kg left in the tank → the Big batch (1.69 kg) still fits, but with 1 kg it would not
  moveWater(st, g, -3);
  assert.equal(st.wallKg, 3);
  assert.equal(st.tankKg, 7);
  const st2 = { tankKg: 1, wallKg: 6 };
  assert.equal(checkAfford(g, st2, 'big').reason, 'water');
});

test('water walls: limits and reasons', () => {
  const g = createGauges();
  assert.equal(moveWater({ tankKg: 0, wallKg: 0 }, g, 1).reason, 'tank-empty');
  assert.equal(moveWater({ tankKg: 5, wallKg: RADIATION.WALL_CAPACITY_KG }, g, 1).reason, 'walls-full');
  assert.equal(moveWater({ tankKg: 5, wallKg: 0 }, g, -1).reason, 'walls-empty');
  assert.equal(moveWater({ tankKg: 5, wallKg: 0 }, createGauges({ batteryKwh: 0 }), 1).reason, 'power');
  const st = { tankKg: 10, wallKg: 5 };
  assert.equal(moveWater(st, g, 4).movedKg, RADIATION.WALL_CAPACITY_KG - 5); // capped by capacity
});

test('exposure level (drives the storm snow and dosimeter ticks): 0 when calm, lower in the shelter', async () => {
  const { exposureLevel } = await import('../src/systems/radiation.js');
  const s = createRadiationState([storm()]);
  assert.equal(exposureLevel(s, 'outside'), 0); // no storm yet
  run(s, 0, 14.5, { place: 'outside', wallKg: 0 });
  assert.equal(s.phase, 'storm');
  assert.equal(exposureLevel(s, 'outside'), 1);
  assert.ok(exposureLevel(s, 'shelter') < exposureLevel(s, 'habitat'));
  assert.ok(exposureLevel(s, 'shelter', 6) < exposureLevel(s, 'shelter', 0));
});
