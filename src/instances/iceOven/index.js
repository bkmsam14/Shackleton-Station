// iceOven — the Ice Oven panel (an instance overlay).
// Load your bag of icy soil; the oven heats it (base power), the ice turns to vapour and a
// cold plate catches it as water, which trickles into the Electrolysis tank over game time.
// Teaches: heat → vapour → catch as water; lots of soil, a little water; Moon water vs Earth
// deliveries (ISRU). Rules: systems/iceMining.js.
import '../electrolysis/style.css';
import '../waterWalls/style.css';
import '../iceDrill/style.css';
import { ICE, POWER, SUPPLY } from '../../config/gameplay.js';
import { checkOven, loadOven, ovenCost } from '../../systems/iceMining.js';
import { IC, voltBot } from '../electrolysis/icons.js';
import { sfx } from '../../ui/sfx.js';
import { OVEN_FACTS, OVEN_REASONS } from '../iceDrill/content.js';
import { ICE_ICON } from '../iceDrill/index.js';

const kg = (v) => `${v.toFixed(1)} kg`;
let visits = 0;

/** ctx: { ice, gauges, station, voice } */
export function createIceOvenInstance({ root, ctx, done }) {
  const { ice, gauges, station } = ctx;
  let factIndex = visits++ % OVEN_FACTS.length;
  let started = null; // what this visit put in the oven (for the PDA log)

  const el = document.createElement('div');
  el.className = 'ez io';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'io-title');
  el.innerHTML = `
    <div class="ez-card">
      <header class="ez-head">
        <span class="ez-rivets" aria-hidden="true"><i></i><i></i></span>
        <h2 id="io-title" class="ez-title">${IC.heat}<span>Ice Oven</span></h2>
        <span class="ez-medal-slot"></span>
        <span class="ez-rivets" aria-hidden="true"><i></i><i></i></span>
      </header>
      <div class="ez-body">
        <div class="ez-say"><span data-volt>${voltBot('happy')}</span><div class="ez-bubble">
          <h3 class="ez-h3" data-h></h3>
          <p data-msg aria-live="polite"></p>
        </div></div>

        <ol class="io-flow" data-flow aria-label="How the Ice Oven works">
          <li><span class="io-step-ic">${ICE_ICON}</span><b>Icy soil</b><small>Moon soil with ice grains</small></li>
          <li><span class="io-step-ic">${IC.heat}</span><b>Heat</b><small>uses base power</small></li>
          <li><span class="io-step-ic">${IC.cloud}</span><b>Vapour</b><small>the ice turns into a gas</small></li>
          <li><span class="io-step-ic">${IC.snow}</span><b>Cold plate</b><small>catches it as water</small></li>
          <li><span class="io-step-ic">${IC.water}</span><b>Tank</b><small>ready for oxygen</small></li>
        </ol>

        <div class="ww-meters" data-numbers></div>
        <div class="io-progress" data-progress hidden>
          <span class="io-progress-label" data-progress-label></span>
          <span class="ez-meter-bar"><i data-progress-bar></i></span>
        </div>

        <div class="io-compare">
          <div class="io-way"><b>Water from Earth</b><span>Order at the supply terminal. Wait for the rocket, and it takes cargo space.</span></div>
          <div class="io-way io-way-moon"><b>Water from Moon ice</b><span>A cold trip to the crater, and oven power. No waiting for Earth.</span></div>
        </div>

        <section class="ww-fact" data-fact></section>

        <p class="ez-note">The oven time is sped up like the rest of the base. Real ice ovens are still being tested, so we don’t show a real time yet.</p>
        <div class="ez-row">
          <button class="ez-btn ez-btn-ghost" data-close>${IC.back}<span>Back to base</span></button>
          <button class="ez-btn ez-btn-go" data-bake>${IC.heat}<span>Bake the soil</span></button>
        </div>
      </div>
    </div>`;
  root.appendChild(el);
  const $ = (s) => el.querySelector(s);

  function say(h, text, mood = 'happy') {
    $('[data-h]').textContent = h;
    $('[data-msg]').innerHTML = text;
    $('[data-volt]').innerHTML = voltBot(mood);
  }

  function renderFact() {
    const f = OVEN_FACTS[factIndex];
    $('[data-fact]').innerHTML = `
      <span class="ww-fact-tag">${IC.book} Did you know? <small>${factIndex + 1} / ${OVEN_FACTS.length}</small></span>
      <h3 class="ez-h3">${f.title}</h3>
      <p>${f.text}</p>
      <p class="sr-source">Source: <a href="${f.source.url}" target="_blank" rel="noopener noreferrer">${f.source.label}</a></p>
      <button class="ez-btn ez-btn-ghost ww-next" data-next><span>Next fact</span></button>`;
    $('[data-next]').addEventListener('click', () => {
      sfx.click();
      factIndex = (factIndex + 1) % OVEN_FACTS.length;
      renderFact();
    });
  }

  function meter(label, value, sub, icon) {
    return `<div class="ww-meter"><span>${label}</span><b>${icon} ${value}</b><span class="ww-sub">${sub}</span></div>`;
  }

  function refresh() {
    const o = ice.oven;
    const baking = Boolean(o);
    $('[data-flow]').classList.toggle('is-baking', baking);
    const tank = `${kg(station.tankKg)} of ${SUPPLY.WATER_TANK_MAX_KG} kg`;
    if (baking) {
      const total = ICE.OVEN_GAME_HOURS;
      const f = 1 - o.hoursLeft / total;
      say('Baking!', `The ice is turning into vapour, and the cold plate catches it as water. You can leave — it keeps baking while you play.`, 'cheer');
      $('[data-progress]').hidden = false;
      $('[data-progress-label]').textContent = o.hoursLeft > 0 ? `About ${Math.ceil(o.hoursLeft)} game hour${o.hoursLeft > 1 ? 's' : ''} left` : 'Waiting for space in the tank';
      $('[data-progress-bar]').style.width = `${(f * 100).toFixed(1)}%`;
      $('[data-numbers]').innerHTML =
        meter('Water caught so far', `${kg(o.waterDoneKg)} of ${kg(o.waterKg)}`, `from ${kg(o.soilKg)} of soil`, IC.water) + meter('Electrolysis tank', tank, 'the water goes here', IC.water);
    } else {
      $('[data-progress]').hidden = true;
      const c = ovenCost(ice.bagKg);
      const check = checkOven(ice, gauges);
      if (ice.bagKg > 0) {
        say(
          'Lots of soil, a little water',
          `Your bag has <b>${kg(ice.bagKg)}</b> of icy soil. Only about <b>${kg(c.waterKg)}</b> of it is water (${(ICE.ICE_MASS_FRACTION * 100).toFixed(1)}%, like the soil NASA’s LCROSS found).`,
          'wow',
        );
      } else say('The oven is empty', OVEN_REASONS['no-soil'], 'think');
      $('[data-numbers]').innerHTML =
        meter('You will get about', kg(c.waterKg), `from ${kg(ice.bagKg)} of icy soil`, IC.water) +
        meter('Heating costs', `${c.kwh.toFixed(1)} kWh`, `${((c.kwh / POWER.BATTERY_CAPACITY_KWH) * 100).toFixed(1)}% of the battery · tank now ${tank}`, IC.power);
      const bake = $('[data-bake]');
      bake.disabled = !check.ok;
      if (!check.ok && check.reason === 'power') say('Not enough power', OVEN_REASONS.power, 'think');
    }
    $('[data-bake]').style.display = baking ? 'none' : ''; // .ez-btn's display beats [hidden]
  }

  const close = () => done({ completed: Boolean(started), ...(started ?? {}) });
  $('[data-close]').addEventListener('click', close);
  $('[data-bake]').addEventListener('click', () => {
    const check = checkOven(ice, gauges);
    if (!check.ok) {
      sfx.miss();
      say('Can’t bake yet', OVEN_REASONS[check.reason], 'think');
      ctx.voice?.speak(OVEN_REASONS[check.reason]);
      return;
    }
    const c = loadOven(ice, gauges);
    sfx.success();
    refresh();
    ctx.voice?.speak(`Baking! About ${c.waterKg.toFixed(1)} kilograms of water will drip into the tank.`);
    started = { waterKg: c.waterKg, kwh: c.kwh, soilKg: c.soilKg };
  });

  refresh();
  renderFact();
  ctx.voice?.speak($('[data-msg]').textContent);
  const timer = setInterval(refresh, 1000); // the world is paused, but keep it honest if it isn't
  $('[data-bake]:not([hidden]):not([disabled])')?.focus() ?? $('[data-close]').focus();

  return {
    onKey(e) {
      if (e.code === 'Escape') {
        e.preventDefault();
        close();
      }
    },
    destroy() {
      clearInterval(timer);
      ctx.voice?.stop();
    },
  };
}
