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
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }

  function atom(x, y, r, color, label) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.stroke();
    ctx.fillStyle = '#10182c';
    ctx.font = `700 ${Math.round(r * 1.05)}px Fredoka, Nunito, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + 1);
  }

  // H–O–H bond angle ≈ 104.5°, so each H sits 52.25° either side of "down".
  const HALF_ANGLE = (104.5 / 2) * (Math.PI / 180);
  function water(m) {
    const d = 30;
    for (const side of [-1, 1]) {
      const a = m.rot + Math.PI / 2 + side * HALF_ANGLE;
      const hx = m.x + Math.cos(a) * d;
      const hy = m.y + Math.sin(a) * d;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      atom(hx, hy, 14, COLORS.h, 'H');
    }
    atom(m.x, m.y, 22, COLORS.o, 'O');
  }

  function pair(x, y, color, label, r) {
    atom(x - r * 0.7, y, r, color, label);
    atom(x + r * 0.7, y, r, color, label);
  }

  function tube(x, count, color, label, sign, gasName) {
    // glass
    roundRect(x, TUBE.y0, TUBE.w, TUBE.y1 - TUBE.y0, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.stroke();
    // gas level
    const top = tubeLevelY(count);
    if (count > 0) {
      ctx.save();
      roundRect(x + 6, top, TUBE.w - 12, TUBE.y1 - 6 - top, 12);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.55;
      ctx.fill();
      ctx.restore();
    }
    // labels
    ctx.fillStyle = COLORS.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = '700 26px Fredoka, Nunito, sans-serif';
    ctx.fillText(label, x + TUBE.w / 2, TUBE.y0 - 26);
    ctx.font = '600 18px Nunito, sans-serif';
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(gasName, x + TUBE.w / 2, TUBE.y0 - 6);
    ctx.font = '700 22px Fredoka, Nunito, sans-serif';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(`${count}`, x + TUBE.w / 2, TUBE.y1 + 24);
    // electrode sign
    ctx.font = '700 30px Fredoka, Nunito, sans-serif';
    ctx.fillStyle = sign === '+' ? '#ffb547' : '#9ad7ff';
    ctx.fillText(sign, sign === '+' ? CELL.x1 + 14 : CELL.x0 - 14, CELL.y0 - 10);
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // water cell
    roundRect(CELL.x0, CELL.y0, CELL.x1 - CELL.x0, CELL.y1 - CELL.y0, 22);
    ctx.fillStyle = COLORS.water;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = COLORS.waterEdge;
    ctx.stroke();

    // electrodes (metal plates on each side)
    ctx.fillStyle = '#9aa3b5';
    roundRect(CELL.x0 + 6, CELL.y0 + 16, 10, CELL.y1 - CELL.y0 - 32, 4);
    ctx.fill();
    roundRect(CELL.x1 - 16, CELL.y0 + 16, 10, CELL.y1 - CELL.y0 - 32, 4);
    ctx.fill();

    // battery + wires (top centre)
    const bx = W / 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx - 40, 40);
    ctx.lineTo(CELL.x0 + 11, 40);
    ctx.lineTo(CELL.x0 + 11, CELL.y0 + 16);
    ctx.moveTo(bx + 40, 40);
    ctx.lineTo(CELL.x1 - 11, 40);
    ctx.lineTo(CELL.x1 - 11, CELL.y0 + 16);
    ctx.stroke();
    roundRect(bx - 40, 24, 80, 32, 8);
    ctx.fillStyle = '#7be0a0';
    ctx.fill();
    ctx.fillStyle = '#04202a';
    ctx.font = '700 16px Fredoka, Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('POWER', bx, 41);

    // zap zone (Space bar)
    const glow = calm ? 0.5 : 0.5 + 0.5 * Math.sin(s.t * 4);
    ctx.fillStyle = COLORS.zone;
    ctx.fillRect(ZONE.x0, CELL.y0 + 4, ZONE.x1 - ZONE.x0, CELL.y1 - CELL.y0 - 8);
    ctx.strokeStyle = COLORS.zoneEdge;
    ctx.globalAlpha = 0.4 + 0.6 * glow;
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(ZONE.x0, CELL.y0 + 4, ZONE.x1 - ZONE.x0, CELL.y1 - CELL.y0 - 8);
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = COLORS.muted;
    ctx.font = '600 16px Nunito, sans-serif';
    ctx.fillText('Space zone', (ZONE.x0 + ZONE.x1) / 2, CELL.y1 - 18);

    // tubes
    tube(TUBE_H.x, s.hInTube, COLORS.hGas, 'H₂', '−', 'hydrogen');
    tube(TUBE_O.x, s.oInTube, COLORS.oGas, 'O₂', '+', 'oxygen');

    // molecules
    for (const m of s.molecules) water(m);

    // waiting O atom
    if (s.waitingO) {
      atom(WAIT_O.x, WAIT_O.y, 18, COLORS.o, 'O');
      ctx.fillStyle = COLORS.muted;
      ctx.font = '600 15px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('needs a partner', WAIT_O.x - 30, WAIT_O.y + 34);
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
      ctx.globalAlpha = 1 - b.t / 0.22;
      ctx.strokeStyle = COLORS.bolt;
      ctx.lineWidth = 4;
      for (const ex of [CELL.x0 + 16, CELL.x1 - 16]) {
        ctx.beginPath();
        ctx.moveTo(ex, b.y);
        const steps = 5;
        for (let i = 1; i <= steps; i++) {
          const x = lerp(ex, b.x, i / steps);
          const jitter = i === steps || calm ? 0 : (Math.random() - 0.5) * 24;
          ctx.lineTo(x, b.y + jitter);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // miss sparks (heat)
    for (const sp of s.sparks) {
      ctx.globalAlpha = 1 - sp.t / 0.5;
      ctx.fillStyle = '#ff7a59';
      ctx.font = '700 28px Fredoka, Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('~heat~', sp.x, sp.y - sp.t * 40);
      ctx.globalAlpha = 1;
    }

    // HUD: progress + combo
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = COLORS.text;
    ctx.font = '700 22px Fredoka, Nunito, sans-serif';
    ctx.fillText(`Split: ${s.hits} / ${zaps}`, CELL.x0 + 24, CELL.y0 + 36);
    if (s.combo >= 2 && s.t - s.lastHitAt < ELECTROLYSIS.COMBO_WINDOW_SECONDS) {
      ctx.fillStyle = '#ffb547';
      ctx.textAlign = 'right';
      ctx.fillText(`Combo x${s.combo}!`, CELL.x1 - 24, CELL.y0 + 36);
    }

    // pop message
    if (s.pop) {
      const a = Math.min(1, s.pop.t * 4, (POP_SECONDS - s.pop.t) * 2);
      ctx.globalAlpha = Math.max(0, a);
      ctx.font = '700 22px Fredoka, Nunito, sans-serif';
      const w = Math.min(CELL.x1 - CELL.x0 - 20, ctx.measureText(s.pop.text).width + 40);
      roundRect(W / 2 - w / 2, CELL.y0 + 54, w, 44, 14);
      ctx.fillStyle = 'rgba(10,16,32,0.92)';
      ctx.fill();
      ctx.strokeStyle = '#4fd1e8';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.pop.text, W / 2, CELL.y0 + 77, w - 20);
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
