// days.js — the mission as a run of work shifts ("survive the day", owner's design Nov 2026).
// PURE LOGIC: no Three.js, no DOM.
//
//  - Day N runs from DAYS.START_HOUR to DAYS.END_HOUR on the base clock (6 real minutes).
//  - Survive to the end of the shift → the day is done. After the last day the mission is won.
//  - Overnight (skipped, DAYS.NIGHT_HOURS): oxygen, battery and the water tank refill to full as
//    a GAME RULE; hunger, inventory and crops carry over; plants grow one step.
//  - A gentle failure during a day is a "rescue": the day goes on, the rescue is counted.
import { DAYS, TIME, OXYGEN, POWER, ELECTROLYSIS } from '../config/gameplay.js';

const DAY_S = 86400;

/** Base-clock seconds at the start of day n (n from 1). */
export const dayStartSeconds = (n) => (n - 1) * DAY_S + DAYS.START_HOUR * 3600;

/** Where we are in the shift: { day, hourOfDay, secondsLeft (real), progress 0..1, over }. */
export function shiftInfo(gameSeconds) {
  const day = Math.floor(gameSeconds / DAY_S) + 1;
  const secOfDay = gameSeconds - (day - 1) * DAY_S;
  const end = DAYS.END_HOUR * 3600;
  const start = DAYS.START_HOUR * 3600;
  const left = Math.max(0, end - secOfDay);
  return {
    day,
    hourOfDay: secOfDay / 3600,
    secondsLeft: left / TIME.SCALE,
    progress: Math.min(1, Math.max(0, (secOfDay - start) / (end - start))),
    over: secOfDay >= end,
  };
}

/**
 * Hours of SHIFT time since the mission started (nights not counted). Ice spots, storms
 * etc. that count "game hours" keep using the continuous base clock; this is for the HUD/report.
 */
export function shiftHoursPlayed(gameSeconds) {
  const { day, hourOfDay } = shiftInfo(gameSeconds);
  const into = Math.min(DAYS.SHIFT_HOURS, Math.max(0, hourOfDay - DAYS.START_HOUR));
  return (day - 1) * DAYS.SHIFT_HOURS + into;
}

/** "3:05" for a real-seconds countdown. */
export function fmtCountdown(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Mission progress (saved): which day, rescues per day, done. */
export function createMission(saved = null) {
  const day = Number.isInteger(saved?.day) ? Math.min(DAYS.COUNT, Math.max(1, saved.day)) : 1;
  return {
    day,
    rescues: Array.isArray(saved?.rescues) ? saved.rescues.slice(0, DAYS.COUNT) : [],
    lightSeconds: 0, // grow lights on (with power) today, real seconds of play
    shiftSeconds: 0, // real seconds of play today
    won: Boolean(saved?.won),
    airlockFacts: Array.isArray(saved?.airlockFacts) ? saved.airlockFacts.filter((x) => typeof x === 'string') : [], // explained once per mission
  };
}

export function serializeMission(m) {
  return { day: m.day, rescues: m.rescues, won: m.won, airlockFacts: m.airlockFacts };
}

/** A gentle failure happened today. */
export function addRescue(m) {
  m.rescues[m.day - 1] = (m.rescues[m.day - 1] ?? 0) + 1;
}

/** Count today's play time and grow-light time (for overnight growth). */
export function stepMission(m, dt, { lightsOn = false } = {}) {
  if (!(dt > 0)) return;
  m.shiftSeconds += dt;
  if (lightsOn) m.lightSeconds += dt;
}

/** Did the plants get enough light today to grow tonight? */
export const plantsGrowTonight = (m, share) => m.shiftSeconds > 0 && m.lightSeconds / m.shiftSeconds >= share;

/** Stars for a day: 3 with no rescue, 2 with one, 1 otherwise (you still survived it). */
export const dayStars = (m, n) => {
  const r = m.rescues[n - 1] ?? 0;
  return r === 0 ? 3 : r === 1 ? 2 : 1;
};

/**
 * End the current day. Returns { finishedDay, won }. After the last day the mission is won;
 * otherwise the day counter moves on (the caller skips the night and refills).
 */
export function endDay(m) {
  const finishedDay = m.day;
  if (m.day >= DAYS.COUNT) {
    m.won = true;
    return { finishedDay, won: true };
  }
  m.day += 1;
  m.lightSeconds = 0;
  m.shiftSeconds = 0;
  return { finishedDay, won: false };
}

/**
 * The overnight refill (a GAME RULE, said so on the card): oxygen, battery and the
 * Electrolysis water tank go back to full. Hunger is NOT touched (it carries over).
 * Returns what was added, so the card can show it.
 */
export function overnightRefill(gauges, station) {
  const added = {
    o2Kg: ((100 - gauges.oxygen) / 100) * OXYGEN.CAPACITY_KG,
    kwh: POWER.BATTERY_CAPACITY_KWH - gauges.batteryKwh,
    waterKg: Math.max(0, ELECTROLYSIS.TANK_START_KG - station.tankKg),
  };
  gauges.oxygen = 100;
  gauges.batteryKwh = POWER.BATTERY_CAPACITY_KWH;
  station.tankKg = Math.max(station.tankKg, ELECTROLYSIS.TANK_START_KG);
  return added;
}
