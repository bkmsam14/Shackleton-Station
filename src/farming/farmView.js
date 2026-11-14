// farmView.js — the close-up interaction view for one pot.
// The camera glides to the pot, the mouse is freed, and the player does each step by hand:
//   plant   : drag the seed potato from the panel into the hole
//   cover   : drag handfuls of soil from the pile onto the seed
//   water   : take the can, hold the mouse button to tilt it, aim the stream at the soil
//   harvest : take the cutters, click each leafy stem to cut it, then the potato pops out
// The world is paused while this view is open (like the planned lesson instances).
import * as THREE from 'three';
import { FARMING, PLAYER } from '../config/gameplay.js';
import { ITEMS, countOf } from './inventory.js';
import { plantSeed, addCover, addWater, cutLeaf, canPlant, coverFraction, waterFraction, cutsNeeded, STAGE } from './farmState.js';
import { POT, createPotatoMesh, createSoilClump, createWateringCan, createCutters, LEAF_HOVER } from './farmModels.js';
import { MAT } from '../world/materials.js';
import { sfx } from './sfx.js';

const STEPS = ['plant', 'cover', 'water', 'grow', 'harvest'];
const POUR_ANGLE = (FARMING.POUR_ANGLE_DEG * Math.PI) / 180;
const MAX_TILT = (78 * Math.PI) / 180;
const DROPS_PER_SECOND = 90;
const MAX_PARTICLES = 600;
const KIND = { DEAD: 0, WATER: 1, SPLASH: 2, CRUMB: 3 };
const COL = { water: new THREE.Color(0xa8dcff), soil: new THREE.Color(0x5b4330), leaf: new THREE.Color(0x5aa845) };

const ease = (t) => t * t * (3 - 2 * t);
// cutter grip relative to the camera: handles come back toward you at the lower right,
// blades point forward and slightly up-left into the plant; rolled so the blades' flat
// sides (and their V when open) face you
const CUTTER_HOLD = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.45, 0.85, 1.0, 'YXZ'));
const potatoes = (n) => `${n} ${n === 1 ? 'potato' : 'potatoes'}`;

export function createFarmView({ camera, renderer, root, world, state, pots, feedback, sync, save, hooks }) {
  // ------------------------------------------------------------ DOM
  const el = document.createElement('div');
  el.className = 'farm-view';
  el.hidden = true;
  el.innerHTML = `
    <div class="farm-bag" aria-label="Inventory"><span class="farm-potato-icon" aria-hidden="true"></span><span>Potatoes</span><b data-bag>0</b></div>
    <div class="farm-panel" role="dialog" aria-label="Potato pot">
      <ol class="farm-steps">${STEPS.map((s) => `<li data-step="${s}">${s[0].toUpperCase() + s.slice(1)}</li>`).join('')}</ol>
      <p class="farm-instr" data-instr aria-live="polite"></p>
      <div class="farm-meter" data-meter hidden><span data-meter-fill></span></div>
      <div class="farm-actions">
        <button type="button" class="farm-item" data-seed><span class="farm-potato-icon" aria-hidden="true"></span><span>${ITEMS.potato.seedName}</span><b data-seed-count>×0</b></button>
        <button type="button" class="btn farm-btn" data-tool="can">Watering can</button>
        <button type="button" class="btn farm-btn" data-tool="cutters">Cutters</button>
        <button type="button" class="btn farm-btn" data-again>Plant again</button>
        <button type="button" class="farm-done" data-done><span class="keycap">E</span> Done</button>
      </div>
    </div>`;
  root.appendChild(el);
  const $ = (s) => el.querySelector(s);
  const ui = {
    panel: $('.farm-panel'),
    instr: $('[data-instr]'),
    meter: $('[data-meter]'),
    meterFill: $('[data-meter-fill]'),
    seed: $('[data-seed]'),
    seedCount: $('[data-seed-count]'),
    can: $('[data-tool="can"]'),
    cutters: $('[data-tool="cutters"]'),
    again: $('[data-again]'),
    done: $('[data-done]'),
    bag: $('[data-bag]'),
    steps: [...el.querySelectorAll('[data-step]')],
  };

  // ------------------------------------------------------------ 3D helpers
  const layer = new THREE.Group(); // tools + effects, in world coordinates
  layer.visible = false;
  world.add(layer);
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane();
  const hit = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const tmpQ = new THREE.Quaternion();

  const targetRing = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.004, 8, 40), MAT.glow(0x7be0a0, 1.6));
  targetRing.rotation.x = Math.PI / 2;
  targetRing.visible = false;
  layer.add(targetRing);

  // particles: water drops, splashes, soil crumbs, leaf bits — one instanced mesh
  const pMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 6, 4),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 }),
    MAX_PARTICLES,
  );
  pMesh.frustumCulled = false;
  pMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  layer.add(pMesh);
  const P = {
    pos: new Float32Array(MAX_PARTICLES * 3),
    vel: new Float32Array(MAX_PARTICLES * 3),
    life: new Float32Array(MAX_PARTICLES),
    size: new Float32Array(MAX_PARTICLES),
    kind: new Uint8Array(MAX_PARTICLES),
    next: 0,
  };
  const pDummy = new THREE.Object3D();
  for (let i = 0; i < MAX_PARTICLES; i++) {
    pDummy.scale.setScalar(0);
    pDummy.updateMatrix();
    pMesh.setMatrixAt(i, pDummy.matrix);
    pMesh.setColorAt(i, COL.water);
  }
  function spawn(kind, x, y, z, vx, vy, vz, size, color) {
    const i = P.next;
    P.next = (P.next + 1) % MAX_PARTICLES;
    P.pos.set([x, y, z], i * 3);
    P.vel.set([vx, vy, vz], i * 3);
    P.life[i] = 0;
    P.size[i] = size;
    P.kind[i] = kind;
    pMesh.setColorAt(i, color);
    pMesh.instanceColor.needsUpdate = true;
  }
  function burst(kind, at, n, color, speed = 0.18, size = 0.005) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      spawn(kind, at.x, at.y + 0.004, at.z, Math.cos(a) * s * 0.6, s, Math.sin(a) * s * 0.6, size * (0.6 + Math.random() * 0.6), color);
    }
  }

  // ------------------------------------------------------------ view state
  let open = false;
  let potId = null;
  let v = null; // pot view refs
  let step = 'plant';
  let tool = null; // 'seed' | 'clump' | 'can' | 'cutters'
  let toolObj = null;
  let pointer = { x: 0, y: 0, down: false, inPanel: false };
  const anims = []; // { t, dur, fn(k), done() }
  const saved = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
  const cam = { fromPos: new THREE.Vector3(), fromQuat: new THREE.Quaternion(), toPos: new THREE.Vector3(), toQuat: new THREE.Quaternion(), t: 1, dur: 0.5, after: null };
  let can = null;
  let canTilt = 0;
  let pourCarry = 0;
  let cutters = null;
  let hovered = null;
  let closing = false;
  let busy = false; // short animations that block input
  let pendingNotice = 0;

  function animate(dur, fn, done) {
    anims.push({ t: 0, dur, fn, done });
  }

  function poseFor(s) {
    const c = v.soilWorld;
    const side = v.side;
    if (s === 'harvest' || s === 'harvested')
      return { eye: tmp.set(c.x, c.y + 0.4, c.z - side * 0.5).clone(), look: tmp2.set(c.x, c.y + 0.12, c.z).clone() };
    if (s === 'water' || s === 'watered')
      return { eye: tmp.set(c.x, c.y + 0.5, c.z - side * 0.45).clone(), look: tmp2.set(c.x, c.y + 0.05, c.z - side * 0.02).clone() };
    return { eye: tmp.set(c.x, c.y + 0.42, c.z - side * 0.34).clone(), look: tmp2.set(c.x, c.y - 0.01, c.z - side * 0.03).clone() };
  }
  const lookM = new THREE.Matrix4();
  function moveCamera(eye, look, dur = 0.5, after = null) {
    cam.fromPos.copy(camera.position);
    cam.fromQuat.copy(camera.quaternion);
    cam.toPos.copy(eye);
    lookM.lookAt(eye, look, camera.up);
    cam.toQuat.setFromRotationMatrix(lookM);
    cam.t = 0;
    cam.dur = dur;
    cam.after = after;
  }
  function moveToStep(s) {
    const p = poseFor(s);
    moveCamera(p.eye, p.look, 0.45);
  }

  // ------------------------------------------------------------ panel
  function setStep(s) {
    step = s;
    const pot = state.pots[potId];
    const seeds = countOf(state.inventory, 'potato');
    const activeIdx = { plant: 0, cover: 1, water: 2, watered: 3, harvest: 4, harvested: 4, empty: 0 }[s];
    ui.steps.forEach((li, i) => {
      li.classList.toggle('is-done', i < activeIdx || s === 'harvested' || (s === 'watered' && i <= 3));
      li.classList.toggle('is-active', i === activeIdx && s !== 'harvested');
    });
    ui.seed.hidden = s !== 'plant';
    ui.seedCount.textContent = '×' + seeds;
    ui.seed.disabled = seeds <= 0;
    ui.can.hidden = !(s === 'water' && tool !== 'can');
    ui.cutters.hidden = !(s === 'harvest' && tool !== 'cutters');
    ui.again.hidden = !(s === 'harvested' && canPlant(state, potId));
    ui.meter.hidden = s !== 'water' && s !== 'watered';
    ui.done.classList.toggle('is-primary', s === 'watered' || s === 'harvested' || s === 'empty');
    v.dig = s === 'plant';
    sync(potId);
    targetRing.visible = false;
    let text = '';
    if (s === 'plant') text = 'Drag the seed potato into the hole in the soil.';
    if (s === 'empty') text = 'No seed potatoes left. Harvest a potato plant to get one.';
    if (s === 'cover') text = `Drag soil from the pile onto the seed. (${pot.cover}/${FARMING.COVER_LOADS})`;
    if (s === 'water')
      text = tool === 'can' ? 'Hold the mouse button to tilt the can. Aim the water at the soil.' : 'The soil needs water. Take the watering can.';
    if (s === 'watered') text = 'Watered! Now the potato grows under the grow lights. Come back later.';
    if (s === 'harvest')
      text =
        tool === 'cutters'
          ? `Cut a leafy stem: it comes up with its potato! (${pot.cuts}/${cutsNeeded(pot)})`
          : 'Ready! Potatoes grow underground on the roots. Take the cutters and cut each leafy stem.';
    if (s === 'harvested')
      text = `You harvested ${potatoes(pendingNotice)}! Keep one to plant again, and eat the rest (F).`;
    ui.instr.textContent = text;
    updateMeter();
    ui.bag.textContent = String(seeds);
  }
  function updateMeter() {
    if (!potId) return;
    ui.meterFill.style.width = `${Math.round(waterFraction(state.pots[potId]) * 100)}%`;
  }

  // ------------------------------------------------------------ pointer → world
  function setRayFromPointer() {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((pointer.x - r.left) / r.width) * 2 - 1, -((pointer.y - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
  }
  /** Cursor projected onto the horizontal plane at height y. */
  function pointOnPlane(y, out) {
    setRayFromPointer();
    plane.set(tmp.set(0, 1, 0), -y);
    return raycaster.ray.intersectPlane(plane, out);
  }
  const flatDist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

  // ------------------------------------------------------------ tools
  function clearTool() {
    if (toolObj) {
      toolObj.removeFromParent();
      toolObj.traverse((o) => o.isMesh && o.geometry.dispose());
    }
    toolObj = null;
    tool = null;
    can = null;
    cutters = null;
    canTilt = 0;
    sfx.pouring(0);
    setHover(null);
    targetRing.visible = false;
    el.dataset.tool = '';
  }

  function startSeedDrag(e) {
    if (busy || step !== 'plant' || !canPlant(state, potId)) return;
    e.preventDefault();
    sfx.unlock();
    sfx.pickUp();
    tool = 'seed';
    toolObj = createPotatoMesh(11, 1);
    layer.add(toolObj);
    el.dataset.tool = 'drag';
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    targetRing.position.set(v.soilWorld.x, v.soilWorld.y + 0.004, v.soilWorld.z);
    targetRing.visible = true;
    followSeed(1);
  }
  function followSeed(k) {
    if (pointOnPlane(v.soilWorld.y + 0.1, hit)) toolObj.position.lerp(hit, k);
  }
  function dropSeed() {
    const seed = toolObj;
    const over = pointOnPlane(v.soilWorld.y + 0.1, hit) && flatDist(hit, v.soilWorld) < POT.soilRadius * 0.85;
    toolObj = null;
    tool = null;
    el.dataset.tool = '';
    targetRing.visible = false;
    if (!over || !plantSeed(state, potId)) {
      // back to the panel: shrink away, nothing used
      const s0 = seed.scale.x;
      animate(0.2, (k) => seed.scale.setScalar(s0 * (1 - k)), () => seed.removeFromParent());
      ui.instr.textContent = 'Drop it into the hole in the soil.';
      return;
    }
    busy = true;
    const from = seed.position.clone();
    const to = new THREE.Vector3(v.soilWorld.x, v.soilWorld.y - 0.006, v.soilWorld.z);
    animate(
      0.32,
      (k) => {
        seed.position.lerpVectors(from, to, k * k);
        seed.rotation.x = k * 1.2;
      },
      () => {
        seed.removeFromParent();
        sfx.plop();
        burst(KIND.CRUMB, v.soilWorld, 10, COL.soil, 0.2);
        save();
        setStep('plant'); // refresh counts while the seed settles
        v.dig = true;
        sync(potId);
        animate(0.45, () => {}, () => {
          busy = false;
          setStep('cover');
        });
      },
    );
  }

  function pileWorld(out) {
    return v.pile.getWorldPosition(out);
  }
  function startClump() {
    const pw = pileWorld(tmp2);
    if (!pointOnPlane(v.soilWorld.y + 0.02, hit) || flatDist(hit, pw) > 0.075) return false;
    sfx.unlock();
    sfx.scrape();
    tool = 'clump';
    toolObj = createSoilClump();
    toolObj.position.copy(hit);
    layer.add(toolObj);
    el.dataset.tool = 'drag';
    targetRing.position.set(v.soilWorld.x, v.soilWorld.y + 0.004, v.soilWorld.z);
    targetRing.visible = true;
    burst(KIND.CRUMB, pw, 4, COL.soil, 0.12);
    return true;
  }
  function moveClump() {
    if (!pointOnPlane(v.soilWorld.y + 0.035, hit)) return;
    toolObj.position.lerp(hit, 0.5);
    if (flatDist(toolObj.position, v.soilWorld) < 0.05) depositClump();
  }
  function depositClump() {
    const clump = toolObj;
    toolObj = null;
    tool = null;
    el.dataset.tool = '';
    targetRing.visible = false;
    busy = true;
    const from = clump.position.clone();
    const to = new THREE.Vector3(v.soilWorld.x, v.soilWorld.y + 0.01, v.soilWorld.z);
    sfx.scrape();
    animate(
      0.25,
      (k) => {
        clump.position.lerpVectors(from, to, k);
        clump.scale.set(0.03 * (1 + k * 0.6), 0.022 * (1 - k * 0.8), 0.03 * (1 + k * 0.6));
      },
      () => {
        clump.removeFromParent();
        burst(KIND.CRUMB, v.soilWorld, 8, COL.soil, 0.16);
        const covered = addCover(state, potId, 1);
        save();
        sync(potId);
        if (covered) {
          sfx.success();
          ui.instr.textContent = 'The seed potato is covered!';
          animate(0.6, () => {}, () => {
            busy = false;
            setStep('water');
            moveToStep('water');
          });
        } else {
          busy = false;
          setStep('cover');
        }
      },
    );
  }
  function returnClump() {
    const clump = toolObj;
    toolObj = null;
    tool = null;
    el.dataset.tool = '';
    targetRing.visible = false;
    const from = clump.position.clone();
    const to = pileWorld(new THREE.Vector3());
    animate(0.2, (k) => clump.position.lerpVectors(from, to, k), () => clump.removeFromParent());
  }

  function takeCan() {
    if (step !== 'water' || tool) return;
    sfx.unlock();
    sfx.pickUp();
    const c = createWateringCan();
    // spout (+X) points to the screen-left; the can sits on the right of the stream
    const right = tmp.set(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize().negate();
    c.root.quaternion.setFromUnitVectors(tmp2.set(1, 0, 0), right);
    c.root.position.set(v.soilWorld.x, v.soilWorld.y + 0.3, v.soilWorld.z);
    layer.add(c.root);
    can = c;
    toolObj = c.root;
    tool = 'can';
    el.dataset.tool = 'can';
    canTilt = 0;
    setStep('water');
  }
  const tipLocal = new THREE.Vector3();
  function updateCan(dt) {
    const want = pointer.down && !pointer.inPanel ? MAX_TILT : 0;
    canTilt += (want - canTilt) * (1 - Math.exp(-dt * 7));
    can.tilt.rotation.z = -canTilt;
    // keep the stream landing near the cursor: place the can so its spout tip is over it
    if (pointOnPlane(v.soilWorld.y, hit)) {
      can.root.updateMatrixWorld(true);
      can.tip.getWorldPosition(tipLocal).sub(can.root.position);
      const goal = tmp.set(hit.x - tipLocal.x, v.soilWorld.y + 0.26, hit.z - tipLocal.z);
      const lead = tmp2.set(1, 0, 0).applyQuaternion(can.root.quaternion).multiplyScalar(0.035);
      goal.sub(lead);
      can.root.position.lerp(goal, 1 - Math.exp(-dt * 14));
    }
    // pour
    const flow = THREE.MathUtils.clamp((canTilt - POUR_ANGLE) / 0.35, 0, 1);
    sfx.pouring(flow);
    if (flow <= 0) {
      pourCarry = 0;
      return;
    }
    can.root.updateMatrixWorld(true);
    const tip = can.tip.getWorldPosition(tmp);
    const dir = tmp2.copy(can.spoutDir).applyQuaternion(can.tilt.getWorldQuaternion(tmpQ)).normalize();
    pourCarry += DROPS_PER_SECOND * flow * dt;
    while (pourCarry >= 1) {
      pourCarry -= 1;
      const sp = 0.22 + Math.random() * 0.05;
      spawn(
        KIND.WATER,
        tip.x + (Math.random() - 0.5) * 0.008,
        tip.y,
        tip.z + (Math.random() - 0.5) * 0.008,
        dir.x * sp + (Math.random() - 0.5) * 0.03,
        dir.y * sp,
        dir.z * sp + (Math.random() - 0.5) * 0.03,
        0.0045 + Math.random() * 0.002,
        COL.water,
      );
    }
  }
  function onWaterHit() {
    const pot = state.pots[potId];
    if (pot.stage !== STAGE.COVERED) return;
    const done = addWater(state, potId, 1);
    sync(potId);
    updateMeter();
    if (done) {
      save();
      sfx.success();
      busy = true;
      animate(0.9, () => {}, () => {
        busy = false;
        clearTool();
        setStep('watered');
      });
    }
  }

  function takeCutters() {
    if (step !== 'harvest' || tool) return;
    sfx.unlock();
    sfx.pickUp();
    cutters = createCutters();
    cutters.root.scale.setScalar(1.3); // a little bigger so it reads well at this distance
    cutters.setOpen(1);
    layer.add(cutters.root);
    toolObj = cutters.root;
    tool = 'cutters';
    el.dataset.tool = 'cutters';
    setStep('harvest');
  }
  function setHover(stem) {
    if (hovered === stem) return;
    if (hovered) hovered.material.emissive.setHex(0x000000);
    hovered = stem;
    if (hovered) hovered.material.emissive.setHex(LEAF_HOVER);
  }
  function updateCutters() {
    setRayFromPointer();
    const stems = v.plant ? v.plant.stems.filter((s) => s.visible) : [];
    const hits = pointer.inPanel ? [] : raycaster.intersectObjects(stems, false);
    setHover(hits.length ? hits[0].object : null);
    let at;
    if (hits.length) at = hits[0].point;
    else {
      plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(tmp).negate(), tmp2.copy(v.soilWorld).add({ x: 0, y: 0.15, z: 0 }));
      at = raycaster.ray.intersectPlane(plane, hit) ?? v.soilWorld;
    }
    // held in the right hand: blades point forward (away from you) and a little down and
    // to the left, into the plant; the blade tips sit on the point you aim at
    cutters.root.quaternion.copy(camera.quaternion).multiply(CUTTER_HOLD);
    const tipOffset = tmp.copy(cutters.tip).multiplyScalar(cutters.root.scale.x).applyQuaternion(cutters.root.quaternion);
    cutters.root.position.lerp(tmp2.copy(at).sub(tipOffset), 0.6);
  }
  function snip() {
    if (busy || !hovered) return;
    const stem = hovered;
    setHover(null);
    // setCut(n) hides the first n stems, so move this one into the next "cut" slot
    const stems = v.plant.stems;
    const at = stems.indexOf(stem);
    const slot = state.pots[potId].cuts;
    [stems[at], stems[slot]] = [stems[slot], stems[at]];
    sfx.snip();
    busy = true;
    const shears = cutters; // the last cut puts the cutters away before this finishes
    animate(0.09, (k) => shears.setOpen(1 - k), () => animate(0.15, (k) => shears.setOpen(k)));
    // a copy of the stem (with its root and potato) is pulled up; the original hides
    stem.updateMatrixWorld(true);
    const lifted = stem.clone(true);
    lifted.material = stem.material.clone();
    lifted.material.emissive.setHex(0x000000);
    lifted.material.transparent = true;
    stem.matrixWorld.decompose(lifted.position, lifted.quaternion, lifted.scale);
    layer.add(lifted);
    const tuber = lifted.getObjectByName('potato');
    const r = cutLeaf(state, potId);
    save();
    const harvested = r.harvested;
    if (harvested) {
      // the plant is gone from the pot; keep its geometry alive until the animation ends
      const plant = v.plant;
      v.plant = null;
      plant.group.removeFromParent();
      setTimeout(() => plant.dispose(), 3000);
      clearTool();
    }
    sync(potId);
    pendingNotice += r.amount;
    burst(KIND.CRUMB, v.soilWorld, 12, COL.soil, 0.22);
    sfx.plop();
    // 1) pull up: the stem rises out of the soil, the potato dangles from its root
    const from = lifted.position.clone();
    const up = 0.2;
    const sway = (Math.random() < 0.5 ? -1 : 1) * 0.25;
    const baseRot = lifted.rotation.z;
    animate(
      0.5,
      (k) => {
        lifted.position.y = from.y + up * (1 - (1 - k) * (1 - k));
        lifted.rotation.z = baseRot + Math.sin(k * Math.PI * 2) * sway * (1 - k);
      },
      () => {
        // 2) the potato comes off the root and goes into the bag (+1)
        tuber.updateMatrixWorld(true);
        const start = tuber.getWorldPosition(new THREE.Vector3());
        const flying = new THREE.Mesh(tuber.geometry, tuber.material);
        tuber.getWorldQuaternion(flying.quaternion);
        tuber.getWorldScale(flying.scale);
        flying.position.copy(start);
        layer.add(flying);
        tuber.visible = false;
        const s0 = flying.scale.x;
        const toBag = camera.position.clone().add(tmp.set(0.25, 0.14, -0.4).applyQuaternion(camera.quaternion));
        animate(
          0.45,
          (k) => {
            flying.position.lerpVectors(start, toBag, ease(k));
            flying.scale.setScalar(s0 * (1 - k * 0.6));
            flying.rotation.y += 0.2;
          },
          () => {
            flying.removeFromParent();
            sfx.reward();
            ui.bag.textContent = String(countOf(state.inventory, 'potato'));
            ui.bag.parentElement.classList.remove('is-pop');
            void ui.bag.offsetWidth;
            ui.bag.parentElement.classList.add('is-pop');
            busy = false;
            setStep(harvested ? 'harvested' : 'harvest');
          },
        );
        // 3) the empty stem falls away (Moon gravity) and fades
        const vel = new THREE.Vector3(stem.userData.tip.x, 0, stem.userData.tip.z).normalize().multiplyScalar(0.16);
        vel.y = 0.08;
        const spin = (Math.random() - 0.5) * 3;
        animate(
          1.2,
          (k, dt) => {
            vel.y -= PLAYER.GRAVITY * dt;
            lifted.position.addScaledVector(vel, dt);
            lifted.rotation.z += spin * dt;
            lifted.material.opacity = 1 - ease(Math.max(0, (k - 0.4) / 0.6));
          },
          () => {
            lifted.removeFromParent();
            lifted.material.dispose();
          },
        );
      },
    );
  }

  // ------------------------------------------------------------ input
  function onPointerDown(e) {
    if (!open || closing || e.target !== el) return;
    e.stopPropagation(); // keep the drag-to-look fallback from turning the camera
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.down = true;
    pointer.inPanel = false;
    if (busy) return;
    if (step === 'cover' && !tool) startClump();
    if (tool === 'cutters') snip();
  }
  function onPointerMove(e) {
    if (!open) return;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.inPanel = Boolean(e.target.closest?.('.farm-panel, .farm-bag'));
  }
  function onPointerUp(e) {
    if (!open) return;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.down = false;
    if (tool === 'seed') dropSeed();
    else if (tool === 'clump') {
      // a quick flick that ends over the seed still counts
      if (pointOnPlane(v.soilWorld.y + 0.035, hit) && flatDist(hit, v.soilWorld) < 0.06) {
        toolObj.position.copy(hit);
        depositClump();
      } else returnClump();
    }
  }
  function onKey(e) {
    if (!open || closing || e.repeat) return;
    if (e.code === 'KeyE') {
      e.preventDefault();
      close('done');
    } else if (e.code === 'Escape') {
      close('esc');
    }
  }
  el.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('keydown', onKey);
  ui.seed.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    startSeedDrag(e);
  });
  ui.can.addEventListener('click', takeCan);
  ui.cutters.addEventListener('click', takeCutters);
  ui.again.addEventListener('click', () => {
    setStep('plant');
    moveToStep('plant');
  });
  ui.done.addEventListener('click', () => close('done'));
  ui.panel.addEventListener('pointerdown', (e) => e.stopPropagation());

  // ------------------------------------------------------------ open / close
  function stepForPot() {
    const pot = state.pots[potId];
    if (pot.stage === STAGE.EMPTY) return canPlant(state, potId) ? 'plant' : 'empty';
    if (pot.stage === STAGE.SEEDED) return 'cover';
    if (pot.stage === STAGE.COVERED) return 'water';
    if (pot.stage === STAGE.READY) return 'harvest';
    return 'watered';
  }

  function openView(id) {
    if (open) return;
    open = true;
    closing = false;
    busy = false;
    potId = id;
    v = pots[id];
    saved.pos.copy(camera.position);
    saved.quat.copy(camera.quaternion);
    hooks.onEnter();
    sfx.unlock();
    el.hidden = false;
    layer.visible = true;
    pendingNotice = 0;
    const s = stepForPot();
    setStep(s);
    moveToStep(s === 'empty' ? 'plant' : s);
  }

  function close(reason = 'done') {
    if (!open || closing) return;
    closing = true;
    if (tool === 'seed' && toolObj) toolObj.removeFromParent(); // nothing was used
    clearTool();
    v.dig = false;
    sync(potId);
    save();
    el.hidden = true;
    moveCamera(saved.pos, tmp.copy(saved.pos).add(new THREE.Vector3(0, 0, -1).applyQuaternion(saved.quat)), 0.3, () => {
      camera.position.copy(saved.pos);
      camera.quaternion.copy(saved.quat);
      open = false;
      closing = false;
      layer.visible = false;
      for (let i = 0; i < MAX_PARTICLES; i++) P.kind[i] = KIND.DEAD;
      anims.length = 0;
      potId = null;
      v = null;
      hooks.onExit(reason);
      if (pendingNotice) {
        feedback.notify(`+${potatoes(pendingNotice)}`, {
          long: `Harvested ${potatoes(pendingNotice)}. Plant one again as a seed potato, and press F to eat the others.`,
        });
        pendingNotice = 0;
      }
    });
  }

  // ------------------------------------------------------------ per frame
  function updateParticles(dt) {
    const g = PLAYER.GRAVITY; // water falls in Moon gravity, even inside the greenhouse
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const kind = P.kind[i];
      if (kind === KIND.DEAD) continue;
      const j = i * 3;
      P.vel[j + 1] -= g * dt;
      P.pos[j] += P.vel[j] * dt;
      P.pos[j + 1] += P.vel[j + 1] * dt;
      P.pos[j + 2] += P.vel[j + 2] * dt;
      P.life[i] += dt;
      let dead = P.life[i] > (kind === KIND.WATER ? 3 : 0.7);
      if (!dead && v && P.vel[j + 1] < 0) {
        const d = Math.hypot(P.pos[j] - v.soilWorld.x, P.pos[j + 2] - v.soilWorld.z);
        if (P.pos[j + 1] <= v.soilWorld.y && d <= POT.soilRadius) {
          dead = true;
          if (kind === KIND.WATER) {
            onWaterHit();
            if (Math.random() < 0.5) {
              tmp.set(P.pos[j], v.soilWorld.y, P.pos[j + 2]);
              burst(KIND.SPLASH, tmp, 1, COL.water, 0.12, 0.003);
            }
          }
        } else if (d > POT.soilRadius && P.pos[j + 1] <= v.baseWorldY + (d <= POT.radius * 1.06 ? POT.height : 0)) {
          dead = true; // hit the pot rim or the stand
        }
      }
      if (dead) P.kind[i] = KIND.DEAD;
      pDummy.position.set(P.pos[j], P.pos[j + 1], P.pos[j + 2]);
      pDummy.scale.setScalar(dead ? 0 : P.size[i]);
      pDummy.updateMatrix();
      pMesh.setMatrixAt(i, pDummy.matrix);
    }
    pMesh.instanceMatrix.needsUpdate = true;
  }

  let clock = 0;
  function update(frameDt) {
    if (!open) return;
    const dt = Math.min(frameDt, 0.05);
    clock += dt;
    if (cam.t < 1) {
      cam.t = Math.min(1, cam.t + dt / cam.dur);
      const k = ease(cam.t);
      camera.position.lerpVectors(cam.fromPos, cam.toPos, k);
      camera.quaternion.slerpQuaternions(cam.fromQuat, cam.toQuat, k);
      if (cam.t >= 1 && cam.after) {
        const f = cam.after;
        cam.after = null;
        f();
        return;
      }
    }
    for (let i = anims.length - 1; i >= 0; i--) {
      const a = anims[i];
      a.t += dt;
      const k = Math.min(1, a.t / a.dur);
      a.fn(k, dt);
      if (k >= 1) {
        anims.splice(i, 1);
        a.done?.();
      }
    }
    if (!v) return;
    if (tool === 'seed' && toolObj) {
      followSeed(0.5);
      toolObj.rotation.y += dt * 1.5;
    }
    if (tool === 'clump' && toolObj) moveClump();
    if (tool === 'can' && can) updateCan(dt);
    if (tool === 'cutters' && cutters) updateCutters();
    // gentle pulse on what to use next
    if (step === 'cover' && !tool && !busy && v.pile.visible) {
      const pulse = 1 + Math.sin(clock * 5) * 0.06;
      v.pile.scale.copy(v.pile.userData.base).multiplyScalar(Math.max(0.15, 1 - coverFraction(state.pots[potId]) * 0.85) * pulse);
    }
    if (targetRing.visible) targetRing.scale.setScalar(1 + Math.sin(clock * 6) * 0.08);
    updateParticles(dt);
  }

  return {
    get isOpen() {
      return open;
    },
    open: openView,
    close,
    update,
  };
}
