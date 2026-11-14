// materials.js — one shared palette so every placeholder model has the same low-poly look.
import * as THREE from 'three';
import { pbrSet } from './textures.js';

const cache = new Map();

function std(key, params) {
  if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ flatShading: true, ...params }));
  return cache.get(key);
}

export const MAT = {
  // Textured (CC0, see public/CREDITS.md): panels = habitat plates, grating = floors,
  // trim = brushed metal, regolith = Moon ground.
  hull: () =>
    std('hull', {
      color: 0xece9e2,
      roughness: 0.75,
      metalness: 0.1,
      ...pbrSet('panels', { repeat: [8, 6], parts: ['normal', 'orm'] }),
      normalScale: new THREE.Vector2(0.6, 0.6),
    }),
  habitatWall: () =>
    std('habitatWall', {
      color: 0xe4eaf0,
      roughness: 0.8,
      metalness: 0.15,
      side: THREE.BackSide,
      ...pbrSet('panels', { repeat: [12, 10] }),
      normalScale: new THREE.Vector2(0.8, 0.8),
    }),
  hullDark: () => std('hullDark', { color: 0x9aa0a8, roughness: 0.55, metalness: 0.3 }),
  accent: () => std('accent', { color: 0xff8a3d, roughness: 0.5 }),
  metal: () => std('metal', { color: 0xb4bac2, roughness: 0.45, metalness: 1, ...pbrSet('trim') }),
  darkMetal: () => std('darkMetal', { color: 0x5a6069, roughness: 0.5, metalness: 1, ...pbrSet('trim') }),
  solarCell: () =>
    std('solarCell', { color: 0x1d3b78, roughness: 0.25, metalness: 0.4, emissive: 0x050b1a }),
  regolithBag: () => std('regolithBag', { color: 0x8f8a80, roughness: 1 }),
  rock: () =>
    std('rock', { color: 0x9a978f, roughness: 1, ...pbrSet('regolith', { repeat: [0.5, 0.5], parts: ['map', 'normal'] }) }),
  interiorWall: () => std('interiorWall', { color: 0xc9d2da, roughness: 0.8, side: THREE.BackSide }),
  interiorPanel: () =>
    std('interiorPanel', {
      color: 0xd3dae1,
      roughness: 0.8,
      metalness: 0.15,
      ...pbrSet('panels', { repeat: [2, 2], parts: ['normal', 'orm'] }),
      normalScale: new THREE.Vector2(0.5, 0.5),
    }),
  // floors use planarUV(…, 'xz', 1) so the grating is 1 m per tile everywhere
  floor: () =>
    std('floor', { color: 0xa9b1bb, roughness: 1, metalness: 1, ...pbrSet('grating', { parts: ['map', 'normal', 'orm', 'ao'] }) }),
  door: () => std('door', { color: 0xd8dde3, roughness: 0.5, metalness: 0.6, ...pbrSet('trim', { parts: ['normal', 'orm'] }) }),
  doorFrame: () => std('doorFrame', { color: 0xff8a3d, roughness: 0.5 }),
  // Unlit "light source" material. strength > 1 makes it HDR-bright so bloom picks it up
  // (bloom threshold is 1.0); strength 1 = just a flat colour.
  glow: (color, strength = 1) => {
    const key = `glow${color}x${strength}`;
    if (!cache.has(key)) {
      const m = new THREE.MeshBasicMaterial({ color });
      m.color.multiplyScalar(strength);
      cache.set(key, m);
    }
    return cache.get(key);
  },
  fabric: () => std('fabric', { color: 0x3c6fb4, roughness: 0.95 }),
  greenhouseSkin: () => std('ghSkin', { color: 0xf1efe9, roughness: 0.7 }),
  plant: () => std('plant', { color: 0x4fb35a, roughness: 0.8 }),
  plantDark: () => std('plantDark', { color: 0x2f8a45, roughness: 0.8 }),
  soil: () => std('soil', { color: 0x4a3a2c, roughness: 1 }),
  rackFrame: () => std('rackFrame', { color: 0xd0d6dc, roughness: 0.45, metalness: 1, ...pbrSet('trim') }),
};
