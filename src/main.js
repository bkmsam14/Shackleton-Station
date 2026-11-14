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
import { createDayCycle, stepDayCycle, getSun } from './systems/daycycle.js';
import { loadSettings, saveSettings } from './systems/save.js';
import { createInput } from './player/input.js';
import { createPlayerController } from './player/controller.js';
import { findInteractable } from './player/interact.js';
import { createFeedback, wait } from './ui/feedback.js';
import { createMenus } from './ui/menus.js';

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
const feedback = createFeedback(uiRoot);

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
  world.update(dt, camera, player.position, sun, (day.gameSeconds / 86400) * Math.PI * 2, player.zoneId);
  renderer.render(world.scene, camera);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

if (import.meta.env.DEV) {
  window.__game = { renderer, world, player, day, camera, get mode() { return mode; }, set mode(m) { mode = m; }, input, useDoor };
}
