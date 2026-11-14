// main.js — boot + game loop. Game rules live in systems/, the 3D world in world/,
// the player in player/, and DOM in ui/. This file wires them together.
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/700.css';
import './ui/ui.css';
import './ui/hud.css';

import * as THREE from 'three';
import { UI, RECOVERY, TIME, POWER, ASSISTANT } from './config/gameplay.js';
import { createWorld, QUALITY } from './world/World.js';
import { createPostFX } from './world/postfx.js';
import { LAYOUT } from './world/layout.js';
import { createDayCycle, stepDayCycle, getSun, getClock } from './systems/daycycle.js';
import { createGauges, stepGauges, applyRecovery } from './systems/gauges.js';
import { loadSettings, saveSettings } from './systems/save.js';
import { createInput } from './player/input.js';
import { createPlayerController } from './player/controller.js';
import { findInteractable } from './player/interact.js';
import { createFeedback, wait } from './ui/feedback.js';
import { createMenus } from './ui/menus.js';
import { createHud } from './ui/hud.js';
import { createFpsMeter } from './ui/fpsMeter.js';
import { createPda } from './ui/pda.js';
import { createCallouts } from './ui/callouts.js';
import { createElectrolysisState, checkAfford } from './systems/electrolysis.js';
import { createAssistant } from './systems/assistant.js';
import { createVolt, createTourMarker } from './world/volt.js';
import { createVoltBubble } from './ui/voltBubble.js';
import { heightAt } from './world/heightfield.js';
import { createMastery } from './systems/mastery.js';
import { createInstanceManager } from './instances/InstanceManager.js';
import { createElectrolysisInstance } from './instances/electrolysis/index.js';

// ---------------------------------------------------------------- setup
let quality = loadSettings().quality === 'low' ? 'low' : 'high';

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, QUALITY[quality].pixelRatioCap));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
// AgX keeps bright lights from clipping to flat white (the old interiors blew out).
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
// Shader info logs (e.g. harmless ANGLE/D3D compiler warnings) only matter while developing.
renderer.debug.checkShaderErrors = import.meta.env.DEV;
renderer.shadowMap.type = THREE.PCFShadowMap;
app.appendChild(renderer.domElement);

const world = createWorld({ quality, renderer });
const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.05, 3000);
// High quality: N8AO + bloom through pmndrs postprocessing. Low: plain render.
const postfx = createPostFX(renderer, world.scene, camera);
postfx.setEnabled(quality === 'high');
function renderFrame(dt = 0) {
  postfx.setZone(player?.zoneId ?? 'habitat');
  if (postfx.enabled) postfx.render(dt);
  else renderer.render(world.scene, camera);
}
const input = createInput();
const player = createPlayerController(camera, document.body, world, input);
const day = createDayCycle();

const uiRoot = document.createElement('div');
uiRoot.className = 'ui-root';
document.body.appendChild(uiRoot);
const hud = createHud(uiRoot);
hud.setVisible(false);
const feedback = createFeedback(uiRoot);
const pda = createPda(uiRoot);
const callouts = createCallouts(uiRoot);
const gauges = createGauges();
const station = createElectrolysisState(); // the electrolysis unit's own water tank
const mastery = createMastery({ load: loadSettings, save: saveSettings });

// ---------------------------------------------------------------- Volt, the helper robot
const assistant = createAssistant({ store: { load: loadSettings, save: saveSettings } });
const volt = createVolt(world);
const tourMarker = createTourMarker();
world.scene.add(volt.object, tourMarker.object);
const voltBubble = createVoltBubble(uiRoot);
// Volt is an interactable that moves: "Press E to talk to Volt"
const voltTarget = { id: 'volt', zone: 'habitat', x: 0, z: 0, prompt: 'Press E to talk to Volt', action: { type: 'volt' } };
world.interactables.push(voltTarget);
const voltHead = new THREE.Vector3();

const two = (n) => String(n).padStart(2, '0');
feedback.setClock(() => {
  const c = getClock(day);
  return 'Day ' + c.day + ' ' + two(c.hour) + ':' + two(c.minute);
});
let lastHudState = null; // latest gauge snapshot (used by the PDA)

// ---------------------------------------------------------------- game state
// 'start' → 'playing' ⇄ 'paused';  'busy' while a door/wake-up fade runs; 'pda' while the
// PDA is open (world paused); 'instance' while a mini-game overlay is open (world paused).
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
    feedback.notify('Hold the mouse button and drag to look', {
      long: 'Mouse lock is not available in this browser, so hold the mouse button and drag to look around.',
      seconds: 5,
    });
  }
}
function enterPlay() {
  hud.setVisible(true);
  menus.showStart(false);
  menus.showPause(false);
  feedback.setCrosshairVisible(true);
  if (mode === 'start') {
    hud.showLocation('habitat');
    // Volt runs the first-day tour (it points at the gauge rings in step 2), or says hello.
    volt.hopTo(player);
    assistant.startIfNeeded();
  }
  mode = pausedFromBusy ? 'busy' : 'playing';
  pausedFromBusy = false;
}
function togglePda() {
  if (mode === 'pda') {
    pda.close();
    mode = 'playing';
    feedback.setCrosshairVisible(true);
  } else if (mode === 'playing' && lastHudState) {
    assistant.notify('pda-opened');
    pda.open(lastHudState, feedback.log);
    mode = 'pda';
    input.clear();
    feedback.setCrosshairVisible(false);
  }
}
function enterPause() {
  // Opening an instance releases the mouse, which fires 'unlock' — that is not a pause.
  if (mode === 'instance') return;
  if (mode === 'pda') {
    pda.close();
    mode = 'playing';
  }
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
    postfx.setEnabled(q === 'high');
  },
  volt: {
    getChattiness: () => assistant.chattiness,
    setChattiness: (level) => assistant.setChattiness(level),
    tourActive: () => assistant.tourActive,
    skipTour: () => assistant.skipTour(),
    replayTour: () => assistant.replayTour(),
  },
});
document.addEventListener('pointerlockerror', onLockFailed);

// ---------------------------------------------------------------- Volt: speaking + world state
/** Show one of Volt's lines: bubble in the world, face mood, full text in the PDA log. */
function sayLine(line) {
  if (!line) return;
  voltBubble.say(line);
  volt.model.setMood(line.mood ?? 'happy');
  const c = getClock(day);
  feedback.log.unshift({ time: 'Day ' + c.day + ' ' + two(c.hour) + ':' + two(c.minute), text: 'Volt: ' + (line.long ?? line.text) });
  if (feedback.log.length > 14) feedback.log.length = 14;
  if (line.action === 'show-gauges') {
    // tour step 2: point at each ring (shown again even if seen before), then move on
    callouts.add('oxygen', hud.rings.oxygen, 'Oxygen: drops faster outside!', 'above', { force: true });
    callouts.add('food', hud.rings.food, 'Food: lasts longer when you rest inside', 'above', { force: true });
    callouts.add('power', hud.powerEl, 'Base power: charges in sunlight', 'below', { force: true });
    callouts.whenIdle(() => assistant.notify('gauges-shown'));
  }
}

/** A game event: Volt says it if it wants to, otherwise show the plain caption. */
function voltEvent(id, short, long, tone = 'normal') {
  if (!assistant.notify(id)) feedback.notify(short, { long, tone });
}

/** Plain facts about the game right now, for Volt's brain (pure data). */
function voltSnapshot(moved = 0) {
  const zoneId = player.zoneId;
  const A = LAYOUT.SOLAR_ARRAY;
  return {
    mode,
    zoneId,
    moved,
    nearArray: zoneId === 'outside' && Math.hypot(player.position.x - A.x, player.position.z - A.z) < ASSISTANT.NEAR_ARRAY_M,
    oxygen: gauges.oxygen,
    food: gauges.food,
    power: (gauges.batteryKwh / POWER.BATTERY_CAPACITY_KWH) * 100,
    tankKg: station.tankKg,
  };
}

/** Where the tour marker goes for a tour target, from the player's current zone. */
function tourTargetPosition(target, zoneId) {
  const find = (id) => world.interactables.find((i) => i.id === id);
  const at = (it) => it && { zone: it.zone, x: it.x, z: it.z, y: it.zone === 'outside' ? heightAt(it.x, it.z) : world.zones[it.zone].floorY };
  const A = LAYOUT.SOLAR_ARRAY;
  if (!target) return null;
  if (target === 'electrolysis') return at(find('electrolysis'));
  if (zoneId === 'habitat') return at(find('hab-inner-door')); // everything else is outside first
  if (zoneId === 'greenhouse') return target === 'greenhouse' ? null : at(find('gh-inner-door'));
  if (target === 'array') return { zone: 'outside', x: A.x + 3, z: A.z - 3, y: heightAt(A.x + 3, A.z - 3) };
  if (target === 'greenhouse') return at(find('gh-outer-door'));
  return null; // 'airlock' while already outside
}

player.controls.addEventListener('lock', enterPlay);
player.controls.addEventListener('unlock', enterPause);
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && player.dragLook) enterPause(); // pointer-lock mode gets Esc via 'unlock'
});
feedback.setCrosshairVisible(false);

// ---------------------------------------------------------------- instances (mini-games)
const instances = createInstanceManager(uiRoot, {
  onOpen() {
    mode = 'instance';
    input.clear();
    feedback.setPrompt(null);
    feedback.setCrosshairVisible(false);
    if (document.pointerLockElement) document.exitPointerLock(); // free the mouse for clicking
  },
  onClose(id, result) {
    if (result.completed) {
      advanceGameHours(result.gameHours);
      const c = getClock(day);
      const text =
        `Made ${result.o2Kg.toFixed(2)} kg of oxygen by electrolysis. Used ${result.waterKg.toFixed(2)} kg of water ` +
        `and ${result.kwh.toFixed(1)} kWh of power. ${result.gameHours.toFixed(1)} hours passed while it ran.`;
      feedback.log.unshift({ time: 'Day ' + c.day + ' ' + two(c.hour) + ':' + two(c.minute), text });
      // Volt's tour step 4 completes here; otherwise show the usual caption
      if (!assistant.notify('oxygen-made')) feedback.notify('Oxygen made!', { long: text, seconds: 3.5 });
    } else if (assistant.tourStep?.id === 'oxygen' && checkAfford(gauges, station, 'small').reason === 'full') {
      assistant.notify('oxygen-made'); // supply already full (e.g. tour replayed late): don't get stuck
    }
    // Back to the 3D world. Re-locking the mouse needs a click; the "Back to base" button is
    // one. If the browser refuses (e.g. closed with Esc), show the pause menu to click on.
    mode = 'paused';
    requestLock();
    setTimeout(() => {
      if (mode === 'paused' && !document.pointerLockElement && !player.dragLook) menus.showPause(true);
    }, 600);
  },
});

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
  hud.showLocation(zoneId); // location name fades in for ~2 s — no sentence on screen
  const c = getClock(day);
  feedback.log.unshift({
    time: 'Day ' + c.day + ' ' + two(c.hour) + ':' + two(c.minute),
    text:
      zoneId === 'outside'
        ? 'Went outside. Your suit is full, but working out here uses the oxygen supply about 2× faster.'
        : 'Entered the ' + world.zones[zoneId].name + '. You breathe slower in here, so the oxygen supply lasts longer.',
  });
  volt.hopTo(player); // Volt came through the door with you
  assistant.notify('zone:' + zoneId);
}

function useStation(action) {
  if (action.station === 'electrolysis') {
    instances.open('electrolysis', createElectrolysisInstance, { gauges, station, mastery });
    return;
  }
  // a few words on screen; the full text goes to the PDA log
  const short = action.caption ?? action.toast.split('!')[0];
  feedback.notify(short, { long: action.toast, seconds: 3.5 });
}

/**
 * Let time pass on the base while the player is busy (resting, running a machine).
 * Simulated in 1-second steps of the sped-up clock: the Sun moves, gauges drain,
 * the battery charges or drains. (The panel is assumed to face the Sun.)
 */
function advanceGameHours(hours) {
  const seconds = (hours * 3600) / TIME.SCALE;
  for (let t = 0; t < seconds; t += 1) {
    const step = Math.min(1, seconds - t);
    stepDayCycle(day, step);
    const s = getSun(day);
    stepGauges(gauges, step, { pressurized: true, sunVisibility: s.visibility, alignment: 1 });
  }
}

// ---------------------------------------------------------------- gentle failure
// Oxygen or food at 0 → fade out → wake up resting in the habitat. No death screen.
// It still costs something: time passes (food keeps draining, the Sun moves, the base
// uses power) and the gauges are only partly restored.
async function gentleFailure(reason) {
  mode = 'busy';
  player.frozen = true;
  feedback.setPrompt(null);
  await feedback.fadeTo(true, RECOVERY.FADE_SECONDS);

  advanceGameHours(RECOVERY.REST_GAME_HOURS);
  applyRecovery(gauges, { oxygen: RECOVERY.OXYGEN_RESTORE_PERCENT, food: RECOVERY.FOOD_RESTORE_PERCENT });
  const s = LAYOUT.HABITAT.spawn;
  player.placeAt('habitat', LAYOUT.HABITAT.x + s.x, LAYOUT.HABITAT.z + s.z, s.yawDeg);
  volt.hopTo(player);

  const why =
    reason === 'oxygen'
      ? 'The oxygen supply ran too low, so you rested in the habitat while the base opened its emergency oxygen reserve.'
      : 'You got too hungry and tired, so you rested in the habitat and ate from the emergency food box.';
  const tip =
    reason === 'oxygen'
      ? 'Tip: working outside in a spacesuit is hard work — you use oxygen about 2 times faster out there.'
      : 'Tip: an astronaut eats about 0.8 kg of food every day (not counting the water in it).';
  feedback.showFadeCard(`
    <h2>Phew — you are safe!</h2>
    <p>${why}</p>
    <p class="small">You rested for ${RECOVERY.REST_GAME_HOURS} hours. Time passed: you used food and oxygen, and the base kept using power.</p>
    <p class="small">${tip}</p>`);
  await wait(5200);
  feedback.showFadeCard('');
  await feedback.fadeTo(false, RECOVERY.FADE_SECONDS);
  player.frozen = false;
  if (mode === 'busy') mode = 'playing';
  else pausedFromBusy = false;
  feedback.notify('Rested ' + RECOVERY.REST_GAME_HOURS + ' hours', {
    long: why + ' You lost ' + RECOVERY.REST_GAME_HOURS + ' hours resting. ' + tip,
  });
  assistant.notify('recovered'); // the tour (if running) simply carries on from its step
}

const MEDAL_ICON = { bronze: ' 🥉', silver: ' 🥈', gold: ' 🥇' };
function promptFor(target) {
  if (target.action.station !== 'electrolysis') return target.prompt;
  return target.prompt + (MEDAL_ICON[mastery.get('electrolysis').level] ?? '');
}

const notVolt = (it) => it.id !== 'volt';
/** Volt only counts when you look right at him (stations and doors always win). */
function lookingAtVolt() {
  if (volt.zoneId !== player.zoneId) return false;
  const dx = volt.position.x - player.position.x;
  const dz = volt.position.z - player.position.z;
  const d = Math.hypot(dx, dz);
  const f = player.forward2d();
  const fl = Math.hypot(f.x, f.z) || 1;
  return d < ASSISTANT.TALK_REACH_M && (dx * f.x + dz * f.z) / (d * fl) > Math.cos((ASSISTANT.TALK_AIM_DEG * Math.PI) / 180);
}

function handleInteraction() {
  const target =
    findInteractable(world.interactables.filter(notVolt), player.zoneId, player.position.x, player.position.z, player.forward2d()) ??
    (lookingAtVolt() ? voltTarget : null);
  feedback.setPrompt(target ? promptFor(target) : null);
  if (input.consumeInteract() && target) {
    if (target.action.type === 'door') useDoor(target.action);
    else if (target.action.type === 'station') useStation(target.action);
    else if (target.action.type === 'volt') sayLine(assistant.talk(voltSnapshot()));
  }
}

// ---------------------------------------------------------------- gauge reactions
let wasPowered = true;
let sunWasUp = true;
function reactToGauges(report, sun) {
  const c = report.crossedLow;
  // the rings themselves turn amber/red; these add a short line and a log entry
  // Volt says these (with the fix); if Volt stays quiet about one, the plain caption shows.
  if (c.oxygen) {
    const outside = player.zoneId === 'outside';
    voltEvent(
      outside ? 'oxygen-low-outside' : 'oxygen-low',
      'Oxygen supply low',
      outside
        ? 'Oxygen supply low! Working outside uses it up about 2× faster — head back inside.'
        : 'Oxygen supply low! Make more at the Electrolysis unit in the habitat work bay.',
      'low',
    );
  }
  if (c.food) voltEvent('food-low', 'Food low', 'Food is low! In a later update you will grow and cook your own food.', 'low');
  if (c.power) voltEvent('power-low', 'Base power low', 'Base power is low! The battery needs sunlight on the solar array.', 'low');
  if (wasPowered !== report.hasPower) {
    wasPowered = report.hasPower;
    world.greenhouse.setPowered(report.hasPower);
    if (!report.hasPower) {
      voltEvent('power-out', 'Base power out', 'Base power ran out. The grow lights switch off until the Sun charges the battery.', 'critical');
    } else {
      voltEvent('power-back', 'Power restored', 'Power is back! The solar array is charging the base again.');
    }
  }
  const sunUp = sun.visibility > 0.5;
  if (sunUp !== sunWasUp) {
    sunWasUp = sunUp;
    voltEvent(
      sunUp ? 'sun-up' : 'sun-down',
      sunUp ? 'Sun is back' : 'Sun behind the ridge',
      sunUp
        ? 'The Sun is back above the ridge. The solar array is making power again.'
        : 'The Sun went behind the ridge. The base runs on its battery until it comes back.',
    );
  }
  // the electrolysis water tank (nothing refills it yet)
  const tankLow = station.tankKg < ASSISTANT.TANK_LOW_KG;
  if (tankLow && !tankWasLow) voltEvent('tank-low', 'Water tank low', 'The Electrolysis water tank is getting low.', 'low');
  tankWasLow = tankLow;
}
let tankWasLow = false;

// ---------------------------------------------------------------- adaptive quality
// AO is the most expensive effect. If frames average > ~17.5 ms for a few seconds on High,
// switch AO off (bloom stays) so slower laptops keep a smooth frame rate.
let frameEma = 1 / 60;
let watchTime = 0;
function watchFrameTime(frameDt) {
  if (!postfx.enabled || !postfx.aoAllowed || frameDt <= 0 || document.hidden) return;
  watchTime += frameDt;
  frameEma += (frameDt - frameEma) * 0.03;
  if (watchTime > 4 && frameEma > 0.0175) postfx.disableAO();
}

// ---------------------------------------------------------------- loop
const timer = new THREE.Timer();
timer.connect(document);
let lastPX = player.position.x; // for "how far did the player walk" (tour step 1)
let lastPZ = player.position.z;
const fpsMeter = createFpsMeter(renderer);

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
      feedback.notify('Too far — head back to base', { long: 'That is far enough for now — the base is behind you!' });
    }
  } else {
    input.consumeInteract();
  }
  if (input.consumeTab()) togglePda();

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
  if (mode === 'playing' && (report.oxygenEmpty || report.foodEmpty)) {
    gentleFailure(report.oxygenEmpty ? 'oxygen' : 'food');
  }

  // ---- Volt: roll after the player, think, talk, show the tour marker
  if (running) volt.update(dt, player, { talking: voltBubble.isShowing, waiting: mode === 'playing' && lookingAtVolt() });
  const moved = mode === 'playing' ? Math.hypot(player.position.x - lastPX, player.position.z - lastPZ) : 0;
  lastPX = player.position.x;
  lastPZ = player.position.z;
  voltTarget.zone = volt.zoneId ?? zoneId;
  voltTarget.x = volt.position.x;
  voltTarget.z = volt.position.z;
  sayLine(assistant.step(frameDt, voltSnapshot(moved)));
  tourMarker.setTarget(assistant.tourActive ? tourTargetPosition(assistant.tourStep?.target, zoneId) : null);
  tourMarker.update(frameDt, zoneId);
  voltBubble.update(frameDt, camera, volt.headPosition(voltHead), mode === 'playing');
  // the Sun is off indoors, so skip re-rendering its shadow map there
  const outdoors = zoneId === 'outside';
  if (outdoors && !renderer.shadowMap.autoUpdate) renderer.shadowMap.needsUpdate = true;
  renderer.shadowMap.autoUpdate = outdoors;
  lastHudState = {
    gauges,
    report,
    sun,
    zone: zoneId === 'outside' ? { id: 'outside' } : { id: zoneId, name: world.zones[zoneId].name },
    clock: getClock(day),
    station,
  };
  hud.update(lastHudState);

  renderFrame(frameDt);
  fpsMeter.tick();
  watchFrameTime(frameDt);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  postfx.setSize(window.innerWidth, window.innerHeight);
});

if (import.meta.env.DEV) {
  // Dev-only helpers for screenshots and render-cost benchmarks (work even when the
  // tab is hidden and the animation loop is paused). Not included in production builds.
  const gl = renderer.getContext();
  const frameAt = (zone, x, z, yawDeg, pitch = 0, frames = 3) => {
    player.placeAt(zone, x, z, yawDeg);
    camera.rotation.x = pitch;
    const sun = getSun(day);
    for (let i = 0; i < frames; i++) {
      world.update(0.016, camera, player.position, sun, 0, zone);
      renderer.shadowMap.needsUpdate = zone === 'outside'; // like the real loop
      renderFrame(0.016);
    }
  };
  window.__dev = {
    shot(zone, x, z, yawDeg, pitch = 0) {
      frameAt(zone, x, z, yawDeg, pitch, 4);
      return zone;
    },
    bench(zone, x, z, yawDeg, pitch = 0, n = 60) {
      frameAt(zone, x, z, yawDeg, pitch, 5);
      gl.finish();
      const t0 = performance.now();
      for (let i = 0; i < n; i++) frameAt(zone, x, z, yawDeg, pitch, 1);
      gl.finish();
      const ms = (performance.now() - t0) / n;
      return { zone, ms: +ms.toFixed(2), calls: renderer.info.render.calls };
    },
    views: {
      habitat: ['habitat', 4.6, 0.3, 270, -0.05],
      outside: ['outside', 6, 12, 215, 0.02],
      greenhouse: ['greenhouse', 1.4, 30, 90, -0.08],
    },
  };
  window.__game = { renderer, world, player, day, camera, gauges, gentleFailure, postfx, get mode() { return mode; }, set mode(m) { mode = m; }, input, useDoor, station, mastery, instances, assistant, volt, voltBubble };
}
