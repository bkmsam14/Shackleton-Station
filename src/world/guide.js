// guide.js — showing the way: a trail of glowing chevrons on the ground from the player to
// the next spot, a bobbing arrow above the machine to use, and a circle on the floor where
// you stand to use it. The way is found on the walkable map (world/walkable.js), so the
// trail goes around furniture and through doors, never through walls.
//
// main.js says WHAT to point at with setTarget(ref):
//   ref = { zone, x, z, kind }  — the machine (or door) itself; kind picks the arrow height
//   and circle size below. The circle goes on the floor right in front of it.
import * as THREE from 'three';
import { MAT } from './materials.js';
import { findPath, nearestWalkable, pathLength, pointAlong } from '../systems/navigation.js';
import { GUIDE } from '../config/gameplay.js';

/**
 * Per kind of target: arrow height above its floor (m), arrow size, circle radius (m).
 * Presentation only (GAME BALANCE, not real data).
 */
const MARKS = {
  electrolysis: { up: 2.5, ring: 0.6 },
  terminal: { up: 2.4, ring: 0.55 },
  oven: { up: 2.3, ring: 0.6 },
  'water-walls': { up: 2.5, ring: 0.6 },
  shelter: { up: 2.2, ring: 1.0 },
  door: { up: 2.7, ring: 0.7 },
  'door-outside': { up: 3.0, ring: 0.8 }, // measured from the ground there (top of the stairs at the habitat)
  pots: { up: 1.9, ring: 0.55 },
  array: { up: 14, ring: 1.3, size: 3 }, // above the top of the tall panel, big enough to see from afar
  crate: { up: 2.4, ring: 0.7 },
  pad: { up: 3, ring: 3.4, size: 1.6, centred: true }, // the whole landing pad
  ice: { up: 1.9, ring: 0.7 },
  telescope: { up: 2.7, ring: 0.7 },
  default: { up: 2.2, ring: 0.6 },
};

/** A flat chevron (pointing +Z) lying on the ground. */
function chevronGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-0.2, -0.1);
  s.lineTo(0, 0.1);
  s.lineTo(0.2, -0.1);
  s.lineTo(0.2, 0.02);
  s.lineTo(0, 0.22);
  s.lineTo(-0.2, 0.02);
  s.closePath();
  const g = new THREE.ShapeGeometry(s);
  g.rotateX(-Math.PI / 2); // lie flat, face up (shape's +Y → world −Z)…
  g.rotateY(Math.PI); // …then turn it to point +Z
  return g;
}

/**
 * world: the World (zones, floor heights); walkable: createWalkable(world);
 * groundAt(zone, x, z): floor height there.
 */
export function createGuide({ walkable, groundAt }) {
  const group = new THREE.Group();
  group.name = 'guide';

  // ---- arrow + circle
  const glow = MAT.glow(0x4fd1e8, 2.2);
  const marker = new THREE.Group();
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.36, 24), glow);
  arrow.rotation.x = Math.PI; // point down
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 56), glow);
  ring.rotation.x = -Math.PI / 2;
  marker.add(arrow, ring);
  marker.visible = false;
  group.add(marker);

  // ---- trail
  const trailMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0x4fd1e8).multiplyScalar(1.6),
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const trail = new THREE.InstancedMesh(chevronGeometry(), trailMat, GUIDE.TRAIL_MAX);
  trail.frustumCulled = false;
  trail.count = 0;
  trail.renderOrder = 2;
  group.add(trail);

  let ref = null; // { zone, x, z, kind }
  let spot = null; // where to stand: { x, z }
  let path = null; // in the target's zone, from the player to `spot`
  let replanIn = 0;
  let lastFrom = null;
  let t = 0;
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const v = new THREE.Vector3();
  const sc = new THREE.Vector3();

  function sameRef(a, b) {
    return a === b || (a && b && a.zone === b.zone && a.kind === b.kind && Math.abs(a.x - b.x) < 0.01 && Math.abs(a.z - b.z) < 0.01);
  }

  return {
    object: group,
    /** The current way from the player to the spot (array of { x, z }) or null. */
    get path() {
      return path;
    },
    /** What to point at: { zone, x, z, kind } or null. */
    setTarget(r) {
      if (sameRef(r, ref)) return;
      ref = r;
      spot = null;
      path = null;
      replanIn = 0;
    },
    update(dt, player) {
      t += dt;
      const show = Boolean(ref) && ref.zone === player.zoneId;
      marker.visible = show;
      if (!show) {
        trail.count = 0;
        path = null;
        return;
      }
      const grid = walkable.gridFor(ref.zone);
      const mk = MARKS[ref.kind] ?? MARKS.default;
      if (!spot) spot = mk.centred ? { x: ref.x, z: ref.z } : (grid && nearestWalkable(grid, ref.x, ref.z, 8)) ?? { x: ref.x, z: ref.z };

      // ---- arrow above the machine, circle where you stand
      const baseY = groundAt(ref.zone, ref.x, ref.z);
      const size = mk.size ?? 1;
      arrow.scale.setScalar(size);
      arrow.position.set(ref.x, baseY + mk.up + Math.sin(t * 3) * 0.12 * size, ref.z);
      const pulse = 1 + Math.sin(t * 3) * 0.05;
      ring.position.set(spot.x, groundAt(ref.zone, spot.x, spot.z) + 0.04, spot.z);
      ring.scale.setScalar(mk.ring * pulse);

      // ---- the way there (replanned a few times a second, or when you move a lot)
      const px = player.position.x;
      const pz = player.position.z;
      replanIn -= dt;
      const movedFar = !lastFrom || Math.hypot(px - lastFrom.x, pz - lastFrom.z) > 0.6;
      if (grid && (replanIn <= 0 || movedFar || !path)) {
        replanIn = GUIDE.REPLAN_S;
        lastFrom = { x: px, z: pz };
        path = findPath(grid, px, pz, spot.x, spot.z);
        if (path) path[0] = { x: px, z: pz }; // start exactly at your feet
      }

      // ---- chevrons flowing along the way
      if (!path) {
        trail.count = 0;
        return;
      }
      // keep the first point glued to the player between replans
      path[0] = { x: px, z: pz };
      const len = pathLength(path);
      const S = GUIDE.TRAIL_SPACING_M;
      const end = len - mk.ring * (mk.centred ? 1 : 0.6); // stop at the circle's edge
      const offset = (t * GUIDE.TRAIL_SPEED_M_S) % S;
      let n = 0;
      for (let d = GUIDE.TRAIL_START_M + offset; d < end && n < GUIDE.TRAIL_MAX; d += S) {
        const p = pointAlong(path, d);
        // fade in near the player and out at the circle
        const fade = Math.min(1, 0.35 + (d - GUIDE.TRAIL_START_M) / 0.8, 0.35 + (end - d) / 0.8);
        q.setFromAxisAngle(up, Math.atan2(p.dx, p.dz));
        v.set(p.x, groundAt(ref.zone, p.x, p.z) + 0.05, p.z);
        sc.setScalar(Math.max(0.05, fade) * 1.7);
        trail.setMatrixAt(n++, m4.compose(v, q, sc));
      }
      trail.count = n;
      trail.instanceMatrix.needsUpdate = true;
    },
  };
}
