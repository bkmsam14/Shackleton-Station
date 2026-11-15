// airlockRoom.js — the inside of an airlock, shown during a cycle (its own small scene).
// Modelled loosely on a real spacecraft crew lock (like the ISS Quest airlock): a cylinder with
// padded wall panels, a grating floor, two pressure hatches, handholds, spacesuits on mounts,
// stowage bags, umbilical hoses and a control panel. You stand in the middle; the hatch you came
// through is behind you (+Z), the one you are going to is in front of you (−Z).
// The control-panel screen shows the air pressure live; caution beacons flash amber while the
// air moves and turn green when it is safe to open. Placeholder art in the base's smooth style.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createSign } from './signs.js';
import { MAT } from './materials.js';
import { rbox, mesh, pipe, hazardStripeMaterial } from './details.js';

const R = 1.35; // cylinder radius
const AXIS_Y = 1.15; // cylinder centre height (the floor deck is a flat chord below it)
const L = 3.4; // length between the bulkheads (z)
const HATCH = { w: 0.92, h: 1.7, bottom: 0.18 };
const BEACON = { busy: 0xffb547, ready: 0x7be0a0 };

/** rounded-rectangle shape (hatch frames and leaves) */
function rr(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  s.moveTo(x + r, 0);
  s.lineTo(x + w - r, 0);
  s.quadraticCurveTo(x + w, 0, x + w, r);
  s.lineTo(x + w, h - r);
  s.quadraticCurveTo(x + w, h, x + w - r, h);
  s.lineTo(x + r, h);
  s.quadraticCurveTo(x, h, x, h - r);
  s.lineTo(x, r);
  s.quadraticCurveTo(x, 0, x + r, 0);
  return s;
}

/** A point on the cylinder wall at angle a (0 = straight up, + = toward +x), radius r. */
const onWall = (a, r = R) => new THREE.Vector3(Math.sin(a) * r, AXIS_Y + Math.cos(a) * r, 0);

export function createAirlockRoom(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070d);
  // reflections for metal/plastic (same studio-style environment as the habitat)
  if (renderer) {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.3;
    pmrem.dispose();
  }
  scene.add(new THREE.HemisphereLight(0xe8eefc, 0x40444c, 0.55));
  // two ceiling light panels, each with a soft light under it
  const lights = [];
  for (const z of [-0.85, 0.85]) {
    const l = new THREE.PointLight(0xfff4e2, 5.5, 6, 1.6);
    l.position.set(0, AXIS_Y + R - 0.35, z);
    scene.add(l);
    lights.push(l);
  }
  const beaconLight = new THREE.PointLight(BEACON.busy, 0, 4, 1.8);
  beaconLight.position.set(0, 2.2, -L / 2 + 0.4);
  scene.add(beaconLight);

  // ---------------------------------------------------------------- shell
  // padded wall panels: soft off-white rectangles with thin seams and fasteners
  const panelTex = (() => {
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 256;
    const c = cv.getContext('2d');
    c.fillStyle = '#e9ebee';
    c.fillRect(0, 0, 512, 256);
    for (const [x, y, w, h] of [
      [4, 4, 248, 120],
      [260, 4, 248, 120],
      [4, 132, 160, 120],
      [172, 132, 168, 120],
      [348, 132, 160, 120],
    ]) {
      const g = c.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, '#f3f4f6');
      g.addColorStop(1, '#dfe2e6');
      c.fillStyle = g;
      c.fillRect(x, y, w, h);
      c.strokeStyle = '#b9bec6';
      c.lineWidth = 3;
      c.strokeRect(x, y, w, h);
      c.fillStyle = '#9aa0a8';
      for (const [fx, fy] of [
        [x + 10, y + 10],
        [x + w - 10, y + 10],
        [x + 10, y + h - 10],
        [x + w - 10, y + h - 10],
      ]) {
        c.beginPath();
        c.arc(fx, fy, 3, 0, Math.PI * 2);
        c.fill();
      }
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 2);
    tex.anisotropy = 8;
    return tex;
  })();
  const wallMat = new THREE.MeshStandardMaterial({ map: panelTex, roughness: 0.85, side: THREE.BackSide });
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 48, 1, true), wallMat);
  shell.rotation.x = Math.PI / 2;
  shell.position.y = AXIS_Y;
  scene.add(shell);
  // grating deck (a flat floor across the bottom of the cylinder)
  const deckHalf = Math.sqrt(R * R - (AXIS_Y - 0.02) ** 2);
  const deck = mesh(new THREE.BoxGeometry(deckHalf * 2, 0.04, L), MAT.floor(), 0, 0, 0);
  scene.add(deck);
  // structural rings (frames) along the cylinder
  const ringMat = MAT.hullDark();
  for (const z of [-L / 2 + 0.02, -0.6, 0.6, L / 2 - 0.02]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R - 0.03, 0.045, 10, 48), ringMat);
    ring.position.set(0, AXIS_Y, z);
    scene.add(ring);
  }
  // bulkheads (end walls)
  const bulkMat = MAT.painted(0xd7dce2);
  for (const z of [-L / 2, L / 2]) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(R, 48), bulkMat);
    disc.position.set(0, AXIS_Y, z);
    if (z > 0) disc.rotation.y = Math.PI;
    scene.add(disc);
  }

  // ceiling light panels (glowing) + vent grilles on the upper walls
  for (const z of [-0.85, 0.85]) {
    const panel = mesh(rbox(0.5, 0.03, 0.9, 0.01), MAT.glow(0xfff6e8, 2.2), 0, AXIS_Y + R - 0.06, z, { cast: false });
    scene.add(panel);
  }
  // handholds: short yellow rails on stand-offs (spacecraft handrails)
  const railMat = MAT.painted(0xf2c230);
  for (const [a, z0, z1] of [
    [-1.55, -1.2, -0.2],
    [1.55, -1.2, -0.2],
    [-1.55, 0.4, 1.3],
    [1.55, 0.4, 1.3],
  ]) {
    const p = onWall(a, R - 0.16);
    scene.add(pipe(new THREE.Vector3(p.x, p.y, z0), new THREE.Vector3(p.x, p.y, z1), 0.022, railMat));
    for (const z of [z0 + 0.05, z1 - 0.05]) {
      const q = onWall(a, R - 0.05);
      scene.add(pipe(new THREE.Vector3(p.x, p.y, z), new THREE.Vector3(q.x, q.y, z), 0.018, railMat));
    }
  }

  // ---------------------------------------------------------------- spacesuits on wall mounts
  function spacesuit(x, z, turn) {
    const g = new THREE.Group();
    const white = MAT.painted(0xf1f2f0);
    const grey = MAT.painted(0xb9bec6);
    g.add(mesh(rbox(0.5, 0.62, 0.34, 0.12), white, 0, 1.25, 0)); // torso
    g.add(mesh(rbox(0.46, 0.5, 0.2, 0.06), grey, 0, 1.3, -0.24)); // life-support backpack
    g.add(mesh(new THREE.SphereGeometry(0.19, 28, 18), white, 0, 1.73, 0.02)); // helmet shell
    // gold sun visor: a smooth, flattened dome on the front of the helmet
    const visor = mesh(new THREE.SphereGeometry(0.15, 28, 18), new THREE.MeshStandardMaterial({ color: 0xc89b2c, metalness: 1, roughness: 0.12 }), 0, 1.72, 0.085);
    visor.scale.set(1, 0.82, 0.62);
    g.add(visor);
    for (const s of [-1, 1]) {
      const arm = mesh(new THREE.CapsuleGeometry(0.075, 0.42, 6, 14), white, s * 0.32, 1.12, 0.02);
      arm.rotation.z = s * 0.18;
      g.add(arm);
      g.add(mesh(new THREE.SphereGeometry(0.075, 14, 10), grey, s * 0.37, 0.82, 0.04)); // glove
      const leg = mesh(new THREE.CapsuleGeometry(0.09, 0.5, 6, 14), white, s * 0.12, 0.62, 0);
      g.add(leg);
      g.add(mesh(rbox(0.16, 0.1, 0.26, 0.04), grey, s * 0.12, 0.3, 0.04)); // boot
    }
    g.add(mesh(rbox(0.22, 0.12, 0.05, 0.02), MAT.darkMetal(), 0, 1.12, 0.18)); // chest controls
    g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 12), MAT.glow(0x7be0a0, 1.5), -0.06, 1.12, 0.21, { cast: false }));
    // mount bracket
    g.add(mesh(rbox(0.12, 0.9, 0.1, 0.03), MAT.darkMetal(), 0, 1.25, -0.38));
    g.position.set(x, 0.02, z);
    g.rotation.y = turn;
    scene.add(g);
  }
  // stowed beside the hatch behind you (turn around to see them)
  spacesuit(-0.74, 1.15, Math.PI / 2);
  spacesuit(0.74, 1.15, -Math.PI / 2);

  // stowage bags (beige fabric) strapped high on the walls
  const bagMat = MAT.fabric(0xd8cdb4);
  const strapMat = MAT.fabric(0x3c4a5e);
  for (const [a, z, w] of [
    [-0.55, 0.9, 0.5],
    [0.55, 0.9, 0.42],
    [0.55, -0.95, 0.36],
  ]) {
    const p = onWall(a, R - 0.17); // sits against the wall
    const bag = mesh(rbox(w, 0.3, 0.32, 0.08), bagMat, p.x, p.y, z);
    bag.rotation.z = -a;
    const strap = mesh(new THREE.BoxGeometry(0.03, 0.32, 0.34), strapMat, p.x, p.y, z);
    strap.rotation.z = -a;
    scene.add(bag, strap);
  }

  // umbilical hoses from a service panel on the left wall
  const servicePos = onWall(-1.25, R - 0.04);
  const service = mesh(rbox(0.45, 0.06, 0.5, 0.02), MAT.painted(0xaab2bc), servicePos.x, servicePos.y, -1.0);
  service.rotation.z = 1.25;
  scene.add(service);
  const hoseMat = MAT.painted(0x2e3440);
  const hosePts = [
    new THREE.Vector3(servicePos.x + 0.06, servicePos.y, -1.0),
    new THREE.Vector3(-0.85, 0.9, -0.8),
    new THREE.Vector3(-0.8, 0.75, -0.25),
    new THREE.Vector3(-0.72, 1.05, 0.05),
  ];
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hosePts), 40, 0.03, 8, false), hoseMat));
  const hose2 = hosePts.map((p) => p.clone().add(new THREE.Vector3(0.02, -0.12, 0.08)));
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hose2), 40, 0.025, 8, false), MAT.accent()));

  // ---------------------------------------------------------------- hatches
  const stripeMat = hazardStripeMaterial();
  const doorMat = MAT.door();
  // a porthole view per hatch (what is on the other side), painted in setup()
  function viewTexture() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return { cv, ctx: cv.getContext('2d'), tex };
  }
  function hatch(z, facing) {
    const g = new THREE.Group();
    g.position.set(0, HATCH.bottom, z + facing * 0.01);
    if (facing < 0) g.rotation.y = Math.PI;
    // hazard stripe border on the bulkhead
    const border = rr(HATCH.w + 0.42, HATCH.h + 0.3, 0.34);
    border.holes.push(rr(HATCH.w + 0.24, HATCH.h + 0.18, 0.3));
    const stripe = new THREE.Mesh(new THREE.ShapeGeometry(border, 12), stripeMat);
    stripe.position.set(0, -0.12, 0.002);
    g.add(stripe);
    // orange frame
    const outer = rr(HATCH.w + 0.24, HATCH.h + 0.18, 0.3);
    outer.holes.push(rr(HATCH.w, HATCH.h, 0.26));
    g.add(mesh(new THREE.ExtrudeGeometry(outer, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 10 }), MAT.doorFrame(), 0, -0.09, -0.02));
    // what is beyond the hatch (seen when it opens)
    const view = viewTexture();
    const through = new THREE.Mesh(new THREE.ShapeGeometry(rr(HATCH.w, HATCH.h, 0.26), 10), new THREE.MeshBasicMaterial({ map: view.tex, toneMapped: false }));
    through.position.z = 0.006; // just in front of the bulkhead wall, behind the hatch leaf
    // map the canvas over the opening
    const uv = through.geometry.attributes.uv;
    const pos = through.geometry.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + HATCH.w / 2) / HATCH.w, pos.getY(i) / HATCH.h);
    g.add(through);
    // the leaf on a hinge (left edge), with a porthole and a locking wheel
    const pivot = new THREE.Group();
    pivot.position.set(-HATCH.w / 2, 0, 0.06);
    const leaf = new THREE.Group();
    leaf.position.x = HATCH.w / 2;
    leaf.add(mesh(new THREE.ExtrudeGeometry(rr(HATCH.w - 0.04, HATCH.h - 0.04, 0.24), { depth: 0.07, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 10 }), doorMat, 0, 0.02, -0.04));
    const port = new THREE.Mesh(new THREE.CircleGeometry(0.15, 28), new THREE.MeshBasicMaterial({ map: view.tex, toneMapped: false }));
    port.position.set(0, HATCH.h * 0.74, 0.05);
    leaf.add(port);
    leaf.add(mesh(new THREE.TorusGeometry(0.165, 0.028, 10, 28), MAT.metal(), 0, HATCH.h * 0.74, 0.05));
    const wheel = new THREE.Group();
    wheel.position.set(0, HATCH.h * 0.45, 0.08);
    wheel.add(mesh(new THREE.TorusGeometry(0.17, 0.022, 8, 28), MAT.metal()));
    for (const a of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
      const spoke = mesh(new THREE.BoxGeometry(0.34, 0.022, 0.022), MAT.metal());
      spoke.rotation.z = a;
      wheel.add(spoke);
    }
    leaf.add(wheel);
    // latch dogs around the edge
    for (const [lx, ly] of [
      [-HATCH.w / 2 + 0.06, 0.4],
      [-HATCH.w / 2 + 0.06, HATCH.h - 0.4],
      [HATCH.w / 2 - 0.06, 0.4],
      [HATCH.w / 2 - 0.06, HATCH.h - 0.4],
    ]) {
      leaf.add(mesh(rbox(0.05, 0.12, 0.05, 0.015), MAT.darkMetal(), lx, ly, 0.06));
    }
    pivot.add(leaf);
    g.add(pivot);
    // caution beacon above the hatch
    const beaconMat = new THREE.MeshStandardMaterial({ color: 0x221a10, emissive: BEACON.busy, emissiveIntensity: 0, roughness: 0.3 });
    const beacon = mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 18), beaconMat, HATCH.w / 2 + 0.34, HATCH.h + 0.12, 0.05, { cast: false });
    beacon.rotation.x = Math.PI / 2;
    g.add(beacon);
    scene.add(g);
    return { group: g, pivot, wheel, view, beaconMat };
  }
  const ahead = hatch(-L / 2, 1); // the one you are going to
  const behind = hatch(L / 2, -1); // the one you came through

  // equalization valve + labels beside the far hatch (left side)
  const valveG = new THREE.Group();
  valveG.position.set(-0.86, 1.05, -L / 2 + 0.06);
  valveG.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 16), MAT.darkMetal(), 0, 0, 0).rotateX(Math.PI / 2));
  const valveWheel = mesh(new THREE.TorusGeometry(0.09, 0.016, 8, 20), MAT.painted(0xd64545), 0, 0, 0.05);
  valveG.add(valveWheel);
  scene.add(valveG);
  const valveSign = createSign(['VALVE', 'equalize'], 0.36, 0.15, { accent: '#d64545' });
  valveSign.position.set(-0.86, 1.28, -L / 2 + 0.07);
  scene.add(valveSign);

  // ---------------------------------------------------------------- control panel with live screen
  const panelG = new THREE.Group();
  panelG.position.set(0.86, 1.08, -L / 2 + 0.06);
  panelG.add(mesh(rbox(0.46, 0.62, 0.06, 0.03), MAT.darkMetal(), 0, 0, 0));
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 384;
  const g2 = cv.getContext('2d');
  const screenTex = new THREE.CanvasTexture(cv);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  screen.position.set(0, 0.1, 0.035);
  panelG.add(screen);
  const buttons = [];
  for (const [bx, label, col] of [
    [-0.11, 'DEPRESS', 0xffb547],
    [0.11, 'REPRESS', 0x4fd1e8],
  ]) {
    const bm = new THREE.MeshStandardMaterial({ color: 0x222831, emissive: col, emissiveIntensity: 0.25 });
    const b = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.025, 18), bm, bx, -0.17, 0.04, { cast: false });
    b.rotation.x = Math.PI / 2;
    panelG.add(b);
    const lbl = createSign([label], 0.16, 0.05, { accent: '#' + col.toString(16).padStart(6, '0') });
    lbl.position.set(bx, -0.235, 0.036);
    panelG.add(lbl);
    buttons.push({ label, mat: bm });
  }
  scene.add(panelG);

  let lastDrawn = '';
  function drawScreen(pressure, label, colour) {
    const key = `${Math.round(pressure * 100)}|${label}|${colour}`;
    if (key === lastDrawn) return;
    lastDrawn = key;
    g2.fillStyle = '#06101f';
    g2.fillRect(0, 0, 512, 384);
    g2.strokeStyle = 'rgba(79,209,232,0.35)';
    g2.lineWidth = 4;
    g2.strokeRect(8, 8, 496, 368);
    g2.textAlign = 'center';
    g2.fillStyle = '#9fb3cc';
    g2.font = '700 40px Fredoka, Nunito, sans-serif';
    g2.fillText('CABIN AIR', 256, 58);
    g2.fillStyle = '#ffffff';
    g2.font = '700 104px Fredoka, Nunito, sans-serif';
    g2.fillText(`${Math.round(pressure * 100)}%`, 256, 170);
    // bar
    g2.fillStyle = '#1b2840';
    g2.fillRect(56, 210, 400, 44);
    g2.fillStyle = colour;
    g2.fillRect(56, 210, 400 * pressure, 44);
    g2.strokeStyle = '#ffffff';
    g2.lineWidth = 3;
    g2.strokeRect(56, 210, 400, 44);
    g2.fillStyle = colour;
    g2.font = '700 38px Fredoka, Nunito, sans-serif';
    g2.fillText(label, 256, 330);
    screenTex.needsUpdate = true;
  }

  // signs above the hatches (rebuilt for each cycle)
  let signAhead = null;
  let signBehind = null;
  function setSigns(aheadText, behindText) {
    for (const s of [signAhead, signBehind]) if (s) scene.remove(s);
    signAhead = createSign(aheadText, 0.9, 0.26, { accent: '#ffb547' });
    signAhead.position.set(0, HATCH.bottom + HATCH.h + 0.3, -L / 2 + 0.05);
    signBehind = createSign(behindText, 0.9, 0.26, { accent: '#7be0a0' });
    signBehind.position.set(0, HATCH.bottom + HATCH.h + 0.3, L / 2 - 0.05);
    signBehind.rotation.y = Math.PI;
    scene.add(signAhead, signBehind);
  }

  function paintView(v, outside) {
    const c = v.ctx;
    if (outside) {
      c.fillStyle = '#000000';
      c.fillRect(0, 0, 256, 256);
      c.fillStyle = '#ffffff';
      for (let i = 0; i < 70; i++) {
        c.globalAlpha = 0.35 + Math.random() * 0.65;
        c.beginPath();
        c.arc(Math.random() * 256, Math.random() * 150, Math.random() * 1.3 + 0.3, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
      const g = c.createLinearGradient(0, 165, 0, 256);
      g.addColorStop(0, '#8d8a84');
      g.addColorStop(1, '#2f2e2b');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(0, 256);
      for (let x = 0; x <= 256; x += 16) c.lineTo(x, 172 + Math.sin(x * 0.05) * 6);
      c.lineTo(256, 256);
      c.fill();
    } else {
      const g = c.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, '#fff6e6');
      g.addColorStop(1, '#b9c1cc');
      c.fillStyle = g;
      c.fillRect(0, 0, 256, 256);
    }
    v.tex.needsUpdate = true;
  }

  const eye = new THREE.Vector3(0, 1.62, 0.35);
  let shake = 0;
  let t = 0;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  let direction = 'out';
  const OPEN = 1.75; // how far a hatch swings open (radians, toward you, against the side wall)

  return {
    scene,
    eye,
    /** direction 'out' | 'in'; module: 'Habitat' | 'Greenhouse' */
    setup(dir, module) {
      direction = dir;
      const name = module.toUpperCase();
      setSigns(dir === 'out' ? ['OUTSIDE', 'vacuum · no air'] : [name, 'air · safe'], dir === 'out' ? [name, 'air'] : ['OUTSIDE', 'vacuum']);
      paintView(ahead.view, dir === 'out');
      paintView(behind.view, dir !== 'out');
      behind.pivot.rotation.y = -OPEN; // you just came through: it starts open
      ahead.pivot.rotation.y = 0;
      lastDrawn = '';
      drawScreen(dir === 'out' ? 1 : 0, 'READY', '#7be0a0');
    },
    /** cycle: from systems/airlock.js */
    update(dt, cycle, events = []) {
      t += dt;
      if (events.includes('hatch-close') || events.includes('equal')) shake = reduced ? 0 : 0.18;
      shake = Math.max(0, shake - dt);
      const ph = cycle.phase;
      // hatch behind you swings shut, then its wheel turns to lock
      const closeT = Math.min(1, cycle.t / 0.7);
      behind.pivot.rotation.y = -OPEN * (1 - closeT * closeT);
      if (ph !== 'close') behind.wheel.rotation.z = Math.min(Math.PI, behind.wheel.rotation.z + dt * 4);
      // far hatch: wheel unlocks, then the leaf swings wide
      if (ph === 'open' || ph === 'done') {
        ahead.wheel.rotation.z = Math.max(-Math.PI, ahead.wheel.rotation.z - dt * 6);
        if (ahead.wheel.rotation.z <= -Math.PI / 2) ahead.pivot.rotation.y = Math.max(-OPEN, ahead.pivot.rotation.y - dt * 2.6);
      } else ahead.wheel.rotation.z = 0;
      // beacons + button lights + screen
      const busy = ph === 'pump' || ph === 'vent' || ph === 'close';
      const flash = busy ? 0.6 + 0.4 * Math.sin(t * (reduced ? 0 : 7)) : 1;
      for (const h of [ahead, behind]) {
        h.beaconMat.emissive.setHex(busy ? BEACON.busy : BEACON.ready);
        h.beaconMat.emissiveIntensity = 2.4 * flash;
      }
      beaconLight.color.setHex(busy ? BEACON.busy : BEACON.ready);
      beaconLight.intensity = 1.6 * flash;
      for (const b of buttons) {
        const active = busy && ((direction === 'out' && b.label === 'DEPRESS') || (direction === 'in' && b.label === 'REPRESS'));
        b.mat.emissiveIntensity = active ? 1.8 * flash : 0.25;
      }
      const label =
        ph === 'close'
          ? 'SEALING HATCH'
          : ph === 'pump'
            ? direction === 'out'
              ? 'PUMPING AIR OUT'
              : 'LETTING AIR IN'
            : ph === 'vent'
              ? direction === 'out'
                ? 'VENTING LAST AIR'
                : 'FILLING UP'
              : 'SAFE TO OPEN';
      drawScreen(cycle.pressure, label, busy ? '#ffb547' : '#7be0a0');
      // ceiling lights dim very slightly while the pumps draw power (a small touch)
      for (const l of lights) l.intensity = ph === 'pump' ? 5.0 : 5.5;
    },
    /** camera offset for a tiny "clunk" shake */
    shakeOffset(time) {
      return shake > 0 ? Math.sin(time * 90) * shake * 0.03 : 0;
    },
  };
}
