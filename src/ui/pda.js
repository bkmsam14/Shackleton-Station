// pda.js — the PDA screen (Tab). Detailed stats with the "why", the Databank, and a log
// of recent events. The world is paused while it is open.
import { BVAD, TIME, POWER, ELECTROLYSIS } from '../config/gameplay.js';
import { batchCost } from '../systems/electrolysis.js';
import { secondsUntilEmpty } from '../systems/gauges.js';
import { DATABANK } from '../data/databank.js';

function minutes(sec) {
  if (!isFinite(sec)) return '—';
  if (sec < 60) return '< 1 min';
  return `${Math.round(sec / 60)} min`;
}
const perMin = (ratePerSec) => `${(Math.abs(ratePerSec) * 60).toFixed(1)} % per min`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Radiation: storms (real data), dose, water walls. s.radiation from main.js radiationHud(). */
function radiationStat(s) {
  const r = s.radiation;
  if (!r) return '';
  const label = s.sun?.label ?? 'Loading space-weather data…';
  let status = 'No particle storm right now.';
  if (r.phase === 'warning') status = 'A flare was seen — particles are on their way. Go to the storm shelter!';
  else if (r.phase === 'storm') status = `Particle storm now: ${Math.round(r.dosePct)}% of the storm safety limit so far.`;
  else if (r.next) {
    const hours = r.next.warnGameHour - r.nowHour;
    status = hours < 24 ? 'Space-weather watch: a storm may come soon.' : 'Space-weather watch: the Sun is calm for now.';
  } else if (s.sun) status = 'No more particle storms in this data.';
  return `
    <div class="pda-stat">
      <div class="pda-stat-top"><b>Radiation</b><span>${Math.round(r.missionDose)}%</span></div>
      <div class="pda-stat-line">${esc(status)}</div>
      <p>Mission total: ${Math.round(r.missionDose)}% of one storm limit — dose adds up and never goes down. Water in the shelter walls: ${r.wallKg.toFixed(1)} kg (it can’t make oxygen while it’s there).</p>
      <p class="pda-note">${esc(label)}. Based on NASA DONKI and RadLab data.</p>
    </div>`;
}

export function createPda(root) {
  const el = document.createElement('div');
  el.className = 'pda';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'PDA');
  root.appendChild(el);
  let open = false;

  function render(s, log) {
    const { gauges: g, report: r } = s;
    const outside = s.zone.id === 'outside';
    const o2Why = outside
      ? `You are outside. Working in a spacesuit uses about ${BVAD.EVA_TO_NOMINAL_O2_RATIO.toFixed(1)}× more oxygen than resting inside (NASA BVAD).`
      : 'You are inside a module, breathing at rest: 0.895 kg of oxygen a day (NASA BVAD).';
    const foodWhy = outside
      ? `Hard work outside burns about ${BVAD.EVA_TO_NOMINAL_FOOD_RATIO.toFixed(1)}× more food energy (NASA BVAD).`
      : 'At rest an astronaut eats about 0.8 kg of food a day, not counting water (NASA BVAD).';
    const pp = (g.batteryKwh / POWER.BATTERY_CAPACITY_KWH) * 100;
    const net = r.flow.netKw;
    const powerWhy =
      `Solar array: ${r.flow.solarKw.toFixed(1)} kW${s.sun.visibility > 0.5 ? '' : ' (Sun behind the ridge)'}. ` +
      `Using: habitat ${r.flow.loads.habitat} kW + grow lights ${r.flow.loads.greenhouse} kW. ` +
      `${net >= 0 ? 'Charging' : 'Draining'} ${Math.abs(net).toFixed(1)} kW.`;
    const powerTime = net < 0 ? `Empty in ${minutes(secondsUntilEmpty(pp, r.rates.power))}` : 'Charging';

    el.innerHTML = `
      <div class="pda-frame">
        <header class="pda-head"><span>PDA</span><span class="pda-hint">Tab to close</span></header>
        <div class="pda-cols">
          <section class="pda-col">
            <h2>Status</h2>
            <div class="pda-stat">
              <div class="pda-stat-top"><b>Oxygen supply</b><span>${Math.ceil(g.oxygen)}%</span></div>
              <div class="pda-stat-line">${minutes(secondsUntilEmpty(g.oxygen, r.rates.oxygen))} left · ${perMin(r.rates.oxygen)}</div>
              <p>${o2Why} Make more at the Electrolysis unit (habitat work bay): it splits water into oxygen and hydrogen, using water and power.</p>
            </div>
            <div class="pda-stat">
              <div class="pda-stat-top"><b>Electrolysis water tank</b><span>${s.station.tankKg.toFixed(1)} kg</span></div>
              <div class="pda-stat-line">Enough for about ${(s.station.tankKg / ELECTROLYSIS.WATER_PER_KG_O2).toFixed(1)} kg of oxygen · ${batchCost('small').waterKg.toFixed(2)} kg per Small batch</div>
              <p>Every 1 kg of oxygen uses ${ELECTROLYSIS.WATER_PER_KG_O2} kg of water (2 H₂O → 2 H₂ + O₂). Nothing refills the tank yet — ice mining comes later.</p>
            </div>
            ${radiationStat(s)}
            <div class="pda-stat">
              <div class="pda-stat-top"><b>Food</b><span>${Math.ceil(g.food)}%</span></div>
              <div class="pda-stat-line">${minutes(secondsUntilEmpty(g.food, r.rates.food))} left · ${perMin(r.rates.food)}</div>
              <p>${foodWhy}</p>
            </div>
            <div class="pda-stat">
              <div class="pda-stat-top"><b>Base power</b><span>${Math.ceil(pp)}%</span></div>
              <div class="pda-stat-line">${powerTime}</div>
              <p>${powerWhy}</p>
            </div>
            <p class="pda-note">Time runs ${TIME.SCALE}× faster than real life: 1 day here = ${Math.round(
              TIME.REAL_SECONDS_PER_GAME_DAY / 60,
            )} minutes.</p>
          </section>
          <section class="pda-col">
            <h2>Databank</h2>
            ${DATABANK.map(
              (d) => `
              <article class="pda-entry">
                <h3>${esc(d.title)}</h3>
                <p>${esc(d.core)}</p>
                <p class="pda-deeper">Go deeper: ${esc(d.deeper)}</p>
                <p class="pda-source">Source: ${esc(d.source)} — <a href="${d.url}" target="_blank" rel="noopener">${esc(d.url.replace(/^https:\/\//, ''))}</a></p>
              </article>`,
            ).join('')}
          </section>
          <section class="pda-col">
            <h2>Log</h2>
            <ul class="pda-log">${
              log.length ? log.map((l) => `<li><span>${esc(l.time)}</span> ${esc(l.text)}</li>`).join('') : '<li>Nothing yet.</li>'
            }</ul>
          </section>
        </div>
      </div>`;
  }

  return {
    get isOpen() {
      return open;
    },
    open(state, log) {
      render(state, log);
      el.hidden = false;
      open = true;
    },
    close() {
      el.hidden = true;
      open = false;
    },
  };
}
