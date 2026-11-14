// materials.js — one shared palette so every placeholder model has the same clean look.
// v0.2.1: smooth shading by default (rocks stay faceted — real rocks are angular).
import * as THREE from 'three';
import { pbrSet } from './textures.js';

const cache = new Map();

function std(key, params) {
  if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ flatShading: false, ...params }));
  return cache.get(key);
}

export const MAT = {
  // Textured (CC0, see public/CREDITS.md): panels = habitat plates, grating = floors,
  // trim = brushed metal, regolith = Moon ground.
  hull: () =>
    std('hull', {
      color: 0xeeebe4,
      roughness: 0.7,
      metalness: 0.1,
      ...pbrSet('panels', { repeat: [10, 8], parts: ['normal', 'orm'] }),
      normalScale: new THREE.Vector2(0.45, 0.45),
    }),
  habitatWall: () =>
    std('habitatWall', {
      color: 0xe8ecef,
      roughness: 0.85,
      metalness: 0.1,
      side: THREE.BackSide,
      ...pbrSet('panels', { repeat: [16, 14] }),
      normalScale: new THREE.Vector2(0.6, 0.6),
    }),
  // warm, soft wall finish for the living areas (subtle panel detail, no metal look)
  livingWall: () =>
    std('livingWall', {
      color: 0xf0e9de,
      roughness: 0.9,
      metalness: 0,
      side: THREE.BackSide,
      ...pbrSet('panels', { repeat: [12, 6], parts: ['normal'] }),
      normalScale: new THREE.Vector2(0.15, 0.15),
    }),
  hullDark: () => std('hullDark', { color: 0x9aa0a8, roughness: 0.55, metalness: 0.3 }),
  accent: () => std('accent', { color: 0xf08a45, roughness: 0.55 }),
  metal: () => std('metal', { color: 0xb4bac2, roughness: 0.4, metalness: 1, ...pbrSet('trim') }),
  darkMetal: () => std('darkMetal', { color: 0x5a6069, roughness: 0.45, metalness: 1, ...pbrSet('trim') }),
  solarCell: () => std('solarCell', { color: 0x1d3b78, roughness: 0.25, metalness: 0.4, emissive: 0x050b1a }),
  regolithBag: () => std('regolithBag', { color: 0x8f8a80, roughness: 1 }),
  rock: () =>
    std('rock', {
      color: 0x9a978f,
      roughness: 1,
      flatShading: true,
      ...pbrSet('regolith', { repeat: [0.5, 0.5], parts: ['map', 'normal'] }),
    }),
  interiorWall: () => std('interiorWall', { color: 0xd4dbe1, roughness: 0.85, side: THREE.BackSide }),
  interiorPanel: () =>
    std('interiorPanel', {
      color: 0xe2e6ea,
      roughness: 0.75,
      metalness: 0.1,
      ...pbrSet('panels', { repeat: [2, 2], parts: ['normal', 'orm'] }),
      normalScale: new THREE.Vector2(0.35, 0.35),
    }),
  // smooth painted panel (no texture) for furniture and cabinets
  painted: (color = 0xe8e4dc) => std('painted' + color, { color, roughness: 0.6, metalness: 0.05 }),
  // floors use planarUV(…, 'xz', 1) so the grating is 1 m per tile everywhere
  floor: () =>
    std('floor', { color: 0xa9b1bb, roughness: 1, metalness: 1, ...pbrSet('grating', { parts: ['map', 'normal', 'orm', 'ao'] }) }),
  door: () => std('door', { color: 0xdfe3e8, roughness: 0.45, metalness: 0.5, ...pbrSet('trim', { parts: ['normal', 'orm'] }) }),
  doorFrame: () => std('doorFrame', { color: 0xf08a45, roughness: 0.5 }),
  glass: () => std('glass', { color: 0x16222e, roughness: 0.08, metalness: 0.3 }),
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
  // soft furnishings (homey habitat)
  fabric: (color = 0x3c6fb4) => std('fabric' + color, { color, roughness: 0.95 }),
  wood: () => std('wood', { color: 0xb88a5e, roughness: 0.55 }),
  ceramic: () => std('ceramic', { color: 0xe6d8c3, roughness: 0.4 }),
  // leaves use per-vertex colour (pale base → deep green tips) from plants.js
  leaf: () => std('leaf', { color: 0xffffff, vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }),
  greenhouseSkin: () => std('ghSkin', { color: 0xf1efe9, roughness: 0.7 }),
  plant: () => std('plant', { color: 0xffffff, vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }),
  plantDark: () => std('plantDark', { color: 0x2f8a45, roughness: 0.8 }),
  soil: () => std('soil', { color: 0x3f3226, roughness: 1 }),
  rackFrame: () => std('rackFrame', { color: 0xd0d6dc, roughness: 0.4, metalness: 1, ...pbrSet('trim') }),
};

// cushion / textile palette for the habitat (warm, homey)
export const FABRIC = {
  terracotta: 0xc8673f,
  mustard: 0xd9a441,
  teal: 0x2f7f86,
  cream: 0xece2d0,
  navy: 0x2c3e5c,
};
