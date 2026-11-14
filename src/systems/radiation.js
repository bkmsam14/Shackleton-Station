// radiation.js — particle storms at the base and the storm shelter. PURE LOGIC.
//
// A storm (from spaceWeather.scheduleStorms) goes:  calm → warning (flare seen, particles
// on their way) → storm (particles arriving) → calm.  While a storm runs, dose builds up
// at a rate set by the storm's real strength and by where the player is:
//   rate = STORM_DOSE_PER_GAME_HOUR × intensity × LOCATION_FACTOR[place] × wall factor
// The storm dose is shown as % of a per-storm safety limit. The mission total only grows.
// Water walls: water moved from the Electrolysis tank into the shelter walls lowers the
// shelter dose — but that water can't be used to make oxygen until it is moved back.
import { RADIATION, POWER } from '../config/gameplay.js';

export function createRadiationState(schedule = []) {
  return {
    schedule, // storms on the game clock (arriveGameHour, warnGameHour, intensity, flare…)
    index: 0, // next storm to handle
    phase: 'calm', // 'calm' | 'warning' | 'storm'
    storm: null, // the current storm (warning or storm phase)
    stormDose: 0, // % of the per-storm limit, for the current storm
    missionDose: 0, // sum of all storm doses (never goes down)
    limitHit: false,
    shelteredHours: 0, // time spent in the shelter during the current storm
    history: [], // finished storms: { id, flare, dose, shelteredShare, ratio }
  };
}

/** Fraction of the water-wall effect: 1 with no water, ½ at WALL_HALF_KG, … */
export function wallFactor(wallKg) {
  return 1 / (1 + Math.max(0, wallKg) / RADIATION.WALL_HALF_KG);
}

/** How much of the dose gets through where the player is (0..1). */
export function shieldFactor(place, wallKg = 0) {
  const base = RADIATION.LOCATION_FACTOR[place] ?? RADIATION.LOCATION_FACTOR.outside;
  return place === 'shelter' ? base * wallFactor(wallKg) : base;
}

/** Dose rate (% of the storm limit per game hour) for a storm at this place. */
export function doseRate(storm, place, wallKg = 0) {
  return RADIATION.STORM_DOSE_PER_GAME_HOUR * (storm?.intensity ?? 0) * shieldFactor(place, wallKg);
}

/** Expected total storm dose (%) if you stayed in one place the whole storm (for the UI). */
export function expectedStormDose(storm, place, wallKg = 0) {
  return doseRate(storm, place, wallKg) * RADIATION.STORM_GAME_HOURS;
}

/**
 * Advance to game hour `now`. ctx: { place, wallKg }.
 * Returns events: { type: 'warning' | 'storm-start' | 'storm-end' | 'limit', storm, … }
 */
export function stepRadiation(state, now, dtGameHours, ctx) {
  const events = [];
  const next = state.schedule[state.index];

  if (state.phase === 'calm' && next && now >= next.warnGameHour) {
    state.phase = 'warning';
    state.storm = next;
    events.push({ type: 'warning', storm: next, hoursLeft: Math.max(0, next.arriveGameHour - now) });
  }
  if (state.phase === 'warning' && now >= state.storm.arriveGameHour) {
    state.phase = 'storm';
    state.stormDose = 0;
    state.shelteredHours = 0;
    state.limitHit = false;
    events.push({ type: 'storm-start', storm: state.storm });
  }
  if (state.phase === 'storm') {
    const end = state.storm.arriveGameHour + RADIATION.STORM_GAME_HOURS;
    const dt = Math.max(0, Math.min(dtGameHours, end - (now - dtGameHours)));
    const added = doseRate(state.storm, ctx.place, ctx.wallKg) * dt;
    state.stormDose = Math.min(100, state.stormDose + added);
    state.missionDose += added;
    if (ctx.place === 'shelter') state.shelteredHours += dt;
    if (state.stormDose >= 100 && !state.limitHit) {
      state.limitHit = true;
      events.push({ type: 'limit', storm: state.storm });
    }
    if (now >= end) {
      const summary = {
        id: state.storm.id,
        flare: state.storm.flare,
        ratio: state.storm.ratio,
        dose: state.stormDose,
        shelteredShare: Math.min(1, state.shelteredHours / RADIATION.STORM_GAME_HOURS),
      };
      state.history.push(summary);
      events.push({ type: 'storm-end', storm: state.storm, summary });
      state.phase = 'calm';
      state.storm = null;
      state.index++;
    }
  }
  return events;
}

/** Hours until the particles arrive (warning phase), else null. */
export function hoursToArrival(state, now) {
  return state.phase === 'warning' ? Math.max(0, state.storm.arriveGameHour - now) : null;
}

/**
 * Move water between the Electrolysis tank and the shelter walls. kg > 0 = into the walls,
 * kg < 0 = back to the tank. Pumping costs power. Returns { movedKg, kwh, reason }.
 * reason: null | 'tank-empty' | 'walls-full' | 'walls-empty' | 'power'.
 */
export function moveWater(station, gauges, kg) {
  const want = Number(kg) || 0;
  let move = want > 0 ? Math.min(want, station.tankKg, RADIATION.WALL_CAPACITY_KG - station.wallKg) : Math.max(want, -station.wallKg);
  let reason = null;
  if (want > 0 && station.tankKg <= 1e-9) reason = 'tank-empty';
  else if (want > 0 && station.wallKg >= RADIATION.WALL_CAPACITY_KG - 1e-9) reason = 'walls-full';
  else if (want < 0 && station.wallKg <= 1e-9) reason = 'walls-empty';
  const kwh = Math.abs(move) * RADIATION.PUMP_KWH_PER_KG;
  if (!reason && kwh > gauges.batteryKwh) reason = 'power';
  if (reason) return { movedKg: 0, kwh: 0, reason };
  station.tankKg -= move;
  station.wallKg += move;
  gauges.batteryKwh = Math.max(0, gauges.batteryKwh - kwh);
  return { movedKg: move, kwh, reason: null };
}

/** Battery share used by pumping (for UI). */
export const pumpPercentPerKg = () => (RADIATION.PUMP_KWH_PER_KG / POWER.BATTERY_CAPACITY_KWH) * 100;
