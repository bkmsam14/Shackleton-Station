// Micrometeoroid hits (array OR habitat, never both), the air-leak physics, and the rules of
// the new repair mini-games (pure logic only).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEAK, BVAD, MICROMETEOROIDS } from '../src/config/gameplay.js';
import {
  GRACE_SECONDS,
  createImpactState,
  stepImpacts,
  pickTarget,
  chokedFlowKgPerS,
  createLeakState,
  startLeak,
  fixLeak,
  leakO2KgPerGameHour,
  stepLeak,
} from '../src/systems/micrometeoroids.js';
import { createGauges, stepGauges, RATES } from '../src/systems/gauges.js';
import * as solarGames from '../src/instances/solar/minigames.js';
import * as leakGames from '../src/instances/leak/minigames.js';

test('hits: none in the grace period, then array or habitat', () => {
  const s = createImpactState();
  assert.equal(stepImpacts(s, GRACE_SECONDS * 0.9, { rand: () => 0 }), null); // rand 0 would always hit
  stepImpacts(s, GRACE_SECONDS * 0.2, { rand: () => 1 }); // past grace, lucky roll
  assert.equal(stepImpacts(s, 1, { rand: () => 0 }), 'habitat'); // 0 < HABITAT_SHARE → habitat
  assert.equal(pickTarget(() => 0.99), 'solar');
  assert.equal(pickTarget(() => MICROMETEOROIDS.HABITAT_SHARE - 0.01), 'habitat');
});

test('hits: never while something is still broken (never both at once)', () => {
  const s = createImpactState({ playSeconds: GRACE_SECONDS + 1 });
  assert.equal(stepImpacts(s, 100, { busy: true, rand: () => 0 }), null);
  assert.ok(stepImpacts(s, 1, { busy: false, rand: () => 0 }));
});

test('hits: test switch alternates array and habitat on a fixed timer', () => {
  const s = createImpactState();
  const opts = { everySeconds: 10, rand: () => 1 };
  assert.equal(stepImpacts(s, 9, opts), null);
  assert.equal(stepImpacts(s, 1, opts), 'solar');
  assert.equal(stepImpacts(s, 10, opts), 'habitat');
  assert.equal(stepImpacts(s, 10, { ...opts, busy: true }), null);
});

test('leak physics: choked flow through the hole matches the textbook formula', () => {
  // 1 cm² hole, 101.3 kPa, 293 K, Cd = 1 → ≈ 0.0239 kg/s (choked mass flux ≈ 239 kg/(s·m²))
  const area1cm = Math.sqrt(4e-4 / Math.PI) * 1000; // diameter in mm of a 1 cm² hole
  const mdot = chokedFlowKgPerS({ diameterMm: area1cm, cd: 1 });
  assert.ok(Math.abs(mdot - 0.0239) < 0.0003, `mdot ${mdot}`);
  // flow grows with the hole AREA: twice the diameter → four times the air
  assert.ok(Math.abs(chokedFlowKgPerS({ diameterMm: 1.4 }) / chokedFlowKgPerS({ diameterMm: 0.7 }) - 4) < 1e-9);
  // and with the cabin pressure
  assert.ok(Math.abs(chokedFlowKgPerS({ pressureKpa: 50.65 }) / chokedFlowKgPerS() - 0.5) < 1e-9);
});

test('leak: the game hole loses ≈ 0.2 kg air/h = about 1.2× breathing, so O₂ drains ≈ 2.2× faster', () => {
  assert.ok(Math.abs(LEAK.AIR_KG_PER_HOUR - chokedFlowKgPerS() * 3600) < 1e-9);
  assert.ok(LEAK.AIR_KG_PER_HOUR > 0.18 && LEAK.AIR_KG_PER_HOUR < 0.22);
  const breath = BVAD.O2_KG_PER_DAY_NOMINAL / 24;
  const ratio = (breath + LEAK.O2_KG_PER_GAME_HOUR) / breath;
  assert.ok(ratio > 2 && ratio < 2.5, `ratio ${ratio}`);
  // the gauges use it: inside with a leak drains faster than inside without
  const g1 = createGauges();
  const g2 = createGauges();
  const ctx = { pressurized: true, sunVisibility: 1, alignment: 1 };
  stepGauges(g1, 10, ctx);
  const r = stepGauges(g2, 10, { ...ctx, extraOxygenKgPerGameHour: LEAK.O2_KG_PER_GAME_HOUR });
  assert.ok(Math.abs(r.rates.oxygen / -RATES.oxygenInside - ratio) < 1e-6);
  assert.ok(g2.oxygen < g1.oxygen);
});

test('leak state: start, count the lost oxygen, fix', () => {
  const l = createLeakState();
  assert.equal(leakO2KgPerGameHour(l), 0);
  assert.equal(startLeak(l), true);
  assert.equal(startLeak(l), false);
  stepLeak(l, 10); // 10 real s = 1 game h
  assert.ok(Math.abs(l.o2LostKg - LEAK.O2_KG_PER_GAME_HOUR) < 1e-9);
  assert.equal(fixLeak(l), true);
  assert.equal(l.repairs, 1);
  assert.equal(fixLeak(l), false);
  const loaded = createLeakState(JSON.parse(JSON.stringify(l)));
  assert.deepEqual(loaded, l);
});

test('mini-game pickers: random but never the same game twice in a row', () => {
  for (const M of [solarGames, leakGames]) {
    for (const g of M.GAMES) {
      for (let i = 0; i < 20; i++) assert.notEqual(M.nextGame(g.id, () => i / 20), g.id);
    }
    assert.equal(M.GAMES.length, 3);
  }
});

test('Wire Fix: the electricity stops at the first wrong piece; turning pieces solves it', () => {
  const r = solarGames.createWireRound({ random: () => 0.3 });
  assert.ok(!solarGames.wireSolved(r));
  assert.ok(solarGames.flowReach(r) < r.pieces.length);
  // every piece's correct turn joins its neighbours: the path is continuous
  for (let i = 0; i < r.pieces.length; i++) {
    let k = 0;
    while (!solarGames.pieceOk(r.pieces[i]) && k++ < 4) solarGames.turnPiece(r, i);
    assert.ok(solarGames.pieceOk(r.pieces[i]));
  }
  assert.ok(solarGames.wireSolved(r));
  const p = r.pieces;
  for (let i = 1; i < p.length; i++) assert.equal(p[i].inSide, (p[i - 1].outSide + 2) % 4);
});

test('Hot Spot / Cell Swap: one cracked cell in each of N different rows', () => {
  const m = solarGames.pickCracked(5, 6, 3, () => 0.42);
  assert.equal(m.size, 3);
  for (const [r, c] of m) assert.ok(r >= 0 && r < 5 && c >= 0 && c < 6);
});

test('Leak Hunt: the detector reads more bars closer to the hole', () => {
  const d = [400, 300, 150, 80, 40, 20].map((x) => leakGames.detectorBars(x));
  for (let i = 1; i < d.length; i++) assert.ok(d[i] >= d[i - 1]);
  assert.equal(d[0], 0);
  assert.equal(d[d.length - 1], 5);
  assert.equal(leakGames.beepRate(0), 0);
  assert.ok(leakGames.beepRate(5) > leakGames.beepRate(1));
});

test('Hatch Hunt: closed hatches split the base; only the leaking part is found', () => {
  const r = leakGames.createHatchRound(() => 0.6); // 4 sections → leak in section 2
  assert.equal(r.leak, 2);
  assert.deepEqual(leakGames.groupsOf(r), [[0, 1, 2, 3]]);
  assert.ok(!leakGames.hatchFound(r));
  leakGames.toggleHatch(r, 1); // between lounge and work bay
  assert.deepEqual(leakGames.groupsOf(r), [[0, 1], [2, 3]]);
  assert.deepEqual(leakGames.leakingGroup(r), [2, 3]);
  leakGames.toggleHatch(r, 2);
  assert.deepEqual(leakGames.leakingGroup(r), [2]);
  assert.ok(leakGames.hatchFound(r));
});
