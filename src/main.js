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
import { UI, RECOVERY, TIME, POWER, ASSISTANT, RADIATION, SKY, AIRLOCK } from './config/gameplay.js';
import { createWorld, QUALITY } from './world/World.js';
import { createPostFX } from './world/postfx.js';
import { LAYOUT } from './world/layout.js';
import { createDayCycle, stepDayCycle, getSun, getClock, setLiveSky } from './systems/daycycle.js';
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
import { createVolt } from './world/volt.js';
import { createWalkable } from './world/walkable.js';
import { createGuide } from './world/guide.js';
import { createVoltBubble } from './ui/voltBubble.js';
import { createVoltVoice } from './ui/voltVoice.js';
import { heightAt } from './world/heightfield.js';
import { createMastery } from './systems/mastery.js';
import { createInstanceManager } from './instances/InstanceManager.js';
import { createElectrolysisInstance } from './instances/electrolysis/index.js';
import { sfx } from './ui/sfx.js';
import { createWaterWallsInstance } from './instances/waterWalls/index.js';
import { createStormReportInstance } from './instances/stormReport/index.js';
import { createRadiationState, stepRadiation, hoursToArrival, exposureLevel, expectedStormDose } from './systems/radiation.js';
import { createStormFx } from './ui/stormFx.js';
import { loadSun, SUN_MODES } from './data/spaceWeather.js';
import { createFarming } from './farming/index.js';
import { createSupply } from './supply/index.js';
import { createHelmetLamp } from './world/iceSite.js';
import { createIceDrillInstance } from './instances/iceDrill/index.js';
import { createIceOvenInstance } from './instances/iceOven/index.js';
import { createIceState, stepOven, spillBag, spotReady, coldTrapLoadKw, DIG_SPOTS } from './systems/iceMining.js';
import { loadStars } from './data/stars.js';
import { TARGETS } from './data/constellations.js';
import { createTelescopeInstance } from './instances/telescope/index.js';
import { createAirlockRoom } from './world/airlockRoom.js';
import { createAmbience } from './ui/ambience.js';
import { createAirlockCycle, stepAirlock, payCycle } from './systems/airlock.js';
import { setVolume, getVolume } from './ui/sfx.js';
import { createTraining } from './training/index.js';
import { drillStorm } from './training/script.js';
import { createTrainingReportInstance } from './instances/trainingReport/index.js';
import { PAD } from './supply/landingPad.js';

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
  // during an airlock cycle we only draw the little airlock room (its own scene)
  if (airlockRun) {
    renderer.render(airlockRoom.scene, camera);
    return;
  }
  postfx.setZone(player?.zoneId ?? 'habitat');
  if (postfx.enabled) postfx.render(dt);
  else renderer.render(world.scene, camera);
}
const input = createInput();
// ---------------------------------------------------------------- airlock + sounds
// Doors marked via: 'airlock' run a real-looking cycle (systems/airlock.js) in a small room
// (world/airlockRoom.js). The sounds follow the air pressure: SOUND NEEDS AIR (ui/ambience.js).
const airlockRoom = createAirlockRoom(renderer);
const ambience = createAmbience();
let airlockRun = null; // { cycle, resolve }
setVolume(loadSettings().sfxVolume ?? 0.8);
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

// ---------------------------------------------------------------- ice mining
// Bag of icy soil + Ice Oven + dig spots (systems/iceMining.js), saved like other settings.
const ice = createIceState(loadSettings().ice ?? {});
const saveIce = () => saveSettings({ ice: { bagKg: ice.bagKg, oven: ice.oven, spots: ice.spots } });
const helmetLamp = createHelmetLamp(world.scene, camera); // lights the dark cold-trap floor
let wasInColdTrap = false;
let iceSaveIn = 5;
// Greenhouse grow lights (switch by the greenhouse door). OFF saves 2 kW, so the battery lasts
// the long night — but the potatoes stop growing. A real trade-off (gameplay.js POWER).
let growLightsOn = loadSettings().growLights !== false;
world.greenhouse.setPowered(growLightsOn);
world.greenhouse.setSwitch(growLightsOn);
// ---------------------------------------------------------------- real stars + Star Album
// The sky shows the real Yale Bright Star Catalog (NASA HEASARC). Constellations you find with
// the telescope go in the album (saved) and get faint lines + names in the sky outside.
const starAlbum = new Set(Array.isArray(loadSettings().starAlbum) ? loadSettings().starAlbum : []);
let starNamesOn = loadSettings().starNames !== false;
let starCatalog = null;
function figureFor(target, catalog) {
  if (target.cloud) return { id: target.id, name: target.name, segments: [], centre: { ra: target.cloud.ra, dec: target.cloud.dec } };
  const segments = [];
  const pts = [];
  for (const path of target.paths) {
    const stars = path.map((hr) => catalog.byHr.get(hr)).filter(Boolean);
    pts.push(...stars);
    for (let i = 1; i < stars.length; i++) segments.push([stars[i - 1], stars[i]]);
  }
  // label above the figure's brightest star
  const top = pts.reduce((a, b) => (b.mag < a.mag ? b : a), pts[0]);
  return { id: target.id, name: target.name, segments, centre: { ra: top.ra, dec: top.dec } };
}
const starsReady = loadStars().then((catalog) => {
  if (!catalog) return null;
  starCatalog = catalog;
  world.sky.setStars(catalog, renderer.getPixelRatio());
  world.sky.setStarCount(quality === 'high');
  world.sky.setLabels(starNamesOn);
  for (const t of TARGETS) if (starAlbum.has(t.id)) world.sky.addFigure(figureFor(t, catalog));
  return catalog;
});
const album = {
  has: (id) => starAlbum.has(id),
  add(id) {
    if (starAlbum.has(id)) return;
    starAlbum.add(id);
    saveSettings({ starAlbum: [...starAlbum] });
    const t = TARGETS.find((x) => x.id === id);
    if (t && starCatalog) world.sky.addFigure(figureFor(t, starCatalog));
  },
};

/** Is the player down on the dark floor of the cold-trap crater? */
const inColdTrap = () => player.zoneId === 'outside' && world.iceSite.inColdTrap(player.position.x, player.position.z);

// ---------------------------------------------------------------- space weather + radiation
// The Sun the player picked (real DONKI + RadLab replays, or live DONKI). Storms are put on
// the game clock; radiation.js runs warning → storm → calm and the per-storm dose.
let sunMode = SUN_MODES.includes(loadSettings().sun) ? loadSettings().sun : 'stormy';
let sun = null; // { mode, label, live, fellBack, schedule }
let radiation = createRadiationState([]);
let ringLinger = 0; // seconds the dose ring stays up after a storm
let pendingReport = null; // a finished storm waiting for its "What just happened?" card
let trainingOn = false; // Training Day running: no real-schedule storms (the drill replays one)
let drillSource = null; // { label, live } of the data the storm drill came from
const gameHourNow = () => (day.gameSeconds - TIME.START_HOUR * 3600) / 3600;
function useSun(loaded) {
  sun = loaded;
  // only storms that are still ahead (enough warning time left) are kept
  const now = gameHourNow();
  radiation = createRadiationState(trainingOn ? [] : loaded.schedule.filter((s) => s.warnGameHour > now));
}
function pickSun(mode) {
  sunMode = mode;
  saveSettings({ sun: mode });
  // LIVE: the Sun, Earth and stars follow the real date and time (ephemeris.js) — the sky over
  // the Moon's south pole right now. Works offline too (it is computed, not downloaded).
  setLiveSky(day, mode === 'live');
  world.solarArray.resetTracking(); // the Sun may now be somewhere else: face it straight away
  return loadSun(mode).then((loaded) => {
    if (loaded.mode === sunMode || loaded.fellBack) useSun(loaded);
    return loaded;
  });
}
const sunReady = pickSun(sunMode);

// ---------------------------------------------------------------- Volt, the helper robot
const assistant = createAssistant({ store: { load: loadSettings, save: saveSettings } });
// the walkable-area map: the guide trail and Volt both find their way on it
const walkable = createWalkable(world);
const volt = createVolt(world, walkable);
const guide = createGuide({
  walkable,
  groundAt: (zone, x, z) => (zone === 'outside' ? heightAt(x, z) : world.zones[zone].floorY),
});
world.scene.add(volt.object, guide.object);
const voltBubble = createVoltBubble(uiRoot, { onNext: () => nextTourStep() });
/** Training Day "Next" (button on Volt's bubble, or Enter): pass the current step. */
function nextTourStep() {
  if (mode !== 'playing' || !assistant.tourActive) return;
  if (assistant.nextStep()) {
    sfx.click();
    voltBubble.hide();
    voltVoice.stop();
  }
}
const stormFx = createStormFx(uiRoot);
const voltVoice = createVoltVoice({ store: { load: loadSettings, save: saveSettings } });
// Volt is an interactable that moves: "Press E to talk to Volt"
const voltTarget = { id: 'volt', zone: 'habitat', x: 0, z: 0, prompt: 'Press E to talk to Volt', action: { type: 'volt' } };
world.interactables.push(voltTarget);
const voltHead = new THREE.Vector3();

const two = (n) => String(n).padStart(2, '0');
feedback.setClock(() => {
  const c = getClock(day);
  return 'Day ' + c.day + ' ' + two(c.hour) + ':' + two(c.minute);
});
let earthHiddenSaid = false;
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
  // A mouse lock asked for as one screen closed (e.g. the harvest view) can arrive after the
  // next screen opened (e.g. the Training Day report): give the mouse straight back to it.
  if (instances.isOpen) {
    document.exitPointerLock?.();
    return;
  }
  hud.setVisible(true);
  menus.showStart(false);
  menus.showPause(false);
  feedback.setCrosshairVisible(true);
  if (mode === 'start') {
    hud.showLocation('habitat');
    // Volt runs the first-day tour (it points at the gauge rings in step 2), or says hello.
    volt.hopTo(player);
    voltVoice.prewarm(); // load Volt's robot voice engine in the background
    assistant.startIfNeeded({ day: getClock(day).day }); // Day 1 always starts with the Training Day
    sunReady.then(() => {
      assistant.notify(sun?.fellBack ? 'sun-stormy' : `sun-${sun?.mode ?? 'stormy'}`);
      const c = getClock(day);
      feedback.log.unshift({ time: 'Day ' + c.day + ' ' + two(c.hour) + ':' + two(c.minute), text: 'Space weather: ' + (sun?.label ?? '') + (sun?.fellBack ? ' (the data you picked could not be loaded)' : '') });
      if (import.meta.env.DEV) devStormShortcut();
    });
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
    voltVoice.stop();
    pda.open(lastHudState, feedback.log);
    mode = 'pda';
    input.clear();
    feedback.setCrosshairVisible(false);
  }
}
function enterPause() {
  // Opening an instance releases the mouse, which fires 'unlock' — that is not a pause.
  if (mode === 'instance') return;
  voltVoice.stop(); // time is stopped, so is Volt
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
  sun: { modes: SUN_MODES, get: () => sunMode, set: (m) => pickSun(m) },
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
    voiceSupported: voltVoice.supported,
    getVoice: () => voltVoice.enabled,
    setVoice: (on) => voltVoice.setEnabled(on),
  },
  sound: {
    get: () => getVolume(),
    set(v) {
      setVolume(v);
      saveSettings({ sfxVolume: v });
    },
  },
  starNames: {
    get: () => starNamesOn,
    set(on) {
      starNamesOn = on;
      saveSettings({ starNames: on });
      world.sky.setLabels(on);
    },
  },
});
document.addEventListener('pointerlockerror', onLockFailed);

// ---------------------------------------------------------------- Volt: speaking + world state
/** Show one of Volt's lines: bubble in the world, face mood, full text in the PDA log. */
function sayLine(line) {
  if (!line) return;
  voltBubble.say(line, {
    holdWhile: () => voltVoice.speaking,
    // a Training Day line stays readable (with its Next button) until the step is done
    stayWhile: line.tour ? () => assistant.tourStep?.id === line.id : null,
  });
  voltVoice.speak(line.text);
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
    storm: radiation.phase === 'calm' ? null : radiation.phase,
    inShelter: playerPlace() === 'shelter',
    bagKg: ice.bagKg,
    inColdTrap: inColdTrap(),
    wallsFilled: station.wallKg > 0.5,
  };
}

/** An interactable → what the guide points at: { zone, x, z, kind }. */
function guideRef(it, kind) {
  if (!it) return null;
  if (it.action?.type === 'door') kind = it.zone === 'outside' ? 'door-outside' : 'door';
  return { zone: it.zone, x: it.x, z: it.z, kind };
}
const findIt = (id) => world.interactables.find((i) => i.id === id);

/** A Training Day target (or 'shelter' / 'oven' for the storm and ice hints) → the machine it means. */
function trainingSpot(target) {
  const A = LAYOUT.SOLAR_ARRAY;
  switch (target) {
    case 'electrolysis':
      return guideRef(findIt('electrolysis'), 'electrolysis');
    case 'terminal':
      return guideRef(findIt('supply-terminal'), 'terminal');
    case 'oven':
      return guideRef(findIt('ice-oven'), 'oven');
    case 'water-walls':
      return guideRef(findIt('water-walls'), 'water-walls');
    case 'shelter': {
      const sp = world.habitat.shelterSpawn;
      return { zone: 'habitat', x: sp.x, z: sp.z, kind: 'shelter' };
    }
    case 'airlock':
      return guideRef(findIt('hab-outer-door'));
    case 'greenhouse':
      return guideRef(findIt('gh-inner-door'));
    case 'pots':
      return guideRef(world.interactables.find((i) => i.action?.type === 'farm'), 'pots');
    case 'array':
      return { zone: 'outside', x: A.x, z: A.z, kind: 'array' };
    case 'pad': {
      const crate = world.interactables.find((i) => i.action?.type === 'supply' && i.action.kind === 'crate');
      return crate ? guideRef(crate, 'crate') : { zone: 'outside', x: PAD.x, z: PAD.z, kind: 'pad' };
    }
    case 'ice':
      return guideRef(findIt(DIG_SPOTS.find((id) => spotReady(ice, id, gameHourNow())) ?? DIG_SPOTS[0]), 'ice');
    default:
      return null;
  }
}

/** What to point at from the player's zone: the machine itself, or the door toward its zone. */
function tourTargetPosition(target, zoneId) {
  const spot = trainingSpot(target);
  if (!spot) return null;
  if (target === 'airlock' && zoneId === 'outside') return null; // already out
  if (spot.zone === zoneId) return spot;
  if (zoneId === 'habitat') return guideRef(findIt('hab-inner-door'));
  if (zoneId === 'greenhouse') return guideRef(findIt('gh-inner-door'));
  if (spot.zone === 'habitat') return guideRef(findIt('hab-outer-door'));
  if (spot.zone === 'greenhouse') return guideRef(findIt('gh-outer-door'));
  return spot;
}

player.controls.addEventListener('lock', enterPlay);
player.controls.addEventListener('unlock', enterPause);
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && player.dragLook) enterPause(); // pointer-lock mode gets Esc via 'unlock'
  // E / Space fast-forward an airlock cycle once you have seen one
  if (airlockRun && (e.code === 'KeyE' || e.code === 'Space') && (loadSettings().airlockCycles ?? 0) >= 1) airlockRun.cycle.skipping = true;
});
feedback.setCrosshairVisible(false);

// ---------------------------------------------------------------- instances (mini-games)
const instances = createInstanceManager(uiRoot, {
  onOpen() {
    voltVoice.stop(); // the mini-game's Volt takes over
    mode = 'instance';
    input.clear();
    feedback.setPrompt(null);
    feedback.setCrosshairVisible(false);
    if (document.pointerLockElement) document.exitPointerLock(); // free the mouse for clicking
  },
  onClose(id, result) {
    if (id === 'electrolysis' && result.completed) {
      advanceGameHours(result.gameHours);
      const c = getClock(day);
      const text =
        `Made ${result.o2Kg.toFixed(2)} kg of oxygen by electrolysis. Used ${result.waterKg.toFixed(2)} kg of water ` +
        `and ${result.kwh.toFixed(1)} kWh of power. ${result.gameHours.toFixed(1)} hours passed while it ran.`;
      feedback.log.unshift({ time: 'Day ' + c.day + ' ' + two(c.hour) + ':' + two(c.minute), text });
      // Volt's tour step 4 completes here; otherwise show the usual caption
      if (!assistant.notify('oxygen-made')) feedback.notify('Oxygen made!', { long: text, seconds: 3.5 });
    } else if (id === 'electrolysis' && assistant.tourStep?.id === 'oxygen' && checkAfford(gauges, station, 'small').reason === 'full') {
      assistant.notify('oxygen-made'); // supply already full (e.g. tour replayed late): don't get stuck
    }
    if (id === 'ice-drill' && result.completed) {
      assistant.notify('ice-dug');
      saveIce();
      if (result.bestStreak > (loadSettings().iceBestStreak ?? 0)) saveSettings({ iceBestStreak: result.bestStreak });
      stormLog(`Drilled ${result.soilKg.toFixed(0)} kg of icy soil (about ${result.waterKg.toFixed(1)} kg of water in it). Bag: ${result.bagKg.toFixed(0)} kg — bake it in the Ice Oven.`);
    }
    if (id === 'telescope' && result.completed) {
      const t = TARGETS.find((x) => x.id === result.id);
      stormLog(`Telescope: found ${t?.name ?? result.id} (${result.stars} stars).${result.isNew ? ' New card in your Star Album!' : ''}`);
      if (result.isNew) voltEvent('star-found', 'New star card!', 'You found a new constellation. Look for its name in the sky outside.');
    }
    if (id === 'ice-oven' && result.completed) {
      assistant.notify('ice-oven-started');
      saveIce();
      stormLog(`Ice Oven started: ${result.soilKg.toFixed(0)} kg of icy soil, ${result.kwh.toFixed(1)} kWh of power, about ${result.waterKg.toFixed(1)} kg of water on the way to the tank.`);
    }
    if (id === 'storm-report') assistant.notify('storm-report-closed');
    // Back to the 3D world. Re-locking the mouse needs a click; the "Back to base" button is
    // one. If the browser refuses (e.g. closed with Esc), show the pause menu to click on.
    mode = 'paused';
    requestLock();
    setTimeout(() => {
      if (mode === 'paused' && !document.pointerLockElement && !player.dragLook) menus.showPause(true);
    }, 600);
  },
});

// ---------------------------------------------------------------- farming (potato pots)
// 'farm' mode: close-up pot view, mouse freed, world paused (like a lesson instance).
const farming = createFarming({
  world,
  camera,
  renderer,
  root: uiRoot,
  feedback,
  gauges,
  getMode: () => mode,
  onEvent: (id) => assistant.notify(id), // potato planted / watered / harvested / eaten
  hooks: {
    onEnter() {
      voltVoice.stop(); // the world is paused while you tend a pot
      mode = 'farm';
      input.clear();
      feedback.setPrompt(null);
      feedback.setCrosshairVisible(false);
      if (!player.dragLook) document.exitPointerLock?.();
    },
    onExit(reason) {
      mode = 'playing';
      input.clear();
      if (reason === 'esc') return enterPause();
      feedback.setCrosshairVisible(true);
      if (player.dragLook) return;
      requestLock();
      setTimeout(() => {
        if (mode === 'playing' && !player.controls.isLocked) enterPause();
      }, 600);
    },
  },
});
world.interactables.push(...farming.interactables);

// ---------------------------------------------------------------- supplies (terminal + cargo pad)
// 'supply' mode: terminal or crate screen open, mouse freed, world paused (orders keep moving).
const supply = createSupply({
  world,
  root: uiRoot,
  gauges,
  station,
  inventory: farming.state.inventory,
  saveInventory: farming.save,
  notify: voltEvent,
  instances, // the Solar Fix repair lesson opens like the Electrolysis one
  voice: voltVoice,
  onEvent: (id) => assistant.notify(id), // order sent / with a kit, kit collected
  hooks: {
    onEnter() {
      voltVoice.stop();
      mode = 'supply';
      input.clear();
      feedback.setPrompt(null);
      feedback.setCrosshairVisible(false);
      if (!player.dragLook) document.exitPointerLock?.();
    },
    onExit(reason) {
      mode = 'playing';
      input.clear();
      if (reason === 'esc') return enterPause();
      feedback.setCrosshairVisible(true);
      if (player.dragLook) return;
      requestLock();
      setTimeout(() => {
        if (mode === 'playing' && !player.controls.isLocked) enterPause();
      }, 600);
    },
  },
});

// ---------------------------------------------------------------- interactions
let edgeToastAt = -99;
let elapsed = 0;

/** Run one airlock cycle in the airlock room. Resolves when the far hatch is open. */
function runAirlockCycle(direction, moduleName) {
  return new Promise((resolve) => {
    airlockRoom.setup(direction, moduleName);
    camera.rotation.set(0, 0, 0, 'YXZ'); // face the hatch you are going to
    airlockRun = { cycle: createAirlockCycle(direction), resolve, t: 0 };
    ambience.airlockStart();
  });
}

async function useDoor(action) {
  voltVoice.stop();
  mode = 'busy';
  player.frozen = true;
  feedback.setPrompt(null);
  if (action.via === 'airlock') return useAirlock(action);
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

/** Door with an airlock: fade → cycle in the airlock room → fade → arrive. Costs a little air. */
async function useAirlock(action) {
  const goingOut = action.to === 'outside';
  const moduleId = goingOut ? player.zoneId : action.to;
  const moduleName = world.zones[moduleId]?.name ?? 'Habitat';
  await feedback.fadeTo(true, UI.DOOR_FADE_SECONDS);
  const cycleDone = runAirlockCycle(goingOut ? 'out' : 'in', moduleName);
  await feedback.fadeTo(false, UI.DOOR_FADE_SECONDS);
  await cycleDone;
  await wait(450);
  await feedback.fadeTo(true, UI.DOOR_FADE_SECONDS);
  airlockRun = null;
  ambience.airlockStop();
  player.placeAt(action.to, action.arrive.x, action.arrive.z, action.arrive.yawDeg);
  // never free: a little air leaves with the vented gas, and the cycle takes base time
  const cost = payCycle(gauges);
  advanceGameHours(cost.gameHours, goingOut ? moduleId === 'greenhouse' ? 'greenhouse' : 'habitat' : 'habitat');
  await feedback.fadeTo(false, UI.DOOR_FADE_SECONDS);
  player.frozen = false;
  if (mode === 'busy') mode = 'playing';
  else pausedFromBusy = false;
  const cycles = (loadSettings().airlockCycles ?? 0) + 1;
  saveSettings({ airlockCycles: cycles });
  stormLog(
    `Airlock cycle (${goingOut ? 'out' : 'in'}): most of the air was pumped back, a little was lost — ${AIRLOCK.O2_LOSS_KG} kg of oxygen. ${AIRLOCK.GAME_MINUTES} minutes passed.`,
  );
  onZoneEntered(action.to);
  if (cycles <= AIRLOCK.VOLT_LESSONS) voltEvent(goingOut ? 'airlock-quiet' : 'airlock-loud', goingOut ? 'Silence: sound needs air' : 'Sounds are back: air carries sound');
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
    instances.open('electrolysis', createElectrolysisInstance, { gauges, station, mastery, voice: voltVoice });
    return;
  }
  if (action.station === 'water-walls') {
    instances.open('water-walls', createWaterWallsInstance, { gauges, station, voice: voltVoice });
    return;
  }
  if (action.station === 'ice-drill') {
    instances.open('ice-drill', createIceDrillInstance, { ice, mastery, spotId: action.spotId, nowHour: gameHourNow(), bestStreak: loadSettings().iceBestStreak ?? 0, voice: voltVoice });
    return;
  }
  if (action.station === 'telescope') {
    const s = getSun(day);
    const open = (catalog) =>
      instances.open('telescope', createTelescopeInstance, {
        catalog,
        sky: { sunAz: s.azimuthDeg, sunAlt: s.elevationDeg, matrix: s.skyMatrix, earthAz: s.earth.az, earthAlt: s.earth.alt, live: s.live, dateMs: s.dateMs },
        album,
        mastery,
        voice: voltVoice,
      });
    if (starCatalog) open(starCatalog);
    else starsReady.then((c) => mode === 'playing' && open(c));
    return;
  }
  if (action.station === 'ice-oven') {
    instances.open('ice-oven', createIceOvenInstance, { ice, gauges, station, voice: voltVoice });
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
function advanceGameHours(hours, place = 'habitat') {
  const seconds = (hours * 3600) / TIME.SCALE;
  const events = [];
  for (let t = 0; t < seconds; t += 1) {
    const step = Math.min(1, seconds - t);
    stepDayCycle(day, step);
    const s = getSun(day);
    stepGauges(gauges, step, { pressurized: true, sunVisibility: s.visibility, alignment: 1, growLightsOn });
    stepIceOven((step * TIME.SCALE) / 3600);
    events.push(...stepRadiation(radiation, gameHourNow(), (step * TIME.SCALE) / 3600, { place, wallKg: station.wallKg }));
  }
  // a storm that hit while you were busy still shows its card afterwards (no gentle failure)
  for (const e of events) if (e.type !== 'limit') handleRadiationEvent(e, { quiet: true });
}

/** The Ice Oven keeps baking while you play (game hours); water drips into the tank. */
function stepIceOven(dtGameHours) {
  if (!ice.oven) return;
  if (gauges.batteryKwh <= 0.01) return; // blackout: the oven's heater stops until power is back
  const r = stepOven(ice, station, dtGameHours);
  if (r.finished) {
    saveIce();
    voltEvent('ice-water-done', 'Ice Oven done — water in the tank', 'The Ice Oven finished: the water from your icy soil is in the Electrolysis tank.');
    stormLog(`Ice Oven finished. Electrolysis tank: ${station.tankKg.toFixed(1)} kg of water.`);
  }
}

/** Where the marker goes while you carry icy soil: the Ice Oven (through the airlock). */
function ovenMarkerTarget(zoneId) {
  return tourTargetPosition('oven', zoneId);
}

// ---------------------------------------------------------------- gentle failure
// Oxygen or food at 0 → fade out → wake up resting in the habitat. No death screen.
// It still costs something: time passes (food keeps draining, the Sun moves, the base
// uses power) and the gauges are only partly restored.
async function gentleFailure(reason) {
  voltVoice.stop();
  mode = 'busy';
  player.frozen = true;
  feedback.setPrompt(null);
  await feedback.fadeTo(true, RECOVERY.FADE_SECONDS);

  const radiationRest = reason === 'radiation';
  // carrying icy soil? some spills on the way back (the rest stays in the bag)
  const spilledKg = ice.bagKg > 0 ? spillBag(ice) : 0;
  if (spilledKg > 0) saveIce();
  advanceGameHours(RECOVERY.REST_GAME_HOURS, radiationRest ? 'shelter' : 'habitat');
  if (!radiationRest) applyRecovery(gauges, { oxygen: RECOVERY.OXYGEN_RESTORE_PERCENT, food: RECOVERY.FOOD_RESTORE_PERCENT });
  if (radiationRest) {
    const sp = world.habitat.shelterSpawn;
    player.placeAt('habitat', sp.x, sp.z, sp.yawDeg);
  } else {
    const s = LAYOUT.HABITAT.spawn;
    player.placeAt('habitat', LAYOUT.HABITAT.x + s.x, LAYOUT.HABITAT.z + s.z, s.yawDeg);
  }
  volt.hopTo(player);

  const why = {
    oxygen: 'The oxygen supply ran too low, so you rested in the habitat while the base opened its emergency oxygen reserve.',
    food: 'You got too hungry and tired, so you rested in the habitat and ate from the emergency food box.',
    radiation: 'The storm dose got too high, so Volt helped you into the storm shelter to rest until the particles passed.',
  }[reason];
  const tip = {
    oxygen: 'Tip: working outside in a spacesuit is hard work — you use oxygen about 2 times faster out there.',
    food: 'Tip: an astronaut eats about 0.8 kg of food every day (not counting the water in it).',
    radiation: 'Tip: run to the shelter as soon as a flare is seen — and water in the walls blocks even more particles.',
  }[reason];
  feedback.showFadeCard(`
    <h2>Phew — you are safe!</h2>
    <p>${why}</p>
    <p class="small">You rested for ${RECOVERY.REST_GAME_HOURS} hours. Time passed: you used food and oxygen, and the base kept using power.${radiationRest ? ' The radiation dose you got stays on your record (dose adds up — it does not heal).' : ''}</p>
    ${spilledKg > 0 ? `<p class="small">Some icy soil spilled on the way: you lost ${spilledKg.toFixed(0)} kg and kept ${ice.bagKg.toFixed(0)} kg in your bag.</p>` : ''}
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

/** The grow-lights switch: OFF saves power for the night, but plants stop growing. */
function toggleGrowLights() {
  growLightsOn = !growLightsOn;
  saveSettings({ growLights: growLightsOn });
  world.greenhouse.setPowered(wasPowered && growLightsOn);
  world.greenhouse.setSwitch(growLightsOn);
  sfx.click();
  const kw = POWER.GREENHOUSE_LED_LOAD_KW;
  if (growLightsOn) {
    feedback.notify('Grow lights ON', { long: `Grow lights on: the potatoes grow again. The lights use ${kw} kW of base power.` });
  } else {
    feedback.notify(`Grow lights OFF · saves ${kw} kW`, {
      long: `Grow lights off: the base saves ${kw} kW, so the battery lasts longer through the night. But plants need light, so the potatoes stop growing until you switch them back on.`,
    });
  }
}

function handleInteraction() {
  let target = findInteractable(world.interactables.filter(notVolt), player.zoneId, player.position.x, player.position.z, player.forward2d());
  // a pot stand → the pot you are facing (or nothing, if you look away)
  if (target?.action.type === 'farm') target = farming.refine(target, player.position.x, player.position.z, player.forward2d());
  target = supply.refine(target); // a damaged solar array offers "Repair" instead of info
  target ??= lookingAtVolt() ? voltTarget : null;
  feedback.setPrompt(target ? promptFor(target) : null);
  if (input.consumeInteract() && target) {
    if (target.action.type === 'door') useDoor(target.action);
    else if (target.action.type === 'station') useStation(target.action);
    else if (target.action.type === 'volt') {
      const line = assistant.talk(voltSnapshot());
      sayLine(line);
      training.onLine(line); // talking to Volt during a step can fire its scripted event too
    }
    else if (target.action.type === 'farm') farming.interact(target.action.potId);
    else if (target.action.type === 'supply') supply.interact(target);
    else if (target.action.type === 'lights') toggleGrowLights();
  }
}

// ---------------------------------------------------------------- particle storms
/** Where the player is, for radiation: outside | greenhouse | habitat | shelter. */
function playerPlace() {
  const z = player.zoneId;
  if (z !== 'habitat') return z;
  const r = world.habitat.shelterRect;
  const { x, z: pz } = player.position;
  return x >= r.minX && x <= r.maxX && pz >= r.minZ && pz <= r.maxZ ? 'shelter' : 'habitat';
}

/** Marker toward the shelter from wherever the player is. */
function shelterMarkerTarget(zoneId) {
  return tourTargetPosition('shelter', zoneId);
}

function stormLog(text) {
  const c = getClock(day);
  feedback.log.unshift({ time: 'Day ' + c.day + ' ' + two(c.hour) + ':' + two(c.minute), text });
  if (feedback.log.length > 14) feedback.log.length = 14;
}

const flareName = (storm) => (storm.flare?.classType ? `${storm.flare.classType} flare` : 'solar eruption');
const flareDate = (storm) => (storm.flare?.peak ? new Date(storm.flare.peak).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '');

/** React to radiation.js events. opts.quiet: it happened during a time skip. */
function handleRadiationEvent(e, { quiet = false } = {}) {
  const where = sun?.live ? 'Live' : 'Replay of real data';
  if (e.type === 'warning') {
    if (!quiet) {
      // a strong storm is too much for the bare shelter (GAME BALANCE): ask for water in the walls too
      const strong = expectedStormDose(e.storm, 'shelter', station.wallKg) >= 100;
      if (strong) voltEvent('storm-warning-strong', 'Big storm coming — shelter + water walls!', null, 'critical');
      else voltEvent('storm-warning', 'Particle storm coming — go to the shelter!', null, 'critical');
      sfx.alarm();
    }
    stormLog(`${where}: based on NASA DONKI, a ${flareName(e.storm)} (${flareDate(e.storm)}) — fast particles on the way. Go to the storm shelter.`);
  } else if (e.type === 'storm-start') {
    if (!quiet) voltEvent(playerPlace() === 'shelter' ? 'storm-sheltered' : 'storm-exposed', 'Particle storm!', null, 'critical');
  } else if (e.type === 'limit') {
    if (mode === 'playing') gentleFailure('radiation');
  } else if (e.type === 'storm-end') {
    ringLinger = RADIATION.RING_LINGER_S;
    stormLog(`Storm over (${flareName(e.storm)}). Storm dose ${Math.round(e.summary.dose)}% of the safe limit; mission total ${Math.round(radiation.missionDose)}%.`);
    pendingReport = { storm: e.storm, summary: e.summary };
    assistant.notify('storm-over');
  }
}

function showStormReport() {
  const r = pendingReport;
  pendingReport = null;
  const src = r.storm?.drill && drillSource ? drillSource : { label: sun?.label ?? '', live: Boolean(sun?.live) };
  instances.open('storm-report', createStormReportInstance, { ...r, sunLabel: src.label, live: src.live, voice: voltVoice });
}

/** HUD state for the dose ring + storm chip. */
function radiationHud() {
  const phase = radiation.phase;
  const inShelter = playerPlace() === 'shelter';
  let chip = '';
  let chipMode = '';
  if (phase === 'warning') {
    const secs = Math.ceil(((hoursToArrival(radiation, gameHourNow()) ?? 0) * 3600) / (TIME.SCALE * training.pace()));
    chip = inShelter ? `Particles in ${secs} s — you’re in the shelter` : `Particles in ${secs} s → storm shelter`;
    chipMode = inShelter ? 'safe' : 'warning';
  } else if (phase === 'storm') {
    chip = inShelter ? 'Storm! Stay in the shelter' : 'Storm! Get to the shelter';
    chipMode = inShelter ? 'safe' : 'storm';
  }
  return {
    phase,
    chip,
    chipMode,
    showRing: phase !== 'calm' || ringLinger > 0,
    // warning: a new storm starts at 0; storm: live dose; calm: the last storm's result (while lingering)
    dosePct: phase === 'storm' ? radiation.stormDose : phase === 'warning' ? 0 : (radiation.history.at(-1)?.dose ?? 0),
    missionDose: radiation.missionDose,
    wallKg: station.wallKg,
    next: radiation.schedule[radiation.index] ?? null,
    nowHour: gameHourNow(),
  };
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
  if (c.food) voltEvent('food-low', 'Food low', 'Food is low! Press F to eat a potato, or grow more in the greenhouse pots.', 'low');
  if (c.power) voltEvent('power-low', 'Base power low', 'Base power is low! The battery needs sunlight on the solar array.', 'low');
  if (wasPowered !== report.hasPower) {
    wasPowered = report.hasPower;
    world.greenhouse.setPowered(report.hasPower && growLightsOn);
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

// ---------------------------------------------------------------- Training Day (Day 1, guided by Volt)
// The script (data/trainingDay.js) runs as Volt's tour. Here: what its scripted events do.
let trainingReportDue = false;
async function startStormDrill() {
  let storms = sun?.schedule ?? [];
  let source = { label: sun?.label ?? '', live: Boolean(sun?.live) };
  if (!storms.length) {
    // the Sun you picked has no storms (e.g. Calm): the drill replays one from the Stormy data
    const stormy = await loadSun('stormy');
    storms = stormy.schedule;
    source = { label: stormy.label, live: false };
  }
  const drill = drillStorm(storms, gameHourNow());
  if (!drill) return feedback.notify('No storm data for the drill');
  drillSource = source;
  radiation = createRadiationState([drill]);
}
const training = createTraining({
  root: uiRoot,
  assistant,
  actions: {
    micrometeorite: () => supply.forceSolarHit(),
    'rush-delivery': () => supply.rushDeliveries(),
    'storm-drill': () => startStormDrill(),
    ripen: () => farming.ripenAll(),
    start() {
      trainingOn = true;
      if (radiation.phase === 'calm') radiation = createRadiationState([]); // real storms wait until training is over
    },
    end(how) {
      trainingOn = false;
      if (sun && radiation.phase === 'calm') useSun(sun); // the real storms ahead come back
      if (how === 'done') trainingReportDue = true;
    },
  },
});

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
  // Base clock (gauges, Sun, oven, plants, storms) - slower on the Training Day.
  // Walking, Volt and animations always use real time (dt).
  const pace = training.pace();
  const simDt = dt * pace;
  elapsed += dt;

  if (running) {
    stepDayCycle(day, simDt);
    player.update(dt);
  }
  // ---- airlock cycle: step it, pin the camera inside the airlock room, play the air sounds
  if (airlockRun) {
    const run = airlockRun;
    const events = stepAirlock(run.cycle, dt);
    run.t += dt;
    for (const e of events) {
      if (e === 'hatch-close') ambience.clunk(run.cycle.pressure);
      else if (e === 'equal') ambience.chime();
      else if (e === 'hatch-open') ambience.clunk(run.cycle.pressure);
      else if (e === 'done') run.resolve();
    }
    ambience.airlockUpdate(run.cycle.pressure, run.cycle.phase);
    airlockRoom.update(dt, run.cycle, events);
    camera.position.copy(airlockRoom.eye);
    camera.position.y += airlockRoom.shakeOffset(run.t);
  }
  ambience.update(player.zoneId, mode === 'playing' || mode === 'busy');
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
  if (input.consumeNext()) nextTourStep();

  const sun = getSun(day);
  const alignment = world.update(dt, camera, player.position, sun, (day.gameSeconds / 86400) * Math.PI * 2, player.zoneId);

  // ---- survival gauges (pure logic) + reactions
  const zoneId = player.zoneId;
  // ---- ice mining: cold trap (helmet lamp + suit heaters on base power), dig spots, oven
  const coldTrap = inColdTrap();
  helmetLamp.set(coldTrap);
  helmetLamp.update(frameDt);
  if (coldTrap && !wasInColdTrap && mode === 'playing') voltEvent('ice-coldtrap', 'Cold trap: no sunlight, ever', 'This crater floor never sees the Sun. Your helmet lamp is on, and your suit heaters use base power while you are down here.');
  wasInColdTrap = coldTrap;
  const nowHour = gameHourNow();
  for (const id of DIG_SPOTS) world.iceSite.setSpotReady(id, spotReady(ice, id, nowHour));
  world.iceSite.update(frameDt);
  if (running) stepIceOven((simDt * TIME.SCALE) / 3600);
  world.iceOven.update(frameDt, Boolean(ice.oven));
  if (ice.oven && running && (iceSaveIn -= frameDt) <= 0) {
    iceSaveIn = 5;
    saveIce(); // keep the oven's progress if the tab is closed
  }

  const report = stepGauges(gauges, simDt, {
    pressurized: zoneId !== 'outside',
    sunVisibility: sun.visibility,
    alignment: alignment * supply.solarOutputFactor, // 1 when healthy; less after a micrometeorite hit
    extraLoadKw: coldTrapLoadKw(coldTrap), // suit heaters + lamp, recharged by the base
    growLightsOn,
  });
  if (running) reactToGauges(report, sun);
  // live sky: Earth really dips below the horizon here for part of each month (libration)
  if (running && sun.live && !earthHiddenSaid && sun.earth.alt < 0 && zoneId === 'outside') {
    earthHiddenSaid = true;
    voltEvent('earth-hidden', 'Earth is below the horizon right now', 'Right now Earth is below the horizon at the south pole. It bobs up and down every month (libration), so radio links need it above the horizon — or a relay satellite.');
  }
  farming.update(frameDt, simDt, { lit: report.hasPower && growLightsOn });
  supply.update(frameDt, dt, zoneId, { pace, training: training.active });
  if (mode === 'playing' && (report.oxygenEmpty || report.foodEmpty)) {
    gentleFailure(report.oxygenEmpty ? 'oxygen' : 'food');
  }

  // ---- Volt: roll after the player, think, talk, show the tour marker
  const standingStill = Math.hypot(player.position.x - lastPX, player.position.z - lastPZ) < 0.002;
  if (running) {
    volt.update(dt, player, {
      talking: voltBubble.isTalking, // words left up afterwards: he goes back to leading
      waiting: mode === 'playing' && standingStill && lookingAtVolt(),
      speaking: voltVoice.speaking,
      lead: guide.path, // the trail to the next spot (last frame's), so Volt shows the way
    });
  }
  const moved = mode === 'playing' ? Math.hypot(player.position.x - lastPX, player.position.z - lastPZ) : 0;
  lastPX = player.position.x;
  lastPZ = player.position.z;
  voltTarget.zone = volt.zoneId ?? zoneId;
  voltTarget.x = volt.position.x;
  voltTarget.z = volt.position.z;
  const voltLine = assistant.step(frameDt, voltSnapshot(moved));
  sayLine(voltLine);
  training.onLine(voltLine); // a Training Day step fires its scripted event as Volt says it
  training.update(frameDt, { mode });
  // ---- particle storms
  if (running) {
    for (const e of stepRadiation(radiation, gameHourNow(), (simDt * TIME.SCALE) / 3600, { place: playerPlace(), wallKg: station.wallKg })) handleRadiationEvent(e);
  }
  if (mode === 'playing' && pendingReport && !instances.isOpen) showStormReport();
  else if (mode === 'playing' && trainingReportDue && !instances.isOpen) {
    trainingReportDue = false;
    instances.open('training-report', createTrainingReportInstance, { voice: voltVoice });
  }
  ringLinger = Math.max(0, ringLinger - frameDt);
  // camera "snow" + dosimeter ticks follow the live dose rate (quiet in the shelter)
  stormFx.update(frameDt, running ? exposureLevel(radiation, playerPlace(), station.wallKg) : 0);
  world.habitat.waterWall.setWaterLevel(station.wallKg / RADIATION.WALL_CAPACITY_KG);
  const stormMarker = radiation.phase !== 'calm' && playerPlace() !== 'shelter' ? shelterMarkerTarget(zoneId) : null;
  const carryMarker = ice.bagKg > 0 && !ice.oven && !coldTrap ? ovenMarkerTarget(zoneId) : null;
  guide.setTarget(stormMarker ?? (assistant.tourActive ? tourTargetPosition(assistant.tourStep?.target, zoneId) : carryMarker));
  guide.update(frameDt, player);
  voltBubble.update(frameDt, camera, volt.headPosition(voltHead), mode === 'playing' && !instances.isOpen);
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
    radiation: radiationHud(),
    sun,
    ice,
    album: [...starAlbum],
    carry:ice.bagKg > 0 ? `Icy soil ${Math.round(ice.bagKg)} kg → Ice Oven` : ice.oven ? 'Ice Oven baking…' : '',
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

/**
 * DEV ONLY (npm run dev, never in the published game): jump the clock to just before a storm
 * so you can test it without waiting.
 *   ?storm      → the next storm      ?storm=3 → storm #3 (the big X5.8 one in Stormy Sun)
 *   Key J       → jump to 15 s before the next storm's warning
 */
function devStormShortcut() {
  const jumpTo = (storm) => {
    if (!storm) {
      feedback.notify('No more storms in this data');
      return;
    }
    const leadHours = (15 * TIME.SCALE) / 3600; // 15 real seconds before the warning
    day.gameSeconds = TIME.START_HOUR * 3600 + (storm.warnGameHour - leadHours) * 3600;
    feedback.notify(`DEV: storm ${storm.id.replace('storm-', '#')} (${storm.flare?.classType ?? '?'}) warns in 15 s`);
  };
  const param = new URLSearchParams(location.search).get('storm');
  if (param !== null) {
    const n = Number(param);
    const pick = n >= 1 ? radiation.schedule.find((s) => s.id === `storm-${n}`) : radiation.schedule[radiation.index];
    if (pick) {
      // keep the chosen storm (and later ones) as "next"
      radiation.index = radiation.schedule.indexOf(pick);
      jumpTo(pick);
    } else jumpTo(null);
  }
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyJ' && mode === 'playing' && radiation.phase === 'calm') jumpTo(radiation.schedule[radiation.index]);
  });
}

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
  window.__game = { renderer, world, player, day, camera, gauges, gentleFailure, postfx, get mode() { return mode; }, set mode(m) { mode = m; }, input, useDoor, station, mastery, instances, assistant, volt, guide, walkable, voltBubble, voltVoice, get radiation() { return radiation; }, get sun() { return sun; }, playerPlace, sunReady, ice, helmetLamp, get airlockRun() { return airlockRun; }, farming, get growLightsOn() { return growLightsOn; } };
}
