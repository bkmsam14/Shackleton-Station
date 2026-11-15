// fetch-stars.mjs — build public/data/stars-bsc.json from the Yale Bright Star Catalog
// (5th revised ed.), as hosted by NASA HEASARC (table "bsc5p"). Run once:
//   node scripts/fetch-stars.mjs
// Keeps only stars a person could see (V ≤ MAX_MAG) that can ever be above the horizon at the
// Moon's south pole (ecliptic latitude below +MAX_ECL_LAT_DEG; see src/systems/skyMath.js).
// No API key needed. The download is cached in scripts/.cache/ (gitignored).
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { eclipticFromEquatorial } from '../src/systems/skyMath.js';

const URL = 'https://heasarc.gsfc.nasa.gov/FTP/heasarc/dbase/tdat_files/heasarc_bsc5p.tdat.gz';
const MAX_MAG = 5.5; // about the faintest stars a person can see with no light pollution
const MAX_ECL_LAT_DEG = 3; // a little margin above the ecliptic (the Moon's axis is tilted ~1.5°)

const here = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(here, '.cache');
const cacheFile = join(cacheDir, 'heasarc_bsc5p.tdat.gz');
const outFile = join(here, '..', 'public', 'data', 'stars-bsc.json');

async function download() {
  if (existsSync(cacheFile)) return readFileSync(cacheFile);
  console.log('Downloading', URL);
  const res = await fetch(URL);
  if (!res.ok) throw new Error(`HEASARC download failed: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(cacheFile, buf);
  return buf;
}

function parseTdat(text) {
  const start = text.indexOf('<DATA>');
  if (start < 0) throw new Error('Not a TDAT file (no <DATA> section)');
  const header = text.slice(0, start);
  const cols = header.match(/line\[1\] = (.*)/)?.[1].trim().split(/\s+/);
  if (!cols) throw new Error('TDAT header has no line[1] column list');
  return text
    .slice(start + 7)
    .split('\n')
    .filter((l) => l.includes('|'))
    .map((l) => {
      const v = l.split('|');
      const row = {};
      cols.forEach((c, i) => (row[c] = v[i]?.trim() ?? ''));
      return row;
    });
}

const rows = parseTdat(gunzipSync(await download()).toString('latin1'));
const stars = [];
for (const r of rows) {
  const ra = Number(r.ra);
  const dec = Number(r.dec);
  const mag = Number(r.vmag);
  if (!r.hr || !Number.isFinite(ra) || !Number.isFinite(dec) || !Number.isFinite(mag) || r.vmag === '') continue;
  if (mag > MAX_MAG) continue;
  if (eclipticFromEquatorial(ra, dec).lat > MAX_ECL_LAT_DEG) continue;
  const bv = r.bv_color === '' ? null : Number(r.bv_color);
  // [HR number, RA°, Dec° (J2000), V magnitude, B−V colour index or null]
  stars.push([Number(r.hr), +ra.toFixed(4), +dec.toFixed(4), +mag.toFixed(2), bv === null ? null : +bv.toFixed(2)]);
}
stars.sort((a, b) => a[3] - b[3]); // brightest first

const out = {
  source: 'Yale Bright Star Catalog, 5th revised edition (Hoffleit & Warren 1991), via NASA HEASARC (bsc5p)',
  url: 'https://heasarc.gsfc.nasa.gov/W3Browse/star-catalog/bsc5p.html',
  note: `Stars with V ≤ ${MAX_MAG} that can be seen from the Moon's south pole. Columns: hr, ra, dec (J2000, degrees), vmag, bv.`,
  columns: ['hr', 'ra', 'dec', 'vmag', 'bv'],
  stars,
};
writeFileSync(outFile, JSON.stringify(out));
console.log(`Wrote ${stars.length} stars to ${outFile}`);
