// lola.js — read the real LOLA terrain (src/data/lolaTerrain.js) in GAME coordinates.
// Pure logic (no Three.js) so the height function and the Sun's horizon can be tested.
//
// Game ↔ map: the map uses lunar longitude (east +): direction (sin lon, cos lon). The game puts
// longitude 0 (Earth's mean direction) at azimuth SKY.EARTH_AZIMUTH_DEG, the same rotation the
// Live sky uses (systems/ephemeris.js toGameAz), so terrain, Sun and Earth all line up.
//   game azimuth = lon + EARTH_AZIMUTH;  world X = sin(az)·d, Z = −cos(az)·d
import { LOLA } from '../data/lolaTerrain.js';
import { SKY } from '../config/gameplay.js';

const D2R = Math.PI / 180;

function decode(b64) {
  const bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Int16Array(bytes.buffer);
}

const near = decode(LOLA.near.data);
const mid = decode(LOLA.mid.data);
const horizon = decode(LOLA.horizon.data);
const horizonFar = decode(LOLA.horizon.far);
const N = LOLA.near.size;
const HALF = (N - 1) / 2;
const SP = LOLA.near.spacingM;
const RINGS = LOLA.mid.rings;
const MAZ = LOLA.mid.az;
const c = Math.cos(SKY.EARTH_AZIMUTH_DEG * D2R);
const s = Math.sin(SKY.EARTH_AZIMUTH_DEG * D2R);

/** world (X, Z) → map metres (x east-ish, y toward lon 0) */
export function worldToMap(X, Z) {
  return { x: X * c + Z * s, y: X * s - Z * c };
}

export const NEAR_HALF_M = LOLA.near.halfM;

/** Height (m, relative to the base site) from the 5 m grid, or null outside it. */
export function nearHeight(X, Z) {
  const { x, y } = worldToMap(X, Z);
  const fi = HALF + x / SP;
  const fj = HALF - y / SP;
  if (fi < 0 || fj < 0 || fi > N - 1 || fj > N - 1) return null;
  const i0 = Math.min(N - 2, Math.floor(fi));
  const j0 = Math.min(N - 2, Math.floor(fj));
  const u = fi - i0;
  const v = fj - j0;
  const a = near[j0 * N + i0];
  const b = near[j0 * N + i0 + 1];
  const cc = near[(j0 + 1) * N + i0];
  const d = near[(j0 + 1) * N + i0 + 1];
  return (a + (b - a) * u + (cc - a) * v + (a - b - cc + d) * u * v) * LOLA.near.unitM;
}

/** Height (m, relative to the site, Moon's curvature included) from the 80 m polar grid. */
export function midHeight(X, Z) {
  const r = Math.hypot(X, Z);
  const { x, y } = worldToMap(X, Z);
  const lon = ((Math.atan2(x, y) / D2R) % 360 + 360) % 360;
  let k = 0;
  while (k < RINGS.length - 2 && RINGS[k + 1] < r) k++;
  const t = Math.max(0, Math.min(1, (r - RINGS[k]) / (RINGS[k + 1] - RINGS[k])));
  const fa = (lon / 360) * MAZ;
  const a0 = Math.floor(fa) % MAZ;
  const a1 = (a0 + 1) % MAZ;
  const u = fa - Math.floor(fa);
  const h = (kk, aa) => mid[kk * MAZ + aa];
  const lo = h(k, a0) + (h(k, a1) - h(k, a0)) * u;
  const hi = h(k + 1, a0) + (h(k + 1, a1) - h(k + 1, a0)) * u;
  return (lo + (hi - lo) * t) * LOLA.mid.unitM;
}

function profileAt(arr, gameAzDeg) {
  const lon = (((gameAzDeg - SKY.EARTH_AZIMUTH_DEG) % 360) + 360) % 360;
  const f = (lon / 360) * arr.length;
  const i0 = Math.floor(f) % arr.length;
  const i1 = (i0 + 1) % arr.length;
  const u = f - Math.floor(f);
  return (arr[i0] + (arr[i1] - arr[i0]) * u) * LOLA.horizon.unitDeg;
}

/** The real horizon's height (degrees) in this game azimuth, seen from the base (eye height). */
export const horizonDeg = (gameAzDeg) => profileAt(horizon, gameAzDeg);
/** Only the mountains beyond 45 km (drawn as the far skyline ring). */
export const farHorizonDeg = (gameAzDeg) => profileAt(horizonFar, gameAzDeg);

export const MID_MAX_M = RINGS[RINGS.length - 1];
export const SITE = LOLA.site;
