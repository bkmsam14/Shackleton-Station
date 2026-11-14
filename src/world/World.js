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
import { mergeStatic } from './mergeStatic.js';
import { createEnvironments, ENV_INTENSITY } from './environment.js';
import { LAYOUT } from './layout.js';
import { skyDirection } from '../systems/daycycle.js';

export const QUALITY = {
  low: { terrainSegments: 140, rocks: 140, stars: 1200, shadowMap: 1024, pixelRatioCap: 1 },
  high: { terrainSegments: 220, rocks: 260, stars: 2600, shadowMap: 2048, pixelRatioCap: 1.5 },
};

export function createWorld({ quality = 'high', renderer } = {}) {
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
  // fewer draw calls: merge each building's static parts by material
  mergeStatic(habitat.object);
  mergeStatic(greenhouse.object);
  // Things you can only see from outside (modules have no windows yet): hidden while
  // indoors so the GPU doesn't draw the whole Moon behind the walls.
  const outdoorOnly = [terrain, horizon, rocks.mesh, sky.group, solarArray.object, createPathLights(), createPowerCable()];
  scene.add(...outdoorOnly, habitat.object, greenhouse.object);
  let lastZone = null;
  const env = renderer ? createEnvironments(renderer) : null;

  // Outdoor colliders (solid things you cannot walk through when outside).
  const outdoorColliders = [
    ...rocks.colliders,
    ...solarArray.colliders,
    ...habitat.outdoorColliders,
    ...greenhouse.outdoorColliders,
  ];
  // Pressurized interiors. 'outside' is the surface.
  const zones = { habitat: habitat.zone, greenhouse: greenhouse.zone };
  const interactables = [
    ...habitat.interactables,
    ...greenhouse.interactables,
    {
      id: 'solar-info',
      zone: 'outside',
      x: LAYOUT.SOLAR_ARRAY.x,
      z: LAYOUT.SOLAR_ARRAY.z,
      prompt: 'Press E to read about the solar array',
      action: {
        type: 'station',
        station: 'solar',
        // facts.json: "vertical-solar" (NASA VSAT) + "sun-loop" (NASA Moon Fact Sheet)
        toast:
          '<strong>Vertical solar array.</strong> At the south pole the Sun stays low and circles the sky, so this tall panel stands up straight and turns to face it. NASA is testing arrays like this for the Moon.',
      },
    },
  ];

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
      if (zoneId !== lastZone) {
        lastZone = zoneId;
        const outside = zoneId === 'outside';
        for (const o of outdoorOnly) o.visible = outside;
        habitat.object.visible = outside || zoneId === 'habitat';
        greenhouse.object.visible = outside || zoneId === 'greenhouse';
        if (env) {
          scene.environment = outside ? env.outdoor : env.indoor;
          scene.environmentIntensity = ENV_INTENSITY[zoneId] ?? ENV_INTENSITY.outside;
        }
      }
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
