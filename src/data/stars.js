// stars.js — loads the real star catalog (public/data/stars-bsc.json, made by
// scripts/fetch-stars.mjs from the Yale Bright Star Catalog via NASA HEASARC) and converts
// each star to ecliptic coordinates once, for the Moon-south-pole sky (systems/skyMath.js).
import { eclipticFromEquatorial } from '../systems/skyMath.js';

let cache = null;

/** → Promise<{ stars: [{hr, lon, lat, mag, bv}], byHr: Map, source, url }> (null on failure) */
export function loadStars() {
  if (cache) return cache;
  cache = fetch(`${import.meta.env.BASE_URL}data/stars-bsc.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`stars-bsc.json: HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => {
      const stars = data.stars.map(([hr, ra, dec, mag, bv]) => {
        const e = eclipticFromEquatorial(ra, dec);
        return { hr, ra, dec, lon: e.lon, lat: e.lat, mag, bv };
      });
      return { stars, byHr: new Map(stars.map((s) => [s.hr, s])), source: data.source, url: data.url };
    })
    .catch((err) => {
      console.warn('[stars] could not load the star catalog — the sky stays empty', err);
      cache = null; // allow a retry later
      return null;
    });
  return cache;
}
