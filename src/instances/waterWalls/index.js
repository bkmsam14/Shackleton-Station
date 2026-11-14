// waterWalls — the storm shelter's water-wall panel (an instance overlay).
// Pump water between the Electrolysis tank and the shelter walls. The trade-off is real:
// water in the walls protects you in the shelter, but it can't make oxygen until you pump it
// back. Uses the Molecule Zapper's console look (style.css) and Volt.
import '../electrolysis/style.css';
import './style.css';
import { RADIATION, POWER } from '../../config/gameplay.js';
import { moveWater, expectedStormDose } from '../../systems/radiation.js';
import { IC, voltBot } from '../electrolysis/icons.js';
import { sfx } from '../../ui/sfx.js';

const kg = (v) => `${v.toFixed(1)} kg`;
const STRONG = { intensity: 1 }; // the strongest storm, for the "how protected am I?" preview
const INTRO = 'More water around the shelter means fewer particles reach you. But water in the walls <b>can’t make oxygen</b>.';
const REASONS = {
  power: 'Not enough power to run the pump. Wait for sunlight!',
  'tank-empty': 'The tank is empty.',
  'walls-full': 'The walls are full.',
  'walls-empty': 'The walls are already empty.',
};

/** ctx: { gauges, station, voice } */
export function createWaterWallsInstance({ root, ctx, done }) {
  const { gauges, station } = ctx;
  const maxWalls = () => Math.min(RADIATION.WALL_CAPACITY_KG, station.tankKg + station.wallKg);
  let target = station.wallKg;

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
        <p class="ez-note">Real shelters would need thousands of kg of water. Here the amounts are game-sized, but the idea is real: shielding is mass.</p>
        <div class="ez-row">
          <button class="ez-btn ez-btn-ghost" data-close>${IC.back}<span>Back to base</span></button>
          <button class="ez-btn ez-btn-go" data-pump>${IC.water}<span data-pump-label></span></button>
        </div>
      </div>
    </div>`;
  root.appendChild(el);
  const $ = (s) => el.querySelector(s);
  const slider = $('#ww-slider');

  function say(text, mood = 'think') {
    $('[data-msg]').innerHTML = text;
    $('[data-volt]').innerHTML = voltBot(mood);
  }

  /** Update the numbers only (the slider element stays, so dragging keeps working). */
  function refresh() {
    slider.max = maxWalls().toFixed(2);
    const t = Math.max(0, Math.min(maxWalls(), target));
    const delta = t - station.wallKg;
    const kwh = Math.abs(delta) * RADIATION.PUMP_KWH_PER_KG;
    const doseNow = expectedStormDose(STRONG, 'shelter', station.wallKg);
    const doseAfter = expectedStormDose(STRONG, 'shelter', t);
    if (document.activeElement !== slider) slider.value = t.toFixed(2);
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
    const line =
      r.movedKg > 0
        ? 'Done! The shelter walls are fuller now. Remember: less water for oxygen.'
        : 'Done! The water is back in the tank, ready to make oxygen.';
    say(line, 'cheer');
    ctx.voice?.speak(line);
    refresh();
  });

  refresh();
  ctx.voice?.speak(INTRO);
  slider.focus();

  return {
    onKey(e) {
      if (e.code === 'Escape') {
        e.preventDefault();
        done({ completed: false });
      }
    },
    destroy() {
      ctx.voice?.stop();
    },
  };
}
