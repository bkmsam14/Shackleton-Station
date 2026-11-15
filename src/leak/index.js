// leak/index.js — micrometeoroid hits on the base: the ONE hit scheduler (array or habitat,
// never both at once) and the habitat air leak (alarm beacon, leak panel, repair lesson).
// Pure rules live in systems/micrometeoroids.js; this file wires them to the 3D world,
// the captions, the save and the lesson overlay.
//
// What the kid sees during a leak:
//   - a red beacon flashes on the life-support rack (habitat work bay) + a soft alarm beep;
//   - Volt / a caption: "Air leak! ... press E at the life-support rack";
//   - the oxygen gauge drains faster (the base tops the cabin air up from the supply);
//   - E at the rack opens the leak lesson (one of 3 mini-games, picked at random).
// The hiss itself can't be heard: a tiny leak whistles too high for our ears (ultrasound),
// which is exactly why real crews use ultrasonic leak detectors.
//
// Save: settings.impacts (hit clock) + settings.habitatLeak (leak state).
import * as THREE from 'three';
import { loadSettings, saveSettings } from '../systems/save.js';
import { LAYOUT } from '../world/layout.js';
import { LEAK, MICROMETEOROIDS } from '../config/gameplay.js';
import { createImpactState, stepImpacts, createLeakState, startLeak, fixLeak, leakO2KgPerGameHour, stepLeak } from '../systems/micrometeoroids.js';
import { createSign } from '../world/signs.js';
import { sfx } from '../supply/sfx.js';
import { createLeakRepairInstance } from '../instances/leak/index.js';

const H = LAYOUT.HABITAT;
const FY = H.floorY;
const RACK = { x: H.x + 5.0, z: H.z - 2.31 }; // front face of the life-support rack (−Z wall)

/** Red beacon + "AIR LEAK" sign on top of the life-support rack (hidden until a leak). */
function createLeakBeacon(world) {
  const g = new THREE.Group();
  g.visible = false;
  // MeshBasic + colour above 1: bright enough for the soft bloom, no extra light to pay for
  const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff3b30).multiplyScalar(3), toneMapped: true });
  const offMat = new THREE.MeshStandardMaterial({ color: 0x5a1a18, roughness: 0.4 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.06, 24), new THREE.MeshStandardMaterial({ color: 0x2b3240, roughness: 0.5, metalness: 0.4 }));
  base.position.set(RACK.x - 1.1, FY + 2.13, RACK.z - 0.2);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), lampMat);
  dome.position.set(RACK.x - 1.1, FY + 2.16, RACK.z - 0.2);
  const sign = createSign(['AIR LEAK', 'press E here'], 1.0, 0.34);
  sign.position.set(RACK.x + 0.15, FY + 2.32, RACK.z - 0.02);
  g.add(base, dome, sign);
  world.add(g);
  let t = 0;
  return {
    update(frameDt, on) {
      g.visible = on;
      if (!on) return;
      t += frameDt;
      dome.material = t % 1 < 0.5 ? lampMat : offMat; // 1 flash per second
    },
  };
}

/**
 * solar: { get damaged, hit() } — the supply module's array damage (supply/index.js).
 * notify(id, short, long, tone): Volt / caption. instances, voice: lesson overlay + Volt's voice.
 */
export function createHabitatLeak({ world, notify, instances, voice, solar, onEvent = () => {} }) {
  const saved = loadSettings();
  // old saves kept the hit clock in solarDamage.playSeconds (grace period still counts)
  const impacts = createImpactState(saved.impacts ?? { playSeconds: saved.solarDamage?.playSeconds });
  const leak = createLeakState(saved.habitatLeak ?? null);
  const save = () =>
    saveSettings({
      impacts: { playSeconds: impacts.playSeconds, hits: impacts.hits },
      habitatLeak: { leaking: leak.leaking, repairs: leak.repairs, o2LostKg: leak.o2LostKg },
    });

  const beacon = createLeakBeacon(world);
  const target = {
    id: 'leak-panel',
    zone: 'habitat',
    x: RACK.x - 0.4,
    z: RACK.z + 0.6,
    y: FY + 1.3,
    prompt: 'Press E to find and fix the air leak',
    action: { type: 'leak' },
  };
  function syncTarget() {
    const i = world.interactables.indexOf(target);
    if (leak.leaking && i < 0) world.interactables.push(target);
    if (!leak.leaking && i >= 0) world.interactables.splice(i, 1);
  }
  syncTarget();

  function announceLeak() {
    sfx.alarm();
    const times = (1 + LEAK.O2_KG_PER_GAME_HOUR / (0.895 / 24)).toFixed(1);
    notify(
      'habitat-leak',
      'Air leak in the habitat!',
      `A micrometeorite made a tiny hole in the habitat wall. Air is leaking into space, and the base uses the oxygen supply to top the air up, so oxygen now drains about ${times}× faster. ` +
        'Go to the life-support rack in the habitat work bay (red light) and press E to find and patch the hole.',
      'critical',
    );
    save();
  }

  /** A hit lands on the habitat now (random, or a test). */
  function hitHabitat() {
    if (!startLeak(leak)) return false;
    syncTarget();
    announceLeak();
    onEvent('habitat-leak');
    return true;
  }

  function interact() {
    if (!leak.leaking) return;
    sfx.unlock();
    instances.open('leak-repair', createLeakRepairInstance, {
      voice,
      repairs: leak.repairs,
      o2LostKg: leak.o2LostKg,
      onPatched() {
        if (!fixLeak(leak)) return false;
        syncTarget();
        save();
        sfx.repair();
        notify('leak-fixed', 'Leak patched!', 'You found the hole and sealed it from the inside. The cabin pressure holds steady again, so the oxygen supply drains at the normal speed.');
        return true;
      },
    });
  }

  let saveTimer = 0;
  let beepTimer = 0;
  if (import.meta.env.DEV) window.__leak = { leak, impacts, hitHabitat, interact, save }; // dev-only test hook

  return {
    get leaking() {
      return leak.leaking;
    },
    get state() {
      return leak;
    },
    /** Extra oxygen (kg per game hour) the base uses to keep the cabin air topped up. */
    get o2KgPerGameHour() {
      return leakO2KgPerGameHour(leak);
    },
    hitHabitat,
    interact,
    /**
     * frameDt: real frame time. baseDt: base-clock seconds that passed (0 while paused).
     * training: no random hits on the Training Day (the script decides).
     */
    update(frameDt, baseDt, zoneId, { training = false } = {}) {
      stepLeak(leak, baseDt);
      if (!training) {
        const hit = stepImpacts(impacts, baseDt, {
          busy: leak.leaking || solar.damaged, // one thing broken at a time: never both at once
          everySeconds: MICROMETEOROIDS.TEST_HIT_EVERY_REAL_SECONDS,
        });
        if (hit === 'solar') solar.hit();
        else if (hit === 'habitat') hitHabitat();
      }
      const inHab = zoneId === 'habitat';
      beacon.update(frameDt, leak.leaking && inHab);
      // a soft reminder beep every few seconds while you are in the habitat
      if (leak.leaking && inHab && baseDt > 0 && (beepTimer -= frameDt) <= 0) {
        beepTimer = 6;
        sfx.alarm();
      }
      saveTimer += baseDt;
      if (saveTimer > 5) {
        saveTimer = 0;
        save();
      }
    },
  };
}
