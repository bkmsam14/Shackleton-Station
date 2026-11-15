import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TARGETS, SOURCES, MOON_SKY_FACTS } from '../src/data/constellations.js';
import { eclipticFromEquatorial, everVisible } from '../src/systems/skyMath.js';

const data = JSON.parse(readFileSync(new URL('../public/data/stars-bsc.json', import.meta.url)));
const byHr = new Map(data.stars.map((s) => [s[0], s]));

test('every Star Hunt target is made of real catalog stars seen from the lunar south pole', () => {
  assert.equal(TARGETS.length, 6);
  for (const t of TARGETS) {
    if (t.cloud) {
      assert.ok(everVisible(eclipticFromEquatorial(t.cloud.ra, t.cloud.dec).lat), t.id);
      continue;
    }
    for (const hr of t.paths.flat()) {
      const s = byHr.get(hr);
      assert.ok(s, `${t.id}: HR ${hr} is in stars-bsc.json`);
      assert.ok(everVisible(eclipticFromEquatorial(s[1], s[2]).lat), `${t.id}: HR ${hr} can be seen`);
    }
  }
});

test('every card and fact has a real source link', () => {
  for (const t of TARGETS) {
    assert.ok(t.card.length >= 2 && t.hint, t.id);
    for (const k of t.sources) assert.match(SOURCES[k].url, /^https:\/\//, `${t.id}: ${k}`);
  }
  for (const f of MOON_SKY_FACTS) assert.ok(SOURCES[f.source], f.text);
});
