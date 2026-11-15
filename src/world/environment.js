// environment.js — image-based lighting (PMREM) so metal surfaces reflect something.
//  • indoor:  RoomEnvironment (a soft, evenly lit room) for the habitat and greenhouse
//  • outdoor: a "Moon" environment — black sky above (no atmosphere), grey regolith
//             below — so outdoor metal reflects the ground, never a blue sky or a room.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

function moonEnvironmentScene() {
  const scene = new THREE.Scene();
  const geo = new THREE.SphereGeometry(10, 48, 24);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 10; // −1 (down) … 1 (up)
    // ground: sunlit grey regolith brightest near the horizon; sky: black
    const ground = y < 0 ? 0.32 * (1 - Math.min(1, -y) * 0.45) : 0;
    const horizon = Math.max(0, 1 - Math.abs(y) * 14) * 0.18; // bright rim of sunlit hills
    const v = Math.max(ground, horizon);
    c.setRGB(v, v * 0.98, v * 0.95, THREE.SRGBColorSpace);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  return scene;
}

export function createEnvironments(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const indoor = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  const moon = moonEnvironmentScene();
  const outdoor = pmrem.fromScene(moon, 0.02).texture;
  moon.traverse((o) => {
    o.geometry?.dispose();
    o.material?.dispose();
  });
  pmrem.dispose();
  return { indoor, outdoor };
}

// How strongly the environment lights each zone (scene.environmentIntensity).
// Graphics overhaul: more indoor reflection, so painted metal and floor plates read as
// clean, softly reflective surfaces.
export const ENV_INTENSITY = {
  outside: 1.0, // brighter ground reflection outside (was 0.6; readability)
  habitat: 0.42,
  greenhouse: 0.3,
};
