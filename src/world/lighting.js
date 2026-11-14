// lighting.js — Moon lighting.
//  • ONE shadow-casting directional light: the low, harsh Sun (no atmosphere = no haze).
//  • Shadows outside are near-black: the only other light is faint earthshine (whose
//    strength follows Earth's real phase) plus the regolith/horizon environment map.
//  • A helmet lamp (spot light on the camera, outside only, no shadows) lets kids see
//    in the dark shadows — real spacesuit helmets carry lights too.
// The shadow camera follows the player so the shadow map stays sharp near you.
import * as THREE from 'three';
import { SKY } from '../config/gameplay.js';
import { skyDirection } from '../systems/daycycle.js';

const SUN_INTENSITY = 3.6;
const SHADOW_HALF = 40; // metres around the player that get shadows (tight = sharper)
const SHADOW_DISTANCE = 220; // light sits this far toward the Sun
const EARTHSHINE_MAX = 0.12; // at full Earth — faint, bluish
const OUTDOOR_FILL = 0.035; // almost nothing: shadows stay near-black
const HELMET_LAMP = 14; // candela-ish; reaches ~15 m
const INDOOR_FILL = {
  habitat: { sky: 0xffe8d0, ground: 0x857a6e, intensity: 0.14 }, // warm, homey
  greenhouse: { sky: 0xd9a6ff, ground: 0x6a4f7a, intensity: 0.38 }, // red + blue LED glow
};

export function createLighting(scene, { shadowMapSize = 2048 } = {}) {
  const sun = new THREE.DirectionalLight(0xfff6ec, SUN_INTENSITY);
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
  sun.shadow.normalBias = 0.05;
  sun.shadow.bias = -0.0003;
  // PCF soft edges (PCFSoftShadowMap is deprecated since r182; PCF + radius is the soft one)
  sun.shadow.radius = 2.5;
  scene.add(sun, sun.target);

  // Earthshine: sunlight reflected by Earth. Fixed direction (Earth barely moves in the
  // Moon's sky); brightness follows how much of Earth's day side faces the Moon.
  const earthDir = skyDirection(SKY.EARTH_AZIMUTH_DEG, SKY.EARTH_ELEVATION_DEG);
  const earthshine = new THREE.DirectionalLight(0xa9c1ff, 0);
  earthshine.position.set(earthDir.x * 100, earthDir.y * 100, earthDir.z * 100);
  scene.add(earthshine, earthshine.target);

  // Fill: steady room light indoors; nearly zero outside (no atmosphere to scatter light).
  const fill = new THREE.HemisphereLight(0x8a93a3, 0x7a766e, 0);
  scene.add(fill);

  // Helmet lamp — follows the camera; kept in the scene always (intensity 0 indoors)
  // so materials never recompile when you walk through a door.
  const helmet = new THREE.SpotLight(0xfff1dd, 0, 16, Math.PI / 7, 0.65, 1.6);
  helmet.castShadow = false;
  scene.add(helmet, helmet.target);

  const snap = new THREE.Vector3();
  const texel = (SHADOW_HALF * 2) / shadowMapSize;
  const fwd = new THREE.Vector3();

  return {
    sun,
    fill,
    earthshine,
    helmet,
    /** focus: player position; sunDir: unit vector to Sun; visibility 0..1 */
    update(focus, sunDir, visibility, zoneId = 'outside', camera = null) {
      // snap focus to shadow texels to reduce shimmering while walking
      snap.set(Math.round(focus.x / texel) * texel, focus.y, Math.round(focus.z / texel) * texel);
      sun.target.position.copy(snap);
      sun.position.set(
        snap.x + sunDir.x * SHADOW_DISTANCE,
        snap.y + sunDir.y * SHADOW_DISTANCE,
        snap.z + sunDir.z * SHADOW_DISTANCE,
      );
      // Inside a module you can't see outside (no windows yet), so the Sun is switched
      // off there (stops light leaking through walls) and the fill is steady room light.
      const indoor = INDOOR_FILL[zoneId];
      sun.intensity = indoor ? 0 : SUN_INTENSITY * visibility;
      if (indoor) {
        fill.color.setHex(indoor.sky);
        fill.groundColor.setHex(indoor.ground);
        fill.intensity = indoor.intensity;
        earthshine.intensity = 0;
        helmet.intensity = 0;
      } else {
        fill.color.setHex(0x8a93a3);
        fill.groundColor.setHex(0x7a766e);
        fill.intensity = OUTDOOR_FILL;
        // Earth's lit fraction seen from the Moon: 0 when the Sun is behind Earth
        // ("new Earth"), 1 when the Sun is opposite Earth ("full Earth").
        const cosA = sunDir.x * earthDir.x + sunDir.y * earthDir.y + sunDir.z * earthDir.z;
        earthshine.intensity = EARTHSHINE_MAX * (1 - cosA) * 0.5;
        earthshine.target.position.set(0, 0, 0);
        helmet.intensity = HELMET_LAMP;
        if (camera) {
          camera.getWorldDirection(fwd);
          helmet.position.copy(camera.position).addScaledVector(fwd, 0.2);
          helmet.position.y += 0.15;
          helmet.target.position.copy(camera.position).addScaledVector(fwd, 8);
        }
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
