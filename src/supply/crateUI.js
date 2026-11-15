// crateUI.js — the opened cargo crate (HTML overlay): contents, where each goes, and a
// "Collect supplies" button for the ticked items. Anything not collected stays in the crate.
import { SUPPLY } from '../config/gameplay.js';
import { CATALOG, unitEffect } from './catalog.js';
import { unitsThatFit } from './delivery.js';
import { sfx } from './sfx.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const DEST = { inventory: 'Your inventory', tank: 'Electrolysis water tank', battery: 'Base battery' };

export function createCrateUI({ root, getTargets, onCollect, onClose }) {
  const el = document.createElement('div');
  el.className = 'supply-overlay';
  el.hidden = true;
  root.appendChild(el);
  let order = null;
  let ticked = {};

  function render() {
    const t = getTargets();
    const entries = Object.entries(order.crate ?? {});
    el.innerHTML = `
      <div class="supply-card crate" role="dialog" aria-label="Cargo crate ${order.id}">
        <header class="supply-head">
          <div class="supply-title"><span class="supply-dot"></span>CARGO CRATE · ${order.id}</div>
          <button type="button" class="supply-close" data-close><span class="keycap">E</span> Close</button>
        </header>
        <div class="supply-body">
          <ul class="crate-list">
            ${entries
              .map(([id, n]) => {
                const c = CATALOG[id];
                const fits = unitsThatFit(id, n, t);
                const warn =
                  fits < n
                    ? `<span class="supply-warn inline">${fits === 0 ? 'No room' : `Room for ${fits}`}: the ${c.to === 'tank' ? `tank holds ${SUPPLY.WATER_TANK_MAX_KG} kg` : 'battery is almost full'}. The rest stays in the crate.</span>`
                    : '';
                return `<li>
                  <label class="crate-row">
                    <input type="checkbox" data-id="${id}" ${ticked[id] ? 'checked' : ''}>
                    <span class="supply-icon">${c.icon}</span>
                    <span class="crate-text"><b>${n}× ${esc(c.name)}</b>
                      <span>${esc(unitEffect(id))} each → ${DEST[c.to]}</span>${warn}</span>
                  </label>
                </li>`;
              })
              .join('')}
          </ul>
          <div class="supply-actions">
            <button type="button" class="supply-secondary" data-close>Leave in crate</button>
            <button type="button" class="btn supply-confirm" data-collect ${Object.values(ticked).some(Boolean) ? '' : 'disabled'}>Collect supplies</button>
          </div>
        </div>
      </div>`;
  }

  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.addEventListener('change', (e) => {
    const id = e.target.dataset?.id;
    if (!id) return;
    ticked[id] = e.target.checked;
    sfx.click();
    render();
  });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.close !== undefined) return onClose('done');
    if (b.dataset.collect !== undefined) {
      const selection = Object.fromEntries(Object.entries(order.crate ?? {}).map(([id, n]) => [id, ticked[id] ? n : 0]));
      onCollect(order, selection);
    }
  });

  return {
    get isOpen() {
      return order !== null;
    },
    get orderId() {
      return order?.id ?? null;
    },
    open(o) {
      order = o;
      ticked = Object.fromEntries(Object.keys(o.crate ?? {}).map((id) => [id, true]));
      el.hidden = false;
      sfx.unlock();
      sfx.open();
      render();
    },
    close() {
      order = null;
      el.hidden = true;
    },
  };
}
