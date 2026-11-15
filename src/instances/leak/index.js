// index.js — Leak Fix instance: (why air leaks) → today's mini-game (picked at random; a
// "How to play" card the first time) → What really happened → quick question → result.
// Opened at the habitat's life-support rack while a micrometeoroid leak is open
// (leak/index.js). The hole is sealed the moment the mini-game ends (ctx.onPatched);
// leaving before that keeps the leak going.
import './style.css';
import { LEAK, BVAD } from '../../config/gameplay.js';
import { sfx } from '../../ui/sfx.js';
import { loadSettings, saveSettings } from '../../systems/save.js';
import { tutorialSeen } from '../../ui/tutorial.js';
import { IC, voltBot } from '../electrolysis/icons.js';
import { createShell, learnScreen, quizScreen, playFrame } from '../lessonKit.js';
import { gameById, nextGame } from './minigames.js';
import { createHuntGame, createHatchGame, createPatchGame } from './games.js';
import { ART } from './tutorialArt.js';
import { TEXT, TUTORIALS, CONCEPT, TIPS, LEARN, LEARN_SHOWS, QUIZ, DEEPER, SOURCES } from './content.js';

const AIR_ICON = `<svg class="ez-ic" viewBox="0 0 32 32" aria-hidden="true"><path d="M4 11h15a4 4 0 1 0-4-4M4 17h21a4 4 0 1 1-4 4M4 23h9" fill="none" stroke="#9fe8ff" stroke-width="3" stroke-linecap="round"/></svg>`;
const FACTORY = { hunt: createHuntGame, hatch: createHatchGame, patch: createPatchGame };

/** ctx: { voice?, repairs (leaks fixed so far), o2LostKg (oxygen this leak has cost), onPatched() → bool } */
export function createLeakRepairInstance({ root, ctx, done }) {
  const shell = createShell({ root, ctx, cls: 'lf', titleIcon: AIR_ICON, title: TEXT.title, labelId: 'lf-title' });
  const { body, say } = shell;
  const saved = loadSettings();
  const firstEver = !saved.leakWhySeen;
  let gameId = saved.leakNext && gameById(saved.leakNext).id === saved.leakNext ? saved.leakNext : nextGame(saved.leakLast);
  saveSettings({ leakNext: gameId });
  const g = gameById(gameId);
  const quizList = QUIZ[gameId];
  const quiz = quizList[(ctx.repairs ?? 0) % quizList.length];
  const tutKey = `leak-${gameId}`;
  shell.steps = [
    ...(firstEver ? [{ id: 'why', label: 'Why' }] : []),
    { id: 'play', label: 'Fix' },
    { id: 'learn', label: 'Learn' },
    { id: 'quiz', label: 'Quiz' },
    { id: 'result', label: 'Done' },
  ];

  let game = null;
  let patched = false;
  const tutorial = () => ({
    id: tutKey,
    title: TUTORIALS[gameId].title,
    lead: `${voltBot('wow')}<p>${CONCEPT[gameId]}</p>`,
    leadSay: CONCEPT[gameId],
    panels: TUTORIALS[gameId].panels.map((p) => ({ art: ART[p.art] ?? '', caption: p.caption, say: p.say })),
  });
  const leaveRow = () => `<div class="ez-row"><button class="ez-btn ez-btn-ghost" data-leave>${IC.back}<span>${TEXT.leave}</span></button></div>`;
  const wireLeave = () => body.querySelector('[data-leave]')?.addEventListener('click', () => done({ completed: false }));

  // ---------------------------------------------------------------- why air leaks
  function showWhy(then = showPlay) {
    shell.setScreen('why');
    shell.speak(`${TEXT.introTitle} ${TEXT.intro[0]} ${TEXT.intro[1]}`);
    body.innerHTML = `
      ${say('wow', `<h3 class="ez-h3">${TEXT.introTitle}</h3><p>${TEXT.intro[0]}</p>`)}
      <div class="ez-learn-art">${ART.introWhy}</div>
      <p class="ez-p ez-center">${TEXT.intro[1]}</p>
      <div class="ez-row ez-row-center"><button class="ez-btn ez-btn-go ez-btn-xl" data-go>${AIR_ICON}<span>${TEXT.introGo}</span></button></div>
      ${leaveRow()}`;
    body.querySelector('[data-go]').addEventListener('click', () => {
      sfx.click();
      saveSettings({ leakWhySeen: true });
      then();
    });
    wireLeave();
    shell.focusFirst();
  }

  // ---------------------------------------------------------------- today's job (later visits)
  function showJob() {
    shell.setScreen('play');
    shell.speak(`Air leak! Today's job: ${g.name}.`);
    body.innerHTML = `
      ${say('think', `<h3 class="ez-h3">Air leak!</h3><p>A micrometeorite made a tiny hole. Let’s find it and seal it.</p>`)}
      <p class="ez-today">${AIR_ICON}<span>Today’s job: <b>${g.name}</b>${tutorialSeen(tutKey) ? '' : ' <span class="ez-game-new">New!</span>'}</span></p>
      <div class="ez-row ez-row-center"><button class="ez-btn ez-btn-go ez-btn-xl" data-go><span>Start</span></button></div>
      <div class="ez-row">
        <button class="ez-btn ez-btn-ghost" data-why>${IC.book}<span>${TEXT.why}</span></button>
        <button class="ez-btn ez-btn-ghost" data-leave>${IC.back}<span>${TEXT.leave}</span></button>
      </div>`;
    body.querySelector('[data-go]').addEventListener('click', () => {
      sfx.click();
      showPlay();
    });
    body.querySelector('[data-why]').addEventListener('click', () => {
      sfx.click();
      showWhy(showJob);
    });
    wireLeave();
    shell.focusFirst();
  }

  // ---------------------------------------------------------------- the mini-game
  function showPlay() {
    shell.setScreen('play');
    const mount = playFrame(shell, { concept: CONCEPT[gameId], leaveLabel: TEXT.leave, helpLabel: `How to play ${g.name}`, goal: `${AIR_ICON}<b>${g.name}</b>` });
    wireLeave();
    body.querySelector('[data-help]').addEventListener('click', () => {
      sfx.click();
      shell.tutorial(tutorial());
    });
    const begin = () => {
      if (shell.screen !== 'play' || game) return;
      game = FACTORY[gameId]({
        mount,
        announce: shell.announce,
        onComplete: finish,
        onTip: (key) => shell.tip(TIPS[gameId]?.[key]),
      });
      shell.announce(`${g.name}: ${CONCEPT[gameId]}`);
    };
    if (tutorialSeen(tutKey)) begin();
    else shell.tutorial(tutorial()).then(begin);
  }

  function finish() {
    game?.destroy();
    game = null;
    patched = ctx.onPatched?.() !== false;
    saveSettings({ leakLast: gameId, leakNext: nextGame(gameId) });
    const shown = loadSettings().learnShown ?? {};
    const key = `leak-${gameId}`;
    if ((shown[key] ?? 0) < LEARN_SHOWS) {
      saveSettings({ learnShown: { ...shown, [key]: (shown[key] ?? 0) + 1 } });
      learnScreen(shell, LEARN[gameId], ART[LEARN[gameId].art], showQuiz);
    } else showQuiz();
  }
  const showQuiz = () => quizScreen(shell, quiz, showResult);

  // ---------------------------------------------------------------- result
  function showResult() {
    shell.setScreen('result');
    const lost = ctx.o2LostKg ?? 0;
    const breathHours = lost / (BVAD.O2_KG_PER_DAY_NOMINAL / 24);
    const kgTxt = lost < 0.01 ? 'Less than 0.01 kg' : `${lost.toFixed(2)} kg`;
    const breathTxt =
      breathHours < 1
        ? `${Math.max(1, Math.round(breathHours * 60))} minute${Math.round(breathHours * 60) > 1 ? 's' : ''}`
        : `${Math.round(breathHours)} hour${Math.round(breathHours) === 1 ? '' : 's'}`;
    shell.speak('Leak sealed! The cabin pressure holds steady again.');
    body.innerHTML = `
      ${say('cheer', `<h3 class="ez-h3">Leak sealed!</h3><p>The cabin pressure holds steady, so the oxygen supply drains at the normal speed again.</p>`)}
      <ul class="ez-results">
        <li class="ez-res ez-tone-oxygen">${IC.oxygen}<span><b>${kgTxt} of oxygen lost</b> to space during the leak (about ${breathTxt} of breathing)</span></li>
        <li class="ez-res ez-tone-time">${IC.clock}<span><b>${LEAK.REPAIR_GAME_HOURS} hour passes</b> while you find and seal the hole</span></li>
      </ul>
      <div class="sf-deeper">
        <h4>${IC.book}<span>Go deeper</span></h4>
        <p>${DEEPER}</p>
        <p class="ez-source">${IC.link}<span>Sources:
          ${Object.values(SOURCES)
            .map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${s.label}</a>`)
            .join(' · ')}</span></p>
      </div>
      <div class="ez-row ez-row-center"><button class="ez-btn ez-btn-go ez-btn-xl" data-back>${IC.back}<span>${TEXT.back}</span></button></div>`;
    body.querySelector('[data-back]').addEventListener('click', close);
    shell.focusFirst();
  }
  const close = () => done({ completed: patched, patched, gameHours: patched ? LEAK.REPAIR_GAME_HOURS : 0 });

  function onKey(e) {
    if (shell.tutorialOpen()) {
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'Escape') {
        e.preventDefault();
        shell.el.querySelector('.tut-go')?.click();
      }
      return;
    }
    if (shell.screen === 'play' && game?.onKey?.(e)) return;
    if (e.code !== 'Escape') return;
    e.preventDefault();
    if (!patched) done({ completed: false });
    else if (shell.screen === 'learn') showQuiz();
    else if (shell.screen === 'quiz') showResult();
    else close();
  }

  if (firstEver) showWhy();
  else showJob();

  return {
    onKey,
    destroy() {
      game?.destroy();
      game = null;
      shell.destroy();
    },
  };
}
