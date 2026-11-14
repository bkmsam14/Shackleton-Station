// supplyModels.js — the habitat supply terminal (a small comms kiosk) and the visible
// micrometeorite damage on the solar array. Placeholder art in the game's clean style.
import * as THREE from 'three';
import { MAT } from '../world/materials.js';
import { rbox } from '../world/details.js';
import { createSign } from '../world/signs.js';
import { heightAt } from '../world/heightfield.js';
import { LAYOUT } from '../world/layout.js';

// Work bay, against the +Z wall between the airlock hatch and the storage crates.
export const TERMINAL = { x: 8.05, z: 2.66, floorY: LAYOUT.HABITAT.floorY };

function screenTexture() {
  const W = 512;
  const H = 320;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#071226';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffb547';
  ctx.fillRect(0, 0, W, 8);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 46px Fredoka, Nunito, sans-serif';
  ctx.fillText('SUPPLY UPLINK', 30, 62);
  ctx.fillStyle = '#9fe8ff';
  ctx.font = '500 28px Fredoka, Nunito, sans-serif';
  ctx.fillText('Earth link  ·  online', 30, 118);
  // a little dish and signal arcs
  ctx.strokeStyle = '#4fd1e8';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(390, 230, 52, Math.PI * 0.85, Math.PI * 1.85);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(400, 214);
  ctx.lineTo(430, 184);
  ctx.stroke();
  for (const r of [26, 46, 66]) {
    ctx.beginPath();
    ctx.arc(430, 184, r, -Math.PI * 0.45, -Math.PI * 0.05);
    ctx.stroke();
  }
  ctx.fillStyle = '#c9d4e8';
  ctx.font = '500 26px Nunito, sans-serif';
  ctx.fillText('Request supplies', 30, 196);
  ctx.fillText('Track deliveries', 30, 240);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Kiosk facing −Z (into the work bay). Returns { group, led }. */
export function createTerminal() {
  const g = new THREE.Group();
  const { x, z, floorY: fy } = TERMINAL;
  const body = new THREE.Mesh(rbox(0.82, 1.02, 0.42, 0.05), MAT.painted(0xd5dbe1));
  body.position.set(x, fy + 0.51, z + 0.06);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.06, 0.01), MAT.accent());
  stripe.position.set(x, fy + 0.86, z - 0.156);
  // tilted screen housing + screen
  const head = new THREE.Group();
  head.position.set(x, fy + 1.32, z - 0.02);
  head.rotation.x = 0.32; // leans back toward the wall
  const housing = new THREE.Mesh(rbox(0.86, 0.58, 0.09, 0.03), MAT.darkMetal());
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.475), new THREE.MeshBasicMaterial({ map: screenTexture(), toneMapped: false }));
  screen.rotation.y = Math.PI; // face −Z
  screen.position.z = -0.047;
  head.add(housing, screen);
  // small dish antenna on top
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.28, 8), MAT.metal());
  stalk.position.set(x + 0.3, fy + 1.76, z + 0.08);
  // shallow bowl, open side tilted up toward the room (double-sided so it reads as a dish)
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 20, 6, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38),
    new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.6, side: THREE.DoubleSide }),
  );
  dish.position.set(x + 0.3, fy + 2.0, z + 0.06);
  dish.rotation.set(0.7, 0, 0.25);
  // status LED: blinks while deliveries are on their way
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), new THREE.MeshBasicMaterial({ color: 0x2a6b4a }));
  led.position.set(x - 0.33, fy + 0.95, z - 0.16);
  const sign = createSign(['SUPPLIES', 'request · deliveries'], 0.9, 0.3, { accent: '#ffb547' });
  sign.rotation.y = Math.PI;
  sign.position.set(x, fy + 2.15, z + 0.12);
  g.add(body, stripe, head, stalk, dish, led, sign);
  g.traverse((o) => {
    if (o.isMesh) o.receiveShadow = true;
  });
  return { group: g, led };
}

// ------------------------------------------------------------------ solar damage
function damageTexture() {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  const c = S / 2;
  const grd = ctx.createRadialGradient(c, c, 4, c, c, c * 0.62);
  grd.addColorStop(0, 'rgba(10,8,6,1)');
  grd.addColorStop(0.45, 'rgba(35,28,22,0.92)');
  grd.addColorStop(1, 'rgba(60,50,40,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(c, c, c * 0.62, 0, Math.PI * 2);
  ctx.fill();
  // cracks radiating through the cells
  ctx.strokeStyle = 'rgba(230,240,255,0.85)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    let a = (i / 9) * Math.PI * 2 + Math.sin(i * 7) * 0.3;
    let x = c + Math.cos(a) * 14;
    let y = c + Math.sin(a) * 14;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 5; s++) {
      a += Math.sin(i * 3 + s) * 0.45;
      x += Math.cos(a) * (14 + s * 3);
      y += Math.sin(a) * (14 + s * 3);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Damage marks on both faces of the array's panel. The array's own head isn't exposed,
 * so this group copies its turn from solarArray.facingAzimuthDeg each frame (no change
 * to solarArray.js).
 */
export function createSolarDamageView(world) {
  const A = LAYOUT.SOLAR_ARRAY;
  const gy = heightAt(A.x, A.z);
  const g = new THREE.Group();
  g.position.set(A.x, gy, A.z);
  g.visible = false;
  const mat = new THREE.MeshBasicMaterial({ map: damageTexture(), transparent: true, depthWrite: false, toneMapped: false });
  const geo = new THREE.PlaneGeometry(2.4, 2.4);
  const cy = A.panelBottomY + A.panelHeight * 0.38;
  const front = new THREE.Mesh(geo, mat);
  front.position.set(0.7, cy, 0.37); // panel front face is local +Z at 0.36
  const back = new THREE.Mesh(geo, mat);
  back.position.set(-0.7, cy, 0.27);
  back.rotation.y = Math.PI;
  const sparks = [];
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfff1b0 });
  sparkMat.color.multiplyScalar(4);
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), sparkMat);
    s.userData.base = new THREE.Vector3(0.7 + (Math.random() - 0.5) * 0.5, cy + (Math.random() - 0.5) * 0.5, 0.4);
    g.add(s);
    sparks.push(s);
  }
  g.add(front, back);
  world.add(g);
  return {
    update(frameDt, { damaged, outside }) {
      g.visible = damaged && outside;
      if (!g.visible) return;
      const az = world.solarArray.facingAzimuthDeg ?? 0;
      g.rotation.y = Math.PI - (az * Math.PI) / 180; // same turn as the array's head
      for (const s of sparks) {
        s.visible = Math.random() < 0.25;
        s.position.copy(s.userData.base).add({ x: (Math.random() - 0.5) * 0.12, y: (Math.random() - 0.5) * 0.12, z: 0 });
      }
    },
  };
}
