// hud.js — on-screen gauges. Reads game state; contains no game rules.
//  • Astronaut panel (bottom-left): OXYGEN + FOOD
//  • BASE POWER panel (top-right, different style): battery + charging/draining
//  • Clock + location (top-left)
import { POWER, WARNING_THRESHOLD_PERCENT } from '../config/gameplay.js';
import { secondsUntilEmpty } from '../systems/gauges.js';

const ICON = {
  oxygen: `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="13" cy="17" r="9" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="24" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2.5"/><text x="13" y="21.5" text-anchor="middle" font-size="10" font-weight="800" fill="currentColor" font-family="Fredoka, sans-serif">O₂</text></svg>`,
  food: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 9c-3-3-10-2-10 6 0 6 4 12 7 12 1.3 0 2-.6 3-.6s1.7.6 3 .6c3 0 7-6 7-12 0-8-7-9-10-6z" fill="currentColor"/><path d="M16 9c0-3 1.5-5 4-6" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`,
  bolt: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M18 2 6 18h8l-2 12 12-16h-8z" fill="currentColor"/></svg>`,
  astronaut: `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="3"/><rect x="10" y="9" width="12" height="7" rx="3.5" fill="currentColor"/><path d="M6 30c1-6 5-9 10-9s9 3 10 9" fill="none" stroke="currentColor" stroke-width="3"/></svg>`,
};

function fmtMinutes(seconds) {
  if (!isFinite(seconds)) return null;
  if (seconds < 60) return 'less than 1 min';
  const m = Math.round(seconds / 60);
  return `about ${m} min`;
}

function gaugeRow(id, label, icon) {
  return `
    <div class="gauge" data-gauge="${id}" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="100">
      <div class="gauge-head">
        <span class="gauge-icon">${icon}</span>
        <span class="gauge-label">${label}</span>
        <span class="gauge-value" data-value>100%</span>
      </div>
      <div class="bar"><div class="bar-fill" data-fill></div></div>
      <div class="gauge-status" data-status></div>
    </div>`;
}

export function createHud(root) {
  const wrap = document.createElement('div');
  wrap.className = 'hud';
  wrap.innerHTML = `
    <div class="hud-topleft">
      <div class="chip clock" data-clock>DAY 1 · 07:00</div>
      <div class="chip where" data-where></div>
    </div>

    <section class="panel astro" aria-label="Astronaut">
      <div class="panel-title"><span class="title-icon">${ICON.astronaut}</span>ASTRONAUT</div>
      ${gaugeRow('oxygen', 'OXYGEN', ICON.oxygen)}
      ${gaugeRow('food', 'FOOD', ICON.food)}
    </section>

    <section class="panel base" aria-label="Base power">
      <div class="panel-title"><span class="title-icon">${ICON.bolt}</span>BASE POWER<span class="tag">whole base</span></div>
      <div class="power-main" data-gauge="power" role="meter" aria-label="Base power" aria-valuemin="0" aria-valuemax="100">
        <div class="battery"><div class="cells" data-cells>${'<i></i>'.repeat(10)}</div><div class="battery-nub"></div></div>
        <div class="gauge-value big" data-value>70%</div>
      </div>
      <div class="flow" data-flow></div>
      <div class="sunline" data-sun></div>
      <div class="loads" data-loads></div>
    </section>`;
  root.appendChild(wrap);

  const q = (s) => wrap.querySelector(s);
  const gauges = {
    oxygen: q('[data-gauge="oxygen"]'),
    food: q('[data-gauge="food"]'),
    power: q('[data-gauge="power"]'),
  };
  const cells = [...q('[data-cells]').children];
  const els = {
    clock: q('[data-clock]'),
    where: q('[data-where]'),
    flow: q('[data-flow]'),
    sun: q('[data-sun]'),
    loads: q('[data-loads]'),
  };
  const last = {};
  const setText = (el, key, text) => {
    if (last[key] !== text) {
      last[key] = text;
      el.textContent = text;
    }
  };
  const setHtml = (el, key, html) => {
    if (last[key] !== html) {
      last[key] = html;
      el.innerHTML = html;
    }
  };

  function setGauge(id, pct) {
    const g = gauges[id];
    const shown = Math.ceil(pct);
    setText(g.querySelector('[data-value]'), id + 'v', `${shown}%`);
    g.setAttribute('aria-valuenow', String(shown));
    const fill = g.querySelector('[data-fill]');
    if (fill) fill.style.transform = `scaleX(${Math.max(0, Math.min(1, pct / 100))})`;
    g.classList.toggle('is-low', pct < WARNING_THRESHOLD_PERCENT);
  }

  return {
    setVisible(v) {
      wrap.style.display = v ? '' : 'none';
    },
    /**
     * @param s {object} { gauges, report, zone: {id,name}, clock: {day,hour,minute}, sun, alignment }
     */
    update(s) {
      const { gauges: g, report: r } = s;
      // ---- clock + location
      const hh = String(s.clock.hour).padStart(2, '0');
      const mm = String(s.clock.minute).padStart(2, '0');
      setText(els.clock, 'clock', `DAY ${s.clock.day} · ${hh}:${mm}`);
      const outside = s.zone.id === 'outside';
      setText(els.where, 'where', outside ? '📍 Outside · in your suit' : `📍 ${s.zone.name} · pressurized`);
      els.where.classList.toggle('is-outside', outside);

      // ---- oxygen
      setGauge('oxygen', g.oxygen);
      let o2;
      if (r.refillingO2) o2 = 'Refilling from the module air ▲';
      else if (!outside && r.hasPower) o2 = 'Full · module air is good';
      else if (!outside) o2 = 'No power! Air system is off ▼';
      else {
        const left = fmtMinutes(secondsUntilEmpty(g.oxygen, r.rates.oxygen));
        o2 = `Suit tank · ${left} left ▼`;
      }
      if (g.oxygen < WARNING_THRESHOLD_PERCENT && outside) o2 = '⚠ Low! Go inside a module to refill';
      setText(gauges.oxygen.querySelector('[data-status]'), 'o2s', o2);

      // ---- food
      setGauge('food', g.food);
      const foodLeft = fmtMinutes(secondsUntilEmpty(g.food, r.rates.food));
      const food = g.food < WARNING_THRESHOLD_PERCENT ? '⚠ Low! Eating comes in a later update' : `Lasts ${foodLeft}`;
      setText(gauges.food.querySelector('[data-status]'), 'fs', food);

      // ---- base power
      const pp = (g.batteryKwh / POWER.BATTERY_CAPACITY_KWH) * 100;
      setText(gauges.power.querySelector('[data-value]'), 'pv', `${Math.ceil(pp)}%`);
      gauges.power.setAttribute('aria-valuenow', String(Math.ceil(pp)));
      const lit = Math.ceil(pp / 10 - 1e-9);
      cells.forEach((c, i) => c.classList.toggle('on', i < lit));
      gauges.power.classList.toggle('is-low', pp < WARNING_THRESHOLD_PERCENT);
      const net = r.flow.netKw;
      const charging = net > 0.05;
      const kw = Math.abs(net).toFixed(1);
      let flow;
      if (!r.hasPower) flow = '<span class="down">⚠ EMPTY · base systems off</span>';
      else if (charging && pp >= 99.9) flow = '<span class="up">● FULL · solar covers the base</span>';
      else if (charging) flow = `<span class="up">▲ CHARGING +${kw} kW</span>`;
      else flow = `<span class="down">▼ DRAINING −${kw} kW</span>`;
      setHtml(els.flow, 'flow', flow);
      els.flow.parentElement.classList.toggle('is-charging', charging);

      const sunTxt =
        s.sun.visibility > 0.5
          ? `☀ Sun up · panel makes ${r.flow.solarKw.toFixed(1)} kW`
          : '🌑 Sun behind the ridge · no solar power';
      setText(els.sun, 'sun', sunTxt);
      const L = r.flow.loads;
      setText(
        els.loads,
        'loads',
        `Using: habitat ${L.habitat} kW · grow lights ${L.greenhouse} kW${L.airRefill ? ` · air refill ${L.airRefill} kW` : ''}`,
      );
    },
  };
}
