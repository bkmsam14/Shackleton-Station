// fetch-space-weather.mjs — download the real space-weather data the game replays and save
// compact archives in public/data/. Run:  node scripts/fetch-space-weather.mjs
//
// Sources (both required by the team brief, see CLAUDE.md):
//  - NASA DONKI (via api.nasa.gov): flare alerts (notifications, type=FLR) and solar
//    energetic particle events (SEP). The plain FLR endpoint currently returns 404 on
//    api.nasa.gov, so flare class/times are read from DONKI's official flare alerts.
//  - NASA OSDR RadLab: absorbed dose rate measured by CRaTER on the Lunar Reconnaissance
//    Orbiter (in orbit around the Moon) — daily mean and max.
// API key: NASA_API_KEY env var, else DEMO_KEY (rate-limited, ~30 requests per hour per IP).
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseFlareNotification } from '../src/systems/spaceWeather.js';

const KEY = process.env.NASA_API_KEY || 'DEMO_KEY';
const OUT = new URL('../public/data/', import.meta.url);
// Raw API responses are cached here (not committed), so re-runs don't burn the rate limit.
const CACHE = new URL('./.cache/', import.meta.url);
const cacheFile = (url) => new URL(createHash('sha1').update(url.replace(`api_key=${KEY}`, '')).digest('hex').slice(0, 16) + '.json', CACHE);

const MONTHS = [
  {
    file: 'space-weather-2024-05.json',
    id: 'stormy',
    label: 'Stormy Sun — May 2024',
    donki: ['2024-05-01', '2024-05-31'],
    radlab: ['2024-05-06', '2024-05-18'],
    replayStart: '2024-05-08T12:00:00Z', // game day 1 starts here (just before the first storm)
  },
  {
    file: 'space-weather-2019-12.json',
    id: 'calm',
    label: 'Calm Sun — December 2019',
    donki: ['2019-12-01', '2019-12-31'],
    radlab: ['2019-12-01', '2019-12-31'],
    replayStart: '2019-12-08T12:00:00Z',
  },
];

async function getJson(url, tries = 3) {
  const cached = cacheFile(url);
  if (existsSync(cached)) return JSON.parse(readFileSync(cached, 'utf8'));
  for (let i = 1; i <= tries; i++) {
    const res = await fetch(url);
    if (res.ok) {
      const text = await res.text();
      const json = text ? JSON.parse(text) : [];
      mkdirSync(CACHE, { recursive: true });
      writeFileSync(cached, JSON.stringify(json));
      return json;
    }
    console.warn(`  ${res.status} for ${url.replace(KEY, '***')} (try ${i}/${tries})`);
    if (i < tries) await new Promise((r) => setTimeout(r, 4000 * i));
  }
  throw new Error(`Failed: ${url.replace(KEY, '***')}`);
}

async function getTsv(url) {
  const res = await fetch(url);
  const text = await res.text();
  if (!res.ok || text.startsWith('<')) throw new Error(`RadLab ${res.status}: ${text.replace(/<[^>]*>/g, ' ').slice(0, 200)}`);
  const [head, ...rows] = text.trim().split('\n');
  const cols = head.split('\t');
  return rows.map((r) => Object.fromEntries(r.split('\t').map((v, i) => [cols[i], v.replace(/"/g, '')])));
}

for (const m of MONTHS) {
  console.log(`\n== ${m.label}`);
  const [a, b] = m.donki;
  const notes = await getJson(`https://api.nasa.gov/DONKI/notifications?startDate=${a}&endDate=${b}&type=FLR&api_key=${KEY}`);
  const flares = notes.map((n) => parseFlareNotification(n.messageBody, n.messageURL)).filter(Boolean);
  // one alert can be re-issued: keep one entry per flare activity
  const uniqueFlares = [...new Map(flares.map((f) => [f.activityID, f])).values()].sort((x, y) => x.peak.localeCompare(y.peak));
  const seps = await getJson(`https://api.nasa.gov/DONKI/SEP?startDate=${a}&endDate=${b}&api_key=${KEY}`);
  const sepList = (Array.isArray(seps) ? seps : []).map((s) => ({
    id: s.sepID,
    time: s.eventTime,
    instruments: (s.instruments || []).map((i) => i.displayName),
    linked: (s.linkedEvents || []).map((l) => l.activityID),
    link: s.link,
  }));
  console.log(`  DONKI: ${uniqueFlares.length} flares (from ${notes.length} alerts), ${sepList.length} SEP records`);

  const [r1, r2] = m.radlab;
  // RadLab's "fields+=" (add fields to the defaults) needs a literal "+", so the URL is built
  // by hand instead of with URLSearchParams (which would encode it as %2B).
  const query = encodeURIComponent(`(timestamp>=${r1})AND(timestamp<${r2})AND(instrument_family=CRaTER)`);
  const radlabUrl = `https://visualization.osdr.nasa.gov/radlab/api/?query=${query}&fields+=absorbed_dose_rate,instrument_family&format=tsv`;
  const rows = await getTsv(radlabUrl);
  const byDay = {};
  for (const r of rows) {
    const v = Number(r.absorbed_dose_rate);
    if (!Number.isFinite(v)) continue;
    (byDay[r.timestamp.slice(0, 10)] ??= []).push(v);
  }
  const crater = Object.entries(byDay)
    .sort(([x], [y]) => x.localeCompare(y))
    .map(([day, v]) => ({ day, mean: +(v.reduce((s, x) => s + x, 0) / v.length).toFixed(2), max: +Math.max(...v).toFixed(2), n: v.length }));
  console.log(`  RadLab CRaTER: ${rows.length} readings over ${crater.length} days`);

  const data = {
    id: m.id,
    label: m.label,
    replayStart: m.replayStart,
    retrieved: new Date().toISOString().slice(0, 10),
    note: 'Replay of real data. DONKI calls its products "preliminary NASA research products" — shown in the game as "based on".',
    sources: {
      donki: 'NASA DONKI (CCMC) via api.nasa.gov — https://ccmc.gsfc.nasa.gov/donki/',
      radlab:
        'NASA OSDR RadLab — CRaTER on the Lunar Reconnaissance Orbiter (Moon orbit), absorbed dose rate in its detector, µGy/h — https://visualization.osdr.nasa.gov/radlab/gui/overview/',
      radlabQuery: radlabUrl,
    },
    flares: uniqueFlares,
    seps: sepList,
    crater,
  };
  mkdirSync(OUT, { recursive: true });
  writeFileSync(new URL(m.file, OUT), JSON.stringify(data, null, 1) + '\n');
  console.log(`  wrote public/data/${m.file}`);
}
