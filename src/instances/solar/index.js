// index.js — Solar Fix instance. Opened at the damaged solar array when you have a Solar
// Panel Repair Kit. Flow (same pattern as the Electrolysis lesson):
//   first repair ever: how a solar cell works (catch the light → close the circuit), then
//   today's mini-game — Cell Swap, Hot Spot Hunt or Wire Fix (minigames.js; random, never
//   twice in a row; a "How to play" card the first time) → What really happened → quiz → result.
// The kit is used the moment the mini-game ends (ctx.onRepaired); leaving before that keeps
// the kit and leaves the array broken.
import './style.css';
import './games.css';
import { SOLAR_DAMAGE } from '../../config/gameplay.js';
import { sfx } from '../../ui/sfx.js';
import { loadSettings, saveSettings } from '../../systems/save.js';
import { tutorialSeen } from '../../ui/tutorial.js';
import { IC, voltBot } from '../electrolysis/icons.js';
import { createShell, learnScreen, quizScreen, playFrame, svgEl, svgPoint, capture } from '../lessonKit.js';
import { gameById, nextGame } from './minigames.js';
import { createCellGame, createHotSpotGame, createWireGame } from './games.js';
import { ART } from './tutorialArt.js';
import { TEXT, QUIZ, DEEPER, SOURCES, TUTORIALS, CONCEPT, TIPS, LEARN, LEARN_SHOWS } from './content.js';

const ELECTRONS_NEEDED = 5;
const FACTORY = { cells: createCellGame, hotspot: createHotSpotGame, wires: createWireGame };
const SUN_ICON = `<svg class="ez-ic" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="7" fill="#ffc94a" stroke="#10182c" stroke-width="2.5"/><g stroke="#ffc94a" stroke-width="3" stroke-linecap="round"><path d="M16 2v4M16 26v4M2 16h4M26 16h4M6 6l3 3M23 23l3 3M6 26l3-3M23 9l3-3"/></g></svg>`;
// same sun in the button's ink colour (a yellow sun on a yellow button would vanish)
const SUN_BTN = `<svg class="ez-ic" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="6.5" fill="none" stroke="currentColor" stroke-width="3"/><g stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M16 2v4M16 26v4M2 16h4M26 16h4M6 6l3 3M23 23l3 3M6 26l3-3M23 9l3-3"/></g></svg>`;

/** ctx: { voice?, repairs (how many repairs so far), kitsLeft(), onRepaired() → { kitsLeft } } */
export function createSolarRepairInstance({ root, ctx, done }) {
  const shell = createShell({ root, ctx, cls: 'sf', titleIcon: SUN_ICON, title: TEXT.title, labelId: 'sf-title' });
  const { body, say, speak, announce, focusFirst } = shell;
  const saved = loadSettings();
  const firstEver = !saved.solarLessonSeen;
  const gameId = saved.solarNext && gameById(saved.solarNext).id === saved.solarNext ? saved.solarNext : nextGame(saved.solarLast);
  saveSettings({ solarNext: gameId });
  const g = gameById(gameId);
  const quiz = QUIZ[gameId][(ctx.repairs ?? 0) % QUIZ[gameId].length];
  const tutKey = `solar-${gameId}`;
  shell.steps = [
    ...(firstEver ? [{ id: 'light', label: 'Light' }, { id: 'circuit', label: 'Circuit' }] : []),
    { id: 'fix', label: 'Fix' },
    { id: 'learn', label: 'Learn' },
    { id: 'quiz', label: 'Quiz' },
    { id: 'result', label: 'Done' },
  ];

  // the lesson steps keep their own per-frame animation (`tick`)
  let tick = null;
  const setScreen = (id) => {
    shell.setScreen(id);
    tick = null;
    shell.setTick((dt, t) => tick?.(dt, t));
  };
  const nextButton = (label, fn) => shell.nextButton(label, fn);
  let repaired = false;
  let kitsLeft = ctx.kitsLeft?.() ?? 0;
  let game = null;
  let fromLesson = false;
  function leaveRow() {
    return `<div class="ez-row sf-leave-row"><button class="ez-btn sf-leave" data-leave>${IC.back}<span>${TEXT.leave}</span></button></div>`;
  }
  function wireLeave() {
    body.querySelector('[data-leave]')?.addEventListener('click', () => done({ completed: false }));
  }
  const tutorial = () => ({
    id: tutKey,
    title: TUTORIALS[gameId].title,
    lead: `${voltBot('wow')}<p>${CONCEPT[gameId]}</p>`,
    leadSay: CONCEPT[gameId],
    panels: TUTORIALS[gameId].panels.map((p) => ({ art: ART[p.art] ?? '', caption: p.caption, say: p.say })),
  });

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
        nextButton(TEXT.next, afterLesson);
      }
    };
    announce(TEXT.circuitDo);
    plug.focus();
  }

  // ---------------------------------------------------------------- today's job (later visits)
  function showJob() {
    setScreen('fix');
    speak(`${TEXT.jobTitle} ${TEXT.job} Today's job: ${g.name}.`);
    body.innerHTML = `
      ${say('think', `<h3 class="ez-h3">${TEXT.jobTitle}</h3><p>${TEXT.job}</p>`)}
      <p class="ez-today">${SUN_ICON}<span>Today’s job: <b>${g.name}</b>${tutorialSeen(tutKey) ? '' : ' <span class="ez-game-new">New!</span>'}</span></p>
      <div class="ez-row ez-row-center"><button class="ez-btn ez-btn-go ez-btn-xl" data-go>${SUN_BTN}<span>Start</span></button></div>
      <div class="ez-row">
        <button class="ez-btn ez-btn-ghost" data-lesson>${IC.book}<span>${TEXT.lesson}</span></button>
        <button class="ez-btn ez-btn-ghost" data-leave>${IC.back}<span>${TEXT.leave}</span></button>
      </div>`;
    body.querySelector('[data-go]').addEventListener('click', () => {
      sfx.click();
      showPlay();
    });
    body.querySelector('[data-lesson]').addEventListener('click', () => {
      sfx.click();
      fromLesson = true;
      showLight();
    });
    wireLeave();
    focusFirst();
  }

  /** After "catch the light" + "close the circuit": on to today's game. */
  function afterLesson() {
    saveSettings({ solarLessonSeen: true });
    if (fromLesson) showJob();
    else showPlay();
  }

  // ---------------------------------------------------------------- the mini-game
  function showPlay() {
    setScreen('fix');
    const mount = playFrame(shell, { concept: CONCEPT[gameId], leaveLabel: TEXT.leave, helpLabel: `How to play ${g.name}`, goal: `${SUN_ICON}<b>${g.name}</b>` });
    wireLeave();
    body.querySelector('[data-help]').addEventListener('click', () => {
      sfx.click();
      shell.tutorial(tutorial());
    });
    const begin = () => {
      if (shell.screen !== 'fix' || game) return;
      game = FACTORY[gameId]({ mount, announce, onComplete: finish, onTip: (key) => shell.tip(TIPS[gameId]?.[key]) });
      announce(`${g.name}: ${CONCEPT[gameId]}`);
    };
    if (tutorialSeen(tutKey)) begin();
    else shell.tutorial(tutorial()).then(begin);
  }

  function finish() {
    game?.destroy();
    game = null;
    const r = ctx.onRepaired?.(); // uses the kit, array back to full power
    repaired = true;
    kitsLeft = r?.kitsLeft ?? kitsLeft;
    saveSettings({ solarLast: gameId, solarNext: nextGame(gameId), solarLessonSeen: true });
    const shown = loadSettings().learnShown ?? {};
    const key = `solar-${gameId}`;
    if ((shown[key] ?? 0) < LEARN_SHOWS) {
      saveSettings({ learnShown: { ...shown, [key]: (shown[key] ?? 0) + 1 } });
      learnScreen(shell, LEARN[gameId], ART[LEARN[gameId].art], showQuiz);
    } else showQuiz();
  }
  const showQuiz = () => quizScreen(shell, quiz, showResult);

  // ---------------------------------------------------------------- result
  function showResult() {
    setScreen('result');
    speak('Solar array repaired! The base has full solar power again.');
    body.innerHTML = `
      ${say('cheer', `<h3 class="ez-h3">Solar array repaired!</h3><p>Every chain is flowing again. The base has full solar power.</p>`)}
      <ul class="ez-results">
        <li class="ez-res ez-tone-power">${IC.power}<span><b>Power: 100%</b> was ${Math.round(SOLAR_DAMAGE.DAMAGED_OUTPUT * 100)}% with the damage</span></li>
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
    if (shell.tutorialOpen()) {
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'Escape') {
        e.preventDefault();
        shell.el.querySelector('.tut-go')?.click();
      }
      return;
    }
    if (shell.screen === 'fix' && game?.onKey?.(e)) return;
    if (e.code !== 'Escape') return;
    e.preventDefault();
    if (!repaired) done({ completed: false });
    else if (shell.screen === 'learn') showQuiz();
    else if (shell.screen === 'quiz') showResult();
    else done({ completed: false, repaired: true });
  }

  if (firstEver) showIntro();
  else showJob();

  return {
    onKey,
    destroy() {
      game?.destroy();
      game = null;
      shell.destroy();
    },
  };
}
