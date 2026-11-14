import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SUPPLY, SOLAR_DAMAGE, POWER, TIME } from '../src/config/gameplay.js';
import { oneWayDelaySeconds, roundTripDelaySeconds } from '../src/supply/commDelay.js';
import {
  createSupplyState,
  serializeSupply,
  placeOrder,
  validateOrder,
  stepOrders,
  estimateSeconds,
  secondsUntilArrival,
  gameHoursToPlaySeconds,
  freeSlot,
  crates,
} from '../src/supply/orders.js';
import { collectFromCrate, unitsThatFit } from '../src/supply/delivery.js';
import { createSolarDamageState, stepSolarDamage, solarOutputFactor, repairSolar } from '../src/supply/solarDamage.js';
import { CATALOG } from '../src/supply/catalog.js';
import { createInventory, countOf } from '../src/farming/inventory.js';

const targets = () => ({
  inventory: createInventory({ potato: 1 }),
  station: { tankKg: 10 },
  gauges: { batteryKwh: 40 },
});
/** run the clock in small steps until the order reaches `stage` (or give up) */
function runUntil(state, order, stage, max = 10000) {
  const events = [];
  for (let t = 0; t < max && order.stage !== stage; t += 0.25) events.push(...stepOrders(state, 0.25));
  return events;
}

test('light delay: distance ÷ speed of light ≈ 1.28 s one way, 2.56 s round trip (Earth–Moon)', () => {
  assert.ok(Math.abs(oneWayDelaySeconds() - 384400 / 299792.458) < 1e-12);
  assert.ok(Math.abs(oneWayDelaySeconds() - 1.2822) < 0.001);
  assert.ok(Math.abs(roundTripDelaySeconds() - 2 * oneWayDelaySeconds()) < 1e-12);
  // configurable distance: Mars at its closest (~54.6 million km) would be ~3 minutes
  assert.ok(Math.abs(oneWayDelaySeconds(54.6e6) - 182.1) < 0.5);
});

test('orders: validation (empty, per-item max, cargo mass limit)', () => {
  assert.equal(validateOrder({}).reason, 'empty');
  assert.equal(validateOrder({ 'solar-repair-kit': CATALOG['solar-repair-kit'].maxPerOrder + 1 }).reason, 'too-many');
  const heavy = { 'battery-pack': 1, water: 3, 'solar-repair-kit': 2 };
  const kg = 45 + 30 + 16;
  assert.equal(validateOrder(heavy).massKg, kg);
  assert.equal(validateOrder(heavy).ok, kg <= SUPPLY.CARGO_CAPACITY_KG);
  assert.equal(placeOrder(createSupplyState(), {}), null);
});

test('confirm never makes the crate appear at once: light delay, review, reply, prepare, flight, landing', () => {
  const s = createSupplyState();
  const o = placeOrder(s, { 'solar-repair-kit': 1, water: 2 });
  assert.equal(o.id, 'SR-001');
  assert.equal(o.stage, 'transmitting');
  stepOrders(s, oneWayDelaySeconds() * 0.9);
  assert.equal(o.stage, 'transmitting'); // still on its way to Earth
  const types = runUntil(s, o, 'arrived').map((e) => e.type);
  assert.deepEqual(types, ['sent', 'approved', 'dispatched', 'landing', 'arrived']);
  assert.deepEqual(o.crate, { 'solar-repair-kit': 1, water: 2 });
});

test('timing: confirmation needs the round trip; cargo takes extra time after it', () => {
  const s = createSupplyState();
  const o = placeOrder(s, { 'seed-potatoes': 1 });
  const review = gameHoursToPlaySeconds(SUPPLY.REVIEW_GAME_HOURS);
  stepOrders(s, oneWayDelaySeconds() + review + oneWayDelaySeconds() - 0.01);
  assert.equal(o.stage, 'replying'); // approval not back yet
  stepOrders(s, 0.02);
  assert.equal(o.stage, 'preparing'); // approved
  assert.ok(secondsUntilArrival(o) > gameHoursToPlaySeconds(CATALOG['seed-potatoes'].deliveryGameHours));
  const est = estimateSeconds(o.items);
  assert.ok(est > 2 * oneWayDelaySeconds() + gameHoursToPlaySeconds(CATALOG['seed-potatoes'].deliveryGameHours));
});

test('one big time step can pass several stages; the slowest item sets the flight time', () => {
  const s = createSupplyState();
  const o = placeOrder(s, { 'seed-potatoes': 1, 'battery-pack': 1 });
  stepOrders(s, estimateSeconds(o.items) + 1);
  assert.equal(o.stage, 'arrived');
});

test('multiple orders at different stages; each crate gets its own pad spot', () => {
  const s = createSupplyState();
  const a = placeOrder(s, { water: 1 });
  stepOrders(s, 3);
  const b = placeOrder(s, { 'seed-potatoes': 1 });
  assert.notEqual(a.stage, b.stage);
  runUntil(s, a, 'arrived');
  runUntil(s, b, 'arrived');
  assert.notEqual(a.slot, b.slot);
  assert.equal(crates(s).length, 2);
});

test('a full pad makes the cargo wait in orbit, then it lands when a spot frees', () => {
  const s = createSupplyState();
  const all = [];
  for (let i = 0; i <= SUPPLY.PAD_SLOTS; i++) all.push(placeOrder(s, { 'seed-potatoes': 1 }));
  stepOrders(s, estimateSeconds({ 'seed-potatoes': 1 }) + 5);
  const holding = all.filter((o) => o.stage === 'holding');
  assert.equal(holding.length, 1);
  assert.equal(freeSlot(s), null);
  const first = all.find((o) => o.stage === 'arrived');
  collectFromCrate(s, first, { 'seed-potatoes': 1 }, targets());
  assert.equal(first.stage, 'collected');
  stepOrders(s, 0.1);
  assert.equal(holding[0].stage, 'landing');
  assert.equal(holding[0].slot, 0);
});

test('collecting moves each unit once into the existing inventory / tank / battery', () => {
  const s = createSupplyState();
  const o = placeOrder(s, { 'solar-repair-kit': 2, 'seed-potatoes': 1, water: 1 });
  const p = placeOrder(s, { 'battery-pack': 1 }); // a battery pack is heavy: its own delivery
  assert.ok(o && p);
  runUntil(s, o, 'arrived');
  runUntil(s, p, 'arrived');
  const t = targets();
  const r = collectFromCrate(s, o, { 'solar-repair-kit': 2, 'seed-potatoes': 1, water: 1 }, t);
  collectFromCrate(s, p, { 'battery-pack': 1 }, t);
  assert.equal(countOf(t.inventory, 'solar-repair-kit'), 2);
  assert.equal(countOf(t.inventory, 'potato'), 1 + SUPPLY.ITEMS['seed-potatoes'].potatoes);
  assert.equal(t.station.tankKg, 10 + SUPPLY.ITEMS.water.waterKg);
  assert.equal(t.gauges.batteryKwh, 40 + SUPPLY.ITEMS['battery-pack'].kwh);
  assert.equal(o.stage, 'collected');
  assert.equal(p.stage, 'collected');
  // collecting again gives nothing (no duplicates)
  assert.deepEqual(collectFromCrate(s, o, { 'solar-repair-kit': 2 }, t).moved, {});
  assert.equal(countOf(t.inventory, 'solar-repair-kit'), 2);
  assert.deepEqual(r.kept, {});
});

test('partial collect: unselected items and things that do not fit stay in the crate', () => {
  const s = createSupplyState();
  const o = placeOrder(s, { water: 3, 'seed-potatoes': 1 });
  runUntil(s, o, 'arrived');
  const t = targets();
  t.station.tankKg = SUPPLY.WATER_TANK_MAX_KG - SUPPLY.ITEMS.water.waterKg; // room for one container
  assert.equal(unitsThatFit('water', 3, t), 1);
  t.gauges.batteryKwh = POWER.BATTERY_CAPACITY_KWH - 1; // battery nearly full
  assert.equal(unitsThatFit('battery-pack', 1, t), 0);
  const r = collectFromCrate(s, o, { water: 3, 'seed-potatoes': 0 }, t);
  assert.deepEqual(r.moved, { water: 1 });
  assert.deepEqual(r.kept, { water: { units: 2, reason: 'full' }, 'seed-potatoes': { units: 1, reason: 'not-selected' } });
  assert.equal(o.stage, 'arrived'); // still on the pad with the rest
});

test('save → load keeps orders, timers and crates without duplicating them', () => {
  const s = createSupplyState();
  const a = placeOrder(s, { water: 1 });
  const b = placeOrder(s, { 'seed-potatoes': 2 });
  runUntil(s, a, 'arrived');
  const bStage = b.stage;
  const loaded = createSupplyState(JSON.parse(JSON.stringify(serializeSupply(s))));
  assert.equal(loaded.orders.length, 2);
  assert.equal(loaded.nextId, 3);
  assert.deepEqual(loaded.orders[0].crate, { water: 1 });
  assert.equal(loaded.orders[1].stage, bStage);
  assert.equal(placeOrder(loaded, { water: 1 }).id, 'SR-003'); // ids stay unique
});

test('solar damage: no hits during the grace period, then random hits; healthy array unchanged', () => {
  const d = createSolarDamageState();
  assert.equal(solarOutputFactor(d), 1);
  const grace = (SOLAR_DAMAGE.GRACE_GAME_HOURS * 3600) / TIME.SCALE;
  assert.equal(stepSolarDamage(d, grace * 0.9, () => 0), null); // rand 0 would always hit
  stepSolarDamage(d, grace * 0.2, () => 1); // past grace, unlucky roll never hits
  assert.equal(d.damaged, false);
  assert.equal(stepSolarDamage(d, 1, () => 0), 'hit');
  assert.equal(solarOutputFactor(d), SOLAR_DAMAGE.DAMAGED_OUTPUT);
  assert.equal(stepSolarDamage(d, 1, () => 0), null); // already damaged
});

test('repair needs a kit and only uses it when the repair happens', () => {
  const inv = createInventory({});
  const d = createSolarDamageState({ damaged: false });
  inv.items['solar-repair-kit'] = 1;
  assert.deepEqual(repairSolar(d, inv), { ok: false, reason: 'not-damaged' });
  assert.equal(countOf(inv, 'solar-repair-kit'), 1); // healthy array: kit kept
  d.damaged = true;
  const none = createInventory({});
  assert.deepEqual(repairSolar(d, none), { ok: false, reason: 'no-kit' });
  assert.equal(d.damaged, true);
  assert.deepEqual(repairSolar(d, inv), { ok: true, reason: null });
  assert.equal(countOf(inv, 'solar-repair-kit'), 0);
  assert.equal(solarOutputFactor(d), 1);
});

test('test switch: a hit exactly every N seconds while healthy, counting again after a repair', () => {
  const d = createSolarDamageState();
  const every = { everySeconds: 60 };
  assert.equal(stepSolarDamage(d, 59, () => 1, every), null); // no randomness, no grace
  assert.equal(stepSolarDamage(d, 1, () => 1, every), 'hit');
  assert.equal(stepSolarDamage(d, 120, () => 1, every), null); // already damaged: the timer waits
  const inv = createInventory({ 'solar-repair-kit': 1 });
  assert.ok(repairSolar(d, inv).ok);
  assert.equal(stepSolarDamage(d, 30, () => 1, every), null);
  assert.equal(stepSolarDamage(d, 30, () => 1, every), 'hit'); // 60 s after the repair
});
