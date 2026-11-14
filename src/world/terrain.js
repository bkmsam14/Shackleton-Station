// terrain.js — low-poly regolith ground, far hills ring, rocks.
import * as THREE from 'three';
import { heightAt, baseMask, mulberry32 } from './heightfield.js';
import { LAYOUT } from './layout.js';
import { SKY } from '../config/gameplay.js';
import { MAT } from './materials.js';
import { pbrSet } from './textures.js';

const REGOLITH_TILE_M = 5; // one regolith texture tile = 5 m

function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Grid denser near the base: u in [−1,1] → metres. */
function warp(u, half) {
  return half * (0.32 * u + 0.68 * u * u * u);
}

export function createTerrain({ segments = 220 } = {}) {
  const half = LAYOUT.TERRAIN_SIZE / 2;
  const geo = new THREE.PlaneGeometry(2, 2, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = warp(pos.getX(i), half);
    const z = warp(pos.getZ(i), half);
    const y = heightAt(x, z);
    pos.setXYZ(i, x, y, z);
    // subtle grey variation; bulldozed pad is a touch darker
    const n = (Math.sin(x * 0.37 + z * 0.11) + Math.sin(z * 0.29 - x * 0.07)) * 0.025;
    const pad = baseMask(x, z) * -0.05;
    // the regolith texture carries the albedo; vertex colour only adds gentle variation
    const g = 1.0 + (n + pad + Math.max(-0.06, Math.min(0.06, y * 0.012))) * 1.8;
    c.setRGB(g, g * 0.985, g * 0.96, THREE.SRGBColorSpace);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  // world-space UVs so the regolith texture tiles evenly despite the warped grid
  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uvs[i * 2] = pos.getX(i) / REGOLITH_TILE_M;
    uvs[i * 2 + 1] = pos.getZ(i) / REGOLITH_TILE_M;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();

  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    flatShading: false,
    ...pbrSet('regolith', { parts: ['map', 'normal', 'orm'] }),
  });
  mat.normalScale.set(1.2, 1.2); // fine regolith detail on top of the low-poly shape
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = true; // crater rims cast long shadows at a low Sun
  mesh.name = 'terrain';
  return mesh;
}

/** Height of the far hills (above local ground) for a given azimuth. */
export function horizonHillHeight(azDeg) {
  const a = (azDeg * Math.PI) / 180;
  const rolling =
    2.4 + 1.1 * Math.sin(a * 3 + 0.7) + 0.7 * Math.sin(a * 7 + 2.1) + 0.4 * Math.sin(a * 13 + 4.2);
  // The ridge that hides the low Sun for part of its loop (see daycycle.sunVisibility).
  const start = SKY.RIDGE_START_AZIMUTH_DEG;
  const end = SKY.RIDGE_END_AZIMUTH_DEG;
  const width = (end - start + 360) % 360;
  const centre = start + width / 2;
  let d = Math.abs((((azDeg - centre) % 360) + 540) % 360 - 180);
  const ridge = 1 - smoothstep(width / 2 - 2, width / 2 + 5, d);
  const peaks = 0.85 + 0.15 * Math.sin(a * 23);
  return rolling + ridge * 34 * peaks;
}

export function createHorizon() {
  const { innerRadius, outerRadius, segments } = LAYOUT.HORIZON;
  const rows = 7;
  const verts = [];
  const colors = [];
  const idx = [];
  for (let s = 0; s <= segments; s++) {
    const az = (s / segments) * 360;
    const a = (az * Math.PI) / 180;
    const dx = Math.sin(a);
    const dz = -Math.cos(a);
    const hill = horizonHillHeight(az);
    for (let r = 0; r <= rows; r++) {
      const t = r / rows;
      const radius = innerRadius + (outerRadius - innerRadius) * t;
      const x = dx * radius;
      const z = dz * radius;
      const ground = heightAt(dx * innerRadius, dz * innerRadius);
      // rise from below the terrain edge up to the crest, then fall off behind
      const profile = smoothstep(0.05, 0.45, t) * (1 - 0.35 * smoothstep(0.6, 1, t));
      const y = ground - 0.8 + profile * (hill + 0.8) + (r === rows ? -30 : 0);
      verts.push(x, y, z);
      const g = 0.42 + 0.08 * profile;
      colors.push(g, g * 0.985, g * 0.96);
    }
  }
  for (let s = 0; s < segments; s++) {
    for (let r = 0; r < rows; r++) {
      const a = s * (rows + 1) + r;
      const b = (s + 1) * (rows + 1) + r;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 1,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'horizon';
  return mesh;
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
