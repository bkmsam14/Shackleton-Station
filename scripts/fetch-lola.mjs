// fetch-lola.mjs — real terrain for the base: NASA LRO LOLA elevation maps of the lunar south
// pole (PDS Geosciences Node, LOLA GDR polar products). Run once:
//   node scripts/fetch-lola.mjs
// Writes src/data/lolaTerrain.js (small, bundled with the game). Downloads are cached in
// scripts/.cache/ (gitignored). No account or key needed.
//
// The base sits on a flat, well-lit spot of the ridge ~450 m from the south pole (the pole itself
// lies on Shackleton's rim). The exact pole is only ~37 % sunlit and sloped ~10°: a nearby hill
// blocks the low Sun. SITE was picked by scanning the 80 m map within 4 km of the pole for the
// most sunlit, flattest point (see SCIENCE.md) — like real landing-site studies do.
//  - near:    LDEM_875S_5M (5 m/px) — ±NEAR_HALF_M around the pole, the ground you walk on
//             (only the needed rows are downloaded with an HTTP Range request);
//  - mid:     LDEM_80S_80M (80 m/px) — a polar grid out to MID_MAX_M (Shackleton's bowl, ridges);
//  - horizon: the highest elevation angle per azimuth out to HORIZON_MAX_M, with the Moon's
//             curvature — this is what really hides the low Sun.
// Map projection (from the PDS labels): polar stereographic, sphere R = 1737.4 km, centre 90°S,
// lon 0. x = (sample − offset)·scale, y = −(line − offset)·scale, lon = atan2(x, y) (east +).
// Verified: the Shackleton floor centre comes out at 89.66°S, 127.5°E.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/';
const R_MOON = 1737400; // m (label A_AXIS_RADIUS)
const NEAR = { file: 'ldem_875s_5m.img', n: 30336, scale: 5, offset: 15167.5 };
const MID = { file: 'ldem_80s_80m.img', n: 7600, scale: 80, offset: 3799.5 };
const NEAR_HALF_M = 400; // the near grid covers ±400 m
const MID_MAX_M = 45000;
const MID_RINGS = 72;
const MID_AZ = 256;
const HORIZON_AZ = 720;
const HORIZON_MAX_M = 290000; // the 80 m map reaches ~303 km from the pole
const EYE_M = 1.6; // astronaut eye height
const SITE = { x: -320, y: -320 }; // map metres from the pole (lon 225°, ~0.45 km away)

const here = dirname(fileURLToPath(import.meta.url));
const cache = join(here, '.cache');
mkdirSync(cache, { recursive: true });

async function fetchCached(name, url, headers = {}) {
  const path = join(cache, name);
  if (existsSync(path)) return readFileSync(path);
  console.log('Downloading', url, headers.Range ?? '');
  const res = await fetch(url, { headers });
  if (!res.ok && res.status !== 206) throw new Error(`${url}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(path, buf);
  return buf;
}

// ---------------------------------------------------------------- near (5 m, range request)
const nearPx = Math.round(NEAR_HALF_M / NEAR.scale); // 80
const centreLine = Math.round(NEAR.offset - SITE.y / NEAR.scale); // the site's line in the 5 m map
const line0 = centreLine - nearPx - 1;
const line1 = centreLine + nearPx + 1;
const rowBytes = NEAR.n * 2;
const nearBuf = await fetchCached(`near_${line0}_${line1}.bin`, BASE + NEAR.file, { Range: `bytes=${line0 * rowBytes}-${(line1 + 1) * rowBytes - 1}` });
const nearH = (line, sample) => nearBuf.readInt16LE(((line - line0) * NEAR.n + sample) * 2) * 0.5;
/** height (m) from the 5 m map at map metres (x east-ish, y), bilinear */
function nearAt(x, y) {
  const s = NEAR.offset + x / NEAR.scale;
  const l = NEAR.offset - y / NEAR.scale;
  const s0 = Math.floor(s);
  const l0 = Math.floor(l);
  const fs = s - s0;
  const fl = l - l0;
  const a = nearH(l0, s0);
  const b = nearH(l0, s0 + 1);
  const c = nearH(l0 + 1, s0);
  const d = nearH(l0 + 1, s0 + 1);
  return a + (b - a) * fs + (c - a) * fl + (a - b - c + d) * fs * fl;
}

// ---------------------------------------------------------------- mid + horizon (80 m)
const midBuf = await fetchCached(MID.file, BASE + MID.file);
const midH = (line, sample) => midBuf.readInt16LE((line * MID.n + sample) * 2) * 0.5;
function midAt(x, y) {
  const s = MID.offset + x / MID.scale;
  const l = MID.offset - y / MID.scale;
  const s0 = Math.max(0, Math.min(MID.n - 2, Math.floor(s)));
  const l0 = Math.max(0, Math.min(MID.n - 2, Math.floor(l)));
  const fs = s - s0;
  const fl = l - l0;
  const a = midH(l0, s0);
  const b = midH(l0, s0 + 1);
  const c = midH(l0 + 1, s0);
  const d = midH(l0 + 1, s0 + 1);
  return a + (b - a) * fs + (c - a) * fl + (a - b - c + d) * fs * fl;
}

const h0 = nearAt(SITE.x, SITE.y); // ground height at the base site (relative to the 1737.4 km sphere)
console.log(`Ground at the base site: ${h0.toFixed(1)} m above the 1737.4 km reference sphere`);

// near grid: (2·nearPx+1)² samples, row = map y from +400 to −400, col = map x from −400 to +400
const nn = nearPx * 2 + 1;
const near = new Int16Array(nn * nn);
for (let j = 0; j < nn; j++) {
  for (let i = 0; i < nn; i++) {
    const x = (i - nearPx) * NEAR.scale;
    const y = (nearPx - j) * NEAR.scale;
    near[j * nn + i] = Math.round((nearAt(SITE.x + x, SITE.y + y) - h0) * 10); // decimetres relative to the site
  }
}

// mid polar grid: rings log-spaced from NEAR_HALF_M·0.8 to MID_MAX_M; heights include the
// curvature drop (d²/2R) so the bowl and ridges sit at the right angles
const ringR = [];
for (let k = 0; k < MID_RINGS; k++) ringR.push(NEAR_HALF_M * 0.8 * Math.pow(MID_MAX_M / (NEAR_HALF_M * 0.8), k / (MID_RINGS - 1)));
const mid = new Int16Array(MID_RINGS * MID_AZ);
for (let k = 0; k < MID_RINGS; k++) {
  for (let a = 0; a < MID_AZ; a++) {
    const lon = (a / MID_AZ) * 2 * Math.PI; // map direction: lon (east +), x = sin, y = cos
    const r = ringR[k];
    const h = midAt(SITE.x + r * Math.sin(lon), SITE.y + r * Math.cos(lon)) - h0 - (r * r) / (2 * R_MOON);
    mid[k * MID_AZ + a] = Math.max(-32768, Math.min(32767, Math.round(h))); // metres
  }
}

// horizon: max elevation angle per azimuth (map lon), marching outward with curvature
const horizon = new Int16Array(HORIZON_AZ);
const horizonFar = new Int16Array(HORIZON_AZ); // only terrain beyond MID_MAX_M (drawn as a far ring)
for (let a = 0; a < HORIZON_AZ; a++) {
  const lon = (a / HORIZON_AZ) * 2 * Math.PI;
  let best = -90;
  let bestFar = -90;
  for (let d = 30; d < HORIZON_MAX_M; d += d < 2000 ? 10 : d < 20000 ? 40 : 80) {
    const px = SITE.x + d * Math.sin(lon);
    const py = SITE.y + d * Math.cos(lon);
    const h = d < NEAR_HALF_M - 10 ? nearAt(px, py) : midAt(px, py);
    const ang = (Math.atan2(h - h0 - EYE_M - (d * d) / (2 * R_MOON), d) * 180) / Math.PI;
    if (ang > best) best = ang;
    if (d > MID_MAX_M && ang > bestFar) bestFar = ang;
  }
  horizon[a] = Math.round(best * 100); // centi-degrees
  horizonFar[a] = Math.round(bestFar * 100);
}
const hz = [...horizon].map((v) => v / 100);
console.log(`Horizon: ${Math.min(...hz).toFixed(2)}° … ${Math.max(...hz).toFixed(2)}° (mean ${(hz.reduce((s, v) => s + v, 0) / hz.length).toFixed(2)}°)`);
for (const el of [0, 0.75, 1.5]) console.log(`  Sun at ${el}°: visible from ${((hz.filter((v) => v < el).length / hz.length) * 100).toFixed(0)}% of directions`);

const b64 = (arr) => Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString('base64');
const out = `// lolaTerrain.js — GENERATED by scripts/fetch-lola.mjs. Do not edit by hand.
// Real terrain around the lunar south pole (90°S, on the rim of Shackleton crater) from NASA's
// Lunar Reconnaissance Orbiter LOLA laser altimeter (PDS Geosciences Node, LOLA GDR polar:
// ${NEAR.file} and ${MID.file}). Heights are relative to the ground at the base site.
// Map directions use lunar longitude (east positive): x = sin(lon), y = cos(lon).
export const LOLA = {
  source: 'NASA LRO LOLA (Smith et al.), PDS Geosciences Node — LDEM_875S_5M and LDEM_80S_80M',
  url: 'https://pds-geosciences.wustl.edu/missions/lro/lola.htm',
  siteHeightM: ${h0.toFixed(1)}, // above the 1737.4 km reference sphere
  site: { x: ${SITE.x}, y: ${SITE.y}, fromPoleM: ${Math.round(Math.hypot(SITE.x, SITE.y))}, lonDeg: ${(((Math.atan2(SITE.x, SITE.y) * 180) / Math.PI + 360) % 360).toFixed(1)} },
  near: { size: ${nn}, spacingM: ${NEAR.scale}, halfM: ${nearPx * NEAR.scale}, unitM: 0.1, data: '${b64(near)}' },
  mid: { rings: ${JSON.stringify(ringR.map((r) => Math.round(r)))}, az: ${MID_AZ}, unitM: 1, data: '${b64(mid)}' },
  horizon: { az: ${HORIZON_AZ}, unitDeg: 0.01, data: '${b64(horizon)}', far: '${b64(horizonFar)}' },
  eyeM: ${EYE_M},
};
`;
const outFile = join(here, '..', 'src', 'data', 'lolaTerrain.js');
writeFileSync(outFile, out);
console.log(`Wrote ${outFile} (${(out.length / 1024).toFixed(0)} KB)`);
