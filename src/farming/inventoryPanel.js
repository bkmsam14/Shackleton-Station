// inventoryPanel.js — small always-on inventory panel (bottom-right) + F to eat a potato.
import { FARMING, FOOD, BVAD } from '../config/gameplay.js';
import { addFood } from '../systems/gauges.js';
import { countOf } from './inventory.js';
import { canEat, eatPotato } from './farmState.js';
import { sfx } from './sfx.js';

export function createInventoryPanel({ root, state, gauges, feedback, getMode, isViewOpen, save }) {
  const el = document.createElement('div');
  el.className = 'inv-panel';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-label', 'Inventory');
  el.innerHTML = `
    <span class="farm-potato-icon" aria-hidden="true"></span>
    <span class="inv-name">Potatoes</span>
    <b class="inv-count" data-count>0</b>
    <span class="inv-eat" data-eat><span class="keycap">F</span> Eat</span>`;
  el.hidden = true;
  root.appendChild(el);
  const countEl = el.querySelector('[data-count]');
  const eatEl = el.querySelector('[data-eat]');
  const last = {};

  function pop() {
    el.classList.remove('is-pop');
    void el.offsetWidth;
    el.classList.add('is-pop');
  }

  function eat() {
    const check = canEat(state);
    if (!check.ok) {
      if (check.reason === 'none') {
        feedback.notify('No potatoes', { long: 'You have no potatoes. Grow some in the greenhouse pots.' });
      } else {
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
    eatPotato(state);
    const kg = addFood(gauges, FARMING.FOOD_KG_PER_POTATO);
    const pct = (kg / FOOD.CAPACITY_KG) * 100;
    const hours = kg / (BVAD.FOOD_KG_PER_DAY_DRY / 24);
    sfx.unlock();
    sfx.crunch();
    pop();
    save();
    feedback.notify(`Ate a potato · +${Math.max(1, Math.round(pct))}% food`, {
      long: `You ate a potato: +${pct.toFixed(1)} % food, about ${hours.toFixed(1)} hours of food for an astronaut at rest (NASA BVAD: 0.8 kg of dry food a day).`,
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
      const n = countOf(state.inventory, 'potato');
      if (last.n !== n) {
        if (last.n !== undefined && n > last.n) pop();
        countEl.textContent = String((last.n = n));
      }
      const can = canEat(state).ok;
      if (last.can !== can) eatEl.classList.toggle('is-off', !(last.can = can));
    },
  };
}
