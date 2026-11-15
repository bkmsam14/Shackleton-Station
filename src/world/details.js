// details.js — shared detail pieces: bevelled boxes, pipes, hatches, crates, labels and
// small decor textures. Placeholder art in one clean, smooth-shaded style; everything
// static gets merged per material by mergeStatic().
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { MAT } from './materials.js';
import { signTexture } from './signs.js';
import { heightAt, mulberry32 } from './heightfield.js';
import { LAYOUT } from './layout.js';

/** Box with bevelled edges (r = bevel radius in metres). */
export function rbox(w, h, d, r = 0.04, segments = 2) {
  return new RoundedBoxGeometry(w, h, d, segments, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
}

export function mesh(geo, mat, x = 0, y = 0, z = 0, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

/** Straight pipe from a to b (THREE.Vector3), radius r. */
export function pipe(a, b, r, mat, radial = 12) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, radial), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

const cache = new Map();
function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

export function label(text, w, h, opts) {
  const mat = cached('label' + text + JSON.stringify(opts ?? {}), () => {
    const m = new THREE.MeshBasicMaterial({ map: signTexture(text, opts), toneMapped: false, transparent: true, alphaTest: 0.5 });
    return m;
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
}

function canvasMaterial(key, w, h, draw, { emissive = false, strength = 1, std = {} } = {}) {
  return cached(key, () => {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    draw(cv.getContext('2d'), w, h);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    if (emissive) {
      const m = new THREE.MeshBasicMaterial({ map: tex, toneMapped: true });
      m.color.setScalar(strength);
      return m;
    }
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, ...std });
  });
}

export function hazardStripeMaterial() {
  return canvasMaterial('hazard', 256, 32, (ctx) => {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, 256, 32);
    ctx.fillStyle = '#ffb547';
    for (let x = -32; x < 256; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 32);
      ctx.lineTo(x + 16, 0);
      ctx.lineTo(x + 32, 0);
      ctx.lineTo(x + 16, 32);
      ctx.fill();
    }
  }, { std: { roughness: 0.7 } });
}

/** Woven round/rect rug. */
export function rugMaterial(variant = 'round') {
  return canvasMaterial('rug' + variant, 512, 512, (ctx, w, h) => {
    const cols = variant === 'round' ? ['#b85c3a', '#e2b866', '#e9dfcf', '#2f7f86'] : ['#2f5f7a', '#e9dfcf', '#c8673f', '#e2b866'];
    if (variant === 'round') {
      for (let i = 0; i < 9; i++) {
        ctx.fillStyle = cols[i % cols.length];
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, (w / 2) * (1 - i / 9), 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = cols[0];
      ctx.fillRect(0, 0, w, h);
      for (let i = 1; i < 6; i++) {
        ctx.strokeStyle = cols[i % cols.length];
        ctx.lineWidth = 14;
        ctx.strokeRect(i * 34, i * 34, w - i * 68, h - i * 68);
      }
    }
    // woven grain
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#000';
    for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
    ctx.globalAlpha = 1;
  }, { std: { roughness: 1 } });
}

/** Earth seen over the lunar horizon — for the "Earth view" camera screen and the photo. */
function drawEarthView(ctx, w, h, { caption = null } = {}) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#02040a');
  g.addColorStop(1, '#070b16');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const rand = mulberry32(11);
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 160; i++) ctx.fillRect(rand() * w, rand() * h * 0.7, rand() < 0.1 ? 2 : 1, rand() < 0.1 ? 2 : 1);
  // Earth (crescent-ish, lit from the right)
  const ex = w * 0.62;
  const ey = h * 0.38;
  const er = h * 0.17;
  ctx.fillStyle = '#0b1a33';
  ctx.beginPath();
  ctx.arc(ex, ey, er, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(ex, ey, er, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#2e74c9';
  ctx.beginPath();
  ctx.arc(ex + er * 0.45, ey, er, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4c9a58';
  ctx.beginPath();
  ctx.ellipse(ex + er * 0.35, ey - er * 0.2, er * 0.32, er * 0.2, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(ex + er * 0.55, ey + er * 0.35, er * 0.3, er * 0.08, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // lunar horizon
  ctx.fillStyle = '#6d6a64';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.78);
  for (let x = 0; x <= w; x += w / 24) ctx.lineTo(x, h * (0.74 + 0.04 * Math.sin(x * 0.02) + 0.02 * Math.sin(x * 0.07)));
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();
  if (caption) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, h - 40, w, 40);
    ctx.fillStyle = '#e8eef8';
    ctx.font = '600 22px Fredoka, Nunito, sans-serif';
    ctx.fillText(caption, 16, h - 13);
  }
}

export function earthScreenMaterial() {
  return canvasMaterial('earthScreen', 1024, 512, (ctx, w, h) => drawEarthView(ctx, w, h, { caption: 'EARTH VIEW · OUTSIDE CAMERA 2' }), {
    emissive: true,
    strength: 1.1,
  });
}

export function earthPhotoMaterial() {
  return canvasMaterial('earthPhoto', 512, 384, (ctx, w, h) => {
    drawEarthView(ctx, w, h);
    ctx.strokeStyle = '#f4efe6';
    ctx.lineWidth = 22;
    ctx.strokeRect(0, 0, w, h);
  }, { std: { roughness: 0.4 } });
}

/** A status screen with a few short lines (no real-data numbers). */
export function screenMaterial(key, title, lines, accent = '#4fd1e8') {
  return canvasMaterial('screen' + key, 512, 320, (ctx, w, h) => {
    ctx.fillStyle = '#061018';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = accent;
    ctx.font = '700 34px Fredoka, Nunito, sans-serif';
    ctx.fillText(title, 24, 52);
    ctx.fillRect(24, 66, w - 48, 3);
    ctx.font = '600 26px Fredoka, Nunito, sans-serif';
    lines.forEach((l, i) => {
      ctx.fillStyle = '#dce8f2';
      ctx.fillText(l, 24, 112 + i * 44);
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(w - 170, 92 + i * 44, 140 - i * 18, 18);
      ctx.globalAlpha = 1;
    });
  }, { emissive: true, strength: 1.4 });
}

/** Hanging curtain: a wavy cloth plane. */
export function curtainGeometry(width, height, folds = 7) {
  const g = new THREE.PlaneGeometry(width, height, folds * 6, 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    p.setZ(i, Math.sin((x / width) * Math.PI * 2 * folds) * 0.06);
  }
  g.computeVertexNormals();
  return g;
}

/** Storage crate with bevels, a darker band and a label. */
export function crate(w, h, d, text = 'SUPPLIES') {
  // Graphics overhaul: a clean futuristic crate — white rounded body, blue-grey corner
  // posts, an orange lid band and a soft cyan status strip.
  const g = new THREE.Group();
  g.add(mesh(rbox(w, h, d, 0.08), MAT.painted(0xf1f3f6), 0, h / 2, 0));
  const post = rbox(0.09, h + 0.02, 0.09, 0.03);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) g.add(mesh(post, MAT.darkMetal(), (sx * (w - 0.05)) / 2, h / 2, (sz * (d - 0.05)) / 2));
  }
  g.add(mesh(rbox(w + 0.03, 0.08, d + 0.03, 0.03), MAT.accent(), 0, h * 0.88, 0));
  g.add(mesh(rbox(w + 0.025, 0.05, d + 0.025, 0.02), MAT.hullDark(), 0, h * 0.1, 0));
  g.add(mesh(rbox(w * 0.5, 0.03, 0.02, 0.01), MAT.glow(0x6fe3f0, 1.8), 0, h * 0.22, d / 2 + 0.005, { cast: false }));
  const tag = label(text, w * 0.62, 0.13, { bg: '#0d1a33', accent: '#ffb547', w: 256, h: 64 });
  tag.position.set(0, h * 0.42, d / 2 + 0.008);
  g.add(tag);
  return g;
}

/**
 * Rounded hatch door: frame + door leaf + small round window + handwheel.
 * Faces +Z; origin at the bottom centre of the doorway.
 */
export function createHatch({ w = 1.15, h = 2.0, frame = 0.14 } = {}) {
  const g = new THREE.Group();
  const rr = (sw, sh, r) => {
    const s = new THREE.Shape();
    const x = -sw / 2;
    const y = 0;
    s.moveTo(x + r, y);
    s.lineTo(x + sw - r, y);
    s.quadraticCurveTo(x + sw, y, x + sw, y + r);
    s.lineTo(x + sw, y + sh - r);
    s.quadraticCurveTo(x + sw, y + sh, x + sw - r, y + sh);
    s.lineTo(x + r, y + sh);
    s.quadraticCurveTo(x, y + sh, x, y + sh - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  };
  const outer = rr(w + frame * 2, h + frame, 0.32);
  const hole = rr(w, h, 0.26);
  outer.holes.push(hole);
  const frameGeo = new THREE.ExtrudeGeometry(outer, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 8 });
  const fr = mesh(frameGeo, MAT.doorFrame(), 0, -frame / 2 + 0.0, -0.05);
  g.add(fr);
  const leafGeo = new THREE.ExtrudeGeometry(rr(w - 0.04, h - 0.04, 0.24), { depth: 0.07, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 8 });
  g.add(mesh(leafGeo, MAT.door(), 0, 0.02, -0.04));
  const win = mesh(new THREE.CircleGeometry(0.16, 24), MAT.glass(), 0, h * 0.72, 0.05);
  g.add(win);
  const winRim = mesh(new THREE.TorusGeometry(0.17, 0.025, 8, 24), MAT.metal(), 0, h * 0.72, 0.05);
  g.add(winRim);
  const wheel = mesh(new THREE.TorusGeometry(0.17, 0.022, 8, 24), MAT.metal(), 0, h * 0.45, 0.07);
  g.add(wheel);
  for (const a of [0, Math.PI / 2]) {
    const spoke = mesh(new THREE.BoxGeometry(0.32, 0.025, 0.025), MAT.metal(), 0, h * 0.45, 0.07);
    spoke.rotation.z = a;
    g.add(spoke);
  }
  return g;
}

// ---------------------------------------------------------------- greenhouse
export function addGreenhouseDetails(group) {
  const G = LAYOUT.GREENHOUSE;
  const fy = G.floorY;
  const L = G.length;
  // water lines feeding the racks
  for (const s of [-1, 1]) {
    group.add(pipe(new THREE.Vector3(2.0, fy + 1.95, s * 1.75), new THREE.Vector3(14.0, fy + 1.95, s * 1.75), 0.022, MAT.glow(0x3a7bd5, 1)));
  }
  // nutrient tank at the east end
  group.add(mesh(new THREE.CapsuleGeometry(0.42, 0.6, 8, 24), MAT.interiorPanel(), L - 0.8, fy + 0.75, 1.6));
  const band = mesh(new THREE.TorusGeometry(0.43, 0.035, 8, 32), MAT.accent(), L - 0.8, fy + 0.95, 1.6);
  band.rotation.x = Math.PI / 2;
  group.add(band);
  const tlabel = label(['NUTRIENTS'], 0.62, 0.18, { bg: '#0d1a33', accent: '#7be0a0', w: 256, h: 72 });
  tlabel.position.set(L - 0.8, fy + 0.65, 1.6 - 0.44);
  tlabel.rotation.y = Math.PI;
  group.add(tlabel);
}

// ---------------------------------------------------------------- outside
/** Outdoor props. Returns { object, colliders }. */
export function createOutdoorDetails() {
  const group = new THREE.Group();
  group.name = 'outdoorDetails';
  const colliders = [];
  const H = LAYOUT.HABITAT;
  // supply crates stacked past the habitat's +X end
  const ex = H.x + H.length / 2 + 1.6;
  const spots = [
    [ex, 1.8, 0.0, 1.0, 0.8, 0.8],
    [ex, 1.8, 0.8, 0.8, 0.6, 0.7],
    [ex + 1.1, 1.5, 0.0, 0.8, 0.7, 0.7],
  ];
  for (const [x, z, yOff, w, h, d] of spots) {
    const c = crate(w, h, d);
    c.position.set(x, heightAt(x, z) + yOff, z);
    c.rotation.y = 0.2;
    group.add(c);
  }
  colliders.push({ type: 'box', minX: ex - 0.75, maxX: ex + 1.65, minZ: 1.0, maxZ: 2.4 });
  // power cable from the habitat to the greenhouse
  const pts = [];
  const a = new THREE.Vector3(1.5, 0, H.z + H.radius + 0.25);
  const b = new THREE.Vector3(LAYOUT.GREENHOUSE.x - LAYOUT.GREENHOUSE.length / 2 + 1.2, 0, LAYOUT.GREENHOUSE.z - 3.2);
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const x = a.x + (b.x - a.x) * t + Math.sin(t * Math.PI) * 2.5;
    const z = a.z + (b.z - a.z) * t;
    pts.push(new THREE.Vector3(x, heightAt(x, z) + 0.05, z));
  }
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.045, 8, false), MAT.accent());
  cable.receiveShadow = true;
  group.add(cable);
  return { object: group, colliders };
}
