// game.js — the Molecule Zapper arcade round (Canvas 2D).
//
// Science shown (nothing false, details left out):
//  - a water molecule is bent: 1 O in the middle, 2 H at ~104.5° (drawn to scale-ish);
//  - zapping one H₂O gives 1 H₂ (to the − side) and 1 O atom; two O atoms team up as O₂
//    (to the + side). So 2 H₂O → 2 H₂ + O₂, and the H₂ tube fills twice as fast.
//  - Left out: in a real cell the water reacts at the electrode surfaces (with ions moving
//    through the water/membrane). Here the zap bolt comes from the electrodes.
import { ELECTROLYSIS } from '../../config/gameplay.js';
import { sfx } from '../../ui/sfx.js';
import { TEXT } from './content.js';

// Logical canvas size (scaled with CSS); all layout in these units.
const W = 880;
const H = 480;
const CELL = { x0: 160, x1: 720, y0: 120, y1: 450 }; // water area
const ZONE = { x0: 380, x1: 500 }; // glowing Space-bar zap zone
const TUBE = { w: 84, y0: 60, y1: 450 };
const TUBE_H = { x: 40 }; // hydrogen tube (− side, left)
const TUBE_O = { x: W - 40 - TUBE.w }; // oxygen tube (+ side, right)
const WAIT_O = { x: CELL.x1 - 46, y: CELL.y0 + 60 }; // O atom waiting for a partner
const HIT_RADIUS = 36; // logical px; at least 44 CSS px wide is enforced below
const FLY_SECONDS = 0.7;
const POP_SECONDS = 3;
const COLORS = {
  water: 'rgba(79, 209, 232, 0.16)',
  waterEdge: 'rgba(79, 209, 232, 0.55)',
  zone: 'rgba(255, 230, 120, 0.13)',
  zoneEdge: 'rgba(255, 230, 120, 0.6)',
  o: '#ff6b6b',
  h: '#f2f5ff',
  bolt: '#fff59d',
  text: '#ffffff',
  muted: '#c9d4e8',
  hGas: '#f2f5ff',
  oGas: '#4fd1e8',
};

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => 1 - (1 - t) * (1 - t);

/**
 * @param {object} p
 * @param {HTMLCanvasElement} p.canvas
 * @param {number} p.zaps           how many molecules to split (even)
 * @param {(msg:string)=>void} p.announce   screen-reader/status line
 * @param {(r:{hits:number,misses:number,seconds:number,maxCombo:number})=>void} p.onComplete
 */
export function createZapperGame({ canvas, zaps, announce, onComplete }) {
  const ctx = canvas.getContext('2d');
  const calm = reducedMotion();
  let dpr = 1;

  const s = {
    t: 0,
    hits: 0,
    misses: 0,
    hInTube: 0,
    oInTube: 0,
    hSent: 0, // gas already flying to a tube (so each flyer aims at its own level)
    oSent: 0,
    combo: 0,
    maxCombo: 0,
    lastHitAt: -99,
    spawnIn: 0,
    molecules: [],
    flyers: [], // {kind:'H2'|'O'|'O2', x0,y0,x1,y1,t,dur, then}
    waitingO: false,
    bolts: [], // {x,y,t}
    sparks: [], // misses {x,y,t}
    pop: null, // {text,t}
    shownWhy: false,
    shownHeat: false,
    shownPair: false,
    finished: false,
    destroyed: false,
    raf: 0,
    last: 0,
  };

  // ---------------------------------------------------------------- sizing
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }
  resize();
  window.addEventListener('resize', resize);

  // ---------------------------------------------------------------- molecules
  function spawnMolecule() {
    const fromLeft = Math.random() < 0.5;
    s.molecules.push({
      x: fromLeft ? CELL.x0 + 40 : CELL.x1 - 40,
      y: lerp(CELL.y0 + 60, CELL.y1 - 40, Math.random()),
      vx: (fromLeft ? 1 : -1) * ELECTROLYSIS.MOLECULE_SPEED_PX * lerp(0.7, 1.2, Math.random()),
      vy: lerp(-25, 25, Math.random()),
      rot: Math.random() * Math.PI * 2,
      vrot: calm ? 0 : lerp(-1.2, 1.2, Math.random()),
    });
  }

  function moleculesLeftToZap() {
    return zaps - s.hits;
  }

  function stepMolecules(dt) {
    // keep enough molecules on screen, but never more than are still needed
    s.spawnIn -= dt;
    const wanted = Math.min(ELECTROLYSIS.MAX_MOLECULES, moleculesLeftToZap());
    if (s.molecules.length < wanted && s.spawnIn <= 0) {
      spawnMolecule();
      s.spawnIn = ELECTROLYSIS.SPAWN_SECONDS;
    }
    for (const m of s.molecules) {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.rot += m.vrot * dt;
      if (m.x < CELL.x0 + 30 || m.x > CELL.x1 - 30) m.vx *= -1;
      if (m.y < CELL.y0 + 30 || m.y > CELL.y1 - 30) m.vy *= -1;
      m.x = Math.max(CELL.x0 + 30, Math.min(CELL.x1 - 30, m.x));
      m.y = Math.max(CELL.y0 + 30, Math.min(CELL.y1 - 30, m.y));
    }
  }

  // ---------------------------------------------------------------- gas levels
  const tubeLevelY = (count) => TUBE.y1 - 8 - (count / zaps) * (TUBE.y1 - TUBE.y0 - 16);

  function fly(kind, x0, y0, x1, y1, then) {
    s.flyers.push({ kind, x0, y0, x1, y1, t: 0, dur: FLY_SECONDS, then });
  }

  function arriveH2() {
    s.hInTube++;
    sfx.bubble();
  }
  function arriveO2() {
    s.oInTube++;
    sfx.bubble();
    if (!s.shownWhy && s.oInTube >= 2) {
      s.shownWhy = true;
      showPop(TEXT.whyPop);
    }
  }
  function arriveO() {
    if (s.waitingO) {
      // two O atoms team up → O₂ heads for the + tube
      s.waitingO = false;
      if (!s.shownPair) {
        s.shownPair = true;
        showPop(TEXT.oxygenPair);
      }
      sfx.pop();
      s.oSent++;
      fly('O2', WAIT_O.x, WAIT_O.y, TUBE_O.x + TUBE.w / 2, tubeLevelY(s.oSent), arriveO2);
    } else {
      s.waitingO = true;
    }
  }

  // ---------------------------------------------------------------- zapping
  function zap(m) {
    s.molecules.splice(s.molecules.indexOf(m), 1);
    s.hits++;
    s.combo = s.t - s.lastHitAt <= ELECTROLYSIS.COMBO_WINDOW_SECONDS ? s.combo + 1 : 1;
    s.maxCombo = Math.max(s.maxCombo, s.combo);
    s.lastHitAt = s.t;
    s.bolts.push({ x: m.x, y: m.y, t: 0 });
    sfx.zap(s.combo);
    // 2 H → one H₂ to the − tube; the O goes to wait for a partner near the + plate
    s.hSent++;
    fly('H2', m.x, m.y, TUBE_H.x + TUBE.w / 2, tubeLevelY(s.hSent), arriveH2);
    fly('O', m.x, m.y, WAIT_O.x, WAIT_O.y, arriveO);
    announce(`Split ${s.hits} of ${zaps} water molecules`);
  }

  function miss(x, y) {
    s.misses++;
    s.combo = 0;
    s.sparks.push({ x, y, t: 0 });
    sfx.miss();
    if (!s.shownHeat) {
      s.shownHeat = true;
      showPop(TEXT.heatPop);
    }
  }

  function showPop(text) {
    s.pop = { text, t: 0 };
    announce(text);
  }

  function canZap() {
    return !s.finished && s.hits < zaps;
  }

  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height, scale: r.width / W };
  }

  function onPointerDown(e) {
    if (!canZap()) return;
    e.preventDefault();
    const p = toLogical(e);
    // touch targets ≥ 44 CSS px: grow the logical hit radius when the canvas is drawn small
    const radius = Math.max(HIT_RADIUS, 22 / Math.max(p.scale, 0.01));
    let best = null;
    let bestD = Infinity;
    for (const m of s.molecules) {
      const d = Math.hypot(m.x - p.x, m.y - p.y);
      if (d < radius && d < bestD) {
        best = m;
        bestD = d;
      }
    }
    if (best) zap(best);
    else if (p.x > CELL.x0 && p.x < CELL.x1 && p.y > CELL.y0 && p.y < CELL.y1) miss(p.x, p.y);
  }
  canvas.addEventListener('pointerdown', onPointerDown);

  /** Space bar: zap the molecule in the glowing zone that is closest to its centre. */
  function zapInZone() {
    if (!canZap()) return;
    const cx = (ZONE.x0 + ZONE.x1) / 2;
    const inZone = s.molecules.filter((m) => m.x >= ZONE.x0 - 20 && m.x <= ZONE.x1 + 20);
    if (!inZone.length) {
      miss(cx, (CELL.y0 + CELL.y1) / 2);
      return;
    }
    inZone.sort((a, b) => Math.abs(a.x - cx) - Math.abs(b.x - cx));
    zap(inZone[0]);
  }

  // ---------------------------------------------------------------- loop
  function step(dt) {
    s.t += dt;
    stepMolecules(dt);
    for (const b of deco) {
      b.y -= b.v * dt;
      if (b.y < CELL.y0 + 14) b.y = CELL.y1 - 6;
    }
    for (const f of s.flyers) f.t += dt;
    const landed = s.flyers.filter((f) => f.t >= f.dur);
    s.flyers = s.flyers.filter((f) => f.t < f.dur);
    for (const f of landed) f.then();
    for (const b of s.bolts) b.t += dt;
    s.bolts = s.bolts.filter((b) => b.t < 0.22);
    for (const sp of s.sparks) sp.t += dt;
    s.sparks = s.sparks.filter((sp) => sp.t < 0.5);
    if (s.pop) {
      s.pop.t += dt;
      if (s.pop.t > POP_SECONDS) s.pop = null;
    }
    if (!s.finished && s.hits >= zaps && s.flyers.length === 0 && !s.waitingO) {
      s.finished = true;
      sfx.success();
      // short beat so the kid sees the full tubes
      setTimeout(
        () => !s.destroyed && onComplete({ hits: s.hits, misses: s.misses, seconds: s.t, maxCombo: s.maxCombo }),
        calm ? 300 : 900,
      );
    }
  }

  function frame(now) {
    const dt = Math.min(0.05, s.last ? (now - s.last) / 1000 : 0);
    s.last = now;
    step(dt);
    draw();
    s.raf = requestAnimationFrame(frame);
  }
  s.raf = requestAnimationFrame(frame);

  // ---------------------------------------------------------------- drawing
  const INK = '#10182c';
  const FONT = (w, px) => `${w} ${px}px Fredoka, Nunito, sans-serif`;
  // decorative bubbles drifting up through the water (pure decoration, not gas output)
  const deco = Array.from({ length: calm ? 0 : 14 }, () => ({
    x: lerp(CELL.x0 + 30, CELL.x1 - 30, Math.random()),
    y: lerp(CELL.y0, CELL.y1, Math.random()),
    r: lerp(2, 5, Math.random()),
    v: lerp(12, 30, Math.random()),
  }));

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  function atom(x, y, r, color, label, glow = false) {
    if (glow) {
      ctx.save();
      ctx.shadowColor = 'rgba(255, 230, 120, 0.95)';
      ctx.shadowBlur = 18;
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    if (glow) ctx.restore();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    // little shine so atoms look like shiny toy balls
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.38, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.font = FONT(700, Math.round(r * 1.05));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + 2);
  }

  const inZone = (m) => m.x >= ZONE.x0 - 20 && m.x <= ZONE.x1 + 20;

  // H–O–H bond angle ≈ 104.5°, so each H sits 52.25° either side of "down".
  const HALF_ANGLE = (104.5 / 2) * (Math.PI / 180);
  function water(m) {
    const d = 30;
    const glow = inZone(m);
    for (const side of [-1, 1]) {
      const a = m.rot + Math.PI / 2 + side * HALF_ANGLE;
      const hx = m.x + Math.cos(a) * d;
      const hy = m.y + Math.sin(a) * d;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      ctx.strokeStyle = '#e8eefb';
      ctx.lineWidth = 4;
      ctx.stroke();
      atom(hx, hy, 14, COLORS.h, 'H', glow);
    }
    atom(m.x, m.y, 22, COLORS.o, 'O', glow);
  }

  function pair(x, y, color, label, r) {
    atom(x - r * 0.7, y, r, color, label);
    atom(x + r * 0.7, y, r, color, label);
  }

  function badge(x, y, r, fill, text, textColor = INK) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.font = FONT(700, Math.round(r * 1.25));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 1);
  }

  function tube(x, count, gas, label, gasName) {
    const w = TUBE.w;
    // glass body
    roundRect(x, TUBE.y0, w, TUBE.y1 - TUBE.y0, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();
    // gas level (fills from the bottom)
    const top = tubeLevelY(count);
    if (count > 0) {
      ctx.save();
      roundRect(x + 7, top, w - 14, TUBE.y1 - 7 - top, 15);
      ctx.clip();
      const g = ctx.createLinearGradient(x, top, x + w, top);
      g.addColorStop(0, gas[0]);
      g.addColorStop(1, gas[1]);
      ctx.fillStyle = g;
      ctx.fillRect(x, top, w, TUBE.y1 - top);
      // fizzing bubbles inside the gas
      if (!calm) {
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        for (let i = 0; i < 6; i++) {
          const by = TUBE.y1 - (((s.t * 40 + i * 53) % (TUBE.y1 - top)) || 0);
          ctx.beginPath();
          ctx.arc(x + 18 + ((i * 19) % (w - 36)), by, 3 + (i % 3), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    // measuring ticks
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    for (let i = 1; i < 10; i++) {
      const ty = TUBE.y1 - 8 - (i / 10) * (TUBE.y1 - TUBE.y0 - 16);
      ctx.beginPath();
      ctx.moveTo(x + w - 8, ty);
      ctx.lineTo(x + w - (i % 5 === 0 ? 24 : 16), ty);
      ctx.stroke();
    }
    // glass outline + highlight
    roundRect(x, TUBE.y0, w, TUBE.y1 - TUBE.y0, 22);
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.stroke();
    roundRect(x + 2, TUBE.y0 + 2, w - 4, TUBE.y1 - TUBE.y0 - 4, 20);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(x + 10, TUBE.y0 + 14, 7, TUBE.y1 - TUBE.y0 - 40, 4);
    ctx.fill();
    // name tag on top
    roundRect(x - 6, TUBE.y0 - 50, w + 12, 44, 14);
    ctx.fillStyle = gas[1];
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = FONT(700, 22);
    ctx.fillText(label, x + w / 2, TUBE.y0 - 36);
    ctx.font = FONT(600, 14);
    ctx.fillText(gasName, x + w / 2, TUBE.y0 - 17);
    // count bubble
    badge(x + w / 2, TUBE.y1 + 2, 17, '#f6f8ff', `${count}`);
  }

  function battery(cx, cy) {
    roundRect(cx - 62, cy - 18, 116, 36, 9);
    ctx.fillStyle = '#7be0a0';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    roundRect(cx + 54, cy - 8, 8, 16, 3);
    ctx.fillStyle = INK;
    ctx.fill();
    // bolt
    ctx.beginPath();
    ctx.moveTo(cx - 30, cy - 13);
    ctx.lineTo(cx - 42, cy + 3);
    ctx.lineTo(cx - 32, cy + 3);
    ctx.lineTo(cx - 36, cy + 14);
    ctx.lineTo(cx - 20, cy - 4);
    ctx.lineTo(cx - 29, cy - 4);
    ctx.closePath();
    ctx.fillStyle = '#ffd43b';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = FONT(700, 13);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('POWER', cx - 4, cy + 1);
  }

  function burst(x, y, r, spikes, color) {
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 ? r * 0.62 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // lab-screen backdrop: soft grid
    ctx.strokeStyle = 'rgba(79, 209, 232, 0.07)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= W; gx += 40) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, H);
      ctx.stroke();
    }
    for (let gy = 0; gy <= H; gy += 40) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(W, gy);
      ctx.stroke();
    }

    // wires from the battery to the two electrodes
    const bx = W / 2;
    const by = 36;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [x, color] of [
      [CELL.x0 + 12, '#4fa8ff'],
      [CELL.x1 - 12, '#ff7a59'],
    ]) {
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(x, by);
      ctx.lineTo(x, CELL.y0 + 18);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    battery(bx, by);

    // water beaker
    roundRect(CELL.x0, CELL.y0, CELL.x1 - CELL.x0, CELL.y1 - CELL.y0, 26);
    const wg = ctx.createLinearGradient(0, CELL.y0, 0, CELL.y1);
    wg.addColorStop(0, 'rgba(79, 168, 255, 0.30)');
    wg.addColorStop(1, 'rgba(30, 80, 160, 0.45)');
    ctx.fillStyle = wg;
    ctx.fill();
    // water surface wave
    ctx.save();
    roundRect(CELL.x0, CELL.y0, CELL.x1 - CELL.x0, CELL.y1 - CELL.y0, 26);
    ctx.clip();
    ctx.beginPath();
    for (let x = CELL.x0; x <= CELL.x1; x += 10) {
      const y = CELL.y0 + 10 + Math.sin(x / 34 + (calm ? 0 : s.t * 2)) * 3;
      if (x === CELL.x0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(200, 235, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();
    // decorative bubbles
    ctx.fillStyle = 'rgba(220, 240, 255, 0.35)';
    for (const b of deco) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // zap zone (Space bar)
    const glow = calm ? 0.6 : 0.5 + 0.5 * Math.sin(s.t * 4);
    const zg = ctx.createLinearGradient(ZONE.x0, 0, ZONE.x1, 0);
    zg.addColorStop(0, 'rgba(255, 212, 59, 0)');
    zg.addColorStop(0.5, `rgba(255, 212, 59, ${0.12 + 0.12 * glow})`);
    zg.addColorStop(1, 'rgba(255, 212, 59, 0)');
    ctx.fillStyle = zg;
    ctx.fillRect(ZONE.x0, CELL.y0 + 4, ZONE.x1 - ZONE.x0, CELL.y1 - CELL.y0 - 8);
    ctx.strokeStyle = `rgba(255, 212, 59, ${0.45 + 0.5 * glow})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);
    ctx.lineDashOffset = calm ? 0 : -s.t * 30;
    ctx.beginPath();
    ctx.moveTo(ZONE.x0, CELL.y0 + 6);
    ctx.lineTo(ZONE.x0, CELL.y1 - 6);
    ctx.moveTo(ZONE.x1, CELL.y0 + 6);
    ctx.lineTo(ZONE.x1, CELL.y1 - 6);
    ctx.stroke();
    ctx.setLineDash([]);
    roundRect((ZONE.x0 + ZONE.x1) / 2 - 58, CELL.y1 - 36, 116, 28, 14);
    ctx.fillStyle = '#ffd43b';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.font = FONT(700, 15);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPACE ZONE', (ZONE.x0 + ZONE.x1) / 2, CELL.y1 - 21);

    // beaker outline + glass highlight
    roundRect(CELL.x0, CELL.y0, CELL.x1 - CELL.x0, CELL.y1 - CELL.y0, 26);
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK;
    ctx.stroke();
    roundRect(CELL.x0 + 3, CELL.y0 + 3, CELL.x1 - CELL.x0 - 6, CELL.y1 - CELL.y0 - 6, 23);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(200, 235, 255, 0.45)';
    ctx.stroke();

    // electrodes: metal plates with − and + badges
    for (const [x, sign, fill] of [
      [CELL.x0 + 6, '−', '#4fa8ff'],
      [CELL.x1 - 18, '+', '#ff7a59'],
    ]) {
      const mg = ctx.createLinearGradient(x, 0, x + 12, 0);
      mg.addColorStop(0, '#c9d4e8');
      mg.addColorStop(1, '#7b86a3');
      roundRect(x, CELL.y0 + 18, 12, CELL.y1 - CELL.y0 - 36, 5);
      ctx.fillStyle = mg;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = INK;
      ctx.stroke();
      badge(x + 6, CELL.y0 + 18, 15, fill, sign);
    }

    // tubes
    tube(TUBE_H.x, s.hInTube, ['#ffffff', '#dfe6f2'], 'H₂', 'hydrogen');
    tube(TUBE_O.x, s.oInTube, ['#8fe6f5', '#4fd1e8'], 'O₂', 'oxygen');

    // progress pips: one per molecule to split
    const pipW = Math.min(22, (CELL.x1 - CELL.x0 - 200) / zaps);
    const pipsX = CELL.x0 + 32;
    ctx.fillStyle = '#ffffff';
    ctx.font = FONT(700, 18);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${s.hits}/${zaps}`, pipsX, CELL.y0 + 32);
    for (let i = 0; i < zaps; i++) {
      roundRect(pipsX + 52 + i * pipW, CELL.y0 + 24, pipW - 4, 16, 6);
      ctx.fillStyle = i < s.hits ? '#ffd43b' : 'rgba(255,255,255,0.18)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
    }

    // molecules
    for (const m of s.molecules) water(m);

    // waiting O atom
    if (s.waitingO) {
      atom(WAIT_O.x, WAIT_O.y, 18, COLORS.o, 'O');
      roundRect(WAIT_O.x - 120, WAIT_O.y + 26, 132, 26, 13);
      ctx.fillStyle = '#f6f8ff';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.font = FONT(600, 14);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('needs a partner!', WAIT_O.x - 54, WAIT_O.y + 40);
    }

    // flying atoms / gas molecules
    for (const f of s.flyers) {
      const k = ease(Math.min(1, f.t / f.dur));
      const x = lerp(f.x0, f.x1, k);
      const y = lerp(f.y0, f.y1, k) - (calm ? 0 : Math.sin(k * Math.PI) * 30);
      if (f.kind === 'H2') pair(x, y, COLORS.h, 'H', 12);
      else if (f.kind === 'O2') pair(x, y, COLORS.o, 'O', 16);
      else atom(x, y, 18, COLORS.o, 'O');
    }

    // zap bolts from both electrodes to the molecule
    for (const b of s.bolts) {
      const a = 1 - b.t / 0.22;
      ctx.globalAlpha = a;
      for (const ex of [CELL.x0 + 18, CELL.x1 - 18]) {
        ctx.beginPath();
        ctx.moveTo(ex, b.y);
        const steps = 6;
        for (let i = 1; i <= steps; i++) {
          const x = lerp(ex, b.x, i / steps);
          const jitter = i === steps || calm ? 0 : (Math.random() - 0.5) * 26;
          ctx.lineTo(x, b.y + jitter);
        }
        ctx.strokeStyle = INK;
        ctx.lineWidth = 8;
        ctx.stroke();
        ctx.strokeStyle = COLORS.bolt;
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      if (!calm) burst(b.x, b.y, 30 + b.t * 80, 8, 'rgba(255, 245, 157, 0.85)');
      ctx.globalAlpha = 1;
    }

    // miss puffs (electricity → heat)
    for (const sp of s.sparks) {
      ctx.globalAlpha = 1 - sp.t / 0.5;
      const y = sp.y - sp.t * 40;
      roundRect(sp.x - 38, y - 16, 76, 32, 16);
      ctx.fillStyle = '#ff7a59';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.font = FONT(700, 17);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('heat!', sp.x, y + 1);
      ctx.globalAlpha = 1;
    }

    // combo burst
    if (s.combo >= 2 && s.t - s.lastHitAt < ELECTROLYSIS.COMBO_WINDOW_SECONDS) {
      const k = Math.min(1, (s.t - s.lastHitAt) * 6);
      const r = 46 * (calm ? 1 : 0.7 + 0.3 * k);
      const cx = CELL.x1 - 70;
      const cy = CELL.y0 + 70;
      burst(cx, cy, r, 10, '#ffb547');
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = FONT(700, 14);
      ctx.fillText('COMBO', cx, cy - 9);
      ctx.font = FONT(700, 24);
      ctx.fillText(`x${s.combo}`, cx, cy + 11);
    }

    // pop message (comic bubble, bottom of the beaker so it never covers the tubes)
    if (s.pop) {
      const a = Math.min(1, s.pop.t * 4, (POP_SECONDS - s.pop.t) * 2);
      ctx.globalAlpha = Math.max(0, a);
      ctx.font = FONT(700, 20);
      const maxW = CELL.x1 - CELL.x0 - 30;
      const w = Math.min(maxW, ctx.measureText(s.pop.text).width + 44);
      const py = CELL.y1 - 92;
      roundRect(W / 2 - w / 2, py, w, 44, 18);
      ctx.fillStyle = '#f6f8ff';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.pop.text, W / 2, py + 23, w - 24);
      ctx.globalAlpha = 1;
    }
  }

  return {
    zapInZone,
    destroy() {
      s.destroyed = true;
      cancelAnimationFrame(s.raf);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', onPointerDown);
    },
  };
}
