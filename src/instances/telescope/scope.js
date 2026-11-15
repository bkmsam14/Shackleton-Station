// scope.js — the telescope view (Canvas 2D): the REAL sky at the Moon's south pole, seen
// through the eyepiece. Same star positions as the 3D sky (systems/skyMath.js), drawn with a
// gnomonic (flat-map) projection around where the telescope points.
//
// Phases: 'hunt' (pan + zoom, keep the target in the crosshair to lock on) →
//         'draw' (tap the stars in order to draw the constellation) → done.
// Sun safety: pointing within TELESCOPE.SUN_GLARE_DEG of the Sun closes the shutter.
import { TELESCOPE, SKY } from '../../config/gameplay.js';
import { horizontalFromEcliptic, separationDeg, bvToTemperatureK, temperatureToRgb, wrap360, eclipticFromEquatorial } from '../../systems/skyMath.js';
import { sfx } from '../../ui/sfx.js';

const W = 880;
const H = 560;
const R = 262; // eyepiece circle radius (px)
const CX = W / 2;
const CY = H / 2;
const D2R = Math.PI / 180;
const HINT_AFTER_S = 15; // GAME BALANCE (not real data) — the arrow hint appears after this

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function vec(az, alt) {
  const a = az * D2R;
  const e = alt * D2R;
  return [Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e)]; // daycycle.skyDirection
}
const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const cross = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
const norm = (p) => {
  const l = Math.hypot(p[0], p[1], p[2]) || 1;
  return [p[0] / l, p[1] / l, p[2] / l];
};

/**
 * @param p.canvas
 * @param p.catalog   { stars, byHr } (data/stars.js)
 * @param p.sky       { sunAz, sunAlt, turn, earthAz, earthAlt }
 * @param p.target    a TARGETS entry (data/constellations.js)
 * @param p.announce  (msg) => void
 * @param p.onPhase   (phase, info) => void — 'locked' | 'shutter' | 'done'
 */
export function createScope({ canvas, catalog, sky, target, announce, onPhase }) {
  const ctx = canvas.getContext('2d');
  canvas.width = W;
  canvas.height = H;
  const calm = reducedMotion();

  // every catalog star as sky az/alt (the sky is frozen while you look: the world is paused)
  const stars = catalog.stars
    .map((s) => ({ ...s, ...horizontalFromEcliptic(s.lon, s.lat, sky.turn) }))
    .filter((s) => s.alt > -2);
  for (const s of stars) {
    s.v = vec(s.az, s.alt);
    const rgb = temperatureToRgb(bvToTemperatureK(s.bv)).map((c) => Math.round((0.45 + c * 0.55) * 255));
    s.css = `rgb(${rgb.join(',')})`;
  }
  const byHr = new Map(stars.map((s) => [s.hr, s]));
  const sun = { az: sky.sunAz, alt: sky.sunAlt, v: vec(sky.sunAz, sky.sunAlt) };
  const earth = { az: sky.earthAz, alt: sky.earthAlt, v: vec(sky.earthAz, sky.earthAlt) };

  // the target: its stars (in tap order) and its centre
  let cloud = null;
  if (target.cloud) {
    const e = eclipticFromEquatorial(target.cloud.ra, target.cloud.dec);
    const h = horizontalFromEcliptic(e.lon, e.lat, sky.turn);
    cloud = { ...h, v: vec(h.az, h.alt), r: target.cloud.radiusDeg };
  }
  const order = target.paths.map((path) => path.map((hr) => byHr.get(hr)).filter(Boolean));
  const tStars = order.flat();
  const centreV = cloud ? cloud.v : norm(tStars.reduce((acc, s) => [acc[0] + s.v[0], acc[1] + s.v[1], acc[2] + s.v[2]], [0, 0, 0]));
  const centre = { az: wrap360(Math.atan2(centreV[0], -centreV[2]) / D2R), alt: Math.asin(centreV[1]) / D2R };
  // how wide the figure is (to frame it for drawing)
  const spanDeg = cloud ? cloud.r * 2 : Math.max(8, ...tStars.map((s) => separationDeg(s, centre) * 2));

  // start looking low toward the opposite side of the Sun (a safe direction), normal zoom
  const s = {
    az: wrap360(sky.sunAz + 180),
    alt: 30,
    zoom: 1, // index into ZOOM_FOV_DEG
    fov: TELESCOPE.ZOOM_FOV_DEG[1],
    phase: 'hunt',
    t: 0,
    lockT: 0,
    shutter: 0, // 0 open … 1 closed
    shutterWarned: false,
    keys: { left: false, right: false, up: false, down: false },
    drag: null,
    pathIdx: 0, // drawing: which line
    starIdx: 0, // drawing: which star in that line
    drawn: [], // segments drawn: [[starA, starB]]
    wrongTaps: 0,
    ripples: [], // tap feedback {x,y,t,ok}
    raf: 0,
    last: 0,
    huntSeconds: 0,
    guided: false,
  };

  // ---------------------------------------------------------------- projection
  function basis() {
    const f = vec(s.az, s.alt);
    let right = cross(f, [0, 1, 0]);
    if (Math.hypot(...right) < 1e-6) right = [1, 0, 0];
    right = norm(right);
    const up = cross(right, f);
    return { f, right, up };
  }
  function project(v, b) {
    const z = dot(v, b.f);
    if (z <= 0.05) return null;
    const k = R / Math.tan((s.fov / 2) * D2R);
    return { x: CX + (dot(v, b.right) / z) * k, y: CY - (dot(v, b.up) / z) * k };
  }
  /** screen point → sky direction (inverse gnomonic) */
  function unproject(x, y, b) {
    const k = R / Math.tan((s.fov / 2) * D2R);
    const dx = (x - CX) / k;
    const dy = -(y - CY) / k;
    return norm([b.f[0] + b.right[0] * dx + b.up[0] * dy, b.f[1] + b.right[1] * dx + b.up[1] * dy, b.f[2] + b.right[2] * dx + b.up[2] * dy]);
  }

  // ---------------------------------------------------------------- update
  function clampView() {
    s.alt = Math.max(-5, Math.min(89.5, s.alt));
    s.az = wrap360(s.az);
  }
  function step(dt) {
    s.t += dt;
    const k = TELESCOPE.PAN_DEG_PER_S * (s.fov / TELESCOPE.ZOOM_FOV_DEG[1]) * dt;
    if (s.phase === 'hunt') {
      if (s.keys.left) s.az -= k / Math.max(0.2, Math.cos(s.alt * D2R));
      if (s.keys.right) s.az += k / Math.max(0.2, Math.cos(s.alt * D2R));
      if (s.keys.up) s.alt += k;
      if (s.keys.down) s.alt -= k;
      clampView();
      s.huntSeconds += dt;
    }
    // smooth zoom
    const fovGoal = s.phase === 'draw' ? Math.min(TELESCOPE.ZOOM_FOV_DEG[0], Math.max(18, spanDeg * 1.5)) : TELESCOPE.ZOOM_FOV_DEG[s.zoom];
    s.fov += (fovGoal - s.fov) * Math.min(1, dt * 6);
    // auto-slew while drawing / guided: ease the view onto the target
    if (s.phase === 'draw' || s.guided) {
      const ease = Math.min(1, dt * 3);
      let daz = ((centre.az - s.az + 540) % 360) - 180;
      s.az += daz * ease;
      s.alt += (centre.alt - s.alt) * ease;
      if (s.guided && Math.abs(daz) < 0.5 && Math.abs(centre.alt - s.alt) < 0.5) s.guided = false;
    }
    // sun shutter
    const view = { az: s.az, alt: s.alt };
    const nearSun = separationDeg(view, sun) < TELESCOPE.SUN_GLARE_DEG;
    s.shutter += ((nearSun ? 1 : 0) - s.shutter) * Math.min(1, dt * (calm ? 30 : 8));
    if (nearSun && !s.shutterWarned) {
      s.shutterWarned = true;
      onPhase('shutter');
    }
    if (!nearSun && s.shutter < 0.05) s.shutterWarned = false;
    // lock on
    if (s.phase === 'hunt') {
      const radius = TELESCOPE.LOCK_RADIUS_DEG * (s.fov / TELESCOPE.ZOOM_FOV_DEG[1]);
      const inside = !nearSun && separationDeg(view, centre) < radius;
      s.lockT = inside ? s.lockT + dt : Math.max(0, s.lockT - dt * 2);
      if (s.lockT >= TELESCOPE.LOCK_SECONDS) {
        s.phase = 'draw';
        sfx.success();
        announce(cloud ? 'Locked on! Tap the misty cloud.' : 'Locked on! Now tap the stars in order to draw the shape.');
        onPhase('locked', { seconds: s.huntSeconds, guided: s.usedGuide });
      }
    }
    for (const r of s.ripples) r.t += dt;
    s.ripples = s.ripples.filter((r) => r.t < 0.6);
  }

  // ---------------------------------------------------------------- drawing
  function draw() {
    const b = basis();
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#01030a';
    ctx.fillRect(0, 0, W, H);

    // stars (brighter = bigger); faint ones show more when zoomed in
    const magLimit = s.fov > 50 ? 4.6 : s.fov > 25 ? 5.2 : 5.5;
    const zoomBoost = TELESCOPE.ZOOM_FOV_DEG[1] / s.fov;
    for (const st of stars) {
      if (st.mag > magLimit) continue;
      const p = project(st.v, b);
      if (!p || p.x < CX - R - 5 || p.x > CX + R + 5 || p.y < CY - R - 5 || p.y > CY + R + 5) continue;
      const r = Math.max(0.8, (3.6 - st.mag * 0.55) * Math.min(1.8, Math.sqrt(zoomBoost)));
      ctx.globalAlpha = Math.min(1, 1.2 - st.mag * 0.14);
      ctx.fillStyle = st.css;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // the Large Magellanic Cloud (a soft patch, visible to the eye)
    {
      const lmc = cloud ?? lmcDefault;
      const p = project(lmc.v, b);
      if (p) {
        const pr = (R / Math.tan((s.fov / 2) * D2R)) * Math.tan(lmc.r * D2R);
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pr);
        g.addColorStop(0, 'rgba(210,220,255,0.28)');
        g.addColorStop(1, 'rgba(210,220,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, pr, pr * 0.7, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Earth (fixed low in the Moon's sky)
    const pe = project(earth.v, b);
    if (pe) {
      const er = Math.max(6, (R / Math.tan((s.fov / 2) * D2R)) * Math.tan((SKY.EARTH_ANGULAR_DIAMETER_DEG / 2) * D2R));
      ctx.fillStyle = '#2f7fd8';
      ctx.beginPath();
      ctx.arc(pe.x, pe.y, er, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e6f2ff';
      ctx.font = '600 18px Fredoka, Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Earth', pe.x, pe.y - er - 8);
    }
    // ground below the horizon (alt 0)
    const pts = [];
    for (let i = -60; i <= 60; i++) {
      const p = project(vec(s.az + i * 3, 0), b);
      if (p) pts.push(p);
    }
    if (pts.length > 1) {
      ctx.fillStyle = '#1a1c22';
      ctx.beginPath();
      ctx.moveTo(pts[0].x, H + 10);
      for (const p of pts) ctx.lineTo(p.x, p.y);
      ctx.lineTo(pts.at(-1).x, H + 10);
      ctx.closePath();
      ctx.fill();
    } else if (s.alt < 0) {
      ctx.fillStyle = '#1a1c22';
      ctx.fillRect(0, 0, W, H);
    }

    // drawing phase: ghost figure, drawn lines, the next star to tap
    if (s.phase === 'draw' || s.phase === 'done') {
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 8]);
      ctx.strokeStyle = 'rgba(127,216,255,0.35)';
      for (const path of order) {
        ctx.beginPath();
        path.forEach((st, i) => {
          const p = project(st.v, b);
          if (!p) return;
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.strokeStyle = '#7fd8ff';
      ctx.lineWidth = 4;
      for (const [a, c] of s.drawn) {
        const p = project(a.v, b);
        const q = project(c.v, b);
        if (!p || !q) continue;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
      const next = nextStar();
      if (next && s.phase === 'draw') {
        const p = project(next.v, b);
        if (p) {
          const pulse = calm ? 1 : 1 + Math.sin(s.t * 6) * 0.2;
          ctx.strokeStyle = '#ffd43b';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 16 * pulse, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // star names
      ctx.font = '600 17px Fredoka, Nunito, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#e6f2ff';
      for (const [hr, name] of Object.entries(target.labels ?? {})) {
        const st = byHr.get(Number(hr));
        const p = st && project(st.v, b);
        if (p && s.drawn.some(([a, c]) => a === st || c === st)) ctx.fillText(name, p.x + 12, p.y - 10);
      }
    }
    for (const r of s.ripples) {
      ctx.strokeStyle = r.ok ? `rgba(123,224,160,${1 - r.t / 0.6})` : `rgba(255,122,89,${1 - r.t / 0.6})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 10 + r.t * 50, 0, Math.PI * 2);
      ctx.stroke();
    }

    // sun shutter (two blades closing from the sides — no bright flash)
    if (s.shutter > 0.01) {
      const w = R * s.shutter;
      ctx.fillStyle = '#20263a';
      ctx.fillRect(CX - R, CY - R, w, R * 2);
      ctx.fillRect(CX + R - w, CY - R, w, R * 2);
      if (s.shutter > 0.6) {
        ctx.fillStyle = '#ffd43b';
        ctx.font = '700 26px Fredoka, Nunito, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Sun shutter closed!', CX, CY - 8);
        ctx.font = '600 19px Fredoka, Nunito, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Never look at the Sun through a telescope.', CX, CY + 22);
      }
    }
    ctx.restore();

    // eyepiece ring, crosshair, lock ring
    ctx.strokeStyle = '#2d3c72';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(CX, CY, R + 4, 0, Math.PI * 2);
    ctx.stroke();
    if (s.phase === 'hunt') {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(CX - 26, CY);
      ctx.lineTo(CX - 8, CY);
      ctx.moveTo(CX + 8, CY);
      ctx.lineTo(CX + 26, CY);
      ctx.moveTo(CX, CY - 26);
      ctx.lineTo(CX, CY - 8);
      ctx.moveTo(CX, CY + 8);
      ctx.lineTo(CX, CY + 26);
      ctx.stroke();
      if (s.lockT > 0) {
        ctx.strokeStyle = '#7be0a0';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(CX, CY, 40, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * s.lockT) / TELESCOPE.LOCK_SECONDS);
        ctx.stroke();
      }
      // hint arrow toward the target (after a while)
      if (s.huntSeconds > HINT_AFTER_S) {
        const p = project(centreV, b);
        let ax;
        let ay;
        if (p && Math.hypot(p.x - CX, p.y - CY) < R - 30) ax = null;
        else {
          const dir = p ? [p.x - CX, p.y - CY] : [dot(centreV, b.right), -dot(centreV, b.up)];
          const l = Math.hypot(dir[0], dir[1]) || 1;
          ax = CX + (dir[0] / l) * (R - 34);
          ay = CY + (dir[1] / l) * (R - 34);
          const ang = Math.atan2(dir[1], dir[0]);
          ctx.save();
          ctx.translate(ax, ay);
          ctx.rotate(ang);
          ctx.fillStyle = '#ffd43b';
          ctx.beginPath();
          ctx.moveTo(18, 0);
          ctx.lineTo(-10, -12);
          ctx.lineTo(-10, 12);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
    }
    // readouts
    ctx.fillStyle = '#c9d4e8';
    ctx.font = '600 17px Fredoka, Nunito, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Height above horizon: ${Math.round(s.alt)}°`, 16, H - 16);
    ctx.textAlign = 'right';
    ctx.fillText(`Zoom: ${['wide', 'normal', 'close'][s.zoom]}`, W - 16, H - 16);
  }
  const lmcDefault = (() => {
    const e = eclipticFromEquatorial(80.894, -69.756);
    const h = horizontalFromEcliptic(e.lon, e.lat, sky.turn);
    return { ...h, v: vec(h.az, h.alt), r: 4 };
  })();

  function nextStar() {
    const path = order[s.pathIdx];
    return path ? path[s.starIdx] : null;
  }

  // ---------------------------------------------------------------- taps (drawing)
  function tap(x, y) {
    if (s.phase !== 'draw') return;
    const b = basis();
    if (cloud) {
      const p = project(cloud.v, b);
      const pr = (R / Math.tan((s.fov / 2) * D2R)) * Math.tan(cloud.r * D2R);
      const ok = p && Math.hypot(x - p.x, y - p.y) < Math.max(40, pr);
      s.ripples.push({ x, y, t: 0, ok });
      if (ok) return finish();
      s.wrongTaps++;
      sfx.miss();
      return;
    }
    const next = nextStar();
    const p = next && project(next.v, b);
    const ok = p && Math.hypot(x - p.x, y - p.y) < 30; // ≥ 44 px touch target (scaled canvas)
    s.ripples.push({ x, y, t: 0, ok: Boolean(ok) });
    if (!ok) {
      s.wrongTaps++;
      sfx.miss();
      announce('Not that one — tap the star in the yellow ring.');
      return;
    }
    const prev = s.starIdx > 0 ? order[s.pathIdx][s.starIdx - 1] : null;
    if (prev) s.drawn.push([prev, next]);
    sfx.zap(s.drawn.length + 1);
    s.starIdx++;
    if (s.starIdx >= order[s.pathIdx].length) {
      s.pathIdx++;
      s.starIdx = 0;
    }
    if (s.pathIdx >= order.length) finish();
    else announce('Nice! Next star.');
  }
  function finish() {
    s.phase = 'done';
    sfx.success();
    onPhase('done', { wrongTaps: s.wrongTaps });
  }

  // ---------------------------------------------------------------- loop + input
  function frame(t) {
    const dt = s.last ? Math.min(0.05, (t - s.last) / 1000) : 0;
    s.last = t;
    step(dt);
    draw();
    s.raf = requestAnimationFrame(frame);
  }
  s.raf = requestAnimationFrame(frame);

  const toCanvas = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };
  const onDown = (e) => {
    canvas.setPointerCapture?.(e.pointerId);
    s.drag = { ...toCanvas(e), moved: 0 };
  };
  const onMove = (e) => {
    if (!s.drag || s.phase !== 'hunt') return;
    const p = toCanvas(e);
    const b = basis();
    const a = unproject(s.drag.x, s.drag.y, b);
    const c = unproject(p.x, p.y, b);
    const azOf = (v) => Math.atan2(v[0], -v[2]) / D2R;
    s.az -= (((azOf(c) - azOf(a) + 540) % 360) - 180);
    s.alt -= (Math.asin(c[1]) - Math.asin(a[1])) / D2R;
    clampView();
    s.drag.moved += Math.hypot(p.x - s.drag.x, p.y - s.drag.y);
    s.drag.x = p.x;
    s.drag.y = p.y;
  };
  const onUp = (e) => {
    if (s.drag && s.drag.moved < 8) {
      const p = toCanvas(e);
      tap(p.x, p.y);
    }
    s.drag = null;
  };
  const onWheel = (e) => {
    e.preventDefault();
    api.zoom(e.deltaY > 0 ? -1 : 1);
  };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  const api = {
    key(code, down) {
      const map = { KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down' };
      if (map[code]) {
        s.keys[map[code]] = down;
        return true;
      }
      if (down && (code === 'Equal' || code === 'NumpadAdd')) return api.zoom(1), true;
      if (down && (code === 'Minus' || code === 'NumpadSubtract')) return api.zoom(-1), true;
      return false;
    },
    /** dir +1 = zoom in (closer), −1 = out (wider) */
    zoom(dir) {
      s.zoom = Math.max(0, Math.min(TELESCOPE.ZOOM_FOV_DEG.length - 1, s.zoom + dir));
      sfx.click();
    },
    /** Volt helps: slew to the target (no time star) */
    guide() {
      s.guided = true;
      s.usedGuide = true;
    },
    get huntSeconds() {
      return s.huntSeconds;
    },
    get usedGuide() {
      return Boolean(s.usedGuide);
    },
    /** Where the next thing to tap is, in canvas units (used by the browser test). */
    nextPoint() {
      const b = basis();
      const v = cloud ? cloud.v : nextStar()?.v;
      return v ? project(v, b) : null;
    },
    get phase() {
      return s.phase;
    },
    destroy() {
      cancelAnimationFrame(s.raf);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('wheel', onWheel);
    },
  };
  return api;
}
