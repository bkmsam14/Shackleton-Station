import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parseFlareNotification,
  flareRank,
  buildStorms,
  scheduleStorms,
  intensityFromRatio,
  quietLevel,
} from '../src/systems/spaceWeather.js';
import { RADIATION } from '../src/config/gameplay.js';

const ALERT = `## Message Type: Space Weather Notification - M9.5 Flare
## Summary:
Significant flare detected by GOES.
Flare start time: 2024-04-30T23:23Z.
Flare peak time: 2024-04-30T23:46Z.
Flare intensity: M9.5 class.
Source region: S06W63 (Active Region 13654) (based on SDO imagery).
Activity ID: 2024-04-30T23:23:00-FLR-001.`;

test('parses a real DONKI flare alert', () => {
  assert.deepEqual(parseFlareNotification(ALERT, 'u'), {
    activityID: '2024-04-30T23:23:00-FLR-001',
    classType: 'M9.5',
    start: '2024-04-30T23:23Z',
    peak: '2024-04-30T23:46Z',
    region: 'AR 13654',
    url: 'u',
  });
  assert.equal(parseFlareNotification('## Message Type: CME'), null);
  assert.equal(parseFlareNotification(undefined), null);
});

test('flare classes compare like the real scale (X > M > C)', () => {
  assert.ok(flareRank('X1.0') > flareRank('M9.9'));
  assert.ok(flareRank('X5.8') > flareRank('X2.2'));
  assert.equal(flareRank('?'), 0);
});

const data = {
  flares: [
    { activityID: '2024-05-11T01:10:00-FLR-001', classType: 'X5.8', peak: '2024-05-11T01:23Z' },
    { activityID: '2024-05-09T08:45:00-FLR-001', classType: 'X2.2', peak: '2024-05-09T09:13Z' },
  ],
  seps: [
    { time: '2024-05-11T02:10Z', instruments: ['GOES'], linked: ['2024-05-11T01:10:00-FLR-001'] },
    { time: '2024-05-11T04:07Z', instruments: ['STEREO A'], linked: ['2024-05-11T01:10:00-FLR-001'] },
    { time: '2024-05-09T13:59Z', instruments: ['ACE'], linked: ['2024-05-09T08:45:00-FLR-001'] },
  ],
  crater: [
    { day: '2024-05-07', mean: 5 },
    { day: '2024-05-08', mean: 5 },
    { day: '2024-05-09', mean: 10 },
    { day: '2024-05-11', mean: 1000 },
  ],
};

test('SEP records close in time become one storm, linked to its flare, strength from CRaTER', () => {
  const storms = buildStorms(data);
  assert.equal(storms.length, 2);
  const [a, b] = storms;
  assert.equal(a.flare.classType, 'X2.2');
  assert.ok(Math.abs(a.realLeadHours - (13 + 59 / 60 - (9 + 13 / 60))) < 1e-6);
  assert.equal(a.ratio, 2); // 10 / quiet 5
  assert.equal(b.flare.classType, 'X5.8');
  assert.deepEqual(b.instruments, ['GOES', 'STEREO A']);
  assert.equal(b.ratio, 200);
  assert.ok(b.intensity > a.intensity);
});

test('quiet level uses the days before the first storm', () => {
  assert.equal(quietLevel(data.crater, Date.parse('2024-05-09T13:59Z')), 5);
  assert.equal(quietLevel([], 0), null);
});

test('intensity: log scale, clamped, default when unknown', () => {
  assert.equal(intensityFromRatio(null), RADIATION.DEFAULT_INTENSITY);
  assert.equal(intensityFromRatio(1), RADIATION.MIN_INTENSITY);
  assert.equal(intensityFromRatio(RADIATION.RATIO_FOR_FULL_INTENSITY), 1);
  assert.equal(intensityFromRatio(1e9), 1);
});

test('schedule keeps real spacing; short real warnings get the minimum (and say so)', () => {
  const s = scheduleStorms(buildStorms(data), '2024-05-08T12:00:00Z');
  assert.equal(s.length, 2);
  assert.ok(Math.abs(s[0].arriveGameHour - 30.983) < 0.01); // 9 May 13:59 − Day 1 start (8 May 07:00 UTC) → Day 2, 13:59
  assert.equal(s[1].extraWarning, true); // real lead 0.78 h < minimum
  assert.ok(Math.abs(s[1].arriveGameHour - s[1].warnGameHour - RADIATION.MIN_WARNING_GAME_HOURS) < 1e-9);
});

test('the shipped Stormy Sun archive is real data with storms; every storm has a flare', () => {
  const real = JSON.parse(readFileSync(new URL('../public/data/space-weather-2024-05.json', import.meta.url), 'utf8'));
  assert.match(real.sources.donki, /DONKI/);
  assert.match(real.sources.radlab, /CRaTER/);
  const s = scheduleStorms(buildStorms(real), real.replayStart);
  assert.ok(s.length >= 3);
  for (const x of s) assert.ok(x.flare?.classType, x.id);
});
