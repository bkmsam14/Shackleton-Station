// Lettuce + radish: planting, harvesting, eating order, starting seeds and food values.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FARMING, FOOD, SOLAR_DAMAGE } from '../src/config/gameplay.js';
import { createFarmState, plantSeed, addCover, addWater, stepGrowth, cutLeaf, nextFood, serializeFarm, STAGE } from '../src/farming/farmState.js';
import { countOf } from '../src/farming/inventory.js';

function grow(s, id, crop) {
  assert.ok(plantSeed(s, id, crop));
  const c = FARMING.GREENS[crop];
  assert.ok(addCover(s, id, c.coverLoads)); // seeds go shallow: one handful
  assert.ok(addWater(s, id, c.waterNeeded));
  stepGrowth(s, c.growSeconds + 1);
  assert.equal(s.pots[id].stage, STAGE.READY);
}

test('a new game starts with seed potatoes, lettuce + radish seeds and one spare repair kit', () => {
  const s = createFarmState(['a']);
  assert.equal(countOf(s.inventory, 'potato'), FARMING.START_SEED_POTATOES);
  assert.equal(countOf(s.inventory, 'lettuce-seed'), FARMING.START_SEEDS.lettuce);
  assert.equal(countOf(s.inventory, 'radish-seed'), FARMING.START_SEEDS.radish);
  assert.equal(countOf(s.inventory, 'solar-repair-kit'), SOLAR_DAMAGE.START_KITS);
});

test('an old save (before greens) gets the starting seeds once', () => {
  const old = createFarmState(['a'], { inventory: { potato: 2 } });
  assert.equal(countOf(old.inventory, 'lettuce-seed'), FARMING.START_SEEDS.lettuce);
  const again = createFarmState(['a'], JSON.parse(JSON.stringify(serializeFarm(old))));
  assert.equal(countOf(again.inventory, 'lettuce-seed'), FARMING.START_SEEDS.lettuce); // not twice
});

test('lettuce: one cut harvests the whole head; radish: three cuts, one radish each', () => {
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

test('food values follow real calories: potato ≫ lettuce head > one radish', () => {
  const pct = (id) => (FARMING.FOOD_KG_PER_ITEM[id] / FOOD.CAPACITY_KG) * 100;
  assert.ok(pct('potato') > pct('lettuce') && pct('lettuce') > pct('radish'));
  // same game harvest mass per pot → energy ratio = USDA kcal ratio (17 : 77)
  const lettucePot = FARMING.FOOD_KG_PER_ITEM.lettuce * 1;
  const potatoPot = FARMING.FOOD_KG_PER_POTATO * (FARMING.HARVEST_YIELD - 1);
  assert.ok(Math.abs(lettucePot / potatoPot - 17 / 77) < 1e-9);
});
