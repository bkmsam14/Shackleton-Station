// iceSite.js — the cold-trap crater where kids drill for ice (outdoor, placeholder art).
// Science: near the poles some crater floors never see the Sun, so they stay colder than
// −230 °C (LRO Diviner) and keep water ice mixed in the soil (LCROSS: ~5.6 % by mass).
// The crater bowl itself is carved by heightfield.js; this adds the dark floor, frost,
// three dig spots, a sign, and the helmet lamp that switches on down in the dark.
import * as THREE from 'three';
import { LAYOUT } from './layout.js';
import { heightAt, mulberry32 } from './heightfield.js';
import { MAT } from './materials.js';
import { createSign } from './signs.js';

const C = () => LAYOUT.ICE_CRATER;

/**
 * The terrain's own triangles inside a circle, lifted a few cm: a dark layer that matches the
 * ground exactly (sampling heightAt on a different grid lets the ground poke through).
 */
function terrainPatch(terrain, cx, cz, radius) {
  const src = terrain.geometry;
  const pos = src.attributes.position;
  const index = src.index.array;
  const out = [];
  const r2 = radius * radius;
  for (let i = 0; i < index.length; i += 3) {
    const a = index[i];
    const b = index[i + 1];
    const c = index[i + 2];
    const mx = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3 - cx;
    const mz = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3 - cz;
    if (mx * mx + mz * mz > r2) continue;
    for (const v of [a, b, c]) out.push(pos.getX(v), pos.getY(v) + 0.04, pos.getZ(v));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  return geo;
}

export function createIceSite(terrain) {
  const c = C();
  const group = new THREE.Group();
  group.name = 'iceSite';

  // The permanently shadowed floor: the low Sun never reaches it. A soft dark layer keeps it
  // dark even where the shadow map is coarse. Fades out toward the rim.
  const shade = new THREE.Mesh(
    terrainPatch(terrain, c.x, c.z, c.r * 0.95),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { centre: { value: new THREE.Vector2(c.x, c.z) }, radius: { value: c.r * 0.95 } },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader:
        'uniform vec2 centre; uniform float radius; varying vec3 vW; void main(){ float d = distance(vW.xz, centre) / radius; gl_FragColor = vec4(0.0, 0.004, 0.012, 0.82 * (1.0 - smoothstep(0.62, 1.0, d))); }',
    }),
  );
  shade.renderOrder = 1;
  group.add(shade);

  // frost: small pale-blue grains of icy soil scattered on the floor
  const rand = mulberry32(2009); // LCROSS impact year
  const frostCount = 140;
  const frost = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.09, 0), new THREE.MeshStandardMaterial({ color: 0xcfe9ff, emissive: 0x2a5d8a, emissiveIntensity: 0.6, roughness: 0.35 }), frostCount);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const sv = new THREE.Vector3();
  for (let i = 0; i < frostCount; i++) {
    const a = rand() * Math.PI * 2;
    const rr = Math.sqrt(rand()) * c.coldRadius;
    const x = c.x + Math.cos(a) * rr;
    const z = c.z + Math.sin(a) * rr;
    const k = 0.5 + rand() * 1.4;
    q.setFromEuler(new THREE.Euler(rand() * 3, rand() * 3, rand() * 3));
    sv.set(k, k * 0.45, k);
    m.compose(new THREE.Vector3(x, heightAt(x, z) + 0.02, z), q, sv);
    frost.setMatrixAt(i, m);
  }
  group.add(frost);

  // dig spots: a ring marker + a cluster of glowing ice crystals (dim while the spot rests)
  const spots = new Map();
  const crystalGeo = new THREE.OctahedronGeometry(0.16, 0);
  const ringGeo = new THREE.TorusGeometry(0.85, 0.05, 8, 40);
  for (const s of c.spots) {
    const y = heightAt(s.x, s.z);
    const crystalMat = new THREE.MeshStandardMaterial({ color: 0xdff4ff, emissive: 0x6fd8ff, emissiveIntensity: 1.6, roughness: 0.2 });
    const ringMat = MAT.glow(0x6fd8ff, 1.6).clone();
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(s.x, y + 0.06, s.z);
    group.add(ring);
    const cluster = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const cr = new THREE.Mesh(crystalGeo, crystalMat);
      const a = (i / 5) * Math.PI * 2 + rand();
      cr.position.set(Math.cos(a) * 0.35, 0.12, Math.sin(a) * 0.35);
      cr.scale.set(0.8 + rand() * 0.6, 1.2 + rand() * 1.4, 0.8 + rand() * 0.6);
      cr.rotation.set(rand() * 0.6, rand() * 3, rand() * 0.6);
      cluster.add(cr);
    }
    cluster.position.set(s.x, y, s.z);
    group.add(cluster);
    spots.set(s.id, { ring, ringMat, crystalMat, cluster });
  }

  // sign on the rim
  const signGroup = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.6, 12), MAT.metal());
  post.position.y = 0.8;
  const sign = createSign(['COLD TRAP · ICE', 'No sunlight here · colder than −230 °C'], 2.2, 0.62, { accent: '#6fd8ff' });
  sign.position.y = 1.75;
  signGroup.add(post, sign);
  signGroup.position.set(c.sign.x, heightAt(c.sign.x, c.sign.z), c.sign.z);
  signGroup.rotation.y = (c.sign.yawDeg * Math.PI) / 180;
  group.add(signGroup);

  const interactables = c.spots.map((s) => ({
    id: s.id,
    zone: 'outside',
    x: s.x,
    z: s.z,
    y: heightAt(s.x, s.z) + 0.5,
    prompt: 'Press E to drill for ice',
    action: { type: 'station', station: 'ice-drill', spotId: s.id },
  }));

  let t = 0;
  return {
    object: group,
    interactables,
    /** true when (x, z) is on the dark crater floor */
    inColdTrap: (x, z) => Math.hypot(x - c.x, z - c.z) < c.coldRadius,
    setSpotReady(id, ready) {
      const s = spots.get(id);
      if (!s) return;
      s.crystalMat.emissiveIntensity = ready ? 1.6 : 0.15;
      s.ringMat.emissiveIntensity = ready ? 1.6 : 0.2;
      s.ringMat.color.setHex(ready ? 0x6fd8ff : 0x5a6a80);
      s.cluster.visible = ready;
    },
    update(dt) {
      t += dt;
      const pulse = 1 + Math.sin(t * 2.4) * 0.25;
      for (const s of spots.values()) if (s.cluster.visible) s.ring.scale.setScalar(pulse * 0.1 + 0.9);
    },
  };
}

/**
 * The helmet lamp: a spotlight that follows your view. Only switched on in the cold trap
 * (real astronauts would need lights in permanently shadowed craters). One light, no shadows.
 */
export function createHelmetLamp(scene, camera) {
  // the camera has to be in the scene for a light attached to it to render
  if (!camera.parent) scene.add(camera);
  const lamp = new THREE.SpotLight(0xf2f7ff, 0, 26, Math.PI / 6.5, 0.45, 1.2);
  lamp.position.set(0.15, 0.1, 0);
  lamp.target.position.set(0, -0.25, -1);
  camera.add(lamp, lamp.target);
  let on = false;
  let level = 0;
  return {
    set(next) {
      on = next;
    },
    update(dt) {
      level += ((on ? 1 : 0) - level) * Math.min(1, dt * 4);
      // always "visible" (intensity 0 when off): switching a light on/off would make three.js
      // recompile every material and stutter
      lamp.intensity = level * 60;
    },
    get on() {
      return on;
    },
  };
}
