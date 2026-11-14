// menus.js — click-to-start screen and Esc pause menu (with honest time notes + credits).
import { TIME, SKY } from '../config/gameplay.js';
import { version } from '../../package.json';

const CONTROLS = `
  <div class="controls-grid">
    <div><span class="keycap">W A S D</span> Walk</div>
    <div><span class="keycap">Mouse</span> Look around</div>
    <div><span class="keycap">Space</span> Jump (Moon gravity!)</div>
    <div><span class="keycap">Shift</span> Hop faster</div>
    <div><span class="keycap">E</span> Use / open doors</div>
    <div><span class="keycap">Tab</span> PDA: stats + science</div>
    <div><span class="keycap">Esc</span> Pause</div>
  </div>`;

const TIME_NOTE = `
  <p class="note"><strong>Time runs fast here.</strong> 1 day at the base = ${Math.round(
    TIME.REAL_SECONDS_PER_GAME_DAY / 60,
  )} minutes of play (${TIME.SCALE}× faster than real life).
  The Sun circles the sky in about ${Math.round(SKY.GAME_SUN_LOOP_REAL_SECONDS / 60)} minutes —
  in real life at the Moon's south pole that takes about ${Math.round(SKY.REAL_SUN_LOOP_DAYS * 10) / 10} days.</p>`;

const CREDITS = `
  <div class="credits">
    <h3>Real NASA data in this game</h3>
    <ul>
      <li>Oxygen and food use per astronaut: NASA <em>Life Support Baseline Values and Assumptions Document</em> (BVAD), 2022 —
        <a href="https://ntrs.nasa.gov/citations/20210024855" target="_blank" rel="noopener">ntrs.nasa.gov</a></li>
      <li>Moon gravity, day length, no air: NASA Moon Fact Sheet —
        <a href="https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html" target="_blank" rel="noopener">nssdc.gsfc.nasa.gov</a></li>
      <li>Vertical solar arrays for the south pole: NASA VSAT project —
        <a href="https://ntrs.nasa.gov/api/citations/20230012849/downloads/GCD%20Annual%20Review%20VSAT%20September%202023%20Final.pdf" target="_blank" rel="noopener">ntrs.nasa.gov</a></li>
      <li>Red + blue grow lights: NASA Veggie (VEG-04) —
        <a href="https://ntrs.nasa.gov/citations/20190033231" target="_blank" rel="noopener">ntrs.nasa.gov</a></li>
    </ul>
    <p>Battery size, tank size and power numbers are game balance, not real data. Art is placeholder.</p>
  </div>`;

function qualityToggle(id) {
  return `<div class="menu-row"><span class="label">Graphics</span>
    <div class="seg" role="group" aria-label="Graphics quality" data-quality-group="${id}">
      <button type="button" data-quality="low">Low</button>
      <button type="button" data-quality="high">High</button>
    </div></div>`;
}

export function createMenus(root, { onStart, onResume, onQuality, getQuality }) {
  const start = document.createElement('div');
  start.className = 'menu';
  start.innerHTML = `
    <div class="menu-card" role="dialog" aria-labelledby="title-start">
      <h1 class="menu-title" id="title-start">Shackleton <span>Station</span></h1>
      <p class="menu-version">v${version}</p>
      <p class="menu-sub">You are the astronaut at a small base at the Moon's south pole. Keep your oxygen, food and base power up!</p>
      <button type="button" class="btn btn-big" data-action="start">▶ Click to start</button>
      <div class="menu-hint" data-hint></div>
      ${CONTROLS}
      ${qualityToggle('start')}
      ${TIME_NOTE}
    </div>`;

  const pause = document.createElement('div');
  pause.className = 'menu';
  pause.hidden = true;
  pause.innerHTML = `
    <div class="menu-card" role="dialog" aria-labelledby="title-pause">
      <h2 class="menu-title" id="title-pause">Paused</h2>
      <p class="menu-version">Shackleton Station v${version}</p>
      <p class="menu-sub">Time is stopped. Take a breath!</p>
      <button type="button" class="btn btn-big" data-action="resume">▶ Resume</button>
      <div class="menu-hint" data-hint></div>
      ${qualityToggle('pause')}
      ${CONTROLS}
      ${TIME_NOTE}
      ${CREDITS}
    </div>`;

  root.append(start, pause);

  function syncQuality() {
    const q = getQuality();
    root.querySelectorAll('[data-quality]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.quality === q)));
  }
  root.querySelectorAll('[data-quality]').forEach((b) =>
    b.addEventListener('click', () => {
      onQuality(b.dataset.quality);
      syncQuality();
    }),
  );
  syncQuality();
  start.querySelector('[data-action="start"]').addEventListener('click', onStart);
  pause.querySelector('[data-action="resume"]').addEventListener('click', onResume);

  return {
    showStart(v) {
      start.hidden = !v;
    },
    showPause(v) {
      pause.hidden = !v;
      if (v) pause.querySelector('[data-hint]').textContent = '';
    },
    hint(text) {
      root.querySelectorAll('[data-hint]').forEach((h) => (h.textContent = text));
    },
  };
}
