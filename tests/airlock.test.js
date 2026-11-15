import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AIRLOCK } from '../src/config/gameplay.js';
import { createGauges } from '../src/systems/gauges.js';
import { createAirlockCycle, stepAirlock, pressureAt, cycleSeconds, payCycle } from '../src/systems/airlock.js';

function run(dir, dt = 0.05) {
  const c = createAirlockCycle(dir);
  const events = [];
  let guard = 0;
  while (c.phase !== 'done' && guard++ < 1000) events.push(...stepAirlock(c, dt));
  return { c, events };
}

test('going out: full air → pumps (most air saved) → vent → vacuum, events in order', () => {
  const { c, events } = run('out');
  assert.deepEqual(events, ['hatch-close', 'pump', 'vent', 'equal', 'hatch-open', 'done']);
  assert.equal(c.pressure, 0);
  assert.equal(pressureAt('out', 0), 1);
  const atPumpEnd = pressureAt('out', AIRLOCK.CLOSE_S + AIRLOCK.PUMP_S);
  assert.ok(Math.abs(atPumpEnd - AIRLOCK.PUMP_STOP_FRACTION) < 1e-9); // pumps stop, the rest is vented
});

test('pressure only goes down going out, and up coming in', () => {
  let last = 2;
  for (let t = 0; t <= cycleSeconds(); t += 0.1) {
    const p = pressureAt('out', t);
    assert.ok(p <= last + 1e-12);
    last = p;
    assert.ok(Math.abs(pressureAt('in', t) - (1 - p)) < 1e-12);
  }
  assert.equal(run('in').c.pressure, 1);
});

test('skipping fast-forwards the cycle', () => {
  const c = createAirlockCycle('out');
  c.skipping = true;
  let n = 0;
  while (c.phase !== 'done' && n < 1000) {
    stepAirlock(c, 0.05);
    n++;
  }
  assert.ok(n * 0.05 < cycleSeconds() / 2);
});

test('every cycle costs a little oxygen (never free)', () => {
  const g = createGauges({ oxygen: 50 });
  const c = payCycle(g);
  assert.ok(c.oxygenPercent > 0 && c.gameHours > 0);
  assert.ok(g.oxygen < 50);
  assert.throws(() => createAirlockCycle('sideways'));
});
