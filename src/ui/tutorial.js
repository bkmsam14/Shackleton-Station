// tutorial.js — the small "How to play" card a mini-game shows the FIRST time a kid
// plays it (and again any time from its "How to play" button). Pictures, not paragraphs:
// each panel is a small looping animation with a caption of a few words.
// Which tutorials were seen is kept in the settings store, so it shows once per browser.
//
// A tutorial: { id, title, lead?: html (the companion's one-line idea), panels: [{ art, caption }], go? }
import { loadSettings, saveSettings } from '../systems/save.js';
import { tutorialSeen as seenIn, markTutorialSeen as markIn } from '../systems/tutorials.js';
import './tutorial.css';

const defaultStore = { load: loadSettings, save: saveSettings };

/** Has this tutorial been seen already? (default store: the game's settings) */
export const tutorialSeen = (id, store = defaultStore) => seenIn(id, store);
/** Remember that it was seen. */
export const markTutorialSeen = (id, store = defaultStore) => markIn(id, store);

/**
 * Show the card inside `container` (it covers the game until closed).
 * Resolves when the kid presses the button (or Enter / Escape). Marks it seen.
 */
export function showTutorial(container, tut, { store = defaultStore, onSpeak } = {}) {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'tut';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', `tut-${tut.id}`);
    el.innerHTML = `
      <div class="tut-card">
        <p class="tut-kicker">How to play</p>
        <h3 class="tut-title" id="tut-${tut.id}">${tut.title}</h3>
        ${tut.lead ? `<div class="tut-lead">${tut.lead}</div>` : ''}
        <ol class="tut-panels">
          ${tut.panels
            .map((p, i) => `<li class="tut-panel" style="--i:${i}"><span class="tut-num">${i + 1}</span>${p.art}<span class="tut-cap">${p.caption}</span></li>`)
            .join('')}
        </ol>
        <button type="button" class="ez-btn ez-btn-go ez-btn-xl tut-go">${tut.go ?? 'Got it — let’s play!'}</button>
      </div>`;
    container.appendChild(el);
    const go = el.querySelector('.tut-go');
    const close = () => {
      markTutorialSeen(tut.id, store);
      el.removeEventListener('keydown', onKey);
      el.remove();
      resolve();
    };
    const onKey = (e) => {
      if (e.code === 'Enter' || e.code === 'Escape' || e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    el.addEventListener('keydown', onKey);
    go.addEventListener('click', close);
    go.focus();
    onSpeak?.(`${tut.leadSay ? `${tut.leadSay} ` : ''}${tut.title}. ${tut.panels.map((p) => p.say ?? p.caption.replace(/<[^>]+>/g, '')).join('. ')}`);
  });
}
