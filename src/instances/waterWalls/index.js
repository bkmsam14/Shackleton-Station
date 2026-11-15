// waterWalls — the storm shelter's water-wall panel (an instance overlay).
// Pump water between the Electrolysis tank and the shelter walls. The trade-off is real:
// water in the walls protects you in the shelter, but it can't make oxygen until you pump it
// back. Uses the Molecule Zapper's console look (style.css) and Volt.
//
// Kept SIMPLE for ages 7–12 (one picture, one big number, one button):
//  - the particle test: particles stopped or passing the wall (the game's real shielding numbers)
//    and ONE big number under it: "N of 100 particles reach you";
//  - tank ⇄ walls with a slider, and a Pump button that shows its small cost;
//  - extra facts only behind "Did you know?"; one easy question after pumping.
import '../electrolysis/style.css';
import './style.css';
import { RADIATION, POWER } from '../../config/gameplay.js';
import { moveWater, particlesPerHundred } from '../../systems/radiation.js';
import { IC, voltBot } from '../electrolysis/icons.js';
import { sfx } from '../../ui/sfx.js';
import { FACTS, QUIZ } from './content.js';
import { createParticleTest } from './particleTest.js';

const kg = (v) => `${v.toFixed(1)} kg`;
const INTRO = 'More water in the walls = fewer space particles reach you. But that water can’t make oxygen!';
const REASONS = {
  power: 'Not enough power to run the pump. Wait for sunlight!',
  'tank-empty': 'The tank is empty.',
  'walls-full': 'The walls are full.',
  'walls-empty': 'The walls are already empty.',
};
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
  el.className = 'ez ww ww-simple';
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
          <p data-msg aria-live="polite">${INTRO}</p>
        </div></div>

        <figure class="ww-hero">
          <canvas class="ww-canvas" data-canvas role="img" aria-label="Particles fly from the Sun toward an astronaut behind the shelter wall"></canvas>
          <figcaption class="ww-result" aria-live="polite"><b data-reach></b> of 100 particles reach you in the shelter</figcaption>
        </figure>

        <div class="ww-pumpline">
          <div class="ww-end"><span class="ww-end-label">${IC.water} Tank</span><b data-tank></b></div>
          <input id="ww-slider" class="ww-slider" type="range" min="0" step="0.5" aria-label="Water in the shelter walls" />
          <div class="ww-end ww-end-walls"><span class="ww-end-label">${IC.water} Walls</span><b data-walls></b></div>
        </div>

        <section class="ww-learn" data-learn aria-live="polite"></section>

        <div class="ez-row">
          <button class="ez-btn ez-btn-ghost" data-close>${IC.back}<span>Back</span></button>
          <button class="ez-btn ez-btn-ghost" data-more>${IC.book}<span>Did you know?</span></button>
          <button class="ez-btn ez-btn-go ww-pump" data-pump>${IC.water}<span data-pump-label></span><small class="ww-cost" data-cost></small></button>
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

  // ------------------------------------------------------------ "Did you know?" (optional)
  function renderFact() {
    const f = FACTS[factIndex];
    $('[data-learn]').innerHTML = `
      <div class="ww-fact">
        <h3 class="ez-h3">${f.title}</h3>
        <p>${f.text}</p>
        <p class="sr-source">Source: <a href="${f.url}" target="_blank" rel="noopener noreferrer">${f.source}</a></p>
      </div>`;
  }
  $('[data-more]').addEventListener('click', () => {
    sfx.click();
    if (quizState === 'asking') return;
    if ($('[data-learn]').childElementCount) factIndex = (factIndex + 1) % FACTS.length;
    renderFact();
    ctx.voice?.speak(`${FACTS[factIndex].title} ${plain(FACTS[factIndex].text)}`);
  });

  // ------------------------------------------------------------ quick check (after pumping)
  function renderQuiz() {
    quizState = 'asking';
    $('[data-learn]').innerHTML = `
      <div class="ww-fact">
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
      msg.innerHTML = `<b class="ez-try">Try again!</b> ${quiz.hint}`;
      ctx.voice?.speak(`Try again! ${quiz.hint}`);
      return;
    }
    quizState = 'done';
    sfx.success();
    button.classList.add('is-right');
    button.querySelector('.ez-answer-mark').innerHTML = IC.check;
    el.querySelectorAll('[data-i]').forEach((b) => (b.disabled = true));
    msg.innerHTML = `<b class="ez-yes">Yes!</b> ${quiz.explain}`;
    ctx.voice?.speak(`Yes! ${quiz.explain}`);
  }

  // ------------------------------------------------------------ numbers
  /** Update the numbers only (the slider element stays, so dragging keeps working). */
  function refresh() {
    slider.max = maxWalls().toFixed(2);
    const t = Math.max(0, Math.min(maxWalls(), target));
    const delta = t - station.wallKg;
    const kwh = Math.abs(delta) * RADIATION.PUMP_KWH_PER_KG;
    if (document.activeElement !== slider) slider.value = t.toFixed(2);
    test.setWallKg(t);
    $('[data-reach]').textContent = particlesPerHundred('shelter', t);
    $('[data-tank]').textContent = kg(station.tankKg - delta);
    $('[data-walls]').textContent = kg(t);
    $('[data-pump-label]').textContent = delta >= 0 ? 'Pump into walls' : 'Pump back to tank';
    $('[data-cost]').textContent = Math.abs(delta) < 0.01 ? '' : `uses ${Math.max(1, Math.round((kwh / POWER.BATTERY_CAPACITY_KWH) * 100))}% power`;
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
    const line = r.movedKg > 0 ? `Done! Now only ${n} of 100 particles reach you.` : 'Done! The water is back in the tank, ready to make oxygen.';
    say(line, 'cheer');
    ctx.voice?.speak(line);
    refresh();
    if (quizState === 'hidden') renderQuiz();
  });

  refresh();
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
