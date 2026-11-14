import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUIZ, shuffledOptions } from '../src/instances/electrolysis/content.js';

test('every quiz question is complete: valid answer, hint, explanation and a source URL', () => {
  for (const q of QUIZ) {
    assert.ok(q.options.length >= 2 && q.options.length <= 4, q.q);
    assert.ok(q.answer >= 0 && q.answer < q.options.length, q.q);
    assert.ok(q.hint && q.explain, q.q);
    assert.match(q.source.url, /^https:\/\//, q.q);
  }
});

test('answers stay short for young readers (≤ 4 words)', () => {
  for (const q of QUIZ) for (const o of q.options) assert.ok(o.text.split(/\s+/).length <= 4, o.text);
});

test('shuffledOptions is a permutation of the option indexes', () => {
  const q = QUIZ[0];
  for (let k = 0; k < 20; k++) {
    const order = shuffledOptions(q);
    assert.deepEqual([...order].sort(), q.options.map((_, i) => i));
  }
});

test('the right answer does not always land in the same spot', () => {
  const q = QUIZ[1];
  const spots = new Set();
  let seed = 1;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 30; k++) spots.add(shuffledOptions(q, rand).indexOf(q.answer));
  assert.ok(spots.size > 1);
});
