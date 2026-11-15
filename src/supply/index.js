// supply/index.js — habitat supply terminal + cargo landing pad + solar array repair.
// Wires the pure logic (orders.js, delivery.js, solarDamage.js) to the 3D world, the
// screens, the existing inventory, the Electrolysis water tank and the base battery.
//
// Save: orders + delivery timers + crates → settings.supply; array damage → settings.solarDamage
// (the game's existing try/catch-safe settings store). Timers are "play seconds left", so
// they continue correctly after a reload.
import './supply.css';
import { loadSettings, saveSettings } from '../systems/save.js';
import { SOLAR_DAMAGE, TRAINING } from '../config/gameplay.js';
import { createSupplyState, serializeSupply, placeOrder, stepOrders, secondsUntilArrival, isActive, rushOrder } from './orders.js';
import { collectFromCrate } from './delivery.js';
import { createSolarDamageState, stepSolarDamage, solarOutputFactor, repairSolar, kitsInInventory } from './solarDamage.js';
import { createLandingPad, slotPosition } from './landingPad.js';
import { createTerminal, createSolarDamageView, TERMINAL } from './supplyModels.js';
import { createTerminalUI, fmtSeconds } from './terminalUI.js';
import { createCrateUI } from './crateUI.js';
import { CATALOG } from './catalog.js';
import { sfx } from './sfx.js';
import { createSolarRepairInstance } from '../instances/solar/index.js';

const summary = (items) =>
  Object.entries(items)
    .map(([id, n]) => `${n}× ${CATALOG[id]?.name ?? id}`)
    .join(', ');

/**
 * inventory / saveInventory: the existing astronaut inventory and its save function.
 * notify(id, short, long, tone): the game's event caption (Volt may say it instead).
 * hooks.onEnter / onExit(reason): freeing and re-locking the mouse around a screen.
 * instances / voice: the game's lesson overlay manager and Volt's voice (for the repair lesson).
 */
export function createSupply({ world, root, gauges, station, inventory, saveInventory, notify, hooks, instances, voice, onEvent = () => {} }) {
  let pace = 1; // base-clock speed (slower on the Training Day)
  const saved = loadSettings();
  const state = createSupplyState(saved.supply ?? null);
  const damage = createSolarDamageState(saved.solarDamage ?? null);
  const save = () => saveSettings({ supply: serializeSupply(state), solarDamage: { ...damage } });
  const targets = { inventory, station, gauges };

  // ---------------------------------------------------------------- world objects
  const terminal = createTerminal();
  world.add(terminal.group);
  world.zones.habitat.obstacles.push({ type: 'box', minX: TERMINAL.x - 0.45, maxX: TERMINAL.x + 0.45, minZ: TERMINAL.z - 0.22, maxZ: 3.2 });
  const pad = createLandingPad(world);
  const damageView = createSolarDamageView(world);

  const terminalTarget = {
    id: 'supply-terminal',
    zone: 'habitat',
    x: TERMINAL.x,
    z: TERMINAL.z - 0.6,
    y: TERMINAL.floorY + 1.1,
    prompt: 'Press E to Request Supplies',
    action: { type: 'supply', kind: 'terminal' },
  };
  world.interactables.push(terminalTarget);

  // one interactable + collider per crate standing on the pad
  const crateBits = new Map(); // order id → { target, collider }
  function syncCrates() {
    const arrived = new Map(state.orders.filter((o) => o.stage === 'arrived').map((o) => [o.id, o]));
    for (const [id, bits] of crateBits) {
      if (arrived.has(id)) continue;
      world.interactables.splice(world.interactables.indexOf(bits.target), 1);
      world.outdoorColliders.splice(world.outdoorColliders.indexOf(bits.collider), 1);
      crateBits.delete(id);
    }
    for (const [id, o] of arrived) {
      if (crateBits.has(id)) continue;
      const p = slotPosition(o.slot);
      const target = { id: 'crate-' + id, zone: 'outside', x: p.x, z: p.z, y: p.y + 0.5, prompt: `Press E to Open Cargo Crate ${id}`, action: { type: 'supply', kind: 'crate', orderId: id } };
      const collider = { type: 'circle', x: p.x, z: p.z, r: 0.62 };
      world.interactables.push(target);
      world.outdoorColliders.push(collider);
      crateBits.set(id, { target, collider });
    }
  }
  syncCrates();

  // ---------------------------------------------------------------- screens
  let openScreen = null; // 'terminal' | 'crate' | null
  function enter(screen) {
    openScreen = screen;
    hooks.onEnter();
  }
  function exit(reason = 'done') {
    if (!openScreen) return;
    if (openScreen === 'terminal') termUI.close();
    else crateUI.close();
    openScreen = null;
    save();
    hooks.onExit(reason);
  }

  const termUI = createTerminalUI({
    root,
    state,
    getTargets: () => targets,
    getPace: () => pace,
    onConfirm(items) {
      const order = placeOrder(state, items);
      if (!order) return null;
      onEvent('order-sent');
      if (order.items['solar-repair-kit']) onEvent('order-kit');
      sfx.transmit();
      save();
      return order;
    },
    onClose: exit,
  });

  const crateUI = createCrateUI({
    root,
    getTargets: () => targets,
    onCollect(order, selection) {
      const { moved, kept } = collectFromCrate(state, order, selection, targets);
      if (moved['solar-repair-kit']) onEvent('kit-collected');
      const got = Object.entries(moved).map(([id, n]) => {
        const c = CATALOG[id];
        if (c.to === 'tank') return `+${n * c.perUnit} kg water`;
        if (c.to === 'battery') return `+${n * c.perUnit} kWh battery`;
        if (c.item === 'potato') return `+${n * c.perUnit} potatoes`;
        return `+${n} ${c.name}${n > 1 ? 's' : ''}`;
      });
      if (got.length) {
        saveInventory();
        sfx.collect();
      }
      syncCrates();
      save();
      const full = Object.values(kept).some((k) => k.reason === 'full');
      exit('done');
      if (got.length) {
        notify(
          'supply-collected',
          got.join(' · '),
          `Collected from crate ${order.id}: ${got.join(', ')}.` + (Object.keys(kept).length ? ` The rest is still in the crate${full ? ' (no room for it yet)' : ''}.` : ''),
        );
      }
    },
    onClose: exit,
  });

  window.addEventListener('keydown', (e) => {
    if (!openScreen || e.repeat) return;
    if (e.code === 'KeyE') {
      e.preventDefault();
      exit('done');
    } else if (e.code === 'Escape') exit('esc');
  });

  // ---------------------------------------------------------------- solar array repair
  function repairTarget(target) {
    const kits = kitsInInventory(inventory);
    return {
      ...target,
      id: 'solar-repair',
      prompt: kits ? `Press E to Repair Solar Array (${kits} kit${kits > 1 ? 's' : ''})` : 'Press E to check the damaged solar array',
      action: { type: 'supply', kind: 'repair' },
    };
  }
  function announceHit() {
    sfx.alarm();
    notify(
      'solar-damaged',
      'Solar array hit!',
      `A micrometeorite hit the solar array. It now makes only ${Math.round(SOLAR_DAMAGE.DAMAGED_OUTPUT * 100)} % of its power. ` +
        'Order a Solar Panel Repair Kit at the Supply terminal in the habitat, then press E at the array to fix it.',
      'critical',
    );
    save();
  }

  /** E at the damaged array: with a kit, open the Solar Fix lesson; the kit is used when the cells are swapped. */
  function tryRepair() {
    if (!damage.damaged) return;
    if (kitsInInventory(inventory) >= SOLAR_DAMAGE.KITS_PER_REPAIR) {
      instances.open('solar-repair', createSolarRepairInstance, {
        voice,
        repairs: damage.repairs,
        kitsLeft: () => kitsInInventory(inventory),
        onRepaired() {
          const r = repairSolar(damage, inventory);
          if (r.ok) {
            saveInventory();
            save();
            sfx.repair();
            notify('solar-repaired', 'Solar array repaired', 'You swapped the cracked solar cells using a Solar Panel Repair Kit. The array makes full power again.');
          }
          return { ok: r.ok, kitsLeft: kitsInInventory(inventory) };
        },
      });
    } else {
      notify(
        'solar-need-kit',
        'Need a Solar Panel Repair Kit',
        'The solar array is damaged and you have no repair kit. Order a Solar Panel Repair Kit at the Supply terminal in the habitat work bay, then come back and press E here.',
        'low',
      );
    }
  }

  // ---------------------------------------------------------------- events → captions / sounds
  function onOrderEvent({ type, order: o }) {
    if (type === 'approved') {
      sfx.confirmed();
      notify('supply-approved', `Request ${o.id} approved`, `Earth approved supply request ${o.id} (${summary(o.items)}). It arrives in about ${fmtSeconds(secondsUntilArrival(o, pace))} of play.`);
    } else if (type === 'dispatched') {
      notify('supply-dispatched', `Cargo ${o.id} on its way`, `Cargo ${o.id} was launched toward the Moon.`);
    } else if (type === 'holding') {
      notify('supply-holding', 'Landing pad full', `Cargo ${o.id} is waiting above the base: the landing pad is full. Collect a crate to make room.`, 'low');
    } else if (type === 'arrived') {
      notify('supply-arrived', `Cargo ${o.id} landed`, `Supply crate ${o.id} landed on the cargo pad east of the habitat. Go outside and press E at the crate to open it.`);
    }
  }

  let saveTimer = 0;
  let blink = 0;

  if (import.meta.env.DEV) window.__supply = { state, damage, save, termUI, crateUI, syncCrates }; // dev-only test hook

  return {
    /** Same as the array's info interactable, unless the array is damaged: then repair it. */
    refine(target) {
      if (target?.id === 'solar-info' && damage.damaged) return repairTarget(target);
      return target;
    },
    /** E pressed on one of this feature's interactables. */
    interact(target) {
      const k = target.action.kind;
      sfx.unlock();
      if (k === 'terminal') {
        termUI.open();
        enter('terminal');
      } else if (k === 'crate') {
        const order = state.orders.find((o) => o.id === target.action.orderId && o.stage === 'arrived');
        if (!order) return;
        crateUI.open(order);
        enter('crate');
      } else if (k === 'repair') tryRepair();
    },
    /** 0.4 while the array is damaged, 1 when healthy (multiplies its solar output). */
    get solarOutputFactor() {
      return solarOutputFactor(damage);
    },
    get isOpen() {
      return openScreen !== null;
    },
    /**
     * frameDt: real frame time. dt: game step (0 while the world is paused).
     * Orders keep moving while the terminal is open, so you can watch the signal travel.
     */
    /** Training Day: a micrometeorite hits the array now (scripted, not random). */
    forceSolarHit() {
      if (damage.damaged) return false;
      damage.damaged = true;
      announceHit();
      return true;
    },
    /** Training Day: orders on their way land within a few seconds (the light delay stays real). */
    rushDeliveries() {
      let any = false;
      // remaining time is counted on the base clock, so at a slow pace it must be shorter
      for (const o of state.orders) any = rushOrder(o, TRAINING.RUSH_SECONDS * pace) || any;
      return any;
    },
    get solarDamaged() {
      return damage.damaged;
    },
    /**
     * dt: real seconds while the world runs. opts.pace: base-clock speed (Training Day < 1).
     * opts.training: no random micrometeorite hits (the script decides).
     */
    update(frameDt, dt, zoneId, { pace: p = 1, training = false } = {}) {
      pace = p;
      const step = dt > 0 ? dt : openScreen ? frameDt : 0;
      const events = stepOrders(state, step, { pace });
      events.forEach(onOrderEvent);
      if (events.some((e) => e.type === 'arrived')) syncCrates();

      if (!training && stepSolarDamage(damage, dt * pace, Math.random, { everySeconds: SOLAR_DAMAGE.TEST_HIT_EVERY_REAL_SECONDS }) === 'hit') {
        announceHit();
      }

      const touched = pad.update(frameDt, state.orders, { visible: zoneId === 'outside' });
      if (touched.length) sfx.landed();
      damageView.update(frameDt, { damaged: damage.damaged, outside: zoneId === 'outside' });

      terminal.group.visible = zoneId === 'habitat';
      blink += frameDt;
      const busy = state.orders.some(isActive);
      const arrived = state.orders.some((o) => o.stage === 'arrived');
      terminal.led.material.color.setHex(arrived ? 0x7be0a0 : busy && blink % 1 < 0.5 ? 0xffb547 : 0x2a6b4a);

      termUI.update(frameDt);
      // keep timers + the damage clock saved (on every change, and every few seconds)
      saveTimer += step;
      if (events.length || saveTimer > 5) {
        saveTimer = 0;
        save();
      }
    },
  };
}
