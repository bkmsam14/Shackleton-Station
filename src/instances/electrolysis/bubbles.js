// bubbles.js — Bubble Detective (DOM). Gas bubbles rise from the two electrodes of the
// water cell; the kid says which gas each one is. The bubble's electrode is the clue:
// hydrogen forms at the NEGATIVE (−) electrode, oxygen at the POSITIVE (+) one, and there
// are twice as many hydrogen bubbles (2 H₂O → 2 H₂ + O₂). Science: docs/SCIENCE.md,
// "Water is H₂O" (RSC). Left out: ions, the membrane, bubble sizes.
//
// No fail state: a wrong answer gets a hint and the bubble waits for the right one.
import { sfx } from '../../ui/sfx.js';
import { bubbleCount, bubbleSequence, electrodeFor } from './minigames.js';

const RISE_MS = 1600;

/**
 * mount: element to draw into; zaps: the batch size (sets how many bubbles);
 * onComplete({ hits, misses, heatMisses: 0, seconds })
 */
export function createBubbleGame({ mount, zaps, announce, onComplete, onTip }) {
  const seq = bubbleSequence(bubbleCount(zaps));
  const total = { h2: seq.filter((g) => g === 'h2').length, o2: seq.filter((g) => g === 'o2').length };
  const root = document.createElement('div');
  root.className = 'bd';
  root.innerHTML = `
    <div class="bd-stage">
      <div class="bd-tank bd-tank-h" aria-hidden="true"><span class="bd-tank-name">H₂</span><i class="bd-fill"></i><b class="bd-count">0</b></div>
      <div class="bd-cell" aria-hidden="true">
        <div class="bd-water"></div>
        <div class="bd-electrode bd-minus"><span>−</span></div>
        <div class="bd-electrode bd-plus"><span>+</span></div>
        <div class="bd-bubble" hidden><span>?</span></div>
        <p class="bd-pop" hidden></p>
      </div>
      <div class="bd-tank bd-tank-o" aria-hidden="true"><span class="bd-tank-name">O₂</span><i class="bd-fill"></i><b class="bd-count">0</b></div>
    </div>
    <div class="bd-answers">
      <button type="button" class="ez-btn bd-ans bd-ans-h" data-gas="h2"><kbd>←</kbd><span><b>H₂</b> hydrogen</span></button>
      <span class="bd-left" aria-live="polite"></span>
      <button type="button" class="ez-btn bd-ans bd-ans-o" data-gas="o2"><span><b>O₂</b> oxygen</span><kbd>→</kbd></button>
    </div>`;
  mount.appendChild(root);
  const bubble = root.querySelector('.bd-bubble');
  const pop = root.querySelector('.bd-pop');
  const left = root.querySelector('.bd-left');
  const tanks = { h2: root.querySelector('.bd-tank-h'), o2: root.querySelector('.bd-tank-o') };
  const got = { h2: 0, o2: 0 };
  const start = performance.now();
  let i = -1;
  let hits = 0;
  let misses = 0;
  let wrongThisBubble = false;
  let busy = false;
  let destroyed = false;
  const timers = new Set();
  const later = (fn, ms) => {
    const t = setTimeout(() => {
      timers.delete(t);
      if (!destroyed) fn();
    }, ms);
    timers.add(t);
  };

  function showPop(text, tone) {
    pop.hidden = false;
    pop.className = `bd-pop is-${tone}`;
    pop.innerHTML = text;
  }

  function next() {
    i++;
    if (i >= seq.length) {
      showPop(`<b>${got.h2} H₂ and ${got.o2} O₂</b> — twice as much hydrogen!`, 'good');
      announce(`All bubbles sorted: ${got.h2} hydrogen and ${got.o2} oxygen. Twice as much hydrogen!`);
      sfx.success();
      later(() => onComplete({ hits, misses, heatMisses: 0, seconds: (performance.now() - start) / 1000 }), 1600);
      return;
    }
    wrongThisBubble = false;
    const side = electrodeFor(seq[i]);
    bubble.hidden = false;
    bubble.className = `bd-bubble from-${side}`;
    bubble.querySelector('span').textContent = '?';
    void bubble.offsetWidth; // restart the rise animation
    bubble.classList.add('is-rising');
    const n = seq.length - i;
    left.textContent = `${n} ${n === 1 ? 'bubble' : 'bubbles'} left`;
    announce(`A bubble rises from the ${side === 'minus' ? 'minus' : 'plus'} electrode. Hydrogen or oxygen?`);
    busy = true;
    later(() => (busy = false), Math.min(500, RISE_MS));
  }

  function answer(gas) {
    if (destroyed || i < 0 || i >= seq.length || busy) return;
    const right = gas === seq[i];
    if (!right) {
      misses++;
      wrongThisBubble = true;
      sfx.miss();
      bubble.classList.remove('is-shake');
      void bubble.offsetWidth;
      bubble.classList.add('is-shake');
      const from = electrodeFor(seq[i]) === 'minus' ? '−' : '+';
      showPop(`Look where it came from: the <b>${from}</b> side makes <b>${seq[i] === 'h2' ? 'hydrogen' : 'oxygen'}</b>.`, 'hint');
      announce(`Not quite. It came from the ${from === '−' ? 'minus' : 'plus'} side.`);
      return;
    }
    if (!wrongThisBubble) hits++;
    // Volt explains it the first time each thing happens
    if (got[gas] === 0) onTip?.(gas);
    else if (gas === 'h2' && got.h2 + 1 === 4 && got.o2 >= 2) onTip?.('ratio');
    else if (gas === 'o2' && got.o2 + 1 === 2 && got.h2 >= 4) onTip?.('ratio');
    sfx.click();
    sfx.fizz();
    busy = true;
    pop.hidden = true;
    bubble.querySelector('span').textContent = gas === 'h2' ? 'H₂' : 'O₂';
    bubble.classList.add(`is-${gas}`, `to-${gas === 'h2' ? 'left' : 'right'}`);
    got[gas]++;
    later(() => {
      bubble.hidden = true;
      const t = tanks[gas];
      t.querySelector('.bd-count').textContent = got[gas];
      // both tanks use the same step per bubble, so the H₂ tank ends twice as tall
      t.querySelector('.bd-fill').style.height = `${(got[gas] / total.h2) * 100}%`;
      t.classList.remove('is-bump');
      void t.offsetWidth;
      t.classList.add('is-bump');
      next();
    }, 520);
  }

  root.querySelectorAll('.bd-ans').forEach((b) => b.addEventListener('click', () => answer(b.dataset.gas)));
  later(next, 300);

  return {
    onKey(e) {
      if (e.code === 'ArrowLeft' || e.code === 'KeyH') {
        e.preventDefault();
        answer('h2');
        return true;
      }
      if (e.code === 'ArrowRight' || e.code === 'KeyO') {
        e.preventDefault();
        answer('o2');
        return true;
      }
      return false;
    },
    destroy() {
      destroyed = true;
      for (const t of timers) clearTimeout(t);
      root.remove();
    },
  };
}
