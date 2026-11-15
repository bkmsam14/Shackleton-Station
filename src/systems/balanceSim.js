// balanceSim.js — plays "bots" through the game's real rules to check the GAME BALANCE.
// PURE LOGIC (no Three.js, no DOM). Used by scripts/balance-sim.mjs and tests/balance.test.js;
// the game itself never imports it.
//
// It reuses the real systems (gauges, day cycle, electrolysis, ice oven, solar damage, radiation),
// so the numbers here can't drift away from what the game does. Simplifications (said honestly):
//  - mini-games, pot tending and repairs pause the world in the game, so here they take no time;
//  - the day structure is the game's: shifts with skipped nights, an overnight refill of oxygen,
//    power and water (game rule), hunger carried over, plants growing one step per lit night;
//  - the solar array always faces the Sun (it tracks it); micrometeoroid hits are random (seeded):
//    each one cracks the array OR opens a habitat air leak (never both at once), like the game;
//  - a bot that repairs patches a leak the next time it is inside (the repair's hour is not simulated);
//  - storms are checked separately with stormTable() (dose per storm, per place).
//
// Balance targets (docs/SCIENCE.md "Game balance"), for the 4-day mission (4 × 6-min shifts):
//  idle    — does nothing: first rescue during Day 1;
//  sloppy  — reacts late, half-uses the farm, grow lights always on: Day 1 without a rescue,
//            only a few rescues in the whole mission;
//  skilled — keeps every loop going: no rescue at all.
import { TIME, FOOD, FARMING, SUPPLY, ICE, RECOVERY, POWER, SOLAR_DAMAGE, DAYS } from '../config/gameplay.js';
import { overnightRefill } from './days.js';
import { createGauges, stepGauges, addFood, applyRecovery, powerPercent } from './gauges.js';
import { createDayCycle, stepDayCycle, getSun } from './daycycle.js';
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
  potato: { nights: FARMING.GROW_NIGHTS, items: FARMING.HARVEST_YIELD, seed: 'potato', replant: 1 },
  ...Object.fromEntries(
    Object.entries(FARMING.GREENS).map(([id, c]) => [id, { nights: c.growNights, items: c.cuts * c.perCut, seed: `${id}-seed`, replant: 0 }]),
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
    eatAt: 55,
    pots: ['potato', 'potato', 'potato', 'lettuce'],
    lightsOffAtNight: true,
    seedsAt: 3,
    mineIceAt: 1,
    wallKg: 2,
    spareKit: true,
    repairs: true,
  },
};

const FOOD_ITEMS = ['lettuce', 'radish', 'potato', 'space-meal'];

/**
 * Play one bot through the whole mission: DAYS.COUNT shifts of DAYS.SHIFT_REAL_SECONDS
 * (1 s steps), with the night in between (refill, plants grow, the Sun moves on).
 * A failure is a rescue (gentle failure): gauges partly restored, the day goes on.
 */
export function simulate(bot, { blockSeconds = 100, seed = 1, damage = true } = {}) {
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
    'space-meal': FARMING.START_SPACE_MEALS,
    'lettuce-seed': FARMING.START_SEEDS.lettuce,
    'radish-seed': FARMING.START_SEEDS.radish,
    lettuce: 0,
    radish: 0,
    kits: SOLAR_DAMAGE.START_KITS,
  };
  const pots = bot.pots.map((want) => ({ want, crop: null, nights: 0 }));
  const orders = []; // { at, item } — at: play seconds
  const ordered = (item) => orders.some((o) => o.item === item);
  const failures = []; // { t, day, cause }
  let blackoutSeconds = 0;
  let damagedSeconds = 0;
  let hits = 0;
  let leakHits = 0;
  let leakSeconds = 0;
  let o2Made = 0;
  let iceBags = 0;
  const eaten = Object.fromEntries(FOOD_ITEMS.map((f) => [f, 0]));
  const lowest = { oxygen: 100, food: 100, power: 100, tankKg: station.tankKg };
  let play = 0; // play seconds since the start (nights not counted)

  const plant = (pot) => {
    const order = [pot.want, ...Object.keys(CROP).filter((c) => c !== pot.want)];
    for (const c of order) {
      // keep the last seed potato only if a potato is already growing somewhere
      if ((inv[CROP[c].seed] ?? 0) > 0) {
        inv[CROP[c].seed]--;
        pot.crop = c;
        pot.nights = 0;
        return;
      }
    }
    pot.crop = null;
  };
  const harvestReady = () => {
    for (const pot of pots) {
      if (pot.crop && pot.nights >= CROP[pot.crop].nights) {
        inv[pot.crop] += CROP[pot.crop].items; // the replanted seed potato is one of them
        pot.crop = null;
      }
      if (!pot.crop) plant(pot);
    }
  };
  const canEat = (id) => {
    if ((inv[id] ?? 0) <= 0) return false;
    if (id !== 'potato') return true;
    return inv.potato > 1 || pots.some((p) => p.crop); // never eat the very last seed potato
  };
  const eatOne = () => {
    const space = ((100 - g.food) / 100) * FOOD.CAPACITY_KG;
    let pick = FOOD_ITEMS.slice(0, 2).find(canEat); // fresh greens first
    if (!pick) {
      const opts = ['potato', 'space-meal'].filter(canEat);
      const fits = opts.filter((id) => FARMING.FOOD_KG_PER_ITEM[id] <= space + 1e-9).sort((a, b) => FARMING.FOOD_KG_PER_ITEM[b] - FARMING.FOOD_KG_PER_ITEM[a]);
      pick = fits[0] ?? opts.sort((a, b) => FARMING.FOOD_KG_PER_ITEM[a] - FARMING.FOOD_KG_PER_ITEM[b])[0];
    }
    if (!pick) return false;
    inv[pick]--;
    eaten[pick]++;
    addFood(g, FARMING.FOOD_KG_PER_ITEM[pick]);
    return true;
  };

  for (let d = 1; d <= DAYS.COUNT; d++) {
    let lightSeconds = 0;
    harvestReady(); // the morning: pick what's ready, replant
    for (let t = 0; t < DAYS.SHIFT_REAL_SECONDS; t++, play++) {
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
      if (lightsOn && r.hasPower) lightSeconds++;

      // deliveries
      for (let i = orders.length - 1; i >= 0; i--) {
        if (play < orders[i].at) continue;
        const item = orders[i].item;
        if (item === 'solar-repair-kit') inv.kits += 1;
        else inv[item.replace('-seeds', '-seed')] += SUPPLY.ITEMS[item].seeds;
        orders.splice(i, 1);
      }

      if (ice.oven && g.batteryKwh > 0.01) stepOven(ice, station, TIME.GAME_HOURS_PER_REAL_SECOND);

      if (outside) {
        // repair on the way past the array
        if (bot.repairs && solar.damaged && inv.kits > 0) {
          inv.kits--;
          solar.damaged = false;
          if (bot.spareKit && !ordered('solar-repair-kit')) orders.push({ at: play + orderSeconds('solar-repair-kit'), item: 'solar-repair-kit' });
        }
      } else {
        if (bot.repairs && leak.leaking) fixLeak(leak); // patch the hole at the life-support rack
        while (g.oxygen < bot.makeO2At && checkAfford(g, station, bot.batch).ok) {
          applyBatch(g, station, bot.batch);
          o2Made += 1;
        }
        while (g.food < bot.eatAt && eatOne());
        if (bot.repairs && solar.damaged && inv.kits === 0 && !ordered('solar-repair-kit')) {
          orders.push({ at: play + orderSeconds('solar-repair-kit'), item: 'solar-repair-kit' });
        }
        for (const c of ['lettuce', 'radish']) {
          if (bot.seedsAt >= 0 && inv[`${c}-seed`] <= bot.seedsAt && !ordered(`${c}-seeds`)) {
            orders.push({ at: play + orderSeconds(`${c}-seeds`), item: `${c}-seeds` });
          }
        }
        // water: one bag of icy soil (dug on the next trip outside), baked in the oven
        if (station.tankKg < bot.mineIceAt && !ice.oven) {
          ice.bagKg = ICE.BAG_MAX_KG;
          if (checkOven(ice, g).ok) {
            loadOven(ice, g);
            iceBags++;
          } else ice.bagKg = 0;
        }
      }

      lowest.oxygen = Math.min(lowest.oxygen, g.oxygen);
      lowest.food = Math.min(lowest.food, g.food);
      lowest.power = Math.min(lowest.power, powerPercent(g));
      lowest.tankKg = Math.min(lowest.tankKg, station.tankKg);

      if (r.oxygenEmpty || r.foodEmpty) {
        failures.push({ t: play, day: d, cause: r.oxygenEmpty ? 'oxygen' : 'food' });
        applyRecovery(g, { oxygen: RECOVERY.OXYGEN_RESTORE_PERCENT, food: RECOVERY.FOOD_RESTORE_PERCENT });
        const rest = Math.round(realSecondsForGameHours(RECOVERY.REST_GAME_HOURS));
        stepDayCycle(day, rest);
        t += rest;
        play += rest;
      }
    }
    if (d === DAYS.COUNT) break;
    // the night: plants grow if they had light, the Sun moves on, then the refill (game rule)
    const lit = lightSeconds / DAYS.SHIFT_REAL_SECONDS >= FARMING.LIGHT_SHARE_TO_GROW;
    if (lit) for (const pot of pots) if (pot.crop) pot.nights = Math.min(CROP[pot.crop].nights, pot.nights + 1);
    stepDayCycle(day, realSecondsForGameHours(DAYS.NIGHT_HOURS));
    if (ice.oven) stepOven(ice, station, DAYS.NIGHT_HOURS);
    overnightRefill(g, station);
  }

  return {
    seed,
    failures,
    firstFailure: failures[0] ?? null,
    rescuesByDay: Array.from({ length: DAYS.COUNT }, (_, i) => failures.filter((f) => f.day === i + 1).length),
    blackoutSeconds,
    damagedSeconds,
    hits,
    leakHits,
    leakSeconds,
    o2Made,
    iceBags,
    eaten,
    lowest,
    end: { oxygen: g.oxygen, food: g.food, power: powerPercent(g), tankKg: station.tankKg, potatoes: inv.potato, meals: inv['space-meal'], kits: inv.kits },
  };
}

/** Run a bot over many random seeds (micrometeoroid luck). */
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

/**
 * The longest stretch with the Sun hidden DURING a shift (nights are skipped and the battery
 * is refilled each morning), and what the base needs to get through it.
 */
export function nightBudget() {
  const day = createDayCycle();
  let longest = 0;
  for (let d = 1; d <= DAYS.COUNT; d++) {
    let run = 0;
    for (let t = 0; t < DAYS.SHIFT_REAL_SECONDS; t++) {
      run = getSun(day).visibility < 0.5 ? run + 1 : 0;
      longest = Math.max(longest, run);
      stepDayCycle(day, 1);
    }
    stepDayCycle(day, realSecondsForGameHours(DAYS.NIGHT_HOURS));
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

/** Food per harvest of each crop, and how many nights it needs (for the balance table). */
export function cropTable() {
  return Object.entries(CROP).map(([id, c]) => {
    const edible = c.items - c.replant; // one potato is planted again
    const perItemPct = (FARMING.FOOD_KG_PER_ITEM[id] * 100) / FOOD.CAPACITY_KG;
    return { id, nights: c.nights, perItemPct, perHarvestPct: edible * perItemPct, pctPerDay: (edible * perItemPct) / c.nights };
  });
}
