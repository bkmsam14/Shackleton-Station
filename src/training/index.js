// training/index.js — runs the Training Day around Volt's tour (systems/assistant.js):
//  - pace(): how fast the base clock runs right now (slower while training)
//  - onLine(line): when Volt says a step's line, fire its scripted event once
//  - update(): keep a running trigger going (the delivery rush), show the badge, and
//    report the start and the end ('done' or 'skipped') to main.js
// The game-side actions (hit the array, rush the cargo, replay a storm, ripen a plant…)
// are passed in by main.js, so this file stays small and knows no game internals.
import './training.css';
import { TIME } from '../config/gameplay.js';
import { trainingPace } from './script.js';

/**
 * actions: { micrometeorite(), 'rush-delivery'(), 'storm-drill'(), ripen(),
 *            start(), end(how: 'done' | 'skipped') }
 */
export function createTraining({ root, assistant, actions }) {
  const badge = document.createElement('div');
  badge.className = 'training-badge';
  badge.setAttribute('role', 'status');
  badge.hidden = true;
  root.appendChild(badge);

  let firedFor = null; // the step whose trigger already fired
  let wasActive = false;
  let lastText = '';

  const pace = () => trainingPace(assistant.tourStep, assistant.tourActive);

  return {
    get active() {
      return assistant.tourActive;
    },
    pace,
    /** Volt just said `line`: fire its step's scripted event (once per step). */
    onLine(line) {
      if (!line?.tour || !line.trigger || firedFor === line.id) return;
      firedFor = line.id;
      actions[line.trigger]?.();
    },
    update(frameDt, { mode }) {
      const active = assistant.tourActive;
      if (active && !wasActive) actions.start?.();
      wasActive = active;
      const end = assistant.consumeTourEnd();
      if (end) {
        firedFor = null;
        actions.end?.(end);
      }
      // the cargo keeps being rushed until it has landed
      const step = assistant.tourStep;
      if (step?.trigger === 'rush-delivery' && firedFor === step.id) actions['rush-delivery']?.();

      const show = active && (mode === 'playing' || mode === 'busy');
      badge.hidden = !show;
      if (show) {
        const p = pace();
        // short, so it never runs into the base-power readout; the full sentence is the tooltip
        const text = p >= 1 ? 'Training day · storm drill' : `Training day · time ${Math.round(1 / p)}× slower`;
        if (text !== lastText) {
          badge.textContent = lastText = text;
          badge.title =
            p >= 1
              ? 'The storm drill runs at normal speed.'
              : `Time runs ${Math.round(1 / p)}× slower today so you can learn. Normally 1 day on the base = ${Math.round(TIME.REAL_SECONDS_PER_GAME_DAY / 60)} minutes of play.`;
        }
      }
    },
  };
}
