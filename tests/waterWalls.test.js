import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RADIATION } from '../src/config/gameplay.js';
import { particlesPerHundred, shieldFactor } from '../src/systems/radiation.js';
import { FACTS, QUIZ } from '../src/instances/waterWalls/content.js';

test('particles per 100 match the shielding the game uses for your dose', () => {
  assert.equal(particlesPerHundred('outside'), 100);
  assert.equal(particlesPerHundred('shelter', 0), Math.round(shieldFactor('shelter') * 100));
  assert.ok(particlesPerHundred('shelter', RADIATION.WALL_CAPACITY_KG) < particlesPerHundred('shelter', 0));
  assert.ok(particlesPerHundred('shelter', 0) < particlesPerHundred('habitat'));
  assert.ok(particlesPerHundred('shelter', 1000) >= 1); // never shows "0" — shielding never stops everything
});

test('every water-wall fact has a source link', () => {
  for (const f of FACTS) {
    assert.ok(f.title && f.text && f.source, f.id);
    assert.match(f.url, /^https:\/\//, f.id);
  }
});

test('quick-check questions are well formed', () => {
  for (const q of QUIZ) {
    assert.ok(q.options.length >= 2 && q.options.length <= 3, q.q);
    assert.ok(q.answer >= 0 && q.answer < q.options.length, q.q);
    assert.ok(q.hint && q.explain, q.q);
  }
});
