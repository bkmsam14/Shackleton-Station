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
import { TEXT, QUIZ, realTimeLine } from './content.js';

const MEDAL = { none: '', bronze: '🥉 Bronze', silver: '🥈 Silver', gold: '🥇 Gold' };
const kg = (v) => `${v.toFixed(v < 1 ? 2 : 1)} kg`;
const pct = (v) => `${Math.round(v)}%`;

// Tiny H₂O picture for the intro (bent molecule, ~104.5°).
const WATER_SVG = `
<svg class="ez-molecule" viewBox="0 0 200 150" role="img" aria-label="A water molecule: one red oxygen atom joined to two white hydrogen atoms">
  <line x1="100" y1="60" x2="58" y2="112" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity="0.7"/>
  <line x1="100" y1="60" x2="142" y2="112" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity="0.7"/>
  <circle cx="58" cy="112" r="24" fill="#f2f5ff"/><text x="58" y="120" text-anchor="middle" class="ez-atom">H</text>
  <circle cx="142" cy="112" r="24" fill="#f2f5ff"/><text x="142" y="120" text-anchor="middle" class="ez-atom">H</text>
  <circle cx="100" cy="60" r="38" fill="#ff6b6b"/><text x="100" y="72" text-anchor="middle" class="ez-atom ez-atom-big">O</text>
</svg>`;

/**
 * ctx: { gauges, station (electrolysis state), mastery (from systems/mastery.js) }
 */
export function createElectrolysisInstance({ root, ctx, done }) {
  const { gauges, station, mastery } = ctx;
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
        <h2 id="ez-title" class="ez-title">⚡ ${TEXT.title}</h2>
        <span class="ez-medal">${MEDAL[visit.level]}</span>
      </header>
      <div class="ez-body"></div>
      <p class="ez-status" aria-live="polite"></p>
    </div>`;
  root.appendChild(el);
  const body = el.querySelector('.ez-body');
  const status = el.querySelector('.ez-status');
  const announce = (msg) => (status.textContent = msg);

  let screen = 'intro';
  let game = null;
  let round = null; // { batchId, hits, misses, seconds, maxCombo, paid }

  function focusFirst() {
    body.querySelector('button:not([disabled])')?.focus();
  }

  // ---------------------------------------------------------------- screens
  function showIntro() {
    screen = 'intro';
    body.innerHTML = `
      <h3 class="ez-h3">${TEXT.introTitle}</h3>
      ${WATER_SVG}
      ${TEXT.intro.map((p) => `<p class="ez-p">${p}</p>`).join('')}
      <div class="ez-row">
        <button class="btn btn-big" data-go>${TEXT.introGo}</button>
      </div>`;
    body.querySelector('[data-go]').addEventListener('click', () => {
      sfx.click();
      showChoose();
    });
    focusFirst();
  }

  function showChoose() {
    screen = 'choose';
    const pp = powerPercent(gauges);
    const smallest = ELECTROLYSIS.BATCHES[0].id;
    const tankEmpty = station.tankKg < batchCost(smallest).waterKg - 1e-9;
    const allFull = checkAfford(gauges, station, smallest).reason === 'full';
    const cards = ELECTROLYSIS.BATCHES.map((b) => {
      const c = batchCost(b.id);
      const a = checkAfford(gauges, station, b.id);
      const o2Pct = (c.o2Kg / OXYGEN.CAPACITY_KG) * 100;
      const battPct = (c.kwh / POWER.BATTERY_CAPACITY_KWH) * 100;
      return `
        <button class="ez-batch" data-batch="${b.id}" ${a.ok ? '' : 'disabled'} aria-describedby="ez-why-${b.id}">
          <span class="ez-batch-name">${b.label}</span>
          <span class="ez-batch-gain">+${pct(o2Pct)} oxygen</span>
          <span class="ez-batch-cost">💧 ${kg(c.waterKg)} water</span>
          <span class="ez-batch-cost">⚡ ${c.kwh.toFixed(1)} kWh (${pct(battPct)} battery)</span>
          <span class="ez-batch-why" id="ez-why-${b.id}">${a.ok ? `${c.zaps} molecules to split` : TEXT.reasons[a.reason]}</span>
        </button>`;
    }).join('');
    body.innerHTML = `
      <h3 class="ez-h3">${TEXT.chooseTitle}</h3>
      <p class="ez-p">${TEXT.chooseSub}</p>
      <div class="ez-meters">
        <span>💧 Water tank: <b>${kg(station.tankKg)}</b></span>
        <span>⚡ Base power: <b>${pct(pp)}</b></span>
        <span>🫧 Oxygen: <b>${pct(gauges.oxygen)}</b></span>
      </div>
      ${allFull ? `<p class="ez-warn">${TEXT.allFull}</p>` : ''}
      ${tankEmpty ? `<p class="ez-warn">${TEXT.tankEmpty}</p>` : ''}
      <div class="ez-batches">${cards}</div>
      <p class="ez-note">${TEXT.powerNote}</p>
      <div class="ez-row">
        <button class="link-btn ez-link" data-intro>What is electrolysis?</button>
        <button class="btn ez-btn-quiet" data-leave>${TEXT.back}</button>
      </div>`;
    body.querySelectorAll('[data-batch]').forEach((btn) =>
      btn.addEventListener('click', () => {
        sfx.click();
        startRound(btn.dataset.batch);
      }),
    );
    body.querySelector('[data-intro]').addEventListener('click', showIntro);
    body.querySelector('[data-leave]').addEventListener('click', () => done({ completed: false }));
    focusFirst();
  }

  function startRound(batchId) {
    // re-check: the base may have changed since the screen was drawn
    if (!checkAfford(gauges, station, batchId).ok) {
      showChoose();
      return;
    }
    screen = 'play';
    const c = batchCost(batchId);
    round = { batchId, paid: false };
    body.innerHTML = `
      <p class="ez-hint">${TEXT.playHint}</p>
      <canvas class="ez-canvas" aria-label="Molecule Zapper: water molecules float between a minus and a plus electrode. Split them to fill the hydrogen and oxygen tubes."></canvas>
      <div class="ez-row">
        <button class="btn ez-btn-quiet" data-leave>${TEXT.leave}</button>
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
    screen = 'quiz';
    body.innerHTML = `
      <h3 class="ez-h3">Quick question!</h3>
      <p class="ez-p ez-q">${quiz.q}</p>
      <div class="ez-answers">
        ${quiz.options.map((o, i) => `<button class="ez-answer" data-i="${i}">${o}</button>`).join('')}
      </div>
      <div class="ez-explain" hidden></div>`;
    body.querySelectorAll('.ez-answer').forEach((btn) =>
      btn.addEventListener('click', () => answer(Number(btn.dataset.i))),
    );
    focusFirst();
  }

  function answer(i) {
    const right = i === quiz.answer;
    round.quizCorrect = right;
    right ? sfx.success() : sfx.miss();
    body.querySelectorAll('.ez-answer').forEach((btn, j) => {
      btn.disabled = true;
      if (j === quiz.answer) btn.classList.add('is-right');
      else if (j === i) btn.classList.add('is-wrong');
    });
    const ex = body.querySelector('.ez-explain');
    ex.hidden = false;
    ex.innerHTML = `
      <p class="ez-p"><b>${right ? 'Yes! ⭐ +1 star' : 'Good try!'}</b> ${quiz.explain}</p>
      <p class="ez-source">Source: <a href="${quiz.source.url}" target="_blank" rel="noopener">${quiz.source.label}</a></p>
      <div class="ez-row"><button class="btn btn-big" data-next>See results</button></div>`;
    ex.querySelector('[data-next]').addEventListener('click', showResult);
    ex.querySelector('[data-next]').focus();
    announce(right ? 'Correct!' : 'Not quite.');
  }

  function showResult() {
    screen = 'result';
    const stars = scoreRound({ hits: round.hits, misses: round.misses, quizCorrect: !!round.quizCorrect });
    const m = mastery.recordRun('electrolysis', stars);
    round.stars = stars;
    const p = round.paid;
    const starRow = [1, 2, 3].map((n) => `<span class="ez-star ${n <= stars ? 'is-on' : ''}">★</span>`).join('');
    body.innerHTML = `
      <h3 class="ez-h3">Oxygen made!</h3>
      <div class="ez-stars" aria-label="${stars} of 3 stars">${starRow}</div>
      <ul class="ez-results">
        <li>🫧 +${pct((p.storedKg / OXYGEN.CAPACITY_KG) * 100)} oxygen (${kg(p.storedKg)} O₂)</li>
        <li>💧 Used ${kg(p.waterKg)} water — ${kg(station.tankKg)} left in the tank</li>
        <li>⚡ Used ${(p.kwh + p.heatKwh).toFixed(1)} kWh power${p.heatKwh > 0 ? ` (${p.heatKwh.toFixed(2)} kWh lost as heat from misses)` : ''}</li>
        <li>⏱️ ${realTimeLine(p.realHours)} Time passes on the base while it runs.</li>
      </ul>
      <p class="ez-p">${MEDAL[m.level] ? `Station mastery: <b>${MEDAL[m.level]}</b>` : ''}</p>
      <div class="ez-row"><button class="btn btn-big" data-back>${TEXT.back}</button></div>`;
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
      game?.destroy();
      game = null;
    },
  };
}
