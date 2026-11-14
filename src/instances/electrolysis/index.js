// index.js — Electrolysis instance: intro → choose batch → Molecule Zapper → quiz → result.
// Game rules (costs, affordability, stars) live in systems/electrolysis.js; this file only
// shows screens and calls them. The batch is paid for when the round finishes, so leaving
// early costs nothing and makes nothing (no free oxygen, no lost water).
import './style.css';
import { POWER, ELECTROLYSIS, OXYGEN } from '../../config/gameplay.js';
import { powerPercent } from '../../systems/gauges.js';
import { batchCost, checkAfford, applyBatch, scoreRound } from '../../systems/electrolysis.js';
import { sfx } from '../../ui/sfx.js';
import { createZapperGame } from './game.js';
import { TEXT, QUIZ, realTimeLine, shuffledOptions } from './content.js';
import { IC, starIcon, medalIcon, flaskIcon, voltBot } from './icons.js';

const MEDAL_NAME = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };
const STEPS = [
  { id: 'choose', label: 'Pick' },
  { id: 'play', label: 'Zap' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'result', label: 'Stars' },
];
const kg = (v) => `${v.toFixed(v < 1 ? 2 : 1)} kg`;
const pct = (v) => `${Math.round(v)}%`;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// The intro molecule: bent H₂O (~104.5°) with labelled call-outs.
const WATER_SVG = `
<svg class="ez-molecule" viewBox="0 0 260 170" role="img" aria-label="A water molecule: one red oxygen atom joined to two white hydrogen atoms">
  <g stroke-linecap="round">
    <line x1="130" y1="58" x2="62" y2="134" stroke="#10182c" stroke-width="16"/>
    <line x1="130" y1="58" x2="198" y2="134" stroke="#10182c" stroke-width="16"/>
    <line x1="130" y1="58" x2="62" y2="134" stroke="#e8eefb" stroke-width="9"/>
    <line x1="130" y1="58" x2="198" y2="134" stroke="#e8eefb" stroke-width="9"/>
  </g>
  <g class="ez-mol-h"><circle cx="62" cy="134" r="26" fill="#f2f5ff" stroke="#10182c" stroke-width="4"/><text x="62" y="144" text-anchor="middle" class="ez-atom">H</text></g>
  <g class="ez-mol-h ez-mol-h2"><circle cx="198" cy="134" r="26" fill="#f2f5ff" stroke="#10182c" stroke-width="4"/><text x="198" y="144" text-anchor="middle" class="ez-atom">H</text></g>
  <g class="ez-mol-o"><circle cx="130" cy="58" r="40" fill="#ff6b6b" stroke="#10182c" stroke-width="4"/>
  <path d="M104 46a28 28 0 0 1 14-14" fill="none" stroke="#ffc2c2" stroke-width="6" stroke-linecap="round"/>
  <text x="130" y="72" text-anchor="middle" class="ez-atom ez-atom-big">O</text></g>
</svg>`;

/**
 * ctx: { gauges, station (electrolysis state), mastery (from systems/mastery.js) }
 */
export function createElectrolysisInstance({ root, ctx, done }) {
  const { gauges, station, mastery } = ctx;
  // Volt speaks his bubble lines out loud (browser voice; silent if off or unsupported)
  const speak = (text) => ctx.voice?.speak(text);
  const visit = mastery.get('electrolysis');
  const quiz = QUIZ[visit.runs % QUIZ.length];

  const el = document.createElement('div');
  el.className = 'ez';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'ez-title');
  el.innerHTML = `
    <div class="ez-card">
      <header class="ez-head">
        <span class="ez-rivets" aria-hidden="true"><i></i><i></i></span>
        <h2 id="ez-title" class="ez-title">${IC.power}<span>${TEXT.title}</span></h2>
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

  let screen = 'intro';
  let game = null;
  let round = null; // { batchId, hits, misses, seconds, maxCombo, paid, quizCorrect, stars }

  function setMedal(level) {
    medalSlot.innerHTML = MEDAL_NAME[level]
      ? `<span class="ez-medal">${medalIcon(level)}${MEDAL_NAME[level]}</span>`
      : '';
  }
  setMedal(visit.level);

  function setScreen(id) {
    screen = id;
    el.dataset.screen = id;
    const at = STEPS.findIndex((s) => s.id === id);
    stepsEl.innerHTML = STEPS.map(
      (s, i) =>
        `<li class="${i < at ? 'is-done' : ''} ${i === at ? 'is-now' : ''}" ${i === at ? 'aria-current="step"' : ''}><span>${i + 1}</span>${s.label}</li>`,
    ).join('');
    body.classList.remove('ez-enter');
    void body.offsetWidth; // restart the entrance animation
    body.classList.add('ez-enter');
  }

  /** Volt the helper robot says something. */
  const say = (mood, html, extra = '') =>
    `<div class="ez-say ${extra}">${voltBot(mood)}<div class="ez-bubble">${html}</div></div>`;

  function meter(icon, label, value, fill, tone) {
    return `
      <div class="ez-meter ez-tone-${tone}">
        ${icon}
        <div class="ez-meter-txt">
          <span class="ez-meter-label">${label}</span>
          <span class="ez-meter-bar"><i style="width:${(clamp01(fill) * 100).toFixed(1)}%"></i></span>
        </div>
        <b class="ez-meter-val">${value}</b>
      </div>`;
  }

  function focusFirst() {
    body.querySelector('button:not([disabled])')?.focus();
  }

  // ---------------------------------------------------------------- screens
  function showIntro() {
    speak(`${TEXT.introTitle}! ${TEXT.intro[0]} ${TEXT.intro[1]}`);
    setScreen('intro');
    body.innerHTML = `
      ${say('wow', `<h3 class="ez-h3">${TEXT.introTitle}</h3><p>${TEXT.intro[0]}</p>`)}
      <div class="ez-mol-wrap">
        ${WATER_SVG}
        <span class="ez-tag ez-tag-o">1 oxygen</span>
        <span class="ez-tag ez-tag-h">2 hydrogen</span>
        <span class="ez-formula">H<sub>2</sub>O</span>
      </div>
      <p class="ez-p ez-center">${TEXT.intro[1]}</p>
      <div class="ez-row ez-row-center">
        <button class="ez-btn ez-btn-go ez-btn-xl" data-go>${IC.power}<span>${TEXT.introGo}</span></button>
      </div>`;
    body.querySelector('[data-go]').addEventListener('click', () => {
      sfx.click();
      showChoose();
    });
    focusFirst();
  }

  function showChoose() {
    setScreen('choose');
    const pp = powerPercent(gauges);
    const smallest = ELECTROLYSIS.BATCHES[0].id;
    const tankEmpty = station.tankKg < batchCost(smallest).waterKg - 1e-9;
    const allFull = checkAfford(gauges, station, smallest).reason === 'full';
    const cards = ELECTROLYSIS.BATCHES.map((b, i) => {
      const c = batchCost(b.id);
      const a = checkAfford(gauges, station, b.id);
      const o2Pct = (c.o2Kg / OXYGEN.CAPACITY_KG) * 100;
      const battPct = (c.kwh / POWER.BATTERY_CAPACITY_KWH) * 100;
      return `
        <button class="ez-batch" data-batch="${b.id}" ${a.ok ? '' : 'disabled'} aria-describedby="ez-why-${b.id}" style="--i:${i}">
          <span class="ez-batch-art">${flaskIcon(i, !a.ok)}</span>
          <span class="ez-batch-name">${b.label}</span>
          <span class="ez-batch-gain">${IC.oxygen}+${pct(o2Pct)} oxygen</span>
          <span class="ez-chips">
            <span class="ez-chip ez-chip-water">${IC.water}${kg(c.waterKg)}</span>
            <span class="ez-chip ez-chip-power">${IC.power}${c.kwh.toFixed(1)} kWh <small>(${pct(battPct)})</small></span>
          </span>
          <span class="ez-batch-why ${a.ok ? '' : 'is-locked'}" id="ez-why-${b.id}">
            ${a.ok ? `Split ${c.zaps} molecules` : `${IC.lock}${TEXT.reasons[a.reason]}`}
          </span>
        </button>`;
    }).join('');
    const mood = allFull || tankEmpty ? 'think' : 'happy';
    const line = allFull ? TEXT.allFull : tankEmpty ? TEXT.tankEmpty : TEXT.chooseSub;
    speak(`${TEXT.chooseTitle} ${line}`);
    body.innerHTML = `
      ${say(mood, `<h3 class="ez-h3">${TEXT.chooseTitle}</h3><p>${line}</p>`)}
      <div class="ez-meters">
        ${meter(IC.water, 'Water tank', kg(station.tankKg), station.tankKg / ELECTROLYSIS.TANK_START_KG, 'water')}
        ${meter(IC.power, 'Base power', pct(pp), pp / 100, 'power')}
        ${meter(IC.oxygen, 'Oxygen', pct(gauges.oxygen), gauges.oxygen / 100, 'oxygen')}
      </div>
      <div class="ez-batches">${cards}</div>
      <p class="ez-note">${TEXT.powerNote}</p>
      <div class="ez-row">
        <button class="ez-btn ez-btn-ghost" data-intro>${IC.book}<span>What is electrolysis?</span></button>
        <button class="ez-btn ez-btn-ghost" data-leave>${IC.back}<span>${TEXT.back}</span></button>
      </div>`;
    body.querySelectorAll('[data-batch]').forEach((btn) =>
      btn.addEventListener('click', () => {
        sfx.click();
        startRound(btn.dataset.batch);
      }),
    );
    body.querySelector('[data-intro]').addEventListener('click', () => {
      sfx.click();
      showIntro();
    });
    body.querySelector('[data-leave]').addEventListener('click', () => done({ completed: false }));
    focusFirst();
  }

  function startRound(batchId) {
    // re-check: the base may have changed since the screen was drawn
    if (!checkAfford(gauges, station, batchId).ok) {
      showChoose();
      return;
    }
    setScreen('play');
    const c = batchCost(batchId);
    round = { batchId, paid: false };
    body.innerHTML = `
      <div class="ez-hints">
        <span class="ez-hint">${IC.mouse}<span><b>Click</b> a water molecule</span></span>
        <span class="ez-hint-or">or</span>
        <span class="ez-hint">${IC.keySpace}<span>press <b>Space</b> in the glowing zone</span></span>
      </div>
      <div class="ez-screen"><canvas class="ez-canvas" aria-label="Molecule Zapper: water molecules float between a minus and a plus electrode. Split them to fill the hydrogen and oxygen tubes."></canvas></div>
      <div class="ez-row">
        <button class="ez-btn ez-btn-ghost" data-leave>${IC.back}<span>${TEXT.leave}</span></button>
        <span class="ez-goal">${IC.oxygen}Goal: <b>${c.o2Kg} kg</b> of oxygen</span>
      </div>`;
    body.querySelector('[data-leave]').addEventListener('click', () => done({ completed: false }));
    game = createZapperGame({
      canvas: body.querySelector('.ez-canvas'),
      zaps: c.zaps,
      announce,
      onComplete: (r) => finishRound(r),
    });
    announce(`Split ${c.zaps} water molecules to make ${c.o2Kg} kilograms of oxygen.`);
  }

  function finishRound(r) {
    game?.destroy();
    game = null;
    // pay for the batch now (water + power + heat from misses) and store the oxygen
    const paid = applyBatch(gauges, station, round.batchId, r.misses);
    round = { ...round, ...r, paid };
    showQuiz();
  }

  function showQuiz() {
    setScreen('quiz');
    speak(`Quick question! ${quiz.q}`);
    round.quizTries = 0;
    const order = shuffledOptions(quiz); // display position → original option index
    const letters = ['A', 'B', 'C', 'D'];
    body.innerHTML = `
      ${say('think', `<h3 class="ez-h3">Quick question!</h3><p class="ez-q">${quiz.q}</p>`)}
      <div class="ez-answers ${quiz.big ? 'is-big' : ''}" style="--n:${order.length}">
        ${order
          .map((oi, pos) => {
            const o = quiz.options[oi];
            const pic = o.icon ? IC[o.icon] : `<span class="ez-num">${o.text}</span>`;
            return `<button class="ez-answer" data-i="${oi}" style="--i:${pos}" aria-label="${letters[pos]}: ${o.text}">
                <span class="ez-letter">${letters[pos]}</span>
                <span class="ez-answer-pic">${pic}</span>
                ${o.icon ? `<span class="ez-answer-txt">${o.text}</span>` : ''}
                <span class="ez-answer-mark"></span>
              </button>`;
          })
          .join('')}
      </div>
      <div class="ez-explain" hidden></div>`;
    body.querySelectorAll('.ez-answer').forEach((btn) =>
      btn.addEventListener('click', () => answer(Number(btn.dataset.i), btn)),
    );
    focusFirst();
  }

  /** Wrong first try → Volt gives a hint and the kid tries again. Star only for a right first try. */
  function answer(i, btn) {
    round.quizTries++;
    const right = i === quiz.answer;
    const ex = body.querySelector('.ez-explain');
    if (!right) {
      sfx.miss();
      btn.disabled = true;
      btn.classList.add('is-wrong');
      btn.querySelector('.ez-answer-mark').innerHTML = IC.cross;
      const left = [...body.querySelectorAll('.ez-answer:not([disabled])')];
      if (left.length > 1) {
        ex.hidden = false;
        ex.innerHTML = say('happy', `<p><b class="ez-try">Not quite — try again!</b> ${quiz.hint}</p>`, 'ez-say-small');
        left[0].focus();
        announce(`Not quite. Hint: ${quiz.hint}`);
        speak(`Not quite. Try again! ${quiz.hint}`);
        return;
      }
      // only the right answer is left: show it
      reveal(false);
      return;
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
         <p class="ez-source">${IC.link}<span>Source: <a href="${quiz.source.url}" target="_blank" rel="noopener">${quiz.source.label}</a></span></p>`,
        'ez-say-small',
      )}
      <div class="ez-row ez-row-end"><button class="ez-btn ez-btn-go" data-next><span>See my stars</span>${starIcon(true)}</button></div>`;
    ex.querySelector('[data-next]').addEventListener('click', () => {
      sfx.click();
      showResult();
    });
    ex.querySelector('[data-next]').focus();
    announce(`${head} ${quiz.explain}`);
    speak(`${head.replace("+1", "plus one")} ${quiz.explain}`);
  }

  function showResult() {
    setScreen('result');
    const stars = scoreRound({ hits: round.hits, misses: round.misses, quizCorrect: !!round.quizCorrect });
    const m = mastery.recordRun('electrolysis', stars);
    round.stars = stars;
    setMedal(m.level);
    const p = round.paid;
    const cheer = ['', 'Oxygen made — nice work!', 'Great zapping!', 'Perfect run — superstar!'][stars];
    speak(`${cheer} You split water into oxygen to breathe. You got ${stars} ${stars === 1 ? 'star' : 'stars'}!`);
    const heat = p.heatKwh > 0 ? ` <small>(${p.heatKwh.toFixed(2)} lost as heat)</small>` : '';
    body.innerHTML = `
      ${say('cheer', `<h3 class="ez-h3">${cheer}</h3><p>You split water into oxygen to breathe.</p>`)}
      <div class="ez-stars" aria-label="${stars} of 3 stars">${[1, 2, 3].map((n) => starIcon(n <= stars)).join('')}</div>
      <ul class="ez-results">
        <li class="ez-res ez-tone-oxygen">${IC.oxygen}<span><b>+${pct((p.storedKg / OXYGEN.CAPACITY_KG) * 100)} oxygen</b> ${kg(p.storedKg)} of O₂ for the base</span></li>
        <li class="ez-res ez-tone-water">${IC.water}<span><b>${kg(p.waterKg)} water used</b> ${kg(station.tankKg)} left in the tank</span></li>
        <li class="ez-res ez-tone-power">${IC.power}<span><b>${(p.kwh + p.heatKwh).toFixed(1)} kWh power used</b>${heat}</span></li>
        <li class="ez-res ez-tone-time">${IC.clock}<span><b>Time passes on the base</b> ${realTimeLine(p.realHours)}</span></li>
      </ul>
      ${MEDAL_NAME[m.level] ? `<p class="ez-mastery">${medalIcon(m.level)}<span>Station mastery: <b>${MEDAL_NAME[m.level]}</b></span></p>` : ''}
      <div class="ez-row ez-row-center"><button class="ez-btn ez-btn-go ez-btn-xl" data-back>${IC.back}<span>${TEXT.back}</span></button></div>`;
    body.querySelector('[data-back]').addEventListener('click', closeWithResult);
    focusFirst();
  }

  function closeWithResult() {
    const p = round.paid;
    done({
      completed: true,
      gameHours: p.realHours, // same span on the sped-up base clock
      o2Kg: p.storedKg,
      waterKg: p.waterKg,
      kwh: p.kwh + p.heatKwh,
      stars: round.stars,
    });
  }

  // ---------------------------------------------------------------- keys
  function onKey(e) {
    if (e.code === 'Space' && screen === 'play') {
      e.preventDefault();
      if (!e.repeat) game?.zapInZone();
    } else if (e.code === 'Escape') {
      e.preventDefault();
      if (screen === 'quiz') showResult();
      else if (screen === 'result') closeWithResult();
      else done({ completed: false });
    }
  }

  if (visit.runs === 0) showIntro();
  else showChoose();

  return {
    onKey,
    destroy() {
      ctx.voice?.stop();
      game?.destroy();
      game = null;
    },
  };
}
