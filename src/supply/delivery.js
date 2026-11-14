// delivery.js — moving supplies from an arrived crate into the base (PURE LOGIC).
// Uses the existing systems only:
//   inventory → the astronaut's inventory (src/farming/inventory.js: potatoes, repair kits)
//   tank      → the Electrolysis station's water tank (station.tankKg)
//   battery   → the base battery (gauges.batteryKwh)
// A unit that would not fit (tank or battery full) stays in the crate for later.
import { SUPPLY, POWER } from '../config/gameplay.js';
import { CATALOG } from './catalog.js';
import { takeFromCrate } from './orders.js';
import { addItem } from '../farming/inventory.js';

/** How many of `want` units fit right now. */
export function unitsThatFit(id, want, { station, gauges }) {
  const c = CATALOG[id];
  if (c.to === 'tank') return Math.min(want, Math.floor((SUPPLY.WATER_TANK_MAX_KG - station.tankKg + 1e-9) / c.perUnit));
  if (c.to === 'battery') return Math.min(want, Math.floor((POWER.BATTERY_CAPACITY_KWH - gauges.batteryKwh + 1e-9) / c.perUnit));
  return want;
}

/**
 * Collect the selected units from an arrived crate. selection: { id: units }.
 * Returns { moved: {id: units}, kept: {id: {units, reason: 'full' | 'not-selected'}} }.
 * Each unit is applied exactly once (the crate count goes down as it is applied).
 */
export function collectFromCrate(state, order, selection, targets) {
  const moved = {};
  const kept = {};
  if (order.stage !== 'arrived' || !order.crate) return { moved, kept };
  for (const id of Object.keys({ ...order.crate })) {
    const inCrate = order.crate?.[id] ?? 0;
    const want = Math.min(inCrate, Math.max(0, selection[id] ?? 0));
    const n = Math.max(0, unitsThatFit(id, want, targets));
    const c = CATALOG[id];
    if (n > 0) {
      if (c.to === 'inventory') addItem(targets.inventory, c.item, n * c.perUnit);
      else if (c.to === 'tank') targets.station.tankKg += n * c.perUnit;
      else if (c.to === 'battery') targets.gauges.batteryKwh += n * c.perUnit;
      takeFromCrate(state, order, id, n);
      moved[id] = n;
    }
    const left = inCrate - n;
    if (left > 0) kept[id] = { units: left, reason: want > n ? 'full' : 'not-selected' };
  }
  return { moved, kept };
}
