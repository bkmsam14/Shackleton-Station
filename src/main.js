// main.js — boot + game loop. Game rules live in systems/, the 3D world in world/,
// the player in player/, and DOM in ui/. This file wires them together.
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/700.css';
import './ui/ui.css';

import * as THREE from 'three';
import { UI } from './config/gameplay.js';
import { createWorld, QUALITY } from './world/World.js';
import { LAYOUT } from './world/layout.js';
import { createDayCycle, stepDayCycle, getSun, getClock } from './systems/daycycle.js';
import { createGauges, stepGauges } from './systems/gauges.js';
import { loadSettings, saveSettings } from './systems/save.js';
import { createInput } from './player/input.js';
import { createPlayerController } from './player/controller.js';
import { findInteractable } from './player/interact.js';
import { createFeedback, wait } from './ui/feedback.js';
import { createMenus } from './ui/menus.js';
import { createHud } from './ui/hud.js';

// ---------------------------------------------------------------- setup
let quality = loadSettings().quality === 'low' ? 'low' : 'high';

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, QUALITY[quality].pixelRatioCap));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
app.appendChild(renderer.domElement);

const world = createWorld({ quality });
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 3000);
const input = createInput();
const player = createPlayerController(camera, document.body, world, input);
const day = createDayCycle();

const uiRoot = document.createElement('div');
uiRoot.className = 'ui-root';
document.body.appendChild(uiRoot);
const hud = createHud(uiRoot);
hud.setVisible(false);
const feedback = createFeedback(uiRoot);
const gauges = createGauges();

// ---------------------------------------------------------------- game state
// 'start' → 'playing' ⇄ 'paused';  'busy' while a door/wake-up fade runs.
let mode = 'start';
let pausedFromBusy = false;

function spawnInHabitat() {
  const s = LAYOUT.HABITAT.spawn;
  player.placeAt('habitat', LAYOUT.HABITAT.x + s.x, LAYOUT.HABITAT.z + s.z, s.yawDeg);
}
spawnInHabitat();

// Pointer lock can be refused (embedded browsers, some school setups). After one failed
// try we fall back to "drag the mouse to look" so the game is always playable.
let lockFailures = 0;
let lockAttemptPending = false;
function onLockFailed() {
  if (!lockAttemptPending) return; // the promise and the 'pointerlockerror' event both fire
  lockAttemptPending = false;
  lockFailures++;
  if (lockFailures >= 2 || !document.body.requestPointerLock) startDragMode();
  else menus.hint('Click once more to start.');
}
function requestLock() {
  if (player.dragLook) {
    startDragMode();
    return;
  }
  lockAttemptPending = true;
  try {
    const p = document.body.requestPointerLock?.();
    if (p && typeof p.catch === 'function') p.catch(onLockFailed);
    else if (!document.body.requestPointerLock) onLockFailed();
  } catch {
    onLockFailed();
  }
}
function startDragMode() {
  const first = !player.dragLook;
  player.dragLook = true;
  enterPlay();
  if (first) {
    feedback.toast('Mouse lock is not available here. <strong>Hold the mouse button and drag</strong> to look around.', {
      icon: '🖱️',
      seconds: 7,
      key: 'drag',
    });
  }
}
function enterPlay() {
  hud.setVisible(true);
  menus.showStart(false);
  menus.showPause(false);
  feedback.setCrosshairVisible(true);
  if (mode === 'start') {
    feedback.toast('<strong>Welcome to Shackleton Station!</strong> Walk to the orange hatch and press <strong>E</strong> to go outside.', {
      icon: '👩‍🚀',
      seconds: 6,
    });
  }
  mode = pausedFromBusy ? 'busy' : 'playing';
  pausedFromBusy = false;
}
function enterPause() {
  if (mode === 'playing' || mode === 'busy') {
    pausedFromBusy = mode === 'busy';
    mode = 'paused';
    input.clear();
    feedback.setCrosshairVisible(false);
    menus.showPause(true);
  }
}

const menus = createMenus(uiRoot, {
  onStart: requestLock,
  onResume: requestLock,
  getQuality: () => quality,
  onQuality(q) {
    quality = q;
    saveSettings({ quality: q });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, QUALITY[q].pixelRatioCap));
    renderer.setSize(window.innerWidth, window.innerHeight);
    world.setQuality(q);
  },
});
document.addEventListener('pointerlockerror', onLockFailed);

player.controls.addEventListener('lock', enterPlay);
player.controls.addEventListener('unlock', enterPause);
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && player.dragLook) enterPause(); // pointer-lock mode gets Esc via 'unlock'
});
feedback.setCrosshairVisible(false);

// ---------------------------------------------------------------- interactions
let edgeToastAt = -99;
let elapsed = 0;

async function useDoor(action) {
  mode = 'busy';
  player.frozen = true;
  feedback.setPrompt(null);
  await feedback.fadeTo(true, UI.DOOR_FADE_SECONDS);
  feedback.showFadeCard('<p class="fade-status">Cycling the airlock…</p>');
  await wait(650);
  player.placeAt(action.to, action.arrive.x, action.arrive.z, action.arrive.yawDeg);
  feedback.showFadeCard('');
  await feedback.fadeTo(false, UI.DOOR_FADE_SECONDS);
  player.frozen = false;
  if (mode === 'busy') mode = 'playing';
  else pausedFromBusy = false;
  onZoneEntered(action.to);
}

function onZoneEntered(zoneId) {
  if (zoneId === 'outside') {
    feedback.toast('<strong>You are outside.</strong> Your suit tank is your only oxygen now — keep an eye on it!', {
      kind: 'warn',
      icon: '🧑‍🚀',
      key: 'zone',
    });
  } else {
    const name = world.zones[zoneId].name;
    feedback.toast(`<strong>${name}</strong> — pressurized. You can breathe the air in here.`, {
      kind: 'good',
      icon: '🏠',
      key: 'zone',
    });
  }
}

function useStation(action) {
  feedback.toast(action.toast, { icon: '🚧', kind: 'info', key: action.station, seconds: 5 });
}

function handleInteraction() {
  const target = findInteractable(
    world.interactables,
    player.zoneId,
    player.position.x,
    player.position.z,
    player.forward2d(),
  );
  feedback.setPrompt(target ? target.prompt : null);
  if (input.consumeInteract() && target) {
    if (target.action.type === 'door') useDoor(target.action);
    else if (target.action.type === 'station') useStation(target.action);
  }
}

// ---------------------------------------------------------------- gauge reactions
let wasPowered = true;
let sunWasUp = true;
function reactToGauges(report, sun) {
  const c = report.crossedLow;
  if (c.oxygen) {
    feedback.toast(
      player.zoneId === 'outside'
        ? '<strong>Oxygen low!</strong> Head back inside the habitat or greenhouse to refill.'
        : '<strong>Oxygen low!</strong> The air system needs base power to refill your tank.',
      { kind: 'warn', icon: '⚠️', key: 'o2low', seconds: 6 },
    );
  }
  if (c.food) {
    feedback.toast('<strong>Food is low!</strong> In a later update you will grow and cook your own food.', {
      kind: 'warn',
      icon: '⚠️',
      key: 'foodlow',
      seconds: 6,
    });
  }
  if (c.power) {
    feedback.toast('<strong>Base power is low!</strong> The battery needs sunlight on the solar array.', {
      kind: 'warn',
      icon: '🔋',
      key: 'powerlow',
      seconds: 6,
    });
  }
  if (wasPowered !== report.hasPower) {
    wasPowered = report.hasPower;
    world.greenhouse.setPowered(report.hasPower);
    if (!report.hasPower) {
      feedback.toast('<strong>Base power ran out.</strong> Grow lights and the air system switch off until the Sun charges the battery.', {
        kind: 'warn',
        icon: '🔌',
        key: 'power',
        seconds: 7,
      });
    } else {
      feedback.toast('<strong>Power is back!</strong> The solar array is charging the base again.', { kind: 'good', icon: '⚡', key: 'power' });
    }
  }
  const sunUp = sun.visibility > 0.5;
  if (sunUp !== sunWasUp) {
    sunWasUp = sunUp;
    feedback.toast(
      sunUp
        ? '<strong>The Sun is back</strong> above the ridge. The solar array is making power again.'
        : '<strong>The Sun went behind the ridge.</strong> The base runs on its battery until it comes back.',
      { kind: sunUp ? 'good' : 'info', icon: sunUp ? '☀️' : '🌑', key: 'sun', seconds: 6 },
    );
  }
}

// ---------------------------------------------------------------- loop
const timer = new THREE.Timer();
timer.connect(document);

renderer.setAnimationLoop(() => {
  timer.update();
  const frameDt = Math.min(timer.getDelta(), 0.1);
  const running = mode === 'playing' || mode === 'busy';
  const dt = running ? frameDt : 0;
  elapsed += dt;

  if (running) {
    stepDayCycle(day, dt);
    player.update(dt);
  }
  if (mode === 'playing') {
    handleInteraction();
    if (player.hitMapEdge && elapsed - edgeToastAt > 6) {
      edgeToastAt = elapsed;
      feedback.toast('That is far enough for now — the base is behind you!', { icon: '🧭', key: 'edge' });
    }
  } else {
    input.consumeInteract();
  }

  const sun = getSun(day);
  const alignment = world.update(dt, camera, player.position, sun, (day.gameSeconds / 86400) * Math.PI * 2, player.zoneId);

  // ---- survival gauges (pure logic) + reactions
  const zoneId = player.zoneId;
  const report = stepGauges(gauges, dt, {
    pressurized: zoneId !== 'outside',
    sunVisibility: sun.visibility,
    alignment,
  });
  if (running) reactToGauges(report, sun);
  hud.update({
    gauges,
    report,
    sun,
    zone: zoneId === 'outside' ? { id: 'outside' } : { id: zoneId, name: world.zones[zoneId].name },
    clock: getClock(day),
  });

  renderer.render(world.scene, camera);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

if (import.meta.env.DEV) {
  window.__game = { renderer, world, player, day, camera, gauges, get mode() { return mode; }, set mode(m) { mode = m; }, input, useDoor };
}
