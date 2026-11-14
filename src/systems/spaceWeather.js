// spaceWeather.js — turns real NASA space-weather data into the game's particle storms.
// PURE LOGIC: no DOM, no Three.js (used by the game, the fetch script and the tests).
//
//  - DONKI flare alerts (text) → { activityID, classType, start, peak, region }
//  - DONKI SEP records: several instruments report the same particle storm, so records
//    close in time are grouped into one storm.
//  - Storm strength comes from RadLab: CRaTER's daily mean dose rate at the Moon on the
//    storm day, divided by the quiet level before the storms (a real ratio).
//  - Timeline: real hours after the replay start = game hours after the game start (the
//    same 360× sped-up clock as life support), so the real spacing between storms is kept.
import { RADIATION } from '../config/gameplay.js';

const HOUR_MS = 3600 * 1000;

/** Parse one DONKI flare alert message. Returns null if it isn't a flare alert. */
export function parseFlareNotification(body, url = null) {
  if (typeof body !== 'string') return null;
  const cls = body.match(/Flare intensity:\s*([ABCMX]\d+(?:\.\d+)?)\s*class/i);
  const start = body.match(/Flare start time:\s*(\d{4}-\d\d-\d\dT\d\d:\d\dZ)/i);
  const peak = body.match(/Flare peak time:\s*(\d{4}-\d\d-\d\dT\d\d:\d\dZ)/i);
  const id = body.match(/Activity ID:\s*([0-9T:\-]+-FLR-\d+)/i);
  if (!cls || !peak || !id) return null;
  const region = body.match(/Active Region (\d+)/i);
  return {
    activityID: id[1],
    classType: cls[1].toUpperCase(),
    start: start ? start[1] : null,
    peak: peak[1],
    region: region ? `AR ${region[1]}` : null,
    url,
  };
}

/** Flare class → a number for comparing strength (X1 > M9.9 > C…). */
export function flareRank(classType) {
  const m = /^([ABCMX])(\d+(?:\.\d+)?)/.exec(classType ?? '');
  if (!m) return 0;
  return { A: 1, B: 10, C: 100, M: 1000, X: 10000 }[m[1]] * Number(m[2]);
}

const activityTime = (id) => {
  const m = /^(\d{4}-\d\d-\d\dT\d\d:\d\d)/.exec(id ?? '');
  return m ? Date.parse(m[1] + 'Z') : NaN;
};

/**
 * Group SEP records into storms and attach the triggering flare and the measured strength.
 * data: { flares, seps, crater } (as saved by scripts/fetch-space-weather.mjs)
 */
export function buildStorms(data, cfg = RADIATION) {
  const seps = [...(data.seps ?? [])].filter((s) => s.time).sort((a, b) => a.time.localeCompare(b.time));
  const groups = [];
  for (const s of seps) {
    const t = Date.parse(s.time);
    const last = groups[groups.length - 1];
    if (last && t - last.end <= cfg.SEP_GROUP_HOURS * HOUR_MS) {
      last.end = t;
      last.records.push(s);
    } else {
      groups.push({ start: t, end: t, records: [s] });
    }
  }
  const flaresById = new Map((data.flares ?? []).map((f) => [f.activityID, f]));
  const crater = data.crater ?? [];
  const quiet = quietLevel(crater, groups[0]?.start);

  return groups.map((g, i) => {
    const linkedFlares = g.records
      .flatMap((r) => r.linked ?? [])
      .filter((id) => /-FLR-/.test(id))
      .map((id) => flaresById.get(id) ?? { activityID: id, classType: null, peak: null })
      // the flare closest before the storm is the most likely trigger
      .filter((f) => !Number.isNaN(activityTime(f.activityID)) && activityTime(f.activityID) <= g.start);
    linkedFlares.sort((a, b) => activityTime(b.activityID) - activityTime(a.activityID));
    const flare = linkedFlares[0] ?? null;
    const flareTime = flare ? Date.parse(flare.peak ?? '') || activityTime(flare.activityID) : NaN;
    const day = new Date(g.start).toISOString().slice(0, 10);
    const measured = crater.find((c) => c.day === day);
    const ratio = measured && quiet ? measured.mean / quiet : null;
    return {
      id: `storm-${i + 1}`,
      arrival: new Date(g.start).toISOString(), // first particles detected (real time)
      instruments: [...new Set(g.records.flatMap((r) => r.instruments ?? []))],
      flare: flare && { activityID: flare.activityID, classType: flare.classType, peak: flare.peak, region: flare.region ?? null },
      realLeadHours: Number.isNaN(flareTime) ? null : Math.max(0, (g.start - flareTime) / HOUR_MS),
      measured: measured ? { day, meanUGyH: measured.mean, quietUGyH: quiet } : null,
      ratio, // how many times the quiet dose rate (CRaTER at the Moon), or null if unknown
      intensity: intensityFromRatio(ratio, cfg),
    };
  });
}

/** Quiet (pre-storm) CRaTER level: mean of the days before the first storm, else the median. */
export function quietLevel(crater, firstStormMs) {
  if (!crater.length) return null;
  const before = Number.isFinite(firstStormMs) ? crater.filter((c) => Date.parse(c.day + 'T00:00:00Z') + 24 * HOUR_MS <= firstStormMs) : [];
  const pick = before.length ? before : [...crater].sort((a, b) => a.mean - b.mean).slice(0, Math.ceil(crater.length / 2));
  return pick.reduce((s, c) => s + c.mean, 0) / pick.length;
}

/** Storm strength 0..1 for the game, from the real ratio (log scale; unknown → default). */
export function intensityFromRatio(ratio, cfg = RADIATION) {
  if (!ratio || !Number.isFinite(ratio)) return cfg.DEFAULT_INTENSITY;
  const t = Math.log10(Math.max(1, ratio)) / Math.log10(cfg.RATIO_FOR_FULL_INTENSITY);
  return Math.min(1, Math.max(cfg.MIN_INTENSITY, t));
}

/**
 * Put storms on the game clock. Real hours after replayStart = game hours after the game
 * start. The warning comes when the flare was seen; kids always get at least
 * MIN_WARNING_GAME_HOURS (more than reality for fast storms — the game says so).
 */
export function scheduleStorms(storms, replayStart, cfg = RADIATION) {
  const t0 = Date.parse(replayStart);
  return storms
    .map((s) => {
      const arriveH = (Date.parse(s.arrival) - t0) / HOUR_MS;
      const realLead = s.realLeadHours ?? cfg.DEFAULT_LEAD_GAME_HOURS;
      const lead = Math.max(cfg.MIN_WARNING_GAME_HOURS, Math.min(realLead, cfg.MAX_WARNING_GAME_HOURS));
      return { ...s, arriveGameHour: arriveH, warnGameHour: arriveH - lead, extraWarning: lead > realLead + 1e-9 };
    })
    .filter((s) => s.arriveGameHour > cfg.MIN_WARNING_GAME_HOURS) // storms before the game starts are skipped
    .sort((a, b) => a.arriveGameHour - b.arriveGameHour);
}
