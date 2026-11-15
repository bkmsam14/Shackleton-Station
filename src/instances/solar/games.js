// games.js — the three Solar Fix mini-games (DOM + SVG). Rules live in minigames.js.
// Each game: create<X>Game({ mount, announce, onComplete, onTip }) → { destroy(), onKey(e) }.
// onComplete({ seconds }) when the array is whole again (the kit is used then: index.js).
// No fail state: a wrong tap gets a hint.
import { SOLAR_DAMAGE } from '../../config/gameplay.js';
import { sfx } from '../../ui/sfx.js';
import { svgEl, svgPoint, capture, onActivate } from '../lessonKit.js';
import { pickCracked, createWireRound, turnPiece, flowReach, wireSolved, pieceOk } from './minigames.js';

const ROWS = 5;
const COLS = 6;
// broken chains match the in-game damage: 40 % output left = 3 of 5 rows dark
export const BROKEN_ROWS = Math.round((1 - SOLAR_DAMAGE.DAMAGED_OUTPUT) * ROWS);

function animLoop(fn) {
  let raf = 0;
  let last = performance.now();
  let dead = false;
  const step = (now) => {
    if (dead) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    raf = requestAnimationFrame(step);
    try {
      fn(dt, now / 1000);
    } catch (err) {
      console.error('[instance:solar-repair] game step failed', err);
      dead = true;
    }
  };
  raf = requestAnimationFrame(step);
  return () => {
    dead = true;
    cancelAnimationFrame(raf);
  };
}

/** The game's stage: an SVG + the "what to do" line under it. */
function stage(mount, cls, w, h, label) {
  const root = document.createElement('div');
  root.className = `sf-game ${cls}`;
  root.innerHTML = `
    <div class="sf-stage"><svg class="sf-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}"></svg></div>
    <p class="ez-p ez-center sf-do" aria-live="polite"></p>`;
  mount.appendChild(root);
  return { root, svg: root.querySelector('svg'), doEl: root.querySelector('.sf-do') };
}

// ====================================================================== Cell Swap
/** Chains of cells: swap the cracked ones (drag a new cell, or click one then a cracked one). */
export function createCellGame({ mount, announce, onComplete, onTip }) {
  const { root, svg, doEl } = stage(mount, 'sf-cells', 640, 340, 'The solar array: 5 rows of 6 cells, some cracked, and new cells in the repair kit');
  doEl.innerHTML = 'Drag a <b>new cell</b> from the kit onto each <b>cracked</b> cell (or tap a new cell, then a cracked one).';
  const start = performance.now();
  const CW = 66;
  const CH = 38;
  const GAP = 6;
  const X0 = 40;
  const Y0 = 16;
  const cracked = pickCracked(ROWS, COLS, BROKEN_ROWS);
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
    svgEl('line', { x1: X0 + COLS * (CW + GAP) - GAP, y1: y + CH / 2, x2: 500, y2: y + CH / 2, class: 'sf-chainwire' }, rg);
  }
  svgEl('line', { x1: 500, y1: Y0 + CH / 2, x2: 500, y2: Y0 + (ROWS - 1) * (CH + GAP) + CH / 2, class: 'sf-chainwire' }, svg);
  const M = { x: 540, y: Y0, w: 56, h: ROWS * (CH + GAP) - GAP };
  svgEl('rect', { x: M.x, y: M.y, width: M.w, height: M.h, rx: 10, fill: '#0d1531', stroke: '#10182c', 'stroke-width': 4 }, svg);
  const meter = svgEl('rect', { x: M.x + 7, width: M.w - 14, rx: 6, fill: '#ffc94a' }, svg);
  const meterTxt = svgEl('text', { x: M.x + M.w / 2, y: M.y + M.h + 26, class: 'sf-label', 'text-anchor': 'middle' }, svg);
  const TRAY_Y = Y0 + ROWS * (CH + GAP) + 14;
  svgEl('rect', { x: X0 - 8, y: TRAY_Y - 8, width: 3 * (CW + 14) + 120, height: CH + 16, rx: 12, class: 'sf-tray' }, svg);
  svgEl('text', { x: X0 + 3 * (CW + 14) + 10, y: TRAY_Y + CH / 2 + 6, class: 'sf-label sf-tray-label' }, svg).textContent = 'Repair kit';
  const spares = [];
  for (let i = 0; i < BROKEN_ROWS; i++) {
    const home = { x: X0 + i * (CW + 14), y: TRAY_Y };
    const g = svgEl('g', { class: 'sf-spare', tabindex: 0, role: 'button', 'aria-label': 'New solar cell from the repair kit' }, svg);
    svgEl('rect', { x: 0, y: 0, width: CW, height: CH, rx: 5, class: 'sf-pv sf-pv-new' }, g);
    svgEl('line', { x1: 4, y1: CH / 2, x2: CW - 4, y2: CH / 2, class: 'sf-busbar' }, g);
    g.setAttribute('transform', `translate(${home.x} ${home.y})`);
    spares.push({ g, home, pos: { ...home }, used: false });
  }
  const flows = [];
  let selected = null;
  let finished = false;
  let fixedOnce = false;
  const rowWorks = (r) => !crackedEls.has(r);
  function refresh() {
    const frac = [...Array(ROWS).keys()].filter(rowWorks).length / ROWS;
    const h = (M.h - 14) * frac;
    meter.setAttribute('y', M.y + M.h - 7 - h);
    meter.setAttribute('height', h);
    meterTxt.textContent = `Power ${Math.round(frac * 100)}%`;
    rowGroups.forEach((rg, r) => rg.classList.toggle('is-dark', !rowWorks(r)));
  }
  for (let r = 0; r < ROWS; r++) {
    const y = Y0 + r * (CH + GAP) + CH / 2;
    for (let i = 0; i < 3; i++) flows.push({ dot: svgEl('circle', { r: 4.5, class: 'sf-flowdot' }, rowGroups[r]), r, y, s: i / 3 + Math.random() * 0.1 });
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
    if (!fixedOnce) {
      fixedOnce = true;
      onTip?.('row');
    }
    if (!crackedEls.size && !finished) {
      finished = true;
      sfx.success();
      doEl.innerHTML = '<b>All chains are flowing again. Full power!</b>';
      setTimeout(() => onComplete({ seconds: (performance.now() - start) / 1000 }), 900);
    }
    return true;
  }
  function rowAt(p) {
    for (const [row, cr] of crackedEls) if (p.x >= cr.x - 12 && p.x <= cr.x + CW + 12 && p.y >= cr.y - 12 && p.y <= cr.y + CH + 12) return row;
    return null;
  }
  const pick = (s) => {
    spares.forEach((o) => o.g.classList.remove('is-picked'));
    selected = s;
    s.g.classList.add('is-picked');
  };
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
        pick(s);
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
      pick(s);
      crackedEls.values().next().value?.g.focus();
    });
  }
  for (const [row, cr] of crackedEls) {
    onActivate(cr.g, () => {
      if (selected && !selected.used) {
        selected.g.classList.remove('is-picked');
        place(selected, row);
        const nextSpare = spares.find((o) => !o.used);
        if (nextSpare) pick(nextSpare);
        else selected = null;
      } else announce('Pick a new cell from the repair kit first.');
    });
  }
  const stop = animLoop((dt) => {
    for (const f of flows) {
      if (!rowWorks(f.r)) {
        f.dot.setAttribute('cx', -50);
        continue;
      }
      f.s = (f.s + dt * 0.35) % 1;
      f.dot.setAttribute('cx', X0 + (500 - X0) * f.s);
      f.dot.setAttribute('cy', f.y);
    }
  });
  spares[0].g.focus();
  return {
    onKey: () => false,
    destroy() {
      stop();
      root.remove();
    },
  };
}

// ====================================================================== Hot Spot Hunt
/** Tiny cracks hide in plain sight; the infrared (heat) camera shows the cracked cells hot. */
export function createHotSpotGame({ mount, announce, onComplete, onTip }) {
  const { root, svg, doEl } = stage(mount, 'sf-hot', 640, 300, 'The solar array: 5 rows of 6 cells. Some have cracks too small to see. Switch on the heat camera to find the hot cells.');
  const bar = document.createElement('div');
  bar.className = 'ez-row ez-row-center sf-hot-bar';
  bar.innerHTML = `
    <button type="button" class="ez-btn ez-btn-go sf-ir-btn" aria-pressed="false">
      <svg class="ez-ic" viewBox="0 0 32 32" aria-hidden="true"><rect x="10" y="3" width="12" height="20" rx="6" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="16" cy="25" r="5" fill="#ff7a59" stroke="currentColor" stroke-width="2.5"/><path d="M16 12v10" stroke="#ff7a59" stroke-width="3" stroke-linecap="round"/></svg>
      <span>Heat camera: <b data-ir>OFF</b></span>
    </button>
    <span class="sf-legend" aria-hidden="true"><i>cool</i><b></b><i>hot</i></span>`;
  root.insertBefore(bar, root.querySelector('.sf-do'));
  const irBtn = bar.querySelector('.sf-ir-btn');
  const irTxt = bar.querySelector('[data-ir]');
  const start = performance.now();
  const CW = 84;
  const CH = 46;
  const GAP = 8;
  const X0 = (640 - (COLS * CW + (COLS - 1) * GAP)) / 2;
  const Y0 = (300 - (ROWS * CH + (ROWS - 1) * GAP)) / 2;
  const cracked = pickCracked(ROWS, COLS, BROKEN_ROWS);
  let ir = false;
  let found = 0;
  let finished = false;
  let saidIr = false;
  const cells = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = X0 + c * (CW + GAP);
      const y = Y0 + r * (CH + GAP);
      const hot = cracked.get(r) === c;
      const g = svgEl('g', { class: `sf-hcell ${hot ? 'is-hot' : ''}`, tabindex: 0, role: 'button', 'aria-label': `Cell, row ${r + 1}, column ${c + 1}` }, svg);
      svgEl('rect', { x, y, width: CW, height: CH, rx: 6, class: 'sf-hcell-rect' }, g);
      svgEl('line', { x1: x + 5, y1: y + CH / 2, x2: x + CW - 5, y2: y + CH / 2, class: 'sf-busbar' }, g);
      // a hairline crack: almost invisible to the eye (that's the point)
      if (hot) svgEl('polyline', { points: `${x + 20},${y + 6} ${x + 34},${y + 22} ${x + 30},${y + 30} ${x + 46},${y + 40}`, class: 'sf-hairline' }, g);
      svgEl('circle', { cx: x + CW / 2, cy: y + CH / 2, r: 18, class: 'sf-heat' }, g);
      const cell = { g, hot, done: false, x, y };
      cells.push(cell);
      onActivate(g, () => tap(cell));
    }
  }
  function setIr(on) {
    ir = on;
    svg.classList.toggle('is-ir', on);
    irBtn.setAttribute('aria-pressed', String(on));
    irTxt.textContent = on ? 'ON' : 'OFF';
    sfx.click();
    if (on && !saidIr) {
      saidIr = true;
      onTip?.('ir');
    }
    doEl.innerHTML = on ? 'Tap the <b>hot</b> cells (bright orange).' : 'The cracks are too small to see. Switch on the <b>heat camera</b>!';
    announce(on ? 'Heat camera on. The cracked cells glow hot. Tap them.' : 'Heat camera off.');
  }
  irBtn.addEventListener('click', () => setIr(!ir));
  function tap(cell) {
    if (finished || cell.done) return;
    if (!ir) {
      sfx.miss();
      doEl.innerHTML = 'They all look the same! Switch on the <b>heat camera</b>.';
      announce('They all look the same. Switch on the heat camera.');
      irBtn.focus();
      return;
    }
    if (!cell.hot) {
      sfx.miss();
      doEl.innerHTML = 'That one is <b>cool</b>: it’s working fine. Find the hot ones!';
      announce('That cell is cool, so it is working. Find the hot ones.');
      return;
    }
    cell.done = true;
    cell.g.classList.add('is-fixed');
    cell.g.classList.remove('is-hot');
    sfx.bubble();
    found++;
    if (found === 1) onTip?.('hot');
    announce(`Hot cell found and swapped for a new one. ${BROKEN_ROWS - found} left.`);
    if (found >= BROKEN_ROWS) {
      finished = true;
      sfx.success();
      onTip?.('cool');
      doEl.innerHTML = '<b>No more hot spots. Full power!</b>';
      setTimeout(() => onComplete({ seconds: (performance.now() - start) / 1000 }), 1100);
    } else doEl.innerHTML = `Swapped! <b>${BROKEN_ROWS - found}</b> hot cell${BROKEN_ROWS - found > 1 ? 's' : ''} left.`;
  }
  doEl.innerHTML = 'The cracks are too small to see. Switch on the <b>heat camera</b>!';
  irBtn.focus();
  return {
    onKey: () => false,
    destroy() {
      root.remove();
    },
  };
}

// ====================================================================== Wire Fix
/** Turn the wire pieces until one unbroken path joins the cells to the battery. */
export function createWireGame({ mount, announce, onComplete, onTip }) {
  const T = 96; // tile size
  const round = createWireRound();
  const W = 640;
  const Hh = round.rows * T + 40;
  const OX = (W - round.cols * T) / 2;
  const OY = 20;
  const { root, svg, doEl } = stage(mount, 'sf-wires', W, Hh, 'A path of wire pieces from the solar cells to the base battery. Tap a piece to turn it until the path is joined all the way.');
  const start = performance.now();
  let finished = false;
  let saidGap = false;
  // the solar cells (start) and the battery (end)
  const first = round.pieces[0];
  const last = round.pieces[round.pieces.length - 1];
  const sx = OX + first.c * T;
  const sy = OY + first.r * T + T / 2;
  svgEl('rect', { x: 8, y: sy - 30, width: OX - 16, height: 60, rx: 10, class: 'sf-pv' }, svg);
  svgEl('text', { x: OX / 2, y: sy + 52, 'text-anchor': 'middle', class: 'sf-label sf-small' }, svg).textContent = 'cells';
  svgEl('line', { x1: OX - 8, y1: sy, x2: sx, y2: sy, class: 'sf-wire-lit' }, svg);
  const ex = OX + (last.c + (last.outSide === 1 ? 1 : 0)) * T;
  const ey = OY + last.r * T + T / 2;
  const batX = last.outSide === 1 ? ex + 8 : 8;
  const endWire = svgEl('line', { x1: ex, y1: ey, x2: last.outSide === 1 ? batX : OX - 8, y2: ey, class: 'sf-wire-off' }, svg);
  const BAT = { x: batX, y: ey - 34, w: OX - 16, h: 68 };
  svgEl('rect', { x: BAT.x, y: BAT.y, width: BAT.w, height: BAT.h, rx: 10, fill: '#0d1531', stroke: '#10182c', 'stroke-width': 4 }, svg);
  const level = svgEl('rect', { x: BAT.x + 6, y: BAT.y + 6, width: 0, height: BAT.h - 12, rx: 6, fill: '#7be0a0' }, svg);
  svgEl('text', { x: BAT.x + BAT.w / 2, y: BAT.y - 10, 'text-anchor': 'middle', class: 'sf-label sf-small' }, svg).textContent = 'battery';
  // the return wire (not broken): electricity goes back from the battery to the cells,
  // so the whole thing is a LOOP — a circuit only works as a complete loop
  const back = svgEl('path', { d: `M${BAT.x + BAT.w / 2} ${BAT.y + BAT.h} V ${Hh - 6} H 20 V ${sy + 30}`, class: 'sf-wire-off sf-return', fill: 'none' }, svg);

  const h = T / 2 - 6;
  const tiles = round.pieces.map((p, i) => {
    const cx = OX + p.c * T + T / 2;
    const cy = OY + p.r * T + T / 2;
    const g = svgEl('g', { class: 'sf-tile', tabindex: 0, role: 'button' }, svg);
    svgEl('rect', { x: cx - T / 2 + 3, y: cy - T / 2 + 3, width: T - 6, height: T - 6, rx: 14, class: 'sf-tile-bg' }, g);
    const piece = svgEl('g', {}, g);
    const d = p.type === 'straight' ? `M${cx - h - 6} ${cy} L${cx + h + 6} ${cy}` : `M${cx} ${cy - h - 6} Q ${cx} ${cy} ${cx + h + 6} ${cy}`;
    const wire = svgEl('path', { d, class: 'sf-wire-off', fill: 'none' }, piece);
    svgEl('circle', { cx, cy, r: 5, fill: '#10182c' }, piece);
    onActivate(g, () => turn(i));
    return { g, piece, wire, cx, cy };
  });
  function draw() {
    const reach = flowReach(round);
    round.pieces.forEach((p, i) => {
      const t = tiles[i];
      t.piece.setAttribute('transform', `rotate(${p.rot * 90} ${t.cx} ${t.cy})`);
      t.wire.setAttribute('class', i < reach ? 'sf-wire-lit' : 'sf-wire-off');
      t.g.classList.toggle('is-gap', i === reach);
      t.g.setAttribute('aria-label', `Wire piece ${i + 1}: ${i < reach ? 'electricity flowing' : i === reach ? 'electricity stops here' : 'no electricity yet'}. Tap to turn it.`);
    });
    const loop = reach === round.pieces.length;
    endWire.setAttribute('class', loop ? 'sf-wire-lit' : 'sf-wire-off');
    back.setAttribute('class', `${loop ? 'sf-wire-lit' : 'sf-wire-off'} sf-return`);
    return reach;
  }
  function turn(i) {
    if (finished) return;
    turnPiece(round, i);
    sfx.click();
    const reach = draw();
    if (wireSolved(round)) {
      finished = true;
      sfx.success();
      onTip?.('loop');
      doEl.innerHTML = '<b>The loop is complete! Electricity flows round: cells → battery → back.</b>';
      announce('The loop is complete. Electricity flows from the cells to the battery and back again.');
      return;
    }
    if (pieceOk(round.pieces[i]) && i === reach - 1) sfx.pop();
    if (!saidGap && reach > 0) {
      saidGap = true;
      onTip?.('gap');
    }
    doEl.innerHTML = `The electricity stops at piece <b>${reach + 1}</b>. Tap it to turn it!`;
    announce(`Electricity reaches ${reach} of ${round.pieces.length} pieces.`);
  }
  let charge = 0;
  let done = false;
  const stop = animLoop((dt) => {
    if (!finished || done) return;
    charge = Math.min(1, charge + dt * 0.7);
    level.setAttribute('width', (BAT.w - 12) * charge);
    if (charge >= 1) {
      done = true;
      setTimeout(() => onComplete({ seconds: (performance.now() - start) / 1000, turns: round.turns }), 500);
    }
  });
  const reach = draw();
  doEl.innerHTML = `Tap the pieces to <b>turn</b> them. The electricity stops at piece <b>${reach + 1}</b>.`;
  tiles[reach]?.g.focus();
  return {
    onKey: () => false,
    destroy() {
      stop();
      root.remove();
    },
  };
}
