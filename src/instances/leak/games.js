// games.js — the three Leak Fix mini-games (DOM + SVG). Rules live in minigames.js.
// Each game: create<X>Game({ mount, announce, onComplete, onTip }) → { destroy(), onKey(e) }.
// onComplete({ seconds }) when the hole is sealed. No fail state: mistakes get a hint.
import { sfx } from '../../ui/sfx.js';
import { svgEl, svgPoint, onActivate } from '../lessonKit.js';
import { detectorBars, beepRate, SECTIONS, createHatchRound, groupsOf, toggleHatch, leakingGroup, hatchFound, PATCH_STEPS } from './minigames.js';

const INK = '#10182c';

/** A small per-game animation loop that stops on destroy. */
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
      console.error('[instance:leak-repair] game step failed', err);
      dead = true;
    }
  };
  raf = requestAnimationFrame(step);
  return () => {
    dead = true;
    cancelAnimationFrame(raf);
  };
}

/** A riveted habitat wall with panels, a cable tray and a vent (just scenery). */
function drawWall(svg, W, Hh) {
  svgEl('rect', { x: 8, y: 8, width: W - 16, height: Hh - 16, rx: 18, fill: '#c9d0d7', stroke: INK, 'stroke-width': 4 }, svg);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 2; r++) {
      const x = 22 + c * ((W - 44) / 4);
      const y = 22 + r * ((Hh - 44) / 2);
      const w = (W - 44) / 4 - 10;
      const h = (Hh - 44) / 2 - 10;
      svgEl('rect', { x, y, width: w, height: h, rx: 10, fill: '#d8dee4', stroke: '#9aa6b5', 'stroke-width': 2 }, svg);
      for (const [fx, fy] of [[0.08, 0.12], [0.92, 0.12], [0.08, 0.88], [0.92, 0.88]]) svgEl('circle', { cx: x + w * fx, cy: y + h * fy, r: 3.5, fill: '#8a96a8' }, svg);
    }
  }
  svgEl('rect', { x: 40, y: Hh / 2 - 9, width: W - 80, height: 18, rx: 6, fill: '#7d8899', stroke: INK, 'stroke-width': 2.5, opacity: 0.85 }, svg); // cable tray
  const vx = W - 120;
  svgEl('rect', { x: vx, y: 40, width: 74, height: 46, rx: 8, fill: '#9aa6b5', stroke: INK, 'stroke-width': 2.5 }, svg);
  for (let i = 0; i < 4; i++) svgEl('line', { x1: vx + 10, y1: 50 + i * 9, x2: vx + 64, y2: 50 + i * 9, stroke: INK, 'stroke-width': 2 }, svg);
}

/** The hole: dark dot + red ring + escaping-air arrows (group, hidden at first). */
function drawHole(svg, x, y) {
  const g = svgEl('g', { class: 'lf-hole', transform: `translate(${x} ${y})` }, svg);
  svgEl('circle', { r: 16, fill: 'none', stroke: '#ff6b6b', 'stroke-width': 4, class: 'lf-hole-ring' }, g);
  svgEl('circle', { r: 5, fill: INK }, g);
  const air = svgEl('g', { class: 'lf-air', stroke: '#2f7fd8', 'stroke-width': 4, 'stroke-linecap': 'round', fill: 'none' }, g);
  for (const a of [-0.6, 0, 0.6, Math.PI - 0.6, Math.PI, Math.PI + 0.6]) {
    svgEl('path', { d: `M${Math.cos(a) * 20} ${Math.sin(a) * 20} L${Math.cos(a) * 36} ${Math.sin(a) * 36}` }, air);
  }
  return { g, air };
}

// ====================================================================== Leak Hunt
export function createHuntGame({ mount, announce, onComplete, onTip }) {
  const W = 640;
  const Hh = 320;
  const root = document.createElement('div');
  root.className = 'lf-game lf-hunt';
  root.innerHTML = `
    <div class="lf-stage"><svg class="lf-svg" viewBox="0 0 ${W} ${Hh}" role="application" aria-label="The habitat wall. Move the leak detector with the mouse, a finger or the arrow keys. More bars mean closer to the hole." tabindex="0"></svg>
      <div class="lf-meter" aria-hidden="true"><span class="lf-meter-ear">🔊</span><i></i><i></i><i></i><i></i><i></i></div>
    </div>
    <p class="lf-do" aria-live="polite">Move the detector. <b>More bars = closer!</b></p>`;
  mount.appendChild(root);
  const svg = root.querySelector('.lf-svg');
  const bars = [...root.querySelectorAll('.lf-meter i')];
  const doEl = root.querySelector('.lf-do');
  drawWall(svg, W, Hh);
  const target = { x: 90 + Math.random() * (W - 180), y: 60 + Math.random() * (Hh - 120) };
  const holeG = drawHole(svg, target.x, target.y);
  holeG.g.style.display = 'none';
  // the detector (probe tip at 0,0)
  const probe = svgEl('g', { class: 'lf-probe' }, svg);
  svgEl('circle', { r: 30, class: 'lf-probe-zone' }, probe);
  svgEl('rect', { x: -5, y: 2, width: 10, height: 22, rx: 3, fill: '#4a5468', stroke: INK, 'stroke-width': 2.5 }, probe);
  svgEl('rect', { x: -20, y: 22, width: 40, height: 58, rx: 10, fill: '#f08a45', stroke: INK, 'stroke-width': 3 }, probe);
  const pbars = [0, 1, 2, 3, 4].map((i) => svgEl('rect', { x: -13 + i * 6, y: 66 - i * 5, width: 4.5, height: 6 + i * 5, fill: '#2a3350' }, probe));
  const pos = { x: W * 0.25, y: Hh * 0.5 };
  // never start right on the hole
  if (Math.hypot(pos.x - target.x, pos.y - target.y) < 160) pos.x = target.x > W / 2 ? 80 : W - 80;
  const start = performance.now();
  let level = 0;
  let best = 0;
  let onHole = 0;
  let phase = 'search'; // search → found (tap the hole) → done
  let beepIn = 0;
  let saidCloser = false;

  function place() {
    probe.setAttribute('transform', `translate(${pos.x} ${pos.y})`);
  }
  place();
  svg.addEventListener('pointermove', (e) => {
    if (phase !== 'search') return;
    const p = svgPoint(svg, e);
    pos.x = Math.max(20, Math.min(W - 20, p.x));
    pos.y = Math.max(20, Math.min(Hh - 60, p.y));
    place();
  });
  svg.addEventListener('pointerdown', (e) => {
    if (phase !== 'search') return;
    const p = svgPoint(svg, e);
    pos.x = Math.max(20, Math.min(W - 20, p.x));
    pos.y = Math.max(20, Math.min(Hh - 60, p.y));
    place();
  });

  function found() {
    phase = 'found';
    sfx.success();
    holeG.g.style.display = '';
    holeG.g.classList.add('is-found');
    probe.style.display = 'none';
    onTip?.('found');
    doEl.innerHTML = '<b>Found it!</b> Tap the hole to stick on a patch.';
    announce('Found the hole! Tap it to put on a patch.');
    holeG.g.setAttribute('tabindex', '0');
    holeG.g.setAttribute('role', 'button');
    holeG.g.setAttribute('aria-label', 'The hole. Put a patch on it');
    holeG.g.focus();
    onActivate(holeG.g, () => {
      if (phase !== 'found') return;
      phase = 'done';
      sfx.pop();
      const patch = svgEl('rect', { x: -34, y: -26, width: 68, height: 52, rx: 10, class: 'lf-patch-on' }, holeG.g);
      patch.getBoundingClientRect();
      holeG.air.style.display = 'none';
      doEl.innerHTML = '<b>Patched!</b> No more air escaping.';
      announce('Patched! No more air escaping.');
      setTimeout(() => onComplete({ seconds: (performance.now() - start) / 1000 }), 1100);
    });
  }

  const stop = animLoop((dt) => {
    if (phase !== 'search') return;
    const d = Math.hypot(pos.x - target.x, pos.y - target.y);
    level = detectorBars(d);
    bars.forEach((b, i) => b.classList.toggle('is-on', i < level));
    pbars.forEach((b, i) => b.setAttribute('fill', i < level ? '#7be0a0' : '#2a3350'));
    if (level >= 3 && level > best && !saidCloser) {
      saidCloser = true;
      onTip?.('closer');
    }
    best = Math.max(best, level);
    // beeps get faster as you get closer (silent at 0 bars)
    const rate = beepRate(level);
    if (rate > 0 && (beepIn -= dt) <= 0) {
      beepIn = 1 / rate;
      sfx.tick();
    }
    onHole = level >= 5 ? onHole + dt : 0;
    if (onHole > 0.35) found();
  });

  return {
    onKey(e) {
      const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.code];
      if (k && phase === 'search') {
        e.preventDefault();
        pos.x = Math.max(20, Math.min(W - 20, pos.x + k[0] * 18));
        pos.y = Math.max(20, Math.min(Hh - 60, pos.y + k[1] * 18));
        place();
        return true;
      }
      return false;
    },
    destroy() {
      stop();
      root.remove();
    },
  };
}

// ====================================================================== Hatch Hunt
export function createHatchGame({ mount, announce, onComplete, onTip }) {
  const W = 640;
  const Hh = 250;
  const round = createHatchRound();
  const root = document.createElement('div');
  root.className = 'lf-game lf-hatch';
  root.innerHTML = `
    <div class="lf-stage"><svg class="lf-svg" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="The base from above: sleeping nook, lounge, work bay and airlock, with a hatch between each. Every room has a pressure needle."></svg></div>
    <p class="lf-do" aria-live="polite">Tap a <b>hatch</b> to close it. Then watch the needles.</p>
    <p class="lf-fast">⏩ Time sped up: real crews watched for hours.</p>`;
  mount.appendChild(root);
  const svg = root.querySelector('.lf-svg');
  const doEl = root.querySelector('.lf-do');
  const n = SECTIONS.length;
  const RW = 132;
  const GAP = 26;
  const X0 = (W - (n * RW + (n - 1) * GAP)) / 2;
  const rooms = [];
  const pressure = SECTIONS.map(() => 1); // 1 = normal; drawn as a needle
  SECTIONS.forEach((s, i) => {
    const x = X0 + i * (RW + GAP);
    const g = svgEl('g', { class: 'lf-room' }, svg);
    const box = svgEl('rect', { x, y: 30, width: RW, height: 180, rx: 16, class: 'lf-room-box' }, g);
    svgEl('text', { x: x + RW / 2, y: 62, 'text-anchor': 'middle', class: 'lf-room-name' }, g).textContent = s.name;
    // pressure dial
    const cx = x + RW / 2;
    const cy = 140;
    svgEl('circle', { cx, cy, r: 44, fill: '#0d1531', stroke: INK, 'stroke-width': 4 }, g);
    svgEl('path', { d: `M${cx - 34} ${cy + 12} A36 36 0 0 1 ${cx + 34} ${cy + 12}`, fill: 'none', stroke: '#7be0a0', 'stroke-width': 7 }, g);
    svgEl('path', { d: `M${cx - 40} ${cy + 22} A42 42 0 0 1 ${cx - 34} ${cy + 12}`, fill: 'none', stroke: '#ff6b6b', 'stroke-width': 7 }, g);
    const needle = svgEl('line', { x1: cx, y1: cy, x2: cx, y2: cy - 34, stroke: '#ffc94a', 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
    svgEl('circle', { cx, cy, r: 6, fill: '#ffc94a' }, g);
    rooms.push({ g, box, needle, cx, cy, x });
  });
  const hatches = round.closed.map((_, i) => {
    const x = X0 + (i + 1) * (RW + GAP) - GAP / 2;
    const g = svgEl('g', { class: 'lf-hatchbtn', tabindex: 0, role: 'button', 'aria-label': `Hatch between ${SECTIONS[i].name} and ${SECTIONS[i + 1].name}: open` }, svg);
    svgEl('rect', { x: x - 22, y: 70, width: 44, height: 100, rx: 12, class: 'lf-hatch-hit' }, g);
    const door = svgEl('rect', { x: x - 11, y: 78, width: 22, height: 84, rx: 7, class: 'lf-hatch-door' }, g);
    svgEl('circle', { cx: x, cy: 120, r: 4, fill: INK }, g);
    return { g, door };
  });
  const start = performance.now();
  let watch = 0; // seconds of time-lapse left after a change
  let finished = false;
  let sealed = false; // patched: no part of the base loses air any more
  let saidSplit = false;

  function drawNeedles() {
    rooms.forEach((r, i) => {
      // 1 → straight up (+0°); a lower pressure swings the needle left toward red
      const a = ((pressure[i] - 1) * 900 * Math.PI) / 180; // 0.1 drop ≈ 90°
      const L = 34;
      r.needle.setAttribute('x2', r.cx + Math.sin(a) * L);
      r.needle.setAttribute('y2', r.cy - Math.cos(a) * L);
    });
  }
  drawNeedles();
  function refresh() {
    hatches.forEach((h, i) => {
      h.g.classList.toggle('is-closed', round.closed[i]);
      h.g.setAttribute('aria-label', `Hatch between ${SECTIONS[i].name} and ${SECTIONS[i + 1].name}: ${round.closed[i] ? 'closed' : 'open'}`);
    });
    const groups = groupsOf(round);
    rooms.forEach((r, i) => r.g.dataset.group = String(groups.findIndex((g) => g.includes(i))));
  }
  refresh();

  hatches.forEach((h, i) =>
    onActivate(h.g, () => {
      if (finished || watch > 0) return;
      // air that can flow again evens out: joined rooms share their pressure
      const wasClosed = round.closed[i];
      toggleHatch(round, i);
      if (wasClosed) {
        const g = groupsOf(round).find((gr) => gr.includes(i));
        const avg = g.reduce((s, k) => s + pressure[k], 0) / g.length;
        g.forEach((k) => (pressure[k] = avg));
      }
      sfx.click();
      refresh();
      watch = 2.2;
      doEl.innerHTML = 'Watching the needles…';
      announce(round.closed[i] ? 'Hatch closed. Watching the needles.' : 'Hatch opened. Watching the needles.');
    }),
  );

  function afterWatch() {
    const lg = leakingGroup(round);
    rooms.forEach((r, i) => r.g.classList.toggle('is-falling', lg.includes(i)));
    if (hatchFound(round)) {
      finished = true;
      const room = rooms[round.leak];
      sfx.success();
      onTip?.('found');
      doEl.innerHTML = `<b>The hole is in the ${SECTIONS[round.leak].name}!</b> Tap the room to patch it.`;
      announce(`The leak is in the ${SECTIONS[round.leak].name}. Tap the room to patch it.`);
      room.g.classList.add('is-leak');
      room.g.setAttribute('tabindex', '0');
      room.g.setAttribute('role', 'button');
      room.g.setAttribute('aria-label', `${SECTIONS[round.leak].name}: patch the hole`);
      room.g.focus();
      onActivate(room.g, () => {
        if (room.g.classList.contains('is-patched')) return;
        room.g.classList.add('is-patched');
        sealed = true;
        sfx.pop();
        svgEl('rect', { x: room.cx - 26, y: 74, width: 52, height: 22, rx: 6, class: 'lf-patch-on' }, room.g);
        doEl.innerHTML = '<b>Patched!</b> Every needle holds steady.';
        announce('Patched! Every needle holds steady.');
        setTimeout(() => onComplete({ seconds: (performance.now() - start) / 1000, tests: round.tests }), 1100);
      });
      return;
    }
    if (round.closed.some(Boolean) && !saidSplit) {
      saidSplit = true;
      onTip?.('split');
    }
    const names = lg.map((k) => SECTIONS[k].name).join(' + ');
    doEl.innerHTML = round.closed.some(Boolean)
      ? `Falling: <b>${names}</b>. Close another hatch to make it smaller!`
      : 'All the needles fall together. Close a hatch to split the base!';
    announce(`The pressure is falling in: ${names}.`);
  }

  const stop = animLoop((dt) => {
    // the leaking part loses pressure; hatches keep the rest steady (always a little, so
    // the kid can see it even before closing anything)
    const lg = sealed ? [] : leakingGroup(round);
    const speed = watch > 0 ? 0.03 : 0.004; // per second, sped-up time
    for (const k of lg) pressure[k] = Math.max(0.88, pressure[k] - (speed * dt) / lg.length);
    drawNeedles();
    if (watch > 0) {
      watch -= dt;
      if (watch <= 0) {
        watch = 0;
        afterWatch();
      }
    }
  });

  return {
    onKey: () => false,
    destroy() {
      stop();
      root.remove();
    },
  };
}

// ====================================================================== Patch It
export function createPatchGame({ mount, announce, onComplete, onTip }) {
  const W = 640;
  const Hh = 300;
  const root = document.createElement('div');
  root.className = 'lf-game lf-patch';
  root.innerHTML = `
    <ol class="lf-chips">${PATCH_STEPS.map((s, i) => `<li data-step="${s.id}"><span>${i + 1}</span>${s.label}</li>`).join('')}</ol>
    <div class="lf-stage"><svg class="lf-svg" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="The habitat wall with a tiny hole, and your repair tools: tape, glue part A and part B, and a cloth patch."></svg></div>
    <p class="lf-do" aria-live="polite"></p>`;
  mount.appendChild(root);
  const svg = root.querySelector('.lf-svg');
  const doEl = root.querySelector('.lf-do');
  const chips = [...root.querySelectorAll('.lf-chips li')];
  // the wall on the left part, tools on the right
  svgEl('rect', { x: 8, y: 8, width: 400, height: Hh - 16, rx: 18, fill: '#c9d0d7', stroke: INK, 'stroke-width': 4 }, svg);
  for (const [x, y] of [[30, 30], [386, 30], [30, Hh - 30], [386, Hh - 30]]) svgEl('circle', { cx: x, cy: y, r: 5, fill: '#8a96a8' }, svg);
  const HX = 208;
  const HY = 150;
  const hole = drawHole(svg, HX, HY);
  svgEl('rect', { x: 424, y: 8, width: 208, height: Hh - 16, rx: 18, class: 'lf-tray' }, svg);
  svgEl('text', { x: 528, y: 36, 'text-anchor': 'middle', class: 'lf-label' }, svg).textContent = 'Repair kit';
  const start = performance.now();
  let step = 0;
  let holdT = 0;
  let holding = false;
  let checkT = 0;
  let seep = null; // the small arrows of air still leaking past the tape
  const layer = svgEl('g', {}, svg);

  function setStep(i) {
    step = i;
    chips.forEach((c, k) => {
      c.classList.toggle('is-done', k < i);
      c.classList.toggle('is-now', k === i);
    });
    layer.replaceChildren();
    svg.appendChild(layer); // tools and the patch always sit on top of the tape
    const id = PATCH_STEPS[i]?.id;
    if (id === 'tape') showTape();
    else if (id === 'mix') showMix();
    else if (id === 'press') showPress();
    else if (id === 'check') showCheck();
  }
  const tool = (x, y, w, h, fill, label, aria) => {
    const g = svgEl('g', { class: 'lf-tool', tabindex: 0, role: 'button', 'aria-label': aria }, layer);
    svgEl('rect', { x, y, width: w, height: h, rx: 10, fill, stroke: INK, 'stroke-width': 3 }, g);
    if (label) svgEl('text', { x: x + w / 2, y: y + h / 2 + 8, 'text-anchor': 'middle', class: 'lf-tool-txt' }, g).textContent = label;
    return g;
  };

  function showTape() {
    doEl.innerHTML = '<b>1.</b> Tap the <b>tape</b> to stick it over the hole.';
    announce('Step 1: tap the tape to stick it over the hole.');
    const t = tool(458, 80, 140, 40, '#e9c46a', 'TAPE', 'Tape. Stick it over the hole');
    t.focus();
    onActivate(t, () => {
      if (step !== 0) return;
      sfx.pop();
      t.remove();
      const strip = svgEl('rect', { x: HX - 50, y: HY - 16, width: 100, height: 32, rx: 4, class: 'lf-tape-on' }, svg);
      strip.dataset.keep = '1';
      // tape only SLOWS the leak: a little air still escapes round its edges
      hole.air.style.display = 'none';
      seep = hole.air.cloneNode(true);
      seep.style.display = '';
      seep.setAttribute('opacity', '0.7');
      seep.setAttribute('transform', `translate(${HX} ${HY}) scale(1.6)`);
      svg.appendChild(seep);
      onTip?.('tape');
      setTimeout(() => setStep(1), 900);
    });
  }

  function showMix() {
    doEl.innerHTML = '<b>2.</b> Tap glue <b>A</b>, then glue <b>B</b>. Then <b>stir</b>!';
    announce('Step 2: tap glue A, then glue B, then stir.');
    const a = tool(446, 64, 74, 96, '#ffd166', 'A', 'Glue part A');
    const b = tool(536, 64, 74, 96, '#6fe3f0', 'B', 'Glue part B');
    const blob = svgEl('ellipse', { cx: 528, cy: 222, rx: 0, ry: 0, class: 'lf-blob' }, layer);
    const stir = tool(470, 196, 116, 52, '#f2f5ff', 'STIR', 'Stir the glue');
    stir.style.display = 'none';
    let got = { a: false, b: false };
    let stirs = 0;
    const color = () => {
      // yellow + cyan → green as it's mixed (two-part epoxy only hardens once mixed)
      const k = Math.min(1, stirs / 3);
      const r = Math.round(255 + (123 - 255) * k);
      const gg = Math.round(209 + (224 - 209) * k);
      const bb = Math.round(102 + (160 - 102) * k);
      blob.setAttribute('fill', got.b ? `rgb(${r},${gg},${bb})` : '#ffd166');
    };
    const add = (which, el) => {
      if (got[which]) return;
      if (which === 'b' && !got.a) {
        sfx.miss();
        announce('Start with glue A.');
        return;
      }
      got[which] = true;
      el.classList.add('is-used');
      sfx.bubble();
      blob.setAttribute('rx', got.b ? 44 : 30);
      blob.setAttribute('ry', got.b ? 16 : 11);
      color();
      if (got.b) {
        stir.style.display = '';
        stir.focus();
      } else b.focus();
    };
    onActivate(a, () => add('a', a));
    onActivate(b, () => add('b', b));
    onActivate(stir, () => {
      if (!got.b || stirs >= 3) return;
      stirs++;
      sfx.bubble();
      blob.style.transform = `rotate(${stirs * 25}deg)`;
      color();
      if (stirs >= 3) {
        onTip?.('mix');
        setTimeout(() => setStep(2), 900);
      }
    });
    a.focus();
  }

  function showPress() {
    doEl.innerHTML = '<b>3.</b> <b>Press and hold</b> the glue patch on the hole.';
    announce('Step 3: press and hold the glue patch on the hole. Or hold Space.');
    const patch = svgEl('g', { class: 'lf-tool lf-gauze', tabindex: 0, role: 'button', 'aria-label': 'Glue patch on the hole. Press and hold' }, layer);
    svgEl('rect', { x: HX - 46, y: HY - 38, width: 92, height: 76, rx: 12, class: 'lf-gauze-rect' }, patch);
    for (let i = 0; i < 4; i++) svgEl('line', { x1: HX - 38, y1: HY - 24 + i * 16, x2: HX + 38, y2: HY - 24 + i * 16, stroke: '#c9d4e8', 'stroke-width': 2 }, patch);
    const ring = svgEl('circle', { cx: HX, cy: HY, r: 62, class: 'lf-hold-ring', 'stroke-dasharray': `${2 * Math.PI * 62}`, 'stroke-dashoffset': `${2 * Math.PI * 62}` }, layer);
    const down = (e) => {
      e?.preventDefault?.();
      holding = true;
      patch.classList.add('is-held');
    };
    const up = () => {
      holding = false;
      patch.classList.remove('is-held');
    };
    patch.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    patch.addEventListener('pointerleave', up);
    patch.focus();
    pressBits = { ring, patch, up };
  }
  let pressBits = null;

  function showCheck() {
    window.removeEventListener('pointerup', pressBits?.up);
    doEl.innerHTML = '<b>4.</b> Wait while the glue hardens. Watch the needle…';
    announce('Step 4: wait while the glue hardens and watch the pressure needle.');
    hole.air.style.display = 'none';
    seep?.remove();
    svgEl('rect', { x: HX - 46, y: HY - 38, width: 92, height: 76, rx: 12, class: 'lf-gauze-rect is-set' }, layer);
    const cx = 528;
    const cy = 150;
    svgEl('circle', { cx, cy, r: 62, fill: '#0d1531', stroke: INK, 'stroke-width': 4 }, layer);
    svgEl('path', { d: `M${cx - 48} ${cy + 16} A50 50 0 0 1 ${cx + 48} ${cy + 16}`, fill: 'none', stroke: '#7be0a0', 'stroke-width': 9 }, layer);
    svgEl('line', { x1: cx, y1: cy, x2: cx, y2: cy - 48, stroke: '#ffc94a', 'stroke-width': 6, 'stroke-linecap': 'round', class: 'lf-steady-needle' }, layer);
    svgEl('circle', { cx, cy, r: 8, fill: '#ffc94a' }, layer);
    svgEl('text', { x: cx, y: cy + 92, 'text-anchor': 'middle', class: 'lf-label' }, layer).textContent = 'Cabin pressure';
    svgEl('text', { x: cx, y: cy + 116, 'text-anchor': 'middle', class: 'lf-fast-svg' }, layer).textContent = '⏩ sped up';
    checkT = 0;
  }

  const stop = animLoop((dt) => {
    const id = PATCH_STEPS[step]?.id;
    if (id === 'press' && pressBits) {
      holdT = holding ? holdT + dt : Math.max(0, holdT - dt * 0.6);
      const k = Math.min(1, holdT / 1.6);
      const len = 2 * Math.PI * 62;
      pressBits.ring.setAttribute('stroke-dashoffset', `${len * (1 - k)}`);
      if (holding && Math.random() < dt * 6) sfx.tick();
      if (k >= 1) {
        holding = false;
        sfx.success();
        onTip?.('press');
        pressBits.patch.classList.add('is-set');
        const next = 3;
        pressBits = { ...pressBits, ring: { setAttribute() {} } };
        setTimeout(() => setStep(next), 900);
        holdT = -999; // done
      }
    } else if (id === 'check') {
      checkT += dt;
      if (checkT > 2.4 && checkT < 100) {
        checkT = 1000;
        sfx.success();
        onTip?.('check');
        chips.forEach((c) => c.classList.add('is-done'));
        doEl.innerHTML = '<b>Sealed!</b> The needle stays still: no more leak.';
        announce('Sealed! The needle stays still: no more leak.');
        setTimeout(() => onComplete({ seconds: (performance.now() - start) / 1000 }), 1200);
      }
    }
  });

  // holding Space presses the patch too (keyup isn't routed through the instance manager)
  const onKeyUp = (e) => {
    if (e.code !== 'Space') return;
    holding = false;
    pressBits?.patch.classList.remove('is-held');
  };
  window.addEventListener('keyup', onKeyUp);
  setStep(0);
  return {
    onKey(e) {
      if (PATCH_STEPS[step]?.id !== 'press' || e.code !== 'Space') return false;
      e.preventDefault();
      holding = true;
      pressBits?.patch.classList.add('is-held');
      return true;
    },
    destroy() {
      stop();
      window.removeEventListener('keyup', onKeyUp);
      if (pressBits?.up) window.removeEventListener('pointerup', pressBits.up);
      root.remove();
    },
  };
}
