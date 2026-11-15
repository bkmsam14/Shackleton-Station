// menus.js — the main menu (indie style: the live Moon base drifting by behind a big title,
// Volt waving, a few big buttons and Settings / How to play / Credits panels) and the Esc
// pause menu (with honest time notes + credits).
import { TIME, SKY, DAYS } from '../config/gameplay.js';
import { version } from '../../package.json';
import { voltBot } from '../instances/electrolysis/icons.js';
import { missionPatch, MI } from './menuArt.js';

const CONTROLS = `
  <div class="controls-grid">
    <div><span class="keycap">W A S D</span> Walk</div>
    <div><span class="keycap">Mouse</span> Look around</div>
    <div><span class="keycap">Space</span> Jump (Moon gravity!)</div>
    <div><span class="keycap">Shift</span> Hop faster</div>
    <div><span class="keycap">E</span> Use / open doors / talk to Volt</div>
    <div><span class="keycap">Tab</span> PDA: stats + science</div>
    <div><span class="keycap">F</span> Eat</div>
    <div><span class="keycap">Esc</span> Pause</div>
  </div>`;

const TIME_NOTE = `
  <p class="note"><strong>Time runs fast here.</strong> Each day is a ${DAYS.SHIFT_HOURS}-hour work shift that lasts
  ${Math.round(DAYS.SHIFT_REAL_SECONDS / 60)} minutes of play (${TIME.SCALE}× faster than real life); the nights are skipped.
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
    <h3>Music</h3>
    <p>“Outer Space Loop” by wipics (menu and inside the base) and “Blue Moon Beach” by Tsorthan Grove
      (outside on the Moon) — both CC0 / public domain, from
      <a href="https://opengameart.org/content/outer-space-loop" target="_blank" rel="noopener">OpenGameArt.org</a>
      (<a href="https://opengameart.org/content/blue-moon-beach" target="_blank" rel="noopener">Blue Moon Beach</a>). Thank you!</p>
  </div>`;

/** Music volume (main menu + pause). */
function musicRow() {
  return `<div class="menu-row"><label class="label" for="music-volume">Music</label>
    <input id="music-volume" class="menu-slider" type="range" min="0" max="100" step="5" data-music-volume aria-label="Music volume" />
    <span class="menu-slider-val" data-music-val></span></div>`;
}

/** The goal of the game, in one picture-like line. */
const GOAL = `
  <div class="mm-goal">
    <p><b>Your mission:</b> survive <b>${DAYS.COUNT} days</b> at the Moon's south pole.</p>
    <ul>
      <li><span class="mm-dot mm-o2"></span>Keep <b>oxygen</b> up: make it from water at the Electrolysis unit.</li>
      <li><span class="mm-dot mm-food"></span>Keep <b>food</b> up: grow potatoes in the greenhouse (press F to eat).</li>
      <li><span class="mm-dot mm-power"></span>Keep <b>power</b> up: sunlight on the solar array charges the battery.</li>
      <li>⏳ Each day ends at ${DAYS.END_HOUR}:00. Make it there, and the next morning everything is topped up again, except your food!</li>
    </ul>
  </div>`;

function qualityToggle(id) {
  return `<div class="menu-row"><span class="label">Graphics</span>
    <div class="seg" role="group" aria-label="Graphics quality" data-quality-group="${id}">
      <button type="button" data-quality="low">Low</button>
      <button type="button" data-quality="high">High</button>
    </div></div>`;
}

function voltRow() {
  return `<div class="menu-row"><span class="label">Volt talks</span>
    <div class="seg" role="group" aria-label="How often Volt talks">
      <button type="button" data-volt="chatty">Chatty</button>
      <button type="button" data-volt="helpful">Helpful</button>
      <button type="button" data-volt="quiet">Quiet</button>
    </div>
    <button type="button" class="link-btn" data-action="tour"></button></div>`;
}

/** One volume for all game sounds (airlock, suit, effects). Volt's voice has its own switch. */
function soundRow() {
  return `<div class="menu-row"><label class="label" for="sfx-volume">Sound effects</label>
    <input id="sfx-volume" class="menu-slider" type="range" min="0" max="100" step="5" data-sfx-volume aria-label="Sound effects volume" />
    <span class="menu-slider-val" data-sfx-val></span></div>`;
}

/** Names + lines of constellations you found, shown in the real sky outside. */
function starNamesRow() {
  return `<div class="menu-row"><span class="label">Star names in the sky</span>
    <div class="seg" role="group" aria-label="Show the names of constellations you found">
      <button type="button" data-starnames="on">On</button>
      <button type="button" data-starnames="off">Off</button>
    </div></div>`;
}

/** Volt's voice on/off (browser text-to-speech). Hidden if the browser can't speak. */
function voiceRow() {
  return `<div class="menu-row"><span class="label">Volt’s voice</span>
    <div class="seg" role="group" aria-label="Volt speaks out loud">
      <button type="button" data-voice="on">On</button>
      <button type="button" data-voice="off">Off</button>
    </div></div>`;
}

/** Start screen: which Sun to play with (real space-weather data). */
function sunRow() {
  return `<div class="menu-row sun-row"><span class="label">The Sun</span>
    <div class="seg" role="group" aria-label="Which real Sun data to play with">
      <button type="button" data-sun="calm">Calm · Dec 2019</button>
      <button type="button" data-sun="stormy">Stormy · May 2024</button>
      <button type="button" data-sun="live">Live · this week</button>
    </div></div>
    <p class="note sun-note" data-sun-note></p>`;
}
const SUN_NOTES = {
  calm: 'Replay of real NASA data from December 2019, when the Sun was quiet.',
  stormy: 'Replay of real NASA data from May 2024: big solar flares and particle storms.',
  live: 'The sky right now: the real Sun, Earth and stars over the Moon’s south pole, plus real NASA space weather from the last 7 days (needs internet).'
};

export function createMenus(root, { onStart, onResume, onQuality, getQuality, volt = null, sun = null, starNames = null, sound = null, music = null, mission = null, onNewMission = null, onGesture = null }) {
  const start = document.createElement('div');
  start.className = 'menu mm';
  start.innerHTML = `
    <div class="mm-side" role="dialog" aria-labelledby="title-start">
      <div class="mm-head">
        ${missionPatch(112)}
        <div>
          <p class="mm-kicker">A Moon base adventure · NASA Space Apps 2026</p>
          <h1 class="mm-title" id="title-start">Shackleton<span>Station</span></h1>
        </div>
      </div>
      <p class="mm-tag">Survive ${DAYS.COUNT} days at the Moon's south pole.</p>
      <div class="mm-console">
        <span class="mm-rivet" aria-hidden="true"></span><span class="mm-rivet" aria-hidden="true"></span><span class="mm-rivet" aria-hidden="true"></span><span class="mm-rivet" aria-hidden="true"></span>
        <div class="mm-buttons">
          <button type="button" class="mm-btn mm-btn-main" data-action="start"><span class="mm-ic">${MI.play}</span><span data-play-label>Play</span></button>
          <button type="button" class="mm-btn mm-btn-alt" data-action="new" hidden><span class="mm-ic">${MI.star}</span>New mission</button>
          <button type="button" class="mm-btn" data-panel="settings"><span class="mm-ic">${MI.gear}</span>Settings</button>
          <button type="button" class="mm-btn" data-panel="how"><span class="mm-ic">${MI.book}</span>How to play</button>
          <button type="button" class="mm-btn" data-panel="credits"><span class="mm-ic">${MI.heart}</span>Credits</button>
        </div>
        <div class="menu-hint" data-hint></div>
        <p class="mm-status"><span class="mm-led" aria-hidden="true"></span>BASE ONLINE · SHACKLETON RIM · v${version} · real NASA data inside</p>
      </div>
    </div>
    <div class="mm-volt" aria-hidden="true">
      <div class="mm-volt-bubble">Hi, I'm <b>Volt</b>! Ready for the Moon?</div>
      <div class="mm-volt-bot">${voltBot('cheer')}</div>
    </div>
    <section class="mm-panel menu-card" data-mm-panel hidden aria-live="polite">
      <button type="button" class="mm-close" data-mm-close aria-label="Close">${MI.close}</button>
      <div data-mm-body></div>
    </section>`;
  const PANELS = {
    settings: () => `<h2 class="mm-h2">Settings</h2>
      ${sun ? sunRow() : ''}
      ${qualityToggle('start')}
      ${sound ? soundRow() : ''}
      ${music ? musicRow() : ''}`,
    how: () => `<h2 class="mm-h2">How to play</h2>${GOAL}${CONTROLS}${TIME_NOTE}`,
    credits: () => `<h2 class="mm-h2">Credits</h2>${CREDITS}`,
  };

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
      ${volt ? voltRow() : ''}
      ${volt?.voiceSupported ? voiceRow() : ''}
      ${sound ? soundRow() : ''}
      ${music ? musicRow() : ''}
      ${starNames ? starNamesRow() : ''}
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
  // Volt settings (pause menu): chattiness + replay/skip the first-day tour
  function syncVolt() {
    if (!volt) return;
    const level = volt.getChattiness();
    pause.querySelectorAll('[data-volt]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.volt === level)));
    pause.querySelector('[data-action="tour"]').textContent = volt.tourActive() ? 'Skip Volt’s tour' : 'Replay Volt’s tour';
    const voiceOn = volt.getVoice?.() ? 'on' : 'off';
    pause.querySelectorAll('[data-voice]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.voice === voiceOn)));
  }
  if (volt) {
    pause.querySelectorAll('[data-volt]').forEach((b) =>
      b.addEventListener('click', () => {
        volt.setChattiness(b.dataset.volt);
        syncVolt();
      }),
    );
    pause.querySelectorAll('[data-voice]').forEach((b) =>
      b.addEventListener('click', () => {
        volt.setVoice(b.dataset.voice === 'on');
        syncVolt();
      }),
    );
    pause.querySelector('[data-action="tour"]').addEventListener('click', () => {
      if (volt.tourActive()) volt.skipTour();
      else volt.replayTour();
      syncVolt();
    });
  }
  // volume sliders (sound effects + music), in the pause menu and the main menu's Settings
  function wireSlider(box, sel, valSel, api) {
    const slider = box.querySelector(sel);
    if (!slider || !api) return;
    const val = box.querySelector(valSel);
    const show = () => (val.textContent = `${slider.value}%`);
    slider.value = String(Math.round(api.get() * 100));
    show();
    slider.addEventListener('input', () => {
      api.set(Number(slider.value) / 100);
      show();
    });
  }
  function wireSliders(box) {
    wireSlider(box, '[data-sfx-volume]', '[data-sfx-val]', sound);
    wireSlider(box, '[data-music-volume]', '[data-music-val]', music);
  }
  wireSliders(pause);
  // star names in the sky (pause menu)
  function syncStarNames() {
    const on = starNames.get() ? 'on' : 'off';
    pause.querySelectorAll('[data-starnames]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.starnames === on)));
  }
  if (starNames) {
    pause.querySelectorAll('[data-starnames]').forEach((b) =>
      b.addEventListener('click', () => {
        starNames.set(b.dataset.starnames === 'on');
        syncStarNames();
      }),
    );
    syncStarNames();
  }
  // ---- main menu: panels, continue / new mission, Volt
  const panel = start.querySelector('[data-mm-panel]');
  const panelBody = start.querySelector('[data-mm-body]');
  function openPanel(id) {
    panelBody.innerHTML = PANELS[id]();
    panel.hidden = false;
    start.classList.add('has-panel');
    wireSliders(panelBody);
    panelBody.querySelectorAll('[data-quality]').forEach((b) =>
      b.addEventListener('click', () => {
        onQuality(b.dataset.quality);
        syncQuality();
      }),
    );
    syncQuality();
    wireSun(panelBody);
    panel.querySelector('[data-mm-close]').focus();
  }
  function closePanel() {
    panel.hidden = true;
    start.classList.remove('has-panel');
    start.querySelector('[data-action="start"]').focus();
  }
  start.querySelectorAll('[data-panel]').forEach((b) => b.addEventListener('click', () => openPanel(b.dataset.panel)));
  start.querySelector('[data-mm-close]').addEventListener('click', closePanel);
  start.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && !panel.hidden) {
      e.stopPropagation();
      closePanel();
    }
  });
  // any click on the menu may start the music (browsers need a click first)
  start.addEventListener('pointerdown', () => onGesture?.());
  function syncMission() {
    const playLabel = start.querySelector('[data-play-label]');
    const newBtn = start.querySelector('[data-action="new"]');
    const m = mission?.();
    const resume = m && m.day > 1 && !m.won;
    playLabel.textContent = resume ? `Continue · Day ${m.day}` : 'Play';
    newBtn.hidden = !resume;
  }
  syncMission();
  start.querySelector('[data-action="new"]').addEventListener('click', () => {
    const m = mission?.();
    if (window.confirm(`Start a new mission from Day 1? Your Day ${m?.day ?? ''} progress will be lost.`)) onNewMission?.();
  });

  // Sun picker (main menu Settings: the storms are planned when the game starts)
  function syncSun() {
    if (!sun) return;
    const m = sun.get();
    start.querySelectorAll('[data-sun]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sun === m)));
    const note = start.querySelector('[data-sun-note]');
    if (note) note.textContent = SUN_NOTES[m] ?? '';
  }
  function wireSun(box) {
    if (!sun) return;
    box.querySelectorAll('[data-sun]').forEach((b) =>
      b.addEventListener('click', () => {
        sun.set(b.dataset.sun);
        syncSun();
      }),
    );
    syncSun();
  }
  start.querySelector('[data-action="start"]').addEventListener('click', onStart);
  pause.querySelector('[data-action="resume"]').addEventListener('click', onResume);

  return {
    showStart(v) {
      start.hidden = !v;
      if (v) syncMission();
    },
    showPause(v) {
      pause.hidden = !v;
      if (v) {
        pause.querySelector('[data-hint]').textContent = '';
        syncVolt();
      }
    },
    hint(text) {
      root.querySelectorAll('[data-hint]').forEach((h) => (h.textContent = text));
    },
  };
}
