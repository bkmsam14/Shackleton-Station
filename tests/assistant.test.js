import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAssistant } from '../src/systems/assistant.js';
import { ASSISTANT } from '../src/config/gameplay.js';
import * as LINES from '../src/data/voltLines.js';
import { DATABANK } from '../src/data/databank.js';

function memoryStore(initial = {}) {
  let data = { ...initial };
  return { load: () => data, save: (p) => (data = { ...data, ...p }) };
}
const play = (extra = {}) => ({ mode: 'playing', moved: 0, nearArray: false, oxygen: 60, food: 90, power: 70, tankKg: 10, zoneId: 'habitat', ...extra });

/** Step until a line comes out (or give up). */
function runUntilLine(a, snap = play(), maxSeconds = 400, dt = 0.5) {
  for (let t = 0; t < maxSeconds; t += dt) {
    const l = a.step(dt, snap);
    if (l) return l;
  }
  return null;
}

test('tour starts with step 1 and only advances on the right action', () => {
  const a = createAssistant({ store: memoryStore() });
  a.startIfNeeded();
  const first = runUntilLine(a);
  assert.equal(first.id, 'move');
  assert.equal(first.tour, true);
  a.notify('pda-opened'); // wrong event for step 1
  assert.equal(a.tourStep.id, 'move');
  a.step(0.1, play({ moved: ASSISTANT.TOUR_WALK_M + 0.1 }));
  assert.equal(a.tourStep.id, 'gauges');
});

test('a step cannot complete before Volt has said it', () => {
  const a = createAssistant({ store: memoryStore() });
  a.startIfNeeded();
  a.step(0.1, play({ moved: 10 })); // says 'move' this frame, the walk only counts afterwards
  assert.equal(a.tourStep.id, 'move');
});

/** Do what a step asks (walk, event, flag or just wait) so the tour moves on. */
function completeStep(a, step) {
  const d = step.done;
  if (d.walk) a.step(0.1, play({ moved: ASSISTANT.TOUR_WALK_M + 0.1 }));
  else if (d.event) assert.equal(a.notify(d.event), true, `event ${d.event}`);
  else if (d.flag) a.step(0.1, play({ [d.flag]: true }));
  else if (d.after !== undefined) for (let t = 0; t <= d.after + 0.5; t += 0.5) a.step(0.5, play());
}

test('full Training Day: every step in order → tour done, saved, reported once', () => {
  const store = memoryStore();
  const a = createAssistant({ store });
  a.startIfNeeded();
  for (const step of LINES.TOUR) {
    assert.equal(runUntilLine(a).id, step.id);
    completeStep(a, step);
  }
  assert.equal(runUntilLine(a).id, 'tour-done');
  assert.equal(a.tourActive, false);
  assert.equal(store.load().volt.tourDone, true);
  assert.equal(a.consumeTourEnd(), 'done');
  assert.equal(a.consumeTourEnd(), null);
});

test('a "watch" step completes on its own after a few seconds', () => {
  const i = LINES.TOUR.findIndex((s) => s.done.after !== undefined);
  assert.ok(i >= 0);
  const a = createAssistant({ store: memoryStore({ volt: { tourIndex: i } }) });
  a.startIfNeeded();
  assert.equal(runUntilLine(a).id, LINES.TOUR[i].id);
  for (let t = 0; t < LINES.TOUR[i].done.after - 1; t += 0.5) a.step(0.5, play());
  assert.equal(a.tourStep.id, LINES.TOUR[i].id); // not yet
  for (let t = 0; t < 2; t += 0.5) a.step(0.5, play());
  assert.equal(a.tourStep.id, LINES.TOUR[i + 1].id);
});

test('a reload carries on from the saved step (no restart of a long day)', () => {
  const store = memoryStore();
  const a = createAssistant({ store });
  a.startIfNeeded();
  runUntilLine(a);
  a.step(0.1, play({ moved: 5 })); // step 1 done → step 2
  const b = createAssistant({ store });
  b.startIfNeeded();
  assert.equal(b.tourStep.id, LINES.TOUR[1].id);
  assert.equal(runUntilLine(b).id, LINES.TOUR[1].id);
});

test('skip and replay', () => {
  const store = memoryStore();
  const a = createAssistant({ store });
  a.startIfNeeded();
  a.skipTour();
  assert.equal(a.tourActive, false);
  assert.equal(runUntilLine(a).id, 'tour-skipped');
  assert.equal(createAssistant({ store }).tourDone, true);
  assert.equal(a.consumeTourEnd(), 'skipped');
  a.replayTour();
  assert.equal(a.tourActive, true);
  assert.equal(runUntilLine(a).id, 'move');
});

test('returning player gets a welcome, not the tour', () => {
  const a = createAssistant({ store: memoryStore({ volt: { tourDone: true } }) });
  a.startIfNeeded();
  assert.equal(a.tourActive, false);
  assert.equal(runUntilLine(a).id, 'welcome-back');
});

test('silent while not playing (menus, PDA, mini-games)', () => {
  const a = createAssistant({ store: memoryStore() });
  a.startIfNeeded();
  for (const mode of ['paused', 'pda', 'instance', 'busy']) assert.equal(a.step(1, play({ mode })), null);
});

test('cooldown blocks a second news line, but warnings skip it', () => {
  const a = createAssistant({ store: memoryStore({ volt: { tourDone: true } }) });
  a.notify('sun-down');
  assert.equal(a.step(0.1, play()).id, 'sun-down');
  a.notify('sun-up');
  assert.equal(a.step(0.1, play()), null); // cooling down
  a.notify('oxygen-low');
  assert.equal(a.step(0.1, play()).id, 'oxygen-low'); // urgent
});

test('warnings beat facts and news in priority', () => {
  const a = createAssistant({ store: memoryStore({ volt: { tourDone: true } }) });
  a.notify('sun-down');
  a.notify('food-low');
  assert.equal(a.step(0.1, play()).id, 'food-low');
});

test('quiet mode drops facts and news but keeps warnings', () => {
  const a = createAssistant({ store: memoryStore({ volt: { tourDone: true } }) });
  a.setChattiness('quiet');
  assert.equal(a.notify('sun-down'), false); // main.js falls back to a caption
  assert.equal(a.notify('zone:outside'), false);
  assert.equal(a.notify('power-low'), true);
  assert.equal(runUntilLine(a, play(), 1000).id, 'power-low');
  assert.equal(runUntilLine(a, play(), 1000), null); // no idle facts
});

test('chatty mode shares an idle fact after the interval', () => {
  const a = createAssistant({ store: memoryStore({ volt: { tourDone: true } }) });
  assert.equal(runUntilLine(a, play(), ASSISTANT.FACT_EVERY_S - 5), null);
  const l = runUntilLine(a, play(), 20);
  assert.equal(l.kind, 'fact');
});

test('first visit to a place is said once', () => {
  const a = createAssistant({ store: memoryStore({ volt: { tourDone: true } }) });
  assert.equal(a.notify('zone:greenhouse'), true);
  assert.equal(a.notify('zone:greenhouse'), false);
});

test('talk gives the most useful tip for right now', () => {
  const a = createAssistant({ store: memoryStore({ volt: { tourDone: true } }) });
  assert.equal(a.talk(play({ oxygen: 20 })).id, 'talk-oxygen');
  assert.equal(a.talk(play({ oxygen: 20, zoneId: 'outside' })).id, 'talk-oxygen-out');
  assert.equal(a.talk(play({ power: 10 })).id, 'talk-power');
  assert.equal(a.talk(play()).kind, 'talk'); // all fine → a fact
});

test('a broken store does not crash Volt', () => {
  const bad = { load: () => { throw new Error('x'); }, save: () => { throw new Error('x'); } };
  const a = createAssistant({ store: bad });
  assert.doesNotThrow(() => {
    a.startIfNeeded();
    a.skipTour();
  });
});

// ---------------------------------------------------------------- content checks
const words = (t) => t.trim().split(/\s+/).length;
const allLines = () => [
  ...LINES.TOUR,
  LINES.TOUR_DONE,
  LINES.TOUR_SKIPPED,
  LINES.WELCOME_BACK,
  ...Object.values(LINES.EVENTS),
  ...Object.values(LINES.VISITS),
  ...LINES.FACTS,
  ...Object.values(LINES.TALK),
];

test('every bubble line is short enough for young readers (≤ 14 words)', () => {
  for (const l of allLines()) assert.ok(words(l.text) <= 14, `${words(l.text)} words: ${l.text}`);
});

test('every fact and visit fact points at a real Databank entry (which has the source)', () => {
  const ids = new Set(DATABANK.map((d) => d.id));
  for (const l of [...LINES.FACTS, ...Object.values(LINES.VISITS)]) {
    if (l.databank) assert.ok(ids.has(l.databank), `missing databank entry: ${l.databank}`);
  }
  for (const f of LINES.FACTS) assert.ok(f.databank, f.id);
});

// ---------------------------------------------------------------- Training Day script checks
import { TRAINING_CHAPTERS } from '../src/data/trainingDay.js';
import { TRIGGERS, TARGETS } from '../src/training/script.js';

test('Training Day script: every step is well formed', () => {
  const chapters = new Set(TRAINING_CHAPTERS.map((c) => c.id));
  const ids = new Set();
  for (const s of LINES.TOUR) {
    assert.ok(!ids.has(s.id), `duplicate step id ${s.id}`);
    ids.add(s.id);
    assert.ok(chapters.has(s.chapter), `${s.id}: unknown chapter ${s.chapter}`);
    const kinds = ['walk', 'event', 'flag', 'after'].filter((k) => s.done[k] !== undefined);
    assert.equal(kinds.length, 1, `${s.id}: needs exactly one way to finish`);
    if (s.trigger) assert.ok(TRIGGERS.includes(s.trigger), `${s.id}: unknown trigger ${s.trigger}`);
    if (s.target) assert.ok(TARGETS.includes(s.target), `${s.id}: unknown target ${s.target}`);
    if (s.pace !== undefined) assert.ok(s.pace > 0 && s.pace <= 1, `${s.id}: pace`);
    assert.ok(s.long, `${s.id}: needs a long line for the PDA log`);
  }
  // every chapter is used
  for (const c of chapters) assert.ok(LINES.TOUR.some((s) => s.chapter === c), `chapter ${c} unused`);
});

import { drillStorm, trainingPace } from '../src/training/script.js';
import { TRAINING } from '../src/config/gameplay.js';

test('training pace: slow while training, a step can override, normal after', () => {
  assert.equal(trainingPace({ id: 'x' }, true), TRAINING.PACE);
  assert.equal(trainingPace({ id: 'storm', pace: 1 }, true), 1);
  assert.equal(trainingPace({ id: 'x' }, false), 1);
});

test('storm drill: the gentlest real storm, moved to now, real warning time kept', () => {
  const storms = [
    { id: 'a', intensity: 0.8, warnGameHour: 30, arriveGameHour: 36 },
    { id: 'b', intensity: 0.2, warnGameHour: 50, arriveGameHour: 54 },
  ];
  const d = drillStorm(storms, 10);
  assert.equal(d.id, 'b');
  assert.ok(d.warnGameHour > 10 && d.warnGameHour < 10.1);
  assert.equal(d.arriveGameHour - d.warnGameHour, 4);
  assert.equal(d.intensity, 0.2);
  assert.equal(drillStorm([], 10), null);
});

test('doing a step a moment before Volt says it still counts (no getting stuck)', () => {
  const i = LINES.TOUR.findIndex((s) => s.done.event === 'eat-tried');
  const a = createAssistant({ store: memoryStore({ volt: { tourIndex: i } }) });
  a.startIfNeeded();
  assert.equal(a.notify('eat-tried'), true); // pressed F before the line
  assert.equal(a.tourStep.id, 'eat'); // the kid still hears the step…
  assert.equal(runUntilLine(a).id, 'eat');
  a.step(0.1, play()); // …and it completes right after
  assert.equal(a.tourStep.id, LINES.TOUR[i + 1].id);
});
