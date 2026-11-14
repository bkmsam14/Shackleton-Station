// voltBubble.js — Volt's speech bubble, drawn in the WORLD above the robot (not in a HUD
// corner, so the main HUD stays minimal). Each frame it follows Volt's projected head
// position. When Volt is off-screen or behind you, the bubble docks at the screen edge
// next to a small Volt face that points toward him.
import * as THREE from 'three';
import { voltBot } from '../instances/electrolysis/icons.js';
import { ASSISTANT } from '../config/gameplay.js';
import { TOUR_SKIP_HINT } from '../data/voltLines.js';
import './voltBubble.css';

const EDGE_MARGIN = 64; // px from the screen edge for the docked marker
const HEAD_OFFSET_PX = 18; // bubble sits this far above the projected head

export function createVoltBubble(root) {
  const el = document.createElement('div');
  el.className = 'volt-say';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  el.innerHTML = `
    <div class="volt-pin" aria-hidden="true">${voltBot('happy')}</div>
    <div class="volt-bubble"><p class="volt-text"></p><p class="volt-skip" hidden>${TOUR_SKIP_HINT}</p></div>`;
  root.appendChild(el);
  const pin = el.querySelector('.volt-pin');
  const textEl = el.querySelector('.volt-text');
  const skipEl = el.querySelector('.volt-skip');

  let showFor = 0;
  let visible = false;
  let mood = 'happy';
  const v = new THREE.Vector3();

  function setMood(m) {
    if (m === mood) return;
    mood = m;
    pin.innerHTML = voltBot(m);
  }

  return {
    /** Show a line. line: { text, mood, tour } */
    say(line) {
      textEl.textContent = line.text;
      skipEl.hidden = !line.tour;
      setMood(line.mood ?? 'happy');
      const words = line.text.split(/\s+/).length;
      showFor = ASSISTANT.BUBBLE_BASE_S + words * ASSISTANT.BUBBLE_PER_WORD_S + (line.tour ? 3 : 0);
      el.classList.remove('is-pop');
      void el.offsetWidth;
      el.classList.add('is-pop');
      visible = true;
    },
    hide() {
      showFor = 0;
    },
    get isShowing() {
      return visible && showFor > 0;
    },
    /**
     * Place the bubble. headWorld: THREE.Vector3; enabled = false hides everything
     * (menus, PDA, mini-games).
     */
    update(dt, camera, headWorld, enabled = true) {
      showFor = Math.max(0, showFor - dt);
      const on = enabled && showFor > 0;
      el.classList.toggle('is-on', on);
      if (!on) {
        visible = false;
        return;
      }
      const w = window.innerWidth;
      const h = window.innerHeight;
      v.copy(headWorld).project(camera);
      const behind = v.z > 1;
      let x = ((v.x + 1) / 2) * w;
      let y = ((1 - v.y) / 2) * h;
      if (behind) {
        // behind the camera the projection flips: mirror it and push it to the bottom edge
        x = w - x;
        y = h;
      }
      const offscreen = behind || x < EDGE_MARGIN || x > w - EDGE_MARGIN || y < EDGE_MARGIN || y > h - EDGE_MARGIN;
      if (offscreen) {
        x = Math.min(w - EDGE_MARGIN, Math.max(EDGE_MARGIN, x));
        y = Math.min(h - EDGE_MARGIN, Math.max(EDGE_MARGIN + 40, y));
      }
      el.classList.toggle('is-docked', offscreen);
      // keep the bubble on screen (it grows up and to the right of the anchor)
      const bw = el.offsetWidth || 320;
      const left = Math.min(w - bw - 12, Math.max(12, x - 40));
      el.style.transform = `translate(${left.toFixed(1)}px, ${(y - HEAD_OFFSET_PX).toFixed(1)}px) translateY(-100%)`;
      el.style.setProperty('--pin-x', `${(x - left).toFixed(1)}px`);
    },
  };
}
