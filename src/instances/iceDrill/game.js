// game.js — the Ice Drill arcade round (Canvas 2D, side view of the crater floor).
//
// Science shown (nothing false, details left out):
//  - the crater floor is Moon soil (regolith) with grains of water ice mixed into it — not
//    blocks of clear ice; we draw the icy soil as blue sparkly chunks;
//  - rocks are buried in the regolith and are hard to drill through.
//  - the SCANNER: hydrogen in ice can be "sniffed" from a distance — NASA's neutron
//    spectrometers (Lunar Prospector, LRO) found extra hydrogen at the poles this way. Our
//    scanner shows hidden ice under the soil for a few seconds.
// Left out: real ice drills (like NASA's TRIDENT drill) bring soil up in steps; the depth
// and the amounts here are game-sized.
import { ICE } from '../../config/gameplay.js';
import { sfx } from '../../ui/sfx.js';

const W = 880;
const H = 480;
const DRILL_Y = 150; // the drill head stays here; the ground scrolls up
const SPEED = 70; // px per second downward — GAME BALANCE (not real data)
const BOOST = 1.9; // speed × while boosting
const STEER = 340; // px per second sideways
const STALL_S = 0.7; // a rock bump stops you this long
const TIP_R = 20;
const MARGIN = 70;
const SEE_AHEAD = 150; // px below the drill you can see; deeper things are hidden in the soil

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * @param {object} p
 * @param {HTMLCanvasElement} p.canvas
 * @param {number} p.maxChunks   how many chunks fit in the bag (round ends early when full)
 * @param {(msg:string)=>void} p.announce
 * @param {(r:{chunks:number,bumps:number,boostSeconds:number,bagFull:boolean,bestStreak:number,megas:number,scansUsed:number})=>void} p.onComplete
 */
export function createDrillGame({ canvas, maxChunks, announce, onComplete }) {
  const ctx = canvas.getContext('2d');
  const calm = reducedMotion();
  canvas.width = W;
  canvas.height = H;

  const s = {
    t: 0,
    x: W / 2,
    depth: 0, // px drilled so far
    stall: 0,
    shake: 0,
    chunks: 0,
    bumps: 0,
    boostSeconds: 0,
    streak: 0,
    bestStreak: 0,
    megas: 0,
    scans: ICE.SCAN_CHARGES,
    scanT: 0, // seconds of scan left
    scanAge: 9, // seconds since the last scan started (for the wave ring)
    bursts: [], // ice-crunch particles { x, y, vx, vy, t }
    items: [], // { x, y (world px), kind: 'ice' | 'rock', r, got }
    pops: [], // { x, y, t, text }
    nextRow: 0,
    left: false,
    right: false,
    boost: false,
    mouseX: null,
    finished: false,
    raf: 0,
    last: 0,
  };
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // rows of buried things, generated ahead of the drill
  function fillRows(untilY) {
    while (s.nextRow < untilY) {
      const y = s.nextRow + 260; // first things appear below the surface
      const icy = y > 340; // a little dry soil at the very top, icy soil below
      const n = 1 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i++) {
        const x = MARGIN + rand() * (W - MARGIN * 2);
        const isIce = icy && rand() < 0.62;
        const mega = isIce && rand() < 0.08; // a rare big lump of icy soil
        s.items.push({ x, y: y + rand() * 40, kind: isIce ? 'ice' : 'rock', mega, r: mega ? 30 : isIce ? 16 + rand() * 6 : 22 + rand() * 12, got: false });
      }
      s.nextRow += 95;
    }
    s.items = s.items.filter((it) => it.y - s.depth > -80); // forget what scrolled away
  }

  function step(dt) {
    if (s.finished) return;
    s.t += dt;
    // steering: keys, or follow the mouse
    let vx = (s.right ? 1 : 0) - (s.left ? 1 : 0);
    if (s.mouseX !== null && vx === 0) vx = Math.max(-1, Math.min(1, (s.mouseX - s.x) / 60));
    s.x = Math.max(MARGIN - 30, Math.min(W - MARGIN + 30, s.x + vx * STEER * dt));
    if (s.stall > 0) s.stall -= dt;
    else {
      const v = SPEED * (s.boost ? BOOST : 1);
      if (s.boost) s.boostSeconds += dt;
      s.depth += v * dt;
    }
    s.shake = Math.max(0, s.shake - dt);
    s.scanT = Math.max(0, s.scanT - dt);
    s.scanAge += dt;
    for (const b of s.bursts) {
      b.t += dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vy += 300 * dt;
    }
    s.bursts = s.bursts.filter((b) => b.t < 0.6);
    fillRows(s.depth + H);
    // hits (tip at DRILL_Y + 30)
    const tipY = s.depth + DRILL_Y + 30;
    for (const it of s.items) {
      if (it.got) continue;
      if (Math.hypot(it.x - s.x, it.y - tipY) > it.r + TIP_R) continue;
      it.got = true;
      if (it.kind === 'ice') {
        const worth = it.mega ? ICE.MEGA_CHUNKS : 1;
        s.chunks = Math.min(maxChunks, s.chunks + worth);
        s.streak++;
        s.bestStreak = Math.max(s.bestStreak, s.streak);
        if (it.mega) s.megas++;
        sfx.zap(s.streak); // the crunch rises in pitch as the streak grows
        sfx.pop();
        const kgText = `+${worth * ICE.SOIL_KG_PER_CHUNK} kg`;
        const text = it.mega ? `MEGA ICE! ${kgText}` : s.streak >= 3 ? `Streak ×${s.streak}! ${kgText}` : kgText;
        s.pops.push({ x: it.x, y: it.y, t: 0, text, big: it.mega || s.streak >= 3 });
        if (!calm) {
          for (let k = 0; k < (it.mega ? 22 : 10); k++) {
            const a = Math.random() * Math.PI * 2;
            const v = 80 + Math.random() * 160;
            s.bursts.push({ x: it.x, y: it.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, t: 0 });
          }
        }
        announce(it.mega ? 'Mega ice! A big lump of icy soil.' : s.streak >= 3 ? `Ice streak, ${s.streak} in a row!` : `Icy soil! ${s.chunks} chunks.`);
        if (s.chunks >= maxChunks) return finish(true);
      } else {
        s.bumps++;
        s.streak = 0;
        s.stall = STALL_S * (s.boost ? 1.6 : 1); // rushing into a rock hurts more
        s.shake = calm ? 0 : 0.3;
        sfx.miss();
        announce('Bonk! A rock. Steer around the grey rocks.');
      }
    }
    for (const p of s.pops) p.t += dt;
    s.pops = s.pops.filter((p) => p.t < 0.9);
    if (s.t >= ICE.DRILL_ROUND_S) finish(false);
  }

  function finish(bagFull) {
    if (s.finished) return;
    s.finished = true;
    draw();
    setTimeout(() => onComplete({ chunks: s.chunks, bumps: s.bumps, boostSeconds: s.boostSeconds, bagFull, bestStreak: s.bestStreak, megas: s.megas, scansUsed: ICE.SCAN_CHARGES - s.scans }), 500);
  }

  function scan() {
    if (s.finished || s.scans <= 0 || s.scanT > 0) return false;
    s.scans--;
    s.scanT = ICE.SCAN_SECONDS;
    s.scanAge = 0;
    sfx.bubble();
    sfx.bubble();
    announce('Scanning! The hidden ice glows blue for a few seconds.');
    return true;
  }

  // ---------------------------------------------------------------- drawing
  function draw() {
    ctx.save();
    ctx.clearRect(0, 0, W, H);
    if (s.shake > 0) ctx.translate((Math.random() - 0.5) * 8, 0);
    const surfaceY = 110 - s.depth; // screen y of the surface
    // black sky above the floor (no air) + soil gradient below
    ctx.fillStyle = '#02040c';
    ctx.fillRect(0, 0, W, H);
    const top = Math.max(0, surfaceY);
    const g = ctx.createLinearGradient(0, surfaceY, 0, surfaceY + 900);
    g.addColorStop(0, '#5d6274');
    g.addColorStop(0.25, '#3f4a63');
    g.addColorStop(1, '#2a3550');
    ctx.fillStyle = g;
    ctx.fillRect(0, top, W, H - top);
    // speckles in the soil (move with the ground)
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 70; i++) {
      const sx = (i * 137) % W;
      const sy = ((((i * 89) % 600) - s.depth * 1) % 600 + 600) % 600;
      if (sy > top) ctx.fillRect(sx, sy, 3, 3);
    }
    if (surfaceY > -10) {
      ctx.fillStyle = '#c9d4e8';
      ctx.font = '600 20px Fredoka, Nunito, sans-serif';
      ctx.fillText('Crater floor — no sunlight ever reaches it', 24, surfaceY - 16);
    }
    // the drill shaft from the top of the screen (or the surface) to the head
    ctx.strokeStyle = '#8b96ad';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(s.x, Math.max(0, surfaceY - 40));
    ctx.lineTo(s.x, DRILL_Y);
    ctx.stroke();
    // buried things: you only see a little way ahead; deeper things are hidden in the soil,
    // unless the scanner is on (then hidden ice glows through)
    for (const it of s.items) {
      if (it.got) continue;
      const y = it.y - s.depth;
      if (y < -40 || y > H + 40) continue;
      const hidden = y > DRILL_Y + SEE_AHEAD;
      if (hidden) {
        if (s.scanT > 0 && it.kind === 'ice') drawScanBlip(it.x, y, it.r);
        continue;
      }
      if (it.kind === 'ice') drawIce(it.x, y, it.r, it.mega);
      else drawRock(it.x, y, it.r);
    }
    // the edge of what you can see (the soil gets darker below it)
    const fogY = DRILL_Y + SEE_AHEAD;
    const fog = ctx.createLinearGradient(0, fogY - 40, 0, fogY + 20);
    fog.addColorStop(0, 'rgba(20,26,44,0)');
    fog.addColorStop(1, 'rgba(20,26,44,0.75)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, Math.max(top, fogY - 40), W, H);
    if (s.scanT > 0) {
      // hidden ice glows through the soil while scanning (drawn over the fog)
      for (const it of s.items) {
        const y = it.y - s.depth;
        if (!it.got && it.kind === 'ice' && y > DRILL_Y + SEE_AHEAD && y < H + 40) drawScanBlip(it.x, y, it.r);
      }
    }
    // scan wave
    if (s.scanAge < 0.8 && !calm) {
      ctx.strokeStyle = `rgba(111,216,255,${1 - s.scanAge / 0.8})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(s.x, DRILL_Y, 40 + s.scanAge * 600, 0, Math.PI * 2);
      ctx.stroke();
    }
    // ice crunch particles
    ctx.fillStyle = '#e6f7ff';
    for (const b of s.bursts) {
      ctx.globalAlpha = 1 - b.t / 0.6;
      ctx.fillRect(b.x - 2, b.y - s.depth - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
    // drill head (orange body + spinning bit)
    const spin = s.stall > 0 ? 0 : s.t * 18;
    ctx.fillStyle = '#ffb547';
    ctx.strokeStyle = '#10182c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(s.x - 24, DRILL_Y - 26, 48, 30, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#dfe6f5';
    ctx.beginPath();
    ctx.moveTo(s.x - 18, DRILL_Y + 4);
    ctx.lineTo(s.x + 18, DRILL_Y + 4);
    ctx.lineTo(s.x, DRILL_Y + 40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(16,24,44,0.6)';
    ctx.lineWidth = 3;
    for (let k = 0; k < 3; k++) {
      const yy = DRILL_Y + 10 + ((spin * 3 + k * 10) % 28);
      const half = 18 * (1 - (yy - DRILL_Y - 4) / 36);
      ctx.beginPath();
      ctx.moveTo(s.x - half, yy);
      ctx.lineTo(s.x + half, yy + 4);
      ctx.stroke();
    }
    if (s.boost && s.stall <= 0) {
      ctx.fillStyle = 'rgba(255,230,120,0.5)';
      for (let k = 0; k < 4; k++) ctx.fillRect(s.x - 30 + Math.random() * 60, DRILL_Y + 40 + Math.random() * 20, 4, 4);
    }
    // "+4 kg" pops
    ctx.font = '700 22px Fredoka, Nunito, sans-serif';
    ctx.textAlign = 'center';
    for (const p of s.pops) {
      ctx.globalAlpha = 1 - p.t / 0.9;
      ctx.fillStyle = p.big ? '#ffe066' : '#9fe8ff';
      ctx.font = p.big ? '700 28px Fredoka, Nunito, sans-serif' : '700 22px Fredoka, Nunito, sans-serif';
      ctx.fillText(p.text, p.x, p.y - s.depth - 20 - p.t * 40);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    // HUD: time + chunks
    const left = Math.max(0, ICE.DRILL_ROUND_S - s.t);
    pill(16, 16, `⏱ ${Math.ceil(left)} s`);
    pill(W - 236, 16, `Icy soil: ${s.chunks * ICE.SOIL_KG_PER_CHUNK} kg`);
    pill(16, H - 56, `Scan (S): ${'● '.repeat(s.scans)}${'○ '.repeat(ICE.SCAN_CHARGES - s.scans)}`.trim());
    if (s.streak >= 2) pill(W / 2 - 80, 16, `Streak ×${s.streak}`);
    // depth bar (right edge): how far this round has gone
    const f = Math.min(1, s.t / ICE.DRILL_ROUND_S);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(W - 22, 70, 8, H - 140);
    ctx.fillStyle = '#4fd1e8';
    ctx.fillRect(W - 22, 70, 8, (H - 140) * f);
    ctx.restore();
  }

  function pill(x, y, text) {
    ctx.font = '700 22px Fredoka, Nunito, sans-serif';
    const w = Math.max(120, ctx.measureText(text).width + 32);
    ctx.fillStyle = 'rgba(16,24,44,0.85)';
    ctx.strokeStyle = '#4fd1e8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x, y, w, 40, 20);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x + 16, y + 28);
  }

  function drawScanBlip(x, y, r) {
    const pulse = calm ? 1 : 0.6 + Math.sin(s.t * 10) * 0.4;
    ctx.fillStyle = `rgba(111,216,255,${0.35 * pulse})`;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6fd8ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawIce(x, y, r, mega = false) {
    if (mega) {
      const glow = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 1.6);
      glow.addColorStop(0, 'rgba(159,232,255,0.55)');
      glow.addColorStop(1, 'rgba(159,232,255,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#3f4a63';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // soil lump with ice grains
    ctx.fillStyle = '#7fa8d6';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e6f7ff';
    for (let k = 0; k < 5; k++) {
      const a = k * 1.3 + x * 0.01;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!calm) {
      const tw = (Math.sin(s.t * 6 + x) + 1) / 2;
      ctx.globalAlpha = tw;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + r * 0.5 - 6, y - r * 0.5);
      ctx.lineTo(x + r * 0.5 + 6, y - r * 0.5);
      ctx.moveTo(x + r * 0.5, y - r * 0.5 - 6);
      ctx.lineTo(x + r * 0.5, y - r * 0.5 + 6);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function drawRock(x, y, r) {
    ctx.fillStyle = '#8a8f99';
    ctx.strokeStyle = '#10182c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      const rr = r * (0.8 + ((k * 37 + Math.floor(x)) % 5) * 0.06);
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function frame(t) {
    const dt = s.last ? Math.min(0.05, (t - s.last) / 1000) : 0;
    s.last = t;
    step(dt);
    if (!s.finished) draw();
    if (!s.finished) s.raf = requestAnimationFrame(frame);
  }
  fillRows(H * 2);
  s.raf = requestAnimationFrame(frame);

  // ---------------------------------------------------------------- input
  const toLogical = (e) => {
    const r = canvas.getBoundingClientRect();
    return ((e.clientX - r.left) * W) / r.width;
  };
  const onMove = (e) => {
    if (e.pointerType === 'mouse') s.mouseX = toLogical(e);
  };
  const onDown = (e) => {
    if (e.pointerType === 'mouse') s.boost = true;
  };
  const onUp = () => {
    s.boost = false;
  };
  const onLeave = () => {
    s.mouseX = null;
    s.boost = false;
  };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointerleave', onLeave);

  return {
    key(code, down) {
      if (code === 'KeyA' || code === 'ArrowLeft') s.left = down;
      else if (code === 'KeyD' || code === 'ArrowRight') s.right = down;
      else if (code === 'Space') s.boost = down;
      else if (code === 'KeyS') {
        if (down) scan();
        return true;
      } else return false;
      if (down) s.mouseX = null; // keys take over from the mouse
      return true;
    },
    /** touch buttons: dir = -1 | 0 | 1 */
    steer(dir) {
      s.left = dir < 0;
      s.right = dir > 0;
      s.mouseX = null;
    },
    setBoost(on) {
      s.boost = on;
    },
    scan,
    destroy() {
      s.finished = true;
      cancelAnimationFrame(s.raf);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
    },
  };
}
