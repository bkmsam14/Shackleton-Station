// callouts.js — one-time labels that point at a HUD element the first time it appears
// ("Oxygen: drops faster outside!"). "Seen" is stored via save.js (try/catch inside).
import { loadSettings, saveSettings } from '../systems/save.js';

export function createCallouts(root) {
  const el = document.createElement('div');
  el.className = 'callout';
  el.innerHTML = '<span class="callout-line"></span><span class="callout-text"></span>';
  root.appendChild(el);
  const text = el.querySelector('.callout-text');
  const queue = [];
  let busy = false;

  const seen = () => loadSettings().seenCallouts ?? {};
  function markSeen(id) {
    saveSettings({ seenCallouts: { ...seen(), [id]: true } });
  }

  function showNext() {
    if (busy || !queue.length) return;
    const { id, target, label, side } = queue.shift();
    if (seen()[id] || !target || target.offsetParent === null) return showNext();
    busy = true;
    markSeen(id);
    const r = target.getBoundingClientRect();
    text.textContent = label;
    el.dataset.side = side;
    if (side === 'above') {
      el.style.left = `${r.left + r.width / 2}px`;
      el.style.top = `${r.top - 10}px`;
    } else if (side === 'right') {
      el.style.left = `${r.right + 14}px`;
      el.style.top = `${r.top + r.height / 2}px`;
    } else {
      el.style.left = `${r.left + r.width / 2}px`;
      el.style.top = `${r.bottom + 12}px`;
    }
    el.classList.add('is-on');
    setTimeout(() => {
      el.classList.remove('is-on');
      setTimeout(() => {
        busy = false;
        showNext();
      }, 450);
    }, 4200);
  }

  return {
    /** Queue a callout; shown once ever (per browser). side: 'above' | 'right' | 'below' */
    add(id, target, label, side = 'right') {
      if (seen()[id]) return;
      queue.push({ id, target, label, side });
      showNext();
    },
  };
}
