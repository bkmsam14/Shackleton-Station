// props.js — small outdoor details: guide lamps along the paths, power cable.
import * as THREE from 'three';
import { MAT } from './materials.js';
import { LAYOUT } from './layout.js';
import { heightAt } from './heightfield.js';

export function createPathLights() {
  const pts = LAYOUT.PATH_LIGHTS;
  const group = new THREE.Group();
  group.name = 'pathLights';
  const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.07, 0.9, 6), MAT.metal(), pts.length);
  const caps = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 0.12, 0.18), MAT.glow(0x6fe9ff), pts.length);
  posts.castShadow = true;
  const m = new THREE.Matrix4();
  pts.forEach(([x, z], i) => {
    const y = heightAt(x, z);
    posts.setMatrixAt(i, m.makeTranslation(x, y + 0.45, z));
    caps.setMatrixAt(i, m.makeTranslation(x, y + 0.96, z));
  });
  group.add(posts, caps);
  return group;
}

/** Cable lying on the ground from the solar array to the habitat. */
export function createPowerCable() {
  const A = LAYOUT.SOLAR_ARRAY;
  const H = LAYOUT.HABITAT;
  const pts = [];
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = A.x + (H.x - 6.4 - A.x) * t;
    const z = A.z + (H.z - A.z) * t + Math.sin(t * Math.PI) * 3;
    pts.push(new THREE.Vector3(x, heightAt(x, z) + 0.06, z));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.05, 5, false), MAT.accent());
  mesh.receiveShadow = true;
  return mesh;
}
