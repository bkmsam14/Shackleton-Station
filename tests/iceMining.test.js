import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ICE, SUPPLY, POWER } from '../src/config/gameplay.js';
import { createGauges } from '../src/systems/gauges.js';
import {
  createIceState,
  waterFromSoil,
  moonFeelsLikeKg,
  checkDig,
  finishDig,
  scoreDrill,
  ovenCost,
  checkOven,
  loadOven,
  stepOven,
  spillBag,
  coldTrapLoadKw,
} from '../src/systems/iceMining.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test('water is the real LCROSS share of the soil (5.6 %)', () => {
  near(waterFromSoil(100), 5.6);
  near(waterFromSoil(ICE.BAG_MAX_KG), ICE.BAG_MAX_KG * 0.056);
});

test('a full bag feels about 1/6 as heavy on the Moon', () => {
  const feels = moonFeelsLikeKg(60);
  assert.ok(feels > 9 && feels < 11, String(feels));
});

test('digging fills the bag up to its limit and rests the spot for a day', () => {
  const s = createIceState();
  assert.equal(checkDig(s, 'ice-spot-1', 0).ok, true);
  const r = finishDig(s, 'ice-spot-1', 0, 6);
  assert.equal(r.soilKg, 6 * ICE.SOIL_KG_PER_CHUNK);
  assert.equal(checkDig(s, 'ice-spot-1', 1).reason, 'resting');
  assert.equal(checkDig(s, 'ice-spot-1', ICE.SPOT_COOLDOWN_GAME_HOURS).ok, true);
  finishDig(s, 'ice-spot-2', 0, 999);
  assert.equal(s.bagKg, ICE.BAG_MAX_KG);
  assert.equal(checkDig(s, 'ice-spot-3', 0).reason, 'bag-full');
});

test('a round with no chunks does not use up the spot', () => {
  const s = createIceState();
  finishDig(s, 'ice-spot-1', 0, 0);
  assert.equal(checkDig(s, 'ice-spot-1', 0).ok, true);
});

test('stars: finish, good digging, quiz', () => {
  assert.equal(scoreDrill({ chunks: 2 }), 1);
  assert.equal(scoreDrill({ chunks: ICE.STAR_CHUNKS, bumps: 1 }), 2);
  assert.equal(scoreDrill({ chunks: ICE.STAR_CHUNKS, bumps: 1, quizCorrect: true }), 3);
  assert.equal(scoreDrill({ chunks: ICE.STAR_CHUNKS, bumps: ICE.STAR_CHUNKS }), 1);
});

test('the oven costs power, takes time, and fills the tank with the real share', () => {
  const g = createGauges();
  const s = createIceState({ bagKg: 50 });
  const station = { tankKg: 2, wallKg: 0 };
  const before = g.batteryKwh;
  const c = loadOven(s, g);
  near(before - g.batteryKwh, c.kwh);
  assert.ok(c.kwh > 0);
  assert.equal(s.bagKg, 0);
  assert.equal(checkOven(createIceState({ bagKg: 5, oven: s.oven }), g).reason, 'busy');
  const half = stepOven(s, station, ICE.OVEN_GAME_HOURS / 2);
  near(half.addedKg, waterFromSoil(50) / 2);
  const end = stepOven(s, station, ICE.OVEN_GAME_HOURS);
  assert.equal(end.finished, true);
  near(station.tankKg, 2 + waterFromSoil(50));
  assert.equal(s.oven, null);
});

test('the oven never overfills the tank; the rest waits', () => {
  const s = createIceState({ bagKg: 60 });
  const station = { tankKg: SUPPLY.WATER_TANK_MAX_KG - 1, wallKg: 0 };
  loadOven(s, createGauges());
  const r = stepOven(s, station, ICE.OVEN_GAME_HOURS);
  near(r.addedKg, 1);
  assert.equal(r.finished, false);
  assert.equal(r.waitingForSpace, true);
  station.tankKg = 0; // used for oxygen
  assert.equal(stepOven(s, station, 0.1).finished, true);
});

test('oven reasons: no soil, low power', () => {
  assert.equal(checkOven(createIceState(), createGauges()).reason, 'no-soil');
  assert.equal(checkOven(createIceState({ bagKg: 60 }), createGauges({ batteryKwh: POWER.BATTERY_CAPACITY_KWH * 0.05 })).reason, 'power');
  assert.ok(ovenCost(60).realSecondsInGame > 0);
});

test('gentle failure spills half the bag; the cold trap costs base power', () => {
  const s = createIceState({ bagKg: 40 });
  near(spillBag(s), 40 * (1 - ICE.FAIL_KEEP_FRACTION));
  near(s.bagKg, 40 * ICE.FAIL_KEEP_FRACTION);
  assert.ok(coldTrapLoadKw(true) > 0);
  assert.equal(coldTrapLoadKw(false), 0);
});
