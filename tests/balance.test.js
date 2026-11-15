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

test('idle: doing nothing needs a rescue during Day 1 (it starts at 60 % oxygen; not before 1.5 min)', () => {
  const m = simulateMany(BOTS.idle, RUNS);
  for (const r of m.results) {
    assert.ok(r.firstFailure && r.firstFailure.day === 1, JSON.stringify(r.firstFailure));
    assert.ok(r.firstFailure.t >= 1.5 * MIN, `first rescue at ${r.firstFailure.t} s`);
  }
});

test('sloppy: Days 1–2 without a rescue in ≥ 90 % of runs, at most 3 rescues in the mission', () => {
  const m = simulateMany(BOTS.sloppy, RUNS);
  const clean = m.results.filter((r) => r.rescuesByDay[0] + r.rescuesByDay[1] === 0).length / RUNS;
  assert.ok(clean >= 0.9, `only ${Math.round(clean * 100)} % of runs got through Days 1–2`);
  for (const r of m.results) assert.ok(r.failures.length <= 3, `${r.failures.length} rescues`);
});

test('skilled: keeping every loop going wins all 4 days without a rescue', () => {
  const m = simulateMany(BOTS.skilled, RUNS);
  assert.equal(m.failedRuns, 0);
  for (const r of m.results) assert.ok(r.end.oxygen >= 40 && r.end.food >= 20 && r.lowest.food >= 15, JSON.stringify(r.end));
  assert.ok(m.worstBlackout <= 30, `worst blackout ${m.worstBlackout} s`);
});

test('micrometeoroid hits: 2–3 per mission, array or habitat, never both broken at once', () => {
  const m = simulateMany(BOTS.skilled, RUNS);
  assert.ok(m.meanHits > 1.8 && m.meanHits < 3.2, `mean hits ${m.meanHits}`);
  const leaks = m.results.reduce((a, r) => a + r.leakHits, 0);
  const share = leaks / m.results.reduce((a, r) => a + r.hits, 0);
  assert.ok(share > 0.3 && share < 0.5, `habitat share ${share}`);
  for (const r of m.results) assert.ok(r.hits === 0 || r.damagedSeconds > 0 || r.leakSeconds > 0);
});

test('crops: potato takes 2 nights and feeds the most; greens are ready next morning but small', () => {
  const rows = Object.fromEntries(cropTable().map((c) => [c.id, c]));
  assert.equal(rows.potato.nights, 2);
  for (const g of ['lettuce', 'radish']) {
    assert.equal(rows[g].nights, 1);
    assert.ok(rows[g].perHarvestPct < rows.potato.perHarvestPct);
    assert.ok(rows[g].pctPerDay < rows.potato.pctPerDay);
  }
});

test('a dark stretch in a shift: grow lights on → blackout; off → the battery lasts', () => {
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
