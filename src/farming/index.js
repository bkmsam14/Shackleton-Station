// farming/index.js — optional potato-growing minigame in the greenhouse.
// Adds two small pot stands (2 pots each) in the gap between the grow-rack runs, their
// interactables, growth over time, save/load, and the close-up planting view.
// Game rules: farmState.js (pure). Models: farmModels.js. Close-up view: farmView.js.
import * as THREE from 'three';
import { LAYOUT } from '../world/layout.js';
import { createSign } from '../world/signs.js';
import { loadSettings, saveSettings } from '../systems/save.js';
import { createFarmState, serializeFarm, stepGrowth, growthStage, coverFraction, waterFraction, STAGE } from './farmState.js';
import { createStand, createPot, createPotatoPlant, POT, STAND, SOIL_DRY, SOIL_WET } from './farmModels.js';
import { createFarmView } from './farmView.js';
import { createInventoryPanel } from './inventoryPanel.js';
import './farm.css';

const G = LAYOUT.GREENHOUSE;
const STAND_X = 8.0; // gap between the two rack runs (x 7.4 → 8.6, greenhouse-local)
const STAND_Z = 1.75; // same line as the racks, on both sides of the aisle
const POT_DX = 0.27;

export function createFarming({ world, camera, renderer, root, feedback, gauges, getMode, hooks }) {
  const ox = G.x - G.length / 2; // world x of the greenhouse's west end
  const group = new THREE.Group();
  group.name = 'farming';
  world.greenhouse.interior.add(group); // only drawn while you are in the greenhouse

  const pots = {};
  for (const side of [-1, 1]) {
    const stand = createStand();
    stand.position.set(STAND_X, G.floorY, side * STAND_Z);
    group.add(stand);
    const sign = createSign(['POTATO POTS'], 0.5, 0.11, { accent: '#7be0a0' });
    sign.position.set(0, STAND.height - 0.08, -side * (STAND.depth / 2 + 0.003));
    if (side > 0) sign.rotation.y = Math.PI;
    stand.add(sign);
    for (const dx of [-POT_DX, POT_DX]) {
      const id = `pot-${side > 0 ? 's' : 'n'}${dx < 0 ? 1 : 2}`;
      const p = createPot();
      p.group.position.set(STAND_X + dx, G.floorY + STAND.height, side * STAND_Z);
      // loose-soil pile sits to the camera's right
      p.pile.position.x = -side * Math.abs(p.pile.position.x);
      group.add(p.group);
      pots[id] = { ...p, id, side, plant: null, dig: false };
    }
  }
  group.updateWorldMatrix(true, true); // include the greenhouse's own transform
  for (const p of Object.values(pots)) {
    p.soilWorld = new THREE.Vector3(0, POT.soilY, 0).applyMatrix4(p.group.matrixWorld);
    p.baseWorldY = p.group.getWorldPosition(new THREE.Vector3()).y;
  }

  const saved = loadSettings().farm ?? null;
  const state = createFarmState(Object.keys(pots), saved);

  let saveTimer = 0;
  function save() {
    saveSettings({ farm: serializeFarm(state) });
    saveTimer = 0;
  }

  /** Make a pot's meshes match its state. */
  function sync(id) {
    const v = pots[id];
    const pot = state.pots[id];
    const empty = pot.stage === STAGE.EMPTY;
    const seeded = pot.stage === STAGE.SEEDED;
    const cf = coverFraction(pot);
    v.hole.visible = (empty && v.dig) || (seeded && cf < 1);
    v.pile.visible = (empty && v.dig) || seeded;
    v.pile.scale.copy(v.pile.userData.base).multiplyScalar(empty ? 1 : Math.max(0.15, 1 - cf * 0.85));
    v.seed.visible = seeded && cf < 0.67;
    const moundH = seeded ? cf * 0.035 : empty ? 0 : 0.035;
    v.mound.visible = moundH > 0;
    v.mound.scale.y = Math.max(0.001, moundH);
    v.soilMaterial.color.copy(SOIL_DRY).lerp(SOIL_WET, empty ? 0 : waterFraction(pot));
    const growing = pot.stage === STAGE.GROWING || pot.stage === STAGE.READY;
    if (growing && !v.plant) {
      v.plant = createPotatoPlant(id.charCodeAt(4) * 7 + id.charCodeAt(5));
      v.plantAnchor.add(v.plant.group);
    } else if (!growing && v.plant) {
      v.plant.group.removeFromParent();
      v.plant.dispose();
      v.plant = null;
    }
    if (v.plant) {
      v.plant.setGrowth(growthStage(pot), pot.growth);
      v.plant.setCut(pot.cuts);
    }
  }
  Object.keys(pots).forEach(sync);

  const view = createFarmView({
    camera,
    renderer,
    root,
    world,
    state,
    pots,
    feedback,
    sync,
    save,
    hooks,
  });

  const panel = createInventoryPanel({ root, state, gauges, feedback, getMode, isViewOpen: () => view.isOpen, save });

  function potPrompt(pot) {
    if (pot.stage === STAGE.READY) return 'Press E to harvest';
    if (pot.stage === STAGE.GROWING) return `Potato growing · ${Math.floor(pot.growth * 20) * 5}%`;
    return 'Press E to interact';
  }

  // one interactable per stand; refine() picks the pot you are facing
  const interactables = [-1, 1].map((side) => ({
    id: `farm-stand-${side}`,
    zone: 'greenhouse',
    x: ox + STAND_X,
    // stand centre: ≥ 0.9 m from anywhere in the aisle, so findInteractable always checks facing
    z: G.z + side * STAND_Z,
    y: G.floorY + 0.9,
    prompt: 'Press E to interact',
    action: { type: 'farm', side },
  }));

  let lit = true;
  if (import.meta.env.DEV) window.__farm = { state, pots, view, sync, save }; // dev-only test hook

  return {
    state,
    interactables,
    get isOpen() {
      return view.isOpen;
    },
    /** Given the stand interactable, return the pot the player faces (with its prompt). */
    refine(target, px, pz, fwd) {
      let best = null;
      let bestDot = -Infinity;
      const fl = Math.hypot(fwd.x, fwd.z) || 1;
      for (const v of Object.values(pots)) {
        if (v.side !== target.action.side) continue;
        const dx = v.soilWorld.x - px;
        const dz = v.soilWorld.z - pz;
        const d = Math.hypot(dx, dz) || 1;
        const dot = (dx * fwd.x + dz * fwd.z) / (d * fl);
        if (dot > bestDot) {
          bestDot = dot;
          best = v;
        }
      }
      if (bestDot < 0.5) return null; // not really looking at either pot
      return { ...target, prompt: potPrompt(state.pots[best.id]), action: { type: 'farm', potId: best.id } };
    },
    /** E pressed on a pot. */
    interact(potId) {
      const pot = state.pots[potId];
      if (pot.stage === STAGE.GROWING) {
        feedback.notify(lit ? 'Still growing' : 'Growing paused: no power', {
          long: lit
            ? 'This potato plant is still growing under the red and blue grow lights. Come back when it is ready to harvest.'
            : 'The grow lights are off because base power ran out, so the potato plant has stopped growing for now.',
        });
        return;
      }
      view.open(potId);
    },
    /** frameDt: real frame time (animations). dt: game time step (0 while paused). */
    update(frameDt, dt, { lit: lightsOn = true } = {}) {
      lit = lightsOn;
      if (dt > 0) {
        const ready = stepGrowth(state, dt, { lit });
        for (const [id, pot] of Object.entries(state.pots)) {
          if (pot.stage === STAGE.GROWING || ready.includes(id)) sync(id);
        }
        if (ready.length) {
          save();
          feedback.notify('Potato plant ready', {
            long: 'A potato plant in the greenhouse is ready to harvest. Bring the cutters!',
          });
        }
        if (Object.values(state.pots).some((p) => p.stage === STAGE.GROWING)) {
          saveTimer += dt;
          if (saveTimer > 5) save();
        }
      }
      view.update(frameDt);
      panel.update();
    },
  };
}
