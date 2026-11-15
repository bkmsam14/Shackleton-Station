// index.js — end of the Training Day: a report card of what you learned, chapter by
// chapter. Reuses the Electrolysis lesson's console look (ez-* classes) and Volt's face.
import { TIME } from '../../config/gameplay.js';
import { sfx } from '../../ui/sfx.js';
import { IC, voltBot } from '../electrolysis/icons.js';
import { TRAINING_CHAPTERS } from '../../data/trainingDay.js';
import './style.css';

/** ctx: { voice? } */
export function createTrainingReportInstance({ root, ctx, done }) {
  const minutes = Math.round(TIME.REAL_SECONDS_PER_GAME_DAY / 60);
  const el = document.createElement('div');
  el.className = 'ez tr';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'tr-title');
  el.innerHTML = `
    <div class="ez-card">
      <header class="ez-head">
        <span class="ez-rivets" aria-hidden="true"><i></i><i></i></span>
        <h2 id="tr-title" class="ez-title">${IC.check}<span>Training day complete</span></h2>
        <span class="ez-rivets" aria-hidden="true"><i></i><i></i></span>
      </header>
      <div class="ez-body ez-enter">
        <div class="ez-say">${voltBot('cheer')}<div class="ez-bubble">
          <h3 class="ez-h3">You did it, astronaut!</h3>
          <p>You learned every job on the base. From now on you’re in charge, and I’m here if you press E on me.</p>
        </div></div>
        <ul class="ez-results tr-list">
          ${TRAINING_CHAPTERS.map(
            (c) => `<li class="ez-res ez-tone-power">${IC.check}<span><b>${c.title}</b> ${c.learned}</span></li>`,
          ).join('')}
        </ul>
        <p class="ez-p ez-center">From now on, time runs at normal speed. Keep everything going until 19:00 to finish the day: each day lasts ${minutes / 2} minutes of play.</p>
        <div class="ez-row ez-row-center"><button class="ez-btn ez-btn-go ez-btn-xl" data-go>${IC.back}<span>Start my mission</span></button></div>
      </div>
      <p class="ez-status" aria-live="polite">Training day complete.</p>
    </div>`;
  root.appendChild(el);
  sfx.success();
  ctx.voice?.speak('You did it, astronaut! From now on you are in charge.');
  const go = el.querySelector('[data-go]');
  go.addEventListener('click', () => {
    sfx.click();
    done({ completed: false });
  });
  go.focus();

  return {
    onKey(e) {
      if (e.code === 'Escape' || e.code === 'Enter') {
        e.preventDefault();
        done({ completed: false });
      }
    },
    destroy() {
      ctx.voice?.stop?.();
    },
  };
}
