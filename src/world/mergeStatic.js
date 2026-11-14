// mergeStatic.js — merge the non-moving meshes of a building that share a material
// into one mesh per material (fewer draw calls). Meshes marked userData.dynamic,
// instanced meshes, sprites and multi-material meshes are left alone.
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

export function mergeStatic(group) {
  group.updateMatrixWorld(true);
  const toLocal = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map();
  const candidates = [];
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || o.userData.dynamic) return;
    let p = o.parent;
    while (p && p !== group) {
      if (p.userData.dynamic) return;
      p = p.parent;
    }
    candidates.push(o);
  });
  for (const m of candidates) {
    const key = `${m.material.uuid}|${m.castShadow}|${m.receiveShadow}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(m);
  }
  let before = 0;
  let after = 0;
  for (const meshes of buckets.values()) {
    before += meshes.length;
    if (meshes.length < 2) {
      after += 1;
      continue;
    }
    const geos = meshes.map((m) => {
      let g = m.geometry.clone();
      if (g.index === null) g = BufferGeometryUtils.mergeVertices(g);
      for (const name of Object.keys(g.attributes)) {
        if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
      }
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toLocal, m.matrixWorld));
      return g;
    });
    const merged = BufferGeometryUtils.mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) {
      after += meshes.length;
      continue;
    }
    const mesh = new THREE.Mesh(merged, meshes[0].material);
    mesh.castShadow = meshes[0].castShadow;
    mesh.receiveShadow = meshes[0].receiveShadow;
    mesh.matrixAutoUpdate = false;
    for (const m of meshes) m.removeFromParent();
    group.add(mesh);
    after += 1;
  }
  return { before, after };
}
