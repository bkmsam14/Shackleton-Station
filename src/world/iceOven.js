// iceOven.js — the Ice Oven in the habitat work bay, beside Electrolysis (placeholder art).
// It heats icy soil; the ice turns to vapour, a cold plate catches it as water, and a pipe
// carries the water to the Electrolysis tank. Glows and steams while it bakes.
import * as THREE from 'three';
import { LAYOUT } from './layout.js';
import { MAT } from './materials.js';
import { createSign } from './signs.js';
import { rbox, mesh, pipe } from './details.js';

export function createIceOven(habitat) {
  const H = LAYOUT.HABITAT;
  const O = LAYOUT.ICE_OVEN;
  const FY = H.floorY;
  const x = H.x + O.x;
  const z = H.z + O.z;
  const group = new THREE.Group();
  group.name = 'iceOven';

  // body (0.9 wide along Z, 0.95 deep along X) with a round window facing −X (into the bay)
  group.add(mesh(rbox(0.95, 1.25, 0.9, 0.06), MAT.painted(0xe4e8ec), x, FY + 0.625, z));
  group.add(mesh(rbox(0.97, 0.12, 0.92, 0.03), MAT.darkMetal(), x, FY + 1.3, z));
  const glowMat = new THREE.MeshStandardMaterial({ color: 0x2a1a10, emissive: 0xff8a3d, emissiveIntensity: 0, roughness: 0.6 });
  const window = new THREE.Mesh(new THREE.CircleGeometry(0.27, 40), glowMat);
  window.position.set(x - 0.48, FY + 0.72, z);
  window.rotation.y = -Math.PI / 2;
  group.add(window);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.035, 10, 40), MAT.metal());
  rim.position.copy(window.position);
  rim.rotation.y = -Math.PI / 2;
  group.add(rim);
  // cold plate on top (where the vapour freezes out as water)
  const plateMat = MAT.glow(0x9fe8ff, 0.4).clone();
  group.add(mesh(rbox(0.5, 0.06, 0.5, 0.02), plateMat, x, FY + 1.4, z, { cast: false }));
  // water pipe to the Electrolysis unit (next to it, toward z = 0)
  group.add(pipe(new THREE.Vector3(x + 0.3, FY + 1.4, z + 0.2), new THREE.Vector3(x + 0.3, FY + 1.4, -0.75), 0.035, MAT.accent()));
  const sign = createSign(['ICE OVEN', 'icy soil → water'], 1.1, 0.4, { accent: '#6fd8ff' });
  sign.position.set(x - 0.49, FY + 1.75, z);
  sign.rotation.y = -Math.PI / 2;
  group.add(sign);

  // steam puffs (a few soft sprites that rise and fade while baking)
  const puffTex = (() => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    grd.addColorStop(0, 'rgba(255,255,255,0.9)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cv);
  })();
  const puffs = [];
  for (let i = 0; i < 5; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, opacity: 0, depthWrite: false }));
    sp.scale.setScalar(0.3);
    sp.userData.phase = i / 5;
    group.add(sp);
    puffs.push(sp);
  }

  habitat.interior.add(group); // shown only when you are in the habitat

  const obstacle = { type: 'box', minX: x - 0.5, maxX: x + 0.5, minZ: z - 0.48, maxZ: z + 0.48 };
  const interactable = {
    id: 'ice-oven',
    zone: 'habitat',
    x: H.x + O.use.x,
    z: H.z + O.use.z,
    y: FY + 1.0,
    prompt: 'Press E to use the Ice Oven',
    action: { type: 'station', station: 'ice-oven' },
  };

  let t = 0;
  let heat = 0;
  return {
    obstacle,
    interactable,
    /** baking: is the oven running? */
    update(dt, baking) {
      t += dt;
      heat += ((baking ? 1 : 0) - heat) * Math.min(1, dt * 2);
      glowMat.emissiveIntensity = heat * (1.4 + Math.sin(t * 3) * 0.2);
      plateMat.emissiveIntensity = 0.4 + heat * 1.2;
      for (const p of puffs) {
        const k = (t * 0.45 + p.userData.phase) % 1;
        p.position.set(x + Math.sin(k * 6 + p.userData.phase * 9) * 0.08, FY + 1.5 + k * 0.7, z + Math.cos(k * 5) * 0.08);
        p.material.opacity = heat * 0.5 * Math.sin(k * Math.PI);
        p.scale.setScalar(0.2 + k * 0.35);
      }
    },
  };
}
