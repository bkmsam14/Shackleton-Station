// waterWalls — the storm shelter's water-wall panel (an instance overlay).
// Pump water between the Electrolysis tank and the shelter walls. The trade-off is real:
// water in the walls protects you in the shelter, but it can't make oxygen until you pump it
// back. Uses the Molecule Zapper's console look (style.css) and Volt.
//
// What it teaches (see content.js for sources):
//  - a live "particle test": particles stopped or passing the wall, using the game's real
//    shielding numbers, so moving the slider changes what you see;
//  - "Where are you safest?": particles reaching you out of 100, for every place in the base;
//  - "Did you know?" cards (why water, why not metal, real NASA water walls, use the mass);
//  - a quick, easy check question after pumping.
import '../electrolysis/style.css';
import './style.css';
import { RADIATION, POWER } from '../../config/gameplay.js';
import { moveWater, expectedStormDose, particlesPerHundred } from '../../systems/radiation.js';
import { IC, voltBot } from '../electrolysis/icons.js';
import { sfx } from '../../ui/sfx.js';
import { FACTS, QUIZ } from './content.js';
import { createParticleTest } from './particleTest.js';

const kg = (v) => `${v.toFixed(1)} kg`;
const STRONG = { intensity: 1 }; // the strongest storm, for the "how protected am I?" preview
const INTRO = 'More water around the shelter means fewer particles reach you. But water in the walls <b>can’t make oxygen</b>. Move the slider and watch the particle test!';
const REASONS = {
  power: 'Not enough power to run the pump. Wait for sunlight!',
  'tank-empty': 'The tank is empty.',
  'walls-full': 'The walls are full.',
  'walls-empty': 'The walls are already empty.',
};
const PLACES = [
  { id: 'outside', label: 'Outside in a suit' },
  { id: 'greenhouse', label: 'Greenhouse' },
  { id: 'habitat', label: 'Habitat' },
  { id: 'shelter', label: 'Storm shelter' },
];
const plain = (html) => html.replace(/<[^>]+>/g, '');

let visits = 0; // rotates the fact card and the quiz question between visits (this session)

/** ctx: { gauges, station, voice } */
export function createWaterWallsInstance({ root, ctx, done }) {
  const { gauges, station } = ctx;
  const maxWalls = () => Math.min(RADIATION.WALL_CAPACITY_KG, station.tankKg + station.wallKg);
  const quiz = QUIZ[visits % QUIZ.length];
  let factIndex = visits % FACTS.length;
  visits++;
  let target = station.wallKg;
  let quizState = 'hidden'; // hidden → asking → done

  const el = document.createElement('div');
  el.className = 'ez ww';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'ww-title');
  el.innerHTML = `
    <div class="ez-card">
      <header class="ez-head">
        <span class="ez-rivets" aria-hidden="true"><i></i><i></i></span>
        <h2 id="ww-title" class="ez-title">${IC.water}<span>Water walls</span></h2>
        <span class="ez-medal-slot"></span>
        <span class="ez-rivets" aria-hidden="true"><i></i><i></i></span>
      </header>
      <div class="ez-body">
        <div class="ez-say"><span data-volt>${voltBot('happy')}</span><div class="ez-bubble">
          <h3 class="ez-h3">Water stops radiation!</h3>
          <p data-msg aria-live="polite">${INTRO}</p>
        </div></div>

        <div class="ww-lab">
          <figure class="ww-box">
            <figcaption class="ww-box-title">Particle test</figcaption>
            <canvas class="ww-canvas" data-canvas role="img" aria-label="Particles fly from the Sun toward an astronaut behind the shelter wall"></canvas>
            <ul class="ww-legend">
              <li><i class="ww-dot ww-dot-fly"></i>fast particle</li>
              <li><i class="ww-dot ww-dot-stop"></i>stopped by the wall</li>
              <li><i class="ww-dot ww-dot-pass"></i>got through</li>
            </ul>
          </figure>
          <div class="ww-box">
            <span class="ww-box-title">Where are you safest?</span>
            <span class="ww-sub">Particles that reach you, out of every 100</span>
            <ol class="ww-bars" data-bars></ol>
          </div>
        </div>

        <div class="ww-split">
          <div class="ww-col">
            <span class="ww-label">${IC.water} Electrolysis tank</span>
            <span class="ww-big" data-tank></span>
            <span class="ww-sub">for making oxygen</span>
          </div>
          <div class="ww-arrow" aria-hidden="true">⇄</div>
          <div class="ww-col ww-col-walls">
            <span class="ww-label">${IC.water} Shelter walls</span>
            <span class="ww-big" data-walls></span>
            <span class="ww-sub">blocks radiation</span>
          </div>
        </div>
        <label class="ww-slider-label" for="ww-slider">Water in the walls: <b data-target></b> of ${kg(RADIATION.WALL_CAPACITY_KG)}</label>
        <input id="ww-slider" class="ww-slider" type="range" min="0" step="0.5" />
        <div class="ww-meters">
          <div class="ww-meter">
            <span>A big storm in the shelter would give you about</span>
            <b data-dose></b>
            <span class="ww-sub" data-dose-now></span>
          </div>
          <div class="ww-meter">
            <span>Pump cost</span>
            <b>${IC.power} <span data-kwh></span></b>
            <span class="ww-sub" data-batt></span>
          </div>
        </div>

        <section class="ww-learn" data-learn aria-live="polite"></section>

        <p class="ez-note">Real shelters would need thousands of kg of water. Here the amounts and numbers are game-sized, but the idea is real: shielding is mass.</p>
        <div class="ez-row">
          <button class="ez-btn ez-btn-ghost" data-close>${IC.back}<span>Back to base</span></button>
          <button class="ez-btn ez-btn-go" data-pump>${IC.water}<span data-pump-label></span></button>
        </div>
      </div>
    </div>`;
  root.appendChild(el);
  const $ = (s) => el.querySelector(s);
  const slider = $('#ww-slider');
  const test = createParticleTest($('[data-canvas]'));

  function say(text, mood = 'think') {
    $('[data-msg]').innerHTML = text;
    $('[data-volt]').innerHTML = voltBot(mood);
  }

  // ------------------------------------------------------------ "Where are you safest?" bars
  function renderBars(wallKg) {
    const rows = [...PLACES, { id: 'shelter', label: 'Shelter + your water walls', walls: true }];
    $('[data-bars]').innerHTML = rows
      .map((p) => {
        const n = particlesPerHundred(p.id, p.walls ? wallKg : 0);
        return `<li class="ww-bar ${p.walls ? 'is-you' : ''}">
          <span class="ww-bar-label">${p.label}</span>
          <span class="ww-bar-track"><span class="ww-bar-fill" style="width:${n}%"></span></span>
          <b class="ww-bar-num">${n}</b>
        </li>`;
      })
      .join('');
  }

  // ------------------------------------------------------------ fact cards / quick check
  function renderFact() {
    const f = FACTS[factIndex];
    $('[data-learn]').innerHTML = `
      <div class="ww-fact">
        <span class="ww-fact-tag">${IC.book} Did you know? <small>${factIndex + 1} / ${FACTS.length}</small></span>
        <h3 class="ez-h3">${f.title}</h3>
        <p>${f.text}</p>
        <p class="sr-source">Source: <a href="${f.url}" target="_blank" rel="noopener noreferrer">${f.source}</a></p>
        <button class="ez-btn ez-btn-ghost ww-next" data-next><span>Next fact</span></button>
      </div>`;
    $('[data-next]').addEventListener('click', () => {
      sfx.click();
      factIndex = (factIndex + 1) % FACTS.length;
      renderFact();
      ctx.voice?.speak(`${FACTS[factIndex].title} ${plain(FACTS[factIndex].text)}`);
    });
  }

  function renderQuiz() {
    quizState = 'asking';
    $('[data-learn]').innerHTML = `
      <div class="ww-fact">
        <span class="ww-fact-tag">${IC.check} Quick check!</span>
        <p class="ez-q">${quiz.q}</p>
        <div class="ez-answers">
          ${quiz.options
            .map(
              (o, i) => `<button class="ez-answer" data-i="${i}">
                <span class="ez-letter">${'ABC'[i]}</span><span class="ez-answer-txt">${o}</span><span class="ez-answer-mark"></span>
              </button>`,
            )
            .join('')}
        </div>
        <p data-quiz-msg></p>
      </div>`;
    ctx.voice?.speak(`Quick check! ${quiz.q}`);
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    $('[data-learn]').scrollIntoView({ block: 'nearest', behavior: calm ? 'auto' : 'smooth' });
    el.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => answer(Number(b.dataset.i), b)));
  }

  function answer(i, button) {
    if (quizState !== 'asking') return;
    const msg = $('[data-quiz-msg]');
    if (i !== quiz.answer) {
      sfx.miss();
      button.classList.add('is-wrong');
      button.disabled = true;
      button.querySelector('.ez-answer-mark').innerHTML = IC.cross;
      msg.innerHTML = `<b class="ez-try">Not quite — try again!</b> ${quiz.hint}`;
      ctx.voice?.speak(`Not quite. Try again! ${quiz.hint}`);
      return;
    }
    quizState = 'done';
    sfx.success();
    button.classList.add('is-right');
    button.querySelector('.ez-answer-mark').innerHTML = IC.check;
    el.querySelectorAll('[data-i]').forEach((b) => (b.disabled = true));
    msg.innerHTML = `<b class="ez-yes">Yes!</b> ${quiz.explain}`;
    say(`You got it! ${quiz.explain}`, 'cheer');
    ctx.voice?.speak(`Yes! ${quiz.explain}`);
  }

  // ------------------------------------------------------------ numbers
  /** Update the numbers only (the slider element stays, so dragging keeps working). */
  function refresh() {
    slider.max = maxWalls().toFixed(2);
    const t = Math.max(0, Math.min(maxWalls(), target));
    const delta = t - station.wallKg;
    const kwh = Math.abs(delta) * RADIATION.PUMP_KWH_PER_KG;
    const doseNow = expectedStormDose(STRONG, 'shelter', station.wallKg);
    const doseAfter = expectedStormDose(STRONG, 'shelter', t);
    if (document.activeElement !== slider) slider.value = t.toFixed(2);
    test.setWallKg(t);
    renderBars(t);
    $('[data-tank]').textContent = kg(station.tankKg - delta);
    $('[data-walls]').textContent = kg(t);
    $('[data-target]').textContent = kg(t);
    $('[data-dose]').textContent = `${Math.round(doseAfter)}% of the safe limit`;
    $('[data-dose-now]').textContent = Math.abs(doseAfter - doseNow) > 0.5 ? `with the walls as they are now: ${Math.round(doseNow)}%` : 'move the slider to compare';
    $('[data-kwh]').textContent = `${kwh.toFixed(2)} kWh`;
    $('[data-batt]').textContent = `${((kwh / POWER.BATTERY_CAPACITY_KWH) * 100).toFixed(1)}% of the battery`;
    $('[data-pump-label]').textContent = delta >= 0 ? 'Pump into walls' : 'Pump back to tank';
    $('[data-pump]').disabled = Math.abs(delta) < 0.01;
  }

  slider.addEventListener('input', () => {
    target = Number(slider.value);
    refresh();
  });
  $('[data-close]').addEventListener('click', () => done({ completed: false }));
  $('[data-pump]').addEventListener('click', () => {
    const r = moveWater(station, gauges, Math.min(maxWalls(), target) - station.wallKg);
    if (r.reason) {
      sfx.miss();
      say(REASONS[r.reason]);
      ctx.voice?.speak(REASONS[r.reason]);
      return;
    }
    sfx.success();
    target = station.wallKg;
    const n = particlesPerHundred('shelter', station.wallKg);
    const line =
      r.movedKg > 0
        ? `Done! Now only about ${n} of every 100 particles reach you in the shelter. Remember: less water for oxygen.`
        : `Done! The water is back in the tank, ready to make oxygen. About ${n} of every 100 particles reach you in the shelter now.`;
    say(line, 'cheer');
    ctx.voice?.speak(line);
    refresh();
    if (quizState === 'hidden') renderQuiz();
  });

  refresh();
  renderFact();
  ctx.voice?.speak(plain(INTRO));
  slider.focus();

  return {
    onKey(e) {
      if (e.code === 'Escape') {
        e.preventDefault();
        done({ completed: false });
      }
    },
    destroy() {
      test.destroy();
      ctx.voice?.stop();
    },
  };
}
