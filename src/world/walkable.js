// walkable.js — the walkable-area map of the whole game, built from the world's own
// colliders (the same ones the player bumps into). One grid per place:
//   habitat, greenhouse — the room rectangle minus furniture and machines
//   outside             — the surface minus buildings, rocks and the array, inside the map edge
// A grid is built the first time it is needed and rebuilt when its colliders change (other
// features add some at start-up, and a cargo crate adds one when it lands).
// The pathfinding itself is pure logic in systems/navigation.js.
import { createNavGrid, rebuildNavGrid } from '../systems/navigation.js';
import { GUIDE } from '../config/gameplay.js';

const MAP_EDGE = { x: 0, z: 14, r: 240 }; // same edge as player/controller.js

export function createWalkable(world) {
  const grids = {};
  const counts = {};

  function colliders(zoneId) {
    return zoneId === 'outside' ? world.outdoorColliders : world.zones[zoneId]?.obstacles;
  }

  /** Cheap fingerprint of a collider list: changes when one is added, removed or swapped. */
  function signature(list) {
    let s = list.length;
    for (const c of list) s += (c.type === 'circle' ? c.x * 3.1 + c.z * 7.7 : c.minX * 1.3 + c.maxZ * 5.9) % 97;
    return s;
  }

  function build(zoneId) {
    if (zoneId === 'outside') {
      return createNavGrid({ ...GUIDE.OUTDOOR_BOUNDS, cell: GUIDE.CELL_OUTDOOR_M, agentR: GUIDE.AGENT_R, circle: MAP_EDGE }, world.outdoorColliders);
    }
    const zone = world.zones[zoneId];
    return createNavGrid({ ...zone.rect, cell: GUIDE.CELL_INDOOR_M, agentR: GUIDE.AGENT_R, rect: zone.rect }, zone.obstacles);
  }

  return {
    /** The grid for a place ('habitat' | 'greenhouse' | 'outside'), up to date. null if unknown. */
    gridFor(zoneId) {
      const list = colliders(zoneId);
      if (!list) return null;
      if (!grids[zoneId]) {
        grids[zoneId] = build(zoneId);
        counts[zoneId] = signature(list);
      } else if (signature(list) !== counts[zoneId]) {
        counts[zoneId] = signature(list);
        rebuildNavGrid(grids[zoneId], list);
      }
      return grids[zoneId];
    },
  };
}
