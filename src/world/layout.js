// layout.js — where things are in the base (metres, y up). Pure data, no Three.js.
// Level layout, not gameplay rates. Azimuth convention: 0° = −Z, 90° = +X.

export const LAYOUT = {
  BASE_GROUND_Y: 0,
  // Flattened, bulldozed pad around the base.
  FLAT_AREA: { minX: -32, maxX: 26, minZ: -14, maxZ: 42, blend: 16 },

  HABITAT: {
    x: 0,
    z: 0,
    length: 12, // along X
    radius: 2.6, // outer shell
    innerRadius: 2.45,
    axisY: 2.9, // module lies on short legs
    floorY: 1.3,
    // Walkable interior rectangle (player centre is kept RADIUS inside it).
    interior: { minX: -5.7, maxX: 5.7, minZ: -1.85, maxZ: 1.85, ceilingY: 4.6 },
    airlock: { x: 2.5, zStart: 2.2, zEnd: 4.6, width: 2.6, height: 2.6 },
    spawn: { x: -3.4, z: 0, yawDeg: 90 }, // facing +X, toward the airlock side
    innerDoor: { x: 2.5, z: 1.8 },
    insideArrive: { x: 2.5, z: 0.6, yawDeg: 0 }, // after entering: facing −Z, into the room
    outsideArrive: { x: 2.5, z: 7.2, yawDeg: 180 }, // after exiting: facing +Z, away from the hab
    outerDoor: { x: 2.5, z: 6.0 },
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
    [3.5, 9.5], [1.5, 13], [0, 17], [-1, 21], [-2, 25], [-3.6, 28],
    [-2.5, 9], [-7.5, 10.5], [-12.5, 12], [-16.5, 13],
  ],

  // Far hills ring (also hides the Sun during the ridge period).
  HORIZON: { innerRadius: 300, outerRadius: 460, segments: 180 },
  TERRAIN_SIZE: 640,
};
