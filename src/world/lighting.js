// lighting.js — ONE shadow-casting directional light (the Sun) plus a cheap fill.
// The shadow camera follows the player so the shadow map stays sharp near you.
import * as THREE from 'three';

const SUN_INTENSITY = 3.4;
const SHADOW_HALF = 55; // metres around the player that get shadows
const SHADOW_DISTANCE = 260; // light sits this far toward the Sun
const OUTDOOR_SKY = 0x8a93a3;
const OUTDOOR_GROUND = 0x7a766e;
const INDOOR_FILL = {
  habitat: { sky: 0xdfe6ee, ground: 0x6f7986, intensity: 0.12 },
  greenhouse: { sky: 0xd9a6ff, ground: 0x6a4f7a, intensity: 0.38 }, // red + blue LED glow
};

export function createLighting(scene, { shadowMapSize = 2048 } = {}) {
  const sun = new THREE.DirectionalLight(0xfff4e6, SUN_INTENSITY);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  const cam = sun.shadow.camera;
  cam.left = -SHADOW_HALF;
  cam.right = SHADOW_HALF;
  cam.top = SHADOW_HALF;
  cam.bottom = -SHADOW_HALF;
  cam.near = 1;
  cam.far = SHADOW_DISTANCE + SHADOW_HALF * 1.5;
  cam.updateProjectionMatrix();
  // the Sun grazes the ground at ~1.5°, so a generous normal bias avoids acne
  sun.shadow.normalBias = 0.06;
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);

  // Fill: light bounced off bright regolith (from below) and a faint dark-blue sky.
  // No atmosphere, so there is no blue sky light — keep the sky colour very dark.
  // (Readability tuning: real polar ground is darker — this fill stands in for light
  //  reflected from nearby sunlit slopes so kids can see where they walk.)
  const fill = new THREE.HemisphereLight(OUTDOOR_SKY, OUTDOOR_GROUND, 1.0);
  scene.add(fill);

  const snap = new THREE.Vector3();
  const texel = (SHADOW_HALF * 2) / shadowMapSize;

  return {
    sun,
    fill,
    /** focus: player position; sunDir: unit vector to Sun; visibility 0..1 */
    update(focus, sunDir, visibility, zoneId = 'outside') {
      // snap focus to shadow texels to reduce shimmering while walking
      snap.set(Math.round(focus.x / texel) * texel, focus.y, Math.round(focus.z / texel) * texel);
      sun.target.position.copy(snap);
      sun.position.set(
        snap.x + sunDir.x * SHADOW_DISTANCE,
        snap.y + sunDir.y * SHADOW_DISTANCE,
        snap.z + sunDir.z * SHADOW_DISTANCE,
      );
      // Inside a module you can't see outside (no windows yet), so the Sun is switched
      // off there — this stops sunlight leaking onto interior walls — and the fill
      // becomes steady room light.
      const indoor = INDOOR_FILL[zoneId];
      sun.intensity = indoor ? 0 : SUN_INTENSITY * visibility;
      if (indoor) {
        fill.color.setHex(indoor.sky);
        fill.groundColor.setHex(indoor.ground);
        fill.intensity = indoor.intensity;
      } else {
        fill.color.setHex(OUTDOOR_SKY);
        fill.groundColor.setHex(OUTDOOR_GROUND);
        fill.intensity = 0.6 + 0.7 * visibility; // regolith bounce fades with the Sun (floor kept for readability)
      }
    },
    setShadowMapSize(size) {
      sun.shadow.mapSize.set(size, size);
      if (sun.shadow.map) {
        sun.shadow.map.dispose();
        sun.shadow.map = null;
      }
    },
  };
}
