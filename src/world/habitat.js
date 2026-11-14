// habitat.js — the habitat module: exterior shell, airlock, and interior.
// createHabitatModel() builds all meshes (swap for a glTF later); createHabitat() adds
// gameplay data: colliders, the pressurized zone, interactables and lights.
import * as THREE from 'three';
import { MAT } from './materials.js';
import { LAYOUT } from './layout.js';
import { createSign } from './signs.js';
import { planarUV } from './textures.js';

const H = LAYOUT.HABITAT;

function shadowed(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

export function createHabitatModel() {
  const group = new THREE.Group();
  group.name = 'habitat';
  const R = H.radius;
  const L = H.length;

  // ---------- exterior ----------
  const shell = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 14, 1, true), MAT.hull()));
  shell.rotation.z = Math.PI / 2;
  shell.position.y = H.axisY;
  group.add(shell);
  for (const sx of [-1, 1]) {
    const cap = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(R + 0.12, R + 0.12, 0.5, 14), MAT.hullDark()));
    cap.rotation.z = Math.PI / 2;
    cap.position.set((sx * L) / 2, H.axisY, 0);
    group.add(cap);
    const dome = shadowed(
      new THREE.Mesh(new THREE.SphereGeometry(R, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), MAT.hull()),
    );
    dome.scale.set(1, 0.32, 1);
    dome.rotation.z = (-sx * Math.PI) / 2;
    dome.position.set((sx * (L + 0.5)) / 2, H.axisY, 0);
    group.add(dome);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.03, R + 0.03, 0.35, 14, 1, true), MAT.accent());
    band.rotation.z = Math.PI / 2;
    band.position.set(sx * (L / 2 - 1.2), H.axisY, 0);
    group.add(band);
  }
  // legs
  const legGeo = new THREE.BoxGeometry(0.3, H.axisY - R + 0.6, 0.3);
  for (const lx of [-4.5, 0, 4.5]) {
    for (const lz of [-1.6, 1.6]) {
      const leg = shadowed(new THREE.Mesh(legGeo, MAT.metal()));
      leg.position.set(lx, (H.axisY - R + 0.6) / 2, lz);
      group.add(leg);
    }
  }
  // round windows (glow from inside lights)
  const winGeo = new THREE.CircleGeometry(0.32, 10);
  for (const wx of [-3.2, -0.6]) {
    for (const sz of [-1, 1]) {
      const w = new THREE.Mesh(winGeo, MAT.glow(0xffe3a8, 1.8));
      const a = 0.35; // radians above the side
      w.position.set(wx, H.axisY + Math.sin(a) * (R + 0.01), sz * Math.cos(a) * (R + 0.01));
      w.lookAt(wx, H.axisY + Math.sin(a) * 5, sz * Math.cos(a) * 5);
      group.add(w);
    }
  }
  // antenna dish on top
  const mast = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 6), MAT.metal()));
  mast.position.set(-4, H.axisY + R + 0.5, 0);
  group.add(mast);
  const dish = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.35, 12, 1, true), MAT.hull()));
  dish.position.set(-4, H.axisY + R + 1.2, 0);
  dish.rotation.set(Math.PI * 0.75, 0, 0.3);
  group.add(dish);
  // name sign on the side facing the base
  const sign = createSign(['SHACKLETON STATION', 'HAB-1'], 3.6, 1.1);
  sign.position.set(-2.2, H.axisY + 0.5, R * 0.93 + 0.02);
  sign.rotation.x = -0.36;
  group.add(sign);

  // ---------- airlock (sticks out on the +Z side) ----------
  const A = H.airlock;
  const alDepth = A.zEnd - 1.6;
  const airlock = shadowed(new THREE.Mesh(new THREE.BoxGeometry(A.width, A.height, alDepth), MAT.hull()));
  airlock.position.set(A.x, H.floorY - 0.15 + A.height / 2, 1.6 + alDepth / 2);
  group.add(airlock);
  const alRoofBand = new THREE.Mesh(new THREE.BoxGeometry(A.width + 0.04, 0.22, alDepth + 0.04), MAT.accent());
  alRoofBand.position.set(A.x, H.floorY - 0.15 + A.height - 0.3, airlock.position.z);
  group.add(alRoofBand);
  // outer hatch
  const outerFrame = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.12), MAT.doorFrame());
  outerFrame.position.set(A.x, H.floorY + 1.05, A.zEnd + 0.02);
  group.add(outerFrame);
  const outerDoor = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.95, 0.14), MAT.door());
  outerDoor.position.set(A.x, H.floorY + 1.02, A.zEnd + 0.05);
  group.add(outerDoor);
  const doorLamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.12), MAT.glow(0x6fe9ff, 3));
  doorLamp.position.set(A.x, H.floorY + 2.3, A.zEnd + 0.08);
  group.add(doorLamp);
  const alSign = createSign('AIRLOCK', 1.2, 0.36);
  alSign.position.set(A.x, H.floorY + 2.62, A.zEnd + 0.04);
  group.add(alSign);
  // ramp down to the ground
  const rampLen = Math.hypot(1.6, H.floorY - 0.15);
  const ramp = shadowed(new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, rampLen), MAT.metal()));
  ramp.position.set(A.x, (H.floorY - 0.15) / 2, A.zEnd + 0.8);
  ramp.rotation.x = Math.atan2(H.floorY - 0.15, 1.6);
  group.add(ramp);

  // ---------- interior ----------
  const ri = H.innerRadius;
  const lining = shadowed(
    new THREE.Mesh(new THREE.CylinderGeometry(ri, ri, L - 0.2, 14, 1, true), MAT.habitatWall()),
    false,
    true,
  );
  lining.rotation.z = Math.PI / 2;
  lining.position.y = H.axisY;
  group.add(lining);
  for (const sx of [-1, 1]) {
    const end = shadowed(new THREE.Mesh(new THREE.CircleGeometry(ri, 14), MAT.interiorPanel()), false, true);
    end.rotation.y = (sx * -Math.PI) / 2;
    end.position.set((sx * (L - 0.2)) / 2, H.axisY, 0);
    group.add(end);
  }
  const floorHalfW = Math.sqrt(ri * ri - (H.axisY - H.floorY) ** 2);
  const floor = shadowed(new THREE.Mesh(planarUV(new THREE.BoxGeometry(L - 0.2, 0.1, floorHalfW * 2), 'xz', 1), MAT.floor()), false, true);
  floor.position.set(0, H.floorY - 0.05, 0);
  group.add(floor);
  // floor stripe (guides to the airlock)
  const stripe = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 0.18), MAT.accent());
  stripe.rotation.x = -Math.PI / 2;
  stripe.position.set(-1.5, H.floorY + 0.006, 0);
  group.add(stripe);
  // ceiling light strip
  const strip = new THREE.Mesh(new THREE.BoxGeometry(9, 0.06, 0.35), MAT.glow(0xfff4dc, 3.5));
  strip.position.set(0, H.axisY + ri - 0.08, 0);
  group.add(strip);

  // bunk (−X end, −Z side)
  const bunk = shadowed(new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.5, 0.95), MAT.interiorPanel()));
  bunk.position.set(-4.4, H.floorY + 0.25, -1.25);
  group.add(bunk);
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(2, 0.16, 0.85), MAT.fabric());
  mattress.position.set(-4.4, H.floorY + 0.58, -1.25);
  group.add(mattress);
  // table + bench
  const table = shadowed(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.8), MAT.hullDark()));
  table.position.set(-0.8, H.floorY + 0.78, -1.3);
  group.add(table);
  const tableLeg = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.74, 0.1), MAT.metal()));
  tableLeg.position.set(-0.8, H.floorY + 0.37, -1.3);
  group.add(tableLeg);
  // lockers on the +Z wall (left of airlock hatch)
  for (let i = 0; i < 3; i++) {
    const locker = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.9, 0.45), MAT.interiorPanel()));
    locker.position.set(-1.3 - i * 0.8, H.floorY + 0.95, 1.45);
    group.add(locker);
    const tag = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.02), MAT.accent());
    tag.position.set(-1.3 - i * 0.8, H.floorY + 1.6, 1.22);
    group.add(tag);
  }
  // inner airlock hatch (+Z wall)
  const innerFrame = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.1), MAT.doorFrame());
  innerFrame.position.set(H.innerDoor.x, H.floorY + 1.1, H.innerDoor.z + 0.02);
  group.add(innerFrame);
  const innerDoor = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.95, 0.1), MAT.door());
  innerDoor.position.set(H.innerDoor.x, H.floorY + 1.02, H.innerDoor.z - 0.02);
  group.add(innerDoor);
  const exitSign = createSign(['EXIT', 'to surface'], 1.0, 0.42, { bg: '#0b3b2a', accent: '#4be38a' });
  exitSign.position.set(H.innerDoor.x, H.floorY + 2.42, H.innerDoor.z - 0.1);
  exitSign.rotation.y = Math.PI;
  group.add(exitSign);

  // electrolysis unit (−X end wall) — hook for the future lesson
  const elx = -5.15;
  const unit = new THREE.Group();
  const cabinet = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.6, 1.6), MAT.interiorPanel()));
  cabinet.position.set(0, 0.8, 0);
  unit.add(cabinet);
  const tankGeo = new THREE.CylinderGeometry(0.22, 0.22, 1.2, 10);
  const waterTank = shadowed(new THREE.Mesh(tankGeo, MAT.glow(0x2f7fd8)));
  waterTank.position.set(0.15, 0.95, 0.55);
  unit.add(waterTank);
  const o2Tank = shadowed(new THREE.Mesh(tankGeo, MAT.glow(0x9fe8ff)));
  o2Tank.position.set(0.15, 0.95, -0.55);
  unit.add(o2Tank);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.36), MAT.glow(0x38d9f5, 1.6));
  screen.position.set(0.41, 1.25, 0);
  screen.rotation.y = Math.PI / 2;
  unit.add(screen);
  const elSign = createSign(['ELECTROLYSIS', 'water → oxygen'], 1.3, 0.48);
  elSign.position.set(0.42, 1.95, 0);
  elSign.rotation.y = Math.PI / 2;
  unit.add(elSign);
  unit.position.set(elx, H.floorY, 0);
  group.add(unit);

  group.position.set(H.x, 0, H.z);
  return { group, doorLamp };
}

export function createHabitat() {
  const model = createHabitatModel();
  const lights = [];
  for (const lx of [-3, 2.5]) {
    const p = new THREE.PointLight(0xfff0d8, 6, 9, 2);
    p.position.set(lx, H.axisY + 1.6, 0); // local to the habitat group
    lights.push(p);
    model.group.add(p);
  }

  const I = H.interior;
  const toWorld = (p) => ({ x: H.x + p.x, z: H.z + p.z, yawDeg: p.yawDeg });
  return {
    object: model.group,
    lights,
    outdoorColliders: [
      { type: 'box', minX: H.x - H.length / 2 - 0.6, maxX: H.x + H.length / 2 + 0.6, minZ: H.z - H.radius, maxZ: H.z + H.radius },
      // airlock + upper part of the ramp
      { type: 'box', minX: H.airlock.x - 1.35, maxX: H.airlock.x + 1.35, minZ: H.z + 1.6, maxZ: H.z + H.airlock.zEnd + 0.9 },
    ],
    zone: {
      id: 'habitat',
      name: 'Habitat',
      pressurized: true,
      floorY: H.floorY,
      ceilingY: I.ceilingY,
      rect: { minX: H.x + I.minX, maxX: H.x + I.maxX, minZ: H.z + I.minZ, maxZ: H.z + I.maxZ },
      obstacles: [
        { type: 'box', minX: -5.5, maxX: -3.35, minZ: -1.85, maxZ: -0.75 }, // bunk
        { type: 'box', minX: -5.7, maxX: -4.7, minZ: -0.85, maxZ: 0.85 }, // electrolysis unit
        { type: 'box', minX: -3.8, maxX: -0.9, minZ: 1.2, maxZ: 1.85 }, // lockers
        { type: 'box', minX: -1.5, maxX: -0.1, minZ: -1.85, maxZ: -0.9 }, // table
      ],
    },
    interactables: [
      {
        id: 'hab-inner-door',
        zone: 'habitat',
        x: H.x + H.innerDoor.x,
        z: H.z + H.innerDoor.z - 0.5,
        y: H.floorY + 1.1,
        prompt: 'Press E to exit to the surface',
        action: { type: 'door', to: 'outside', arrive: toWorld(H.outsideArrive), via: 'airlock' },
      },
      {
        id: 'hab-outer-door',
        zone: 'outside',
        x: H.x + H.outerDoor.x,
        z: H.z + H.outerDoor.z - 0.3,
        y: 1.0,
        prompt: 'Press E to enter the Habitat',
        action: { type: 'door', to: 'habitat', arrive: toWorld(H.insideArrive), via: 'airlock' },
      },
      {
        id: 'electrolysis',
        zone: 'habitat',
        x: H.x - 4.6,
        z: H.z,
        y: H.floorY + 1.1,
        prompt: 'Press E to use the Electrolysis unit',
        action: {
          type: 'station',
          station: 'electrolysis',
          toast: 'Coming soon: Electrolysis lesson! This machine will use electricity to split water into oxygen and hydrogen — that is how you will refill the oxygen supply.',
        },
      },
    ],
  };
}
