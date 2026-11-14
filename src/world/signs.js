// signs.js — clean text signs drawn on a canvas: rounded panel, generous padding,
// bold first line + lighter second line, thin accent stripe (placeholder art).
import * as THREE from 'three';

export function signTexture(lines, { bg = '#0d1a33', fg = '#ffffff', accent = '#f08a45', w = 512, h = 192 } = {}) {
  const S = 2; // draw at 2× for crisp text
  const cv = document.createElement('canvas');
  cv.width = w * S;
  cv.height = h * S;
  const ctx = cv.getContext('2d');
  ctx.scale(S, S);
  const r = Math.min(h * 0.22, 40);
  ctx.beginPath();
  ctx.roundRect(2, 2, w - 4, h - 4, r);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.stroke();
  // accent stripe on the left edge
  ctx.save();
  ctx.clip();
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, Math.max(10, w * 0.025), h);
  ctx.restore();

  const list = Array.isArray(lines) ? lines : [lines];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const pad = h * 0.14;
  const usable = h - pad * 2;
  const first = Math.min(72, usable / (list.length === 1 ? 1.25 : 2.1));
  list.forEach((t, i) => {
    const size = i === 0 ? first : first * 0.62;
    ctx.font = `${i === 0 ? 600 : 500} ${size}px Fredoka, Nunito, "Trebuchet MS", sans-serif`;
    ctx.fillStyle = i === 0 ? fg : 'rgba(255,255,255,0.78)';
    const y = list.length === 1 ? h / 2 : pad + (i === 0 ? usable * 0.36 : usable * 0.8);
    ctx.fillText(t, w / 2 + w * 0.012, y, w - pad * 2);
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** A flat sign mesh (front faces +Z). */
export function createSign(lines, width, height, opts = {}) {
  const pxH = 192;
  const pxW = Math.round((pxH * width) / height);
  const mat = new THREE.MeshBasicMaterial({
    map: signTexture(lines, { w: pxW, h: pxH, ...opts }),
    toneMapped: false,
    transparent: true,
    alphaTest: 0.5,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
}
