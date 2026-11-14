// details.js — small detail geometry that makes the base feel built: pipes, handrails,
// cable trays, crates, labels. Placeholder art in the same low-poly style; everything here
// is static and gets merged per material by mergeStatic().
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { MAT } from './materials.js';
import { signTexture } from './signs.js';
import { heightAt } from './heightfield.js';
import { LAYOUT } from './layout.js';

/** Box with bevelled edges (r = bevel radius in metres). */
export function rbox(w, h, d, r = 0.04) {
  return new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2, h / 2, d / 2));
}

function mesh(geo, mat, x, y, z, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

/** Straight pipe from a to b (THREE.Vector3), radius r. */
function pipe(a, b, r, mat) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

const labelCache = new Map();
function label(text, w, h, opts) {
  const key = text + JSON.stringify(opts ?? {});
  if (!labelCache.has(key)) {
    labelCache.set(key, new THREE.MeshBasicMaterial({ map: signTexture(text, opts), toneMapped: false }));
  }
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), labelCache.get(key));
}

function hazardStripeMaterial() {
  if (labelCache.has('hazard')) return labelCache.get('hazard');
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 32;
  const ctx = cv.getContext('2d');
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
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
  labelCache.set('hazard', m);
  return m;
}

/** Storage crate with bevels and a darker band. */
function crate(w, h, d) {
  const g = new THREE.Group();
  g.add(mesh(rbox(w, h, d, 0.05), MAT.interiorPanel(), 0, h / 2, 0));
  g.add(mesh(rbox(w + 0.02, 0.08, d + 0.02, 0.02), MAT.darkMetal(), 0, h * 0.72, 0));
  const tag = label('SUPPLIES', w * 0.6, 0.12, { bg: '#0d1a33', accent: '#ffb547', w: 256, h: 64 });
  tag.position.set(0, h * 0.45, d / 2 + 0.006);
  g.add(tag);
  return g;
}

// ---------------------------------------------------------------- habitat
/** Adds interior + exterior detail to the habitat group (local coords). Returns extra obstacles (world). */
export function addHabitatDetails(group) {
  const H = LAYOUT.HABITAT;
  const ri = H.innerRadius;
  const fy = H.floorY;
  const L = H.length;
  const obstacles = [];

  // ceiling pipes (two runs) with brackets
  for (const [z, r, mat] of [
    [-0.9, 0.06, MAT.metal()],
    [-0.72, 0.04, MAT.accent()],
    [0.95, 0.07, MAT.metal()],
  ]) {
    const y = H.axisY + Math.sqrt(ri * ri - z * z) - 0.22;
    group.add(pipe(new THREE.Vector3(-L / 2 + 0.4, y, z), new THREE.Vector3(L / 2 - 0.4, y, z), r, mat));
  }
  for (let x = -5; x <= 5; x += 1.25) {
    for (const z of [-0.85, 0.95]) {
      const y = H.axisY + Math.sqrt(ri * ri - z * z) - 0.12;
      group.add(mesh(new THREE.BoxGeometry(0.06, 0.2, 0.24), MAT.darkMetal(), x, y, z, { receive: false }));
    }
  }
  // handrails along both walls (astronauts use them everywhere)
  for (const s of [-1, 1]) {
    const yRel = -0.55;
    const z = s * (Math.sqrt(ri * ri - yRel * yRel) - 0.12);
    const y = H.axisY + yRel;
    group.add(pipe(new THREE.Vector3(-4.6, y, z), new THREE.Vector3(-1.9, y, z), 0.025, MAT.accent()));
    for (const x of [-4.4, -3.2, -2.1]) {
      group.add(pipe(new THREE.Vector3(x, y, z), new THREE.Vector3(x, y, z + s * 0.1), 0.02, MAT.metal()));
    }
  }
  // cable tray on the −Z wall
  const trayY = H.axisY + 0.55;
  const trayZ = -(Math.sqrt(ri * ri - 0.55 * 0.55) - 0.1);
  group.add(mesh(new THREE.BoxGeometry(L - 1.5, 0.06, 0.18), MAT.darkMetal(), 0, trayY, trayZ));
  for (const [dz, col] of [
    [-0.04, MAT.accent()],
    [0.03, MAT.glow(0x4fd1e8, 1)],
  ]) {
    group.add(
      pipe(new THREE.Vector3(-L / 2 + 0.9, trayY + 0.05, trayZ + dz), new THREE.Vector3(L / 2 - 0.9, trayY + 0.05, trayZ + dz), 0.018, col),
    );
  }
  // storage crates at the +X end (−Z side) — solid
  const c1 = crate(0.8, 0.6, 0.6);
  c1.position.set(4.9, fy, -1.3);
  const c2 = crate(0.6, 0.45, 0.5);
  c2.position.set(4.9, fy + 0.6, -1.3);
  c2.rotation.y = 0.15;
  group.add(c1, c2);
  obstacles.push({ type: 'box', minX: H.x + 4.45, maxX: H.x + 5.35, minZ: H.z - 1.85, maxZ: H.z - 0.95 });

  // wall labels
  const o2 = label(['O₂ LINE'], 0.7, 0.22, { bg: '#0d1a33', accent: '#4fd1e8', w: 256, h: 80 });
  o2.position.set(-3.5, H.axisY + 0.75, Math.sqrt(ri * ri - 0.75 * 0.75) - 0.02);
  o2.rotation.y = Math.PI;
  o2.rotation.x = -0.3;
  group.add(o2);
  const pwr = label(['PWR BUS'], 0.7, 0.22, { bg: '#0d1a33', accent: '#7be0a0', w: 256, h: 80 });
  pwr.position.set(1.0, trayY + 0.28, trayZ + 0.06);
  pwr.rotation.x = 0.3;
  group.add(pwr);
  // hazard stripes framing the inner airlock hatch
  const stripeGeo = new THREE.PlaneGeometry(1.6, 0.12);
  for (const y of [fy + 0.06, fy + 2.26]) {
    const s = new THREE.Mesh(stripeGeo, hazardStripeMaterial());
    s.position.set(H.innerDoor.x, y, H.innerDoor.z - 0.07);
    s.rotation.y = Math.PI;
    group.add(s);
  }

  // outside: handrails on the ramp
  const A = H.airlock;
  for (const sx of [-0.85, 0.85]) {
    const top = new THREE.Vector3(A.x + sx, fy + 0.85, A.zEnd + 0.05);
    const bottom = new THREE.Vector3(A.x + sx, 0.95, A.zEnd + 1.5);
    group.add(pipe(top, bottom, 0.03, MAT.accent()));
    group.add(pipe(bottom, new THREE.Vector3(bottom.x, 0, bottom.z), 0.03, MAT.metal()));
  }
  // outside: exterior hazard stripe under the outer hatch
  const outStripe = new THREE.Mesh(stripeGeo, hazardStripeMaterial());
  outStripe.position.set(A.x, fy + 0.02, A.zEnd + 0.07);
  group.add(outStripe);
  return obstacles;
}

// ---------------------------------------------------------------- greenhouse
export function addGreenhouseDetails(group) {
  const G = LAYOUT.GREENHOUSE;
  const fy = G.floorY;
  const L = G.length;
  // water lines feeding the racks (thin blue pipes under the top shelves)
  for (const s of [-1, 1]) {
    group.add(pipe(new THREE.Vector3(2.0, fy + 1.95, s * 1.75), new THREE.Vector3(14.0, fy + 1.95, s * 1.75), 0.025, MAT.glow(0x3a7bd5, 1)));
  }
  // nutrient tank at the east end
  const tank = mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.3, 12), MAT.interiorPanel(), L - 0.8, fy + 0.65, 1.6);
  group.add(tank);
  group.add(mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.08, 12), MAT.accent(), L - 0.8, fy + 1.0, 1.6));
  const tlabel = label(['NUTRIENTS'], 0.7, 0.2, { bg: '#0d1a33', accent: '#7be0a0', w: 256, h: 72 });
  tlabel.position.set(L - 0.8, fy + 0.7, 1.6 - 0.46);
  tlabel.rotation.y = Math.PI;
  group.add(tlabel);
  // vestibule bevel trim
  const V = G.vestibule;
  group.add(mesh(rbox(V.xEnd - V.xStart + 0.06, 0.12, V.width + 0.06, 0.04), MAT.darkMetal(), (V.xStart + V.xEnd) / 2, fy + 0.06, 0));
}

// ---------------------------------------------------------------- outside
/** Outdoor props. Returns { object, colliders }. */
export function createOutdoorDetails() {
  const group = new THREE.Group();
  group.name = 'outdoorDetails';
  const colliders = [];
  // supply crates stacked by the habitat airlock
  const spots = [
    [6.2, 4.4, 0.0, 1.0, 0.8, 0.8],
    [6.2, 4.4, 0.8, 0.8, 0.6, 0.7],
    [7.3, 4.1, 0.0, 0.8, 0.7, 0.7],
  ];
  for (const [x, z, yOff, w, h, d] of spots) {
    const c = crate(w, h, d);
    c.position.set(x, heightAt(x, z) + yOff, z);
    c.rotation.y = 0.2;
    group.add(c);
  }
  colliders.push({ type: 'box', minX: 5.5, maxX: 7.9, minZ: 3.6, maxZ: 5.0 });
  // power cable from the habitat to the greenhouse
  const pts = [];
  const a = new THREE.Vector3(4.2, 0, 2.8);
  const b = new THREE.Vector3(LAYOUT.GREENHOUSE.x - LAYOUT.GREENHOUSE.length / 2 + 1.2, 0, LAYOUT.GREENHOUSE.z - 3.2);
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const x = a.x + (b.x - a.x) * t + Math.sin(t * Math.PI) * 2.5;
    const z = a.z + (b.z - a.z) * t;
    pts.push(new THREE.Vector3(x, heightAt(x, z) + 0.05, z));
  }
  const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.045, 5, false), MAT.accent());
  cable.receiveShadow = true;
  group.add(cable);
  return { object: group, colliders };
}
