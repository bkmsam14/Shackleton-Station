// collision.js — pure 2D (top-down) collision for a circle-shaped player. No Three.js.
// Colliders: { type: 'box', minX, maxX, minZ, maxZ } or { type: 'circle', x, z, r }.

/** Push the point (x, z) with radius r out of every collider. Returns {x, z}. */
export function resolveCircle(x, z, r, colliders, iterations = 3) {
  for (let it = 0; it < iterations; it++) {
    let moved = false;
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (c.type === 'circle') {
        const dx = x - c.x;
        const dz = z - c.z;
        const min = r + c.r;
        const d2 = dx * dx + dz * dz;
        if (d2 < min * min) {
          const d = Math.sqrt(d2) || 1e-6;
          const push = min - d;
          x += (dx / d) * push;
          z += (dz / d) * push;
          moved = true;
        }
      } else {
        // closest point on the box to the circle centre
        const cx = Math.max(c.minX, Math.min(x, c.maxX));
        const cz = Math.max(c.minZ, Math.min(z, c.maxZ));
        const dx = x - cx;
        const dz = z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 > 0 && d2 < r * r) {
          const d = Math.sqrt(d2);
          x += (dx / d) * (r - d);
          z += (dz / d) * (r - d);
          moved = true;
        } else if (d2 === 0) {
          // centre is inside the box: leave along the shortest axis
          const left = x - c.minX;
          const right = c.maxX - x;
          const back = z - c.minZ;
          const front = c.maxZ - z;
          const m = Math.min(left, right, back, front);
          if (m === left) x = c.minX - r;
          else if (m === right) x = c.maxX + r;
          else if (m === back) z = c.minZ - r;
          else z = c.maxZ + r;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  return { x, z };
}

/** Keep the circle inside a rectangle (room walls). */
export function clampInsideRect(x, z, r, rect) {
  return {
    x: Math.max(rect.minX + r, Math.min(rect.maxX - r, x)),
    z: Math.max(rect.minZ + r, Math.min(rect.maxZ - r, z)),
  };
}

/** Keep the point within a circle of radius maxR around (cx, cz) — the edge of the map. */
export function clampInsideCircle(x, z, cx, cz, maxR) {
  const dx = x - cx;
  const dz = z - cz;
  const d = Math.hypot(dx, dz);
  if (d <= maxR) return { x, z, clamped: false };
  return { x: cx + (dx / d) * maxR, z: cz + (dz / d) * maxR, clamped: true };
}
