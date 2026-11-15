// terminalUI.js — the supply terminal screen (HTML overlay).
// Tab 1 "New request": pick supplies + quantities, see mass, delays and arrival, confirm.
// Tab 2 "Orders": every order with its status, a live countdown and a progress bar.
import { SUPPLY, POWER } from '../config/gameplay.js';
import { CATALOG, CATALOG_IDS, unitEffect } from './catalog.js';
import { validateOrder, estimateSeconds, secondsUntilArrival, STAGE_LABEL, STAGE_GROUP, gameHoursToPlaySeconds } from './orders.js';
import { oneWayDelaySeconds } from './commDelay.js';
import { countOf } from '../farming/inventory.js';
import { sfx } from './sfx.js';

const GROUPS = ['Pending', 'Awaiting confirmation', 'Approved · being prepared', 'Dispatched', 'Arrived', 'Collected'];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** play seconds → "0.9 s", "42 s", "3:05" */
export function fmtSeconds(s) {
  if (s < 10) return `${Math.max(0, s).toFixed(1)} s`;
  if (s < 60) return `${Math.ceil(s)} s`;
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.ceil(s - m * 60) % 60).padStart(2, '0')}`;
}
const fmtHours = (h) => (h < 1 ? `${Math.round(h * 60)} min` : `${+h.toFixed(1)} h`);
const itemsSummary = (items) =>
  Object.entries(items)
    .map(([id, n]) => `${n}× ${CATALOG[id]?.name ?? id}`)
    .join(', ');

export function createTerminalUI({ root, state, getTargets, onConfirm, onClose, getPace = () => 1 }) {
  const el = document.createElement('div');
  el.className = 'supply-overlay';
  el.hidden = true;
  el.innerHTML = `
    <div class="supply-card" role="dialog" aria-label="Supply terminal">
      <header class="supply-head">
        <div class="supply-title"><span class="supply-dot"></span>SUPPLY UPLINK</div>
        <div class="supply-link">Earth link · ${SUPPLY.EARTH_MOON_DISTANCE_KM.toLocaleString('en-US')} km · signal ${oneWayDelaySeconds().toFixed(2)} s each way</div>
        <button type="button" class="supply-close" data-close><span class="keycap">E</span> Close</button>
      </header>
      <div class="supply-tabs" role="tablist">
        <button type="button" role="tab" data-tab="request">New request</button>
        <button type="button" role="tab" data-tab="orders">Orders <b data-active-count></b></button>
      </div>
      <div class="supply-body" data-body></div>
    </div>`;
  root.appendChild(el);
  const body = el.querySelector('[data-body]');
  const activeCount = el.querySelector('[data-active-count]');

  let open = false;
  let tab = 'request';
  let draft = {}; // id → units in the order being built
  const pick = Object.fromEntries(CATALOG_IDS.map((id) => [id, 1])); // quantity selector per item
  let flash = null; // id of a just-placed order to highlight
  let refresh = 0;

  // ------------------------------------------------------------------ helpers
  function have(id) {
    const t = getTargets();
    const c = CATALOG[id];
    if (c.to === 'tank') return `Tank: ${t.station.tankKg.toFixed(1)} / ${SUPPLY.WATER_TANK_MAX_KG} kg`;
    if (c.to === 'battery') return `Base battery: ${Math.round((t.gauges.batteryKwh / POWER.BATTERY_CAPACITY_KWH) * 100)} %`;
    const n = countOf(t.inventory, c.item);
    return c.item === 'potato' ? `You have: ${n} potatoes` : `You have: ${n} ${n === 1 ? c.unitLabel : c.unitLabel + 's'}`;
  }
  const room = (id) => CATALOG[id].maxPerOrder - (draft[id] ?? 0);

  // ------------------------------------------------------------------ request tab
  function renderRequest() {
    const v = validateOrder(draft);
    const lines = Object.entries(draft);
    const pct = Math.min(100, (v.massKg / SUPPLY.CARGO_CAPACITY_KG) * 100);
    const light = oneWayDelaySeconds();
    const eta = lines.length ? estimateSeconds(draft) : 0;
    const reason =
      v.reason === 'too-heavy'
        ? `Too heavy: the lander carries at most ${SUPPLY.CARGO_CAPACITY_KG} kg.`
        : v.reason === 'empty'
          ? 'Add supplies to start a request.'
          : '';
    body.innerHTML = `
      <div class="supply-cols">
        <section class="supply-items" aria-label="Available supplies">
          ${CATALOG_IDS.map((id) => {
            const c = CATALOG[id];
            const left = room(id);
            const q = Math.min(pick[id], Math.max(1, left));
            return `
            <article class="supply-item">
              <div class="supply-icon">${c.icon}</div>
              <div class="supply-info">
                <h3>${esc(c.name)}</h3>
                <p>${esc(c.desc)}</p>
                <p class="supply-meta">${esc(unitEffect(id))} each · ${c.massKg} kg · max ${c.maxPerOrder} per order</p>
                <p class="supply-meta">Flight ~${fmtHours(c.deliveryGameHours)} base time (${fmtSeconds(gameHoursToPlaySeconds(c.deliveryGameHours))} of play) · ${esc(have(id))}</p>
              </div>
              <div class="supply-qty">
                <div class="stepper" role="group" aria-label="Quantity of ${esc(c.name)}">
                  <button type="button" data-dec="${id}" aria-label="Fewer" ${q <= 1 || left <= 0 ? 'disabled' : ''}>−</button>
                  <output>${left <= 0 ? 0 : q}</output>
                  <button type="button" data-inc="${id}" aria-label="More" ${q >= left ? 'disabled' : ''}>+</button>
                </div>
                <button type="button" class="btn supply-add" data-add="${id}" ${left <= 0 ? 'disabled' : ''}>${left <= 0 ? 'Max in order' : 'Add to order'}</button>
              </div>
            </article>`;
          }).join('')}
        </section>
        <section class="supply-summary" aria-label="Your order">
          <h3>Your order</h3>
          ${
            lines.length
              ? `<ul class="supply-lines">${lines
                  .map(
                    ([id, n]) => `<li><span class="supply-icon sm">${CATALOG[id].icon}</span><span>${n}× ${esc(CATALOG[id].name)}</span>
                    <span class="supply-mass">${n * CATALOG[id].massKg} kg</span>
                    <button type="button" class="supply-remove" data-remove="${id}" aria-label="Remove ${esc(CATALOG[id].name)}">Remove</button></li>`,
                  )
                  .join('')}</ul>`
              : '<p class="supply-empty">Nothing yet.</p>'
          }
          <div class="supply-cargo" data-state="${v.reason === 'too-heavy' ? 'over' : 'ok'}">
            <div class="supply-cargo-top"><span>Cargo</span><b>${v.massKg} / ${SUPPLY.CARGO_CAPACITY_KG} kg</b></div>
            <div class="supply-bar"><span style="width:${pct}%"></span></div>
          </div>
          <dl class="supply-times">
            <div><dt>Request to Earth</dt><dd>${light.toFixed(2)} s</dd></div>
            <div><dt>Approval back</dt><dd>${light.toFixed(2)} s</dd></div>
            <div><dt>Arrives in about</dt><dd>${lines.length ? fmtSeconds(eta) + ' of play' : '—'}</dd></div>
          </dl>
          <p class="supply-note">Radio signals travel at the speed of light: ${SUPPLY.EARTH_MOON_DISTANCE_KM.toLocaleString('en-US')} km ÷ ${Math.round(SUPPLY.SPEED_OF_LIGHT_KM_S).toLocaleString('en-US')} km/s = ${light.toFixed(2)} s each way. That part is real and not sped up. The cargo flight is shortened for the game.</p>
          ${reason ? `<p class="supply-warn">${esc(reason)}</p>` : ''}
          <div class="supply-actions">
            <button type="button" class="supply-secondary" data-cancel ${lines.length ? '' : 'disabled'}>Cancel</button>
            <button type="button" class="btn supply-confirm" data-confirm ${v.ok ? '' : 'disabled'}>Confirm request</button>
          </div>
        </section>
      </div>`;
  }

  // ------------------------------------------------------------------ orders tab
  function detailFor(o) {
    const s = o.stage;
    const r = fmtSeconds(o.stage === 'reviewing' ? o.remaining / getPace() : o.remaining); // real seconds (review follows the base clock)
    if (s === 'transmitting') return `Signal reaches Earth in ${r} (speed of light)`;
    if (s === 'reviewing') return `Mission Control is checking your request · ${r}`;
    if (s === 'replying') return `Approval on its way back to the Moon · ${r}`;
    if (s === 'preparing') return `Packing the crate onto the lander · arrives in ~${fmtSeconds(secondsUntilArrival(o, getPace()))}`;
    if (s === 'in-transit') return `On its way to the Moon · arrives in ~${fmtSeconds(secondsUntilArrival(o, getPace()))}`;
    if (s === 'holding') return 'The landing pad is full. Collect a crate to make room.';
    if (s === 'landing') return `Coming down onto the cargo pad · ${r}`;
    if (s === 'arrived') return 'On the cargo pad outside. Go out and press E at the crate.';
    return 'Collected.';
  }
  function renderOrders() {
    const orders = state.orders;
    if (!orders.length) {
      body.innerHTML = '<p class="supply-empty big">No orders yet. Use "New request" to order supplies from Earth.</p>';
      return;
    }
    body.innerHTML = GROUPS.map((g) => {
      const list = orders.filter((o) => STAGE_GROUP[o.stage] === g);
      if (!list.length) return '';
      return `<section class="supply-group"><h3>${g}</h3>${list
        .slice()
        .reverse()
        .map((o) => {
          const prog = Number.isFinite(o.duration) && o.duration > 0 ? 1 - o.remaining / o.duration : o.stage === 'arrived' || o.stage === 'collected' ? 1 : 0;
          return `<article class="supply-order ${o.id === flash ? 'is-new' : ''}" data-stage="${o.stage}">
            <div class="supply-order-top"><b>${o.id}</b><span class="supply-status">${STAGE_LABEL[o.stage]}</span></div>
            <p class="supply-order-items">${esc(itemsSummary(o.stage === 'arrived' && o.crate ? o.crate : o.items))}</p>
            <p class="supply-order-detail">${esc(detailFor(o))}</p>
            ${o.stage === 'collected' ? '' : `<div class="supply-bar"><span style="width:${Math.round(prog * 100)}%"></span></div>`}
          </article>`;
        })
        .join('')}</section>`;
    }).join('');
  }

  function render() {
    el.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    const active = state.orders.filter((o) => o.stage !== 'collected').length;
    activeCount.textContent = active ? `(${active})` : '';
    if (tab === 'request') renderRequest();
    else renderOrders();
  }

  // ------------------------------------------------------------------ events
  el.addEventListener('pointerdown', (e) => e.stopPropagation()); // no drag-to-look behind the panel
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    sfx.unlock();
    if (b.dataset.close !== undefined) return onClose('done');
    if (b.dataset.tab) {
      tab = b.dataset.tab;
      sfx.click();
      return render();
    }
    const id = b.dataset.inc ?? b.dataset.dec ?? b.dataset.add ?? b.dataset.remove;
    if (b.dataset.inc) pick[id] = Math.min(room(id), pick[id] + 1);
    else if (b.dataset.dec) pick[id] = Math.max(1, pick[id] - 1);
    else if (b.dataset.add) {
      const n = Math.min(room(id), pick[id]);
      if (n > 0) draft[id] = (draft[id] ?? 0) + n;
      pick[id] = 1;
    } else if (b.dataset.remove) delete draft[id];
    else if (b.dataset.cancel !== undefined) draft = {};
    else if (b.dataset.confirm !== undefined) {
      const order = onConfirm({ ...draft });
      if (order) {
        draft = {};
        flash = order.id;
        tab = 'orders';
      }
    }
    sfx.click();
    render();
  });

  return {
    get isOpen() {
      return open;
    },
    open(startTab = null) {
      open = true;
      el.hidden = false;
      tab = startTab ?? (state.orders.some((o) => o.stage !== 'collected') && !Object.keys(draft).length ? 'orders' : 'request');
      render();
    },
    close() {
      open = false;
      el.hidden = true;
      flash = null;
    },
    /** Called every frame while open: live countdowns on the Orders tab. */
    update(frameDt) {
      if (!open) return;
      refresh += frameDt;
      if (refresh < 0.2) return;
      refresh = 0;
      if (tab === 'orders') render();
      else {
        const active = state.orders.filter((o) => o.stage !== 'collected').length;
        activeCount.textContent = active ? `(${active})` : '';
      }
    },
  };
}
