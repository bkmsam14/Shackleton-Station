import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LOLA } from '../src/data/lolaTerrain.js';
import { realHeight, heightAt } from '../src/world/heightfield.js';
import { horizonDeg, worldToMap } from '../src/world/lola.js';
import { SKY } from '../src/config/gameplay.js';

// world position at distance d toward lunar longitude lon (same rotation as the Live sky)
const toward = (lonDeg, d) => {
  const az = ((lonDeg + SKY.EARTH_AZIMUTH_DEG) * Math.PI) / 180;
  return [Math.sin(az) * d, -Math.cos(az) * d];
};

test('real terrain: the base site is the zero level and the pad is flat', () => {
  assert.ok(Math.abs(realHeight(0, 0)) < 0.5);
  assert.equal(heightAt(0, 10), 0);
  assert.match(LOLA.url, /pds-geosciences/);
});

test('real terrain: Shackleton crater drops kilometres away toward ~127°E', () => {
  // the floor centre is ~10.4 km from the pole; the site is 0.45 km from the pole
  const [x, z] = toward(127.5, 10400);
  assert.ok(realHeight(x, z) < -3000, `floor height ${realHeight(x, z)}`);
});

test('map ↔ world: longitude 0 (Earth) is at the game azimuth of Earth', () => {
  const [x, z] = toward(0, 100);
  const m = worldToMap(x, z);
  assert.ok(Math.abs(m.x) < 1e-6 && Math.abs(m.y - 100) < 1e-6);
});

test('the real horizon is low toward Earth, so Earth stays in view', () => {
  assert.ok(horizonDeg(SKY.EARTH_AZIMUTH_DEG) < SKY.EARTH_ELEVATION_DEG);
});
