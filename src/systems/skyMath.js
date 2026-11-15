// skyMath.js — where real stars appear in the sky at the Moon's south pole. PURE LOGIC.
//
// The Moon's spin axis is tilted only ~1.5° from the ecliptic pole, so at the lunar south
// pole "straight up" is (almost) the SOUTH ECLIPTIC POLE (detail left out: that 1.5° wobble).
// That makes the sky simple:
//  - a star's height above the horizon = minus its ecliptic latitude (altitude = −β);
//    stars never rise or set — they circle at a fixed height, like at Earth's poles;
//  - stars north of the ecliptic (β > 0) are never seen (Polaris, the Big Dipper, …);
//  - the whole sky turns once per SIDEREAL month (27.3 days); the Sun goes round once per
//    synodic month (29.5 days) because it also creeps along the ecliptic (~1° a day).
// Azimuth uses the game convention (daycycle.skyDirection): 0° = −Z, 90° = +X. With that, a
// star at ecliptic longitude λ sits at azimuth λ + θ, where θ is the sky's current turn
// (a proper rotation, so constellations are never mirrored).
import { SKY } from '../config/gameplay.js';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
export const OBLIQUITY_DEG = 23.4393; // tilt of Earth's axis to the ecliptic, J2000 (IAU)

export const wrap360 = (a) => ((a % 360) + 360) % 360;

/** J2000 RA/Dec (degrees) → ecliptic longitude/latitude (degrees). */
export function eclipticFromEquatorial(raDeg, decDeg) {
  const ra = raDeg * D2R;
  const dec = decDeg * D2R;
  const e = OBLIQUITY_DEG * D2R;
  const sinB = Math.sin(dec) * Math.cos(e) - Math.cos(dec) * Math.sin(e) * Math.sin(ra);
  const lat = Math.asin(Math.max(-1, Math.min(1, sinB)));
  const y = Math.sin(ra) * Math.cos(e) + Math.tan(dec) * Math.sin(e);
  const x = Math.cos(ra);
  return { lon: wrap360(Math.atan2(y, x) * R2D), lat: lat * R2D };
}

/** Real days that have passed on the Sun clock (the Sun loop stands for one synodic month). */
export function skyRealDays(sunRealSeconds, sky = SKY) {
  return (sunRealSeconds / sky.GAME_SUN_LOOP_REAL_SECONDS) * sky.REAL_SUN_LOOP_DAYS;
}

/** The Sun's ecliptic longitude: it creeps ~0.986° per day (one year per lap). */
export function sunEclipticLon(sunRealSeconds, sky = SKY) {
  return wrap360(sky.SUN_ECLIPTIC_LON_START_DEG + (360 * skyRealDays(sunRealSeconds, sky)) / 365.25);
}

/** The sky's turn θ, fixed by where the Sun is: azimuth = λ + θ for anything on the sky. */
export function skyTurnDeg(sunAzimuthDeg, sunLonDeg) {
  return wrap360(sunAzimuthDeg - sunLonDeg);
}

/** Ecliptic lon/lat → { az, alt } at the lunar south pole for sky turn θ. */
export function horizontalFromEcliptic(lonDeg, latDeg, turnDeg) {
  return { az: wrap360(lonDeg + turnDeg), alt: -latDeg };
}

/** Angle between two sky directions (degrees). */
export function separationDeg(a, b) {
  const s =
    Math.sin(a.alt * D2R) * Math.sin(b.alt * D2R) +
    Math.cos(a.alt * D2R) * Math.cos(b.alt * D2R) * Math.cos((a.az - b.az) * D2R);
  return Math.acos(Math.max(-1, Math.min(1, s))) * R2D;
}

/** Can this ever be seen from the lunar south pole? (ignoring the ~1.5° axis wobble) */
export const everVisible = (latDeg) => latDeg < 0;

/**
 * Star colour from its B−V colour index (blue-white for hot stars, orange-red for cool ones).
 * Temperature: Ballesteros (2012) approximation — used for the colour only, never shown as data.
 */
export function bvToTemperatureK(bv) {
  const b = Math.max(-0.4, Math.min(2, bv ?? 0.6));
  return 4600 * (1 / (0.92 * b + 1.7) + 1 / (0.92 * b + 0.62));
}

/** Approximate RGB (0..1) for a blackbody temperature (good enough for a star dot's tint). */
export function temperatureToRgb(tempK) {
  const t = tempK / 100;
  let r;
  let g;
  let b;
  if (t <= 66) {
    r = 255;
    g = 99.47 * Math.log(t) - 161.12;
    b = t <= 19 ? 0 : 138.52 * Math.log(t - 10) - 305.04;
  } else {
    r = 329.7 * Math.pow(t - 60, -0.1332);
    g = 288.12 * Math.pow(t - 60, -0.0755);
    b = 255;
  }
  const c = (v) => Math.max(0, Math.min(255, v)) / 255;
  return [c(r), c(g), c(b)];
}

/** Plain-language colour name for a B−V value (for the album cards). */
export function colourWord(bv) {
  if (bv === null || bv === undefined) return 'white';
  if (bv < 0) return 'blue-white';
  if (bv < 0.3) return 'white';
  if (bv < 0.8) return 'yellow-white';
  if (bv < 1.4) return 'orange';
  return 'red-orange';
}

// ---------------------------------------------------------------- one matrix for the whole sky
// Every sky object is a J2000 equatorial unit vector (from RA/Dec). A 3×3 matrix M turns it into
// a game-world direction (x, y = up, z). Game mode: equatorial → ecliptic → turned by θ.
// Live mode (ephemeris.js): equatorial → the Moon's real body frame → the south-pole horizon.
// Both end with the same "local → world" step, so the 3D sky and the telescope always agree.

/** RA/Dec (degrees) → unit vector (J2000 equatorial). */
export function eqVector(raDeg, decDeg) {
  const ra = raDeg * D2R;
  const dec = decDeg * D2R;
  return [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
}

const mul3 = (a, b) => {
  const m = new Array(9);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) m[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  return m;
};
export const applyM = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];

/** equatorial → ecliptic (J2000) */
const ECL_FROM_EQ = (() => {
  const e = OBLIQUITY_DEG * D2R;
  return [1, 0, 0, 0, Math.cos(e), Math.sin(e), 0, -Math.sin(e), Math.cos(e)];
})();

/**
 * "Local" frame (x toward azimuth −offset, up = −z) → game world (y up; azimuth 0 = −Z, 90 = +X).
 * az = atan2(ly, lx) + offset, alt = asin(−lz). A proper rotation (det +1): never mirrored.
 */
export function localToWorld(offsetDeg) {
  const s = Math.sin(offsetDeg * D2R);
  const c = Math.cos(offsetDeg * D2R);
  return [s, c, 0, 0, 0, -1, -c, s, 0];
}

/** Game-time sky: the ecliptic frame turned by θ (azimuth = λ + θ, altitude = −β). */
export const gameSkyMatrix = (turnDeg) => mul3(localToWorld(turnDeg), ECL_FROM_EQ);

/** Live sky: B = equatorial → Moon body frame (ephemeris.js); body 0° meridian at azimuth offsetDeg. */
export const liveSkyMatrix = (B, offsetDeg) => mul3(localToWorld(offsetDeg), B);

/** World direction → { az, alt } (game convention). */
export function worldAzAlt(w) {
  const l = Math.hypot(w[0], w[1], w[2]) || 1;
  return { az: wrap360(Math.atan2(w[0], -w[2]) * R2D), alt: Math.asin(w[1] / l) * R2D };
}

/** Where a RA/Dec object is on the sky right now (matrix M from getSun().skyMatrix). */
export const placeOnSky = (M, raDeg, decDeg) => worldAzAlt(applyM(M, eqVector(raDeg, decDeg)));
