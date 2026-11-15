import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liveSky } from '../src/systems/ephemeris.js';
import { createDayCycle, setLiveSky, getSun, stepDayCycle } from '../src/systems/daycycle.js';
import { placeOnSky, gameSkyMatrix, horizontalFromEcliptic, eclipticFromEquatorial } from '../src/systems/skyMath.js';

// Reference: NASA JPL Horizons (DE441), observer on the Moon at 0°E, 90°S, surface
// (CENTER='coord@301', SITE_COORD='0,-90,0', QUANTITIES='4'), queried Nov 2026.
const HORIZONS = [
  // date (UTC),        Sun az, Sun el,   Earth az, Earth el
  ['2026-11-15T00:00Z', 114.431, 1.556, 357.38, -3.553],
  ['2024-05-10T12:00Z', 154.663, -0.925, 5.758, 5.928],
  ['2025-03-01T06:00Z', 161.555, 0.474, 358.307, -0.292],
  ['2027-07-20T18:00Z', 335.349, -0.395, 357.966, 0.804],
  ['2026-02-14T09:30Z', 212.813, 0.397, 356.304, -5.502],
];
const dAz = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

test('live Sun and Earth match NASA JPL Horizons (Sun < 0.05°, Earth < 0.3°)', () => {
  for (const [t, saz, sel, eaz, eel] of HORIZONS) {
    const s = liveSky(Date.parse(t));
    assert.ok(dAz(s.sun.az, saz) < 0.05 && Math.abs(s.sun.alt - sel) < 0.05, `Sun ${t}: ${s.sun.az} ${s.sun.alt}`);
    assert.ok(dAz(s.earth.az, eaz) < 0.3 && Math.abs(s.earth.alt - eel) < 0.3, `Earth ${t}: ${s.earth.az} ${s.earth.alt}`);
  }
});

test('Earth phase from the Moon: full Earth at new Moon, new Earth at full Moon', () => {
  assert.ok(liveSky(Date.parse('2026-11-09T00:00Z')).earthLit > 0.95);
  assert.ok(liveSky(Date.parse('2026-11-24T00:00Z')).earthLit < 0.05);
});

test('live mode: getSun follows the real clock, Polaris stays below the horizon', () => {
  const d = createDayCycle();
  setLiveSky(d, true, Date.parse('2026-11-15T00:00Z'));
  const s0 = getSun(d);
  assert.equal(s0.live, true);
  assert.ok(Math.abs(s0.elevationDeg - 1.556) < 0.05);
  assert.ok(placeOnSky(s0.skyMatrix, 37.95, 89.26).alt < -60); // Polaris
  stepDayCycle(d, 3600); // one real hour: the Sun barely moves (≈0.5°)
  assert.ok(dAz(getSun(d).azimuthDeg, s0.azimuthDeg) < 1);
  setLiveSky(d, false);
  assert.equal(getSun(d).live, false);
});

test('game-mode matrix places stars exactly like the ecliptic formula', () => {
  const M = gameSkyMatrix(73);
  const e = eclipticFromEquatorial(101.2871, -16.7161);
  const a = horizontalFromEcliptic(e.lon, e.lat, 73);
  const b = placeOnSky(M, 101.2871, -16.7161);
  assert.ok(dAz(a.az, b.az) < 1e-6 && Math.abs(a.alt - b.alt) < 1e-6);
});
