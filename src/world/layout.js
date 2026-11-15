// layout.js — where things are in the base (metres, y up). Pure data, no Three.js.
// Level layout, not gameplay rates. Azimuth convention: 0° = −Z, 90° = +X.

export const LAYOUT = {
  BASE_GROUND_Y: 0,
  // Flattened, bulldozed pad around the base.
  FLAT_AREA: { minX: -32, maxX: 26, minZ: -14, maxZ: 42, blend: 16 },

  // v0.2.1: a roomier module — sleeping nook (−X), lounge + galley (middle),
  // work bay with life support and the airlock (+X), split by an open bulkhead.
  HABITAT: {
    x: 0,
    z: 0,
    length: 20, // along X
    radius: 3.6, // outer shell
    innerRadius: 3.45,
    axisY: 3.9, // module lies on short legs
    floorY: 2.3,
    // Walkable interior rectangle (player centre is kept RADIUS inside it).
    interior: { minX: -9.7, maxX: 9.7, minZ: -2.95, maxZ: 2.95, ceilingY: 6.6 },
    bulkheadX: 3.0, // open bulkhead between lounge and work bay
    bulkheadDoorHalf: 1.0, // half-width of its doorway
    // starts at the hull (z 3.5) so it never pokes into the interior
    airlock: { x: 6.5, zStart: 3.5, zEnd: 6.0, width: 2.8, height: 2.9 },
    spawn: { x: -3.2, z: 0.4, yawDeg: 90 }, // lounge, facing +X toward the work bay + airlock
    innerDoor: { x: 6.5, z: 2.95 },
    insideArrive: { x: 6.5, z: 1.7, yawDeg: 0 }, // after entering: facing −Z, into the bay
    outsideArrive: { x: 6.5, z: 8.9, yawDeg: 180 }, // after exiting: facing +Z, away from the hab
    outerDoor: { x: 6.5, z: 8.0 },
    // Storm shelter = the sleeping nook (−X end). Its +Z wall is lined with water tanks.
    // Being inside this rectangle during a particle storm counts as "in the shelter".
    shelter: { minX: -9.7, maxX: -5.6, minZ: -2.95, maxZ: 2.95, spawn: { x: -6.6, z: 0.4, yawDeg: 90 } },
    waterWall: { x0: -8.2, x1: -5.9, z: 2.98, panelX: -6.95 },
  },

  GREENHOUSE: {
    x: 8,
    z: 30,
    length: 16, // along X
    radius: 3.3,
    floorY: 0.15,
    interior: { minX: 0.4, maxX: 15.6, minZ: 27.5, maxZ: 32.5, ceilingY: 3.0 },
    vestibule: { xStart: -1.8, xEnd: 0, width: 2.6, height: 2.7 },
    innerDoor: { x: 0.6, z: 30 },
    insideArrive: { x: 1.6, z: 30, yawDeg: 90 }, // facing +X along the racks
    outsideArrive: { x: -3.4, z: 30, yawDeg: 270 }, // facing −X, back toward the base
    outerDoor: { x: -2.4, z: 30 },
  },

  SOLAR_ARRAY: {
    x: -20,
    z: 14,
    mastHeight: 13,
    panelWidth: 4.2,
    panelHeight: 8,
    panelBottomY: 4.6,
  },

  // Small lamp posts that guide the way between doors.
  PATH_LIGHTS: [
    // habitat airlock → greenhouse door
    [8.2, 10.9], [6.0, 14], [4.0, 17.5], [2.0, 21], [0.0, 24.5], [-1.8, 27.6],
    // habitat airlock → solar array
    [4.6, 10.2], [-0.5, 10.6], [-6, 11.4], [-11.5, 12.4], [-16.4, 13.4],
  ],

  // Far hills ring (also hides the Sun during the ridge period).
  HORIZON: { innerRadius: 300, outerRadius: 460, segments: 180 },
  TERRAIN_SIZE: 640,
};
