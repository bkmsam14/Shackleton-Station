// index.js — Solar Fix instance: intro → catch the light → close the circuit → swap the
// cracked cells → quiz → result. Opened from the damaged solar array when you have a
// Solar Panel Repair Kit. Reuses the Electrolysis lesson's console look (ez-* classes)
// and adds its own pictures (sf-*). The kit is used at the moment the cracked cells are
// swapped (ctx.onRepaired); leaving before that keeps the kit and leaves the array broken.
import './style.css';
import { SOLAR_DAMAGE } from '../../config/gameplay.js';
import { sfx } from '../../ui/sfx.js';
import { IC, voltBot } from '../electrolysis/icons.js';
import { TEXT, QUIZ, DEEPER, SOURCES } from './content.js';

const STEPS = [
  { id: 'light', label: 'Light' },
  { id: 'circuit', label: 'Circuit' },
  { id: 'fix', label: 'Fix' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'result', label: 'Done' },
];
const ELECTRONS_NEEDED = 5;
const ROWS = 5;
const COLS = 6;
// broken chains match the in-game damage: 40 % output left = 3 of 5 rows dark
const BROKEN_ROWS = Math.round((1 - SOLAR_DAMAGE.DAMAGED_OUTPUT) * ROWS);
const NS = 'http://www.w3.org/2000/svg';
const plain = (html) => html.replace(/<[^>]+>/g, '');
/** Keep receiving moves while dragging; some browsers refuse capture (never break the drag). */
function capture(el, e) {
  try {
    el.setPointerCapture?.(e.pointerId);
  } catch {
    // dragging still works while the pointer stays over the element
  }
}

function svgEl(tag, attrs = {}, parent = null) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}
function svgPoint(svg, e) {
  const p = svg.createSVGPoint();
  p.x = e.clientX;
  p.y = e.clientY;
  return p.matrixTransform(svg.getScreenCTM().inverse());
}
const SUN_ICON = `<svg class="ez-ic" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="7" fill="#ffc94a" stroke="#10182c" stroke-width="2.5"/><g stroke="#ffc94a" stroke-width="3" stroke-linecap="round"><path d="M16 2v4M16 26v4M2 16h4M26 16h4M6 6l3 3M23 23l3 3M6 26l3-3M23 9l3-3"/></g></svg>`;
// same sun in the button's ink colour (a yellow sun on a yellow button would vanish)
const SUN_BTN = `<svg class="ez-ic" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="6.5" fill="none" stroke="currentColor" stroke-width="3"/><g stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M16 2v4M16 26v4M2 16h4M26 16h4M6 6l3 3M23 23l3 3M6 26l3-3M23 9l3-3"/></g></svg>`;

/** ctx: { voice?, repairs (how many repairs so far), kitsLeft(), onRepaired() → { kitsLeft } } */
export function createSolarRepairInstance({ root, ctx, done }) {
  const speak = (text) => ctx.voice?.speak(plain(text));
  const quiz = QUIZ[(ctx.repairs ?? 0) % QUIZ.length];

  const el = document.createElement('div');
  el.className = 'ez sf';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'sf-title');
  el.innerHTML = `
    <div class="ez-card">
      <header class="ez-head">
        <span class="ez-rivets" aria-hidden="true"><i></i><i></i></span>
        <h2 id="sf-title" class="ez-title">${SUN_ICON}<span>${TEXT.title}</span></h2>
        <ol class="ez-steps" aria-label="Steps"></ol>
        <span class="ez-rivets" aria-hidden="true"><i></i><i></i></span>
      </header>
      <div class="ez-body"></div>
      <p class="ez-status" aria-live="polite"></p>
    </div>`;
  root.appendChild(el);
  const body = el.querySelector('.ez-body');
  const status = el.querySelector('.ez-status');
  const stepsEl = el.querySelector('.ez-steps');
  const announce = (msg) => (status.textContent = plain(msg));
  const say = (mood, html, extra = '') => `<div class="ez-say ${extra}">${voltBot(mood)}<div class="ez-bubble">${html}</div></div>`;

  let screen = 'intro';
  let raf = 0;
  let tick = null; // per-screen animation, called with dt
  let repaired = false;
  let kitsLeft = ctx.kitsLeft?.() ?? 0;
  let last = performance.now();
  let tickFailed = false;
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    raf = requestAnimationFrame(loop); // schedule first: one bad frame must never freeze the lesson
    try {
      tick?.(dt, now / 1000);
    } catch (err) {
      if (!tickFailed) console.error('[instance:solar-repair] animation step failed', err);
      tickFailed = true;
    }
  }
  raf = requestAnimationFrame(loop);

  function setScreen(id) {
    screen = id;
    tick = null;
    el.dataset.screen = id;
    const at = STEPS.findIndex((s) => s.id === id);
    stepsEl.innerHTML = STEPS.map(
      (s, i) =>
        `<li class="${i < at ? 'is-done' : ''} ${i === at ? 'is-now' : ''}" ${i === at ? 'aria-current="step"' : ''}><span>${i + 1}</span>${s.label}</li>`,
    ).join('');
    body.classList.remove('ez-enter');
    void body.offsetWidth;
    body.classList.add('ez-enter');
  }
  const focusFirst = () => body.querySelector('button:not([disabled]), [tabindex="0"]')?.focus();
  function leaveRow() {
    return `<div class="ez-row sf-leave-row"><button class="ez-btn sf-leave" data-leave>${IC.back}<span>${TEXT.leave}</span></button></div>`;
  }
  function wireLeave() {
    body.querySelector('[data-leave]')?.addEventListener('click', () => done({ completed: false }));
  }
  function nextButton(label, onClick) {
    const row = body.querySelector('[data-next-slot]');
    row.innerHTML = `<button class="ez-btn ez-btn-go" data-next><span>${label}</span></button>`;
    const b = row.querySelector('[data-next]');
    b.addEventListener('click', () => {
      sfx.click();
      onClick();
    });
    b.focus();
  }

  // ---------------------------------------------------------------- intro
  function showIntro() {
    setScreen('intro');
    speak(`${TEXT.intro[0]} ${TEXT.intro[1]}`);
    body.innerHTML = `
      ${say('wow', `<h3 class="ez-h3">${TEXT.introTitle}</h3><p>${TEXT.intro[0]}</p>`)}
      <p class="ez-p ez-center">${TEXT.intro[1]}</p>
      <div class="ez-row ez-row-center"><button class="ez-btn ez-btn-go ez-btn-xl" data-go>${SUN_BTN}<span>${TEXT.introGo}</span></button></div>
      ${leaveRow()}`;
    body.querySelector('[data-go]').addEventListener('click', () => {
      sfx.click();
      showLight();
    });
    wireLeave();
    focusFirst();
  }

  // ---------------------------------------------------------------- step 1: photons free electrons
  function cellArt(svg, { x, y, w, h }) {
    const defs = svgEl('defs', {}, svg);
    const g = svgEl('linearGradient', { id: 'sf-cell-grad', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    svgEl('stop', { offset: '0', 'stop-color': '#2a4d96' }, g);
    svgEl('stop', { offset: '1', 'stop-color': '#16306a' }, g);
    const glow = svgEl('radialGradient', { id: 'sf-photon' }, defs);
    svgEl('stop', { offset: '0', 'stop-color': '#fff6c2' }, glow);
    svgEl('stop', { offset: '0.5', 'stop-color': '#ffc94a' }, glow);
    svgEl('stop', { offset: '1', 'stop-color': 'rgba(255,201,74,0)' }, glow);
    svgEl('rect', { x, y, width: w, height: h, rx: 12, fill: 'url(#sf-cell-grad)', stroke: '#10182c', 'stroke-width': 4 }, svg);
    for (let gx = x + 35; gx < x + w; gx += 35) svgEl('line', { x1: gx, y1: y + 4, x2: gx, y2: y + h - 4, stroke: '#7f97cc', 'stroke-width': 1, opacity: 0.45 }, svg);
    for (const by of [y + h * 0.33, y + h * 0.67]) svgEl('line', { x1: x + 6, y1: by, x2: x + w - 6, y2: by, stroke: '#c9d4e8', 'stroke-width': 3, opacity: 0.85 }, svg);
  }

  function showLight() {
    setScreen('light');
    speak(`${TEXT.lightTitle}. ${TEXT.light}`);
    body.innerHTML = `
      ${say('happy', `<h3 class="ez-h3">${TEXT.lightTitle}</h3><p>${TEXT.light}</p>`)}
      <div class="sf-stage"><svg class="sf-svg" viewBox="0 0 640 290" role="img" aria-label="The Sun on the left and a blue silicon solar cell on the right"></svg></div>
      <p class="ez-p ez-center sf-do">${TEXT.lightDo} <b class="sf-count" data-count>0 / ${ELECTRONS_NEEDED}</b> electrons</p>
      <div class="ez-row ez-row-center" data-next-slot></div>
      ${leaveRow()}`;
    wireLeave();
    const svg = body.querySelector('.sf-svg');
    const CELL = { x: 300, y: 70, w: 300, h: 170 };
    cellArt(svg, CELL);
    svgEl('text', { x: CELL.x + CELL.w / 2, y: CELL.y + CELL.h + 30, class: 'sf-label', 'text-anchor': 'middle' }, svg).textContent = 'Silicon solar cell';
    // the Sun is a big button
    const sun = svgEl('g', { class: 'sf-sunbtn', tabindex: 0, role: 'button', 'aria-label': 'Send a photon from the Sun' }, svg);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      svgEl('line', { x1: 90 + Math.cos(a) * 52, y1: 110 + Math.sin(a) * 52, x2: 90 + Math.cos(a) * 66, y2: 110 + Math.sin(a) * 66, stroke: '#ffc94a', 'stroke-width': 6, 'stroke-linecap': 'round' }, sun);
    }
    svgEl('circle', { cx: 90, cy: 110, r: 44, fill: '#ffc94a', stroke: '#10182c', 'stroke-width': 4 }, sun);
    svgEl('text', { x: 90, y: 205, class: 'sf-label', 'text-anchor': 'middle' }, svg).textContent = 'Tap the Sun!';
    const layer = svgEl('g', {}, svg);

    const photons = [];
    const electrons = [];
    let freed = 0;
    let finished = false;
    function fire() {
      if (finished || photons.length > 3) return;
      sfx.zap(1);
      sun.classList.remove('is-pulse');
      void sun.getBoundingClientRect();
      sun.classList.add('is-pulse');
      const tx = CELL.x + 30 + Math.random() * (CELL.w - 60);
      const ty = CELL.y + 25 + Math.random() * (CELL.h - 50);
      const dot = svgEl('circle', { r: 11, fill: 'url(#sf-photon)' }, layer);
      photons.push({ dot, x0: 130, y0: 100, tx, ty, t: 0 });
    }
    sun.addEventListener('click', fire);
    sun.addEventListener('keydown', (e) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        fire();
      }
    });

    tick = (dt, time) => {
      for (let i = photons.length - 1; i >= 0; i--) {
        const p = photons[i];
        p.t += dt / 0.55;
        const k = Math.min(1, p.t);
        const x = p.x0 + (p.tx - p.x0) * k;
        const y = p.y0 + (p.ty - p.y0) * k - Math.sin(k * Math.PI) * 30;
        p.dot.setAttribute('cx', x);
        p.dot.setAttribute('cy', y);
        if (k >= 1) {
          p.dot.remove();
          photons.splice(i, 1);
          if (finished) continue; // extra taps after the 5th electron: nothing more to count
          // the photon is absorbed: an electron breaks free
          const g = svgEl('g', { class: 'sf-electron' }, layer);
          svgEl('circle', { r: 12, fill: '#4fd1e8', stroke: '#10182c', 'stroke-width': 3 }, g);
          svgEl('text', { y: 5, 'text-anchor': 'middle', class: 'sf-e' }, g).textContent = 'e⁻';
          electrons.push({ g, x: p.tx, y: p.ty, ph: Math.random() * 6 });
          sfx.pop();
          freed++;
          const countEl = body.querySelector('[data-count]');
          if (countEl) countEl.textContent = `${Math.min(freed, ELECTRONS_NEEDED)} / ${ELECTRONS_NEEDED}`;
          if (freed >= ELECTRONS_NEEDED && !finished) {
            finished = true;
            sfx.success();
            announce(TEXT.lightDone);
            speak(TEXT.lightDone);
            body.querySelector('.sf-do').innerHTML = `<b>${TEXT.lightDone}</b>`;
            nextButton(TEXT.next, showCircuit);
          }
        }
      }
      for (const e of electrons) e.g.setAttribute('transform', `translate(${e.x + Math.sin(time * 5 + e.ph) * 4} ${e.y + Math.cos(time * 4 + e.ph) * 3})`);
    };
    announce(TEXT.lightDo);
    sun.focus();
  }

  // ---------------------------------------------------------------- step 2: close the circuit
  function showCircuit() {
    setScreen('circuit');
    speak(`${TEXT.circuitTitle}. ${TEXT.circuit}`);
    body.innerHTML = `
      ${say('think', `<h3 class="ez-h3">${TEXT.circuitTitle}</h3><p>${TEXT.circuit}</p>`)}
      <div class="sf-stage"><svg class="sf-svg" viewBox="0 0 640 300" role="img" aria-label="A solar cell, a wire and the base battery"></svg></div>
      <p class="ez-p ez-center sf-do">${TEXT.circuitDo}</p>
      <div class="ez-row ez-row-center" data-next-slot></div>
      ${leaveRow()}`;
    wireLeave();
    const svg = body.querySelector('.sf-svg');
    const CELL = { x: 360, y: 70, w: 230, h: 160 };
    cellArt(svg, CELL);
    const TOP = { x: CELL.x + CELL.w / 2, y: CELL.y - 8 };
    const BOT = { x: CELL.x + CELL.w / 2, y: CELL.y + CELL.h + 8 };
    for (const [p, sign, cls] of [
      [TOP, '−', 'sf-term-neg'],
      [BOT, '+', 'sf-term-pos'],
    ]) {
      svgEl('rect', { x: p.x - 22, y: p.y - 10, width: 44, height: 20, rx: 6, class: `sf-term ${cls}` }, svg);
      svgEl('text', { x: p.x + 36, y: p.y + 8, class: 'sf-sign' }, svg).textContent = sign;
    }
    // electrons pushed to the top (−) side of the cell
    const gathered = svgEl('g', {}, svg);
    for (let i = 0; i < ELECTRONS_NEEDED; i++) {
      const g = svgEl('g', { transform: `translate(${CELL.x + 40 + i * 38} ${CELL.y + 26})` }, gathered);
      svgEl('circle', { r: 11, fill: '#4fd1e8', stroke: '#10182c', 'stroke-width': 3 }, g);
      svgEl('text', { y: 5, 'text-anchor': 'middle', class: 'sf-e' }, g).textContent = 'e⁻';
    }
    // base battery
    const BAT = { x: 110, y: 110, w: 70, h: 120 };
    svgEl('rect', { x: BAT.x + 22, y: BAT.y - 12, width: 26, height: 14, rx: 4, fill: '#c9d4e8', stroke: '#10182c', 'stroke-width': 3 }, svg);
    svgEl('rect', { x: BAT.x, y: BAT.y, width: BAT.w, height: BAT.h, rx: 12, fill: '#0d1531', stroke: '#10182c', 'stroke-width': 4 }, svg);
    const level = svgEl('rect', { x: BAT.x + 8, y: BAT.y + BAT.h - 8, width: BAT.w - 16, height: 0, rx: 6, fill: '#7be0a0' }, svg);
    svgEl('text', { x: BAT.x + BAT.w / 2, y: BAT.y + BAT.h + 32, class: 'sf-label', 'text-anchor': 'middle' }, svg).textContent = 'Base battery';
    // fixed wire: out of the battery's side (clear of its label) → (+) connector
    const batOut = { x: BAT.x + BAT.w, y: BAT.y + BAT.h - 24 };
    svgEl('path', { d: `M${batOut.x} ${batOut.y} C ${batOut.x + 110} ${batOut.y}, ${BOT.x} 292, ${BOT.x} ${BOT.y + 10}`, class: 'sf-wire' }, svg);
    // loose wire: battery top → plug (draggable)
    const loose = svgEl('path', { class: 'sf-wire' }, svg);
    const plug = svgEl('g', { class: 'sf-plug', tabindex: 0, role: 'button', 'aria-label': 'Loose wire end. Drag it to the cell’s connector' }, svg);
    svgEl('circle', { r: 16, fill: '#f08a45', stroke: '#10182c', 'stroke-width': 4 }, plug);
    svgEl('circle', { r: 6, fill: '#10182c' }, plug);
    const target = svgEl('circle', { cx: TOP.x, cy: TOP.y, r: 26, class: 'sf-target', tabindex: 0, role: 'button', 'aria-label': 'The cell’s minus connector' }, svg);
    const START = { x: 250, y: 50 };
    const pos = { ...START };
    const batTop = { x: BAT.x + BAT.w / 2, y: BAT.y - 12 };
    function drawLoose() {
      loose.setAttribute('d', `M${batTop.x} ${batTop.y} C ${batTop.x} 30, ${pos.x - 70} ${pos.y}, ${pos.x} ${pos.y}`);
      plug.setAttribute('transform', `translate(${pos.x} ${pos.y})`);
    }
    drawLoose();

    let connected = false;
    let dragging = false;
    let picked = false;
    const flow = []; // electrons moving round the circuit
    let charge = 0.2;
    let finished = false;
    const loopPath = svgEl('path', { fill: 'none', stroke: 'none' }, svg);

    function connect() {
      if (connected) return;
      connected = true;
      pos.x = TOP.x;
      pos.y = TOP.y;
      drawLoose();
      target.classList.add('is-done');
      plug.classList.add('is-done');
      sfx.success();
      gathered.remove();
      // electrons leave the (−) side, go through the battery and come back to (+)
      loopPath.setAttribute(
        'd',
        `M${TOP.x} ${TOP.y} C ${TOP.x - 70} ${TOP.y}, ${batTop.x} 30, ${batTop.x} ${batTop.y} L ${batTop.x} ${batOut.y} L ${batOut.x} ${batOut.y} C ${batOut.x + 110} ${batOut.y}, ${BOT.x} 292, ${BOT.x} ${BOT.y}`,
      );
      for (let i = 0; i < 9; i++) {
        const g = svgEl('g', { class: 'sf-electron' }, svg);
        svgEl('circle', { r: 9, fill: '#4fd1e8', stroke: '#10182c', 'stroke-width': 2.5 }, g);
        flow.push({ g, s: i / 9 });
      }
      announce('Connected! Electrons are flowing.');
    }
    function tryDrop() {
      if (Math.hypot(pos.x - TOP.x, pos.y - TOP.y) < 40) connect();
      else {
        pos.x = START.x;
        pos.y = START.y;
        drawLoose();
        sfx.miss();
      }
    }
    plug.addEventListener('pointerdown', (e) => {
      if (connected) return;
      e.preventDefault();
      dragging = true;
      capture(plug, e);
      sfx.click();
    });
    plug.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const p = svgPoint(svg, e);
      pos.x = Math.max(20, Math.min(620, p.x));
      pos.y = Math.max(20, Math.min(280, p.y));
      drawLoose();
    });
    plug.addEventListener('pointerup', () => {
      if (!dragging) return;
      dragging = false;
      if (Math.hypot(pos.x - START.x, pos.y - START.y) < 6) {
        picked = true; // a click: pick it up, then click the connector
        plug.classList.add('is-picked');
        return;
      }
      tryDrop();
    });
    const pickTarget = () => {
      if (picked) connect();
    };
    target.addEventListener('click', pickTarget);
    for (const t of [plug, target]) {
      t.addEventListener('keydown', (e) => {
        if (e.code !== 'Enter' && e.code !== 'Space') return;
        e.preventDefault();
        if (t === plug) {
          picked = true;
          plug.classList.add('is-picked');
          target.focus();
        } else pickTarget();
      });
    }

    tick = (dt) => {
      if (!connected) return;
      const len = loopPath.getTotalLength();
      for (const f of flow) {
        f.s = (f.s + dt * 0.28) % 1;
        const p = loopPath.getPointAtLength(f.s * len);
        f.g.setAttribute('transform', `translate(${p.x} ${p.y})`);
      }
      charge = Math.min(1, charge + dt * 0.3);
      const h = (BAT.h - 16) * charge;
      level.setAttribute('y', BAT.y + BAT.h - 8 - h);
      level.setAttribute('height', h);
      if (charge >= 1 && !finished) {
        finished = true;
        sfx.success();
        announce(TEXT.circuitDone);
        speak(TEXT.circuitDone);
        body.querySelector('.sf-do').innerHTML = `<b>${TEXT.circuitDone}</b>`;
        nextButton(TEXT.next, showFix);
      }
    };
    announce(TEXT.circuitDo);
    plug.focus();
  }

  // ---------------------------------------------------------------- step 3: swap the cracked cells
  function showFix() {
    setScreen('fix');
    speak(`${TEXT.fixTitle}. ${TEXT.fix}`);
    body.innerHTML = `
      ${say('wow', `<h3 class="ez-h3">${TEXT.fixTitle}</h3><p>${TEXT.fix}</p>`)}
      <div class="sf-stage"><svg class="sf-svg" viewBox="0 0 640 340" role="img" aria-label="The solar array: 5 rows of 6 cells, some cracked, and new cells in the repair kit"></svg></div>
      <p class="ez-p ez-center sf-do">${TEXT.fixDo}</p>
      <div class="ez-row ez-row-center" data-next-slot></div>
      ${leaveRow()}`;
    wireLeave();
    const svg = body.querySelector('.sf-svg');
    const CW = 66;
    const CH = 38;
    const GAP = 6;
    const X0 = 40;
    const Y0 = 16;
    // which cells are cracked: one in each of BROKEN_ROWS random rows
    const rowsShuffled = [...Array(ROWS).keys()].sort(() => Math.random() - 0.5);
    const cracked = new Map(rowsShuffled.slice(0, BROKEN_ROWS).map((r) => [r, Math.floor(Math.random() * COLS)]));
    const rowGroups = [];
    const crackedEls = new Map(); // row → { g, x, y }
    for (let r = 0; r < ROWS; r++) {
      const rg = svgEl('g', { class: 'sf-row' }, svg);
      rowGroups.push(rg);
      const y = Y0 + r * (CH + GAP);
      for (let c = 0; c < COLS; c++) {
        const x = X0 + c * (CW + GAP);
        const cell = svgEl('g', {}, rg);
        svgEl('rect', { x, y, width: CW, height: CH, rx: 5, class: 'sf-pv' }, cell);
        svgEl('line', { x1: x + 4, y1: y + CH / 2, x2: x + CW - 4, y2: y + CH / 2, class: 'sf-busbar' }, cell);
        if (cracked.get(r) === c) {
          cell.classList.add('sf-cracked');
          cell.setAttribute('tabindex', 0);
          cell.setAttribute('role', 'button');
          cell.setAttribute('aria-label', `Cracked cell in row ${r + 1}`);
          svgEl('polyline', { points: `${x + 14},${y + 4} ${x + 28},${y + 18} ${x + 22},${y + 24} ${x + 40},${y + 34}`, class: 'sf-crack' }, cell);
          svgEl('polyline', { points: `${x + 28},${y + 18} ${x + 50},${y + 10} ${x + 60},${y + 16}`, class: 'sf-crack' }, cell);
          crackedEls.set(r, { g: cell, x, y });
        }
      }
      // the chain's wire into the bus on the right
      svgEl('line', { x1: X0 + COLS * (CW + GAP) - GAP, y1: y + CH / 2, x2: 500, y2: y + CH / 2, class: 'sf-chainwire' }, rg);
    }
    svgEl('line', { x1: 500, y1: Y0 + CH / 2, x2: 500, y2: Y0 + (ROWS - 1) * (CH + GAP) + CH / 2, class: 'sf-chainwire' }, svg);
    // power meter
    const M = { x: 540, y: Y0, w: 56, h: ROWS * (CH + GAP) - GAP };
    svgEl('rect', { x: M.x, y: M.y, width: M.w, height: M.h, rx: 10, fill: '#0d1531', stroke: '#10182c', 'stroke-width': 4 }, svg);
    const meter = svgEl('rect', { x: M.x + 7, width: M.w - 14, rx: 6, fill: '#ffc94a' }, svg);
    const meterTxt = svgEl('text', { x: M.x + M.w / 2, y: M.y + M.h + 26, class: 'sf-label', 'text-anchor': 'middle' }, svg);
    // the repair kit tray
    const TRAY_Y = Y0 + ROWS * (CH + GAP) + 14;
    svgEl('rect', { x: X0 - 8, y: TRAY_Y - 8, width: 3 * (CW + 14) + 120, height: CH + 16, rx: 12, class: 'sf-tray' }, svg);
    svgEl('text', { x: X0 + 3 * (CW + 14) + 10, y: TRAY_Y + CH / 2 + 6, class: 'sf-label sf-tray-label' }, svg).textContent = 'Repair kit';
    const spares = [];
    for (let i = 0; i < BROKEN_ROWS; i++) {
      const home = { x: X0 + i * (CW + 14), y: TRAY_Y };
      const g = svgEl('g', { class: 'sf-spare', tabindex: 0, role: 'button', 'aria-label': 'New solar cell from the repair kit' }, svg);
      svgEl('rect', { x: 0, y: 0, width: CW, height: CH, rx: 5, class: 'sf-pv sf-pv-new' }, g);
      svgEl('line', { x1: 4, y1: CH / 2, x2: CW - 4, y2: CH / 2, class: 'sf-busbar' }, g);
      const s = { g, home, pos: { ...home }, used: false };
      g.setAttribute('transform', `translate(${home.x} ${home.y})`);
      spares.push(s);
    }
    const flows = []; // moving dots on working chains
    let selected = null;
    let finished = false;

    function rowWorks(r) {
      return !crackedEls.has(r);
    }
    function refresh() {
      const working = [...Array(ROWS).keys()].filter(rowWorks).length;
      const frac = working / ROWS;
      const h = (M.h - 14) * frac;
      meter.setAttribute('y', M.y + M.h - 7 - h);
      meter.setAttribute('height', h);
      meterTxt.textContent = `Power ${Math.round(frac * 100)}%`;
      rowGroups.forEach((rg, r) => rg.classList.toggle('is-dark', !rowWorks(r)));
    }
    for (let r = 0; r < ROWS; r++) {
      const y = Y0 + r * (CH + GAP) + CH / 2;
      for (let i = 0; i < 3; i++) {
        const dot = svgEl('circle', { r: 4.5, class: 'sf-flowdot' }, rowGroups[r]);
        flows.push({ dot, r, y, s: i / 3 + Math.random() * 0.1 });
      }
    }
    refresh();

    function place(spare, row) {
      const cr = crackedEls.get(row);
      if (!cr || spare.used) return false;
      spare.used = true;
      spare.pos = { x: cr.x, y: cr.y };
      spare.g.setAttribute('transform', `translate(${cr.x} ${cr.y})`);
      spare.g.classList.add('is-placed');
      spare.g.removeAttribute('tabindex');
      cr.g.remove();
      crackedEls.delete(row);
      sfx.bubble();
      refresh();
      announce(`Row ${row + 1} fixed! ${crackedEls.size} left.`);
      if (!crackedEls.size && !finished) finish();
      return true;
    }
    function rowAt(p) {
      for (const [row, cr] of crackedEls) if (p.x >= cr.x - 12 && p.x <= cr.x + CW + 12 && p.y >= cr.y - 12 && p.y <= cr.y + CH + 12) return row;
      return null;
    }
    function finish() {
      finished = true;
      const r = ctx.onRepaired?.(); // uses the kit, array back to full power
      repaired = true;
      kitsLeft = r?.kitsLeft ?? kitsLeft;
      sfx.success();
      announce(TEXT.fixDone);
      speak(TEXT.fixDone);
      body.querySelector('.sf-do').innerHTML = `<b>${TEXT.fixDone}</b>`;
      body.querySelector('.sf-leave-row')?.remove();
      nextButton('Quick question!', showQuiz);
    }
    for (const s of spares) {
      let drag = null;
      s.g.addEventListener('pointerdown', (e) => {
        if (s.used) return;
        e.preventDefault();
        const p = svgPoint(svg, e);
        drag = { dx: p.x - s.pos.x, dy: p.y - s.pos.y, moved: false };
        capture(s.g, e);
        s.g.classList.add('is-drag');
      });
      s.g.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const p = svgPoint(svg, e);
        s.pos = { x: p.x - drag.dx, y: p.y - drag.dy };
        drag.moved = drag.moved || Math.hypot(s.pos.x - s.home.x, s.pos.y - s.home.y) > 6;
        s.g.setAttribute('transform', `translate(${s.pos.x} ${s.pos.y})`);
      });
      s.g.addEventListener('pointerup', () => {
        if (!drag) return;
        s.g.classList.remove('is-drag');
        const moved = drag.moved;
        drag = null;
        if (!moved) {
          // a click: select this cell, then click a cracked one
          spares.forEach((o) => o.g.classList.remove('is-picked'));
          selected = s;
          s.g.classList.add('is-picked');
          s.pos = { ...s.home };
          s.g.setAttribute('transform', `translate(${s.home.x} ${s.home.y})`);
          return;
        }
        const row = rowAt({ x: s.pos.x + CW / 2, y: s.pos.y + CH / 2 });
        if (row === null || !place(s, row)) {
          s.pos = { ...s.home };
          s.g.setAttribute('transform', `translate(${s.home.x} ${s.home.y})`);
          sfx.miss();
        }
      });
      s.g.addEventListener('keydown', (e) => {
        if (e.code !== 'Enter' && e.code !== 'Space') return;
        e.preventDefault();
        spares.forEach((o) => o.g.classList.remove('is-picked'));
        selected = s;
        s.g.classList.add('is-picked');
        crackedEls.values().next().value?.g.focus();
      });
    }
    for (const [row, cr] of crackedEls) {
      const use = () => {
        if (selected && !selected.used) {
          selected.g.classList.remove('is-picked');
          place(selected, row);
          selected = spares.find((o) => !o.used) ?? null;
          if (selected) selected.g.classList.add('is-picked');
        } else {
          announce('Pick a new cell from the repair kit first.');
        }
      };
      cr.g.addEventListener('click', use);
      cr.g.addEventListener('keydown', (e) => {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          use();
        }
      });
    }

    tick = (dt) => {
      const x0 = X0;
      const x1 = 500;
      for (const f of flows) {
        if (!rowWorks(f.r)) {
          f.dot.setAttribute('cx', -50);
          continue;
        }
        f.s = (f.s + dt * 0.35) % 1;
        f.dot.setAttribute('cx', x0 + (x1 - x0) * f.s);
        f.dot.setAttribute('cy', f.y);
      }
    };
    announce(TEXT.fixDo);
    spares[0].g.focus();
  }

  // ---------------------------------------------------------------- quiz
  let tries = 0;
  function showQuiz() {
    setScreen('quiz');
    speak(`Quick question! ${quiz.q}`);
    const order = quiz.options.map((_, i) => i).sort(() => Math.random() - 0.5);
    const letters = ['A', 'B', 'C', 'D'];
    body.innerHTML = `
      ${say('think', `<h3 class="ez-h3">Quick question!</h3><p class="ez-q">${quiz.q}</p>`)}
      <div class="ez-answers" style="--n:${order.length}">
        ${order
          .map(
            (oi, pos) => `<button class="ez-answer" data-i="${oi}" style="--i:${pos}" aria-label="${letters[pos]}: ${quiz.options[oi]}">
              <span class="ez-letter">${letters[pos]}</span>
              <span class="ez-answer-pic"><span class="ez-num sf-answer-txt">${quiz.options[oi]}</span></span>
              <span class="ez-answer-mark"></span>
            </button>`,
          )
          .join('')}
      </div>
      <div class="ez-explain" hidden></div>`;
    body.querySelectorAll('.ez-answer').forEach((btn) => btn.addEventListener('click', () => answer(Number(btn.dataset.i), btn)));
    focusFirst();
  }
  function answer(i, btn) {
    tries++;
    const ex = body.querySelector('.ez-explain');
    if (i !== quiz.answer) {
      sfx.miss();
      btn.disabled = true;
      btn.classList.add('is-wrong');
      btn.querySelector('.ez-answer-mark').innerHTML = IC.cross;
      const left = [...body.querySelectorAll('.ez-answer:not([disabled])')];
      if (left.length > 1) {
        ex.hidden = false;
        ex.innerHTML = say('happy', `<p><b class="ez-try">Not quite, try again!</b> ${quiz.hint}</p>`, 'ez-say-small');
        left[0].focus();
        announce(`Not quite. Hint: ${quiz.hint}`);
        speak(`Not quite. Try again! ${quiz.hint}`);
        return;
      }
    } else sfx.success();
    const right = i === quiz.answer;
    body.querySelectorAll('.ez-answer').forEach((b) => {
      b.disabled = true;
      if (Number(b.dataset.i) === quiz.answer) {
        b.classList.add('is-right');
        b.querySelector('.ez-answer-mark').innerHTML = IC.check;
      }
    });
    const head = right && tries === 1 ? 'Yes! First try!' : right ? 'You got it!' : 'Here’s the answer!';
    ex.hidden = false;
    ex.innerHTML = `
      ${say(
        right ? 'cheer' : 'happy',
        `<p><b class="${right ? 'ez-yes' : 'ez-try'}">${head}</b> ${quiz.explain}</p>
         <p class="ez-source">${IC.link}<span>Source: <a href="${quiz.source.url}" target="_blank" rel="noopener">${quiz.source.label}</a></span></p>`,
        'ez-say-small',
      )}
      <div class="ez-row ez-row-end"><button class="ez-btn ez-btn-go" data-next><span>Finish</span></button></div>`;
    ex.querySelector('[data-next]').addEventListener('click', () => {
      sfx.click();
      showResult();
    });
    ex.querySelector('[data-next]').focus();
    announce(`${head} ${quiz.explain}`);
    speak(`${head} ${quiz.explain}`);
  }

  // ---------------------------------------------------------------- result
  function showResult() {
    setScreen('result');
    speak('Solar array repaired! The base has full solar power again.');
    body.innerHTML = `
      ${say('cheer', `<h3 class="ez-h3">Solar array repaired!</h3><p>New cells in, every chain flowing. The base has full solar power again.</p>`)}
      <ul class="ez-results">
        <li class="ez-res ez-tone-power">${IC.power}<span><b>Power: 100%</b> was ${Math.round(SOLAR_DAMAGE.DAMAGED_OUTPUT * 100)}% with cracked cells</span></li>
        <li class="ez-res ez-tone-time">${SUN_ICON}<span><b>1 Solar Panel Repair Kit used</b> ${kitsLeft} left in your inventory</span></li>
      </ul>
      <div class="sf-deeper">
        <h4>${IC.book}<span>Go deeper</span></h4>
        <p>${DEEPER}</p>
        <p class="ez-source">${IC.link}<span>Sources:
          ${Object.values(SOURCES)
            .map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${s.label}</a>`)
            .join(' · ')}</span></p>
      </div>
      <div class="ez-row ez-row-center"><button class="ez-btn ez-btn-go ez-btn-xl" data-back>${IC.back}<span>${TEXT.back}</span></button></div>`;
    body.querySelector('[data-back]').addEventListener('click', () => done({ completed: false, repaired: true }));
    focusFirst();
  }

  function onKey(e) {
    if (e.code !== 'Escape') return;
    e.preventDefault();
    if (repaired && screen !== 'result') showResult();
    else done({ completed: false, repaired });
  }

  showIntro();

  return {
    onKey,
    destroy() {
      cancelAnimationFrame(raf);
      ctx.voice?.stop?.();
    },
  };
}
