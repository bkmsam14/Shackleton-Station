// plants.js — leafy plant geometry (smooth, rounded leaves instead of faceted blobs).
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from './heightfield.js';

/** One leaf: a cupped, pointed oval, base at the origin, pointing +Y. */
export function leafGeometry(length = 0.5, width = 0.18, cup = 0.05, segments = 8) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(width * 0.9, length * 0.2, width * 0.7, length * 0.8, 0, length);
  s.bezierCurveTo(-width * 0.7, length * 0.8, -width * 0.9, length * 0.2, 0, 0);
  const g = new THREE.ShapeGeometry(s, segments);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    // cup across the leaf and arch along it
    p.setZ(i, (x / width) ** 2 * cup * 4 - Math.sin((y / length) * Math.PI) * cup);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * A rosette of leaves around the Y axis (lettuce, herbs, house plants).
 * Returns one merged BufferGeometry with a light-centre → darker-tip colour gradient.
 */
export function rosetteGeometry({ leaves = 10, length = 0.3, width = 0.14, tilt = 0.9, rings = 2, seed = 1, cup = 0.04, segments = 8 } = {}) {
  const rand = mulberry32(seed);
  const parts = [];
  for (let r = 0; r < rings; r++) {
    const n = Math.max(3, Math.round(leaves * (1 - r * 0.35)));
    const len = length * (1 - r * 0.3);
    for (let i = 0; i < n; i++) {
      const g = leafGeometry(len * (0.85 + rand() * 0.3), width * (0.85 + rand() * 0.3), cup, segments);
      g.rotateX(-(tilt - r * 0.35) + (rand() - 0.5) * 0.25); // lean outward (inner rings more upright)
      g.rotateY((i / n) * Math.PI * 2 + r * 0.4 + rand() * 0.3);
      parts.push(g);
    }
  }
  const merged = BufferGeometryUtils.mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  // colour: pale near the base, deeper green at the tips
  const p = merged.attributes.position;
  const col = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const d = Math.min(1, Math.hypot(p.getX(i), p.getY(i), p.getZ(i)) / length);
    // natural, vibrant green (graphics overhaul): fresh lime at the base, deep leaf green at the tips
    c.setRGB(0.66 - d * 0.42, 0.93 - d * 0.3, 0.42 - d * 0.28, THREE.SRGBColorSpace);
    col.set([c.r, c.g, c.b], i * 3);
  }
  merged.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return merged;
}

/** Potted plant (pot + soil + rosette). Origin at the floor. */
export function pottedPlant({ potR = 0.22, potH = 0.4, size = 0.6, seed = 3, potMat, leafMat, soilMat }) {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(potR, potR * 0.78, potH, 28), potMat);
  pot.position.y = potH / 2;
  pot.castShadow = true;
  pot.receiveShadow = true;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(potR, 0.025, 8, 28), potMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = potH;
  const soil = new THREE.Mesh(new THREE.CircleGeometry(potR * 0.95, 24), soilMat);
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = potH - 0.03;
  const leaves = new THREE.Mesh(
    rosetteGeometry({ leaves: 9, length: size, width: size * 0.32, tilt: 0.55, rings: 3, seed, cup: size * 0.08 }),
    leafMat,
  );
  leaves.position.y = potH - 0.02;
  leaves.castShadow = true;
  g.add(pot, rim, soil, leaves);
  return g;
}
