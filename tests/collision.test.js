import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCircle, clampInsideRect } from '../src/player/collision.js';
import { findInteractable } from '../src/player/interact.js';

test('circle is pushed out of a box wall', () => {
  const box = { type: 'box', minX: 0, maxX: 10, minZ: 0, maxZ: 1 };
  const p = resolveCircle(5, -0.2, 0.35, [box]);
  assert.ok(p.z <= -0.35 + 1e-9);
});

test('circle centre inside a box leaves by the shortest side', () => {
  const box = { type: 'box', minX: 0, maxX: 10, minZ: 0, maxZ: 2 };
  const p = resolveCircle(5, 0.3, 0.35, [box]);
  assert.equal(p.z, -0.35);
});

test('circle vs circle collider', () => {
  const p = resolveCircle(1, 0, 0.5, [{ type: 'circle', x: 0, z: 0, r: 1 }]);
  assert.ok(Math.abs(Math.hypot(p.x, p.z) - 1.5) < 1e-9);
});

test('room walls keep the player inside', () => {
  const p = clampInsideRect(-10, 10, 0.35, { minX: -5, maxX: 5, minZ: -2, maxZ: 2 });
  assert.deepEqual(p, { x: -4.65, z: 1.65 });
});

test('interactables only work in the same zone (no doors through walls)', () => {
  const items = [{ id: 'in', zone: 'habitat', x: 0, z: 0.5 }, { id: 'out', zone: 'outside', x: 0, z: 0.6 }];
  assert.equal(findInteractable(items, 'outside', 0, 1, { x: 0, z: -1 }).id, 'out');
  assert.equal(findInteractable(items, 'habitat', 0, 1, { x: 0, z: -1 }).id, 'in');
  assert.equal(findInteractable(items, 'greenhouse', 0, 1, { x: 0, z: -1 }), null);
});
