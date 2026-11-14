// landingPad.js — the cargo landing pad outside the habitat, and the crates on it.
// Visual only: which crate is where comes from orders.js (stage + slot).
// A crate comes down on four small thrusters (no air on the Moon, so no parachutes);
// at touchdown the exhaust throws up regolith, which flies in arcs and falls straight
// back down (no air to make a cloud).
import * as THREE from 'three';
import { MAT } from '../world/materials.js';
import { crate as crateModel, rbox } from '../world/details.js';
import { createSign } from '../world/signs.js';
import { heightAt } from '../world/heightfield.js';
import { PLAYER, SUPPLY } from '../config/gameplay.js';

// East of the habitat, on the flattened base pad, about 11 m from the airlock.
export const PAD = { x: 17, z: 12, radius: 3.4 };
const SLOT_OFFSETS = [
  [-1.6, -0.95],
  [0, -0.95],
  [1.6, -0.95],
  [-1.6, 0.95],
  [0, 0.95],
  [1.6, 0.95],
].slice(0, SUPPLY.PAD_SLOTS);
const CRATE = { w: 1.0, h: 0.8, d: 0.8 };
const DROP_HEIGHT = 32; // m above the pad where the descent starts

export function slotPosition(slot) {
  const [dx, dz] = SLOT_OFFSETS[slot] ?? [0, 0];
  const x = PAD.x + dx;
  const z = PAD.z + dz;
  return { x, z, y: padTopY() };
}
export const padTopY = () => heightAt(PAD.x, PAD.z) + 0.13;

function padTexture() {
  const S = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#5d636b';
  ctx.fillRect(0, 0, S, S);
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#f08a45';
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2 - 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.setLineDash([16, 10]);
  const k = S / (PAD.radius * 2);
  for (const [dx, dz] of SLOT_OFFSETS) {
    const w = (CRATE.w + 0.3) * k;
    const d = (CRATE.d + 0.3) * k;
    ctx.strokeRect(S / 2 + dx * k - w / 2, S / 2 + dz * k - d / 2, w, d);
  }
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '600 44px Fredoka, Nunito, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CARGO', S / 2, S / 2 - 1);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function thrusterCrate(id) {
  const g = new THREE.Group();
  const box = crateModel(CRATE.w, CRATE.h, CRATE.d, id);
  g.add(box);
  // four small landing thrusters under the corners + their exhaust glow
  const plumes = [];
  const nozzleGeo = new THREE.CylinderGeometry(0.05, 0.08, 0.12, 12);
  const plumeGeo = new THREE.ConeGeometry(0.09, 0.7, 12, 1, true);
  plumeGeo.translate(0, -0.35, 0);
  const plumeMat = new THREE.MeshBasicMaterial({ color: 0xffc27a, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending });
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const n = new THREE.Mesh(nozzleGeo, MAT.darkMetal());
      n.position.set(sx * (CRATE.w / 2 - 0.12), -0.04, sz * (CRATE.d / 2 - 0.12));
      g.add(n);
      const p = new THREE.Mesh(plumeGeo, plumeMat);
      p.position.copy(n.position).add(new THREE.Vector3(0, -0.06, 0));
      g.add(p);
      plumes.push(p);
    }
  }
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return { group: g, plumes, plumeMat };
}

export function createLandingPad(world) {
  const group = new THREE.Group();
  group.name = 'cargoPad';
  const top = padTopY();
  const gy = heightAt(PAD.x, PAD.z);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(PAD.radius, PAD.radius + 0.15, 0.18, 56), MAT.darkMetal());
  base.position.set(PAD.x, gy + 0.03, PAD.z);
  base.receiveShadow = true;
  const face = new THREE.Mesh(new THREE.CircleGeometry(PAD.radius - 0.05, 56), new THREE.MeshStandardMaterial({ map: padTexture(), roughness: 0.9 }));
  face.rotation.x = -Math.PI / 2;
  face.position.set(PAD.x, top, PAD.z);
  face.receiveShadow = true;
  group.add(base, face);

  // rim lights: dim while idle, blink while a crate is coming down, green when it lands
  const lightMat = new THREE.MeshBasicMaterial({ color: 0x664a1a });
  const lightGeo = new THREE.SphereGeometry(0.07, 10, 8);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const l = new THREE.Mesh(lightGeo, lightMat);
    l.position.set(PAD.x + Math.cos(a) * (PAD.radius - 0.12), top + 0.04, PAD.z + Math.sin(a) * (PAD.radius - 0.12));
    group.add(l);
  }

  // sign on a post beside the pad (not between it and the airlock), facing the airlock
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 10), MAT.metal());
  const signAngle = Math.atan2(8.9 - PAD.z, 6.5 - PAD.x);
  const postAngle = signAngle + 1.0;
  const sx = PAD.x + Math.cos(postAngle) * (PAD.radius + 0.5);
  const sz = PAD.z + Math.sin(postAngle) * (PAD.radius + 0.5);
  post.position.set(sx, heightAt(sx, sz) + 1.1, sz);
  const sign = createSign(['CARGO PAD', 'supply deliveries'], 1.5, 0.5, { accent: '#ffb547' });
  sign.position.set(sx, heightAt(sx, sz) + 2.0, sz);
  sign.rotation.y = Math.PI / 2 - signAngle;
  const signBack = new THREE.Mesh(rbox(1.56, 0.56, 0.04, 0.02), MAT.darkMetal());
  signBack.position.copy(sign.position).addScaledVector(new THREE.Vector3(Math.cos(signAngle), 0, Math.sin(signAngle)), -0.025);
  signBack.rotation.y = sign.rotation.y;
  group.add(post, sign, signBack);
  world.add(group);

  // regolith thrown up at touchdown (ballistic: Moon gravity, no air)
  const DUST = 160;
  const dust = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x9a968e, roughness: 1 }), DUST);
  dust.frustumCulled = false;
  dust.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(dust);
  const D = { pos: new Float32Array(DUST * 3), vel: new Float32Array(DUST * 3), life: new Float32Array(DUST).fill(-1), next: 0 };
  const dm = new THREE.Object3D();
  function puff(x, z) {
    for (let i = 0; i < 70; i++) {
      const j = D.next;
      D.next = (D.next + 1) % DUST;
      const a = Math.random() * Math.PI * 2;
      const sp = 0.6 + Math.random() * 1.6;
      D.pos.set([x + Math.cos(a) * 0.5, top + 0.05, z + Math.sin(a) * 0.5], j * 3);
      D.vel.set([Math.cos(a) * sp, 0.4 + Math.random() * 0.9, Math.sin(a) * sp], j * 3);
      D.life[j] = 0;
    }
  }

  const crates = new Map(); // order id → { group, plumes, plumeMat, slot, landed }
  let blink = 0;
  let greenFor = 0;

  function ensureCrate(order) {
    let c = crates.get(order.id);
    if (!c) {
      // a crate that is already down (e.g. after loading a save) skips the touchdown effects
      c = { ...thrusterCrate(order.id), landed: order.stage === 'arrived' };
      group.add(c.group);
      crates.set(order.id, c);
    }
    return c;
  }

  return {
    /**
     * Sync crates with the orders (landing / arrived) and animate. Returns ids that just touched down.
     * visible: draw the pad at all (only outside).
     */
    update(frameDt, orders, { visible }) {
      group.visible = visible;
      const touched = [];
      const live = new Set();
      let incoming = false;
      for (const o of orders) {
        if (o.stage !== 'landing' && o.stage !== 'arrived') continue;
        live.add(o.id);
        const c = ensureCrate(o);
        const p = slotPosition(o.slot);
        if (o.stage === 'landing') {
          incoming = true;
          const k = 1 - Math.max(0, Math.min(1, o.remaining / SUPPLY.LANDING_SECONDS));
          const h = DROP_HEIGHT * (1 - k) * (1 - k); // decelerating powered descent
          c.group.position.set(p.x + Math.sin(k * 3) * 0.3 * (1 - k), p.y + h, p.z);
          c.group.rotation.y = (1 - k) * 0.6;
          for (const pl of c.plumes) {
            pl.visible = true;
            pl.scale.set(1, 0.7 + Math.random() * 0.6, 1);
          }
          c.plumeMat.opacity = 0.55 + Math.random() * 0.3;
        } else {
          c.group.position.set(p.x, p.y, p.z);
          c.group.rotation.y = 0;
          for (const pl of c.plumes) pl.visible = false;
          if (!c.landed) {
            c.landed = true;
            touched.push(o.id);
            puff(p.x, p.z);
            greenFor = 2.5;
          }
        }
      }
      for (const [id, c] of crates) {
        if (live.has(id)) continue;
        c.group.removeFromParent();
        c.group.traverse((o) => o.isMesh && o.geometry.dispose());
        crates.delete(id);
      }
      // rim lights
      blink += frameDt;
      greenFor = Math.max(0, greenFor - frameDt);
      if (greenFor > 0) lightMat.color.setHex(0x7be0a0).multiplyScalar(2);
      else if (incoming) lightMat.color.setHex(blink % 0.6 < 0.3 ? 0xffb547 : 0x553a10).multiplyScalar(blink % 0.6 < 0.3 ? 2.2 : 1);
      else lightMat.color.setHex(0x664a1a);
      // dust
      for (let i = 0; i < DUST; i++) {
        if (D.life[i] < 0) {
          dm.scale.setScalar(0);
        } else {
          const j = i * 3;
          D.life[i] += frameDt;
          D.vel[j + 1] -= PLAYER.GRAVITY * frameDt;
          D.pos[j] += D.vel[j] * frameDt;
          D.pos[j + 1] += D.vel[j + 1] * frameDt;
          D.pos[j + 2] += D.vel[j + 2] * frameDt;
          if (D.pos[j + 1] < top || D.life[i] > 3) D.life[i] = -1;
          dm.position.set(D.pos[j], D.pos[j + 1], D.pos[j + 2]);
          dm.scale.setScalar(D.life[i] < 0 ? 0 : 0.035);
        }
        dm.updateMatrix();
        dust.setMatrixAt(i, dm.matrix);
      }
      dust.instanceMatrix.needsUpdate = true;
      return touched;
    },
    /** A crate that was already on the pad when the game loaded: no landing effects. */
    markLanded(id) {
      const c = crates.get(id);
      if (c) c.landed = true;
    },
  };
}
