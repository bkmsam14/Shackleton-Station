// controller.js — first-person astronaut: mouse look (pointer lock), walking in Moon
// gravity, floaty jumps, and collision. Zone-aware: outside on the terrain, or inside
// a pressurized module (flat floor, room walls, furniture).
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { PLAYER } from '../config/gameplay.js';
import { heightAt } from '../world/heightfield.js';
import { resolveCircle, clampInsideRect, clampInsideCircle } from './collision.js';

const MAP_RADIUS = 240; // metres from the base you can walk before an invisible edge
const STEP_DOWN = 0.4; // stay glued to the ground when walking downhill

export function createPlayerController(camera, domElement, world, input) {
  const controls = new PointerLockControls(camera, domElement);
  controls.pointerSpeed = PLAYER.MOUSE_SENSITIVITY;
  // We handle a refused pointer lock ourselves (drag-to-look fallback in main.js),
  // so detach the addon's console.error logger for that case.
  domElement.ownerDocument.removeEventListener('pointerlockerror', controls._onPointerlockError);

  const pos = new THREE.Vector3(); // feet
  const vel = new THREE.Vector3();
  let onGround = true;
  let zoneId = 'outside';
  let frozen = false;
  let hitMapEdge = false;
  let dragLook = false; // fallback when pointer lock is not allowed (some browsers/iframes)

  // --- drag-to-look fallback
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  let dragging = false;
  domElement.addEventListener('pointerdown', (e) => {
    if (!dragLook || e.target.closest?.('button, a')) return;
    dragging = true;
  });
  window.addEventListener('pointerup', () => (dragging = false));
  window.addEventListener('pointermove', (e) => {
    if (!dragLook || !dragging) return;
    euler.setFromQuaternion(camera.quaternion);
    euler.y -= e.movementX * 0.004 * PLAYER.MOUSE_SENSITIVITY;
    euler.x -= e.movementY * 0.004 * PLAYER.MOUSE_SENSITIVITY;
    euler.x = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, euler.x));
    camera.quaternion.setFromEuler(euler);
  });

  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const wish = new THREE.Vector3();

  function groundY(x, z) {
    return zoneId === 'outside' ? heightAt(x, z) : world.zones[zoneId].floorY;
  }

  function syncCamera() {
    camera.position.set(pos.x, pos.y + PLAYER.EYE_HEIGHT, pos.z);
  }

  /** Teleport (used by doors and the gentle-failure wake-up). yawDeg: 0 = −Z, 90 = +X. */
  function placeAt(newZone, x, z, yawDeg) {
    zoneId = newZone;
    pos.set(x, 0, z);
    pos.y = groundY(x, z);
    vel.set(0, 0, 0);
    onGround = true;
    camera.rotation.set(0, (-yawDeg * Math.PI) / 180, 0, 'YXZ');
    syncCamera();
  }

  function update(dt) {
    hitMapEdge = false;
    // --- horizontal intent
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, camera.up).normalize();
    const h = frozen || !(controls.isLocked || dragLook) ? null : input.held;
    wish.set(0, 0, 0);
    if (h) {
      if (h.forward) wish.add(forward);
      if (h.back) wish.sub(forward);
      if (h.right) wish.add(right);
      if (h.left) wish.sub(right);
    }
    if (wish.lengthSq() > 0) wish.normalize();
    const speed = h && h.run ? PLAYER.RUN_SPEED : PLAYER.WALK_SPEED;
    const accel = PLAYER.ACCEL * (onGround ? 1 : PLAYER.AIR_CONTROL);
    const k = 1 - Math.exp(-accel * dt * 0.6);
    vel.x += (wish.x * speed - vel.x) * k;
    vel.z += (wish.z * speed - vel.z) * k;

    // --- jump + Moon gravity (1.62 m/s²)
    if (h && h.jump && onGround) {
      vel.y = PLAYER.JUMP_SPEED;
      onGround = false;
    }
    vel.y -= PLAYER.GRAVITY * dt;

    // --- integrate + collide
    let nx = pos.x + vel.x * dt;
    let nz = pos.z + vel.z * dt;
    const r = PLAYER.RADIUS;
    if (zoneId === 'outside') {
      ({ x: nx, z: nz } = resolveCircle(nx, nz, r, world.outdoorColliders));
      const c = clampInsideCircle(nx, nz, 0, 14, MAP_RADIUS);
      nx = c.x;
      nz = c.z;
      hitMapEdge = c.clamped;
    } else {
      const zone = world.zones[zoneId];
      ({ x: nx, z: nz } = resolveCircle(nx, nz, r, zone.obstacles));
      ({ x: nx, z: nz } = clampInsideRect(nx, nz, r, zone.rect));
    }
    // if a collision pushed us, drop the velocity into that wall
    if (dt > 0) {
      vel.x = (nx - pos.x) / dt;
      vel.z = (nz - pos.z) / dt;
    }
    pos.x = nx;
    pos.z = nz;
    pos.y += vel.y * dt;

    const g = groundY(pos.x, pos.z);
    if (pos.y <= g || (onGround && vel.y <= 0 && pos.y - g < STEP_DOWN)) {
      pos.y = g;
      vel.y = 0;
      onGround = true;
    } else {
      onGround = false;
    }
    if (zoneId !== 'outside') {
      const zone = world.zones[zoneId];
      const maxFeet = zone.ceilingY - PLAYER.EYE_HEIGHT - PLAYER.HEAD_CLEARANCE;
      if (pos.y > maxFeet) {
        pos.y = maxFeet;
        vel.y = Math.min(vel.y, 0);
      }
    }
    syncCamera();
  }

  return {
    controls,
    position: pos,
    get zoneId() {
      return zoneId;
    },
    get onGround() {
      return onGround;
    },
    get hitMapEdge() {
      return hitMapEdge;
    },
    get isMoving() {
      return Math.hypot(vel.x, vel.z) > 0.3;
    },
    set frozen(v) {
      frozen = v;
      if (v) {
        vel.x = 0;
        vel.z = 0;
      }
    },
    placeAt,
    update,
    set dragLook(v) {
      dragLook = v;
      dragging = false;
    },
    get dragLook() {
      return dragLook;
    },
    forward2d() {
      camera.getWorldDirection(forward);
      return { x: forward.x, z: forward.z };
    },
  };
}
