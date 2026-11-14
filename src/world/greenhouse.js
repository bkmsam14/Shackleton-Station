// greenhouse.js — arched greenhouse module with grow racks under red + blue LEDs.
// createGreenhouseModel() builds all meshes (swap for a glTF later); createGreenhouse()
// adds gameplay data: colliders, the pressurized zone, interactables, lights.
import * as THREE from 'three';
import { MAT } from './materials.js';
import { LAYOUT } from './layout.js';
import { createSign } from './signs.js';
import { mulberry32 } from './heightfield.js';

const G = LAYOUT.GREENHOUSE;
const LED_PINK = 0xd36bff; // what red + blue LED light looks like mixed together

function shadowed(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

/** Half-cylinder arch along X, centred on the origin, resting on y = 0. */
function archGeometry(radius, length, segments, open = true) {
  const g = new THREE.CylinderGeometry(radius, radius, length, segments, 1, open, 0, Math.PI);
  g.rotateZ(Math.PI / 2); // axis → X; theta 0..π becomes the upper half (y ≥ 0)
  return g;
}

export function createGreenhouseModel() {
  const group = new THREE.Group();
  group.name = 'greenhouse';
  const R = G.radius;
  const L = G.length;
  const fy = G.floorY;

  // ---------- exterior ----------
  const slab = shadowed(new THREE.Mesh(new THREE.BoxGeometry(L + 0.6, 0.3, R * 2 + 0.6), MAT.darkMetal()), false, true);
  slab.position.set(L / 2, 0.0, 0);
  group.add(slab);
  const skin = shadowed(new THREE.Mesh(archGeometry(R, L, 16), MAT.greenhouseSkin()));
  skin.position.set(L / 2, fy, 0);
  group.add(skin);
  // pink skylight along the ridge (LED glow visible from outside — good for finding it)
  const skyGeo = new THREE.CylinderGeometry(R + 0.03, R + 0.03, L - 1.2, 16, 1, true, Math.PI / 2 - 0.22, 0.44);
  skyGeo.rotateZ(Math.PI / 2);
  const skylight = new THREE.Mesh(skyGeo, MAT.glow(0xe08cff));
  skylight.userData.dynamic = true; // switches off when base power runs out
  skylight.position.set(L / 2, fy, 0);
  group.add(skylight);
  // ribs
  const ribGeo = new THREE.TorusGeometry(R + 0.06, 0.07, 4, 16, Math.PI);
  ribGeo.rotateY(Math.PI / 2);
  for (let x = 0; x <= L + 0.01; x += 2) {
    const rib = shadowed(new THREE.Mesh(ribGeo, MAT.metal()));
    rib.position.set(x, fy, 0);
    group.add(rib);
  }
  // end caps (half discs)
  for (const end of [0, L]) {
    const cap = shadowed(new THREE.Mesh(new THREE.CircleGeometry(R, 16, 0, Math.PI), MAT.greenhouseSkin()));
    cap.rotation.y = end === 0 ? -Math.PI / 2 : Math.PI / 2;
    cap.position.set(end, fy, 0);
    group.add(cap);
  }
  // vestibule with the outer door (−X end)
  const V = G.vestibule;
  const vLen = V.xEnd - V.xStart;
  const vest = shadowed(new THREE.Mesh(new THREE.BoxGeometry(vLen, V.height, V.width), MAT.hull()));
  vest.position.set(V.xStart + vLen / 2, fy + V.height / 2, 0);
  group.add(vest);
  const vBand = new THREE.Mesh(new THREE.BoxGeometry(vLen + 0.04, 0.22, V.width + 0.04), MAT.accent());
  vBand.position.set(vest.position.x, fy + V.height - 0.3, 0);
  group.add(vBand);
  const oFrame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 1.4), MAT.doorFrame());
  oFrame.position.set(V.xStart - 0.02, fy + 1.1, 0);
  group.add(oFrame);
  const oDoor = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.95, 1.1), MAT.door());
  oDoor.position.set(V.xStart - 0.05, fy + 1.02, 0);
  group.add(oDoor);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.5), MAT.glow(0x6fe9ff));
  lamp.position.set(V.xStart - 0.08, fy + 2.3, 0);
  group.add(lamp);
  const sign = createSign('GREENHOUSE', 1.6, 0.42, { accent: '#d36bff' });
  sign.position.set(V.xStart - 0.04, fy + 2.62, 0);
  sign.rotation.y = -Math.PI / 2;
  group.add(sign);

  // ---------- interior ----------
  const ri = R - 0.15;
  const lining = shadowed(new THREE.Mesh(archGeometry(ri, L - 0.2, 16), MAT.interiorWall()), false, true);
  lining.position.set(L / 2, fy, 0);
  group.add(lining);
  for (const end of [0.1, L - 0.1]) {
    const cap = shadowed(new THREE.Mesh(new THREE.CircleGeometry(ri, 16, 0, Math.PI), MAT.interiorPanel()), false, true);
    cap.rotation.y = end < 1 ? Math.PI / 2 : -Math.PI / 2;
    cap.position.set(end, fy, 0);
    group.add(cap);
  }
  const floor = shadowed(new THREE.Mesh(new THREE.BoxGeometry(L - 0.2, 0.06, ri * 2), MAT.floor()), false, true);
  floor.position.set(L / 2, fy + 0.03, 0);
  group.add(floor);
  // inner door (west end)
  const iFrame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.2, 1.4), MAT.doorFrame());
  iFrame.position.set(0.12, fy + 1.1, 0);
  group.add(iFrame);
  const iDoor = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.95, 1.1), MAT.door());
  iDoor.position.set(0.16, fy + 1.0, 0);
  group.add(iDoor);
  const exitSign = createSign(['EXIT', 'to surface'], 1.0, 0.42, { bg: '#0b3b2a', accent: '#4be38a' });
  exitSign.position.set(0.2, fy + 2.4, 0);
  exitSign.rotation.y = Math.PI / 2;
  group.add(exitSign);

  // ---------- grow racks ----------
  const rackRuns = [
    [2.2, 7.4],
    [8.6, 13.8],
  ];
  const shelfYs = [0.3, 0.85, 1.4];
  const sides = [-1, 1];
  const rackDepth = 1.0;
  const rackZ = 1.75; // centre of each rack from the aisle centre
  const rand = mulberry32(5);
  const plantSlots = [];
  const frameGeo = new THREE.BoxGeometry(0.06, 1.9, 0.06);
  const shelfGeo = new THREE.BoxGeometry(1, 0.05, rackDepth);
  const trayGeo = new THREE.BoxGeometry(1, 0.1, rackDepth - 0.15);
  const ledGeo = new THREE.BoxGeometry(1, 0.03, 0.06);
  for (const [x0, x1] of rackRuns) {
    const len = x1 - x0;
    const cx = (x0 + x1) / 2;
    for (const s of sides) {
      const z = s * rackZ;
      for (const px of [x0, cx, x1]) {
        for (const pz of [z - rackDepth / 2, z + rackDepth / 2]) {
          const post = shadowed(new THREE.Mesh(frameGeo, MAT.rackFrame()), true, false);
          post.position.set(px, fy + 0.95, pz);
          group.add(post);
        }
      }
      for (const sy of shelfYs) {
        const shelf = shadowed(new THREE.Mesh(shelfGeo, MAT.rackFrame()), false, true);
        shelf.scale.x = len;
        shelf.position.set(cx, fy + sy, z);
        group.add(shelf);
        const tray = new THREE.Mesh(trayGeo, MAT.soil());
        tray.scale.x = len - 0.1;
        tray.position.set(cx, fy + sy + 0.075, z);
        group.add(tray);
        // LED bar above the shelf: one red strip + one blue strip
        for (const [col, dz] of [
          [0xff3b5c, -0.08],
          [0x4a6bff, 0.08],
        ]) {
          const led = new THREE.Mesh(ledGeo, MAT.glow(col));
          led.scale.x = len - 0.2;
          led.position.set(cx, fy + sy + 0.45, z + dz);
          group.add(led);
        }
        const n = Math.round(len / 0.5);
        for (let i = 0; i < n; i++) {
          for (const dz of [-0.22, 0.22]) {
            plantSlots.push([x0 + 0.25 + i * (len / n), fy + sy + 0.2, z + dz, 0.16 + rand() * 0.1]);
          }
        }
      }
    }
  }
  // all plants = one InstancedMesh (one draw call)
  const plants = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), MAT.plant(), plantSlots.length);
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  plantSlots.forEach(([x, y, z, s], i) => {
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, rand() * 6, 0);
    dummy.scale.set(s, s * (0.7 + rand() * 0.5), s);
    dummy.updateMatrix();
    plants.setMatrixAt(i, dummy.matrix);
    col.setHSL(0.28 + rand() * 0.08, 0.55, 0.32 + rand() * 0.12, THREE.SRGBColorSpace);
    plants.setColorAt(i, col);
  });
  plants.instanceMatrix.needsUpdate = true;
  plants.instanceColor.needsUpdate = true;
  plants.castShadow = false;
  group.add(plants);

  const rackSign = createSign(['GROW RACKS', 'red + blue light'], 1.4, 0.5, { accent: '#d36bff' });
  rackSign.position.set(7.95, fy + 2.15, 0);
  rackSign.rotation.y = -Math.PI / 2;
  group.add(rackSign);

  group.position.set(G.x - L / 2, 0, G.z);
  return { group, skylight };
}

export function createGreenhouse() {
  const model = createGreenhouseModel();
  const L = G.length;
  const lights = [];
  for (const lx of [4.5, 11.5]) {
    const p = new THREE.PointLight(LED_PINK, 16, 9, 2);
    p.position.set(lx, G.floorY + 2.4, 0);
    model.group.add(p);
    lights.push(p);
  }
  const ox = G.x - L / 2; // world x of the west end
  const toWorld = (p) => ({ x: ox + p.x, z: p.z, yawDeg: p.yawDeg });
  return {
    object: model.group,
    lights,
    ledColor: LED_PINK,
    outdoorColliders: [
      { type: 'box', minX: ox - 0.3, maxX: ox + L + 0.3, minZ: G.z - G.radius - 0.2, maxZ: G.z + G.radius + 0.2 },
      { type: 'box', minX: ox + G.vestibule.xStart - 0.2, maxX: ox, minZ: G.z - 1.4, maxZ: G.z + 1.4 },
    ],
    zone: {
      id: 'greenhouse',
      name: 'Greenhouse',
      pressurized: true,
      floorY: G.floorY,
      ceilingY: G.interior.ceilingY,
      rect: {
        minX: ox + G.interior.minX,
        maxX: ox + G.interior.maxX,
        minZ: G.interior.minZ,
        maxZ: G.interior.maxZ,
      },
      obstacles: [
        // racks on both sides of the central aisle
        { type: 'box', minX: ox + 2.1, maxX: ox + 13.9, minZ: G.z - 2.35, maxZ: G.z - 1.2 },
        { type: 'box', minX: ox + 2.1, maxX: ox + 13.9, minZ: G.z + 1.2, maxZ: G.z + 2.35 },
      ],
    },
    interactables: [
      {
        id: 'gh-inner-door',
        zone: 'greenhouse',
        x: ox + G.innerDoor.x + 0.3,
        z: G.z,
        y: G.floorY + 1.1,
        prompt: 'Press E to exit to the surface',
        action: { type: 'door', to: 'outside', arrive: toWorld(G.outsideArrive), via: 'airlock' },
      },
      {
        id: 'gh-outer-door',
        zone: 'outside',
        x: ox + G.outerDoor.x + 0.2,
        z: G.z,
        y: 1.0,
        prompt: 'Press E to enter the Greenhouse',
        action: { type: 'door', to: 'greenhouse', arrive: toWorld(G.insideArrive), via: 'airlock' },
      },
      ...[4.8, 11.2].flatMap((rx) =>
        [-1, 1].map((s) => ({
          id: `grow-rack-${rx}-${s}`,
          zone: 'greenhouse',
          x: ox + rx,
          z: G.z + s * 0.8,
          y: G.floorY + 1.0,
          prompt: 'Press E to look at the grow rack',
          action: {
            type: 'station',
            station: 'greenhouse',
            toast: 'Coming soon: Greenhouse lesson! Plants mostly use red and blue light to grow.',
          },
        })),
      ),
    ],
    setPowered(on) {
      for (const p of lights) p.intensity = on ? 16 : 1.5;
      model.skylight.visible = on;
    },
  };
}
