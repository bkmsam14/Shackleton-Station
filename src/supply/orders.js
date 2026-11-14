// orders.js — supply orders and their delivery (PURE LOGIC: no Three.js, no DOM).
//
// Every order moves through these stages. Times are "play seconds" (real seconds while
// the base is running). Light-delay stages use the REAL light travel time; the others
// are game hours converted with TIME.SCALE (the base clock is sped up).
//
//   transmitting  request travels to Earth          one-way light delay (~1.28 s)
//   reviewing     Mission Control checks it          SUPPLY.REVIEW_GAME_HOURS
//   replying      approval travels back              one-way light delay
//   preparing     approved; crate packed on lander   SUPPLY.PREPARE_GAME_HOURS
//   in-transit    cargo dispatched, flying           slowest item's deliveryGameHours
//   holding       above the pad, waiting for a free landing spot
//   landing       powered descent onto the pad       SUPPLY.LANDING_SECONDS
//   arrived       crate on the pad (until collected)
//   collected     everything taken out
import { SUPPLY, TIME } from '../config/gameplay.js';
import { CATALOG } from './catalog.js';
import { oneWayDelaySeconds } from './commDelay.js';

export const STAGE_LABEL = {
  transmitting: 'TRANSMITTING REQUEST…',
  reviewing: 'REQUEST SENT · WAITING FOR REMOTE CONFIRMATION…',
  replying: 'WAITING FOR REMOTE CONFIRMATION…',
  preparing: 'SUPPLY REQUEST APPROVED · PREPARING CARGO',
  'in-transit': 'CARGO DISPATCHED · DELIVERY IN TRANSIT',
  holding: 'IN ORBIT · WAITING FOR A FREE SPOT ON THE PAD',
  landing: 'LANDING…',
  arrived: 'DELIVERY ARRIVED',
  collected: 'COLLECTED',
};
/** The groups the terminal shows (your brief's list). */
export const STAGE_GROUP = {
  transmitting: 'Pending',
  reviewing: 'Awaiting confirmation',
  replying: 'Awaiting confirmation',
  preparing: 'Approved · being prepared',
  'in-transit': 'Dispatched',
  holding: 'Dispatched',
  landing: 'Dispatched',
  arrived: 'Arrived',
  collected: 'Collected',
};
const ORDER = ['transmitting', 'reviewing', 'replying', 'preparing', 'in-transit', 'holding', 'landing', 'arrived', 'collected'];
const ACTIVE = new Set(ORDER.slice(0, 7));
const HISTORY_KEEP = 8; // collected orders kept for the list

export const gameHoursToPlaySeconds = (h) => (h * 3600) / TIME.SCALE;

// ------------------------------------------------------------------ state
export function createSupplyState(saved = null) {
  const orders = Array.isArray(saved?.orders)
    ? saved.orders.filter((o) => o && typeof o.id === 'string' && ORDER.includes(o.stage) && o.items && typeof o.items === 'object')
    : [];
  for (const o of orders) {
    if (o.stage === 'landing') o.remaining = SUPPLY.LANDING_SECONDS; // descent restarts after a reload
    if (o.stage === 'arrived' && !o.crate) o.crate = { ...o.items };
  }
  return { nextId: Number.isInteger(saved?.nextId) ? saved.nextId : 1, orders };
}

export function serializeSupply(state) {
  return JSON.parse(JSON.stringify({ nextId: state.nextId, orders: state.orders }));
}

// ------------------------------------------------------------------ building an order
export function orderMassKg(items) {
  let kg = 0;
  for (const [id, n] of Object.entries(items)) kg += (CATALOG[id]?.massKg ?? 0) * n;
  return kg;
}

/** Game hours from dispatch to the pad: the slowest item sets the pace. */
export function transitGameHours(items) {
  let h = 0;
  for (const [id, n] of Object.entries(items)) if (n > 0) h = Math.max(h, CATALOG[id].deliveryGameHours);
  return h;
}

/** { ok, reason: null | 'empty' | 'unknown' | 'too-many' | 'too-heavy', item?, massKg } */
export function validateOrder(items) {
  const entries = Object.entries(items).filter(([, n]) => n > 0);
  if (!entries.length) return { ok: false, reason: 'empty', massKg: 0 };
  for (const [id, n] of entries) {
    if (!CATALOG[id]) return { ok: false, reason: 'unknown', item: id, massKg: 0 };
    if (!Number.isInteger(n) || n > CATALOG[id].maxPerOrder) return { ok: false, reason: 'too-many', item: id, massKg: orderMassKg(items) };
  }
  const massKg = orderMassKg(items);
  if (massKg > SUPPLY.CARGO_CAPACITY_KG + 1e-9) return { ok: false, reason: 'too-heavy', massKg };
  return { ok: true, reason: null, massKg };
}

/** Total play seconds from "Confirm" to the crate touching down (if the pad is free). */
export function estimateSeconds(items) {
  const light = oneWayDelaySeconds();
  return (
    2 * light +
    gameHoursToPlaySeconds(SUPPLY.REVIEW_GAME_HOURS + SUPPLY.PREPARE_GAME_HOURS + transitGameHours(items)) +
    SUPPLY.LANDING_SECONDS
  );
}

/** Register a confirmed order; it starts transmitting at once. Returns the order or null. */
export function placeOrder(state, items) {
  const clean = Object.fromEntries(Object.entries(items).filter(([, n]) => n > 0));
  if (!validateOrder(clean).ok) return null;
  const id = 'SR-' + String(state.nextId).padStart(3, '0');
  state.nextId += 1;
  const light = oneWayDelaySeconds();
  const order = { id, items: clean, stage: 'transmitting', remaining: light, duration: light, slot: null, crate: null };
  state.orders.push(order);
  return order;
}

// ------------------------------------------------------------------ time passing
function durationOf(stage, order) {
  switch (stage) {
    case 'transmitting':
    case 'replying':
      return oneWayDelaySeconds();
    case 'reviewing':
      return gameHoursToPlaySeconds(SUPPLY.REVIEW_GAME_HOURS);
    case 'preparing':
      return gameHoursToPlaySeconds(SUPPLY.PREPARE_GAME_HOURS);
    case 'in-transit':
      return gameHoursToPlaySeconds(transitGameHours(order.items));
    case 'landing':
      return SUPPLY.LANDING_SECONDS;
    default:
      return Infinity; // holding / arrived / collected wait for something else
  }
}

function enter(order, stage) {
  order.stage = stage;
  order.duration = durationOf(stage, order);
  order.remaining = order.duration;
}

/** Lowest free landing spot on the pad, or null if the pad is full. */
export function freeSlot(state) {
  const used = new Set(state.orders.filter((o) => o.stage === 'landing' || o.stage === 'arrived').map((o) => o.slot));
  for (let i = 0; i < SUPPLY.PAD_SLOTS; i++) if (!used.has(i)) return i;
  return null;
}

function tryLand(state, order, events) {
  const slot = freeSlot(state);
  if (slot === null) {
    if (order.stage !== 'holding') {
      enter(order, 'holding');
      events.push({ type: 'holding', order });
    }
    return;
  }
  order.slot = slot;
  enter(order, 'landing');
  events.push({ type: 'landing', order });
}

/**
 * Advance every active order by dt play seconds. Several stages can pass in one big step.
 * Returns events: { type: 'sent' | 'approved' | 'dispatched' | 'holding' | 'landing' | 'arrived', order }.
 */
export function stepOrders(state, dt) {
  const events = [];
  for (const order of state.orders) {
    if (!ACTIVE.has(order.stage)) continue;
    if (order.stage === 'holding') {
      tryLand(state, order, events);
      continue;
    }
    let left = dt;
    while (left > 0 && ACTIVE.has(order.stage) && order.stage !== 'holding') {
      if (order.remaining > left) {
        order.remaining -= left;
        break;
      }
      left -= order.remaining;
      order.remaining = 0;
      const s = order.stage;
      if (s === 'transmitting') {
        enter(order, 'reviewing');
        events.push({ type: 'sent', order });
      } else if (s === 'reviewing') {
        enter(order, 'replying');
      } else if (s === 'replying') {
        enter(order, 'preparing');
        events.push({ type: 'approved', order });
      } else if (s === 'preparing') {
        enter(order, 'in-transit');
        events.push({ type: 'dispatched', order });
      } else if (s === 'in-transit') {
        tryLand(state, order, events);
      } else if (s === 'landing') {
        order.stage = 'arrived';
        order.remaining = 0;
        order.crate = { ...order.items };
        events.push({ type: 'arrived', order });
      }
    }
  }
  return events;
}

/** Play seconds until this order is on the pad (0 once it has arrived). */
export function secondsUntilArrival(order) {
  if (!ACTIVE.has(order.stage)) return 0;
  if (order.stage === 'holding') return SUPPLY.LANDING_SECONDS;
  let t = order.remaining;
  for (let i = ORDER.indexOf(order.stage) + 1; i < ORDER.indexOf('arrived'); i++) {
    const s = ORDER[i];
    if (s !== 'holding') t += durationOf(s, order);
  }
  return t;
}

/** Take n units of one supply out of an arrived crate. Marks the order collected when empty. */
export function takeFromCrate(state, order, id, n) {
  if (order.stage !== 'arrived' || !order.crate) return 0;
  const k = Math.max(0, Math.min(n, order.crate[id] ?? 0));
  if (!k) return 0;
  order.crate[id] -= k;
  if (order.crate[id] <= 0) delete order.crate[id];
  if (!Object.keys(order.crate).length) {
    order.stage = 'collected';
    order.slot = null;
    order.crate = null;
    pruneHistory(state);
  }
  return k;
}

function pruneHistory(state) {
  const done = state.orders.filter((o) => o.stage === 'collected');
  const drop = new Set(done.slice(0, Math.max(0, done.length - HISTORY_KEEP)));
  state.orders = state.orders.filter((o) => !drop.has(o));
}

export const isActive = (order) => ACTIVE.has(order.stage);
export const crates = (state) => state.orders.filter((o) => o.stage === 'landing' || o.stage === 'arrived');
