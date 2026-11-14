import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TIME, BVAD } from '../src/config/gameplay.js';

test('time scale: 1 game day = 240 real seconds = 360x', () => {
  assert.equal(TIME.SCALE, 360);
  assert.ok(Math.abs(TIME.GAME_HOURS_PER_REAL_SECOND - 0.1) < 1e-9);
});

test('BVAD: spacewalk oxygen use is ~2.3x nominal', () => {
  assert.ok(Math.abs(BVAD.EVA_TO_NOMINAL_O2_RATIO - 2.306) < 0.01);
});
