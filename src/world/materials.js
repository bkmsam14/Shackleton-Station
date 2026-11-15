// materials.js — one shared palette so every model has the same clean look.
// v0.2.1: smooth shading by default (rocks stay faceted — real rocks are angular).
// Graphics overhaul: "stylized semi-realism" — soft whites and light grey for the main
// surfaces, muted blue-grey for secondary ones, orange + soft cyan accents. Clean painted
// metal, softly reflective, gentle imperfections (procedural panel textures), no grunge.
import * as THREE from 'three';
import { pbrSet } from './textures.js';
import { procSet } from './proceduralTextures.js';

const cache = new Map();

function std(key, params) {
  if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ flatShading: false, ...params }));
  return cache.get(key);
}

/** Palette (sRGB hex). */
export const PALETTE = {
  white: 0xf3f4f6, // main surfaces
  lightGrey: 0xdfe3e8,
  blueGrey: 0x8d98a8, // secondary surfaces
  deepBlueGrey: 0x4b5566,
  orange: 0xf2873f, // accents
  cyan: 0x6fe3f0,
};

export const MAT = {
  // Exterior hull: white painted plates (procedural panels: seams + screws).
  hull: () =>
    std('hull', {
      color: 0xf4f5f7,
      roughness: 1,
      metalness: 1,
      ...procSet('panels', { repeat: [10, 6] }),
      normalScale: new THREE.Vector2(0.9, 0.9),
    }),
  // Work-bay lining: light grey panelled metal (seen from inside the cylinder).
  habitatWall: () =>
    std('habitatWall', {
      color: 0xe9edf2,
      roughness: 1,
      metalness: 1,
      side: THREE.BackSide,
      ...procSet('panels', { repeat: [13, 12] }),
      normalScale: new THREE.Vector2(1, 1),
    }),
  // Living areas: the same plates, warm white and a little softer (homey, still a station).
  livingWall: () =>
    std('livingWall', {
      color: 0xfbf8f3,
      roughness: 1,
      metalness: 0.6,
      side: THREE.BackSide,
      ...procSet('panels', { repeat: [11, 7] }),
      normalScale: new THREE.Vector2(0.75, 0.75),
    }),
  hullDark: () => std('hullDark', { color: 0x7d8796, roughness: 0.45, metalness: 0.55 }),
  accent: () => std('accent', { color: PALETTE.orange, roughness: 0.42, metalness: 0.1 }),
  metal: () => std('metal', { color: 0xc6ccd4, roughness: 0.32, metalness: 1, ...pbrSet('trim') }),
  darkMetal: () => std('darkMetal', { color: 0x535c6a, roughness: 0.4, metalness: 0.9, ...pbrSet('trim') }),
  // Solar cells: dark blue cells, silver busbars, thin white gaps (procedural).
  solarCell: () =>
    std('solarCell', {
      color: 0xffffff,
      roughness: 1,
      metalness: 1,
      emissive: 0x050b1a,
      ...procSet('cells', { repeat: [2, 3] }),
      normalScale: new THREE.Vector2(0.6, 0.6),
    }),
  regolithBag: () => std('regolithBag', { color: 0x8f8a80, roughness: 1 }),
  rock: () =>
    std('rock', {
      color: 0x9a978f,
      roughness: 1,
      flatShading: true,
      ...pbrSet('regolith', { repeat: [0.5, 0.5], parts: ['map', 'normal'] }),
    }),
  // Greenhouse lining (inside the arch): clean light panels, so the LED colour reads as a
  // soft glow on a neutral room instead of tinting everything purple.
  interiorWall: () =>
    std('interiorWall', {
      color: 0xeceff3,
      roughness: 1,
      metalness: 0.7,
      side: THREE.BackSide,
      ...procSet('panels', { repeat: [9, 7] }),
      normalScale: new THREE.Vector2(0.9, 0.9),
    }),
  interiorPanel: () =>
    std('interiorPanel', {
      color: 0xe6eaef,
      roughness: 1,
      metalness: 0.8,
      ...procSet('panels', { repeat: [0.36, 0.36] }), // ~1.4 m plates on end walls (UVs in metres)
      normalScale: new THREE.Vector2(0.8, 0.8),
    }),
  // smooth painted panel (no texture) for furniture and cabinets
  painted: (color = 0xe8e4dc) => std('painted' + color, { color, roughness: 0.48, metalness: 0.05 }),
  // floors use planarUV(…, 'xz', 1): one tile (2 × 2 perforated plates) per metre
  floor: () =>
    std('floor', {
      color: 0xb4bdca,
      roughness: 1,
      metalness: 1,
      ...procSet('floor'),
      normalScale: new THREE.Vector2(1, 1),
    }),
  /** Plain plates (living-area floor, lowered ceiling). repeat = tiles across 0..1 UVs. */
  floorPlates: (rx = 1, ry = 1, color = 0x9aa4b3) =>
    std(`floorPlates${rx}x${ry}c${color}`, {
      color,
      roughness: 1,
      metalness: 1,
      ...procSet('plates', { repeat: [rx, ry] }),
      normalScale: new THREE.Vector2(0.9, 0.9),
    }),
  door: () => std('door', { color: 0xe6eaef, roughness: 0.4, metalness: 0.45, ...pbrSet('trim', { parts: ['normal', 'orm'] }) }),
  doorFrame: () => std('doorFrame', { color: PALETTE.orange, roughness: 0.42, metalness: 0.1 }),
  glass: () => std('glass', { color: 0x1a2a3c, roughness: 0.06, metalness: 0.4 }),
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
  fabric: (color = 0x3c6fb4) => std('fabric' + color, { color, roughness: 0.92 }),
  wood: () => std('wood', { color: 0xb88a5e, roughness: 0.5 }),
  ceramic: () => std('ceramic', { color: 0xeee4d6, roughness: 0.3 }),
  // leaves use per-vertex colour (pale base → deep green tips) from plants.js
  leaf: () => std('leaf', { color: 0xffffff, vertexColors: true, roughness: 0.5, side: THREE.DoubleSide }),
  greenhouseSkin: () =>
    std('ghSkin', {
      color: 0xf2f3f5,
      roughness: 1,
      metalness: 0.8,
      ...procSet('panels', { repeat: [8, 6] }),
      normalScale: new THREE.Vector2(0.8, 0.8),
    }),
  plant: () => std('plant', { color: 0xffffff, vertexColors: true, roughness: 0.5, side: THREE.DoubleSide }),
  plantDark: () => std('plantDark', { color: 0x2f9a4c, roughness: 0.6 }),
  soil: () => std('soil', { color: 0xffffff, roughness: 1, ...procSet('soil', { repeat: [4, 1], parts: ['map', 'normal'] }) }),
  rackFrame: () => std('rackFrame', { color: 0xd8dde3, roughness: 0.35, metalness: 1, ...pbrSet('trim') }),
};

// cushion / textile palette for the habitat (warm, homey)
export const FABRIC = {
  terracotta: 0xc8673f,
  mustard: 0xd9a441,
  teal: 0x2f7f86,
  cream: 0xece2d0,
  navy: 0x2c3e5c,
};
