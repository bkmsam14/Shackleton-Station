// assistant.js — Volt's "brain". PURE LOGIC: no Three.js, no DOM.
//
// Decides WHAT Volt says and WHEN. main.js feeds it a plain snapshot each frame plus game
// events (notify), and shows whatever line step() returns in Volt's bubble.
//  - First-day tour: a step machine; each step waits for the player to really do it.
//  - Priorities: warning (3) > tour (2) > news (1) > fact (0). Warnings skip the cooldown.
//  - Chattiness: 'chatty' (everything) | 'helpful' (no idle facts) | 'quiet' (tour + warnings).
//  - Silent unless snapshot.mode === 'playing' (no talking in menus, the PDA, mini-games).
// Persistence (tour done, chattiness) goes through an injected { load, save } store, so the
// game passes save.js and tests pass an in-memory store.
import { ASSISTANT } from '../config/gameplay.js';
import * as LINES from '../data/voltLines.js';

const PRIORITY = { warning: 3, tour: 2, news: 1, fact: 0 };
export const CHATTINESS = ['chatty', 'helpful', 'quiet'];

export function createAssistant({ store, lines = LINES, config = ASSISTANT } = {}) {
  let saved = {};
  try {
    saved = store?.load()?.volt ?? {};
  } catch {
    saved = {};
  }
  // A finished tour only counts for the tour that was finished: when the tour changes
  // (e.g. the old 7-step tour → the Training Day), everyone gets the new one once.
  const tourVersion = lines.TOUR_VERSION ?? 1;
  const sameTour = (saved.tourVersion ?? 1) === tourVersion;
  let tourDone = Boolean(saved.tourDone) && sameTour;
  let chattiness = CHATTINESS.includes(saved.chattiness) ? saved.chattiness : 'chatty';
  // the tour (Training Day) is long: remember the step so a reload carries on from there
  const savedStep = sameTour && Number.isInteger(saved.tourIndex) && saved.tourIndex >= 0 && saved.tourIndex < lines.TOUR.length ? saved.tourIndex : 0;

  let tourIndex = -1; // -1 = no tour running
  let tourEnded = null; // 'done' | 'skipped' — read once with consumeTourEnd()
  let walked = 0;
  let tourIdle = 0; // seconds since the current tour line was said
  let tourWaitGap = 0; // short pause before saying the next tour step
  let tourLineSaid = false;
  let earlyDone = false; // the step's action happened before Volt said the line
  let queue = []; // { line, kind, age }
  let cooldown = 0;
  let sinceFact = 0;
  let factIndex = 0;
  const visited = new Set();

  function persist() {
    try {
      store?.save({ volt: { tourDone, chattiness, tourVersion, tourIndex: tourIndex >= 0 ? tourIndex : 0 } });
    } catch {
      // storage blocked — fine, it only means the tour may show again next time
    }
  }

  const allows = (kind) =>
    kind === 'warning' || kind === 'tour' || (kind === 'news' && chattiness !== 'quiet') || (kind === 'fact' && chattiness === 'chatty');

  function enqueue(line, kind) {
    if (!line || !allows(kind)) return false;
    queue = queue.filter((q) => q.line.id !== line.id); // no duplicates waiting
    queue.push({ line, kind, age: 0 });
    return true;
  }

  // ---------------------------------------------------------------- tour
  const tourStep = () => (tourIndex >= 0 ? lines.TOUR[tourIndex] : null);

  function beginStep(i, resumed = false) {
    tourIndex = i;
    walked = 0;
    tourIdle = 0;
    tourLineSaid = false;
    earlyDone = false;
    tourWaitGap = i === 0 || resumed ? 0 : config.TOUR_GAP_S;
    persist();
  }

  function completeStep() {
    const next = tourIndex + 1;
    if (next >= lines.TOUR.length) {
      tourIndex = -1;
      tourDone = true;
      tourEnded = 'done';
      persist();
      enqueue(lines.TOUR_DONE, 'tour');
    } else {
      beginStep(next);
    }
  }

  function checkTourDone(snap, dt) {
    const s = tourStep();
    if (!s || !tourLineSaid) return; // the kid must hear the step before it can complete
    if (earlyDone) {
      completeStep(); // they already did it while Volt was getting ready to say it
      return;
    }
    if (s.done.walk) {
      walked += snap.moved ?? 0;
      if (walked >= config.TOUR_WALK_M) completeStep();
    } else if (s.done.flag && snap[s.done.flag]) {
      completeStep();
    } else if (s.done.after !== undefined && tourIdle >= s.done.after) {
      completeStep(); // a step you only watch (e.g. the micrometeorite flash)
      return;
    }
    tourIdle += dt;
  }

  function startTour(from = 0) {
    queue = queue.filter((q) => q.kind !== 'tour');
    beginStep(from, from > 0);
  }

  // ---------------------------------------------------------------- talk ("E" on Volt)
  function nextFact() {
    const f = lines.FACTS[factIndex % lines.FACTS.length];
    factIndex++;
    return f;
  }

  return {
    get chattiness() {
      return chattiness;
    },
    get tourActive() {
      return tourIndex >= 0;
    },
    get tourDone() {
      return tourDone;
    },
    /** Current tour step (or null) — main.js uses step.target for the 3D marker. */
    get tourStep() {
      return tourStep();
    },
    /** 'done' | 'skipped' once, right after the tour ends; null otherwise. */
    consumeTourEnd() {
      const e = tourEnded;
      tourEnded = null;
      return e;
    },

    setChattiness(level) {
      if (!CHATTINESS.includes(level)) return;
      chattiness = level;
      queue = queue.filter((q) => allows(q.kind));
      persist();
    },

    /** Call once when play starts: runs the tour the first time, otherwise says hello. */
    /**
     * opts.day: the game day the player starts on. Day 1 ALWAYS begins with the Training
     * Day (even after finishing or skipping it before); a half-done one carries on from
     * its saved step. Later days: the tour only if it was never finished.
     */
    startIfNeeded({ day } = {}) {
      if (day === 1) {
        const resume = tourDone ? 0 : savedStep;
        tourDone = false;
        startTour(resume);
      } else if (!tourDone) startTour(savedStep);
      else enqueue(lines.WELCOME_BACK, 'news');
    },
    replayTour() {
      tourDone = false;
      startTour(0);
    },
    /** Training Day "Next": pass the current step without doing it. Returns true if it did. */
    nextStep() {
      if (tourIndex < 0) return false;
      queue = queue.filter((q) => q.kind !== 'tour'); // drop the passed step's line if still waiting
      completeStep();
      return true;
    },
    skipTour() {
      if (tourIndex < 0) return;
      tourIndex = -1;
      tourDone = true;
      tourEnded = 'skipped';
      persist();
      queue = queue.filter((q) => q.kind !== 'tour');
      enqueue(lines.TOUR_SKIPPED, 'tour');
    },

    /**
     * Game events: 'pda-opened', 'oxygen-made', 'gauges-shown', 'zone:<id>', or an
     * EVENTS key ('oxygen-low', 'sun-down', …). Returns true if Volt will say something
     * about it (main.js shows a plain caption otherwise).
     */
    notify(event) {
      const s = tourStep();
      if (s && s.done.event === event) {
        if (tourLineSaid) completeStep();
        else earlyDone = true; // counts as soon as Volt has said the step
        return true;
      }
      if (event.startsWith('zone:')) {
        const zone = event.slice(5);
        if (visited.has(zone)) return false;
        visited.add(zone);
        if (tourIndex >= 0) return false; // the tour already explains places
        return enqueue(lines.VISITS[zone], 'news');
      }
      const e = lines.EVENTS[event];
      if (!e) return false;
      return enqueue({ id: event, ...e }, e.kind);
    },

    /**
     * Advance time. snap: { mode, moved, nearArray, ... }.
     * Returns a line object { id, text, long?, mood, action?, tour? } to say now, or null.
     */
    step(dt, snap) {
      if (snap.mode !== 'playing') return null;
      cooldown = Math.max(0, cooldown - dt);
      for (const q of queue) q.age += dt;
      queue = queue.filter((q) => q.kind === 'tour' || q.kind === 'warning' || q.age < config.STALE_S);

      // tour: say the current step (after a short gap), remind if nothing happens
      const s = tourStep();
      if (s) {
        checkTourDone(snap, dt);
        if (tourIndex >= 0 && tourStep() === s) {
          tourWaitGap = Math.max(0, tourWaitGap - dt);
          const due = (!tourLineSaid && tourWaitGap === 0) || (tourLineSaid && tourIdle >= config.TOUR_REMIND_S);
          if (due && !queue.some((q) => q.line.id === s.id)) enqueue(s, 'tour');
        }
      } else {
        sinceFact += dt;
        if (sinceFact >= config.FACT_EVERY_S && queue.length === 0 && cooldown === 0) {
          sinceFact = 0;
          enqueue(nextFact(), 'fact');
        }
      }

      if (!queue.length) return null;
      queue.sort((a, b) => PRIORITY[b.kind] - PRIORITY[a.kind]);
      const top = queue[0];
      const urgent = top.kind === 'warning';
      const gap = top.kind === 'tour' ? 0 : cooldown;
      if (!urgent && gap > 0) return null;
      queue.shift();
      cooldown = config.COOLDOWN_S;
      sinceFact = 0;
      const isTourLine = tourStep() && top.line.id === tourStep().id;
      if (isTourLine) {
        tourLineSaid = true;
        tourIdle = 0;
      }
      return { ...top.line, kind: top.kind, tour: Boolean(isTourLine) };
    },

    /** The player pressed E on Volt: a helpful line for right now (ignores the cooldown). */
    talk(snap) {
      const s = tourStep();
      if (s) {
        tourLineSaid = true;
        tourIdle = 0;
        return { ...s, kind: 'tour', tour: true };
      }
      const T = lines.TALK;
      let line;
      if (snap.storm === 'warning') line = T.stormWarning;
      else if (snap.storm === 'storm') line = snap.inShelter ? T.stormInside : T.stormOutside;
      else if (snap.oxygen < 40) line = snap.zoneId === 'outside' ? T.oxygenOutside : T.oxygen;
      else if (snap.power < 30) line = T.power;
      else if (snap.food < 35) line = T.food;
      else if (snap.bagKg > 0 && T.iceBag) line = snap.inColdTrap ? T.iceBagFull ?? T.iceBag : T.iceBag;
      else if (snap.tankKg < config.TANK_LOW_KG) line = T.tank;
      else line = nextFact();
      cooldown = config.COOLDOWN_S;
      return { ...line, kind: 'talk', tour: false };
    },
  };
}
