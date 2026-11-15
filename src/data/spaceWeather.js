// spaceWeather.js (data) — loads the Sun the player picked on the start screen.
//  - 'stormy' / 'calm': archived real data in public/data (made by scripts/fetch-space-weather.mjs)
//    → labelled "Replay of real data from …".
//  - 'live': the last 7 days from NASA DONKI (api.nasa.gov), fetched now → labelled "Live".
//    No RadLab in live mode (no measured strength yet), so storms use the default strength.
//    If the live fetch fails, we fall back to the Stormy Sun replay and say so.
// API key: VITE_NASA_API_KEY from .env (never committed), else NASA's shared DEMO_KEY.
import { parseFlareNotification, buildStorms, scheduleStorms } from '../systems/spaceWeather.js';

const ARCHIVES = {
  stormy: 'space-weather-2024-05.json',
  calm: 'space-weather-2019-12.json',
};
export const SUN_MODES = ['calm', 'stormy', 'live'];
const DAY_MS = 24 * 3600 * 1000;

async function getJson(url, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return text ? JSON.parse(text) : [];
  } finally {
    clearTimeout(t);
  }
}

async function loadArchive(mode) {
  const data = await getJson(`${import.meta.env.BASE_URL}data/${ARCHIVES[mode]}`);
  const label = mode === 'calm' ? 'Replay of real data from December 2019 (calm Sun)' : 'Replay of real data from May 2024 (stormy Sun)';
  return { mode, data, label, live: false };
}

async function loadLive() {
  const key = import.meta.env.VITE_NASA_API_KEY || 'DEMO_KEY';
  const end = new Date();
  const start = new Date(end.getTime() - 7 * DAY_MS);
  const d = (x) => x.toISOString().slice(0, 10);
  const base = 'https://api.nasa.gov/DONKI';
  const [notes, seps] = await Promise.all([
    getJson(`${base}/notifications?startDate=${d(start)}&endDate=${d(end)}&type=FLR&api_key=${key}`),
    getJson(`${base}/SEP?startDate=${d(start)}&endDate=${d(end)}&api_key=${key}`),
  ]);
  const flares = (notes ?? []).map((n) => parseFlareNotification(n.messageBody, n.messageURL)).filter(Boolean);
  const data = {
    id: 'live',
    replayStart: start.toISOString(),
    retrieved: d(end),
    flares: [...new Map(flares.map((f) => [f.activityID, f])).values()],
    seps: (Array.isArray(seps) ? seps : []).map((s) => ({
      id: s.sepID,
      time: s.eventTime,
      instruments: (s.instruments || []).map((i) => i.displayName),
      linked: (s.linkedEvents || []).map((l) => l.activityID),
    })),
    crater: [],
  };
  return { mode: 'live', data, label: `Live: real data from the last 7 days (${d(start)} to ${d(end)}), fetched now`, live: true };
}

/**
 * Load a Sun and turn it into a storm schedule.
 * Returns { mode, label, live, fellBack, data, schedule }.
 */
export async function loadSun(mode = 'stormy') {
  let sun;
  let fellBack = false;
  try {
    sun = mode === 'live' ? await loadLive() : await loadArchive(mode === 'calm' ? 'calm' : 'stormy');
  } catch (err) {
    console.warn(`[space weather] could not load "${mode}" — using the Stormy Sun replay`, err);
    sun = await loadArchive('stormy');
    fellBack = true;
  }
  const schedule = scheduleStorms(buildStorms(sun.data), sun.data.replayStart);
  return { ...sun, fellBack, schedule };
}
