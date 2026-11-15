// index.js — Ice Drill instance: (intro) → drill round → quiz → stars.
// Rules (bag, dig spots, stars) live in systems/iceMining.js; this file only shows screens.
// The soil goes in the bag when the round ends; leaving early gives nothing and costs nothing.
import '../electrolysis/style.css';
import './style.css';
import { ICE } from '../../config/gameplay.js';
import { checkDig, finishDig, scoreDrill, moonFeelsLikeKg } from '../../systems/iceMining.js';
import { sfx } from '../../ui/sfx.js';
import { shuffledOptions } from '../electrolysis/content.js';
import { IC, starIcon, medalIcon, voltBot } from '../electrolysis/icons.js';
import { createDrillGame } from './game.js';
import { TEXT, QUIZ } from './content.js';

const MEDAL_NAME = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };
const STEPS = [
  { id: 'play', label: 'Drill' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'result', label: 'Stars' },
];
const kg = (v) => `${v.toFixed(v < 10 ? 1 : 0)} kg`;
export const ICE_ICON = `<svg class="ez-ic" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3 26 9v14l-10 6-10-6V9z" fill="#bfe9ff" stroke="#10182c" stroke-width="2.6" stroke-linejoin="round"/><path d="M16 3v26M6 9l20 14M26 9 6 23" stroke="#6fb8e6" stroke-width="1.6"/></svg>`;

/** ctx: { ice, mastery, spotId, nowHour, voice } */
export function createIceDrillInstance({ root, ctx, done }) {
  const { ice, mastery, spotId } = ctx;
  const speak = (text) => ctx.voice?.speak(text.replace(/<[^>]+>/g, ''));
  const visit = mastery.get('ice-drill');
  const quiz = QUIZ[visit.runs % QUIZ.length];

  const el = document.createElement('div');
  el.className = 'ez id';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'id-title');
  el.innerHTML = `
    <div class="ez-card">
      <header class="ez-head">
        <span class="ez-rivets" aria-hidden="true"><i></i><i></i></span>
        <h2 id="id-title" class="ez-title">${ICE_ICON}<span>${TEXT.title}</span></h2>
        <ol class="ez-steps" aria-label="Steps"></ol>
        <span class="ez-medal-slot"></span>
        <span class="ez-rivets" aria-hidden="true"><i></i><i></i></span>
      </header>
      <div class="ez-body"></div>
      <p class="ez-status" aria-live="polite"></p>
    </div>`;
  root.appendChild(el);
  const body = el.querySelector('.ez-body');
  const status = el.querySelector('.ez-status');
  const stepsEl = el.querySelector('.ez-steps');
  const medalSlot = el.querySelector('.ez-medal-slot');
  const announce = (msg) => (status.textContent = msg);
  const say = (mood, html, extra = '') => `<div class="ez-say ${extra}">${voltBot(mood)}<div class="ez-bubble">${html}</div></div>`;

  let screen = 'intro';
  let game = null;
  let round = null; // { chunks, bumps, soilKg, waterKg, quizTries, quizCorrect, stars }

  const setMedal = (level) => (medalSlot.innerHTML = MEDAL_NAME[level] ? `<span class="ez-medal">${medalIcon(level)}${MEDAL_NAME[level]}</span>` : '');
  setMedal(visit.level);

  function setScreen(id) {
    screen = id;
    el.dataset.screen = id;
    const at = STEPS.findIndex((s) => s.id === id);
    stepsEl.innerHTML = STEPS.map(
      (s, i) => `<li class="${i < at ? 'is-done' : ''} ${i === at ? 'is-now' : ''}" ${i === at ? 'aria-current="step"' : ''}><span>${i + 1}</span>${s.label}</li>`,
    ).join('');
    body.classList.remove('ez-enter');
    void body.offsetWidth;
    body.classList.add('ez-enter');
  }
  const focusFirst = () => body.querySelector('button:not([disabled])')?.focus();

  // ---------------------------------------------------------------- screens
  function showBlocked(reason, hoursLeft) {
    setScreen('intro');
    const text = reason === 'bag-full' ? TEXT.bagFull : TEXT.resting;
    speak(text);
    body.innerHTML = `
      ${say('think', `<h3 class="ez-h3">${reason === 'bag-full' ? 'Bag full!' : 'Dug out for now'}</h3><p>${text}</p>
        ${reason === 'resting' ? `<p class="ez-note">It glows again in about ${Math.ceil(hoursLeft)} game hours.</p>` : ''}`)}
      ${bagMeter()}
      <div class="ez-row ez-row-center"><button class="ez-btn ez-btn-go ez-btn-xl" data-leave>${IC.back}<span>${TEXT.back}</span></button></div>`;
    body.querySelector('[data-leave]').addEventListener('click', () => done({ completed: false }));
    focusFirst();
  }

  function bagMeter() {
    const f = Math.min(1, ice.bagKg / ICE.BAG_MAX_KG);
    return `
      <div class="ez-meter ez-tone-water id-bag">
        ${ICE_ICON}
        <div class="ez-meter-txt">
          <span class="ez-meter-label">Your bag of icy soil</span>
          <span class="ez-meter-bar"><i style="width:${(f * 100).toFixed(1)}%"></i></span>
        </div>
        <b class="ez-meter-val">${kg(ice.bagKg)} / ${ICE.BAG_MAX_KG} kg</b>
      </div>`;
  }

  function showIntro() {
    setScreen('intro');
    speak(`${TEXT.introTitle}! ${TEXT.intro[0]} ${TEXT.intro[1]}`);
    body.innerHTML = `
      ${say('wow', `<h3 class="ez-h3">${TEXT.introTitle}</h3><p>${TEXT.intro[0]}</p>`)}
      <div class="id-layers" aria-hidden="true">
        <span class="id-layer id-sky">Black sky — no air</span>
        <span class="id-layer id-shadow">Crater floor: always in shadow</span>
        <span class="id-layer id-soil">Regolith with ice grains ${ICE_ICON}${ICE_ICON}</span>
      </div>
      <p class="ez-p ez-center">${TEXT.intro[1]}</p>
      <div class="ez-row ez-row-center">
        <button class="ez-btn ez-btn-go ez-btn-xl" data-go>${ICE_ICON}<span>${TEXT.introGo}</span></button>
      </div>`;
    body.querySelector('[data-go]').addEventListener('click', () => {
      sfx.click();
      startRound();
    });
    focusFirst();
  }

  function startRound() {
    setScreen('play');
    const space = ICE.BAG_MAX_KG - ice.bagKg;
    const maxChunks = Math.max(1, Math.floor(space / ICE.SOIL_KG_PER_CHUNK + 1e-9));
    body.innerHTML = `
      <p class="id-hint">${TEXT.controls}</p>
      <div class="ez-screen id-screen"><canvas class="ez-canvas id-canvas" aria-label="Ice Drill: a drill digs down through Moon soil. Steer to grab blue icy soil and avoid grey rocks."></canvas></div>
      <div class="id-touch" aria-label="Drill controls">
        <button class="ez-btn ez-btn-ghost id-pad" data-steer="-1" aria-label="Steer left">◀</button>
        <button class="ez-btn ez-btn-go id-pad id-boost" data-boost aria-label="Drill faster">Faster</button>
        <button class="ez-btn ez-btn-ghost id-pad id-scan" data-scan aria-label="Scan for hidden ice">Scan</button>
        <button class="ez-btn ez-btn-ghost id-pad" data-steer="1" aria-label="Steer right">▶</button>
      </div>
      <div class="ez-row">
        <button class="ez-btn ez-btn-ghost" data-leave>${IC.back}<span>${TEXT.leave}</span></button>
        <span class="ez-goal">${ICE_ICON}${TEXT.goal}</span>
      </div>`;
    body.querySelector('[data-leave]').addEventListener('click', () => done({ completed: false }));
    game = createDrillGame({ canvas: body.querySelector('canvas'), maxChunks, announce, onComplete: finishRound });
    // touch / click buttons (hold to steer or boost)
    for (const b of body.querySelectorAll('[data-steer]')) {
      const dir = Number(b.dataset.steer);
      b.addEventListener('pointerdown', () => game?.steer(dir));
      for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => game?.steer(0));
    }
    body.querySelector('[data-scan]').addEventListener('click', () => game?.scan());
    const boost = body.querySelector('[data-boost]');
    boost.addEventListener('pointerdown', () => game?.setBoost(true));
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) boost.addEventListener(ev, () => game?.setBoost(false));
    announce(TEXT.goal);
    speak(TEXT.goal);
  }

  function finishRound(r) {
    game?.destroy();
    game = null;
    const got = finishDig(ice, spotId, ctx.nowHour, r.chunks);
    const newBest = r.bestStreak >= 2 && r.bestStreak > (ctx.bestStreak ?? 0);
    round = { ...r, soilKg: got.soilKg, waterKg: got.waterKg, quizTries: 0, newBest };
    showQuiz();
  }

  function showQuiz() {
    setScreen('quiz');
    speak(`Quick question! ${quiz.q}`);
    const order = shuffledOptions(quiz);
    const letters = ['A', 'B', 'C'];
    body.innerHTML = `
      ${say('think', `<h3 class="ez-h3">Quick question!</h3><p class="ez-q">${quiz.q}</p>`)}
      <div class="ez-answers">
        ${order
          .map(
            (oi, pos) => `<button class="ez-answer" data-i="${oi}" aria-label="${letters[pos]}: ${quiz.options[oi]}">
              <span class="ez-letter">${letters[pos]}</span><span class="ez-answer-txt">${quiz.options[oi]}</span><span class="ez-answer-mark"></span>
            </button>`,
          )
          .join('')}
      </div>
      <div class="ez-explain" hidden></div>`;
    body.querySelectorAll('.ez-answer').forEach((b) => b.addEventListener('click', () => answer(Number(b.dataset.i), b)));
    focusFirst();
  }

  function answer(i, btn) {
    round.quizTries++;
    if (i !== quiz.answer) {
      sfx.miss();
      btn.disabled = true;
      btn.classList.add('is-wrong');
      btn.querySelector('.ez-answer-mark').innerHTML = IC.cross;
      const left = [...body.querySelectorAll('.ez-answer:not([disabled])')];
      if (left.length > 1) {
        const ex = body.querySelector('.ez-explain');
        ex.hidden = false;
        ex.innerHTML = say('happy', `<p><b class="ez-try">Not quite — try again!</b> ${quiz.hint}</p>`, 'ez-say-small');
        left[0].focus();
        announce(`Not quite. Hint: ${quiz.hint}`);
        speak(`Not quite. Try again! ${quiz.hint}`);
        return;
      }
      return reveal(false);
    }
    reveal(true);
  }

  function reveal(right) {
    const firstTry = right && round.quizTries === 1;
    round.quizCorrect = firstTry;
    if (right) sfx.success();
    body.querySelectorAll('.ez-answer').forEach((b) => {
      b.disabled = true;
      if (Number(b.dataset.i) === quiz.answer) {
        b.classList.add('is-right');
        b.querySelector('.ez-answer-mark').innerHTML = IC.check;
      }
    });
    const head = firstTry ? 'Yes! +1 star' : right ? 'You got it!' : 'Here’s the answer!';
    const ex = body.querySelector('.ez-explain');
    ex.hidden = false;
    ex.innerHTML = `
      ${say(
        right ? 'cheer' : 'happy',
        `<p><b class="${right ? 'ez-yes' : 'ez-try'}">${head}</b> ${quiz.explain}</p>
         <p class="ez-source">${IC.link}<span>Source: <a href="${quiz.source.url}" target="_blank" rel="noopener noreferrer">${quiz.source.label}</a></span></p>`,
        'ez-say-small',
      )}
      <div class="ez-row ez-row-end"><button class="ez-btn ez-btn-go" data-next><span>See my stars</span>${starIcon(true)}</button></div>`;
    ex.querySelector('[data-next]').addEventListener('click', () => {
      sfx.click();
      showResult();
    });
    ex.querySelector('[data-next]').focus();
    announce(`${head} ${quiz.explain}`);
    speak(`${head.replace('+1', 'plus one')} ${quiz.explain}`);
  }

  function showResult() {
    setScreen('result');
    const stars = scoreDrill({ chunks: round.chunks, bumps: round.bumps, quizCorrect: !!round.quizCorrect });
    const m = mastery.recordRun('ice-drill', stars);
    round.stars = stars;
    setMedal(m.level);
    const cheer = round.soilKg > 0 ? ['', 'Icy soil collected!', 'Great drilling!', 'Perfect run — ice champion!'][stars] : 'No ice this time';
    const feels = moonFeelsLikeKg(ice.bagKg);
    speak(`${cheer} You dug ${Math.round(round.soilKg)} kilograms of icy soil. Only about ${round.waterKg.toFixed(1)} kilograms of it is water. Carry it to the Ice Oven in the habitat.`);
    body.innerHTML = `
      ${say('cheer', `<h3 class="ez-h3">${cheer}</h3><p>Now carry the bag to the <b>Ice Oven</b> in the habitat work bay.</p>`)}
      <div class="ez-stars" aria-label="${stars} of 3 stars">${[1, 2, 3].map((n) => starIcon(n <= stars)).join('')}</div>
      <ul class="ez-results">
        <li class="ez-res ez-tone-water">${ICE_ICON}<span><b>${kg(round.soilKg)} of icy soil</b> into your bag (now ${kg(ice.bagKg)})</span></li>
        <li class="ez-res ez-tone-water">${IC.water}<span><b>Only about ${kg(round.waterKg)} of it is water</b> — Moon soil like this is about ${(ICE.ICE_MASS_FRACTION * 100).toFixed(1)}% ice (NASA LCROSS)</span></li>
        <li class="ez-res ez-tone-power">${IC.power}<span><b>Best ice streak: ×${round.bestStreak}</b>${round.megas ? ` · ${round.megas} mega ice!` : ''}${round.newBest ? ' · <b class="ez-yes">New record!</b>' : ''}</span></li>
        <li class="ez-res ez-tone-time">${ICE_ICON}<span><b>Your bag feels like ${kg(feels)}</b> — on the Moon, things weigh about 1/6 of what they do on Earth</span></li>
      </ul>
      ${MEDAL_NAME[m.level] ? `<p class="ez-mastery">${medalIcon(m.level)}<span>Ice Drill mastery: <b>${MEDAL_NAME[m.level]}</b></span></p>` : ''}
      <div class="ez-row ez-row-center"><button class="ez-btn ez-btn-go ez-btn-xl" data-back>${IC.back}<span>${TEXT.back}</span></button></div>`;
    body.querySelector('[data-back]').addEventListener('click', closeWithResult);
    focusFirst();
  }

  function closeWithResult() {
    done({ completed: true, soilKg: round.soilKg, waterKg: round.waterKg, stars: round.stars, bagKg: ice.bagKg, bestStreak: round.bestStreak });
  }

  // ---------------------------------------------------------------- keys
  function onKey(e) {
    if (screen === 'play' && game && ['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyS'].includes(e.code)) {
      e.preventDefault();
      game.key(e.code, true);
      return;
    }
    if (e.code === 'Escape') {
      e.preventDefault();
      if (screen === 'quiz') showResult();
      else if (screen === 'result') closeWithResult();
      else done({ completed: false });
    }
  }
  const onKeyUp = (e) => {
    if (screen === 'play') game?.key(e.code, false);
  };
  window.addEventListener('keyup', onKeyUp);

  const check = checkDig(ice, spotId, ctx.nowHour);
  if (!check.ok) showBlocked(check.reason, check.hoursLeft);
  else if (visit.runs === 0) showIntro();
  else startRound();

  return {
    onKey,
    destroy() {
      window.removeEventListener('keyup', onKeyUp);
      ctx.voice?.stop();
      game?.destroy();
      game = null;
    },
  };
}

