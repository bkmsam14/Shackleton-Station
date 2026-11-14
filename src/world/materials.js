// materials.js — one shared palette so every placeholder model has the same low-poly look.
import * as THREE from 'three';

const cache = new Map();

function std(key, params) {
  if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ flatShading: true, ...params }));
  return cache.get(key);
}

export const MAT = {
  hull: () => std('hull', { color: 0xe9e6df, roughness: 0.6, metalness: 0.05 }),
  hullDark: () => std('hullDark', { color: 0x9aa0a8, roughness: 0.55, metalness: 0.3 }),
  accent: () => std('accent', { color: 0xff8a3d, roughness: 0.5 }),
  metal: () => std('metal', { color: 0x9aa1aa, roughness: 0.32, metalness: 0.85 }),
  darkMetal: () => std('darkMetal', { color: 0x4a5059, roughness: 0.4, metalness: 0.8 }),
  solarCell: () =>
    std('solarCell', { color: 0x1d3b78, roughness: 0.25, metalness: 0.4, emissive: 0x050b1a }),
  regolithBag: () => std('regolithBag', { color: 0x8f8a80, roughness: 1 }),
  rock: () => std('rock', { color: 0x77756f, roughness: 1 }),
  interiorWall: () => std('interiorWall', { color: 0xc9d2da, roughness: 0.8, side: THREE.BackSide }),
  interiorPanel: () => std('interiorPanel', { color: 0xc5ced6, roughness: 0.7 }),
  floor: () => std('floor', { color: 0x5b6470, roughness: 0.9 }),
  door: () => std('door', { color: 0xd8dde3, roughness: 0.35, metalness: 0.5 }),
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
  rackFrame: () => std('rackFrame', { color: 0xc4ccd4, roughness: 0.3, metalness: 0.85 }),
};
