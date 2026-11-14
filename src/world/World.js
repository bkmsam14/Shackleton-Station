// World.js — assembles the 3D world. Knows nothing about gauges or the HUD.
import * as THREE from 'three';
import { createTerrain, createHorizon, createRocks } from './terrain.js';
import { createSky } from './sky.js';
import { createLighting } from './lighting.js';
import { createSolarArray } from './solarArray.js';
import { createPathLights, createPowerCable } from './props.js';
import { heightAt } from './heightfield.js';
import { createHabitat } from './habitat.js';
import { createGreenhouse } from './greenhouse.js';
import { LAYOUT } from './layout.js';
import { skyDirection } from '../systems/daycycle.js';

export const QUALITY = {
  low: { terrainSegments: 140, rocks: 140, stars: 1200, shadowMap: 1024, pixelRatioCap: 1 },
  high: { terrainSegments: 220, rocks: 260, stars: 2600, shadowMap: 2048, pixelRatioCap: 2 },
};

export function createWorld({ quality = 'high' } = {}) {
  const q = QUALITY[quality];
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000); // no atmosphere → black sky

  const terrain = createTerrain({ segments: q.terrainSegments });
  const horizon = createHorizon();
  const rocks = createRocks({ count: q.rocks });
  const sky = createSky({ starCount: q.stars });
  const lighting = createLighting(scene, { shadowMapSize: q.shadowMap });
  const solarArray = createSolarArray(heightAt(LAYOUT.SOLAR_ARRAY.x, LAYOUT.SOLAR_ARRAY.z));
  const habitat = createHabitat();
  const greenhouse = createGreenhouse();
  scene.add(
    terrain,
    horizon,
    rocks.mesh,
    sky.group,
    solarArray.object,
    createPathLights(),
    createPowerCable(),
    habitat.object,
    greenhouse.object,
  );

  // Outdoor colliders (solid things you cannot walk through when outside).
  const outdoorColliders = [
    ...rocks.colliders,
    ...solarArray.colliders,
    ...habitat.outdoorColliders,
    ...greenhouse.outdoorColliders,
  ];
  // Pressurized interiors. 'outside' is the surface.
  const zones = { habitat: habitat.zone, greenhouse: greenhouse.zone };
  const interactables = [...habitat.interactables, ...greenhouse.interactables];

  const sunDir = new THREE.Vector3();

  return {
    scene,
    lighting,
    solarArray,
    outdoorColliders,
    zones,
    interactables,
    greenhouse,
    /**
     * Called once per frame. sun = getSun(); zoneId = where the player is.
     * Returns solar alignment 0..1.
     */
    update(dt, camera, focus, sun, earthSpin, zoneId = 'outside') {
      const d = skyDirection(sun.azimuthDeg, sun.elevationDeg);
      sunDir.set(d.x, d.y, d.z);
      sky.update(camera, sunDir, earthSpin);
      lighting.update(focus, sunDir, sun.visibility, zoneId);
      return solarArray.update(dt, sun.azimuthDeg);
    },
    add(obj) {
      scene.add(obj);
    },
    setQuality(name) {
      const nq = QUALITY[name];
      lighting.setShadowMapSize(nq.shadowMap);
      sky.setStarCount(name === 'high');
    },
  };
}
