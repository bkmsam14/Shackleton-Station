// inventory.js — the astronaut's item store (pure logic, no Three.js).
// The game had no inventory before farming, so this is the smallest one that works:
// a map of item id → count. Other features can reuse it later.

export const ITEMS = {
  potato: { name: 'Potato', plural: 'Potatoes', seedName: 'Seed potato' },
};

export function createInventory(saved = {}) {
  const items = {};
  for (const [id, n] of Object.entries(saved ?? {})) {
    if (Number.isFinite(n) && n > 0) items[id] = Math.floor(n);
  }
  return { items };
}

export function countOf(inv, item) {
  return inv.items[item] ?? 0;
}

export function addItem(inv, item, n = 1) {
  inv.items[item] = countOf(inv, item) + n;
  return inv.items[item];
}

/** Returns false (and changes nothing) if there are not enough. */
export function removeItem(inv, item, n = 1) {
  if (countOf(inv, item) < n) return false;
  inv.items[item] -= n;
  return true;
}
