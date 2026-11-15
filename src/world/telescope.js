// telescope.js — the outdoor telescope on a small rise north-east of the habitat
// (placeholder art in the smooth, bevelled style). Press E → the Star Hunt instance.
import * as THREE from 'three';
import { LAYOUT } from './layout.js';
import { heightAt } from './heightfield.js';
import { MAT } from './materials.js';
import { createSign } from './signs.js';
import { rbox, mesh } from './details.js';

export function createTelescope() {
  const T = LAYOUT.TELESCOPE;
  const y0 = heightAt(T.x, T.z);
  const group = new THREE.Group();
  group.name = 'telescope';
  group.position.set(T.x, y0, T.z);

  // pier + tripod feet
  group.add(mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.25, 20), MAT.metal(), 0, 0.62, 0));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const foot = mesh(rbox(0.9, 0.08, 0.14, 0.03), MAT.darkMetal(), Math.cos(a) * 0.38, 0.04, Math.sin(a) * 0.38);
    foot.rotation.y = -a;
    group.add(foot);
  }
  // fork mount
  const mount = new THREE.Group();
  mount.position.y = 1.3;
  mount.add(mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 24), MAT.darkMetal(), 0, 0, 0));
  for (const side of [-1, 1]) mount.add(mesh(rbox(0.08, 0.5, 0.16, 0.03), MAT.painted(0xb8c0ca), side * 0.26, 0.25, 0));
  // tube (pointing up toward the southern sky)
  const tube = new THREE.Group();
  tube.position.y = 0.45;
  tube.rotation.x = 0.8; // tilted up and away from where you stand (toward the southern sky)
  tube.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.5, 32, 1, false), MAT.painted(0xc9d0d8), 0, 0.2, 0));
  tube.add(mesh(new THREE.CylinderGeometry(0.215, 0.215, 0.12, 32), MAT.accent(), 0, 0.85, 0)); // orange dew cap ring
  tube.add(mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 32), MAT.glow(0x2a5d8a, 0.6), 0, 0.96, 0, { cast: false })); // lens
  tube.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 12), MAT.darkMetal(), 0.24, 0.1, 0)); // finder scope
  tube.add(mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.18, 12), MAT.darkMetal(), 0, -0.6, 0)); // eyepiece / camera
  mount.add(tube);
  group.add(mount);
  // little display + sign
  const sign = createSign(['TELESCOPE', 'real stars · Star Hunt'], 1.5, 0.5, { accent: '#ffd43b' });
  sign.position.set(0, 1.1, 0.75);
  sign.rotation.y = (T.signYawDeg * Math.PI) / 180;
  const post = mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.0, 10), MAT.metal(), 0, 0.5, 0.75);
  group.add(post, sign);

  return {
    object: group,
    colliders: [{ type: 'circle', x: T.x, z: T.z, r: 0.75 }],
    interactable: {
      id: 'telescope',
      zone: 'outside',
      x: T.x,
      z: T.z + 1.3,
      y: y0 + 1.2,
      prompt: 'Press E to use the telescope',
      action: { type: 'station', station: 'telescope' },
    },
  };
}
