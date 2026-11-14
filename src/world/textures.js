// textures.js — CC0 PBR texture sets (see public/CREDITS.md). Each set has:
//   color.webp (sRGB albedo) · normal.webp (OpenGL normal) · orm.webp (R=AO, G=rough, B=metal)
// One function loads a set, so swapping art later only touches public/textures/.
import * as THREE from 'three';

const loader = new THREE.TextureLoader();
const BASE = `${import.meta.env.BASE_URL}textures/`;
const cache = new Map();

function load(path, srgb, repeat) {
  const key = `${path}|${repeat}`;
  if (cache.has(key)) return cache.get(key);
  const base = cache.get(path) ?? loader.load(BASE + path);
  cache.set(path, base);
  const t = repeat ? base.clone() : base; // clones share one image upload
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8; // clamped to what the GPU supports
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, t);
  return t;
}

/** Material params for a texture set. parts: which maps to use. */
export function pbrSet(name, { repeat = null, parts = ['map', 'normal', 'orm'] } = {}) {
  const p = {};
  if (parts.includes('map')) p.map = load(`${name}/color.webp`, true, repeat);
  if (parts.includes('normal')) p.normalMap = load(`${name}/normal.webp`, false, repeat);
  if (parts.includes('orm')) {
    const orm = load(`${name}/orm.webp`, false, repeat);
    p.roughnessMap = orm;
    p.metalnessMap = orm;
    if (parts.includes('ao')) p.aoMap = orm;
  }
  return p;
}

/** Planar UVs from local positions (metres / tileSize), e.g. for floors: axes 'xz'. */
export function planarUV(geometry, axes = 'xz', tileSize = 1) {
  const pos = geometry.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  const a = 'xyz'.indexOf(axes[0]);
  const b = 'xyz'.indexOf(axes[1]);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getComponent(i, a) / tileSize;
    uv[i * 2 + 1] = pos.getComponent(i, b) / tileSize;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geometry;
}
