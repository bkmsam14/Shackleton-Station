// index.js — Telescope instance: (intro) → pick a target → Star Hunt (find + lock on → draw)
// → stars + a new card in the Star Album. Sky maths: systems/skyMath.js; view: scope.js.
// Nothing refills a gauge here: the reward is learning (album + mastery); the cost is the
// trip outside (oxygen + food at the outside rates).
import '../electrolysis/style.css';
import '../waterWalls/style.css';
import './style.css';
import { TELESCOPE } from '../../config/gameplay.js';
import { placeOnSky, separationDeg, colourWord } from '../../systems/skyMath.js';
import { sfx } from '../../ui/sfx.js';
import { IC, starIcon, medalIcon, voltBot } from '../electrolysis/icons.js';
import { TARGETS, SOURCES, MOON_SKY_FACTS } from '../../data/constellations.js';
import { createScope } from './scope.js';

const MEDAL_NAME = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };
const STEPS = [
  { id: 'pick', label: 'Pick' },
  { id: 'hunt', label: 'Find' },
  { id: 'draw', label: 'Draw' },
  { id: 'result', label: 'Stars' },
];
export const SCOPE_ICON = `<svg class="ez-ic" viewBox="0 0 32 32" aria-hidden="true"><path d="M5 20 22 9l3 5-17 11z" fill="#f2f4f7" stroke="#10182c" stroke-width="2.4" stroke-linejoin="round"/><path d="m22 9 3 5" stroke="#ff9f43" stroke-width="3"/><path d="M13 22 9 30M15 21l4 9" stroke="#10182c" stroke-width="2.4" stroke-linecap="round"/><circle cx="27" cy="5" r="1.6" fill="#ffd43b"/><circle cx="20" cy="3" r="1.1" fill="#ffd43b"/></svg>`;
let factTurn = 0;

/** Centre of a target on today's sky (az/alt). */
function targetCentre(target, catalog, matrix) {
  if (target.cloud) return placeOnSky(matrix, target.cloud.ra, target.cloud.dec);
  const pts = target.paths.flat().map((hr) => catalog.byHr.get(hr)).filter(Boolean);
  let x = 0;
  let y = 0;
  let z = 0;
  for (const s of pts) {
    const h = placeOnSky(matrix, s.ra, s.dec);
    const a = (h.az * Math.PI) / 180;
    const e = (h.alt * Math.PI) / 180;
    x += Math.sin(a) * Math.cos(e);
    y += Math.sin(e);
    z += -Math.cos(a) * Math.cos(e);
  }
  const l = Math.hypot(x, y, z) || 1;
  return { az: ((Math.atan2(x / l, -z / l) * 180) / Math.PI + 360) % 360, alt: (Math.asin(y / l) * 180) / Math.PI };
}

/** ctx: { catalog, sky: {sunAz, sunAlt, matrix, earthAz, earthAlt, live, dateMs}, album: {has(id), add(id)}, mastery, voice } */
export function createTelescopeInstance({ root, ctx, done }) {
  const { catalog, sky, album, mastery } = ctx;
  const speak = (html) => ctx.voice?.speak(String(html).replace(/<[^>]+>/g, ''));
  const visit = mastery.get('telescope');

  const el = document.createElement('div');
  el.className = 'ez ts';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'ts-title');
  el.innerHTML = `
    <div class="ez-card">
      <header class="ez-head">
        <span class="ez-rivets" aria-hidden="true"><i></i><i></i></span>
        <h2 id="ts-title" class="ez-title">${SCOPE_ICON}<span>Star Hunt</span></h2>
        <ol class="ez-steps" aria-label="Steps"></ol>
        <span class="ez-medal-slot"></span>
        <span class="ez-rivets" aria-hidden="true"><i></i><i></i></span>
      </header>
      <div class="ez-body"></div>
      <p class="ez-status" aria-live="polite"></p>
    </div>`;
  root.appendChild(el);
  const body = el.querySelector('.ez-body');
  const status = el.querySelector('.ez-status');
  const stepsEl = el.querySelector('.ez-steps');
  const medalSlot = el.querySelector('.ez-medal-slot');
  const announce = (m) => (status.textContent = m);
  const say = (mood, html, extra = '') => `<div class="ez-say ${extra}">${voltBot(mood)}<div class="ez-bubble">${html}</div></div>`;
  const setMedal = (level) => (medalSlot.innerHTML = MEDAL_NAME[level] ? `<span class="ez-medal">${medalIcon(level)}${MEDAL_NAME[level]}</span>` : '');
  setMedal(visit.level);

  let screen = 'pick';
  let scope = null;
  let round = null; // { target, huntSeconds, guided, wrongTaps }
  let timer = 0;

  function setScreen(id) {
    screen = id;
    el.dataset.screen = id;
    const at = STEPS.findIndex((s) => s.id === id);
    stepsEl.innerHTML = STEPS.map(
      (s, i) => `<li class="${i < at ? 'is-done' : ''} ${i === at ? 'is-now' : ''}" ${i === at ? 'aria-current="step"' : ''}><span>${i + 1}</span>${s.label}</li>`,
    ).join('');
  }
  const focusFirst = () => body.querySelector('button:not([disabled])')?.focus();

  if (!catalog) {
    setScreen('pick');
    body.innerHTML = `${say('think', '<h3 class="ez-h3">The star map didn’t load</h3><p>Check your connection and try the telescope again.</p>')}
      <div class="ez-row ez-row-center"><button class="ez-btn ez-btn-go" data-leave>${IC.back}<span>Back to base</span></button></div>`;
    body.querySelector('[data-leave]').addEventListener('click', () => done({ completed: false }));
    return { onKey: (e) => e.code === 'Escape' && done({ completed: false }), destroy() {} };
  }

  // ---------------------------------------------------------------- which targets are safe now
  const sun = { az: sky.sunAz, alt: sky.sunAlt };
  const options = TARGETS.map((t) => {
    const c = targetCentre(t, catalog, sky.matrix);
    const sep = separationDeg(c, sun);
    return { target: t, centre: c, sep, safe: sep > TELESCOPE.SUN_GLARE_DEG + 6, found: album.has(t.id) };
  });

  function showIntro() {
    setScreen('pick');
    const lines = [
      'This telescope shows the <b>real sky</b> from the Moon’s south pole — made from a NASA-hosted star catalog.',
      'Here the stars <b>never rise or set</b>. They slowly circle around you!',
    ];
    speak(`Star Hunt! ${lines.join(' ')}`);
    body.innerHTML = `
      ${say('wow', `<h3 class="ez-h3">Real stars!</h3><p>${lines[0]}</p>`)}
      <p class="ez-p ez-center">${lines[1]}</p>
      <div class="ez-row ez-row-center"><button class="ez-btn ez-btn-go ez-btn-xl" data-go>${SCOPE_ICON}<span>Let’s look!</span></button></div>`;
    body.querySelector('[data-go]').addEventListener('click', () => {
      sfx.click();
      showPick();
    });
    focusFirst();
  }

  function showPick() {
    setScreen('pick');
    const fact = MOON_SKY_FACTS[factTurn++ % MOON_SKY_FACTS.length];
    const cards = options
      .map(
        (o, i) => `
        <button class="ts-pick ${o.found ? 'is-found' : ''}" data-i="${i}" ${o.safe ? '' : 'disabled'} style="--i:${i}">
          <span class="ts-pick-name">${o.target.name}</span>
          <span class="ts-pick-real">${o.target.real}</span>
          <span class="ts-pick-info">${o.safe ? `${Math.round(o.centre.alt)}° up` : `${IC.lock} Too close to the Sun right now`}</span>
          ${o.found ? `<span class="ts-pick-badge">${starIcon(true)} In your album</span>` : ''}
        </button>`,
      )
      .join('');
    const liveTag = sky.live ? ` <span class="ts-live">LIVE SKY · ${new Date(sky.dateMs).toISOString().slice(0, 16).replace('T', ' ')} UTC</span>` : '';
    const line = `Pick a target to find! Ones you found before are in your album — find them again for more stars.${liveTag}`;
    speak(`What shall we find? ${line}`);
    body.innerHTML = `
      ${say('happy', `<h3 class="ez-h3">What shall we find?</h3><p>${line}</p>`)}
      <div class="ts-picks">${cards}</div>
      <div class="ww-fact ts-fact"><span class="ww-fact-tag">${IC.book} Sky from the Moon</span><p>${fact.text}</p>
        <p class="sr-source">Source: <a href="${SOURCES[fact.source].url}" target="_blank" rel="noopener noreferrer">${SOURCES[fact.source].label}</a></p></div>
      <div class="ez-row"><button class="ez-btn ez-btn-ghost" data-leave>${IC.back}<span>Back to base</span></button></div>`;
    body.querySelectorAll('[data-i]').forEach((b) =>
      b.addEventListener('click', () => {
        sfx.click();
        startHunt(options[Number(b.dataset.i)].target);
      }),
    );
    body.querySelector('[data-leave]').addEventListener('click', () => done({ completed: false }));
    focusFirst();
  }

  function startHunt(target) {
    setScreen('hunt');
    round = { target, wrongTaps: 0 };
    body.innerHTML = `
      <p class="ts-mission">${SCOPE_ICON}<span><b>Find: ${target.name}.</b> ${target.hint}</span></p>
      <div class="ts-view"><canvas class="ts-canvas" aria-label="Telescope view of the real sky. Drag or use the arrow keys to move, plus and minus to zoom."></canvas></div>
      <div class="ts-controls">
        <button class="ez-btn ez-btn-ghost ts-pad" data-zoom="-1" aria-label="Zoom out">−</button>
        <span class="ts-help">Drag or <b>W A S D</b> / arrows to move · keep it in the crosshair to lock on</span>
        <button class="ez-btn ez-btn-ghost ts-pad" data-zoom="1" aria-label="Zoom in">+</button>
      </div>
      <div class="ez-row">
        <button class="ez-btn ez-btn-ghost" data-leave>${IC.back}<span>Stop</span></button>
        <button class="ez-btn ez-btn-ghost" data-help>${IC.book}<span>Help me, Volt!</span></button>
        <span class="ez-goal" data-clock></span>
      </div>`;
    body.querySelector('[data-leave]').addEventListener('click', () => done({ completed: false }));
    body.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', () => scope?.zoom(Number(b.dataset.zoom))));
    body.querySelector('[data-help]').addEventListener('click', () => {
      scope?.guide();
      speak(`Let's turn the telescope together. ${target.hint}`);
      announce('Volt is turning the telescope toward the target.');
    });
    scope = createScope({
      canvas: body.querySelector('canvas'),
      catalog,
      sky,
      target,
      announce,
      onPhase(phase, info) {
        if (phase === 'shutter') {
          sfx.miss();
          speak('Careful! Never look at the Sun through a telescope. The shutter keeps your eyes safe.');
          announce('Sun shutter closed. Never look at the Sun through a telescope!');
        } else if (phase === 'locked') {
          round.huntSeconds = info.seconds;
          round.guided = info.guided;
          setScreen('draw');
          body.querySelector('.ts-mission').innerHTML = `${SCOPE_ICON}<span><b>Locked on!</b> ${target.cloud ? 'Tap the misty cloud.' : 'Tap the stars in order — start at the yellow ring.'}</span>`;
          speak(target.cloud ? 'Locked on! Tap the misty cloud.' : 'Locked on! Now tap the stars in order to draw it.');
        } else if (phase === 'done') {
          round.wrongTaps = info.wrongTaps;
          setTimeout(showResult, 700);
        }
      },
    });
    speak(`Find ${target.name}! ${target.hint}`);
    const clock = body.querySelector('[data-clock]');
    timer = setInterval(() => {
      if (!scope || screen !== 'hunt') return;
      const left = Math.max(0, TELESCOPE.ROUND_SECONDS - scope.huntSeconds);
      clock.textContent = `⏱ ${Math.ceil(left)} s`;
      if (left <= 0 && !scope.usedGuide) {
        scope.guide();
        speak('Time is up — let me help you find it!');
      }
    }, 250);
  }

  function showResult() {
    clearInterval(timer);
    scope?.destroy();
    scope = null;
    setScreen('result');
    const t = round.target;
    let stars = 1;
    if (!round.guided && round.huntSeconds <= TELESCOPE.STAR_SECONDS) stars++;
    if (round.wrongTaps <= 1) stars++;
    const isNew = !album.has(t.id);
    album.add(t.id);
    const m = mastery.recordRun('telescope', stars);
    setMedal(m.level);
    // the figure's brightest star (lowest magnitude) and its colour
    const star = t.paths
      .flat()
      .map((hr) => catalog.byHr.get(hr))
      .filter(Boolean)
      .reduce((a, b) => (!a || b.mag < a.mag ? b : a), null);
    const colour = star ? colourWord(star.bv) : null;
    const starName = star ? (t.labels?.[star.hr] ?? 'Its brightest star') : '';
    const cheer = ['', 'Found it!', 'Great star hunting!', 'Perfect — star expert!'][stars];
    speak(`${cheer} ${t.card[0]}`);
    body.innerHTML = `
      ${say('cheer', `<h3 class="ez-h3">${cheer}</h3><p>${isNew ? `<b>${t.name}</b> is now in your <b>Star Album</b> (PDA → Tab)!` : `You found <b>${t.name}</b> again.`}</p>`)}
      <div class="ez-stars" aria-label="${stars} of 3 stars">${[1, 2, 3].map((n) => starIcon(n <= stars)).join('')}</div>
      <article class="ts-card">
        <h3 class="ez-h3">${t.name} <small>· ${t.real}</small></h3>
        <ul>${t.card.map((c) => `<li>${c}</li>`).join('')}</ul>
        ${colour && !t.cloud ? `<p class="ts-colour"><span class="ts-swatch" data-colour="${colour}"></span>${starName} looks <b>${colour}</b> — colour tells how hot a star is.</p>` : ''}
        <p class="sr-source">Sources: ${t.sources.map((k) => `<a href="${SOURCES[k].url}" target="_blank" rel="noopener noreferrer">${SOURCES[k].label}</a>`).join(' · ')}</p>
      </article>
      ${MEDAL_NAME[m.level] ? `<p class="ez-mastery">${medalIcon(m.level)}<span>Telescope mastery: <b>${MEDAL_NAME[m.level]}</b></span></p>` : ''}
      <div class="ez-row ez-row-center">
        <button class="ez-btn ez-btn-ghost" data-again>${SCOPE_ICON}<span>Find another</span></button>
        <button class="ez-btn ez-btn-go ez-btn-xl" data-back>${IC.back}<span>Back to base</span></button>
      </div>`;
    body.querySelector('[data-again]').addEventListener('click', () => {
      options.forEach((o) => (o.found = album.has(o.target.id)));
      showPick();
    });
    body.querySelector('[data-back]').addEventListener('click', () => done({ completed: true, id: t.id, stars, isNew }));
    focusFirst();
  }

  // ---------------------------------------------------------------- keys
  function onKey(e) {
    if (scope && (screen === 'hunt' || screen === 'draw') && scope.key(e.code, true)) {
      e.preventDefault();
      return;
    }
    if (e.code === 'Escape') {
      e.preventDefault();
      done({ completed: false });
    }
  }
  const onKeyUp = (e) => scope?.key(e.code, false);
  window.addEventListener('keyup', onKeyUp);

  if (visit.runs === 0) showIntro();
  else showPick();

  return {
    onKey,
    get scope() {
      return scope; // for the browser test
    },
    destroy() {
      clearInterval(timer);
      window.removeEventListener('keyup', onKeyUp);
      scope?.destroy();
      ctx.voice?.stop();
    },
  };
}
