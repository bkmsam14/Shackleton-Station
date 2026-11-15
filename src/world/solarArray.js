// solarArray.js — tall VERTICAL solar array that turns to face the low Sun.
// createSolarArrayModel() is the only place that builds the mesh, so a glTF model
// can replace it later without touching the tracking logic.
import * as THREE from 'three';
import { MAT } from './materials.js';
import { LAYOUT } from './layout.js';
import { SOLAR_ARRAY } from '../config/gameplay.js';
import { deltaDeg, wrapDeg } from '../systems/daycycle.js';

function cellTexture() {
  const cv = document.createElement('canvas');
  cv.width = 128;
  cv.height = 256;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#1b356c';
  ctx.fillRect(0, 0, 128, 256);
  ctx.strokeStyle = '#8fa6d1';
  ctx.lineWidth = 2;
  for (let x = 0; x <= 128; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }
  for (let y = 0; y <= 256; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(128, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Builds the array mesh. Returns { group, head } — head is the part that rotates. */
export function createSolarArrayModel() {
  const L = LAYOUT.SOLAR_ARRAY;
  const group = new THREE.Group();
  group.name = 'solarArray';

  // tripod base
  const legGeo = new THREE.CylinderGeometry(0.08, 0.11, 3.2, 14);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(legGeo, MAT.metal());
    leg.position.set(Math.cos(a) * 1.0, 1.3, Math.sin(a) * 1.0);
    leg.rotation.set(Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45);
    leg.castShadow = true;
    group.add(leg);
  }
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.4, 0.3, 40), MAT.darkMetal());
  foot.position.y = 0.15;
  foot.receiveShadow = true;
  group.add(foot);

  // mast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, L.mastHeight, 24), MAT.hullDark());
  mast.position.y = L.mastHeight / 2;
  mast.castShadow = true;
  group.add(mast);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.5, 24), MAT.accent());
  band.position.y = 2.6;
  group.add(band);

  // rotating head: panel + frame + motor
  const head = new THREE.Group();
  head.position.y = 0;
  const panelMat = new THREE.MeshStandardMaterial({
    map: cellTexture(),
    roughness: 0.3,
    metalness: 0.35,
    emissive: 0x0a1630,
    flatShading: true,
  });
  const panel = new THREE.Mesh(new THREE.BoxGeometry(L.panelWidth, L.panelHeight, 0.08), [
    MAT.metal(),
    MAT.metal(),
    MAT.metal(),
    MAT.metal(),
    panelMat, // +Z face: the cells face the Sun
    MAT.hullDark(), // back of the panel: light grey so its shape reads against the black sky
  ]);
  panel.position.set(0, L.panelBottomY + L.panelHeight / 2, 0.32);
  panel.castShadow = true;
  panel.receiveShadow = true;
  head.add(panel);
  const frameGeo = new THREE.BoxGeometry(0.12, L.panelHeight + 0.3, 0.14);
  for (const sx of [-1, 1]) {
    const f = new THREE.Mesh(frameGeo, MAT.metal());
    f.position.set((sx * (L.panelWidth + 0.1)) / 2, panel.position.y, 0.32);
    f.castShadow = true;
    head.add(f);
  }
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.5), MAT.metal());
  arm.position.set(0, panel.position.y, 0.12);
  head.add(arm);
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.6, 28), MAT.accent());
  motor.position.y = L.mastHeight + 0.2;
  head.add(motor);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), MAT.glow(0xff5a4a, 5));
  beacon.position.y = L.mastHeight + 0.65;
  head.add(beacon);
  group.add(head);

  group.position.set(L.x, 0, L.z);
  return { group, head, beacon };
}

/**
 * Solar array controller: turns the head toward the Sun at a limited speed and reports
 * how well the cells face the Sun (alignment 0..1).
 */
export function createSolarArray(groundY) {
  const model = createSolarArrayModel();
  model.group.position.y = groundY;
  let facingAz = null;
  let blink = 0;

  return {
    object: model.group,
    colliders: [{ type: 'circle', x: LAYOUT.SOLAR_ARRAY.x, z: LAYOUT.SOLAR_ARRAY.z, r: 1.5 }],
    get facingAzimuthDeg() {
      return facingAz;
    },
    /** @returns alignment 0..1 (cosine of the angle between panel normal and the Sun) */
    /** Face the Sun again at once on the next update (e.g. after switching to the Live sky). */
    resetTracking() {
      facingAz = null;
    },
    update(dt, sunAzDeg) {
      if (facingAz === null) facingAz = sunAzDeg;
      const diff = deltaDeg(sunAzDeg, facingAz);
      const step = SOLAR_ARRAY.TRACK_SPEED_DEG_PER_SEC * dt;
      facingAz = wrapDeg(facingAz + Math.max(-step, Math.min(step, diff)));
      // panel normal is local +Z; rotation.y = π − az points it at azimuth az
      model.head.rotation.y = Math.PI - (facingAz * Math.PI) / 180;
      blink += dt;
      model.beacon.visible = blink % 1.6 < 0.2;
      const err = deltaDeg(sunAzDeg, facingAz) * (Math.PI / 180);
      return Math.max(0, Math.cos(err));
    },
  };
}
