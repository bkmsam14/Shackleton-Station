// micrometeoroids.js — tiny space rocks that hit the base (PURE LOGIC: no Three.js, no DOM).
//
// ONE scheduler for both targets, so the two kinds of damage never happen at once:
//   'solar'   — cracked solar cells: the array makes less power (supply/solarDamage.js)
//   'habitat' — a tiny hole in the habitat wall: cabin air leaks out and the base tops it
//               up from the oxygen supply, so the oxygen gauge drains faster (this file)
// While either one is still broken (`busy`), no new hit comes.
//
// Real basis (docs/SCIENCE.md → Micrometeoroids and air leaks): micrometeoroids strike the
// Moon all the time; air escapes a small hole at the speed of sound ("choked flow", NASA
// Glenn); ISS crews find leaks by closing hatches and with ultrasonic leak detectors, and
// plugged the 2018 Soyuz hole from inside with epoxy on gauze. How often hits come and how
// big the hole is are GAME BALANCE (config/gameplay.js → MICROMETEOROIDS, LEAK).
import { MICROMETEOROIDS, LEAK, TIME } from '../config/gameplay.js';

/** Chance of a hit per play second (average gap = MEAN_GAME_DAYS_BETWEEN_HITS game days). */
export const HIT_RATE_PER_SECOND = 1 / (MICROMETEOROIDS.MEAN_GAME_DAYS_BETWEEN_HITS * TIME.REAL_SECONDS_PER_GAME_DAY);
export const GRACE_SECONDS = (MICROMETEOROIDS.GRACE_GAME_HOURS * 3600) / TIME.SCALE;

const num = (v, d = 0) => (Number.isFinite(v) ? v : d);

/** The hit clock (saved). `playSeconds` counts base time since the start (for the grace period). */
export function createImpactState(saved = null) {
  return {
    playSeconds: num(saved?.playSeconds),
    hits: { solar: num(saved?.hits?.solar), habitat: num(saved?.hits?.habitat) },
    testTimer: 0,
  };
}

/** Which target a hit picks: the habitat with chance HABITAT_SHARE, otherwise the array. */
export function pickTarget(rand = Math.random, share = MICROMETEOROIDS.HABITAT_SHARE) {
  return rand() < share ? 'habitat' : 'solar';
}

/**
 * Advance the clock by dt base-seconds. Returns 'solar' | 'habitat' when a hit lands, else null.
 * opts.busy: something is still broken (no new hit until it's fixed: never both at once).
 * opts.everySeconds (testing): a hit on a fixed timer instead, alternating array / habitat.
 */
export function stepImpacts(s, dt, { busy = false, rand = Math.random, everySeconds = null } = {}) {
  if (!(dt > 0)) return null;
  s.playSeconds += dt;
  if (busy) return null;
  let target = null;
  if (everySeconds) {
    s.testTimer += dt;
    if (s.testTimer < everySeconds) return null;
    s.testTimer = 0;
    target = s.hits.solar <= s.hits.habitat ? 'solar' : 'habitat';
  } else {
    if (s.playSeconds < GRACE_SECONDS) return null;
    if (!(rand() < 1 - Math.exp(-HIT_RATE_PER_SECOND * dt))) return null;
    target = pickTarget(rand);
  }
  s.hits[target]++;
  return target;
}

// ---------------------------------------------------------------- the air leak
/**
 * Air through a small hole when the cabin pressure is much higher than outside (vacuum):
 * the flow is "choked" (it leaves at the speed of sound), so it depends only on the hole
 * size and the cabin air, not on the vacuum outside. kg of air per second.
 * mdot = Cd · A · P · sqrt(γ / (R·T)) · (2/(γ+1))^((γ+1)/(2(γ−1)))   (NASA Glenn, Mass Flow Choking)
 */
export function chokedFlowKgPerS({
  diameterMm = LEAK.HOLE_DIAMETER_MM,
  pressureKpa = LEAK.CABIN_PRESSURE_KPA,
  tempK = LEAK.CABIN_TEMP_K,
  cd = LEAK.DISCHARGE_COEFF,
  gamma = LEAK.GAMMA_AIR,
  r = LEAK.R_AIR,
} = {}) {
  const area = Math.PI * (diameterMm / 2000) ** 2;
  const choke = (2 / (gamma + 1)) ** ((gamma + 1) / (2 * (gamma - 1)));
  return cd * area * pressureKpa * 1000 * Math.sqrt(gamma / (r * tempK)) * choke;
}

/** Leak state (saved): is a hole open, how many were fixed, how much oxygen it has cost. */
export function createLeakState(saved = null) {
  return {
    leaking: Boolean(saved?.leaking),
    repairs: num(saved?.repairs),
    o2LostKg: num(saved?.o2LostKg), // during the current leak (shown in the PDA + lesson)
  };
}

/** A micrometeoroid made a hole. False if one is already open. */
export function startLeak(l) {
  if (l.leaking) return false;
  l.leaking = true;
  l.o2LostKg = 0;
  return true;
}

/** The hole is patched. False if there was no leak. */
export function fixLeak(l) {
  if (!l.leaking) return false;
  l.leaking = false;
  l.repairs++;
  return true;
}

/** Extra oxygen the base uses per GAME hour to keep the cabin air topped up (0 when sealed). */
export const leakO2KgPerGameHour = (l) => (l.leaking ? LEAK.O2_KG_PER_GAME_HOUR : 0);

/** Count the oxygen lost while the hole is open (dt in real seconds of base time). */
export function stepLeak(l, dt) {
  if (!l.leaking || !(dt > 0)) return;
  l.o2LostKg += LEAK.O2_KG_PER_GAME_HOUR * dt * TIME.GAME_HOURS_PER_REAL_SECOND;
}
