// proceduralTextures.js — clean, stylized PBR texture sets drawn in code at start-up
// (no download): station wall panels, perforated floor plates, plain floor plates,
// solar cells, soil. Each set gives a colour map, a normal map (made from a height map)
// and a roughness/metalness map, like the CC0 sets in textures.js.
//
// Look (graphics overhaul): "animated sci-fi film" — soft panel seams with a rounded bevel,
// a few screws, gentle variation between panels, no heavy grunge.
import * as THREE from 'three';
import { mulberry32 } from './heightfield.js';

const SIZE = 512;
const cache = new Map();

function canvas(size = SIZE) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

/** Smooth value noise (tiles every `period` cells), 0..1. */
function makeNoise(seed, period) {
  const rand = mulberry32(seed);
  const grid = Array.from({ length: period * period }, () => rand());
  const at = (i, j) => grid[((j % period) + period) % period * period + (((i % period) + period) % period)];
  const s = (t) => t * t * (3 - 2 * t);
  return (u, v) => {
    const x = u * period;
    const y = v * period;
    const i = Math.floor(x);
    const j = Math.floor(y);
    const fx = s(x - i);
    const fy = s(y - j);
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * fx;
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * fx;
    return a + (b - a) * fy;
  };
}

/**
 * Build the three canvases from per-pixel functions.
 * pixel(u, v) → { h: height 0..1, c: [r, g, b] 0..255, r: roughness 0..1, m: metalness 0..1 }
 */
function bake(pixel, { size = SIZE, normalStrength = 2.5 } = {}) {
  const n = size * size;
  const height = new Float32Array(n);
  const col = canvas(size);
  const orm = canvas(size);
  const cctx = col.getContext('2d');
  const octx = orm.getContext('2d');
  const cimg = cctx.createImageData(size, size);
  const oimg = octx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const p = pixel((x + 0.5) / size, (y + 0.5) / size);
      height[i] = p.h;
      cimg.data.set([p.c[0], p.c[1], p.c[2], 255], i * 4);
      oimg.data.set([255, Math.round(p.r * 255), Math.round(p.m * 255), 255], i * 4);
    }
  }
  cctx.putImageData(cimg, 0, 0);
  octx.putImageData(oimg, 0, 0);
  // normal map (OpenGL convention: +Y up), wrapping at the edges so it tiles
  const nor = canvas(size);
  const nctx = nor.getContext('2d');
  const nimg = nctx.createImageData(size, size);
  const h = (x, y) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * normalStrength;
      const dy = (h(x, y + 1) - h(x, y - 1)) * normalStrength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      nimg.data[i] = Math.round((-dx / len) * 127.5 + 127.5);
      nimg.data[i + 1] = Math.round((dy / len) * 127.5 + 127.5);
      nimg.data[i + 2] = Math.round((1 / len) * 127.5 + 127.5);
      nimg.data[i + 3] = 255;
    }
  }
  nctx.putImageData(nimg, 0, 0);
  return { col, nor, orm };
}

/** Distance (0..1 units) from (u, v) to the nearest edge of a rectangle; negative outside. */
const edgeDist = (u, v, x0, y0, x1, y1) => Math.min(u - x0, x1 - u, v - y0, y1 - v);
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// ---------------------------------------------------------------- the sets
const SETS = {
  /** Wall panels: two rows of rectangular plates (offset like bricks), soft seams, screws. */
  panels() {
    const noise = makeNoise(7, 8);
    const fine = makeNoise(11, 64);
    const rows = 2;
    const cols = 2;
    return bake((u, v) => {
      const row = Math.floor(v * rows);
      const off = row % 2 ? 0.5 / cols : 0;
      const uu = (u + off) % 1;
      const col = Math.floor(uu * cols);
      const x0 = col / cols;
      const y0 = row / rows;
      const d = edgeDist(uu, v, x0, y0, x0 + 1 / cols, y0 + 1 / rows);
      // seam groove with a rounded bevel
      const bevel = smooth(0.002, 0.014, d);
      // a gently recessed inner field
      const inner = 1 - smooth(0.05, 0.058, d) * 0.06;
      // screws near each corner
      let screw = 0;
      for (const [sx, sy] of [
        [0.03, 0.035],
        [1 / cols - 0.03, 0.035],
        [0.03, 1 / rows - 0.035],
        [1 / cols - 0.03, 1 / rows - 0.035],
      ]) {
        const r = Math.hypot(uu - (x0 + sx), v - (y0 + sy));
        screw = Math.max(screw, 1 - smooth(0.004, 0.009, r));
      }
      const panelTone = 0.97 + (mulberry32(row * 31 + col * 7 + 3)() - 0.5) * 0.05; // each plate slightly different
      const grime = 1 - (noise(u, v) - 0.5) * 0.05 - (fine(u, v) - 0.5) * 0.02;
      const shade = panelTone * grime * mix(0.74, 1, bevel) * (screw > 0.5 ? 0.86 : 1);
      const base = 236;
      return {
        h: bevel * inner * 0.6 + screw * 0.35,
        c: [base * shade, (base + 2) * shade, (base + 6) * shade],
        r: mix(0.75, 0.42 + (fine(u, v) - 0.5) * 0.08, bevel),
        m: screw > 0.5 ? 0.9 : 0.15,
      };
    }, { normalStrength: 2.2 });
  },

  /** Perforated floor plates: 2 × 2 plates per tile, each with a border and rows of holes. */
  floor() {
    const fine = makeNoise(5, 48);
    const plates = 2;
    const holes = 9;
    return bake((u, v) => {
      const pu = (u * plates) % 1;
      const pv = (v * plates) % 1;
      const d = edgeDist(pu, pv, 0, 0, 1, 1);
      const seam = smooth(0.005, 0.025, d);
      let hole = 0;
      if (d > 0.1) {
        const gu = (pu - 0.1) / 0.8;
        const gv = (pv - 0.1) / 0.8;
        const cx = (Math.floor(gu * holes) + 0.5) / holes;
        const cy = (Math.floor(gv * holes) + 0.5) / holes;
        const r = Math.hypot(gu - cx, gv - cy) * holes;
        hole = 1 - smooth(0.2, 0.26, r);
      }
      const tone = 1 + (fine(u, v) - 0.5) * 0.06;
      const shade = tone * mix(0.66, 1, seam) * mix(1, 0.3, hole);
      return {
        h: seam * 0.6 * (1 - hole * 0.8),
        c: [176 * shade, 184 * shade, 196 * shade],
        r: hole > 0.5 ? 0.9 : mix(0.8, 0.38 + (fine(u, v) - 0.5) * 0.1, seam),
        m: hole > 0.5 ? 0 : 0.75,
      };
    }, { normalStrength: 3 });
  },

  /** Plain floor plates (living areas): soft seams, no holes. */
  plates() {
    const fine = makeNoise(9, 40);
    const plates = 2;
    return bake((u, v) => {
      const pu = (u * plates) % 1;
      const pv = (v * plates) % 1;
      const d = edgeDist(pu, pv, 0, 0, 1, 1);
      const seam = smooth(0.002, 0.012, d);
      const tone = 1 + (fine(u, v) - 0.5) * 0.05;
      const shade = tone * mix(0.78, 1, seam);
      return { h: seam * 0.5, c: [214 * shade, 218 * shade, 226 * shade], r: mix(0.85, 0.55, seam), m: 0.05 };
    }, { normalStrength: 2.5 });
  },

  /** Solar cells: 6 × 6 dark-blue cells with thin silver lines (busbars) and a white gap. */
  cells() {
    const fine = makeNoise(13, 32);
    const n = 6;
    return bake((u, v) => {
      const cu = (u * n) % 1;
      const cv = (v * n) % 1;
      const d = edgeDist(cu, cv, 0, 0, 1, 1);
      const gap = 1 - smooth(0.015, 0.03, d);
      const bus = Math.abs(cu - 0.33) < 0.008 || Math.abs(cu - 0.66) < 0.008 ? 1 : 0;
      const finger = (cv * 24) % 1 < 0.06 ? 0.35 : 0;
      const sheen = 0.9 + (fine(u, v) - 0.5) * 0.25;
      let c = [28 * sheen, 52 * sheen, 112 * sheen];
      if (finger) c = c.map((x) => x * 1.25);
      if (bus) c = [170, 178, 190];
      if (gap) c = [196, 202, 210];
      return { h: gap ? 0 : 0.5, c, r: gap ? 0.6 : bus ? 0.35 : 0.18, m: bus ? 1 : gap ? 0.1 : 0.35 };
    }, { normalStrength: 1.5 });
  },

  /** Potting soil: dark brown with soft lumps. */
  soil() {
    const big = makeNoise(17, 16);
    const fine = makeNoise(19, 96);
    return bake((u, v) => {
      const h = big(u, v) * 0.6 + fine(u, v) * 0.4;
      const t = 0.75 + h * 0.4;
      return { h, c: [92 * t, 66 * t, 44 * t], r: 0.95, m: 0 };
    }, { size: 256, normalStrength: 4 });
  },
};

function base(name) {
  if (!cache.has(name)) {
    const { col, nor, orm } = SETS[name]();
    const map = new THREE.CanvasTexture(col);
    map.colorSpace = THREE.SRGBColorSpace;
    const normal = new THREE.CanvasTexture(nor);
    const rough = new THREE.CanvasTexture(orm);
    for (const t of [map, normal, rough]) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8; // clamped to what the GPU supports
    }
    cache.set(name, { map, normal, rough });
  }
  return cache.get(name);
}

function withRepeat(tex, repeat) {
  if (!repeat) return tex;
  const t = tex.clone(); // shares the same image
  t.repeat.set(repeat[0], repeat[1]);
  t.needsUpdate = true;
  return t;
}

/**
 * Material params for a procedural set ('panels' | 'floor' | 'plates' | 'cells' | 'soil').
 * parts: which maps to use ('map', 'normal', 'rough', 'metal').
 */
export function procSet(name, { repeat = null, parts = ['map', 'normal', 'rough', 'metal'] } = {}) {
  const b = base(name);
  const p = {};
  if (parts.includes('map')) p.map = withRepeat(b.map, repeat);
  if (parts.includes('normal')) p.normalMap = withRepeat(b.normal, repeat);
  if (parts.includes('rough') || parts.includes('metal')) {
    const orm = withRepeat(b.rough, repeat);
    if (parts.includes('rough')) p.roughnessMap = orm;
    if (parts.includes('metal')) p.metalnessMap = orm;
  }
  return p;
}
