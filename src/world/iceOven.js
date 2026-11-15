// iceOven.js — the Ice Oven against the −Z wall of the habitat work bay (placeholder art).
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
  // The oven is built around its own centre with the window facing local −X, then turned
  // so the window faces +Z (into the bay).
  const body = new THREE.Group();
  body.position.set(x, 0, z);
  body.rotation.y = Math.PI / 2; // local −X → world +Z
  group.add(body);

  // body (0.9 wide, 0.95 deep) with a round window on the front
  body.add(mesh(rbox(0.95, 1.25, 0.9, 0.06), MAT.painted(0xe4e8ec), 0, FY + 0.625, 0));
  body.add(mesh(rbox(0.97, 0.12, 0.92, 0.03), MAT.darkMetal(), 0, FY + 1.3, 0));
  const glowMat = new THREE.MeshStandardMaterial({ color: 0x2a1a10, emissive: 0xff8a3d, emissiveIntensity: 0, roughness: 0.6 });
  const window = new THREE.Mesh(new THREE.CircleGeometry(0.27, 40), glowMat);
  window.position.set(-0.48, FY + 0.72, 0);
  window.rotation.y = -Math.PI / 2;
  body.add(window);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.035, 10, 40), MAT.metal());
  rim.position.copy(window.position);
  rim.rotation.y = -Math.PI / 2;
  body.add(rim);
  // cold plate on top (where the vapour freezes out as water)
  const plateMat = MAT.glow(0x9fe8ff, 0.4).clone();
  body.add(mesh(rbox(0.5, 0.06, 0.5, 0.02), plateMat, 0, FY + 1.4, 0, { cast: false }));
  const sign = createSign(['ICE OVEN', 'icy soil → water'], 1.1, 0.4, { accent: '#6fd8ff' });
  sign.position.set(-0.49, FY + 1.75, 0);
  sign.rotation.y = -Math.PI / 2;
  body.add(sign);
  // water pipe to the Electrolysis tank: up the back, along the wall above the screens,
  // then down the corner (out of the way of your head)
  const py = FY + 2.25;
  const pz = z - 0.3;
  const wx = 9.5; // just in front of the end wall
  const pm = MAT.accent();
  group.add(pipe(new THREE.Vector3(x, FY + 1.43, pz), new THREE.Vector3(x, py, pz), 0.035, pm));
  group.add(pipe(new THREE.Vector3(x, py, pz), new THREE.Vector3(wx, py, pz), 0.035, pm));
  group.add(pipe(new THREE.Vector3(wx, py, pz), new THREE.Vector3(wx, py, -0.7), 0.035, pm));
  group.add(pipe(new THREE.Vector3(wx, py, -0.7), new THREE.Vector3(wx, FY + 1.74, -0.7), 0.035, pm)); // into the tank

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

  // turned 90°: 0.9 along X, 0.95 along Z
  const obstacle = { type: 'box', minX: x - 0.47, maxX: x + 0.47, minZ: z - 0.5, maxZ: z + 0.5 };
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
