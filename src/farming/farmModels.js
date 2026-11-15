// farmModels.js — placeholder 3D models for the farming minigame, in the game's clean,
// smooth-shaded style: pot stand, pot (soil, hole, soil pile, mound), seed potato,
// potato plant (3 cuttable leafy stems), red romaine lettuce (1 head), radishes (3),
// seed packets, watering can and cutters. createPlant(crop) picks the right plant.
// In every plant each `stems` entry is what the player cuts; its child (or itself) named
// 'harvest' is the food that flies into the bag.
// Each builder returns plain THREE objects; swap for glTF models later.
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { MAT } from '../world/materials.js';
import { rbox } from '../world/details.js';
import { leafGeometry, rosetteGeometry } from '../world/plants.js';
import { mulberry32 } from '../world/heightfield.js';

export const POT = { radius: 0.16, height: 0.24 };
POT.soilY = POT.height - 0.025;
POT.soilRadius = POT.radius * 0.92;
export const STAND = { width: 1.04, depth: 0.62, height: 0.55 };

export const SOIL_DRY = new THREE.Color(0x8a6a4a);
export const SOIL_WET = new THREE.Color(0x3b2a1d);

const local = new Map();
function mat(key, make) {
  if (!local.has(key)) local.set(key, make());
  return local.get(key);
}
const potatoMat = () => mat('potato', () => new THREE.MeshStandardMaterial({ color: 0xc8a06a, roughness: 0.85 }));
const looseSoilMat = () => mat('looseSoil', () => new THREE.MeshStandardMaterial({ color: 0x6e5238, roughness: 1 }));
const holeMat = () => mat('hole', () => new THREE.MeshStandardMaterial({ color: 0x21170f, roughness: 1 }));
const stemMat = () => mat('stem', () => new THREE.MeshStandardMaterial({ color: 0x4f8f3a, roughness: 0.7 }));
const rootMat = () => mat('root', () => new THREE.MeshStandardMaterial({ color: 0xd9c49b, roughness: 0.9 }));
const seedMat = () => mat('seed', () => new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.8 }));
const radishMat = () => mat('radish', () => new THREE.MeshStandardMaterial({ color: 0xd8344f, roughness: 0.45 }));
const radishTipMat = () => mat('radishTip', () => new THREE.MeshStandardMaterial({ color: 0xf3ece4, roughness: 0.6 }));
/** Seed-packet label colours. */
export const CROP_COLOR = { potato: 0xc8a06a, lettuce: 0x9c3d4a, radish: 0xd8344f };
export const LEAF_COLOR = 0x5aa845;
export const LEAF_HOVER = 0x5c8f1c;

const hemisphere = () => new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2);

/** Small table between the rack runs that holds two pots. Origin at floor centre. */
export function createStand() {
  const g = new THREE.Group();
  const { width: w, depth: d, height: h } = STAND;
  const top = new THREE.Mesh(rbox(w, 0.04, d, 0.015), MAT.rackFrame());
  top.position.y = h - 0.02;
  top.receiveShadow = true;
  g.add(top);
  const legGeo = new THREE.CylinderGeometry(0.018, 0.018, h - 0.04, 10);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(legGeo, MAT.rackFrame());
      leg.position.set(sx * (w / 2 - 0.05), (h - 0.04) / 2, sz * (d / 2 - 0.05));
      g.add(leg);
    }
  }
  const shelf = new THREE.Mesh(rbox(w - 0.08, 0.025, d - 0.08, 0.01), MAT.rackFrame());
  shelf.position.y = 0.14;
  g.add(shelf);
  return g;
}

/** A pot with its soil, the planting hole, the loose soil pile and the covering mound. */
export function createPot() {
  const g = new THREE.Group();
  const { radius: r, height: h } = POT;
  // smooth lathe profile: slightly tapered body with a rolled lip
  const prof = [
    [0, 0],
    [r * 0.78, 0],
    [r * 0.82, 0.01],
    [r * 0.97, h - 0.02],
    [r * 1.04, h - 0.012],
    [r * 1.05, h],
    [r * 0.98, h + 0.004],
    [r * 0.93, h - 0.01],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), MAT.painted(0xf2f0ea));
  body.receiveShadow = true;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.92, r * 0.9, 0.03, 40, 1, true), MAT.accent());
  band.position.y = h * 0.62;
  band.scale.setScalar(1.012);
  const soilMaterial = new THREE.MeshStandardMaterial({ color: SOIL_DRY.clone(), roughness: 1 });
  const soil = new THREE.Mesh(new THREE.CircleGeometry(POT.soilRadius, 40), soilMaterial);
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = POT.soilY;
  soil.receiveShadow = true;

  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.05, 28), holeMat());
  hole.rotation.x = -Math.PI / 2;
  hole.position.y = POT.soilY + 0.002;
  const holeRim = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.009, 8, 28), looseSoilMat());
  holeRim.rotation.x = Math.PI / 2;
  holeRim.position.y = POT.soilY + 0.002;
  const holeGroup = new THREE.Group();
  holeGroup.add(hole, holeRim);

  const pile = new THREE.Mesh(hemisphere(), looseSoilMat());
  pile.scale.set(0.055, 0.04, 0.05);
  pile.position.set(POT.soilRadius * 0.62, POT.soilY, 0);
  pile.userData.base = pile.scale.clone();

  const mound = new THREE.Mesh(hemisphere(), soilMaterial);
  mound.scale.set(0.065, 0.001, 0.065);
  mound.position.y = POT.soilY;

  const seed = new THREE.Mesh(potatoGeometry(7), potatoMat());
  seed.position.y = POT.soilY - 0.006;

  // greens are sown as a few tiny seeds in the hole
  const seeds = new THREE.Group();
  const seedGeo = new THREE.SphereGeometry(0.0045, 8, 6);
  for (let i = 0; i < 5; i++) {
    const a = i * 2.4;
    const d = 0.012 + (i % 2) * 0.012;
    const m = new THREE.Mesh(seedGeo, seedMat());
    m.position.set(Math.cos(a) * d, POT.soilY + 0.002, Math.sin(a) * d);
    m.scale.set(1.3, 0.7, 1);
    seeds.add(m);
  }
  seeds.visible = false;

  const plantAnchor = new THREE.Group();
  plantAnchor.position.y = POT.soilY;

  g.add(body, band, soil, holeGroup, pile, mound, seed, seeds, plantAnchor);
  return { group: g, soil, soilMaterial, hole: holeGroup, pile, mound, seed, seeds, plantAnchor };
}

/** Lumpy potato, about 9 cm long. */
export function potatoGeometry(seed = 1, size = 1) {
  const g = new THREE.SphereGeometry(1, 22, 16);
  const rand = mulberry32(seed);
  const k = [rand() * 6, rand() * 6, rand() * 6];
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const bump = 1 + 0.07 * Math.sin(x * 3 + k[0]) * Math.cos(y * 4 + k[1]) + 0.05 * Math.sin(z * 5 + k[2]);
    p.setXYZ(i, x * bump, y * bump, z * bump);
  }
  g.scale(0.045 * size, 0.032 * size, 0.036 * size);
  g.computeVertexNormals();
  return g;
}

export function createPotatoMesh(seed = 3, size = 1) {
  return new THREE.Mesh(potatoGeometry(seed, size), potatoMat());
}

/** A clump of loose soil carried by the cursor while covering. */
export function createSoilClump() {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), looseSoilMat());
  m.scale.set(0.03, 0.022, 0.03);
  return m;
}

// --------------------------------------------------------------- potato plant
const UP = new THREE.Vector3(0, 1, 0);

/** Places a leaf (base at origin, pointing +Y, face +Z) at p pointing along dir, face roughly up. */
function placeLeaf(geo, p, dir) {
  const y = dir.clone().normalize();
  const z = UP.clone().addScaledVector(y, -UP.dot(y)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  const m = new THREE.Matrix4().makeBasis(x, y, z).setPosition(p);
  return geo.applyMatrix4(m);
}

/** One compound leaf on a curved stem: what the player cuts. Origin at the soil. */
function leafyStem(angle, rand) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const reach = 0.17 + rand() * 0.03;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(c * 0.03, 0.1, s * 0.03),
    new THREE.Vector3(c * reach * 0.65, 0.22, s * reach * 0.65),
    new THREE.Vector3(c * reach, 0.25 + rand() * 0.03, s * reach),
  ]);
  const parts = [new THREE.TubeGeometry(curve, 16, 0.0065, 6, false)];
  const T = new THREE.Vector3();
  for (const t of [0.5, 0.66, 0.82]) {
    const p = curve.getPoint(t);
    curve.getTangent(t, T);
    const side = new THREE.Vector3().crossVectors(T, UP).normalize();
    for (const sgn of [-1, 1]) {
      const dir = side.clone().multiplyScalar(sgn * 0.85).addScaledVector(T, 0.45).addScaledVector(UP, 0.1);
      const size = 0.06 + t * 0.03;
      parts.push(placeLeaf(leafGeometry(size, size * 0.55, 0.008, 6), p, dir));
    }
  }
  const tip = curve.getPoint(1);
  curve.getTangent(1, T);
  parts.push(placeLeaf(leafGeometry(0.1, 0.055, 0.008, 6), tip, T.clone().addScaledVector(UP, -0.1)));
  const geo = BufferGeometryUtils.mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  const material = new THREE.MeshStandardMaterial({ color: LEAF_COLOR, roughness: 0.6, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, material);
  mesh.userData.tip = tip.clone();
  // underground: a pale root runs from the stem base down to the potato (hidden in the
  // soil until the stem is pulled up). Potatoes grow on the roots, not on the leaves.
  const root = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.002, 0),
    new THREE.Vector3(c * 0.008, -0.022, s * 0.008),
    new THREE.Vector3(c * 0.024, -0.042, s * 0.024),
    new THREE.Vector3(c * 0.032, -0.05, s * 0.032),
  ]);
  const rootMesh = new THREE.Mesh(new THREE.TubeGeometry(root, 12, 0.0024, 6, false), rootMat());
  const potato = new THREE.Mesh(potatoGeometry(Math.round(angle * 13) & 63, 0.8), potatoMat());
  potato.position.set(c * 0.036, -0.07, s * 0.036);
  potato.rotation.set(0.4, angle, 0.2);
  potato.name = 'harvest';
  mesh.add(rootMesh, potato);
  return mesh;
}

/**
 * Potato plant in growth stages. setGrowth(stage, growth) — stage from farmState.growthStage.
 * stems = the 3 leafy stems the player cuts at harvest.
 */
export function createPotatoPlant(seed = 1) {
  const rand = mulberry32(seed);
  const group = new THREE.Group();
  // sprout: two tiny leaves on a short shoot
  const sprout = new THREE.Group();
  const shoot = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.005, 0.04, 6), stemMat());
  shoot.position.y = 0.02;
  sprout.add(shoot);
  for (const a of [0, Math.PI]) {
    const l = new THREE.Mesh(
      placeLeaf(leafGeometry(0.035, 0.022, 0.004, 6), new THREE.Vector3(0, 0.04, 0), new THREE.Vector3(Math.cos(a), 0.6, Math.sin(a))),
      new THREE.MeshStandardMaterial({ color: 0x8fd16a, roughness: 0.6, side: THREE.DoubleSide }),
    );
    sprout.add(l);
  }
  group.add(sprout);

  const stemsGroup = new THREE.Group();
  const offset = rand() * Math.PI;
  const stems = [0, 1, 2].map((i) => {
    const m = leafyStem(offset + (i / 3) * Math.PI * 2 + (rand() - 0.5) * 0.4, rand);
    m.userData.cutIndex = i;
    stemsGroup.add(m);
    return m;
  });
  // a short centre tuft (not cut) so the plant looks full
  const tuft = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    tuft.add(
      new THREE.Mesh(
        placeLeaf(leafGeometry(0.07, 0.04, 0.006, 6), new THREE.Vector3(0, 0.06, 0), new THREE.Vector3(Math.cos(a), 1.4, Math.sin(a))),
        new THREE.MeshStandardMaterial({ color: 0x6cb851, roughness: 0.6, side: THREE.DoubleSide }),
      ),
    );
  }
  stemsGroup.add(tuft);
  group.add(stemsGroup);



  return {
    group,
    stems,
    setGrowth(stage, growth) {
      sprout.visible = (stage === 0 && growth > 0.03) || stage === 1;
      sprout.scale.setScalar(stage === 0 ? 0.5 + (growth / 0.3) * 0.7 : 1.2);
      stemsGroup.visible = stage >= 1;
      const s = stage >= 3 ? 1 : 0.3 + Math.max(0, growth - 0.3) * 1.6;
      stemsGroup.scale.setScalar(Math.min(1, s));
    },
    /** Hide stems that were already cut (e.g. the player left halfway through). */
    setCut(n) {
      stems.forEach((st, i) => (st.visible = i >= n));
    },
    dispose() {
      group.traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose();
          if (![stemMat(), rootMat(), potatoMat()].includes(o.material)) o.material.dispose();
        }
      });
    },
  };
}

// --------------------------------------------------------------- seeds + greens
/** A small paper seed packet (what you drag to sow lettuce or radish). */
export function createSeedPacket(crop) {
  const g = new THREE.Group();
  const paper = new THREE.Mesh(rbox(0.06, 0.008, 0.08, 0.003), MAT.painted(0xf4efe6));
  const label = new THREE.Mesh(rbox(0.045, 0.002, 0.04, 0.001), MAT.painted(CROP_COLOR[crop] ?? 0x7be0a0));
  label.position.set(0, 0.005, 0.008);
  g.add(paper, label);
  return g;
}

/** Colours a rosette: pale green heart → red-wine leaf tips (red romaine, like NASA's 'Outredgeous'). */
function tintRomaine(geo, length) {
  const p = geo.attributes.position;
  const col = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  const heart = new THREE.Color(0xa9d27a);
  const tip = new THREE.Color(0x8c2f3e);
  for (let i = 0; i < p.count; i++) {
    const d = Math.min(1, Math.hypot(p.getX(i), p.getY(i), p.getZ(i)) / length);
    c.copy(heart).lerp(tip, Math.min(1, d * 1.4));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

/** Red romaine lettuce: one head, cut once at the base. */
function createLettucePlant(seed = 1) {
  const group = new THREE.Group();
  const sprout = new THREE.Mesh(
    tintRomaine(rosetteGeometry({ leaves: 4, length: 0.04, width: 0.02, tilt: 0.7, rings: 1, seed, cup: 0.004, segments: 5 }), 0.04),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }),
  );
  group.add(sprout);
  const len = 0.15;
  const head = new THREE.Mesh(
    tintRomaine(rosetteGeometry({ leaves: 9, length: len, width: 0.06, tilt: 0.5, rings: 3, seed: seed + 3, cup: 0.012, segments: 6 }), len),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide }),
  );
  head.name = 'harvest';
  head.userData.tip = new THREE.Vector3(0.05, 0.1, 0.02);
  group.add(head);
  let grown = false;
  return {
    group,
    stems: [head],
    setGrowth(stage, growth) {
      sprout.visible = stage === 0;
      sprout.scale.setScalar(0.5 + growth * 2);
      grown = stage >= 1;
      head.visible = grown;
      head.scale.setScalar(stage >= 3 ? 1 : Math.min(1, 0.35 + Math.max(0, growth - 0.3) * 1.5));
    },
    setCut(n) {
      head.visible = grown && n < 1;
    },
    dispose() {
      group.traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose();
          o.material.dispose();
        }
      });
    },
  };
}

/** One radish: leaves on short stalks, and the red root with its shoulders out of the soil. */
function radishStem(angle, rand) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const at = new THREE.Vector3(c * 0.05, 0, s * 0.05);
  const parts = [];
  for (let i = 0; i < 4; i++) {
    const a = angle + (i - 1.5) * 0.5 + (rand() - 0.5) * 0.3;
    const dir = new THREE.Vector3(Math.cos(a) * 0.6, 1, Math.sin(a) * 0.6).normalize();
    const stalk = new THREE.CatmullRomCurve3([at.clone(), at.clone().addScaledVector(dir, 0.05), at.clone().addScaledVector(dir, 0.09)]);
    parts.push(new THREE.TubeGeometry(stalk, 6, 0.003, 5, false));
    parts.push(placeLeaf(leafGeometry(0.075, 0.04, 0.008, 6), stalk.getPoint(1), dir));
  }
  const geo = BufferGeometryUtils.mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x5f9e3f, roughness: 0.6, side: THREE.DoubleSide }));
  mesh.userData.tip = at.clone().add(new THREE.Vector3(c * 0.06, 0.12, s * 0.06));
  const root = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), radishMat());
  root.scale.set(0.022, 0.026, 0.022);
  root.position.set(at.x, -0.008, at.z);
  root.name = 'harvest';
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.2, 8), radishTipMat());
  tail.rotation.x = Math.PI; // the thin white taproot points down
  tail.position.y = -1.3;
  root.add(tail);
  mesh.add(root);
  return mesh;
}

function createRadishPlant(seed = 1) {
  const rand = mulberry32(seed);
  const group = new THREE.Group();
  const sprout = new THREE.Group();
  for (const a of [0, 2.1, 4.2]) {
    sprout.add(
      new THREE.Mesh(
        placeLeaf(leafGeometry(0.025, 0.018, 0.004, 5), new THREE.Vector3(Math.cos(a) * 0.05, 0.02, Math.sin(a) * 0.05), new THREE.Vector3(Math.cos(a), 0.8, Math.sin(a))),
        new THREE.MeshStandardMaterial({ color: 0x8fd16a, roughness: 0.6, side: THREE.DoubleSide }),
      ),
    );
  }
  group.add(sprout);
  const stemsGroup = new THREE.Group();
  const offset = rand() * Math.PI;
  const stems = [0, 1, 2].map((i) => {
    const m = radishStem(offset + (i / 3) * Math.PI * 2, rand);
    stemsGroup.add(m);
    return m;
  });
  group.add(stemsGroup);
  return {
    group,
    stems,
    setGrowth(stage, growth) {
      sprout.visible = stage === 0;
      stemsGroup.visible = stage >= 1;
      stemsGroup.scale.setScalar(stage >= 3 ? 1 : Math.min(1, 0.35 + Math.max(0, growth - 0.3) * 1.5));
    },
    setCut(n) {
      stems.forEach((st, i) => (st.visible = i >= n));
    },
    dispose() {
      group.traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose();
          if (![radishMat(), radishTipMat()].includes(o.material)) o.material.dispose();
        }
      });
    },
  };
}

/** The plant for this crop ('potato' | 'lettuce' | 'radish'). */
export function createPlant(crop, seed = 1) {
  if (crop === 'lettuce') return createLettucePlant(seed);
  if (crop === 'radish') return createRadishPlant(seed);
  return createPotatoPlant(seed);
}

// --------------------------------------------------------------- tools
/** Watering can. Spout points along local +X; tilt = rotate the returned `tilt` group about Z. */
export function createWateringCan() {
  const root = new THREE.Group();
  const tilt = new THREE.Group();
  root.add(tilt);
  const canMat = MAT.painted(0x4fd1e8);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.1, 32), canMat);
  const lid = new THREE.Mesh(new THREE.SphereGeometry(0.055, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), canMat);
  lid.scale.y = 0.35;
  lid.position.y = 0.05;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.006, 8, 32), MAT.accent());
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.03;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.007, 8, 24, Math.PI), MAT.accent());
  handle.position.set(-0.035, 0.05, 0);
  handle.rotation.z = Math.PI * 0.15;
  // spout: from the lower body, angled up and out along +X
  const spoutLen = 0.13;
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.011, spoutLen, 12), canMat);
  const a = Math.PI / 2 - 0.75; // lean toward +X
  spout.rotation.z = -a;
  const base = new THREE.Vector3(0.045, -0.02, 0);
  const dir = new THREE.Vector3(Math.sin(a), Math.cos(a), 0);
  spout.position.copy(base).addScaledVector(dir, spoutLen / 2);
  const tipPos = base.clone().addScaledVector(dir, spoutLen);
  const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.009, 0.018, 16), MAT.accent());
  rose.rotation.z = -a;
  rose.position.copy(tipPos);
  const tip = new THREE.Object3D();
  tip.position.copy(tipPos).addScaledVector(dir, 0.01);
  tilt.add(body, lid, rim, handle, spout, rose, tip);
  return { root, tilt, tip, spoutDir: dir };
}

/**
 * Garden shears (secateurs). Blades point FORWARD along local −Z (away from the player),
 * handles come back along +Z toward the hand. setOpen(0..1) opens the blades sideways.
 * `tip` = local point between the blade tips (where the cut happens).
 */
export function createCutters() {
  const root = new THREE.Group();
  const bladeMat = MAT.metal();
  const BLADE = 0.075;
  // flat, curved blade outline in the XY plane (base at 0, tip at +Y)
  const shape = new THREE.Shape();
  shape.moveTo(-0.007, 0);
  shape.quadraticCurveTo(-0.0085, BLADE * 0.55, -0.001, BLADE);
  shape.quadraticCurveTo(0.004, BLADE * 0.6, 0.006, 0);
  shape.lineTo(-0.007, 0);
  const bladeGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.0025, bevelEnabled: true, bevelThickness: 0.0006, bevelSize: 0.0006, bevelSegments: 1, curveSegments: 10 });
  bladeGeo.rotateX(-Math.PI / 2); // +Y (tip) → −Z, thickness → +Y: the flat side faces up
  const make = (side) => {
    const arm = new THREE.Group();
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.scale.x = side; // mirror the curve for the other blade
    blade.position.y = side * 0.0016;
    // handle: curves back and out from the pivot, with a rubber grip
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, side * 0.0016, 0.004),
      new THREE.Vector3(-side * 0.008, side * 0.0016, 0.04),
      new THREE.Vector3(-side * 0.02, side * 0.0016, 0.085),
      new THREE.Vector3(-side * 0.026, side * 0.0016, 0.115),
    ]);
    const handle = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.0055, 8, false), bladeMat);
    const grip = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve.getPoints(16).slice(6)), 12, 0.0085, 10, false), MAT.accent());
    arm.add(blade, handle, grip);
    root.add(arm);
    return arm;
  };
  const a = make(1);
  const b = make(-1);
  const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.008, 16), MAT.accent());
  root.add(pivot);
  const tip = new THREE.Vector3(0, 0, -BLADE);
  return {
    root,
    tip,
    setOpen(t) {
      a.rotation.y = 0.32 * t; // blades swing apart sideways (handles open the other way)
      b.rotation.y = -0.32 * t;
    },
  };
}
