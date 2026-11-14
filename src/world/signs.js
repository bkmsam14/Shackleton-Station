// signs.js — small text signs drawn on a canvas (placeholder art).
import * as THREE from 'three';

export function signTexture(lines, { bg = '#0d1a33', fg = '#ffffff', accent = '#ff8a3d', w = 512, h = 192 } = {}) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = accent;
  ctx.fillRect(0, h - 14, w, 14);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const list = Array.isArray(lines) ? lines : [lines];
  const size = Math.min(78, (h - 30) / list.length - 8);
  ctx.font = `700 ${size}px Fredoka, Nunito, "Trebuchet MS", sans-serif`;
  list.forEach((t, i) => ctx.fillText(t, w / 2, (h - 14) * ((i + 0.5) / list.length)));
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** A flat sign mesh (front faces +Z). */
export function createSign(lines, width, height, opts) {
  const mat = new THREE.MeshBasicMaterial({ map: signTexture(lines, opts), toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
  return mesh;
}
