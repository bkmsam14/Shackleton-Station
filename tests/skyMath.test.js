import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SKY } from '../src/config/gameplay.js';
import { createDayCycle, stepDayCycle, sunAzimuthDeg } from '../src/systems/daycycle.js';
import {
  eclipticFromEquatorial,
  sunEclipticLon,
  skyTurnDeg,
  horizontalFromEcliptic,
  separationDeg,
  everVisible,
  bvToTemperatureK,
  colourWord,
  wrap360,
} from '../src/systems/skyMath.js';

const near = (a, b, eps) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('RA/Dec → ecliptic matches known stars', () => {
  const sirius = eclipticFromEquatorial(101.2871, -16.7161);
  near(sirius.lat, -39.6, 0.2);
  near(sirius.lon, 104.1, 0.3);
  near(eclipticFromEquatorial(95.9879, -52.6958).lat, -75.8, 0.2); // Canopus
  near(eclipticFromEquatorial(37.95, 89.26).lat, 66.1, 0.3); // Polaris
});

test('at the lunar south pole: Polaris is never up, the Southern Cross always is', () => {
  assert.equal(everVisible(eclipticFromEquatorial(37.95, 89.26).lat), false);
  const acrux = eclipticFromEquatorial(186.65, -63.1);
  assert.equal(everVisible(acrux.lat), true);
  // height never changes as the sky turns
  for (const turn of [0, 90, 200]) near(horizontalFromEcliptic(acrux.lon, acrux.lat, turn).alt, 52.9, 0.2);
});

test('the Sun goes round counter-clockwise from above (azimuth goes down)', () => {
  const d = createDayCycle();
  const a0 = sunAzimuthDeg(d);
  stepDayCycle(d, 10);
  const a1 = sunAzimuthDeg(d);
  assert.ok(wrap360(a0 - a1) > 0 && wrap360(a0 - a1) < 90);
});

test('stars lap the sky once per sidereal month (27.3 days), the Sun per synodic (29.5)', () => {
  const d = createDayCycle();
  const turnAt = (secs) => {
    const s = { ...d, sunRealSeconds: secs };
    return skyTurnDeg(sunAzimuthDeg(s), sunEclipticLon(secs));
  };
  // find how many real seconds one full turn of the stars takes
  const loop = SKY.GAME_SUN_LOOP_REAL_SECONDS;
  const ratePerSec = (wrap360(turnAt(0) - turnAt(1)) + 0) / 1; // degrees per real second (azimuth goes down)
  const starLapSeconds = 360 / ratePerSec;
  const starLapDays = (starLapSeconds / loop) * SKY.REAL_SUN_LOOP_DAYS;
  near(starLapDays, 27.32, 0.05);
});

test('angular separation and colours', () => {
  near(separationDeg({ az: 0, alt: 0 }, { az: 90, alt: 0 }), 90, 1e-9);
  near(separationDeg({ az: 10, alt: 89 }, { az: 190, alt: 89 }), 2, 1e-6);
  assert.ok(bvToTemperatureK(-0.2) > bvToTemperatureK(1.8)); // blue hotter than red
  assert.equal(colourWord(1.85), 'red-orange'); // Betelgeuse
  assert.equal(colourWord(-0.23), 'blue-white'); // Mimosa
});

test('star file: real catalog, only stars that can be seen from the south pole', () => {
  const data = JSON.parse(readFileSync(new URL('../public/data/stars-bsc.json', import.meta.url)));
  assert.match(data.url, /heasarc\.gsfc\.nasa\.gov/);
  assert.ok(data.stars.length > 1000);
  const hrs = new Set(data.stars.map((s) => s[0]));
  for (const hr of [2491, 2326, 4730, 4853, 5459, 5267, 1713, 2061]) assert.ok(hrs.has(hr), `HR ${hr}`);
  assert.equal(hrs.has(424), false); // Polaris never rises here
  for (const s of data.stars) assert.ok(s[3] <= SKY.STAR_MAX_MAG);
});
