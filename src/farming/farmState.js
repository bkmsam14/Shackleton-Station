// farmState.js — pot states for the farming minigame (pure logic, no Three.js, testable).
//
// Each pot moves through:  empty → seeded → covered → growing → ready → (harvest) → empty
//   plant   : drag a seed potato into the soil (uses 1 from the inventory)
//   cover   : drag soil over it (FARMING.COVER_LOADS handfuls)
//   water   : pour until FARMING.WATER_NEEDED drops have landed on the soil
//   grow    : overnight, one step per night (potato 2 nights, greens 1), if the grow lights
//             were on for enough of the day (days.js plantsGrowTonight)
//   harvest : cut FARMING.CUTS_TO_HARVEST leafy stems, then the potato goes to the inventory
// New crops = a new entry in CROPS (numbers in gameplay.js → FARMING).
import { FARMING, SOLAR_DAMAGE } from '../config/gameplay.js';
import { createInventory, addItem, removeItem, countOf } from './inventory.js';

export const CROPS = {
  potato: {
    seedItem: 'potato', // a harvested potato is planted again as a "seed potato"
    harvestItem: 'potato',
    perStem: FARMING.POTATOES_PER_STEM, // every cut stem brings up its own potato
    growNights: FARMING.GROW_NIGHTS,
    coverLoads: FARMING.COVER_LOADS,
    waterNeeded: FARMING.WATER_NEEDED,
    cutsToHarvest: FARMING.CUTS_TO_HARVEST,
  },
  // greens grow from seeds (sown shallow: one handful of soil), and every harvest is eaten
  ...Object.fromEntries(
    Object.entries(FARMING.GREENS).map(([id, c]) => [
      id,
      {
        seedItem: `${id}-seed`,
        harvestItem: id,
        perStem: c.perCut,
        growNights: c.growNights,
        coverLoads: c.coverLoads,
        waterNeeded: c.waterNeeded,
        cutsToHarvest: c.cuts,
      },
    ]),
  ),
};
export const CROP_IDS = Object.keys(CROPS);
/** Fresh greens you can eat (eaten before potatoes, which keep well). */
export const GREEN_IDS = Object.keys(FARMING.GREENS);
/** Everything F can eat, smallest first: greens, then potato and the packaged space meal. */
export const FOOD_IDS = [...GREEN_IDS, 'potato', 'space-meal'];

const START_INVENTORY = {
  potato: FARMING.START_SEED_POTATOES,
  ...Object.fromEntries(Object.entries(FARMING.START_SEEDS).map(([id, n]) => [`${id}-seed`, n])),
  'solar-repair-kit': SOLAR_DAMAGE.START_KITS,
  'space-meal': FARMING.START_SPACE_MEALS,
};

export const STAGE = { EMPTY: 'empty', SEEDED: 'seeded', COVERED: 'covered', GROWING: 'growing', READY: 'ready' };
const STAGES = Object.values(STAGE);

function emptyPot() {
  return { stage: STAGE.EMPTY, crop: null, cover: 0, water: 0, growth: 0, nights: 0, cuts: 0 };
}

export function createFarmState(potIds, saved = null) {
  const pots = {};
  for (const id of potIds) {
    const s = saved?.pots?.[id];
    const ok = s && STAGES.includes(s.stage) && (s.stage === STAGE.EMPTY || CROPS[s.crop]);
    pots[id] = ok ? { ...emptyPot(), ...s } : emptyPot();
  }
  const inventory = createInventory(saved?.inventory ?? START_INVENTORY);
  // a save from before lettuce + radish (v < 2) gets the starting seeds once
  if (saved && !(saved.v >= 2)) for (const [id, n] of Object.entries(FARMING.START_SEEDS)) addItem(inventory, `${id}-seed`, n);
  return { pots, inventory };
}

export function serializeFarm(state) {
  return { v: 2, pots: JSON.parse(JSON.stringify(state.pots)), inventory: { ...state.inventory.items } };
}

const cropOf = (pot) => CROPS[pot.crop];

export function canPlant(state, potId, cropId = 'potato') {
  const pot = state.pots[potId];
  return Boolean(pot && pot.stage === STAGE.EMPTY && countOf(state.inventory, CROPS[cropId].seedItem) > 0);
}

/** Put one seed in an empty pot. Occupied pot or no seeds → false. */
export function plantSeed(state, potId, cropId = 'potato') {
  if (!canPlant(state, potId, cropId)) return false;
  removeItem(state.inventory, CROPS[cropId].seedItem, 1);
  Object.assign(state.pots[potId], emptyPot(), { stage: STAGE.SEEDED, crop: cropId });
  return true;
}

/** Add handfuls of soil over the seed. Returns true once it is fully covered. */
export function addCover(state, potId, loads = 1) {
  const pot = state.pots[potId];
  if (!pot || pot.stage !== STAGE.SEEDED) return pot?.stage === STAGE.COVERED;
  const need = cropOf(pot).coverLoads;
  pot.cover = Math.min(need, pot.cover + loads);
  if (pot.cover >= need) pot.stage = STAGE.COVERED;
  return pot.stage === STAGE.COVERED;
}

/** Water drops that actually landed on the soil. Returns true once watering is done. */
export function addWater(state, potId, drops = 1) {
  const pot = state.pots[potId];
  if (!pot || pot.stage !== STAGE.COVERED) return pot?.stage === STAGE.GROWING;
  const need = cropOf(pot).waterNeeded;
  pot.water = Math.min(need, pot.water + drops);
  if (pot.water >= need) {
    pot.stage = STAGE.GROWING;
    pot.growth = 0;
    pot.nights = 0;
  }
  return pot.stage === STAGE.GROWING;
}

/**
 * One night passes. Every watered plant grows one step if it had light today (lit = false:
 * the grow lights were off too long, so nothing grows tonight). Returns ids that are now ready.
 */
export function growOvernight(state, { lit = true } = {}) {
  const ready = [];
  if (!lit) return ready;
  for (const [id, pot] of Object.entries(state.pots)) {
    if (pot.stage !== STAGE.GROWING) continue;
    const need = cropOf(pot).growNights;
    pot.nights = Math.min(need, (pot.nights ?? 0) + 1);
    pot.growth = pot.nights / need;
    if (pot.nights >= need) {
      pot.stage = STAGE.READY;
      ready.push(id);
    }
  }
  return ready;
}

/** Nights still needed before a growing plant is ready (0 when ready). */
export function nightsLeft(pot) {
  if (pot.stage === STAGE.READY) return 0;
  if (pot.stage !== STAGE.GROWING) return null;
  return cropOf(pot).growNights - (pot.nights ?? 0);
}

/** Training Day: every growing plant is ready now (the script says so). */
export function ripenAll(state) {
  const ready = [];
  for (const [id, pot] of Object.entries(state.pots)) {
    if (pot.stage !== STAGE.GROWING) continue;
    pot.nights = cropOf(pot).growNights;
    pot.growth = 1;
    pot.stage = STAGE.READY;
    ready.push(id);
  }
  return ready;
}

/** Visual stage: -1 nothing, 0 sprout, 1 young, 2 bushy, 3 ready. */
export function growthStage(pot) {
  if (pot.stage === STAGE.READY) return 3;
  if (pot.stage !== STAGE.GROWING) return -1;
  return pot.growth < 0.3 ? 0 : pot.growth < 0.75 ? 1 : 2;
}

export const coverFraction = (pot) => (pot.crop ? pot.cover / cropOf(pot).coverLoads : 0);
export const waterFraction = (pot) =>
  pot.stage === STAGE.GROWING || pot.stage === STAGE.READY ? 1 : pot.crop ? pot.water / cropOf(pot).waterNeeded : 0;
export const cutsNeeded = (pot) => (pot.crop ? cropOf(pot).cutsToHarvest : 0);

/**
 * Can the astronaut eat a potato? Never eat the very last one while nothing is growing,
 * or there would be nothing left to plant (a soft-lock).
 * Returns { ok, reason: 'none' | 'last-seed' | null }.
 */
export function canEat(state, item = 'potato') {
  const n = countOf(state.inventory, item);
  if (n <= 0) return { ok: false, reason: 'none' };
  if (item !== 'potato') return { ok: true, reason: null }; // greens are never planted again
  const somethingPlanted = Object.values(state.pots).some((p) => p.stage !== STAGE.EMPTY);
  if (n === 1 && !somethingPlanted) return { ok: false, reason: 'last-seed' };
  return { ok: true, reason: null };
}

/**
 * What F eats next. With the hunger gauge (%) given, the biggest food that fits without
 * wasting any is picked; if nothing fits, the smallest one. Fresh greens go first anyway
 * (they don't keep). null = nothing to eat.
 * foodKg: the food value of one item (gameplay.js FARMING.FOOD_KG_PER_ITEM); spaceKg: room left.
 */
export function nextFood(state, { foodKg = null, spaceKg = Infinity } = {}) {
  for (const id of GREEN_IDS) if (countOf(state.inventory, id) > 0) return id;
  const options = ['potato', 'space-meal'].filter((id) => canEat(state, id).ok);
  if (!options.length) return null;
  if (!foodKg) return options[0];
  const fits = options.filter((id) => foodKg[id] <= spaceKg + 1e-9).sort((a, b) => foodKg[b] - foodKg[a]);
  if (fits.length) return fits[0];
  return options.sort((a, b) => foodKg[a] - foodKg[b])[0];
}

/** Remove one potato (or other food item) to eat it. Returns true if it was eaten. */
export function eatPotato(state, item = 'potato') {
  if (!canEat(state, item).ok) return false;
  return removeItem(state.inventory, item, 1);
}

/**
 * Cut one leafy stem of a ready plant. The stem comes up with the potato on its roots,
 * which goes straight into the inventory. After the last stem the pot is empty.
 */
export function cutLeaf(state, potId) {
  const pot = state.pots[potId];
  if (!pot || pot.stage !== STAGE.READY) return { cut: false, harvested: false, amount: 0 };
  const crop = cropOf(pot);
  pot.cuts += 1;
  addItem(state.inventory, crop.harvestItem, crop.perStem);
  const harvested = pot.cuts >= crop.cutsToHarvest;
  if (harvested) Object.assign(pot, emptyPot());
  return { cut: true, harvested, item: crop.harvestItem, amount: crop.perStem };
}
