// inventoryPanel.js — small always-on inventory panel (bottom-right) + F to eat.
// F eats fresh greens first (lettuce, radish: they don't keep), then a potato (potatoes store
// well, and one is always kept to plant again). Food values: gameplay.js → FARMING.FOOD_KG_PER_ITEM
// (USDA kcal × the same game harvest mass per pot).
import { FARMING, FOOD, BVAD } from '../config/gameplay.js';
import { addFood } from '../systems/gauges.js';
import { countOf, removeItem } from './inventory.js';
import { canEat, nextFood } from './farmState.js';
import { sfx } from './sfx.js';

const FOODS = [
  { id: 'potato', label: 'Potatoes', one: 'a potato' },
  { id: 'lettuce', label: 'Lettuce', one: 'a lettuce head' },
  { id: 'radish', label: 'Radishes', one: 'a radish' },
];

export function createInventoryPanel({ root, state, gauges, feedback, getMode, isViewOpen, save, onEvent = () => {} }) {
  const el = document.createElement('div');
  el.className = 'inv-panel';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-label', 'Inventory');
  el.innerHTML = `
    ${FOODS.map(
      (f) => `<span class="inv-food" data-food="${f.id}"${f.id === 'potato' ? '' : ' hidden'}>
        <span class="farm-potato-icon farm-icon-${f.id}" aria-hidden="true"></span>
        <span class="inv-name">${f.label}</span>
        <b class="inv-count" data-count>0</b>
      </span>`,
    ).join('')}
    <span class="inv-eat" data-eat><span class="keycap">F</span> Eat</span>`;
  el.hidden = true;
  root.appendChild(el);
  const chips = Object.fromEntries(FOODS.map((f) => [f.id, el.querySelector(`[data-food="${f.id}"]`)]));
  const eatEl = el.querySelector('[data-eat]');
  const last = {};

  function pop() {
    el.classList.remove('is-pop');
    void el.offsetWidth;
    el.classList.add('is-pop');
  }

  function eat() {
    onEvent('eat-tried'); // the Training Day only asks you to try (you may be told to keep it)
    const food = nextFood(state);
    if (!food) {
      const potatoes = countOf(state.inventory, 'potato');
      if (potatoes === 0) {
        feedback.notify('No food to eat', { long: 'You have no potatoes, lettuce or radishes. Grow some in the greenhouse pots.' });
      } else if (canEat(state).reason === 'last-seed') {
        feedback.notify('Keep this one to plant!', {
          long: 'This is your last potato and nothing is growing. Plant it in a greenhouse pot so you can grow more.',
          tone: 'low',
        });
      }
      return;
    }
    if (gauges.food >= 99) {
      feedback.notify('Not hungry right now');
      return;
    }
    removeItem(state.inventory, food);
    onEvent(`${food}-eaten`);
    const kg = addFood(gauges, FARMING.FOOD_KG_PER_ITEM[food]);
    const pct = (kg / FOOD.CAPACITY_KG) * 100;
    const hours = kg / (BVAD.FOOD_KG_PER_DAY_DRY / 24);
    const kcal = Math.round(FARMING.FOOD_KG_PER_ITEM[food] / FARMING.FOOD_KG_PER_KCAL);
    const name = FOODS.find((f) => f.id === food).one;
    sfx.unlock();
    sfx.crunch();
    pop();
    save();
    const why =
      food === 'potato'
        ? 'Potatoes are full of starch, so they give lots of food energy.'
        : 'Leafy greens and radishes are mostly water: few calories, but fresh vitamins.';
    feedback.notify(`Ate ${name} · +${Math.max(1, Math.round(pct))}% food`, {
      long: `You ate ${name}: about ${kcal} kcal (USDA FoodData Central), +${pct.toFixed(1)} % food ≈ ${hours.toFixed(1)} hours for an astronaut at rest (NASA BVAD). ${why}`,
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyF' || e.repeat) return;
    if (getMode() === 'playing') eat();
  });

  return {
    pop,
    update() {
      const mode = getMode();
      const show = (mode === 'playing' || mode === 'busy') && !isViewOpen();
      if (last.show !== show) el.hidden = !(last.show = show);
      if (!show) return;
      for (const f of FOODS) {
        const n = countOf(state.inventory, f.id);
        if (last[f.id] === n) continue;
        if (last[f.id] !== undefined && n > last[f.id]) pop();
        last[f.id] = n;
        chips[f.id].querySelector('[data-count]').textContent = String(n);
        if (f.id !== 'potato') chips[f.id].hidden = n === 0;
      }
      const can = nextFood(state) !== null;
      if (last.can !== can) eatEl.classList.toggle('is-off', !(last.can = can));
    },
  };
}
