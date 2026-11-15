// volt.js — Volt, the helper robot, in 3D: the model, and rolling ahead of the player
// (the trail, arrow and circle that show the way are in guide.js). Behaviour numbers live in config/gameplay.js → ASSISTANT.
//
// Science note: Volt ROLLS on wheels everywhere. The Moon has almost no air, so fans or
// propellers could not push against anything outside (real Moon rovers use wheels).
//
// Swap-friendly: createVoltModel() is the only place that builds the look, so a teammate
// can replace it with a glTF later (keep the returned { object, setMood, spinWheels, ... }).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rbox } from './details.js';
import { groundHeight } from './ground.js';
import { resolveCircle, clampInsideRect } from '../player/collision.js';
import { ASSISTANT, GUIDE } from '../config/gameplay.js';
import { findPath, isWalkable, nearestWalkable, pathLength, pointAlong } from '../systems/navigation.js';

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

// ---------------------------------------------------------------- leading the player
// Volt rolls AHEAD of the player: along the guide trail when there is one (so he shows the
// way), otherwise a few steps in front of where the player looks. He finds his own way on
// the walkable map (world/walkable.js), so he goes around furniture and never into walls.
export function createVolt(world, walkable = null) {
  const model = createVoltModel();
  const pos = new THREE.Vector3();
  let zoneId = null;
  let yaw = 0;
  let speed = 0;
  let wheelAngle = 0;
  let lean = 0;
  let t = 0;
  let route = null; // Volt's own way to his goal: [{x, z}, ...]
  let routeGoal = null;
  let replanIn = 0;

  function groundY(zone, x, z) {
    return zone === 'outside' ? groundHeight(x, z) : world.zones[zone].floorY;
  }

  function collide(zone, x, z) {
    const r = ASSISTANT.RADIUS_M;
    if (zone === 'outside') return resolveCircle(x, z, r, world.outdoorColliders);
    const zn = world.zones[zone];
    const p = resolveCircle(x, z, r, zn.obstacles);
    return clampInsideRect(p.x, p.z, r, zn.rect);
  }

  const gridFor = (zone) => walkable?.gridFor(zone) ?? null;

  /** Snap a wished-for point onto walkable floor (if the map knows the place). */
  function onFloor(zone, p) {
    const g = gridFor(zone);
    if (!g) return collide(zone, p.x, p.z);
    return nearestWalkable(g, p.x, p.z, 4) ?? nearestWalkable(g, pos.x, pos.z, 4) ?? collide(zone, p.x, p.z);
  }

  /**
   * Where Volt wants to be.
   *  talking     → in front and to the right, so the kid can see who is speaking
   *  lead (path) → GUIDE.VOLT_LEAD_M along the trail, showing the way
   *  otherwise   → a few steps in front of the player, a little to the right
   */
  function goalPoint(player, talking, lead) {
    if (!talking && lead && lead.length > 1) {
      const len = pathLength(lead);
      // near the end: wait beside the spot instead of standing in it
      const d = Math.min(GUIDE.VOLT_LEAD_M, Math.max(0, len - 1.4));
      const p = pointAlong(lead, d);
      if (len - d < 1.6) return { x: p.x - p.dz * 1.1, z: p.z + p.dx * 1.1 }; // step aside (right of the way)
      return { x: p.x, z: p.z };
    }
    const f = player.forward2d();
    const fl = Math.hypot(f.x, f.z) || 1;
    const fx = f.x / fl;
    const fz = f.z / fl;
    // right-hand side of the view direction (forward −Z → right +X)
    const rx = -fz;
    const rz = fx;
    const ahead = talking ? ASSISTANT.TALK_AHEAD_M : GUIDE.VOLT_AHEAD_M;
    const side = talking ? ASSISTANT.TALK_SIDE_M : GUIDE.VOLT_AHEAD_SIDE_M;
    return {
      x: player.position.x + fx * ahead + rx * side,
      z: player.position.z + fz * ahead + rz * side,
    };
  }

  function hopTo(player, lead = null) {
    zoneId = player.zoneId;
    const c = onFloor(zoneId, goalPoint(player, false, lead));
    pos.set(c.x, groundY(zoneId, c.x, c.z), c.z);
    speed = 0;
    route = null;
  }

  /** Next point to roll toward on the way to `goal` (replanned a few times a second). */
  function steerPoint(goal, dt) {
    const g = gridFor(zoneId);
    if (!g) return goal;
    replanIn -= dt;
    const goalMoved = !routeGoal || Math.hypot(goal.x - routeGoal.x, goal.z - routeGoal.z) > 0.5;
    if (!route || replanIn <= 0 || goalMoved) {
      replanIn = GUIDE.REPLAN_S;
      routeGoal = { x: goal.x, z: goal.z };
      route = findPath(g, pos.x, pos.z, goal.x, goal.z);
      if (route) route.shift(); // drop the start (where Volt is)
    }
    if (!route || !route.length) return goal;
    while (route.length > 1 && Math.hypot(route[0].x - pos.x, route[0].z - pos.z) < 0.3) route.shift();
    return route[0];
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
    /** Teleport ahead of the player right now (doors, wake-up after gentle failure). */
    hopTo,
    /**
     * opts.talking: Volt is speaking → roll into view.
     * opts.waiting: the player is looking at Volt → stay put once in place (so "E to talk" is easy).
     * opts.lead:    the guide trail (player → next spot) to lead along, or null.
     */
    update(dt, player, { talking = false, waiting = false, speaking = false, lead = null } = {}) {
      t += dt;
      const far = Math.hypot(pos.x - player.position.x, pos.z - player.position.z) > ASSISTANT.CATCH_UP_M;
      if (zoneId !== player.zoneId || far) hopTo(player, lead); // "rides through the airlock with you"

      let goal = onFloor(zoneId, goalPoint(player, talking, lead));
      // the player is looking at Volt to talk: once he's (nearly) in place, hold still
      if (waiting && Math.hypot(goal.x - pos.x, goal.z - pos.z) < 1.2) goal = { x: pos.x, z: pos.z };
      const toGoal = Math.hypot(goal.x - pos.x, goal.z - pos.z);
      const target = toGoal > 0.2 ? steerPoint(goal, dt) : goal;
      const dx = target.x - pos.x;
      const dz = target.z - pos.z;
      const dist = Math.hypot(dx, dz);
      const want = toGoal > 0.2 ? Math.min(ASSISTANT.SPEED_M_S, toGoal * 2.4) : 0;
      speed += (want - speed) * Math.min(1, dt * 6);
      let nx = pos.x;
      let nz = pos.z;
      if (dist > 0.001 && speed > 0.01) {
        const step = Math.min(dist, speed * dt);
        nx += (dx / dist) * step;
        nz += (dz / dist) * step;
      }
      // never stand inside the player: slide around them (sideways, not through)
      const px = nx - player.position.x;
      const pz = nz - player.position.z;
      const pd = Math.hypot(px, pz);
      const minGap = 0.75;
      if (pd < minGap && pd > 0.0001) {
        nx = player.position.x + (px / pd) * minGap;
        nz = player.position.z + (pz / pd) * minGap;
      }
      // walls: stay on walkable floor (the map), then the exact colliders as a last guard
      const g = gridFor(zoneId);
      if (g && !isWalkable(g, nx, nz) && isWalkable(g, pos.x, pos.z)) {
        // slide along the wall: try each axis on its own
        if (isWalkable(g, nx, pos.z)) nz = pos.z;
        else if (isWalkable(g, pos.x, nz)) nx = pos.x;
        else {
          nx = pos.x;
          nz = pos.z;
        }
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
