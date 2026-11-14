// hud.js — minimal in-world HUD (no cards, borders, pills, emoji or sentences).
//  • bottom-left: big OXYGEN ring + smaller FOOD ring (line icon + number)
//  • top-centre: BASE POWER battery + % + arrow — only inside a module; outside a tiny battery
//  • top-left: day/time · top-centre: location name fades in for ~2 s on zone change
//  • warnings: < 25 % amber + pulse; < 10 % red + screen-edge tint + one short line
// One typeface (Fredoka). Colour only shows state: normal / low / critical.
import { POWER, WARNING_THRESHOLD_PERCENT } from '../config/gameplay.js';
import { ICONS, batteryIcon } from './icons.js';
import { voiceLine } from './voice.js';

const CRITICAL = 10;
const RING_R = 44;
const RING_C = 2 * Math.PI * RING_R;

function ring(id, label) {
  return `
    <div class="ring ring-${id}" data-ring="${id}" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="100">
      <svg class="ring-svg" viewBox="0 0 100 100" aria-hidden="true">
        <circle class="ring-track" cx="50" cy="50" r="${RING_R}"/>
        <circle class="ring-fill" cx="50" cy="50" r="${RING_R}" stroke-dasharray="${RING_C.toFixed(2)}" stroke-dashoffset="0" transform="rotate(-90 50 50)"/>
      </svg>
      <div class="ring-center">
        <span class="ring-icon">${ICONS[id]}</span>
        <span class="ring-value" data-value>100</span>
      </div>
    </div>`;
}

export function stateOf(pct) {
  if (pct < CRITICAL) return 'critical';
  if (pct < WARNING_THRESHOLD_PERCENT) return 'low';
  return 'normal';
}

const ZONE_TITLE = { outside: 'Lunar surface', habitat: 'Habitat', greenhouse: 'Greenhouse' };

export function createHud(root) {
  const wrap = document.createElement('div');
  wrap.className = 'hud';
  wrap.innerHTML = `
    <div class="hud-vignette" data-vignette></div>
    <div class="hud-time" data-time>Day 1 · 07:00</div>
    <div class="hud-power" data-power role="meter" aria-label="Base power" aria-valuemin="0" aria-valuemax="100">
      <span class="power-battery" data-battery></span>
      <span class="power-value" data-power-value>70%</span>
      <span class="power-arrow" data-arrow></span>
    </div>
    <div class="hud-location" data-location></div>
    <div class="hud-rings">
      ${ring('oxygen', 'Oxygen supply')}
      ${ring('food', 'Food')}
      <div class="hud-warning" data-warning role="status" aria-live="polite"></div>
    </div>`;
  root.appendChild(wrap);

  const q = (s) => wrap.querySelector(s);
  const rings = { oxygen: q('[data-ring="oxygen"]'), food: q('[data-ring="food"]') };
  const el = {
    time: q('[data-time]'),
    power: q('[data-power]'),
    battery: q('[data-battery]'),
    powerValue: q('[data-power-value]'),
    arrow: q('[data-arrow]'),
    location: q('[data-location]'),
    warning: q('[data-warning]'),
    vignette: q('[data-vignette]'),
  };
  const last = {};
  const set = (key, value, apply) => {
    if (last[key] !== value) {
      last[key] = value;
      apply(value);
    }
  };
  let locationTimer = 0;

  function setRing(id, pct) {
    const r = rings[id];
    const shown = Math.ceil(pct);
    set(`${id}v`, shown, (v) => {
      r.querySelector('[data-value]').textContent = String(v);
      r.setAttribute('aria-valuenow', String(v));
    });
    const off = (RING_C * (1 - Math.max(0, Math.min(1, pct / 100)))).toFixed(1);
    set(`${id}o`, off, (v) => r.querySelector('.ring-fill').setAttribute('stroke-dashoffset', v));
    const st = stateOf(pct);
    set(`${id}s`, st, (v) => {
      r.dataset.state = v;
      if (v !== 'normal') voiceLine(`${id}-${v}`);
    });
    return st;
  }

  return {
    element: wrap,
    rings,
    powerEl: el.power,
    setVisible(v) {
      wrap.style.display = v ? '' : 'none';
    },
    /** Location name fades in for ~2 s. */
    showLocation(zoneId) {
      el.location.textContent = ZONE_TITLE[zoneId] ?? '';
      el.location.classList.remove('is-on');
      void el.location.offsetWidth;
      el.location.classList.add('is-on');
      clearTimeout(locationTimer);
      locationTimer = setTimeout(() => el.location.classList.remove('is-on'), 2000);
    },
    /** s: { gauges, report, zone: {id}, clock } */
    update(s) {
      const { gauges: g, report: r } = s;
      const hh = String(s.clock.hour).padStart(2, '0');
      const mm = String(s.clock.minute).padStart(2, '0');
      set('time', `Day ${s.clock.day} · ${hh}:${mm}`, (v) => (el.time.textContent = v));

      const o2 = setRing('oxygen', g.oxygen);
      const food = setRing('food', g.food);

      // one short warning line + edge tint only when something is critical
      const critical = o2 === 'critical' ? 'Oxygen low' : food === 'critical' ? 'Food low' : '';
      set('warn', critical, (v) => {
        el.warning.textContent = v;
        el.warning.classList.toggle('is-on', Boolean(v));
        el.vignette.classList.toggle('is-on', Boolean(v));
      });

      // base power: full readout inside a module, tiny battery outside
      const pp = (g.batteryKwh / POWER.BATTERY_CAPACITY_KWH) * 100;
      const inside = s.zone.id !== 'outside';
      set('pmode', inside, (v) => el.power.classList.toggle('is-mini', !v));
      const level = Math.round(pp / 5) / 20;
      set('pbat', level, (v) => (el.battery.innerHTML = batteryIcon(v)));
      set('pval', Math.ceil(pp), (v) => {
        el.powerValue.textContent = `${v}%`;
        el.power.setAttribute('aria-valuenow', String(v));
      });
      const net = r.flow.netKw;
      const dir = !r.hasPower ? 'down' : net > 0.05 ? (pp >= 99.9 ? 'full' : 'up') : 'down';
      set('parrow', dir, (v) => {
        el.arrow.innerHTML = v === 'up' ? ICONS.arrowUp : v === 'down' ? ICONS.arrowDown : '';
        el.power.dataset.flow = v;
      });
      set('pstate', stateOf(pp), (v) => {
        el.power.dataset.state = v;
        if (v === 'low') voiceLine('power-low');
      });
    },
  };
}
