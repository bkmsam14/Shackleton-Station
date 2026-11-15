// script.js — the Training Day's rules (PURE LOGIC: no Three.js, no DOM).
// The steps themselves are data in src/data/trainingDay.js; Volt's tour engine
// (systems/assistant.js) runs them. This file says how fast the base clock runs during
// a step, which scripted events exist, and how the storm drill picks its storm.
import { TRAINING } from '../config/gameplay.js';

/** Scripted events a step may fire when Volt says its line (handled in src/training/index.js). */
export const TRIGGERS = ['micrometeorite', 'rush-delivery', 'storm-drill', 'ripen'];

/** Places the cyan arrow can point to (resolved to positions in main.js). */
export const TARGETS = ['electrolysis', 'terminal', 'airlock', 'greenhouse', 'pots', 'array', 'pad', 'ice', 'oven', 'telescope', 'shelter', 'water-walls'];

/** Base-clock speed: slower while training (a step can override it), normal otherwise. */
export function trainingPace(step, active) {
  if (!active) return 1;
  return step?.pace ?? TRAINING.PACE;
}

/**
 * The storm drill replays one REAL storm (from the space-weather data) right now: the
 * gentlest one, so a first try goes well. Its warning starts at `nowHour` and it keeps its
 * real warning time and strength — only its date on the game clock moves.
 */
export function drillStorm(storms, nowHour) {
  const usable = (storms ?? []).filter((s) => Number.isFinite(s.arriveGameHour) && Number.isFinite(s.warnGameHour));
  if (!usable.length) return null;
  const s = usable.reduce((a, b) => ((b.intensity ?? 1) < (a.intensity ?? 1) ? b : a));
  const lead = Math.max(0, s.arriveGameHour - s.warnGameHour);
  const warn = nowHour + 0.01;
  return { ...s, drill: true, warnGameHour: warn, arriveGameHour: warn + lead };
}
