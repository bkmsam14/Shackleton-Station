// terrain.js — low-poly regolith ground, far hills ring, rocks.
import * as THREE from 'three';
import { heightAt, realHeight, baseMask, mulberry32 } from './heightfield.js';
import { farHorizonDeg, MID_MAX_M } from './lola.js';
import { LAYOUT } from './layout.js';
import { MAT } from './materials.js';
import { pbrSet } from './textures.js';

const REGOLITH_TILE_M = 5; // one regolith texture tile = 5 m



export function createTerrain({ segments = 220 } = {}) {
  // A disc of the REAL ground (LOLA) around the base: rings get wider further out.
  const R = LAYOUT.TERRAIN_RADIUS;
  const rings = Math.round(segments * 0.55);
  const az = rings * 2;
  const pos = [];
  const colors = [];
  const uvs = [];
  const idx = [];
  const c = new THREE.Color();
  const push = (x, z) => {
    const y = heightAt(x, z);
    pos.push(x, y, z);
    const n = (Math.sin(x * 0.37 + z * 0.11) + Math.sin(z * 0.29 - x * 0.07)) * 0.025;
    const pad = baseMask(x, z) * -0.05;
    const g = 1.0 + (n + pad) * 1.8;
    c.setRGB(g, g * 0.985, g * 0.96, THREE.SRGBColorSpace);
    colors.push(c.r, c.g, c.b);
    uvs.push(x / REGOLITH_TILE_M, z / REGOLITH_TILE_M);
  };
  push(0, 0);
  for (let k = 1; k <= rings; k++) {
    const r = R * Math.pow(k / rings, 1.7);
    for (let a = 0; a < az; a++) {
      const t = (a / az) * Math.PI * 2;
      push(Math.sin(t) * r, -Math.cos(t) * r);
    }
  }
  const ring = (k, a) => 1 + (k - 1) * az + (a % az);
  for (let a = 0; a < az; a++) idx.push(0, ring(1, a + 1), ring(1, a));
  for (let k = 1; k < rings; k++) {
    for (let a = 0; a < az; a++) {
      const p = ring(k, a);
      const q = ring(k, a + 1);
      const rr = ring(k + 1, a);
      const s = ring(k + 1, a + 1);
      idx.push(p, q, rr, q, s, rr);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    ...pbrSet('regolith', { parts: ['map', 'normal', 'orm'] }),
  });
  mat.normalScale.set(1.2, 1.2); // fine regolith detail on top of the real shape
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = true; // real ridges cast long shadows at a low Sun
  mesh.name = 'terrain';
  return mesh;
}

// Distant terrain is squeezed toward you so it fits inside the camera's view distance and in
// front of the Sun and Earth sprites — keeping every point's TRUE direction and elevation angle
// (height scaled by the same factor). You can only walk ~240 m, so the tiny parallax is invisible.
const SQUEEZE_START = 1000;
const SQUEEZE_SPAN = 700; // everything ends up closer than 1,700 m
const squeeze = (r) => (r <= SQUEEZE_START ? r : SQUEEZE_START + SQUEEZE_SPAN * (1 - Math.exp(-(r - SQUEEZE_START) / 12000)));

/**
 * The REAL landscape around the base out to 45 km (LOLA 80 m map, Moon's curvature included):
 * Shackleton crater's bowl right next to the base, the ridges, and the far skyline beyond 45 km.
 */
export function createHorizon() {
  const group = new THREE.Group();
  group.name = 'horizon';
  const R0 = LAYOUT.TERRAIN_RADIUS;
  const az = 360;
  const radii = [];
  for (let k = 0; k <= 70; k++) radii.push(R0 * Math.pow(MID_MAX_M / R0, k / 70));
  const pos = [];
  const colors = [];
  const idx = [];
  for (const r of radii) {
    const f = squeeze(r) / r;
    for (let a = 0; a < az; a++) {
      const t = (a / az) * Math.PI * 2;
      const x = Math.sin(t) * r;
      const z = -Math.cos(t) * r;
      const y = r <= R0 + 1 ? heightAt(x, z) - 0.05 : realHeight(x, z);
      pos.push(x * f, y * f, z * f);
      const g = 0.5 - 0.12 * Math.min(1, r / 20000);
      colors.push(g, g * 0.985, g * 0.96);
    }
  }
  for (let k = 0; k < radii.length - 1; k++) {
    for (let a = 0; a < az; a++) {
      const p = k * az + a;
      const q = k * az + ((a + 1) % az);
      const rr = (k + 1) * az + a;
      const s = (k + 1) * az + ((a + 1) % az);
      idx.push(p, rr, q, q, rr, s);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  const land = new THREE.Mesh(geo, mat);
  land.receiveShadow = true;
  land.frustumCulled = false;
  group.add(land);

  // far skyline: mountains beyond 45 km, as seen from the base (real elevation angles)
  const RS = SQUEEZE_START + SQUEEZE_SPAN + 40;
  const n = 720;
  const sp = [];
  const si = [];
  const sc = [];
  for (let a = 0; a <= n; a++) {
    const azDeg = (a / n) * 360;
    const t = (azDeg * Math.PI) / 180;
    const top = Math.max(-3, farHorizonDeg(azDeg));
    const x = Math.sin(t) * RS;
    const z = -Math.cos(t) * RS;
    sp.push(x, Math.tan((top * Math.PI) / 180) * RS, z, x, Math.tan((-4 * Math.PI) / 180) * RS, z);
    sc.push(0.42, 0.415, 0.405, 0.3, 0.297, 0.29);
  }
  for (let a = 0; a < n; a++) si.push(a * 2, a * 2 + 1, a * 2 + 2, a * 2 + 2, a * 2 + 1, a * 2 + 3);
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  sg.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
  sg.setIndex(si);
  sg.computeVertexNormals();
  const skyline = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }));
  skyline.frustumCulled = false;
  group.add(skyline);
  return group;
}

/**
 * Scattered rocks (one InstancedMesh = one draw call).
 * Returns { mesh, colliders } — colliders are circles for the bigger boulders near the base.
 */
export function createRocks({ count = 260 } = {}) {
  const rand = mulberry32(42);
  // two rock shapes (one draw call each): a chunky icosahedron and a jittered dodecahedron
  const jagged = new THREE.DodecahedronGeometry(1, 0);
  const jp = jagged.attributes.position;
  const jr = mulberry32(7);
  for (let i = 0; i < jp.count; i++) {
    const k = 0.8 + jr() * 0.4;
    jp.setXYZ(i, jp.getX(i) * k, jp.getY(i) * (0.7 + jr() * 0.3), jp.getZ(i) * k);
  }
  jagged.computeVertexNormals();
  const meshes = [new THREE.IcosahedronGeometry(1, 0), jagged].map((g) => {
    const m = new THREE.InstancedMesh(g, MAT.rock(), count);
    m.castShadow = true;
    m.receiveShadow = true;
    m.count = 0;
    return m;
  });
  const group = new THREE.Group();
  group.add(...meshes);
  const dummy = new THREE.Object3D();
  const colliders = [];
  let placed = 0;
  let guard = 0;
  while (placed < count && guard++ < count * 20) {
    const r = 6 + Math.pow(rand(), 1.6) * 190;
    const a = rand() * Math.PI * 2;
    const x = Math.cos(a) * r + 0;
    const z = Math.sin(a) * r + 14;
    const mask = baseMask(x, z);
    const big = rand() < 0.12;
    if (mask > 0.15 && !(mask < 0.6 && !big && rand() < 0.3)) continue;
    const s = big ? 0.9 + rand() * 1.6 : 0.12 + rand() * rand() * 0.6;
    dummy.position.set(x, heightAt(x, z) - s * 0.35, z);
    dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3);
    dummy.scale.set(s * (0.8 + rand() * 0.5), s * (0.55 + rand() * 0.4), s * (0.8 + rand() * 0.5));
    dummy.updateMatrix();
    const target = meshes[placed % 2];
    target.setMatrixAt(target.count++, dummy.matrix);
    if (s > 0.7 && Math.hypot(x, z - 14) < 90) colliders.push({ type: 'circle', x, z, r: s * 0.95 });
    placed++;
  }
  for (const m of meshes) {
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }
  return { mesh: group, colliders };
}
