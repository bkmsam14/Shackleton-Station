// navigation.js — where you can walk, and the way there (PURE LOGIC: no Three.js, no DOM).
//
// Each place (habitat, greenhouse, outside) gets a walkable-area grid built from the same
// colliders the player bumps into (player/collision.js shapes), grown by an agent radius so a
// path never brushes a wall. A* finds the way on the grid; then the path is pulled straight
// wherever there is a clear line of sight, so it looks like a person would walk it.
//
// Used by the tutorial trail on the ground and by Volt, who rolls ahead of the player.

/**
 * opts: { minX, maxX, minZ, maxZ, cell, agentR, rect?, circle? }
 *   rect   — walkable room rectangle (indoors): cells must stay agentR inside it
 *   circle — walkable disc { x, z, r } (the map edge outside)
 */
export function createNavGrid(opts, colliders = []) {
  const { minX, minZ, cell } = opts;
  const w = Math.max(1, Math.ceil((opts.maxX - minX) / cell));
  const h = Math.max(1, Math.ceil((opts.maxZ - minZ) / cell));
  const n = w * h;
  const grid = {
    minX,
    minZ,
    cell,
    w,
    h,
    agentR: opts.agentR,
    rect: opts.rect ?? null,
    circle: opts.circle ?? null,
    free: new Uint8Array(n),
    // A* scratch (reused between searches)
    g: new Float32Array(n),
    parent: new Int32Array(n),
    stamp: new Uint32Array(n),
    closed: new Uint32Array(n),
    gen: 0,
    heap: new Int32Array(n),
    f: new Float32Array(n),
  };
  rebuildNavGrid(grid, colliders);
  return grid;
}

/** Recompute which cells are walkable (call again when colliders change, e.g. a crate lands). */
export function rebuildNavGrid(grid, colliders) {
  const { w, h, cell, minX, minZ, agentR: a, free } = grid;
  const rect = grid.rect;
  const circ = grid.circle;
  for (let j = 0; j < h; j++) {
    const z = minZ + (j + 0.5) * cell;
    for (let i = 0; i < w; i++) {
      const x = minX + (i + 0.5) * cell;
      let ok = true;
      if (rect) ok = x >= rect.minX + a && x <= rect.maxX - a && z >= rect.minZ + a && z <= rect.maxZ - a;
      if (ok && circ) ok = Math.hypot(x - circ.x, z - circ.z) <= circ.r - a;
      free[j * w + i] = ok ? 1 : 0;
    }
  }
  for (const c of colliders) blockCollider(grid, c);
}

function blockCollider(grid, c) {
  const { w, h, cell, minX, minZ, agentR: a, free } = grid;
  const bx0 = c.type === 'circle' ? c.x - c.r : c.minX;
  const bx1 = c.type === 'circle' ? c.x + c.r : c.maxX;
  const bz0 = c.type === 'circle' ? c.z - c.r : c.minZ;
  const bz1 = c.type === 'circle' ? c.z + c.r : c.maxZ;
  const i0 = Math.max(0, Math.floor((bx0 - a - minX) / cell));
  const i1 = Math.min(w - 1, Math.floor((bx1 + a - minX) / cell));
  const j0 = Math.max(0, Math.floor((bz0 - a - minZ) / cell));
  const j1 = Math.min(h - 1, Math.floor((bz1 + a - minZ) / cell));
  for (let j = j0; j <= j1; j++) {
    const z = minZ + (j + 0.5) * cell;
    for (let i = i0; i <= i1; i++) {
      const x = minX + (i + 0.5) * cell;
      let d;
      if (c.type === 'circle') d = Math.hypot(x - c.x, z - c.z) - c.r;
      else {
        const dx = Math.max(c.minX - x, 0, x - c.maxX);
        const dz = Math.max(c.minZ - z, 0, z - c.maxZ);
        d = Math.hypot(dx, dz);
      }
      if (d < a) free[j * w + i] = 0;
    }
  }
}

const cellOf = (grid, x, z) => {
  const i = Math.floor((x - grid.minX) / grid.cell);
  const j = Math.floor((z - grid.minZ) / grid.cell);
  return i < 0 || j < 0 || i >= grid.w || j >= grid.h ? -1 : j * grid.w + i;
};
const centreX = (grid, k) => grid.minX + ((k % grid.w) + 0.5) * grid.cell;
const centreZ = (grid, k) => grid.minZ + (Math.floor(k / grid.w) + 0.5) * grid.cell;

/** Is (x, z) somewhere the agent can stand? */
export function isWalkable(grid, x, z) {
  const k = cellOf(grid, x, z);
  return k >= 0 && grid.free[k] === 1;
}

/** The closest walkable point to (x, z) — itself if it is already walkable. null if none near. */
export function nearestWalkable(grid, x, z, maxDist = 6) {
  if (isWalkable(grid, x, z)) return { x, z };
  const ci = Math.floor((x - grid.minX) / grid.cell);
  const cj = Math.floor((z - grid.minZ) / grid.cell);
  const maxRing = Math.ceil(maxDist / grid.cell);
  let best = null;
  let bestD = Infinity;
  for (let r = 1; r <= maxRing; r++) {
    if (best && (r - 1) * grid.cell > bestD) break;
    for (let dj = -r; dj <= r; dj++) {
      for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue; // ring only
        const i = ci + di;
        const j = cj + dj;
        if (i < 0 || j < 0 || i >= grid.w || j >= grid.h || !grid.free[j * grid.w + i]) continue;
        const px = grid.minX + (i + 0.5) * grid.cell;
        const pz = grid.minZ + (j + 0.5) * grid.cell;
        const d = Math.hypot(px - x, pz - z);
        if (d < bestD) {
          bestD = d;
          best = { x: px, z: pz };
        }
      }
    }
  }
  return best && bestD <= maxDist ? best : null;
}

/** True if a straight walk from a to b stays on walkable cells. */
export function lineOfSight(grid, ax, az, bx, bz) {
  const d = Math.hypot(bx - ax, bz - az);
  const steps = Math.max(1, Math.ceil(d / (grid.cell * 0.5)));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    if (!isWalkable(grid, ax + (bx - ax) * t, az + (bz - az) * t)) return false;
  }
  return true;
}

const SQRT2 = Math.SQRT2;
const N8 = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, SQRT2],
  [1, -1, SQRT2],
  [-1, 1, SQRT2],
  [-1, -1, SQRT2],
];

/**
 * Shortest walkable path from (sx, sz) to (tx, tz): an array of points { x, z } that starts
 * at the start and ends at the goal (each moved onto walkable ground if needed).
 * null when there is no way (or the search gives up after maxExpand cells).
 */
export function findPath(grid, sx, sz, tx, tz, { maxExpand = 60000 } = {}) {
  const s = nearestWalkable(grid, sx, sz);
  const t = nearestWalkable(grid, tx, tz);
  if (!s || !t) return null;
  if (lineOfSight(grid, s.x, s.z, t.x, t.z)) return [s, t];
  const start = cellOf(grid, s.x, s.z);
  const goal = cellOf(grid, t.x, t.z);
  const { w, free, g, parent, stamp, closed, heap, f } = grid;
  const gen = ++grid.gen;
  const gx = goal % w;
  const gz = Math.floor(goal / w);
  const hfun = (k) => {
    const dx = Math.abs((k % w) - gx);
    const dz = Math.abs(Math.floor(k / w) - gz);
    return Math.max(dx, dz) + (SQRT2 - 1) * Math.min(dx, dz); // octile distance
  };
  // binary min-heap on f
  let size = 0;
  const push = (k) => {
    let i = size++;
    heap[i] = k;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (f[heap[p]] <= f[heap[i]]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = heap[0];
    heap[0] = heap[--size];
    let i = 0;
    for (;;) {
      const l = i * 2 + 1;
      const r = l + 1;
      let m = i;
      if (l < size && f[heap[l]] < f[heap[m]]) m = l;
      if (r < size && f[heap[r]] < f[heap[m]]) m = r;
      if (m === i) break;
      [heap[m], heap[i]] = [heap[i], heap[m]];
      i = m;
    }
    return top;
  };
  stamp[start] = gen;
  g[start] = 0;
  parent[start] = -1;
  f[start] = hfun(start);
  push(start);
  let found = false;
  let expanded = 0;
  while (size > 0) {
    const k = pop();
    if (closed[k] === gen) continue;
    closed[k] = gen;
    if (k === goal) {
      found = true;
      break;
    }
    if (++expanded > maxExpand) break;
    const ki = k % w;
    const kj = Math.floor(k / w);
    for (const [di, dj, cost] of N8) {
      const i = ki + di;
      const j = kj + dj;
      if (i < 0 || j < 0 || i >= w || j >= grid.h) continue;
      const nk = j * w + i;
      if (!free[nk] || closed[nk] === gen) continue;
      // no cutting corners past a blocked cell
      if (di && dj && (!free[kj * w + i] || !free[j * w + ki])) continue;
      const ng = g[k] + cost;
      if (stamp[nk] === gen && ng >= g[nk]) continue;
      stamp[nk] = gen;
      g[nk] = ng;
      parent[nk] = k;
      f[nk] = ng + hfun(nk);
      push(nk);
    }
  }
  if (!found) return null;
  const cells = [];
  for (let k = goal; k !== -1; k = parent[k]) cells.push(k);
  cells.reverse();
  const raw = [s, ...cells.slice(1, -1).map((k) => ({ x: centreX(grid, k), z: centreZ(grid, k) })), t];
  return smoothPath(grid, raw);
}

/** Pull the path tight: skip every corner that has a clear line of sight past it. */
export function smoothPath(grid, pts) {
  if (pts.length <= 2) return pts.slice();
  const out = [pts[0]];
  let anchor = 0;
  for (let k = 2; k < pts.length; k++) {
    const a = pts[anchor];
    if (!lineOfSight(grid, a.x, a.z, pts[k].x, pts[k].z)) {
      out.push(pts[k - 1]);
      anchor = k - 1;
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/** Total length of a path (m). */
export function pathLength(path) {
  let d = 0;
  for (let i = 1; i < path.length; i++) d += Math.hypot(path[i].x - path[i - 1].x, path[i].z - path[i - 1].z);
  return d;
}

/** The point `dist` metres along the path, plus the walking direction there (unit dx, dz). */
export function pointAlong(path, dist) {
  if (!path.length) return null;
  let left = Math.max(0, dist);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const seg = Math.hypot(b.x - a.x, b.z - a.z);
    if (seg < 1e-9) continue;
    if (left <= seg || i === path.length - 1) {
      const t = Math.min(1, left / seg);
      return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, dx: (b.x - a.x) / seg, dz: (b.z - a.z) / seg };
    }
    left -= seg;
  }
  const p = path[path.length - 1];
  return { x: p.x, z: p.z, dx: 0, dz: 1 };
}
