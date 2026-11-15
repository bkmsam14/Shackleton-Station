// atoms.js — Atom Match (DOM). Two water molecules are split; their atoms float loose.
// The kid joins matching twins: H + H → H₂ (hydrogen gas), O + O → O₂ (oxygen gas).
// Each round shows the whole recipe 2 H₂O → 2 H₂ + O₂ and that no atom is lost
// (docs/SCIENCE.md → Electrolysis; RSC). Left out: in a real cell this happens at the
// electrodes, with ions in between.
//
// No fail state: a wrong pair shakes, Volt's hint shows, and the atoms stay to try again.
import { sfx } from '../../ui/sfx.js';
import { atomRounds, createAtomRound, tapAtom } from './minigames.js';

// where the six loose atoms float (percent of the play area), shuffled per round
const SPOTS = [
  [16, 30],
  [38, 22],
  [62, 30],
  [84, 24],
  [26, 70],
  [50, 62],
  [74, 72],
];
const NAME = { H: 'hydrogen', O: 'oxygen' };

/** onComplete({ hits, misses, heatMisses: 0, seconds }) */
export function createAtomGame({ mount, zaps, announce, onComplete, onTip }) {
  const rounds = atomRounds(zaps);
  const root = document.createElement('div');
  root.className = 'am';
  root.innerHTML = `
    <div class="am-recipe" aria-hidden="true">
      <span class="am-water">2 H₂O</span><span class="am-arrow">→</span>
      <span class="am-goal am-goal-h"><b>2</b> H₂</span><span class="am-plus">+</span><span class="am-goal am-goal-o"><b>1</b> O₂</span>
    </div>
    <div class="am-stage">
      <div class="am-bin am-bin-h" aria-hidden="true"><span class="am-bin-name">H₂</span><b class="am-bin-count">0</b></div>
      <div class="am-field" role="group" aria-label="Loose atoms"></div>
      <div class="am-bin am-bin-o" aria-hidden="true"><span class="am-bin-name">O₂</span><b class="am-bin-count">0</b></div>
    </div>
    <p class="am-msg" aria-live="polite"></p>
    <p class="am-round"></p>`;
  mount.appendChild(root);
  const field = root.querySelector('.am-field');
  const msg = root.querySelector('.am-msg');
  const roundEl = root.querySelector('.am-round');
  const bins = { H2: root.querySelector('.am-bin-h'), O2: root.querySelector('.am-bin-o') };
  const totals = { H2: 0, O2: 0 };
  const start = performance.now();
  let r = 0;
  let round = null;
  let hits = 0;
  let misses = 0;
  let destroyed = false;
  let locked = false;
  const timers = new Set();
  const later = (fn, ms) => {
    const t = setTimeout(() => {
      timers.delete(t);
      if (!destroyed) fn();
    }, ms);
    timers.add(t);
  };

  function say(html, tone = 'info') {
    msg.className = `am-msg is-${tone}`;
    msg.innerHTML = html;
  }

  function startRound() {
    round = createAtomRound();
    const spots = [...SPOTS].sort(() => Math.random() - 0.5);
    field.innerHTML = round.atoms
      .map(
        (a, k) => `<button type="button" class="am-atom am-${a.el}" data-id="${a.id}" style="--x:${spots[k][0]}%;--y:${spots[k][1]}%;--d:${k * 0.07}s" aria-label="${NAME[a.el]} atom">${a.el}</button>`,
      )
      .join('');
    field.classList.remove('is-split');
    void field.offsetWidth;
    field.classList.add('is-split'); // atoms fly out of the two broken water molecules
    roundEl.textContent = `Water pair ${r + 1} of ${rounds}`;
    say('Two water molecules split! Tap two <b>matching</b> atoms to join them.');
    announce(`Round ${r + 1} of ${rounds}. Four hydrogen atoms and two oxygen atoms. Tap two matching atoms to join them.`);
    locked = false;
  }

  function btn(id) {
    return field.querySelector(`[data-id="${id}"]`);
  }

  function onTap(id) {
    if (locked || destroyed) return;
    const res = tapAtom(round, id);
    if (res.type === 'select') {
      sfx.click();
      btn(id).classList.add('is-picked');
    } else if (res.type === 'deselect') {
      btn(id).classList.remove('is-picked');
    } else if (res.type === 'mismatch') {
      misses++;
      sfx.miss();
      for (const k of [res.first, id]) {
        const b = btn(k);
        b.classList.remove('is-picked', 'is-shake');
        void b.offsetWidth;
        b.classList.add('is-shake');
      }
      say('Those aren’t twins! Join <b>H with H</b> or <b>O with O</b>.', 'hint');
      announce('Not twins. Join hydrogen with hydrogen, or oxygen with oxygen.');
    } else if (res.type === 'pair') {
      hits++;
      sfx.success();
      const side = res.molecule === 'H2' ? 'left' : 'right';
      for (const k of res.ids) {
        const b = btn(k);
        b.classList.remove('is-picked');
        b.classList.add('is-paired', `to-${side}`);
        b.disabled = true;
      }
      if (totals[res.molecule] === 0) onTip?.(res.molecule); // first H₂ / first O₂: Volt says what it is
      totals[res.molecule]++;
      later(() => {
        const bin = bins[res.molecule];
        bin.querySelector('.am-bin-count').textContent = totals[res.molecule];
        bin.classList.remove('is-bump');
        void bin.offsetWidth;
        bin.classList.add('is-bump');
      }, 450);
      const gas = res.molecule === 'H2' ? '<b>H₂</b>, hydrogen gas' : '<b>O₂</b>, oxygen gas: we breathe it!';
      say(`Joined! ${gas}`, 'good');
      announce(res.molecule === 'H2' ? 'Hydrogen gas made.' : 'Oxygen gas made. We breathe it!');
      if (res.done) finishRound();
    }
  }

  function finishRound() {
    locked = true;
    later(() => {
      say('<b>2 H₂O → 2 H₂ + O₂</b>. Every atom is still here, just in new pairs!', 'good');
      r++;
      later(() => {
        if (r >= rounds) {
          onComplete({ hits, misses, heatMisses: 0, seconds: (performance.now() - start) / 1000 });
        } else startRound();
      }, 1700);
    }, 600);
  }

  field.addEventListener('click', (e) => {
    const b = e.target.closest('.am-atom');
    if (b && !b.disabled) onTap(Number(b.dataset.id));
  });
  startRound();

  return {
    onKey() {
      return false; // atoms are buttons: Tab + Enter/Space work on their own
    },
    destroy() {
      destroyed = true;
      for (const t of timers) clearTimeout(t);
      root.remove();
    },
  };
}
