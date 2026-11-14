import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMastery, levelFor } from '../src/systems/mastery.js';

function memoryStore(initial = {}) {
  let data = { ...initial };
  return {
    load: () => data,
    save: (patch) => {
      data = { ...data, ...patch };
      return data;
    },
  };
}

test('levelFor: no runs → none, 1 star → bronze, 2 → silver, 3 → gold', () => {
  assert.equal(levelFor(0), 'none');
  assert.equal(levelFor(1), 'bronze');
  assert.equal(levelFor(2), 'silver');
  assert.equal(levelFor(3), 'gold');
});

test('recordRun keeps the best stars and counts runs', () => {
  const m = createMastery(memoryStore());
  assert.equal(m.get('electrolysis').level, 'none');
  m.recordRun('electrolysis', 2);
  m.recordRun('electrolysis', 1);
  const e = m.get('electrolysis');
  assert.equal(e.bestStars, 2);
  assert.equal(e.runs, 2);
  assert.equal(e.level, 'silver');
});

test('mastery survives a reload from the same store', () => {
  const store = memoryStore();
  createMastery(store).recordRun('electrolysis', 3);
  assert.equal(createMastery(store).get('electrolysis').level, 'gold');
});

test('a broken store does not crash the game', () => {
  const m = createMastery({
    load: () => {
      throw new Error('blocked');
    },
    save: () => {
      throw new Error('blocked');
    },
  });
  assert.doesNotThrow(() => m.recordRun('electrolysis', 1));
  assert.equal(m.get('electrolysis').level, 'bronze');
});
