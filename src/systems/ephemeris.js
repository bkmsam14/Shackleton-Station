// ephemeris.js — the REAL sky over the Moon's south pole at any date ("Live sky"). PURE LOGIC.
//
//  - Sun: USNO "approximate solar coordinates" (aa.usno.navy.mil/faq/sun_approx, ~1′).
//  - Moon (to know where Earth is from the Moon): Astronomical Almanac low-precision formulae
//    (~0.3° in longitude).
//  - Moon orientation: IAU WGCCRE model as published by NASA JPL NAIF (pck00011.tpc, BODY301_*):
//    the Moon's pole direction and how far it has turned (W), with the periodic terms E1–E13.
// Checked against NASA JPL Horizons (observer on the Moon at 90°S) in tests/ephemeris.test.js.
//
// Local frame at the south pole: "up" is −Z of the Moon's body frame; azimuth 0 points along the
// 0° longitude meridian (toward Earth, on average) and grows toward 90°E — the same as Horizons.
import { SKY } from '../config/gameplay.js';

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const AU_KM = 149597870.7;
const EARTH_RADIUS_KM = 6378.14;
const MOON_RADIUS_KM = 1737.4; // NASA Moon Fact Sheet (volumetric mean radius)
const J2000_OBLIQUITY = 23.4393; // IAU

const sinD = (a) => Math.sin(a * D2R);
const cosD = (a) => Math.cos(a * D2R);
const wrap360 = (a) => ((a % 360) + 360) % 360;

/** Days and Julian centuries since J2000.0 (UTC used as TT: the ~70 s difference is left out). */
export function j2000(dateMs) {
  const d = dateMs / 86400000 + 2440587.5 - 2451545.0;
  return { d, T: d / 36525 };
}

/** ecliptic (of date) lon/lat → J2000 equatorial unit-vector scaled by r. Precession: −1.397°/century in longitude. */
function eclDateToEqJ2000(lonDeg, latDeg, r, T) {
  const lon = lonDeg - 1.3969713 * T;
  const x = r * cosD(latDeg) * cosD(lon);
  const y = r * cosD(latDeg) * sinD(lon);
  const z = r * sinD(latDeg);
  const e = J2000_OBLIQUITY;
  return [x, y * cosD(e) - z * sinD(e), y * sinD(e) + z * cosD(e)];
}

/** Geocentric Sun (km, J2000 equatorial). USNO approximate solar coordinates. */
export function sunGeocentric(dateMs) {
  const { d, T } = j2000(dateMs);
  const g = wrap360(357.529 + 0.98560028 * d);
  const q = wrap360(280.459 + 0.98564736 * d);
  const L = q + 1.915 * sinD(g) + 0.02 * sinD(2 * g);
  const R = 1.00014 - 0.01671 * cosD(g) - 0.00014 * cosD(2 * g);
  return eclDateToEqJ2000(L, 0, R * AU_KM, T);
}

/** Geocentric Moon (km, J2000 equatorial). Astronomical Almanac low-precision formulae. */
export function moonGeocentric(dateMs) {
  const { T } = j2000(dateMs);
  const lon =
    218.32 +
    481267.881 * T +
    6.29 * sinD(135.0 + 477198.87 * T) -
    1.27 * sinD(259.3 - 413335.36 * T) +
    0.66 * sinD(235.7 + 890534.22 * T) +
    0.21 * sinD(269.9 + 954397.74 * T) -
    0.19 * sinD(357.5 + 35999.05 * T) -
    0.11 * sinD(186.5 + 966404.03 * T);
  const lat =
    5.13 * sinD(93.3 + 483202.02 * T) +
    0.28 * sinD(228.2 + 960400.89 * T) -
    0.28 * sinD(318.3 + 6003.15 * T) -
    0.17 * sinD(217.6 - 407332.21 * T);
  const parallax =
    0.9508 +
    0.0518 * cosD(135.0 + 477198.87 * T) +
    0.0095 * cosD(259.3 - 413335.36 * T) +
    0.0078 * cosD(235.7 + 890534.22 * T) +
    0.0028 * cosD(269.9 + 954397.74 * T);
  return eclDateToEqJ2000(wrap360(lon), lat, EARTH_RADIUS_KM / sinD(parallax), T);
}

// IAU / NAIF pck00011: BODY3_NUT_PREC_ANGLES (deg, deg per Julian century)
const E_ANGLES = [
  [125.045, -1935.5364525],
  [250.089, -3871.072905],
  [260.008, 475263.3328725],
  [176.625, 487269.629985],
  [357.529, 35999.0509575],
  [311.589, 964468.49931],
  [134.963, 477198.869325],
  [276.617, 12006.300765],
  [34.226, 63863.5132425],
  [15.134, -5806.6093575],
  [119.743, 131.84064],
  [239.961, 6003.1503825],
  [25.053, 473327.79642],
];
const NUT_RA = [-3.8787, -0.1204, 0.07, -0.0172, 0, 0.0072, 0, 0, 0, -0.0052, 0, 0, 0.0043];
const NUT_DEC = [1.5419, 0.0239, -0.0278, 0.0068, 0, -0.0029, 0.0009, 0, 0, 0.0008, 0, 0, -0.0009];
const NUT_PM = [3.561, 0.1208, -0.0642, 0.0158, 0.0252, -0.0066, -0.0047, -0.0046, 0.0028, 0.0052, 0.004, 0.0019, -0.0044];

/** The Moon's orientation: pole RA/Dec and prime-meridian angle W (degrees), IAU model. */
export function moonOrientation(dateMs) {
  const { d, T } = j2000(dateMs);
  let ra = 269.9949 + 0.0031 * T;
  let dec = 66.5392 + 0.013 * T;
  let w = 38.3213 + 13.17635815 * d - 1.4e-12 * d * d;
  E_ANGLES.forEach(([a0, rate], i) => {
    const E = a0 + rate * T;
    ra += NUT_RA[i] * sinD(E);
    dec += NUT_DEC[i] * cosD(E);
    w += NUT_PM[i] * sinD(E);
  });
  return { ra, dec, w: wrap360(w) };
}

/** 3×3 rotation (row-major) J2000 equatorial → Moon body frame: Rz(W)·Rx(90°−δ)·Rz(90°+α). */
export function equatorialToMoonBody(dateMs) {
  const { ra, dec, w } = moonOrientation(dateMs);
  const rz = (a) => [cosD(a), sinD(a), 0, -sinD(a), cosD(a), 0, 0, 0, 1];
  const rx = (a) => [1, 0, 0, 0, cosD(a), sinD(a), 0, -sinD(a), cosD(a)];
  return mul(rz(w), mul(rx(90 - dec), rz(90 + ra)));
}

export function mul(a, b) {
  const m = new Array(9);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) m[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  return m;
}
export const apply = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];

/** Body-frame vector → az/alt at the south pole (Horizons convention: az from the 0° meridian toward 90°E). */
export function southPoleAzAlt(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return { az: wrap360(Math.atan2(v[1], v[0]) * R2D), alt: Math.asin(-v[2] / l) * R2D };
}

/** The real Sun and Earth seen from the Moon's south pole at this moment. */
export function liveSky(dateMs) {
  const B = equatorialToMoonBody(dateMs);
  const moon = moonGeocentric(dateMs);
  const sunGeo = sunGeocentric(dateMs);
  const sunFromMoon = [sunGeo[0] - moon[0], sunGeo[1] - moon[1], sunGeo[2] - moon[2]];
  const earthFromMoon = [-moon[0], -moon[1], -moon[2]];
  // you stand on the surface, 1,737 km "below" the Moon's centre (topocentric view)
  const fromSite = (v) => {
    const b = apply(B, v);
    return [b[0], b[1], b[2] + MOON_RADIUS_KM];
  };
  // Earth's phase seen from the Moon: the angle at Earth between the Sun and the Moon
  const dotSM = (sunGeo[0] * moon[0] + sunGeo[1] * moon[1] + sunGeo[2] * moon[2]) / (Math.hypot(...sunGeo) * Math.hypot(...moon));
  const earthLit = (1 + dotSM) / 2; // 1 = "full Earth", 0 = "new Earth"
  return { B, sun: southPoleAzAlt(fromSite(sunFromMoon)), earth: southPoleAzAlt(fromSite(earthFromMoon)), earthLit };
}

/**
 * Game azimuth from a Horizons-style azimuth: the 0° meridian (Earth's mean direction) is put at
 * SKY.EARTH_AZIMUTH_DEG so the base layout keeps Earth where the game always had it.
 * A rotation only (no mirror), so the sky keeps its real handedness.
 */
export const toGameAz = (az) => wrap360(az + SKY.EARTH_AZIMUTH_DEG);
