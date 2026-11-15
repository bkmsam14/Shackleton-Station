import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createNavGrid,
  rebuildNavGrid,
  isWalkable,
  nearestWalkable,
  lineOfSight,
  findPath,
  pathLength,
  pointAlong,
} from '../src/systems/navigation.js';
import { LAYOUT } from '../src/world/layout.js';

// A room 10 × 6 m split by a wall at x = 5 with a 2 m doorway in the middle (z 2..4).
const ROOM = { minX: 0, maxX: 10, minZ: 0, maxZ: 6 };
const WALL = [
  { type: 'box', minX: 4.9, maxX: 5.1, minZ: 0, maxZ: 2 },
  { type: 'box', minX: 4.9, maxX: 5.1, minZ: 4, maxZ: 6 },
];
const room = () => createNavGrid({ ...ROOM, cell: 0.1, agentR: 0.35, rect: ROOM }, WALL);

/** Every point along the path (sampled finely) is walkable. */
function pathIsClear(grid, path) {
  for (let i = 1; i < path.length; i++) {
    if (!lineOfSight(grid, path[i - 1].x, path[i - 1].z, path[i].x, path[i].z)) return false;
  }
  return true;
}

test('walls (grown by the agent radius) are not walkable, open floor is', () => {
  const g = room();
  assert.equal(isWalkable(g, 2, 3), true);
  assert.equal(isWalkable(g, 5, 1), false); // inside the wall
  assert.equal(isWalkable(g, 5.3, 1), false); // closer than the agent radius
  assert.equal(isWalkable(g, 0.1, 3), false); // against the room wall
  assert.equal(isWalkable(g, 5, 3), true); // the doorway
});

test('the path goes through the doorway and never through a wall', () => {
  const g = room();
  const p = findPath(g, 2, 1, 8, 1);
  assert.ok(p, 'a path exists');
  assert.ok(pathIsClear(g, p));
  const crossing = p.some((pt, i) => i > 0 && (p[i - 1].x - 5) * (pt.x - 5) <= 0 && Math.min(p[i - 1].z, pt.z) <= 4 && Math.max(p[i - 1].z, pt.z) >= 2);
  assert.ok(crossing, 'crosses x = 5 inside the doorway');
  assert.ok(pathLength(p) > 6, 'longer than the straight line through the wall');
  assert.ok(p.length <= 6, 'smoothed to a few corners');
});

test('a clear straight line is a 2-point path', () => {
  const g = room();
  const p = findPath(g, 1, 3, 9, 3);
  assert.equal(p.length, 2);
});

test('no way through → null', () => {
  const g = createNavGrid({ ...ROOM, cell: 0.1, agentR: 0.35, rect: ROOM }, [{ type: 'box', minX: 4.9, maxX: 5.1, minZ: 0, maxZ: 6 }]);
  assert.equal(findPath(g, 2, 3, 8, 3), null);
});

test('a goal inside a machine snaps to the nearest floor in front of it', () => {
  const g = room();
  const p = nearestWalkable(g, 5, 1); // inside the wall
  assert.ok(p);
  assert.ok(isWalkable(g, p.x, p.z));
  assert.ok(Math.abs(p.x - 5) < 0.6);
  const path = findPath(g, 1, 1, 5, 1);
  assert.ok(isWalkable(g, path.at(-1).x, path.at(-1).z));
});

test('rebuilding picks up a new collider (a crate landed)', () => {
  const g = room();
  assert.equal(isWalkable(g, 8, 3), true);
  rebuildNavGrid(g, [...WALL, { type: 'circle', x: 8, z: 3, r: 0.6 }]);
  assert.equal(isWalkable(g, 8, 3), false);
  const p = findPath(g, 6, 3, 9.5, 3);
  assert.ok(pathIsClear(g, p));
});

test('the map edge disc is respected outside', () => {
  const g = createNavGrid({ minX: -20, maxX: 20, minZ: -20, maxZ: 20, cell: 0.5, agentR: 0.4, circle: { x: 0, z: 0, r: 10 } });
  assert.equal(isWalkable(g, 0, 0), true);
  assert.equal(isWalkable(g, 12, 0), false);
});

test('pointAlong walks the path and gives the heading', () => {
  const path = [
    { x: 0, z: 0 },
    { x: 4, z: 0 },
    { x: 4, z: 3 },
  ];
  assert.equal(pathLength(path), 7);
  const a = pointAlong(path, 2);
  assert.deepEqual([a.x, a.z, a.dx, a.dz], [2, 0, 1, 0]);
  const b = pointAlong(path, 5);
  assert.deepEqual([b.x, b.z, b.dx, b.dz], [4, 1, 0, 1]);
  const c = pointAlong(path, 99); // past the end → the end
  assert.deepEqual([c.x, c.z], [4, 3]);
});

test('real habitat: the bulkhead doorway is wide enough to walk through', () => {
  const H = LAYOUT.HABITAT;
  const rect = { minX: H.x + H.interior.minX, maxX: H.x + H.interior.maxX, minZ: H.z + H.interior.minZ, maxZ: H.z + H.interior.maxZ };
  const bx = H.bulkheadX;
  const dh = H.bulkheadDoorHalf;
  const bulkhead = [
    { type: 'box', minX: bx - 0.14, maxX: bx + 0.14, minZ: -3.1, maxZ: -dh },
    { type: 'box', minX: bx - 0.14, maxX: bx + 0.14, minZ: dh, maxZ: 3.1 },
  ];
  const g = createNavGrid({ ...rect, cell: 0.15, agentR: 0.38, rect }, bulkhead);
  const p = findPath(g, H.spawn.x, H.spawn.z, H.x + 8.0, H.z - 0.5);
  assert.ok(p);
  assert.ok(pathIsClear(g, p));
});
