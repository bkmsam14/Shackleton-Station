import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FARMING } from '../src/config/gameplay.js';
import {
  createFarmState,
  plantSeed,
  addCover,
  addWater,
  growOvernight,
  nightsLeft,
  cutLeaf,
  serializeFarm,
  growthStage,
  STAGE,
} from '../src/farming/farmState.js';
import { countOf } from '../src/farming/inventory.js';

const fresh = () => createFarmState(['a', 'b']);

function growToReady(s, id) {
  assert.ok(plantSeed(s, id));
  addCover(s, id, FARMING.COVER_LOADS);
  addWater(s, id, FARMING.WATER_NEEDED);
  for (let n = 0; n < FARMING.GROW_NIGHTS; n++) growOvernight(s);
  assert.equal(s.pots[id].stage, STAGE.READY);
}

test('starts with seed potatoes and empty pots', () => {
  const s = fresh();
  assert.equal(countOf(s.inventory, 'potato'), FARMING.START_SEED_POTATOES);
  assert.equal(s.pots.a.stage, STAGE.EMPTY);
});

test('planting uses one seed potato; an occupied pot cannot be planted again', () => {
  const s = fresh();
  assert.ok(plantSeed(s, 'a'));
  assert.equal(countOf(s.inventory, 'potato'), FARMING.START_SEED_POTATOES - 1);
  assert.equal(plantSeed(s, 'a'), false);
  assert.equal(countOf(s.inventory, 'potato'), FARMING.START_SEED_POTATOES - 1);
});

test('no seed potatoes → nothing can be planted', () => {
  const s = createFarmState(['a'], { inventory: {} });
  assert.equal(plantSeed(s, 'a'), false);
  assert.equal(s.pots.a.stage, STAGE.EMPTY);
});

test('steps cannot be skipped: water before covering does nothing', () => {
  const s = fresh();
  plantSeed(s, 'a');
  assert.equal(addWater(s, 'a', 9999), false);
  assert.equal(s.pots.a.stage, STAGE.SEEDED);
  assert.equal(addCover(s, 'a', 1), FARMING.COVER_LOADS <= 1);
  addCover(s, 'a', FARMING.COVER_LOADS);
  assert.equal(s.pots.a.stage, STAGE.COVERED);
});

test('watering needs enough drops on the soil', () => {
  const s = fresh();
  plantSeed(s, 'a');
  addCover(s, 'a', FARMING.COVER_LOADS);
  assert.equal(addWater(s, 'a', FARMING.WATER_NEEDED - 1), false);
  assert.equal(s.pots.a.stage, STAGE.COVERED);
  assert.equal(addWater(s, 'a', 1), true);
  assert.equal(s.pots.a.stage, STAGE.GROWING);
});

test('a potato grows overnight: planted on day 1, ready on day 3; no light, no growth', () => {
  const s = fresh();
  plantSeed(s, 'a');
  addCover(s, 'a', FARMING.COVER_LOADS);
  addWater(s, 'a', FARMING.WATER_NEEDED);
  assert.equal(growthStage(s.pots.a), 0);
  assert.equal(nightsLeft(s.pots.a), 2);
  growOvernight(s, { lit: false }); // grow lights off too long: nothing grows tonight
  assert.equal(s.pots.a.growth, 0);
  growOvernight(s); // night 1 → day 2
  assert.equal(growthStage(s.pots.a), 1);
  assert.equal(nightsLeft(s.pots.a), 1);
  const ready = growOvernight(s); // night 2 → day 3
  assert.deepEqual(ready, ['a']);
  assert.equal(growthStage(s.pots.a), 3);
});

test('no harvesting before the plant is ready', () => {
  const s = fresh();
  plantSeed(s, 'a');
  assert.equal(cutLeaf(s, 'a').cut, false);
});

test('cutting the leaves harvests a potato, which can be planted again', () => {
  const s = createFarmState(['a'], { inventory: { potato: 1 } });
  growToReady(s, 'a');
  assert.equal(countOf(s.inventory, 'potato'), 0);
  for (let i = 1; i < FARMING.CUTS_TO_HARVEST; i++) {
    assert.equal(cutLeaf(s, 'a').harvested, false);
    assert.equal(countOf(s.inventory, 'potato'), i * FARMING.POTATOES_PER_STEM); // +1 every cut
  }
  const r = cutLeaf(s, 'a');
  assert.equal(r.harvested, true);
  assert.equal(countOf(s.inventory, 'potato'), FARMING.HARVEST_YIELD);
  assert.equal(s.pots.a.stage, STAGE.EMPTY);
  assert.ok(plantSeed(s, 'a')); // the harvested potato is the next seed potato
});

test('pots are independent', () => {
  const s = fresh();
  growToReady(s, 'a');
  assert.equal(s.pots.b.stage, STAGE.EMPTY);
  plantSeed(s, 'b');
  assert.equal(s.pots.a.stage, STAGE.READY);
  assert.equal(s.pots.b.stage, STAGE.SEEDED);
});

test('save → load keeps pots and inventory; bad saves fall back to empty pots', () => {
  const s = fresh();
  plantSeed(s, 'a');
  addCover(s, 'a', FARMING.COVER_LOADS);
  addWater(s, 'a', FARMING.WATER_NEEDED);
  growOvernight(s);
  const loaded = createFarmState(['a', 'b'], JSON.parse(JSON.stringify(serializeFarm(s))));
  assert.deepEqual(loaded.pots, s.pots);
  assert.deepEqual(loaded.inventory.items, s.inventory.items);
  const bad = createFarmState(['a'], { pots: { a: { stage: 'weird' } } });
  assert.equal(bad.pots.a.stage, STAGE.EMPTY);
});

// ---------------------------------------------------------------- eating
import { eatPotato, canEat } from '../src/farming/farmState.js';
import { createGauges, addFood, RATES } from '../src/systems/gauges.js';
import { BVAD, TIME } from '../src/config/gameplay.js';

test('one potato fills half the food gauge; the gauge holds one day of BVAD food', () => {
  const g = createGauges({ food: 0 });
  addFood(g, FARMING.FOOD_KG_PER_POTATO);
  assert.ok(Math.abs(g.food - 50) < 1e-9);
  // resting inside, a 12-hour shift uses half the gauge (12 of 24 hours of BVAD food)
  const drained = RATES.foodInside * ((12 * 3600) / TIME.SCALE);
  assert.ok(Math.abs(drained - 50) < 1e-9);
  assert.ok(Math.abs(BVAD.FOOD_KG_PER_DAY_DRY - FARMING.FOOD_KG_PER_POTATO * 2) < 1e-12);
});

test('eating can never overfill the food gauge', () => {
  const g = createGauges({ food: 99.5 });
  const eaten = addFood(g, FARMING.FOOD_KG_PER_POTATO);
  assert.equal(g.food, 100);
  assert.ok(eaten < FARMING.FOOD_KG_PER_POTATO);
});

test('eating uses a potato, but never the last seed when nothing is planted', () => {
  const s = createFarmState(['a'], { inventory: { potato: 2 } });
  assert.ok(eatPotato(s));
  assert.equal(countOf(s.inventory, 'potato'), 1);
  assert.deepEqual(canEat(s), { ok: false, reason: 'last-seed' });
  assert.equal(eatPotato(s), false);
  plantSeed(s, 'a');
  assert.deepEqual(canEat(s), { ok: false, reason: 'none' });
});

test('a harvest gives HARVEST_YIELD potatoes, so there are spares to eat', () => {
  const s = createFarmState(['a'], { inventory: { potato: 1 } });
  growToReady(s, 'a');
  for (let i = 0; i < FARMING.CUTS_TO_HARVEST; i++) cutLeaf(s, 'a');
  assert.equal(countOf(s.inventory, 'potato'), FARMING.HARVEST_YIELD);
  assert.ok(canEat(s).ok);
});
