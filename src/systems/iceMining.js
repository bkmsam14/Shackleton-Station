// iceMining.js — rules for ice mining. PURE LOGIC: no Three.js, no DOM.
//
// The water chain: dig icy soil in a cold trap → carry the bag home → the Ice Oven heats
// it → the ice turns to vapour → a cold plate catches it as water → Electrolysis tank.
// Never free (CLAUDE.md rule 4): the trip costs oxygen and food (outside rates), the cold
// trap costs base power (suit heaters), the oven costs base power and time.
// Real number: water = ICE_MASS_FRACTION (5.6 %, LCROSS) of the soil's mass.
import { ICE, ELECTROLYSIS, POWER, TIME, SUPPLY, PLAYER } from '../config/gameplay.js';

export const DIG_SPOTS = ['ice-spot-1', 'ice-spot-2', 'ice-spot-3'];

export function createIceState(saved = {}) {
  return {
    bagKg: Math.max(0, Number(saved.bagKg) || 0),
    oven: saved.oven ?? null, // { soilKg, waterKg, waterDoneKg, hoursLeft }
    spots: { ...(saved.spots ?? {}) }, // spot id → game hour it is ready again
  };
}

export const waterFromSoil = (soilKg) => soilKg * ICE.ICE_MASS_FRACTION;

/** How heavy the bag feels on the Moon, as an Earth mass ("feels like 10 kg"). */
const EARTH_G = 9.81; // m/s² (standard gravity)
export const moonFeelsLikeKg = (kg) => (kg * PLAYER.GRAVITY) / EARTH_G; // Moon g: NASA Moon Fact Sheet

/** Soil (kg) the drill round brought up, capped by the bag's free space. */
export function soilFromRound(state, chunks) {
  const want = Math.max(0, chunks | 0) * ICE.SOIL_KG_PER_CHUNK;
  return Math.min(want, ICE.BAG_MAX_KG - state.bagKg);
}

export function addToBag(state, soilKg) {
  const added = Math.max(0, Math.min(soilKg, ICE.BAG_MAX_KG - state.bagKg));
  state.bagKg += added;
  return added;
}

export const bagFull = (state) => state.bagKg >= ICE.BAG_MAX_KG - 1e-9;

// ---------------------------------------------------------------- dig spots
export function spotReady(state, id, nowHour) {
  return (state.spots[id] ?? -Infinity) <= nowHour;
}

/** Can you drill here now? reason: null | 'resting' | 'bag-full' */
export function checkDig(state, id, nowHour) {
  if (bagFull(state)) return { ok: false, reason: 'bag-full' };
  if (!spotReady(state, id, nowHour)) return { ok: false, reason: 'resting', hoursLeft: state.spots[id] - nowHour };
  return { ok: true, reason: null };
}

/** A finished drill round: the spot rests, the soil goes in the bag. */
export function finishDig(state, id, nowHour, chunks) {
  const soilKg = addToBag(state, soilFromRound(state, chunks));
  if (soilKg > 0) state.spots[id] = nowHour + ICE.SPOT_COOLDOWN_GAME_HOURS;
  return { soilKg, waterKg: waterFromSoil(soilKg), bagKg: state.bagKg };
}

/** Stars: 1 for finishing, +1 for enough ice chunks with few rock bumps, +1 for the quiz. */
export function scoreDrill({ chunks = 0, bumps = 0, quizCorrect = false }) {
  let stars = 1;
  if (chunks >= ICE.STAR_CHUNKS && bumps <= chunks / 3) stars++;
  if (quizCorrect) stars++;
  return Math.min(3, stars);
}

// ---------------------------------------------------------------- Ice Oven
export function ovenCost(soilKg) {
  return {
    soilKg,
    waterKg: waterFromSoil(soilKg),
    kwh: soilKg * ICE.OVEN_KWH_PER_KG_SOIL,
    gameHours: ICE.OVEN_GAME_HOURS,
    realSecondsInGame: (ICE.OVEN_GAME_HOURS * 3600) / TIME.SCALE,
  };
}

/** Can the oven bake the bag now? reason: null | 'no-soil' | 'busy' | 'power' */
export function checkOven(state, gauges) {
  if (state.bagKg <= 0) return { ok: false, reason: 'no-soil' };
  if (state.oven) return { ok: false, reason: 'busy' };
  const floorKwh = (ELECTROLYSIS.POWER_FLOOR_PERCENT / 100) * POWER.BATTERY_CAPACITY_KWH;
  if (gauges.batteryKwh - ovenCost(state.bagKg).kwh < floorKwh) return { ok: false, reason: 'power' };
  return { ok: true, reason: null };
}

/** Load the whole bag and pay the power up front. */
export function loadOven(state, gauges) {
  const check = checkOven(state, gauges);
  if (!check.ok) throw new Error(`Cannot start the Ice Oven (${check.reason})`);
  const c = ovenCost(state.bagKg);
  gauges.batteryKwh = Math.max(0, gauges.batteryKwh - c.kwh);
  state.oven = { soilKg: c.soilKg, waterKg: c.waterKg, waterDoneKg: 0, hoursLeft: c.gameHours };
  state.bagKg = 0;
  return c;
}

/**
 * Advance the oven by dtGameHours. Water trickles into the Electrolysis tank as it is
 * caught; if the tank is full (SUPPLY.WATER_TANK_MAX_KG) the rest waits in the oven.
 * Returns { addedKg, finished }.
 */
export function stepOven(state, station, dtGameHours) {
  const o = state.oven;
  if (!o || dtGameHours <= 0) return { addedKg: 0, finished: false };
  o.hoursLeft = Math.max(0, o.hoursLeft - dtGameHours);
  const baked = o.waterKg * (1 - o.hoursLeft / ICE.OVEN_GAME_HOURS); // caught so far
  const space = Math.max(0, SUPPLY.WATER_TANK_MAX_KG - station.tankKg);
  const addedKg = Math.max(0, Math.min(baked - o.waterDoneKg, space));
  station.tankKg += addedKg;
  o.waterDoneKg += addedKg;
  const finished = o.hoursLeft <= 0 && o.waterDoneKg >= o.waterKg - 1e-9;
  if (finished) state.oven = null;
  return { addedKg, finished, waitingForSpace: o.hoursLeft <= 0 && !finished };
}

/** Gentle failure: some soil spills on the way home. Returns kg spilled. */
export function spillBag(state) {
  const spilled = state.bagKg * (1 - ICE.FAIL_KEEP_FRACTION);
  state.bagKg -= spilled;
  return spilled;
}

/** Extra base load (kW) while the player is in the cold trap. */
export const coldTrapLoadKw = (inColdTrap) => (inColdTrap ? ICE.COLD_TRAP_EXTRA_KW : 0);
