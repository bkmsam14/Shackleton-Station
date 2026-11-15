// balanceSim.js — plays "bots" through the game's real rules to check the GAME BALANCE.
// PURE LOGIC (no Three.js, no DOM). Used by scripts/balance-sim.mjs and tests/balance.test.js;
// the game itself never imports it.
//
// It reuses the real systems (gauges, day cycle, electrolysis, ice oven, solar damage, radiation),
// so the numbers here can't drift away from what the game does. Simplifications (said honestly):
//  - mini-games, pot tending and repairs pause the world in the game, so here they take no time;
//  - the solar array always faces the Sun (it tracks it); micrometeoroid hits are random (seeded):
//    each one cracks the array OR opens a habitat air leak (never both at once), like the game;
//  - a bot that repairs patches a leak the next time it is inside (the repair's hour is not simulated);
//  - storms are checked separately with stormTable() (dose per storm, per place).
//
// Balance targets (docs/SCIENCE.md "Game balance"), for one 20-min lunar day:
//  idle    — does nothing: first failure after 5–8 real min;
//  sloppy  — reacts late, half-uses the farm, grow lights always on: survives ≥ 18 min;
//  skilled — keeps every loop going: no failure, ends with a surplus.
import { TIME, FOOD, FARMING, SUPPLY, ICE, RECOVERY, SKY, POWER, SOLAR_DAMAGE } from '../config/gameplay.js';
import { createGauges, stepGauges, addFood, applyRecovery, powerPercent } from './gauges.js';
import { createDayCycle, stepDayCycle, skipGameHours, getSun } from './daycycle.js';
import { createElectrolysisState, checkAfford, applyBatch } from './electrolysis.js';
import { createIceState, loadOven, stepOven, checkOven } from './iceMining.js';
import { expectedStormDose } from './radiation.js';
import { createSolarDamageState, damageSolar, solarOutputFactor } from '../supply/solarDamage.js';
import { createImpactState, stepImpacts, createLeakState, startLeak, fixLeak, leakO2KgPerGameHour } from './micrometeoroids.js';

const realSecondsForGameHours = (h) => (h * 3600) / TIME.SCALE;
const orderSeconds = (item) =>
  realSecondsForGameHours(SUPPLY.REVIEW_GAME_HOURS + SUPPLY.PREPARE_GAME_HOURS + SUPPLY.ITEMS[item].deliveryGameHours);

/** Small seeded random generator (mulberry32), so runs can be repeated. */
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How each crop grows and what one harvest gives (from gameplay.js, like farmState.js). */
const CROP = {
  potato: { grow: FARMING.GROW_REAL_SECONDS, items: FARMING.HARVEST_YIELD, seed: 'potato' },
  ...Object.fromEntries(
    Object.entries(FARMING.GREENS).map(([id, c]) => [id, { grow: c.growSeconds, items: c.cuts * c.perCut, seed: `${id}-seed` }]),
  ),
};

/**
 * What each bot does. All fields are behaviour, not game numbers.
 *  outsideShare  fraction of time spent outside (in blocks of `blockSeconds`)
 *  makeO2At      make oxygen when the gauge is below this (%), batch size `batch`
 *  eatAt         eat when food is below this (%)
 *  pots          what it plants in each pot it uses (falls back to any crop it has seeds for)
 *  lightsOffAtNight  switch the grow lights off while the Sun is hidden
 *  seedsAt       order seed packets when greens seeds drop below this (-1 = never)
 *  mineIceAt     fetch a bag of icy soil when the tank is below this (kg)
 *  wallKg        water kept in the shelter walls (taken from the tank at the start)
 *  spareKit      reorder a repair kit right after using one (else only when it's needed)
 *  repairs       repairs the array and patches habitat leaks at all
 */
export const BOTS = {
  idle: { outsideShare: 0, makeO2At: -1, eatAt: -1, pots: [], lightsOffAtNight: false, seedsAt: -1, mineIceAt: -1, wallKg: 0, spareKit: false, repairs: false },
  sloppy: {
    outsideShare: 0.4,
    makeO2At: 25,
    batch: 'medium',
    eatAt: 25,
    pots: ['potato', 'lettuce', 'radish'],
    lightsOffAtNight: false,
    seedsAt: 0,
    mineIceAt: -1,
    wallKg: 0,
    spareKit: false,
    repairs: true,
  },
  skilled: {
    outsideShare: 0.3,
    makeO2At: 60,
    batch: 'medium',
    eatAt: 70,
    pots: ['potato', 'potato', 'potato', 'radish'],
    lightsOffAtNight: true,
    seedsAt: 3,
    mineIceAt: 3,
    wallKg: 2,
    spareKit: true,
    repairs: true,
  },
};

/** Run one bot for `seconds` real seconds (1 s steps). Returns a report. */
export function simulate(bot, { seconds = SKY.GAME_SUN_LOOP_REAL_SECONDS, blockSeconds = 100, seed = 1, damage = true } = {}) {
  const rand = seededRandom(seed);
  const g = createGauges();
  const day = createDayCycle();
  const station = createElectrolysisState();
  const ice = createIceState();
  const solar = createSolarDamageState();
  const impacts = createImpactState();
  const leak = createLeakState();

  const wallKg = Math.min(bot.wallKg, station.tankKg);
  station.tankKg -= wallKg;
  station.wallKg = wallKg;

  const inv = {
    potato: FARMING.START_SEED_POTATOES,
    'lettuce-seed': FARMING.START_SEEDS.lettuce,
    'radish-seed': FARMING.START_SEEDS.radish,
    lettuce: 0,
    radish: 0,
    kits: SOLAR_DAMAGE.START_KITS,
  };
  const pots = bot.pots.map((want) => ({ want, crop: null, growth: 0 }));
  const orders = []; // { at, item }
  const ordered = (item) => orders.some((o) => o.item === item);
  const failures = [];
  let blackoutSeconds = 0;
  let damagedSeconds = 0;
  let hits = 0;
  let leakHits = 0;
  let leakSeconds = 0;
  let o2Made = 0;
  let iceBags = 0;
  let eaten = { potato: 0, lettuce: 0, radish: 0 };
  const lowest = { oxygen: 100, food: 100, power: 100, tankKg: station.tankKg };

  const plant = (pot) => {
    const order = [pot.want, ...Object.keys(CROP).filter((c) => c !== pot.want)];
    for (const c of order) {
      if ((inv[CROP[c].seed] ?? 0) > 0) {
        inv[CROP[c].seed]--;
        pot.crop = c;
        pot.growth = 0;
        return;
      }
    }
    pot.crop = null;
  };
  pots.forEach(plant);

  for (let t = 0; t < seconds; t++) {
    const sun = getSun(day);
    const sunUp = sun.visibility > 0.5;
    const lightsOn = !(bot.lightsOffAtNight && !sunUp);
    const outside = t % blockSeconds < bot.outsideShare * blockSeconds;
    const hit = damage ? stepImpacts(impacts, 1, { busy: solar.damaged || leak.leaking, rand }) : null;
    if (hit === 'solar') damageSolar(solar);
    else if (hit === 'habitat') startLeak(leak);
    if (hit) hits++;
    if (hit === 'habitat') leakHits++;
    if (solar.damaged) damagedSeconds++;
    if (leak.leaking) leakSeconds++;
    const r = stepGauges(g, 1, {
      pressurized: !outside,
      sunVisibility: sun.visibility,
      alignment: solarOutputFactor(solar),
      growLightsOn: lightsOn,
      extraOxygenKgPerGameHour: leakO2KgPerGameHour(leak),
    });
    stepDayCycle(day, 1);
    if (!r.hasPower) blackoutSeconds++;

    // deliveries
    for (let i = orders.length - 1; i >= 0; i--) {
      if (t < orders[i].at) continue;
      const item = orders[i].item;
      if (item === 'solar-repair-kit') inv.kits += 1;
      else inv[SUPPLY.ITEMS[item] && item.replace('-seeds', '-seed')] += SUPPLY.ITEMS[item].seeds;
      orders.splice(i, 1);
    }

    // farm: plants grow only with light; a harvest is collected and the pot replanted at once
    for (const pot of pots) {
      if (!pot.crop) {
        if (!outside) plant(pot);
        continue;
      }
      if (lightsOn && r.hasPower) pot.growth += 1;
      if (pot.growth >= CROP[pot.crop].grow && !outside) {
        inv[pot.crop] += CROP[pot.crop].items;
        plant(pot);
      }
    }

    if (ice.oven && g.batteryKwh > 0.01) stepOven(ice, station, TIME.GAME_HOURS_PER_REAL_SECOND);

    if (outside) {
      // repair on the way past the array
      if (bot.repairs && solar.damaged && inv.kits > 0) {
        inv.kits--;
        solar.damaged = false;
        if (bot.spareKit && !ordered('solar-repair-kit')) orders.push({ at: t + orderSeconds('solar-repair-kit'), item: 'solar-repair-kit' });
      }
    } else {
      if (bot.repairs && leak.leaking) fixLeak(leak); // patch the hole at the life-support rack
      while (g.oxygen < bot.makeO2At && checkAfford(g, station, bot.batch).ok) {
        applyBatch(g, station, bot.batch);
        o2Made += 1;
      }
      // food: fresh greens first, then potatoes (keeping one to plant if a potato pot is empty)
      const eat = (id) => {
        addFood(g, FARMING.FOOD_KG_PER_ITEM[id]);
        inv[id]--;
        eaten[id]++;
      };
      while (g.food < bot.eatAt) {
        if (inv.lettuce > 0) eat('lettuce');
        else if (inv.radish > 0) eat('radish');
        else if (inv.potato > 1) eat('potato');
        else break;
      }
      // orders from the supply terminal
      if (bot.repairs && solar.damaged && inv.kits === 0 && !ordered('solar-repair-kit')) {
        orders.push({ at: t + orderSeconds('solar-repair-kit'), item: 'solar-repair-kit' });
      }
      for (const c of ['lettuce', 'radish']) {
        if (bot.seedsAt >= 0 && inv[`${c}-seed`] <= bot.seedsAt && !ordered(`${c}-seeds`)) {
          orders.push({ at: t + orderSeconds(`${c}-seeds`), item: `${c}-seeds` });
        }
      }
      // water: one bag of icy soil (dug on the next trip outside), baked in the oven
      if (station.tankKg < bot.mineIceAt && !ice.oven) {
        ice.bagKg = ICE.BAG_MAX_KG;
        if (checkOven(ice, g).ok) {
          loadOven(ice, g);
          iceBags++;
        } else {
          ice.bagKg = 0;
        }
      }
    }

    lowest.oxygen = Math.min(lowest.oxygen, g.oxygen);
    lowest.food = Math.min(lowest.food, g.food);
    lowest.power = Math.min(lowest.power, powerPercent(g));
    lowest.tankKg = Math.min(lowest.tankKg, station.tankKg);

    if (r.oxygenEmpty || r.foodEmpty) {
      failures.push({ t, cause: r.oxygenEmpty ? 'oxygen' : 'food' });
      applyRecovery(g, { oxygen: RECOVERY.OXYGEN_RESTORE_PERCENT, food: RECOVERY.FOOD_RESTORE_PERCENT });
      t += Math.round(skipGameHours(day, RECOVERY.REST_GAME_HOURS));
    }
  }

  return {
    seed,
    failures,
    firstFailure: failures[0] ?? null,
    blackoutSeconds,
    damagedSeconds,
    hits,
    leakHits,
    leakSeconds,
    o2Made,
    iceBags,
    eaten,
    lowest,
    end: { oxygen: g.oxygen, food: g.food, power: powerPercent(g), tankKg: station.tankKg, potatoes: inv.potato, kits: inv.kits },
  };
}

/** Run a bot over many random seeds (micrometeorite luck). */
export function simulateMany(bot, runs = 200, opts = {}) {
  const results = Array.from({ length: runs }, (_, i) => simulate(bot, { ...opts, seed: i + 1 }));
  const firsts = results.map((r) => (r.firstFailure ? r.firstFailure.t : Infinity));
  return {
    results,
    runs,
    earliestFailure: Math.min(...firsts),
    failedRuns: results.filter((r) => r.failures.length).length,
    worstBlackout: Math.max(...results.map((r) => r.blackoutSeconds)),
    meanHits: results.reduce((a, r) => a + r.hits, 0) / runs,
    maxHits: Math.max(...results.map((r) => r.hits)),
  };
}

/** Storm dose (% of the per-storm limit) for each storm, unsheltered / habitat / shelter. */
export function stormTable(storms, wallKgs = [0, 2, 4, 6]) {
  return storms.map((s) => ({
    id: s.id,
    day: s.measured?.day ?? s.arrival.slice(0, 10),
    intensity: s.intensity,
    outside: expectedStormDose(s, 'outside'),
    habitat: expectedStormDose(s, 'habitat'),
    shelter: Object.fromEntries(wallKgs.map((kg) => [kg, expectedStormDose(s, 'shelter', kg)])),
  }));
}

/** The base's night: how much energy it needs, with and without the grow lights. */
export function nightBudget() {
  const day = createDayCycle();
  let longest = 0;
  let run = 0;
  for (let t = 0; t < SKY.GAME_SUN_LOOP_REAL_SECONDS * 2; t++) {
    run = getSun(day).visibility < 0.5 ? run + 1 : 0;
    longest = Math.max(longest, run);
    stepDayCycle(day, 1);
  }
  const hours = longest * TIME.GAME_HOURS_PER_REAL_SECOND;
  return {
    nightRealSeconds: longest,
    nightGameHours: hours,
    kwhLightsOn: hours * (POWER.HABITAT_LOAD_KW + POWER.GREENHOUSE_LED_LOAD_KW),
    kwhLightsOff: hours * POWER.HABITAT_LOAD_KW,
    batteryKwh: POWER.BATTERY_CAPACITY_KWH,
  };
}

/** Food each crop gives per pot per real minute of growing (for the balance table). */
export function cropTable() {
  return Object.entries(CROP).map(([id, c]) => {
    const edible = id === 'potato' ? c.items - 1 : c.items; // one potato is planted again
    const perHarvest = (edible * FARMING.FOOD_KG_PER_ITEM[id] * 100) / FOOD.CAPACITY_KG;
    return { id, growSeconds: c.grow, perItemPct: (FARMING.FOOD_KG_PER_ITEM[id] * 100) / FOOD.CAPACITY_KG, perHarvestPct: perHarvest, pctPerMinute: (perHarvest * 60) / c.grow };
  });
}
