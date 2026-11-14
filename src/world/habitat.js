// habitat.js — the habitat module (v0.2.1: bigger and homier).
// Inside, three areas along the module:
//   −X  sleeping nook  (bunk with curtain, shelf, Earth photo, wardrobe, rug)
//   mid lounge + galley (sofa, Earth-view camera screen, kitchen counter, dining table, plants)
//   +X  work bay       (life support rack, control console, lockers, electrolysis, airlock)
// createHabitatModel() builds all meshes (swap for a glTF later); createHabitat() adds
// gameplay data: colliders, the pressurized zone, interactables and lights.
import * as THREE from 'three';
import { MAT, FABRIC } from './materials.js';
import { LAYOUT } from './layout.js';
import { createSign } from './signs.js';
import { planarUV } from './textures.js';
import {
  rbox,
  mesh,
  pipe,
  label,
  crate,
  createHatch,
  hazardStripeMaterial,
  rugMaterial,
  earthScreenMaterial,
  earthPhotoMaterial,
  screenMaterial,
  curtainGeometry,
} from './details.js';
import { pottedPlant, rosetteGeometry } from './plants.js';

const H = LAYOUT.HABITAT;
const R = H.radius;
const RI = H.innerRadius;
const L = H.length;
const FY = H.floorY;
const AX = H.axisY;
const LOUNGE_CEILING = FY + 3.0;

/** Half-width of the interior at absolute height y. */
const wallZ = (y) => Math.sqrt(Math.max(0, RI * RI - (y - AX) * (y - AX)));
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function circleShape(r, cy) {
  const s = new THREE.Shape();
  s.absarc(0, cy, r, 0, Math.PI * 2, false);
  return s;
}
function roundedRectPath(path, x0, y0, w, h, r) {
  path.moveTo(x0, y0);
  path.lineTo(x0 + w, y0);
  path.lineTo(x0 + w, y0 + h - r);
  path.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
  path.lineTo(x0 + r, y0 + h);
  path.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
  path.lineTo(x0, y0);
  return path;
}

// ---------------------------------------------------------------- exterior
function buildExterior(group) {
  const shell = mesh(new THREE.CylinderGeometry(R, R, L, 56, 1, true), MAT.hull());
  shell.rotation.z = Math.PI / 2;
  shell.position.y = AX;
  group.add(shell);
  for (const sx of [-1, 1]) {
    const dome = mesh(new THREE.SphereGeometry(R, 56, 14, 0, Math.PI * 2, 0, Math.PI / 2), MAT.hull());
    dome.scale.set(1, 0.32, 1);
    dome.rotation.z = (-sx * Math.PI) / 2;
    dome.position.set((sx * L) / 2, AX, 0);
    group.add(dome);
    const ring = mesh(new THREE.TorusGeometry(R + 0.02, 0.11, 12, 64), MAT.hullDark());
    ring.rotation.y = Math.PI / 2;
    ring.position.set((sx * L) / 2, AX, 0);
    group.add(ring);
    // thin orange accent ring
    const accent = mesh(new THREE.TorusGeometry(R + 0.015, 0.04, 8, 64), MAT.accent());
    accent.rotation.y = Math.PI / 2;
    accent.position.set(sx * (L / 2 - 1.6), AX, 0);
    group.add(accent);
  }
  // legs with foot pads
  for (const lx of [-8.5, -4.5, -0.5, 3.5, 9]) {
    for (const lz of [-2.4, 2.4]) {
      const top = AX - Math.sqrt(R * R - lz * lz) + 0.1;
      group.add(mesh(new THREE.CylinderGeometry(0.11, 0.14, top, 16), MAT.metal(), lx, top / 2, lz));
      group.add(mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.08, 24), MAT.darkMetal(), lx, 0.04, lz));
    }
  }
  // radiator panel on top + antenna dish
  const rad = mesh(rbox(5.2, 0.05, 1.3, 0.02), MAT.painted(0xf4f4f2), -2.5, AX + R + 0.45, 0);
  group.add(rad);
  for (const rx of [-4.6, -0.4]) group.add(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), MAT.metal(), rx, AX + R + 0.2, 0));
  group.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 10), MAT.metal(), -7, AX + R + 0.5, 0));
  const dish = mesh(new THREE.SphereGeometry(0.75, 28, 8, 0, Math.PI * 2, 0, Math.PI / 3.2), MAT.painted(0xf2f2f0));
  dish.position.set(-7, AX + R + 1.15, 0);
  dish.rotation.set(-0.9, 0.2, 0);
  group.add(dish);
  // name sign on the +Z side
  const sign = createSign(['SHACKLETON STATION', 'HAB-1'], 4.2, 1.2);
  const sy = 0.9;
  sign.position.set(-4, AX + sy, Math.sqrt(R * R - sy * sy) + 0.03);
  sign.rotation.x = -Math.asin(sy / R);
  group.add(sign);

  // airlock module + stairs down to the ground
  const A = H.airlock;
  const alBottom = FY - 0.15;
  const alDepth = A.zEnd - A.zStart;
  group.add(mesh(rbox(A.width, A.height, alDepth, 0.16), MAT.hull(), A.x, alBottom + A.height / 2, A.zStart + alDepth / 2));
  group.add(mesh(rbox(A.width + 0.04, 0.12, alDepth + 0.04, 0.05), MAT.accent(), A.x, alBottom + A.height - 0.35, A.zStart + alDepth / 2));
  // low collar joining the airlock to the curved hull (hidden inside the hatch surround)
  group.add(mesh(new THREE.BoxGeometry(1.9, 0.6, 0.55), MAT.hull(), A.x, alBottom + 0.3, 3.25));
  const outer = createHatch();
  outer.position.set(A.x, FY - 0.08, A.zEnd + 0.01);
  group.add(outer);
  group.add(mesh(rbox(0.6, 0.1, 0.1, 0.04), MAT.glow(0x6fe9ff, 3), A.x, FY + 2.32, A.zEnd + 0.08));
  const alSign = createSign('AIRLOCK', 1.2, 0.34);
  alSign.position.set(A.x, FY + 2.56, A.zEnd + 0.03);
  group.add(alSign);
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.12), hazardStripeMaterial());
  stripe.position.set(A.x, FY - 0.03, A.zEnd + 0.13);
  group.add(stripe);
  const steps = 6;
  const rise = alBottom / steps;
  const run = 0.33;
  for (let i = 0; i < steps; i++) {
    const top = (i + 1) * rise;
    const z = A.zEnd + run * (steps - i - 0.5);
    group.add(mesh(planarUV(new THREE.BoxGeometry(1.8, top, run), 'xz', 1), MAT.floor(), A.x, top / 2, z));
  }
  for (const sx of [-1, 1]) {
    const x = A.x + sx * 0.98;
    const topP = V(x, alBottom + 0.9, A.zEnd + 0.05);
    const botP = V(x, rise + 0.9, A.zEnd + run * steps - 0.1);
    group.add(pipe(topP, botP, 0.03, MAT.accent()));
    group.add(pipe(botP, V(x, 0, botP.z), 0.028, MAT.metal()));
    // middle post from the rail down to the step below it
    const pz = A.zEnd + 1.0;
    const t = (pz - topP.z) / (botP.z - topP.z);
    const railY = topP.y + (botP.y - topP.y) * t;
    const stepTop = alBottom - Math.ceil((pz - A.zEnd) / run) * rise + rise;
    group.add(pipe(V(x, railY, pz), V(x, stepTop, pz), 0.025, MAT.metal()));
  }
}

// ---------------------------------------------------------------- interior shell
function buildInteriorShell(group) {
  const lining = mesh(new THREE.CylinderGeometry(RI, RI, L - 0.3, 56, 1, true), MAT.habitatWall(), 0, AX, 0, { cast: false });
  lining.rotation.z = Math.PI / 2;
  group.add(lining);
  for (const sx of [-1, 1]) {
    const end = mesh(new THREE.ShapeGeometry(circleShape(RI, 0), 48), MAT.interiorPanel(), (sx * (L - 0.3)) / 2, AX, 0, { cast: false });
    end.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(end);
  }
  const hw = wallZ(FY);
  group.add(mesh(planarUV(new THREE.BoxGeometry(L - 0.3, 0.1, hw * 2), 'xz', 1), MAT.floor(), 0, FY - 0.05, 0, { cast: false }));
  // soft warm floor in the living areas (grating stays in the work bay)
  const livingLen = H.bulkheadX + (L - 0.3) / 2;
  const livingX = -(L - 0.3) / 2 + livingLen / 2;
  group.add(mesh(rbox(livingLen, 0.03, hw * 2 - 0.02, 0.01), MAT.painted(0x8e8579), livingX, FY + 0.012, 0, { cast: false }));
  // soft painted wall lining in the living areas (the metal plates stay in the work bay)
  const soft = mesh(new THREE.CylinderGeometry(RI - 0.03, RI - 0.03, livingLen, 56, 1, true), MAT.livingWall(), livingX, AX, 0, { cast: false });
  soft.rotation.z = Math.PI / 2;
  group.add(soft);
  // a wooden skirting rail along both living-area walls
  for (const sz of [-1, 1]) {
    const yRail = FY + 1.0;
    group.add(mesh(rbox(livingLen - 0.4, 0.06, 0.04, 0.015), MAT.wood(), livingX, yRail, sz * (wallZ(yRail) - 0.05), { cast: false }));
  }
  // lowered ceiling over the living areas with warm light coves
  const cw = wallZ(LOUNGE_CEILING) * 2 - 0.1;
  group.add(mesh(rbox(livingLen, 0.08, cw, 0.03), MAT.painted(0xf1ece3), livingX, LOUNGE_CEILING + 0.04, 0, { cast: false }));
  for (const sz of [-1, 1]) {
    group.add(mesh(new THREE.BoxGeometry(livingLen - 0.6, 0.04, 0.08), MAT.glow(0xffd29a, 2.4), livingX, LOUNGE_CEILING - 0.03, sz * (cw / 2 - 0.15), { cast: false }));
  }
  // bulkhead between lounge and work bay, with a rounded doorway
  const bh = circleShape(RI - 0.02, AX);
  const doorW = H.bulkheadDoorHalf * 2;
  const hole = roundedRectPath(new THREE.Path(), -doorW / 2, FY - 0.01, doorW, 2.45, 0.45);
  bh.holes.push(hole);
  const bhGeo = new THREE.ExtrudeGeometry(bh, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 40 });
  bhGeo.rotateY(Math.PI / 2);
  group.add(mesh(bhGeo, MAT.interiorPanel(), H.bulkheadX - 0.08, 0, 0));
  // orange trim around the doorway
  const trim = roundedRectPath(new THREE.Shape(), -doorW / 2 - 0.08, FY - 0.01, doorW + 0.16, 2.53, 0.5);
  trim.holes.push(roundedRectPath(new THREE.Path(), -doorW / 2, FY - 0.01, doorW, 2.45, 0.45));
  const trimGeo = new THREE.ExtrudeGeometry(trim, { depth: 0.22, bevelEnabled: false, curveSegments: 16 });
  trimGeo.rotateY(Math.PI / 2);
  group.add(mesh(trimGeo, MAT.accent(), H.bulkheadX - 0.11, 0, 0));
}

// ---------------------------------------------------------------- sleeping nook (−X)
function buildSleepingNook(group) {
  const z = -2.35;
  group.add(mesh(rbox(2.3, 0.45, 1.15, 0.06), MAT.painted(0xd9d3c8), -8.45, FY + 0.225, z));
  group.add(mesh(rbox(2.2, 0.2, 1.05, 0.09), MAT.fabric(FABRIC.cream), -8.45, FY + 0.55, z));
  group.add(mesh(rbox(1.45, 0.07, 1.09, 0.03), MAT.fabric(FABRIC.terracotta), -7.95, FY + 0.67, z));
  group.add(mesh(rbox(0.55, 0.16, 0.4, 0.07), MAT.fabric(0xf6f1e8), -9.2, FY + 0.74, z));
  group.add(mesh(rbox(0.08, 0.95, 1.15, 0.03), MAT.wood(), -9.66, FY + 0.92, z));
  // curtain on a rail (half drawn)
  const curtainMat = new THREE.MeshStandardMaterial({ color: FABRIC.teal, roughness: 0.95, side: THREE.DoubleSide });
  const curtain = mesh(curtainGeometry(1.2, 1.95, 6), curtainMat, -8.95, FY + 1.27, -1.72);
  group.add(curtain);
  group.add(pipe(V(-9.7, FY + 2.28, -1.72), V(-7.2, FY + 2.28, -1.72), 0.02, MAT.metal()));
  // shelf with books above the bunk
  group.add(mesh(rbox(1.6, 0.05, 0.3, 0.015), MAT.wood(), -8.45, FY + 1.55, -2.84));
  const bookCols = [0xc8673f, 0x2f7f86, 0xd9a441, 0x2c3e5c, 0xe9dfcf, 0x8b4a6b, 0x4f7a3a];
  let bx = -9.1;
  bookCols.forEach((c, i) => {
    const w = 0.06 + (i % 3) * 0.015;
    const h = 0.22 + (i % 4) * 0.025;
    group.add(mesh(rbox(w, h, 0.19, 0.01), MAT.painted(c), bx + w / 2, FY + 1.575 + h / 2, -2.84));
    bx += w + 0.012;
  });
  // reading lamp
  group.add(pipe(V(-7.55, FY + 1.58, -2.84), V(-7.55, FY + 1.8, -2.7), 0.015, MAT.metal()));
  group.add(mesh(new THREE.SphereGeometry(0.06, 16, 12), MAT.glow(0xffc980, 3), -7.55, FY + 1.78, -2.66));
  // framed Earth photo on the end wall
  const photo = mesh(new THREE.PlaneGeometry(0.9, 0.68), earthPhotoMaterial(), -(L - 0.3) / 2 + 0.03, FY + 1.6, 0.7);
  photo.rotation.y = Math.PI / 2;
  group.add(photo);
  group.add(mesh(rbox(0.03, 0.76, 0.98, 0.012), MAT.wood(), -(L - 0.3) / 2 + 0.012, FY + 1.6, 0.7));
  // wardrobe + nightstand
  group.add(mesh(rbox(1.3, 2.1, 0.68, 0.05), MAT.painted(0xe8e2d6), -9.0, FY + 1.05, 2.56));
  for (const hx of [-9.12, -8.88]) group.add(mesh(rbox(0.03, 0.36, 0.03, 0.012), MAT.metal(), hx, FY + 1.1, 2.2));
  group.add(mesh(rbox(0.46, 0.5, 0.44, 0.04), MAT.wood(), -6.98, FY + 0.25, -2.62));
  group.add(mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 18), MAT.ceramic(), -6.9, FY + 0.55, -2.6));
  // round rug
  const rug = mesh(new THREE.CircleGeometry(1.25, 48), rugMaterial('round'), -6.4, FY + 0.03, 0.2, { cast: false });
  rug.rotation.x = -Math.PI / 2;
  group.add(rug);
}

// ---------------------------------------------------------------- lounge + galley (middle)
function buildLounge(group) {
  // sofa along the −Z wall
  const sx = -2.4;
  group.add(mesh(rbox(3.0, 0.42, 0.9, 0.08), MAT.fabric(FABRIC.teal), sx, FY + 0.21, -2.45));
  group.add(mesh(rbox(3.0, 0.62, 0.22, 0.09), MAT.fabric(FABRIC.teal), sx, FY + 0.62, -2.82));
  for (const ax of [-1.42, 1.42]) group.add(mesh(rbox(0.18, 0.58, 0.9, 0.08), MAT.fabric(FABRIC.teal), sx + ax, FY + 0.33, -2.45));
  for (const [ox, c, rz] of [
    [-1.0, FABRIC.terracotta, 0.12],
    [1.0, FABRIC.mustard, -0.1],
  ]) {
    const p = mesh(rbox(0.44, 0.4, 0.14, 0.07), MAT.fabric(c), sx + ox, FY + 0.66, -2.6);
    p.rotation.set(-0.25, 0, rz);
    group.add(p);
  }
  // Earth-view camera screen above the sofa (a screen, not a window)
  group.add(mesh(rbox(2.78, 1.46, 0.06, 0.03), MAT.darkMetal(), sx, FY + 1.95, -3.2));
  const scr = mesh(new THREE.PlaneGeometry(2.6, 1.3), earthScreenMaterial(), sx, FY + 1.95, -3.165, { cast: false });
  group.add(scr);
  // coffee table + rug
  const rug = mesh(new THREE.PlaneGeometry(3.3, 2.1), rugMaterial('rect'), sx, FY + 0.03, -1.45, { cast: false });
  rug.rotation.x = -Math.PI / 2;
  group.add(rug);
  group.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 40), MAT.wood(), sx, FY + 0.42, -1.25));
  group.add(mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.4, 16), MAT.metal(), sx, FY + 0.2, -1.25));
  group.add(mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.03, 32), MAT.metal(), sx, FY + 0.015, -1.25));
  group.add(mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.1, 18), MAT.ceramic(), sx + 0.15, FY + 0.5, -1.2));

  // galley along the +Z wall
  const gx = -1.9;
  group.add(mesh(rbox(4.4, 0.9, 0.62, 0.04), MAT.painted(0xece7de), gx, FY + 0.45, 2.62));
  group.add(mesh(rbox(4.5, 0.05, 0.68, 0.02), MAT.wood(), gx, FY + 0.925, 2.6));
  group.add(mesh(rbox(0.5, 0.03, 0.36, 0.015), MAT.darkMetal(), gx + 1.4, FY + 0.955, 2.6)); // sink
  group.add(mesh(rbox(4.0, 0.6, 0.38, 0.04), MAT.painted(0xece7de), gx, FY + 2.0, 2.95));
  for (let i = 0; i < 4; i++) group.add(mesh(rbox(0.02, 0.5, 0.01, 0.005), MAT.painted(0xc9c2b6), gx - 1.5 + i * 1.0, FY + 2.0, 2.755));
  group.add(mesh(new THREE.BoxGeometry(3.8, 0.03, 0.06), MAT.glow(0xffd8a6, 2.6), gx, FY + 1.68, 2.82, { cast: false }));
  group.add(mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.22, 24), MAT.metal(), gx + 0.6, FY + 1.06, 2.6)); // kettle
  for (const mx of [0.95, 1.05]) group.add(mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 18), MAT.ceramic(), gx + mx, FY + 1.0, 2.5));
  // herbs on the counter
  for (const [hx, seed] of [
    [-3.75, 4],
    [-3.45, 5],
    [-3.15, 6],
  ]) {
    group.add(mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.15, 24), MAT.ceramic(), hx, FY + 1.025, 2.62));
    const herb = mesh(rosetteGeometry({ leaves: 8, length: 0.16, width: 0.07, tilt: 0.6, rings: 2, seed }), MAT.leaf(), hx, FY + 1.09, 2.62);
    group.add(herb);
  }
  // food store (tall cabinet)
  group.add(mesh(rbox(0.82, 1.95, 0.62, 0.05), MAT.painted(0xdde2e7), 0.85, FY + 0.975, 2.62));
  group.add(mesh(rbox(0.03, 0.5, 0.03, 0.012), MAT.metal(), 0.5, FY + 1.2, 2.3));
  const fs = label('FOOD STORE', 0.6, 0.14, { bg: '#0d1a33', accent: '#7be0a0', w: 256, h: 64 });
  fs.position.set(0.85, FY + 1.6, 2.305);
  fs.rotation.y = Math.PI;
  group.add(fs);

  // dining table with stools
  const tx = 1.25;
  const tz = -0.7;
  group.add(mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.05, 48), MAT.wood(), tx, FY + 0.74, tz));
  group.add(mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.72, 16), MAT.metal(), tx, FY + 0.36, tz));
  group.add(mesh(new THREE.CylinderGeometry(0.35, 0.38, 0.03, 32), MAT.metal(), tx, FY + 0.015, tz));
  for (const a of [0.6, 2.7, 4.6]) {
    const x = tx + Math.cos(a) * 0.85;
    const z = tz + Math.sin(a) * 0.85;
    group.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.07, 28), MAT.fabric(FABRIC.mustard), x, FY + 0.5, z));
    group.add(mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.47, 12), MAT.metal(), x, FY + 0.235, z));
  }
  // pendant lamps
  for (const [px, pz] of [
    [tx, tz],
    [sx, -1.25],
  ]) {
    group.add(pipe(V(px, LOUNGE_CEILING, pz), V(px, LOUNGE_CEILING - 0.75, pz), 0.008, MAT.darkMetal(), 6));
    const shade = mesh(new THREE.SphereGeometry(0.22, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2), MAT.painted(0xe9a06a), px, LOUNGE_CEILING - 0.95, pz);
    shade.material = MAT.painted(0xe9a06a);
    group.add(shade);
    group.add(mesh(new THREE.SphereGeometry(0.07, 16, 12), MAT.glow(0xffd29a, 4), px, LOUNGE_CEILING - 0.96, pz, { cast: false }));
  }
  // big potted plant by the bulkhead
  const plant = pottedPlant({ potR: 0.24, potH: 0.42, size: 0.62, seed: 9, potMat: MAT.ceramic(), leafMat: MAT.leaf(), soilMat: MAT.soil() });
  plant.position.set(2.35, FY, -2.45);
  group.add(plant);
}

// ---------------------------------------------------------------- work bay (+X)
function buildWorkBay(group) {
  const A = H.airlock;
  // inner airlock hatch in a flat surround
  group.add(mesh(rbox(1.95, 2.55, 0.5, 0.05), MAT.interiorPanel(), A.x, FY + 1.275, 3.24));
  const hatch = createHatch();
  hatch.position.set(A.x, FY + 0.02, 2.985);
  hatch.rotation.y = Math.PI;
  group.add(hatch);
  const exit = label(['EXIT · AIRLOCK'], 1.3, 0.26, { bg: '#0b3b2a', accent: '#7be0a0', w: 512, h: 104 });
  exit.position.set(A.x, FY + 2.4, 2.98);
  exit.rotation.y = Math.PI;
  group.add(exit);
  const stripeGeo = new THREE.PlaneGeometry(1.7, 0.12);
  const floorStripe = new THREE.Mesh(stripeGeo, hazardStripeMaterial());
  floorStripe.rotation.x = -Math.PI / 2;
  floorStripe.position.set(A.x, FY + 0.005, 2.55);
  group.add(floorStripe);

  // lockers (+Z wall, left of the hatch)
  for (let i = 0; i < 3; i++) {
    const x = 3.65 + i * 0.6;
    group.add(mesh(rbox(0.56, 1.95, 0.5, 0.04), MAT.painted(0xd5dbe1), x, FY + 0.975, 2.68));
    group.add(mesh(rbox(0.03, 0.3, 0.03, 0.012), MAT.metal(), x - 0.18, FY + 1.1, 2.42));
    group.add(mesh(new THREE.BoxGeometry(0.3, 0.05, 0.01), MAT.accent(), x, FY + 1.65, 2.425));
  }
  // storage crates in the +X/+Z corner
  const c1 = crate(0.9, 0.7, 0.7);
  c1.position.set(9.1, FY, 2.45);
  const c2 = crate(0.6, 0.5, 0.55);
  c2.position.set(9.12, FY + 0.7, 2.45);
  c2.rotation.y = 0.15;
  group.add(c1, c2);

  // life-support rack (−Z wall)
  const lx = 5.0;
  group.add(mesh(rbox(2.8, 2.1, 0.62, 0.05), MAT.painted(0xd0d7de), lx, FY + 1.05, -2.62));
  const ls = mesh(new THREE.PlaneGeometry(1.1, 0.68), screenMaterial('ls', 'LIFE SUPPORT', ['Air loop', 'Water loop', 'Thermal']), lx - 0.6, FY + 1.45, -2.305, { cast: false });
  group.add(ls);
  for (let i = 0; i < 10; i++) {
    group.add(mesh(new THREE.SphereGeometry(0.025, 10, 8), MAT.glow(i % 3 === 0 ? 0x4fd1e8 : 0x7be0a0, 2.2), lx + 0.35 + (i % 5) * 0.16, FY + 1.7 - Math.floor(i / 5) * 0.16, -2.3, { cast: false }));
  }
  for (let i = 0; i < 4; i++) group.add(mesh(rbox(1.0, 0.04, 0.02, 0.01), MAT.darkMetal(), lx + 0.7, FY + 0.5 + i * 0.12, -2.305));

  // control console (−Z wall)
  const cx = 8.0;
  group.add(mesh(rbox(2.2, 0.06, 0.78, 0.02), MAT.painted(0xe2e6ea), cx, FY + 0.77, -2.52));
  group.add(mesh(rbox(2.2, 0.72, 0.1, 0.03), MAT.painted(0xc9d0d7), cx, FY + 0.38, -2.86));
  for (const [ox, key, title, lines, acc] of [
    [-0.5, 'base', 'BASE STATUS', ['Habitat', 'Greenhouse', 'Solar array'], '#4fd1e8'],
    [0.5, 'comms', 'COMMS', ['Earth link', 'Messages', 'Weather'], '#7be0a0'],
  ]) {
    group.add(mesh(rbox(0.9, 0.56, 0.04, 0.02), MAT.darkMetal(), cx + ox, FY + 1.25, -2.8));
    const s = mesh(new THREE.PlaneGeometry(0.84, 0.5), screenMaterial(key, title, lines, acc), cx + ox, FY + 1.25, -2.775, { cast: false });
    group.add(s);
  }
  group.add(mesh(rbox(0.5, 0.08, 0.48, 0.03), MAT.fabric(FABRIC.navy), cx, FY + 0.48, -1.75));
  group.add(mesh(rbox(0.48, 0.5, 0.07, 0.03), MAT.fabric(FABRIC.navy), cx, FY + 0.8, -1.52));
  group.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 12), MAT.metal(), cx, FY + 0.22, -1.75));
  group.add(mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.03, 20), MAT.metal(), cx, FY + 0.015, -1.75));

  // electrolysis unit (+X end) — hook for the future lesson
  const ex = 9.2;
  group.add(mesh(rbox(0.9, 1.75, 1.7, 0.06), MAT.painted(0xdfe4e9), ex, FY + 0.875, 0));
  group.add(mesh(new THREE.CapsuleGeometry(0.18, 0.75, 8, 24), MAT.glow(0x2f7fd8, 1), ex - 0.5, FY + 0.9, 0.55));
  group.add(mesh(new THREE.CapsuleGeometry(0.18, 0.75, 8, 24), MAT.glow(0x9fe8ff, 1), ex - 0.5, FY + 0.9, -0.55));
  for (const tz of [0.55, -0.55]) {
    for (const ty of [0.42, 1.38]) {
      const band = mesh(new THREE.TorusGeometry(0.185, 0.02, 8, 24), MAT.metal(), ex - 0.5, FY + ty, tz);
      band.rotation.x = Math.PI / 2;
      group.add(band);
    }
  }
  const el = mesh(new THREE.PlaneGeometry(0.62, 0.38), screenMaterial('el', 'ELECTROLYSIS', ['Water in', 'Oxygen out', 'Hydrogen out']), ex - 0.455, FY + 1.35, 0, { cast: false });
  el.rotation.y = -Math.PI / 2;
  group.add(el);
  const elSign = createSign(['ELECTROLYSIS', 'water → oxygen'], 1.3, 0.48);
  elSign.position.set(ex - 0.46, FY + 2.05, 0);
  elSign.rotation.y = -Math.PI / 2;
  group.add(elSign);

  // exposed pipes + cable tray (the "working" part of the habitat)
  for (const [z, r, mat] of [
    [-1.0, 0.07, MAT.metal()],
    [-0.78, 0.045, MAT.accent()],
    [1.05, 0.075, MAT.metal()],
  ]) {
    const y = AX + Math.sqrt(RI * RI - z * z) - 0.25;
    group.add(pipe(V(H.bulkheadX + 0.2, y, z), V(L / 2 - 0.4, y, z), r, mat));
  }
  for (let x = 3.6; x <= 9.4; x += 1.2) {
    for (const z of [-0.9, 1.05]) {
      const y = AX + Math.sqrt(RI * RI - z * z) - 0.14;
      group.add(mesh(rbox(0.07, 0.22, 0.26, 0.02), MAT.darkMetal(), x, y, z, { receive: false }));
    }
  }
  for (const pz of [0.4, -0.4]) group.add(pipe(V(9.45, AX + RI - 0.6, pz), V(9.45, FY + 1.75, pz), 0.04, MAT.metal()));
  const trayY = FY + 2.55;
  const trayZ = -(wallZ(trayY) - 0.12);
  group.add(mesh(rbox(6.2, 0.06, 0.2, 0.02), MAT.darkMetal(), 6.4, trayY, trayZ));
  group.add(mesh(new THREE.BoxGeometry(5.8, 0.03, 0.08), MAT.glow(0xeef4ff, 3), 6.4, AX + RI - 0.08, 0, { cast: false }));
}

export function createHabitatModel() {
  const group = new THREE.Group();
  group.name = 'habitat';
  // exterior and interior are separate so only the visible one is drawn (no windows)
  const exterior = new THREE.Group();
  const interior = new THREE.Group();
  group.add(exterior, interior);
  buildExterior(exterior);
  buildInteriorShell(interior);
  buildSleepingNook(interior);
  buildLounge(interior);
  buildWorkBay(interior);
  group.position.set(H.x, 0, H.z);
  return { group, exterior, interior };
}

export function createHabitat() {
  const model = createHabitatModel();
  const lights = [];
  for (const [x, y, color, intensity] of [
    [-7.0, LOUNGE_CEILING - 0.3, 0xffc890, 4.5], // sleeping nook — warm
    [-1.0, LOUNGE_CEILING - 0.3, 0xffd7a6, 6], // lounge — warm
    [6.4, AX + 1.6, 0xeef3ff, 7], // work bay — cool, bright
  ]) {
    const p = new THREE.PointLight(color, intensity, 10, 2);
    p.position.set(x, y, 0); // local to the habitat group
    p.userData.on = intensity;
    p.intensity = 0; // off until you are inside (they'd glow through the walls)
    lights.push(p);
    model.group.add(p);
  }

  const I = H.interior;
  const bx = H.bulkheadX;
  const dh = H.bulkheadDoorHalf;
  const toWorld = (p) => ({ x: H.x + p.x, z: H.z + p.z, yawDeg: p.yawDeg });
  const A = H.airlock;
  return {
    object: model.group,
    exterior: model.exterior,
    interior: model.interior,
    lights,
    setActive(on) {
      for (const p of lights) p.intensity = on ? p.userData.on : 0;
    },
    outdoorColliders: [
      { type: 'box', minX: H.x - L / 2 - 0.9, maxX: H.x + L / 2 + 0.9, minZ: H.z - R, maxZ: H.z + R },
      // airlock + stairs
      { type: 'box', minX: H.x + A.x - 1.45, maxX: H.x + A.x + 1.45, minZ: H.z + A.zStart, maxZ: H.z + A.zEnd + 1.95 },
    ],
    zone: {
      id: 'habitat',
      name: 'Habitat',
      pressurized: true,
      floorY: FY,
      ceilingY: LOUNGE_CEILING,
      rect: { minX: H.x + I.minX, maxX: H.x + I.maxX, minZ: H.z + I.minZ, maxZ: H.z + I.maxZ },
      // furniture you can't walk through (habitat sits at the world origin)
      obstacles: [
        { type: 'box', minX: bx - 0.14, maxX: bx + 0.14, minZ: -3.1, maxZ: -dh }, // bulkhead
        { type: 'box', minX: bx - 0.14, maxX: bx + 0.14, minZ: dh, maxZ: 3.1 },
        { type: 'box', minX: -9.7, maxX: -7.25, minZ: -3.0, maxZ: -1.72 }, // bunk + curtain
        { type: 'box', minX: -9.7, maxX: -8.33, minZ: 2.2, maxZ: 3.0 }, // wardrobe
        { type: 'box', minX: -7.22, maxX: -6.74, minZ: -3.0, maxZ: -2.38 }, // nightstand
        { type: 'box', minX: -3.95, maxX: -0.85, minZ: -3.0, maxZ: -1.98 }, // sofa
        { type: 'circle', x: -2.4, z: -1.25, r: 0.52 }, // coffee table
        { type: 'box', minX: -4.15, maxX: 1.28, minZ: 2.28, maxZ: 3.0 }, // galley + food store
        { type: 'circle', x: 1.25, z: -0.7, r: 0.98 }, // dining table + stools
        { type: 'circle', x: 2.35, z: -2.45, r: 0.36 }, // plant
        { type: 'box', minX: 3.35, maxX: 5.0, minZ: 2.42, maxZ: 3.0 }, // lockers
        { type: 'box', minX: 3.58, maxX: 6.42, minZ: -3.0, maxZ: -2.29 }, // life support
        { type: 'box', minX: 6.88, maxX: 9.12, minZ: -3.0, maxZ: -2.12 }, // console
        { type: 'circle', x: 8.0, z: -1.7, r: 0.34 }, // chair
        { type: 'box', minX: 8.48, maxX: 9.7, minZ: -0.95, maxZ: 0.95 }, // electrolysis
        { type: 'box', minX: 8.6, maxX: 9.7, minZ: 2.05, maxZ: 3.0 }, // crates
      ],
    },
    interactables: [
      {
        id: 'hab-inner-door',
        zone: 'habitat',
        x: H.x + H.innerDoor.x,
        z: H.z + H.innerDoor.z - 0.5,
        y: FY + 1.1,
        prompt: 'Press E to exit to the surface',
        action: { type: 'door', to: 'outside', arrive: toWorld(H.outsideArrive), via: 'airlock' },
      },
      {
        id: 'hab-outer-door',
        zone: 'outside',
        x: H.x + H.outerDoor.x,
        z: H.z + H.outerDoor.z,
        y: 1.0,
        prompt: 'Press E to enter the Habitat',
        action: { type: 'door', to: 'habitat', arrive: toWorld(H.insideArrive), via: 'airlock' },
      },
      {
        id: 'electrolysis',
        zone: 'habitat',
        x: H.x + 8.2,
        z: H.z,
        y: FY + 1.1,
        prompt: 'Press E to make oxygen (Electrolysis)',
        action: { type: 'station', station: 'electrolysis' }, // opens the Molecule Zapper instance
      },
    ],
  };
}
