// suitVisor.js — the spacesuit helmet you see through when you are outside: a dark helmet
// rim, the visor's curved edge, a soft glass reflection and the chin of the helmet.
// Drawn as one SVG behind the HUD (pointer-events: none), so it costs nothing on the GPU.
// While it is on, the HUD moves inward (class "in-suit" on the UI root) so every readout
// stays inside the glass. In the airlock it is put on / taken off with a short animation
// (the helmet comes down over your eyes, or lifts off).
import './suitVisor.css';

// The visor opening, in a 1000 × 600 box stretched to the screen. The top edge arches up a
// little, the bottom has the helmet's chin rising in the middle.
const OPENING =
  'M 58 100 Q 58 42 122 36 Q 500 6 878 36 Q 942 42 942 100 ' +
  'L 952 476 Q 954 548 888 560 L 640 570 C 606 572 594 552 500 550 C 406 552 394 572 360 570 ' +
  'L 112 560 Q 46 548 48 476 Z';

export function createSuitVisor(root) {
  const el = document.createElement('div');
  el.className = 'suit-visor';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <svg viewBox="0 0 1000 600" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sv-shell" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#10141e"/>
          <stop offset="0.5" stop-color="#05070b"/>
          <stop offset="1" stop-color="#0c0f17"/>
        </linearGradient>
        <linearGradient id="sv-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#3c4559"/>
          <stop offset="0.5" stop-color="#1a1f2c"/>
          <stop offset="1" stop-color="#262c3b"/>
        </linearGradient>
        <clipPath id="sv-in"><path d="${OPENING}"/></clipPath>
        <filter id="sv-soft" x="-0.1" y="-0.1" width="1.2" height="1.2"><feGaussianBlur stdDeviation="9"/></filter>
        <radialGradient id="sv-glass" cx="0.5" cy="0.48" r="0.62">
          <stop offset="0.62" stop-color="#0a1830" stop-opacity="0"/>
          <stop offset="0.9" stop-color="#0a1830" stop-opacity="0.32"/>
          <stop offset="1" stop-color="#050b18" stop-opacity="0.6"/>
        </radialGradient>
        <linearGradient id="sv-shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0.13"/>
          <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="sv-chin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#3a4256"/>
          <stop offset="1" stop-color="#0d1019"/>
        </linearGradient>
      </defs>
      <!-- glass: darker toward the edges, faint blue tint -->
      <path d="${OPENING}" fill="url(#sv-glass)"/>
      <!-- reflections on the curved glass -->
      <path d="M 120 70 Q 300 34 520 40 Q 330 58 150 120 Z" fill="url(#sv-shine)"/>
      <path d="M 880 380 Q 920 300 912 200 Q 930 320 900 430 Z" fill="#ffffff" fill-opacity="0.05"/>
      <!-- helmet shell around the opening -->
      <path d="M -10 -10 H 1010 V 610 H -10 Z ${OPENING}" fill="url(#sv-shell)" fill-rule="evenodd"/>
      <!-- inner shadow where the glass meets the helmet (soft, dark) -->
      <g clip-path="url(#sv-in)">
        <path d="${OPENING}" fill="none" stroke="#000000" stroke-opacity="0.75" stroke-width="34" filter="url(#sv-soft)"/>
      </g>
      <!-- the visor's thick dark rim, with a glossy highlight along it -->
      <path d="${OPENING}" fill="none" stroke="url(#sv-rim)" stroke-width="26" vector-effect="non-scaling-stroke"/>
      <path d="${OPENING}" fill="none" stroke="#000000" stroke-opacity="0.6" stroke-width="3" vector-effect="non-scaling-stroke"/>
      <path d="M 70 300 L 66 100 Q 66 50 124 44 Q 320 22 520 20" fill="none" stroke="#a9b6d0" stroke-opacity="0.35" stroke-width="3" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
      <!-- chin of the helmet (below the opening) -->
      <path d="M 384 600 C 400 576 424 560 500 558 C 576 560 600 576 616 600 Z" fill="url(#sv-chin)"/>
      <path d="M 458 596 Q 500 580 542 596" fill="none" stroke="#5c667e" stroke-width="3" vector-effect="non-scaling-stroke"/>
    </svg>`;
  root.prepend(el); // first child: drawn underneath the HUD and every screen

  let on = false;
  let offTimer = 0;
  return {
    /**
     * Suit on (outside) or off (in a pressurized module).
     * opts.animate: play the helmet going on / coming off (the airlock); otherwise a fade.
     */
    set(value, { animate = false } = {}) {
      if (value === on) return;
      on = value;
      clearTimeout(offTimer);
      el.classList.remove('anim-on', 'anim-off');
      root.classList.toggle('in-suit', on);
      if (!animate) {
        el.classList.toggle('is-on', on);
        return;
      }
      void el.offsetWidth; // restart the animation
      if (on) {
        el.classList.add('is-on', 'anim-on');
      } else {
        el.classList.add('anim-off');
        // keep it drawn until it has lifted away, then hide it
        offTimer = setTimeout(() => {
          if (!on) el.classList.remove('is-on', 'anim-off');
        }, 1000);
      }
    },
    get on() {
      return on;
    },
  };
}
