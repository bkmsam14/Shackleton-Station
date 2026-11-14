// volt.js — Volt, the helper robot, in 3D: the model, rolling after the player, and the
// tour marker. Behaviour numbers live in config/gameplay.js → ASSISTANT.
//
// Science note: Volt ROLLS on wheels everywhere. The Moon has almost no air, so fans or
// propellers could not push against anything outside (real Moon rovers use wheels).
//
// Swap-friendly: createVoltModel() is the only place that builds the look, so a teammate
// can replace it with a glTF later (keep the returned { object, setMood, spinWheels, ... }).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rbox } from './details.js';
import { MAT } from './materials.js';
import { heightAt } from './heightfield.js';
import { resolveCircle, clampInsideRect } from '../player/collision.js';
import { ASSISTANT } from '../config/gameplay.js';

const INK = '#10182c';
const WHEEL_R = 0.11;
const HEAD_HEIGHT = 0.98; // where the speech bubble anchors (m above the ground)

// Shared look (same colours as the 2D Volt in instances/electrolysis/icons.js)
const MATS = {
  white: () => new THREE.MeshStandardMaterial({ color: 0xe8eefb, roughness: 0.35, metalness: 0.05 }),
  orange: () => new THREE.MeshStandardMaterial({ color: 0xff7a59, roughness: 0.45 }),
  dark: () => new THREE.MeshStandardMaterial({ color: 0x24304f, roughness: 0.6, metalness: 0.3 }),
  tyre: () => new THREE.MeshStandardMaterial({ color: 0x1a1f2b, roughness: 0.9 }),
};

/** Place a geometry: rotate/translate copy. Non-indexed, so mixed shapes can be merged
 *  (RoundedBoxGeometry has no index, CylinderGeometry has one — mergeGeometries needs a match). */
function placed(geo, x, y, z, rx = 0, ry = 0, rz = 0) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz)));
  g.translate(x, y, z);
  return g;
}

// ---------------------------------------------------------------- face (canvas texture)
function drawFace(ctx, mood, mouthOpen = 0) {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, 60);
  ctx.fill();
  ctx.strokeStyle = ctx.fillStyle = '#4fd1e8';
  ctx.lineWidth = 18;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const ex = [W * 0.3, W * 0.7];
  const ey = H * 0.42;
  for (const x of ex) {
    ctx.beginPath();
    if (mood === 'happy') ctx.arc(x, ey + 14, 26, Math.PI * 1.15, Math.PI * 1.85);
    else if (mood === 'cheer') {
      ctx.moveTo(x - 24, ey + 12);
      ctx.lineTo(x, ey - 14);
      ctx.lineTo(x + 24, ey + 12);
    } else if (mood === 'think' && x === ex[1]) {
      ctx.moveTo(x - 22, ey);
      ctx.lineTo(x + 22, ey);
    } else {
      ctx.arc(x, ey, mood === 'wow' ? 24 : 18, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.stroke();
  }
  // mouth (while talking it opens and closes)
  const my = H * 0.74;
  ctx.beginPath();
  if (mouthOpen > 0) {
    ctx.ellipse(W / 2, my, 30, 6 + mouthOpen * 18, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (mood === 'wow') {
    ctx.ellipse(W / 2, my, 18, 22, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (mood === 'think') {
    ctx.moveTo(W / 2 - 30, my);
    ctx.lineTo(W / 2 + 30, my);
    ctx.stroke();
  } else {
    ctx.arc(W / 2, my - 22, 40, Math.PI * 0.2, Math.PI * 0.8);
    ctx.stroke();
  }
}

/** Builds Volt's look. Faces +Z. ~6 draw calls (parts merged by material, wheels instanced). */
export function createVoltModel() {
  const root = new THREE.Group();
  root.name = 'volt';
  const body = new THREE.Group(); // everything above the wheels (leans when turning)
  root.add(body);

  // static parts merged per material
  const white = mergeGeometries([placed(rbox(0.58, 0.44, 0.42, 0.13, 4), 0, 0.66, 0)]);
  const orange = mergeGeometries([
    placed(rbox(0.38, 0.17, 0.32, 0.06, 3), 0, 0.34, 0), // belly
    placed(rbox(0.08, 0.2, 0.13, 0.035, 3), -0.33, 0.64, 0), // arms
    placed(rbox(0.08, 0.2, 0.13, 0.035, 3), 0.33, 0.64, 0),
  ]);
  const dark = mergeGeometries([
    placed(rbox(0.52, 0.1, 0.44, 0.04, 2), 0, 0.2, 0), // chassis
    placed(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 16), 0, 0.46, 0), // neck
    placed(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 8), 0, 0.95, 0), // antenna stem
    placed(rbox(0.46, 0.31, 0.03, 0.05, 2), 0, 0.67, 0.205), // face bezel
  ]);
  const meshes = [
    new THREE.Mesh(white, MATS.white()),
    new THREE.Mesh(orange, MATS.orange()),
    new THREE.Mesh(dark, MATS.dark()),
  ];
  for (const m of meshes) {
    m.castShadow = true;
    body.add(m);
  }

  // face screen (unlit, slightly bright so bloom gives it a soft glow on High)
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 168;
  const fctx = canvas.getContext('2d');
  const faceTex = new THREE.CanvasTexture(canvas);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.276),
    new THREE.MeshBasicMaterial({ map: faceTex, transparent: true }),
  );
  face.position.set(0, 0.67, 0.222);
  body.add(face);

  // antenna light (own material so it can blink)
  const lightMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffd43b).multiplyScalar(1.6) });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), lightMat);
  bulb.position.set(0, 1.05, 0);
  body.add(bulb);

  // wheels: one instanced mesh, matrices updated as they spin
  const wheelGeo = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.07, 24).rotateZ(Math.PI / 2);
  const wheels = new THREE.InstancedMesh(wheelGeo, MATS.tyre(), 4);
  wheels.castShadow = true;
  const WHEEL_POS = [
    [-0.28, WHEEL_R, 0.15],
    [0.28, WHEEL_R, 0.15],
    [-0.28, WHEEL_R, -0.15],
    [0.28, WHEEL_R, -0.15],
  ];
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const xAxis = new THREE.Vector3(1, 0, 0);
  const one = new THREE.Vector3(1, 1, 1);
  function spinWheels(angle) {
    q.setFromAxisAngle(xAxis, angle);
    WHEEL_POS.forEach(([x, y, z], i) => wheels.setMatrixAt(i, m4.compose(new THREE.Vector3(x, y, z), q, one)));
    wheels.instanceMatrix.needsUpdate = true;
  }
  spinWheels(0);
  root.add(wheels);

  let mood = null;
  let mouth = 0;
  function redraw() {
    drawFace(fctx, mood, mouth);
    faceTex.needsUpdate = true;
  }
  function setMood(m) {
    if (m === mood) return;
    mood = m;
    redraw();
  }
  /** 0 = closed (mood mouth), 0..1 = open while talking. */
  function setMouth(open) {
    const q = Math.round(open * 3) / 3; // few steps → few texture uploads
    if (q === mouth) return;
    mouth = q;
    redraw();
  }
  setMood('happy');

  return {
    object: root,
    body,
    setMood,
    setMouth,
    spinWheels,
    setLight(on) {
      lightMat.color.setHex(on ? 0xffd43b : 0xff7a59).multiplyScalar(on ? 1.6 : 1.2);
    },
  };
}

// ---------------------------------------------------------------- following the player
export function createVolt(world) {
  const model = createVoltModel();
  const pos = new THREE.Vector3();
  let zoneId = null;
  let yaw = 0;
  let speed = 0;
  let wheelAngle = 0;
  let lean = 0;
  let t = 0;

  function groundY(zone, x, z) {
    return zone === 'outside' ? heightAt(x, z) : world.zones[zone].floorY;
  }

  function collide(zone, x, z) {
    const r = ASSISTANT.RADIUS_M;
    if (zone === 'outside') return resolveCircle(x, z, r, world.outdoorColliders);
    const zn = world.zones[zone];
    const p = resolveCircle(x, z, r, zn.obstacles);
    return clampInsideRect(p.x, p.z, r, zn.rect);
  }

  /**
   * Where Volt wants to be. Normally behind and to the right (out of the way); while he
   * is talking, in front and to the right, so the kid can see who is speaking.
   */
  function followPoint(player, talking = false) {
    const f = player.forward2d();
    const fl = Math.hypot(f.x, f.z) || 1;
    const fx = f.x / fl;
    const fz = f.z / fl;
    // right-hand side of the view direction (forward −Z → right +X)
    const rx = -fz;
    const rz = fx;
    const ahead = talking ? ASSISTANT.TALK_AHEAD_M : -ASSISTANT.FOLLOW_BEHIND_M;
    const side = talking ? ASSISTANT.TALK_SIDE_M : ASSISTANT.FOLLOW_SIDE_M;
    return {
      x: player.position.x + fx * ahead + rx * side,
      z: player.position.z + fz * ahead + rz * side,
    };
  }

  function hopTo(player) {
    zoneId = player.zoneId;
    const p = followPoint(player);
    const c = collide(zoneId, p.x, p.z);
    pos.set(c.x, groundY(zoneId, c.x, c.z), c.z);
    speed = 0;
  }

  return {
    model,
    object: model.object,
    position: pos,
    get zoneId() {
      return zoneId;
    },
    /** World position of Volt's head (where the speech bubble points). */
    headPosition(out = new THREE.Vector3()) {
      return out.set(pos.x, pos.y + HEAD_HEIGHT, pos.z);
    },
    /** Teleport next to the player right now (doors, wake-up after gentle failure). */
    hopTo,
    /**
     * opts.talking: Volt is speaking → roll into view.
     * opts.waiting: the player is looking at Volt → stay put (so "E to talk" is easy).
     */
    update(dt, player, { talking = false, waiting = false, speaking = false } = {}) {
      t += dt;
      const far = Math.hypot(pos.x - player.position.x, pos.z - player.position.z) > ASSISTANT.CATCH_UP_M;
      if (zoneId !== player.zoneId || far) hopTo(player); // "rides through the airlock with you"

      const target = waiting ? { x: pos.x, z: pos.z } : followPoint(player, talking);
      const dx = target.x - pos.x;
      const dz = target.z - pos.z;
      const dist = Math.hypot(dx, dz);
      const want = dist > 0.2 ? Math.min(ASSISTANT.SPEED_M_S, dist * 2.2) : 0;
      speed += (want - speed) * Math.min(1, dt * 6);
      let nx = pos.x;
      let nz = pos.z;
      if (dist > 0.001 && speed > 0.01) {
        nx += (dx / dist) * speed * dt;
        nz += (dz / dist) * speed * dt;
      }
      // never stand inside the player
      const px = nx - player.position.x;
      const pz = nz - player.position.z;
      const pd = Math.hypot(px, pz);
      const minGap = 0.75;
      if (pd < minGap && pd > 0.0001) {
        nx = player.position.x + (px / pd) * minGap;
        nz = player.position.z + (pz / pd) * minGap;
      }
      const c = collide(zoneId, nx, nz);
      const moved = Math.hypot(c.x - pos.x, c.z - pos.z);
      pos.set(c.x, groundY(zoneId, c.x, c.z), c.z);

      // face where it rolls; when parked, turn to look at the player
      const lookX = moved > 0.002 ? dx : player.position.x - pos.x;
      const lookZ = moved > 0.002 ? dz : player.position.z - pos.z;
      const targetYaw = Math.atan2(lookX, lookZ);
      let dy = targetYaw - yaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      yaw += dy * Math.min(1, dt * 5);
      lean += (Math.max(-0.25, Math.min(0.25, -dy)) * Math.min(1, speed) - lean) * Math.min(1, dt * 4);

      wheelAngle += (moved / WHEEL_R) * (dt > 0 ? 1 : 0);
      model.spinWheels(wheelAngle);
      model.object.position.copy(pos);
      model.object.rotation.y = yaw;
      model.body.rotation.z = lean * 0.4;
      model.body.position.y = speed < 0.05 ? Math.sin(t * 2.2) * 0.012 : 0; // idle "breathing"
      model.setLight(Math.sin(t * 4) > -0.3);
      // talking mouth: a simple open/close rhythm while the voice is speaking
      model.setMouth(speaking ? 0.35 + 0.65 * Math.abs(Math.sin(t * 9)) * (Math.sin(t * 2.3) > -0.6 ? 1 : 0.3) : 0);
    },
  };
}

// ---------------------------------------------------------------- tour marker
/** A bobbing cyan arrow + ground ring that shows the next tour spot. */
export function createTourMarker() {
  const group = new THREE.Group();
  group.name = 'tourMarker';
  const glow = MAT.glow(0x4fd1e8, 2.2);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.36, 24), glow);
  arrow.rotation.x = Math.PI; // point down
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.64, 48), glow);
  ring.rotation.x = -Math.PI / 2;
  group.add(arrow, ring);
  group.visible = false;
  let target = null;
  let t = 0;
  return {
    object: group,
    /** target: { zone, x, y, z } or null */
    setTarget(tg) {
      target = tg;
    },
    update(dt, playerZone) {
      t += dt;
      group.visible = Boolean(target) && target.zone === playerZone;
      if (!group.visible) return;
      group.position.set(target.x, target.y, target.z);
      arrow.position.y = 1.7 + Math.sin(t * 3) * 0.12;
      const s = 1 + Math.sin(t * 3) * 0.06;
      ring.scale.set(s, s, s);
      ring.position.y = 0.03;
    },
  };
}
