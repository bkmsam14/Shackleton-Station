// airlock.js — one airlock cycle, step by step. PURE LOGIC (no Three.js, no DOM, no audio).
//
// Going OUT:  close the inner hatch → pumps move most of the air back into the module →
//             the last bit is vented to space → the outer hatch opens onto vacuum.
// Coming IN:  close the outer hatch → air flows in from the module → full pressure →
//             the inner hatch opens.
// pressure: 1 = module air, 0 = vacuum. The sound you hear follows it: SOUND NEEDS AIR.
// Cost (never free): a little oxygen leaves with the vented air, and some base time passes.
import { AIRLOCK, OXYGEN } from '../config/gameplay.js';

export const PHASES = ['close', 'pump', 'vent', 'open', 'done'];

export function createAirlockCycle(direction) {
  if (direction !== 'out' && direction !== 'in') throw new Error(`airlock direction must be "out" or "in", got ${direction}`);
  return { direction, t: 0, phase: 'close', pressure: direction === 'out' ? 1 : 0, skipping: false };
}

const ends = () => {
  const a = AIRLOCK.CLOSE_S;
  const b = a + AIRLOCK.PUMP_S;
  const c = b + AIRLOCK.VENT_S;
  return { close: a, pump: b, vent: c, open: c + AIRLOCK.OPEN_S };
};
export const cycleSeconds = () => ends().open;

/** Air pressure (0..1) at time t of the cycle. */
export function pressureAt(direction, t) {
  const e = ends();
  const stop = AIRLOCK.PUMP_STOP_FRACTION;
  let outP; // pressure while going OUT
  if (t <= e.close) outP = 1;
  else if (t <= e.pump) {
    // pumps slow down as the air thins: an exponential pump-down to the stop level
    const u = (t - e.close) / AIRLOCK.PUMP_S;
    outP = stop + (1 - stop) * (Math.exp(-3 * u) - Math.exp(-3)) / (1 - Math.exp(-3));
  } else if (t <= e.vent) outP = stop * (1 - (t - e.pump) / AIRLOCK.VENT_S);
  else outP = 0;
  if (direction === 'out') return outP;
  // coming in mirrors it: vacuum → a quick first rush → filling up → full
  return 1 - outP;
}

/**
 * Advance the cycle by dt real seconds. Returns the events that happened:
 * 'hatch-close' | 'pump' | 'vent' | 'equal' | 'hatch-open' | 'done'.
 */
export function stepAirlock(c, dt) {
  if (c.phase === 'done') return [];
  const before = c.t;
  c.t += dt * (c.skipping ? AIRLOCK.SKIP_SPEED : 1);
  const e = ends();
  const events = [];
  const crossed = (x) => before < x && c.t >= x;
  if (before === 0) events.push('hatch-close');
  if (crossed(e.close)) events.push('pump');
  if (crossed(e.pump)) events.push('vent');
  if (crossed(e.vent)) events.push('equal', 'hatch-open');
  if (crossed(e.open)) events.push('done');
  c.phase = c.t < e.close ? 'close' : c.t < e.pump ? 'pump' : c.t < e.vent ? 'vent' : c.t < e.open ? 'open' : 'done';
  c.pressure = pressureAt(c.direction, Math.min(c.t, e.open));
  return events;
}

/** The cost of one cycle: oxygen % lost with the vented air, and base time. */
export function cycleCost() {
  return { oxygenPercent: (AIRLOCK.O2_LOSS_KG / OXYGEN.CAPACITY_KG) * 100, gameHours: AIRLOCK.GAME_MINUTES / 60 };
}

/** Pay it (never below 0 — running out is handled by the normal gentle failure). */
export function payCycle(gauges) {
  const c = cycleCost();
  gauges.oxygen = Math.max(0, gauges.oxygen - c.oxygenPercent);
  return c;
}
