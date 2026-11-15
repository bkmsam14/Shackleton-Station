import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAIRS, stairHeight, groundHeight, airlockColliders } from '../src/world/ground.js';
import { heightAt } from '../src/world/heightfield.js';
import { resolveCircle } from '../src/player/collision.js';
import { PLAYER } from '../src/config/gameplay.js';

const midX = (STAIRS.minX + STAIRS.maxX) / 2;

test('the stairs rise from the ground to the airlock floor', () => {
  const bottom = stairHeight(midX, STAIRS.bottomZ - 0.01);
  const top = stairHeight(midX, STAIRS.topZ + 0.01);
  assert.ok(bottom < 0.4, 'low at the bottom');
  assert.ok(Math.abs(top - STAIRS.topY) < 1e-9, 'airlock floor at the top');
  // always going up toward the hatch
  let last = -1;
  for (let z = STAIRS.bottomZ; z >= STAIRS.topZ; z -= 0.05) {
    const h = stairHeight(midX, z);
    assert.ok(h >= last - 1e-9);
    last = h;
  }
});

test('off the stairs the ground is just the terrain', () => {
  assert.equal(stairHeight(STAIRS.maxX + 0.5, (STAIRS.topZ + STAIRS.bottomZ) / 2), null);
  assert.equal(groundHeight(midX + 5, STAIRS.bottomZ + 3), heightAt(midX + 5, STAIRS.bottomZ + 3));
});

test('the stairs are not blocked: you can stand on the top step', () => {
  const r = PLAYER.RADIUS;
  const z = STAIRS.topZ + r + 0.05; // right in front of the hatch
  const p = resolveCircle(midX, z, r, airlockColliders());
  assert.ok(Math.abs(p.x - midX) < 1e-9 && Math.abs(p.z - z) < 1e-9, 'not pushed away');
  assert.ok(groundHeight(midX, z) > STAIRS.topY - 0.5, 'standing high up');
});

test('the handrails stop you stepping off the side', () => {
  const r = PLAYER.RADIUS;
  const z = (STAIRS.topZ + STAIRS.bottomZ) / 2;
  const p = resolveCircle(STAIRS.maxX + 0.1, z, r, airlockColliders());
  assert.ok(p.x < STAIRS.maxX + 0.1 || p.x > STAIRS.maxX + 0.2, 'pushed by the rail');
});

test('the habitat hatch can only be used from the top of the stairs', async () => {
  const { findInteractable } = await import('../src/player/interact.js');
  const { LAYOUT } = await import('../src/world/layout.js');
  const H = LAYOUT.HABITAT;
  const door = { id: 'hab-outer-door', zone: 'outside', x: H.x + H.outerDoor.x, z: H.z + H.outerDoor.z, reach: H.outerDoorReach };
  const up = { x: 0, z: -1 }; // facing the hatch (−Z)
  assert.equal(findInteractable([door], 'outside', midX, STAIRS.bottomZ + 0.4, up), null, 'not from the ground');
  assert.equal(findInteractable([door], 'outside', midX, STAIRS.topZ + 0.45, up), door, 'yes at the hatch');
});
