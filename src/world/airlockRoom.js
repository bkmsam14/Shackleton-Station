// airlockRoom.js — the inside of an airlock, shown during a cycle (its own small scene).
// You stand in the middle; the hatch you came through is behind you (+Z), the one you are going
// to is in front of you (−Z). A wall gauge shows the air pressure live; the light strips go
// amber while the air moves and green when it is safe to open. Placeholder art, smooth style.
import * as THREE from 'three';
import { createSign } from './signs.js';

const W = 2.6; // width (x)
const H = 2.5; // height
const L = 3.2; // length between the hatches (z)
const COLORS = { idle: 0x7be0a0, busy: 0xffb547, ready: 0x7be0a0 };

function roundedBox(w, h, d, mat) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}

export function createAirlockRoom() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070d);
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a2f3a, 1.1));
  const lamp = new THREE.PointLight(0xfff2dc, 9, 8, 1.6);
  lamp.position.set(0, H - 0.25, 0);
  scene.add(lamp);
  const tint = new THREE.PointLight(COLORS.idle, 3, 6, 1.5);
  tint.position.set(0, 0.4, 0);
  scene.add(tint);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0xd9dee5, roughness: 0.7 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x3b4352, roughness: 0.5, metalness: 0.4 });
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.9 });
  const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf08a45, roughness: 0.5 });
  const stripMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: COLORS.idle, emissiveIntensity: 2.2 });

  // shell (seen from inside)
  const shell = new THREE.Mesh(new THREE.BoxGeometry(W, H, L), wallMat);
  shell.geometry.scale(-1, 1, 1); // flip so the inside faces are visible
  shell.position.y = H / 2;
  scene.add(shell);
  const floor = roundedBox(W - 0.02, 0.04, L - 0.02, floorMat);
  floor.position.y = 0.02;
  scene.add(floor);
  // ribs + light strips along both walls
  for (const z of [-1.0, 0, 1.0]) {
    for (const x of [-W / 2 + 0.04, W / 2 - 0.04]) {
      const rib = roundedBox(0.08, H - 0.1, 0.12, darkMat);
      rib.position.set(x, H / 2, z);
      scene.add(rib);
    }
  }
  for (const x of [-W / 2 + 0.05, W / 2 - 0.05]) {
    const strip = roundedBox(0.04, 0.06, L - 0.6, stripMat);
    strip.position.set(x, H - 0.3, 0);
    scene.add(strip);
  }
  // handrails (orange, like real spacecraft handholds)
  for (const x of [-W / 2 + 0.15, W / 2 - 0.15]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, L - 0.8, 10), orangeMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(x, 1.1, 0);
    scene.add(rail);
  }
  // a spare suit on a hook (simple shapes)
  const suit = new THREE.Group();
  const suitMat = new THREE.MeshStandardMaterial({ color: 0xf2f4f7, roughness: 0.8 });
  suit.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 6, 16), suitMat));
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 14), new THREE.MeshStandardMaterial({ color: 0xc9b98a, roughness: 0.2, metalness: 0.6 }));
  helmet.position.y = 0.5;
  suit.add(helmet);
  suit.position.set(W / 2 - 0.32, 1.25, 0.55);
  scene.add(suit);

  // hatches: a round door in a frame at each end
  function hatch(z, facing) {
    const g = new THREE.Group();
    g.position.set(0, 1.05, z);
    const frame = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 12, 40), darkMat);
    g.add(frame);
    const pivot = new THREE.Group(); // hinge on the left edge
    pivot.position.x = -0.6;
    const door = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.08, 40), wallMat);
    door.rotation.x = Math.PI / 2;
    door.position.x = 0.6;
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 24), orangeMat);
    wheel.position.set(0.6, 0, 0.06 * facing);
    pivot.add(door, wheel);
    g.add(pivot);
    scene.add(g);
    return { group: g, pivot, facing };
  }
  const ahead = hatch(-L / 2 + 0.05, 1); // the one you are going to
  const behind = hatch(L / 2 - 0.05, -1); // the one you came through
  behind.group.rotation.y = Math.PI;

  // signs above the hatches (rebuilt for each cycle)
  let signAhead = null;
  let signBehind = null;
  function setSigns(aheadText, behindText) {
    for (const s of [signAhead, signBehind]) if (s) scene.remove(s);
    signAhead = createSign(aheadText, 1.5, 0.42, { accent: '#ffb547' });
    signAhead.position.set(0, 2.05, -L / 2 + 0.06);
    signBehind = createSign(behindText, 1.5, 0.42, { accent: '#7be0a0' });
    signBehind.position.set(0, 2.05, L / 2 - 0.06);
    signBehind.rotation.y = Math.PI;
    scene.add(signAhead, signBehind);
  }

  // live pressure gauge on the left wall
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 384;
  const g2 = cv.getContext('2d');
  const gaugeTex = new THREE.CanvasTexture(cv);
  gaugeTex.colorSpace = THREE.SRGBColorSpace;
  // on the front wall, right of the hatch you are going to — always in view
  const gauge = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.45), new THREE.MeshBasicMaterial({ map: gaugeTex, toneMapped: false }));
  gauge.position.set(1.0, 1.3, -L / 2 + 0.03);
  scene.add(gauge);

  // what is behind the far hatch: the Moon outside (black sky, stars, grey ground) or a lit module
  const viewCv = document.createElement('canvas');
  viewCv.width = viewCv.height = 256;
  const vctx = viewCv.getContext('2d');
  const viewTex = new THREE.CanvasTexture(viewCv);
  viewTex.colorSpace = THREE.SRGBColorSpace;
  const view = new THREE.Mesh(new THREE.CircleGeometry(0.6, 40), new THREE.MeshBasicMaterial({ map: viewTex, toneMapped: false }));
  view.position.set(0, 1.05, -L / 2 + 0.005);
  scene.add(view);
  function paintView(outside) {
    if (outside) {
      vctx.fillStyle = '#000000';
      vctx.fillRect(0, 0, 256, 256);
      vctx.fillStyle = '#ffffff';
      for (let i = 0; i < 60; i++) {
        const r = Math.random() * 1.4 + 0.3;
        vctx.globalAlpha = 0.4 + Math.random() * 0.6;
        vctx.beginPath();
        vctx.arc(Math.random() * 256, Math.random() * 150, r, 0, Math.PI * 2);
        vctx.fill();
      }
      vctx.globalAlpha = 1;
      const g = vctx.createLinearGradient(0, 160, 0, 256);
      g.addColorStop(0, '#8d8a84');
      g.addColorStop(1, '#3b3a37');
      vctx.fillStyle = g;
      vctx.beginPath();
      vctx.moveTo(0, 175);
      for (let x = 0; x <= 256; x += 16) vctx.lineTo(x, 165 + Math.sin(x * 0.05) * 6);
      vctx.lineTo(256, 256);
      vctx.lineTo(0, 256);
      vctx.fill();
    } else {
      const g = vctx.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, '#fff6e6');
      g.addColorStop(1, '#c9cfd8');
      vctx.fillStyle = g;
      vctx.fillRect(0, 0, 256, 256);
    }
    viewTex.needsUpdate = true;
  }
  let lastDrawn = '';
  function drawGauge(pressure, label, colour) {
    const key = `${Math.round(pressure * 100)}|${label}|${colour}`;
    if (key === lastDrawn) return;
    lastDrawn = key;
    g2.fillStyle = '#0d1a33';
    g2.fillRect(0, 0, 512, 384);
    g2.strokeStyle = 'rgba(255,255,255,0.2)';
    g2.lineWidth = 6;
    g2.strokeRect(3, 3, 506, 378);
    g2.fillStyle = '#c9d4e8';
    g2.font = '700 40px Fredoka, Nunito, sans-serif';
    g2.textAlign = 'center';
    g2.fillText('AIR', 256, 50);
    // big number first, the dial under it (the needle never covers the number)
    g2.fillStyle = '#ffffff';
    g2.font = '700 96px Fredoka, Nunito, sans-serif';
    g2.fillText(`${Math.round(pressure * 100)}%`, 256, 140);
    const cx = 256;
    const cy = 300;
    const r = 100;
    g2.lineWidth = 22;
    g2.strokeStyle = '#26324f';
    g2.beginPath();
    g2.arc(cx, cy, r, Math.PI, 2 * Math.PI);
    g2.stroke();
    g2.strokeStyle = colour;
    g2.beginPath();
    g2.arc(cx, cy, r, Math.PI, Math.PI + Math.PI * pressure);
    g2.stroke();
    const a = Math.PI + Math.PI * pressure;
    g2.strokeStyle = '#ffffff';
    g2.lineWidth = 8;
    g2.beginPath();
    g2.moveTo(cx, cy);
    g2.lineTo(cx + Math.cos(a) * (r - 20), cy + Math.sin(a) * (r - 20));
    g2.stroke();
    g2.font = '700 38px Fredoka, Nunito, sans-serif';
    g2.fillStyle = colour;
    g2.fillText(label, cx, 362);
    gaugeTex.needsUpdate = true;
  }

  const eye = new THREE.Vector3(0, 1.6, 0.45);
  let shake = 0;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  let direction = 'out';

  return {
    scene,
    eye,
    /** direction 'out' | 'in'; module: 'Habitat' | 'Greenhouse' */
    setup(dir, module) {
      direction = dir;
      setSigns(dir === 'out' ? ['OUTSIDE', 'vacuum · no air'] : [module.toUpperCase(), 'air · safe'], dir === 'out' ? [module.toUpperCase(), 'air'] : ['OUTSIDE', 'vacuum']);
      behind.pivot.rotation.y = -1.4; // you just came through: it starts open
      ahead.pivot.rotation.y = 0;
      lastDrawn = '';
      drawGauge(dir === 'out' ? 1 : 0, 'READY', '#7be0a0');
      paintView(dir === 'out');
    },
    /** cycle: from systems/airlock.js */
    update(dt, cycle, events = []) {
      if (events.includes('hatch-close') || events.includes('equal')) shake = reduced ? 0 : 0.18;
      shake = Math.max(0, shake - dt);
      const ph = cycle.phase;
      // hatches
      const closeT = Math.min(1, cycle.t / 0.8);
      behind.pivot.rotation.y = -1.4 * (1 - closeT * closeT);
      // the far hatch swings wide, against the side wall, so you can see through it
      if (ph === 'open' || ph === 'done') ahead.pivot.rotation.y = Math.max(-1.9, ahead.pivot.rotation.y - dt * 3);
      // lights + gauge text
      const busy = ph === 'pump' || ph === 'vent' || ph === 'close';
      const colour = busy ? COLORS.busy : COLORS.ready;
      stripMat.emissive.setHex(colour);
      tint.color.setHex(colour);
      const label =
        ph === 'close' ? 'SEALING HATCH' : ph === 'pump' ? (direction === 'out' ? 'PUMPING AIR OUT' : 'LETTING AIR IN') : ph === 'vent' ? (direction === 'out' ? 'VENTING LAST AIR' : 'FILLING UP') : 'SAFE TO OPEN';
      drawGauge(cycle.pressure, label, busy ? '#ffb547' : '#7be0a0');
    },
    /** camera offset for a tiny "clunk" shake */
    shakeOffset(t) {
      return shake > 0 ? Math.sin(t * 90) * shake * 0.03 : 0;
    },
  };
}
