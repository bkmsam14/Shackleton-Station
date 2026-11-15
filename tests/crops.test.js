// Lettuce + radish: planting, harvesting, eating order, starting seeds and food values.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FARMING, FOOD, SOLAR_DAMAGE } from '../src/config/gameplay.js';
import { createFarmState, plantSeed, addCover, addWater, growOvernight, cutLeaf, nextFood, serializeFarm, STAGE } from '../src/farming/farmState.js';
import { countOf } from '../src/farming/inventory.js';

function grow(s, id, crop) {
  assert.ok(plantSeed(s, id, crop));
  const c = FARMING.GREENS[crop];
  assert.ok(addCover(s, id, c.coverLoads)); // seeds go shallow: one handful
  assert.ok(addWater(s, id, c.waterNeeded));
  for (let n = 0; n < c.growNights; n++) growOvernight(s); // greens: ready the next morning
  assert.equal(s.pots[id].stage, STAGE.READY);
}

test('a new game starts with seed potatoes, lettuce + radish seeds, space meals and one spare repair kit', () => {
  const s = createFarmState(['a']);
  assert.equal(countOf(s.inventory, 'potato'), FARMING.START_SEED_POTATOES);
  assert.equal(countOf(s.inventory, 'lettuce-seed'), FARMING.START_SEEDS.lettuce);
  assert.equal(countOf(s.inventory, 'radish-seed'), FARMING.START_SEEDS.radish);
  assert.equal(countOf(s.inventory, 'solar-repair-kit'), SOLAR_DAMAGE.START_KITS);
  assert.equal(countOf(s.inventory, 'space-meal'), FARMING.START_SPACE_MEALS);
});

test('an old save (before greens) gets the starting seeds once', () => {
  const old = createFarmState(['a'], { inventory: { potato: 2 } });
  assert.equal(countOf(old.inventory, 'lettuce-seed'), FARMING.START_SEEDS.lettuce);
  const again = createFarmState(['a'], JSON.parse(JSON.stringify(serializeFarm(old))));
  assert.equal(countOf(again.inventory, 'lettuce-seed'), FARMING.START_SEEDS.lettuce); // not twice
});

test('lettuce: one cut harvests the whole head; radish: three cuts, a handful each', () => {
  const s = createFarmState(['a', 'b']);
  grow(s, 'a', 'lettuce');
  const r = cutLeaf(s, 'a');
  assert.ok(r.harvested);
  assert.equal(countOf(s.inventory, 'lettuce'), 1);
  grow(s, 'b', 'radish');
  assert.equal(cutLeaf(s, 'b').harvested, false);
  cutLeaf(s, 'b');
  assert.ok(cutLeaf(s, 'b').harvested);
  assert.equal(countOf(s.inventory, 'radish'), 3);
  assert.equal(countOf(s.inventory, 'radish-seed'), FARMING.START_SEEDS.radish - 1); // greens are not replanted from the harvest
});

test('F eats fresh greens first, then potatoes (and never the last seed potato)', () => {
  const s = createFarmState(['a'], { v: 2, inventory: { potato: 1, radish: 1 } });
  assert.equal(nextFood(s), 'radish');
  s.inventory.items.radish = 0;
  assert.equal(nextFood(s), null); // last potato, nothing planted: keep it
  s.inventory.items.potato = 2;
  assert.equal(nextFood(s), 'potato');
});

test('F picks the biggest food that fits without waste (potato 50 %, space meal 33 %)', () => {
  const s = createFarmState(['a'], { v: 2, inventory: { potato: 3, 'space-meal': 2 } });
  const opts = { foodKg: FARMING.FOOD_KG_PER_ITEM };
  const room = (pct) => (pct / 100) * FOOD.CAPACITY_KG;
  assert.equal(nextFood(s, { ...opts, spaceKg: room(60) }), 'potato'); // 50 % fits
  assert.equal(nextFood(s, { ...opts, spaceKg: room(40) }), 'space-meal'); // only 33 % fits
  assert.equal(nextFood(s, { ...opts, spaceKg: room(10) }), 'space-meal'); // nothing fits: the smaller one
});

test('food values: potato = half the gauge (owner), space meal = a third of a day, greens honest from USDA kcal', () => {
  const pct = (id) => (FARMING.FOOD_KG_PER_ITEM[id] / FOOD.CAPACITY_KG) * 100;
  assert.ok(Math.abs(pct('potato') - 50) < 1e-9);
  assert.ok(Math.abs(pct('space-meal') - 100 / 3) < 1e-9);
  assert.ok(pct('potato') > pct('lettuce') && pct('lettuce') > pct('radish'));
  // a lettuce head's energy is its real mass × USDA kcal (mostly water → little energy)
  const kcal = FARMING.FOOD_KG_PER_ITEM.lettuce / FARMING.FOOD_KG_PER_KCAL;
  assert.ok(Math.abs(kcal - FARMING.GREENS.lettuce.itemKg * 10 * FARMING.KCAL_PER_100G.lettuce) < 1e-6);
  assert.ok(pct('lettuce') < 5); // NOT 25 %: that would need about 2 kg of lettuce
  // one game potato ≈ 2 kg of real potatoes (a whole plant's crop)
  assert.ok(FARMING.POTATO_FRESH_KG > 1.8 && FARMING.POTATO_FRESH_KG < 2.2);
});
