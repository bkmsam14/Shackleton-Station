// Game balance targets (docs/SCIENCE.md "Game balance"). If a number in gameplay.js changes
// and one of these fails, the game got too easy or too hard — re-run `npm run balance`.
// Every bot runs 200 times with random micrometeoroid hits (solar array or habitat air leak).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BOTS, simulateMany, stormTable, nightBudget, cropTable } from '../src/systems/balanceSim.js';
import { buildStorms } from '../src/systems/spaceWeather.js';
import { computePowerFlow } from '../src/systems/gauges.js';
import { POWER } from '../src/config/gameplay.js';

const MIN = 60;
const RUNS = 200;
const firstFailures = (m) => m.results.map((r) => r.firstFailure?.t ?? Infinity);

test('idle: doing nothing fails after 5–8 real minutes (4 at the earliest with an unpatched air leak)', () => {
  const f = firstFailures(simulateMany(BOTS.idle, RUNS));
  for (const t of f) assert.ok(t >= 4 * MIN && t <= 8 * MIN, `first failure at ${t} s`);
  // most runs have no early leak: they still land in the 5–8 min window
  assert.ok(f.filter((t) => t >= 5 * MIN).length / f.length >= 0.85);
});

test('sloppy: usually lasts 18 of 20 minutes; bad luck with the array never ends it before 14', () => {
  const f = firstFailures(simulateMany(BOTS.sloppy, RUNS));
  const ok = f.filter((t) => t >= 18 * MIN).length / f.length;
  assert.ok(ok >= 0.9, `only ${Math.round(ok * 100)} % of runs reached 18 min`);
  assert.ok(Math.min(...f) >= 14 * MIN, `earliest failure ${Math.min(...f)} s`);
});

test('skilled: keeping every loop going never fails, even with unlucky array hits', () => {
  const m = simulateMany(BOTS.skilled, RUNS);
  assert.equal(m.failedRuns, 0);
  for (const r of m.results) assert.ok(r.end.oxygen >= 40 && r.end.food >= 40, JSON.stringify(r.end));
  assert.ok(m.worstBlackout <= 30, `worst blackout ${m.worstBlackout} s`);
});

test('micrometeoroid hits: about one per 3 game days, array or habitat, never both broken at once', () => {
  const m = simulateMany(BOTS.skilled, RUNS);
  assert.ok(m.meanHits > 1 && m.meanHits < 2.2, `mean hits ${m.meanHits}`);
  const leaks = m.results.reduce((a, r) => a + r.leakHits, 0);
  const share = leaks / m.results.reduce((a, r) => a + r.hits, 0);
  assert.ok(share > 0.3 && share < 0.5, `habitat share ${share}`);
  for (const r of m.results) assert.ok(r.hits === 0 || r.damagedSeconds > 0 || r.leakSeconds > 0);
});

test('crops: potato feeds the most per minute; greens are faster but smaller', () => {
  const rows = Object.fromEntries(cropTable().map((c) => [c.id, c]));
  for (const g of ['lettuce', 'radish']) {
    assert.ok(rows[g].growSeconds < rows.potato.growSeconds);
    assert.ok(rows[g].perHarvestPct < rows.potato.perHarvestPct);
    assert.ok(rows[g].pctPerMinute < rows.potato.pctPerMinute);
  }
  // real growth 27 (radish) : 33 (lettuce) days is kept
  assert.ok(Math.abs(rows.radish.growSeconds / rows.lettuce.growSeconds - 27 / 33) < 0.02);
});

test('the night: grow lights on → blackout; off → the battery lasts', () => {
  const n = nightBudget();
  assert.ok(n.kwhLightsOn > n.batteryKwh, 'lights on must not fit');
  assert.ok(n.kwhLightsOff < n.batteryKwh, 'lights off must fit');
});

test('grow lights off removes their load', () => {
  const on = computePowerFlow({ sunVisibility: 0, alignment: 0 });
  const off = computePowerFlow({ sunVisibility: 0, alignment: 0, growLightsOn: false });
  assert.equal(on.loadKw - off.loadKw, POWER.GREENHOUSE_LED_LOAD_KW);
});

test('storms: the shelter alone is enough for weaker storms; the strongest needs water walls', () => {
  const data = JSON.parse(readFileSync(new URL('../public/data/space-weather-2024-05.json', import.meta.url)));
  const rows = stormTable(buildStorms(data));
  const strongest = rows.reduce((a, b) => (b.intensity > a.intensity ? b : a));
  assert.ok(strongest.shelter[0] > 100, 'strongest storm: shelter alone is not enough');
  assert.ok(strongest.shelter[2] < 100, 'strongest storm: 2 kg of water in the walls is enough');
  assert.ok(rows.some((r) => r.shelter[0] < 100 && r.habitat > 100), 'some storms: shelter needed, walls optional');
  for (const r of rows) assert.ok(r.outside > r.habitat && r.habitat > r.shelter[0]);
});
