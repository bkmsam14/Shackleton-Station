import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TIME, BVAD, DAYS } from '../src/config/gameplay.js';

test('time scale: 1 game day = 720 real seconds = 120x; a 12-hour shift lasts 6 real minutes', () => {
  assert.equal(TIME.SCALE, 120);
  assert.ok(Math.abs(TIME.GAME_HOURS_PER_REAL_SECOND - 1 / 30) < 1e-9);
  assert.equal(DAYS.SHIFT_REAL_SECONDS, 360);
});

test('BVAD: spacewalk oxygen use is ~2.3x nominal', () => {
  assert.ok(Math.abs(BVAD.EVA_TO_NOMINAL_O2_RATIO - 2.306) < 0.01);
});
