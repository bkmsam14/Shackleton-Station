// iceOven — the Ice Oven panel (an instance overlay).
// Load your bag of icy soil; the oven heats it (base power), the ice turns to vapour and a
// cold plate catches it as water, which trickles into the Electrolysis tank over game time.
// Rules: systems/iceMining.js.
//
// Kept SIMPLE for ages 7–12 (one picture, one big line, one button):
//  - "60 kg of icy soil → about 3.4 kg of water";
//  - a 3-step picture Heat → Vapour → Water that animates while baking, plus a progress bar;
//  - a Bake button that shows its small cost; extra facts only behind "Did you know?".
import '../electrolysis/style.css';
import '../waterWalls/style.css';
import '../iceDrill/style.css';
import { ICE, POWER } from '../../config/gameplay.js';
import { checkOven, loadOven, ovenCost } from '../../systems/iceMining.js';
import { IC, voltBot } from '../electrolysis/icons.js';
import { sfx } from '../../ui/sfx.js';
import { OVEN_FACTS, OVEN_REASONS } from '../iceDrill/content.js';
import { ICE_ICON } from '../iceDrill/index.js';

const kg = (v) => `${v.toFixed(1)} kg`;
let visits = 0;

/** ctx: { ice, gauges, station, voice } */
export function createIceOvenInstance({ root, ctx, done }) {
  const { ice, gauges } = ctx;
  let factIndex = visits++ % OVEN_FACTS.length;
  let started = null; // what this visit put in the oven (for the PDA log)

  const el = document.createElement('div');
  el.className = 'ez io io-simple';
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
          <p data-msg aria-live="polite"></p>
        </div></div>

        <p class="io-big" data-big></p>

        <ol class="io-flow io-flow-3" data-flow aria-label="How the Ice Oven works">
          <li><span class="io-step-ic">${IC.heat}</span><b>Heat</b></li>
          <li><span class="io-step-ic">${IC.cloud}</span><b>Ice → vapour</b></li>
          <li><span class="io-step-ic">${IC.water}</span><b>Water</b></li>
        </ol>

        <div class="io-progress" data-progress hidden>
          <span class="ez-meter-bar"><i data-progress-bar></i></span>
          <span class="io-progress-label" data-progress-label></span>
        </div>

        <section class="ww-learn" data-learn aria-live="polite"></section>

        <div class="ez-row">
          <button class="ez-btn ez-btn-ghost" data-close>${IC.back}<span>Back</span></button>
          <button class="ez-btn ez-btn-ghost" data-more>${IC.book}<span>Did you know?</span></button>
          <button class="ez-btn ez-btn-go ww-pump" data-bake>${IC.heat}<span>Bake</span><small class="ww-cost" data-cost></small></button>
        </div>
      </div>
    </div>`;
  root.appendChild(el);
  const $ = (s) => el.querySelector(s);

  function say(text, mood = 'happy') {
    $('[data-msg]').innerHTML = text;
    $('[data-volt]').innerHTML = voltBot(mood);
  }

  $('[data-more]').addEventListener('click', () => {
    sfx.click();
    if ($('[data-learn]').childElementCount) factIndex = (factIndex + 1) % OVEN_FACTS.length;
    const f = OVEN_FACTS[factIndex];
    $('[data-learn]').innerHTML = `
      <div class="ww-fact">
        <h3 class="ez-h3">${f.title}</h3>
        <p>${f.text}</p>
        <p class="sr-source">Source: <a href="${f.source.url}" target="_blank" rel="noopener noreferrer">${f.source.label}</a></p>
      </div>`;
    ctx.voice?.speak(`${f.title}. ${f.text.replace(/<[^>]+>/g, '')}`);
  });

  function refresh() {
    const o = ice.oven;
    const baking = Boolean(o);
    $('[data-flow]').classList.toggle('is-baking', baking);
    const bake = $('[data-bake]');
    if (baking) {
      say('Baking! The water drips into the tank. You can go — it keeps working.', 'cheer');
      $('[data-big]').innerHTML = `${ICE_ICON}<span>${kg(o.soilKg)} of soil</span><span class="io-arrow">→</span>${IC.water}<span><b>${kg(o.waterKg)}</b> of water</span>`;
      $('[data-progress]').style.display = ''; // (a CSS display rule beats [hidden])
      $('[data-progress-bar]').style.width = `${((1 - o.hoursLeft / ICE.OVEN_GAME_HOURS) * 100).toFixed(1)}%`;
      $('[data-progress-label]').textContent = o.hoursLeft > 0 ? 'Baking…' : 'Waiting for space in the tank';
      bake.style.display = 'none'; // .ez-btn's display beats [hidden]
      return;
    }
    $('[data-progress]').style.display = 'none';
    bake.style.display = '';
    const c = ovenCost(ice.bagKg);
    const check = checkOven(ice, gauges);
    if (ice.bagKg > 0) {
      say('Lots of soil, only a little water inside!', 'wow');
      $('[data-big]').innerHTML = `${ICE_ICON}<span>${kg(ice.bagKg)} of icy soil</span><span class="io-arrow">→</span>${IC.water}<span>about <b>${kg(c.waterKg)}</b> of water</span>`;
    } else {
      say(OVEN_REASONS['no-soil'], 'think');
      $('[data-big]').innerHTML = `${ICE_ICON}<span>The oven is empty</span>`;
    }
    if (!check.ok && check.reason === 'power') say(OVEN_REASONS.power, 'think');
    bake.disabled = !check.ok;
    $('[data-cost]').textContent = ice.bagKg > 0 ? `uses ${Math.max(1, Math.round((c.kwh / POWER.BATTERY_CAPACITY_KWH) * 100))}% power` : '';
  }

  const close = () => done({ completed: Boolean(started), ...(started ?? {}) });
  $('[data-close]').addEventListener('click', close);
  $('[data-bake]').addEventListener('click', () => {
    const check = checkOven(ice, gauges);
    if (!check.ok) {
      sfx.miss();
      say(OVEN_REASONS[check.reason], 'think');
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
  ctx.voice?.speak($('[data-msg]').textContent);
  const timer = setInterval(refresh, 1000);
  ($('[data-bake]:not([disabled])') ?? $('[data-close]')).focus();

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
