// daycycle.js — pure logic (no Three.js). Tracks game time and where the Sun is.
//
// Two clocks (both shown honestly in the UI):
//  - Life-support clock: 1 game day = TIME.REAL_SECONDS_PER_GAME_DAY real seconds (360×).
//  - Sun clock: the Sun circles the horizon once per SKY.GAME_SUN_LOOP_REAL_SECONDS
//    (real life: one synodic month, ~29.5 days).

import { TIME, SKY } from '../config/gameplay.js';
import { skyTurnDeg, sunEclipticLon, gameSkyMatrix, liveSkyMatrix } from './skyMath.js';
import { liveSky, toGameAz } from './ephemeris.js';
import { horizonDeg } from '../world/lola.js';

export function wrapDeg(a) {
  return ((a % 360) + 360) % 360;
}

/** Signed smallest difference a − b in degrees, in (−180, 180]. */
export function deltaDeg(a, b) {
  let d = wrapDeg(a - b);
  if (d > 180) d -= 360;
  return d;
}

function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/**
 * How much of the Sun is visible (0 = hidden behind the terrain, 1 = fully visible), from the
 * REAL horizon around the base (NASA LOLA, world/lola.js): the Sun's disc (~0.53° wide) slides
 * behind the real ridges and mountains.
 */
export function sunVisibility(azimuthDeg, elevationDeg = SKY.SUN_ELEVATION_DEG) {
  const clearance = elevationDeg - horizonDeg(azimuthDeg); // degrees above the skyline
  return smoothstep(-0.27, 0.27, clearance);
}

export function createDayCycle({ startHour = TIME.START_HOUR } = {}) {
  return {
    gameSeconds: startHour * 3600, // life-support clock
    sunRealSeconds: 0, // sun clock
    liveStartMs: null, // Live sky: real date at sunRealSeconds = 0 (null = game Sun)
  };
}

/** Advance both clocks by dtReal real seconds. Returns the same state object. */
export function stepDayCycle(state, dtReal) {
  state.gameSeconds += dtReal * TIME.SCALE;
  state.sunRealSeconds += dtReal;
  return state;
}

/** Skip game time (e.g. resting after a gentle failure). Sun moves by the matching real time. */
export function skipGameHours(state, hours) {
  const realSeconds = (hours * 3600) / TIME.SCALE;
  stepDayCycle(state, realSeconds);
  return realSeconds;
}

export function sunAzimuthDeg(state, sky = SKY) {
  // The sky turns counter-clockwise seen from above at the lunar south pole → azimuth goes DOWN
  // (the Moon spins the same way as Earth; see skyMath.js).
  return wrapDeg(sky.SUN_START_AZIMUTH_DEG - (360 * state.sunRealSeconds) / sky.GAME_SUN_LOOP_REAL_SECONDS);
}

/**
 * LIVE SKY: from now on the Sun, Earth and stars follow the real date and time (real speed).
 * on = false goes back to the sped-up game Sun. Returns the state.
 */
export function setLiveSky(state, on, nowMs = Date.now()) {
  state.liveStartMs = on ? nowMs - state.sunRealSeconds * 1000 : null;
  return state;
}

/** The real date the live sky shows (ms), or null in game mode. */
export const liveDateMs = (state) => (state.liveStartMs == null ? null : state.liveStartMs + state.sunRealSeconds * 1000);

/** Sun info for this moment. */
export function getSun(state, sky = SKY) {
  const live = liveDateMs(state);
  if (live !== null) {
    const real = liveSky(live);
    const azimuth = toGameAz(real.sun.az);
    return {
      azimuthDeg: azimuth,
      elevationDeg: real.sun.alt,
      visibility: sunVisibility(azimuth, real.sun.alt),
      live: true,
      dateMs: live,
      earth: { az: toGameAz(real.earth.az), alt: real.earth.alt, lit: real.earthLit },
      skyMatrix: liveSkyMatrix(real.B, sky.EARTH_AZIMUTH_DEG),
    };
  }
  const azimuth = sunAzimuthDeg(state, sky);
  const turn = skyTurnDeg(azimuth, sunEclipticLon(state.sunRealSeconds, sky));
  return {
    azimuthDeg: azimuth,
    elevationDeg: sky.SUN_ELEVATION_DEG,
    visibility: sunVisibility(azimuth, sky.SUN_ELEVATION_DEG),
    // how far the starry sky has turned (azimuth of anything on the sky = λ + skyTurnDeg)
    skyTurnDeg: turn,
    live: false,
    earth: { az: sky.EARTH_AZIMUTH_DEG, alt: sky.EARTH_ELEVATION_DEG },
    skyMatrix: gameSkyMatrix(turn), // J2000 equatorial → game world, for stars and the telescope
  };
}

/** Day number (from 1) and clock time for the HUD. */
export function getClock(state) {
  const total = state.gameSeconds;
  const day = Math.floor(total / 86400) + 1;
  const secOfDay = total - (day - 1) * 86400;
  const hour = Math.floor(secOfDay / 3600);
  const minute = Math.floor((secOfDay % 3600) / 60);
  return { day, hour, minute };
}

/** Unit vector toward a sky direction, y up. Azimuth 0 = −Z, 90 = +X. */
export function skyDirection(azimuthDeg, elevationDeg) {
  const az = (azimuthDeg * Math.PI) / 180;
  const el = (elevationDeg * Math.PI) / 180;
  return { x: Math.sin(az) * Math.cos(el), y: Math.sin(el), z: -Math.cos(az) * Math.cos(el) };
}
