// catalog.js — the orderable supplies (data only, no Three.js / DOM). Numbers come from
// gameplay.js → SUPPLY.ITEMS; this file adds names, descriptions, icons and where each
// unit goes when the crate is collected. Add a new supply = one entry here + one in SUPPLY.ITEMS.
//
// `to` (destination of each unit on collect):
//   inventory : +`perUnit` of `item` in the astronaut's inventory
//   tank      : +`perUnit` kg of water in the Electrolysis tank
//   battery   : +`perUnit` kWh in the base battery
import { SUPPLY } from '../config/gameplay.js';

const svg = (body) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  'solar-repair-kit': svg('<rect x="3" y="4" width="11" height="14" rx="1"/><path d="M3 9h11M3 14h11M8.5 4v14"/><path d="M15 15l5-5 1.5 1.5-5 5-2 .5z"/>'),
  water: svg('<path d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z"/><path d="M9 14a3 3 0 0 0 3 3"/>'),
  'seed-potatoes': svg('<path d="M6 9c0-3 3-5 6-5s6 2 6 5c0 6-3 11-6 11S6 15 6 9z"/><circle cx="10" cy="10" r=".6"/><circle cx="14" cy="13" r=".6"/><circle cx="11" cy="16" r=".6"/>'),
  'battery-pack': svg('<rect x="3" y="7" width="16" height="11" rx="2"/><path d="M19 11h2v3h-2M10 9l-2 4h4l-2 4"/>'),
  'lettuce-seeds': svg('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M12 17c-3 0-4-3-4-5 2 0 4 1 4 5zm0 0c3 0 4-3 4-5-2 0-4 1-4 5zM12 17V9"/>'),
  'radish-seeds': svg('<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="14" r="3"/><path d="M12 11V7M10 8l2-1 2 1"/>'),
};

const DEF = {
  'solar-repair-kit': {
    name: 'Solar Panel Repair Kit',
    desc: 'New solar cells and wiring to fix a damaged solar array.',
    to: 'inventory',
    item: 'solar-repair-kit',
    perUnit: 1,
    unitLabel: 'kit',
  },
  water: {
    name: 'Water Supplies',
    desc: 'A water container for the Electrolysis tank, so you can keep making oxygen.',
    to: 'tank',
    perUnit: SUPPLY.ITEMS.water.waterKg,
    unitLabel: 'container',
  },
  'seed-potatoes': {
    name: 'Seed Potatoes',
    desc: 'A bag of seed potatoes to plant in the greenhouse pots.',
    to: 'inventory',
    item: 'potato',
    perUnit: SUPPLY.ITEMS['seed-potatoes'].potatoes,
    unitLabel: 'bag',
  },
  'battery-pack': {
    name: 'Battery Pack',
    desc: 'A charged battery that adds stored energy to the base battery.',
    to: 'battery',
    perUnit: SUPPLY.ITEMS['battery-pack'].kwh,
    unitLabel: 'pack',
  },
  'lettuce-seeds': {
    name: 'Lettuce Seeds',
    desc: 'A packet of red romaine lettuce seeds, like NASA grew on the ISS. Seeds are tiny, so flying them costs far less than flying food.',
    to: 'inventory',
    item: 'lettuce-seed',
    perUnit: SUPPLY.ITEMS['lettuce-seeds'].seeds,
    unitLabel: 'packet',
  },
  'radish-seeds': {
    name: 'Radish Seeds',
    desc: 'A packet of radish seeds. Radishes were grown on the ISS too, in the Advanced Plant Habitat.',
    to: 'inventory',
    item: 'radish-seed',
    perUnit: SUPPLY.ITEMS['radish-seeds'].seeds,
    unitLabel: 'packet',
  },
};

/** id → { id, name, desc, icon, massKg, maxPerOrder, deliveryGameHours, to, item?, perUnit, unitLabel } */
export const CATALOG = Object.fromEntries(
  Object.entries(DEF).map(([id, d]) => [id, { id, icon: ICONS[id], ...SUPPLY.ITEMS[id], ...d }]),
);
export const CATALOG_IDS = Object.keys(CATALOG);

/** What one unit gives, for labels: "+3 potatoes", "+10 kg water", "+8 kWh". */
export function unitEffect(id) {
  const c = CATALOG[id];
  if (c.to === 'tank') return `+${c.perUnit} kg water to the Electrolysis tank`;
  if (c.to === 'battery') return `+${c.perUnit} kWh to the base battery`;
  if (c.item === 'potato') return `+${c.perUnit} seed potatoes`;
  if (c.item?.endsWith('-seed')) return `+${c.perUnit} ${c.item.replace('-seed', '')} seeds`;
  return `+${c.perUnit} ${c.unitLabel}`;
}
