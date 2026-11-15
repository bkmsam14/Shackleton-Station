// airlockFactCard.js — Volt explains one airlock fact while the airlock cycles: a small card
// (left side) with a looping picture and two short lines. It never blocks the game: it stays
// up while you walk on, and fades after AIRLOCK.FACT_SECONDS (or when you press "Got it").
// Pictures are small SVG loops (styled in airlockFactCard.css under .af-*).
import './airlockFactCard.css';
import { AIRLOCK } from '../config/gameplay.js';
import { voltBot } from '../instances/electrolysis/icons.js';

const INK = '#10182c';
const svg = (body, label) =>
  `<svg class="af-art" viewBox="0 0 200 130" role="img" aria-label="${label}">
     <rect x="2" y="2" width="196" height="126" rx="16" fill="#1b2a52" stroke="${INK}" stroke-width="3"/>${body}</svg>`;
const door = (x, cls = '') => `<g class="${cls}"><rect x="${x}" y="30" width="22" height="72" rx="6" fill="#ffb547" stroke="${INK}" stroke-width="3"/><circle cx="${x + 11}" cy="66" r="3" fill="${INK}"/></g>`;
const room = (x, w, fill) => `<rect x="${x}" y="26" width="${w}" height="80" rx="8" fill="${fill}" stroke="${INK}" stroke-width="3"/>`;
const dots = (x0, x1, cls, n = 7) =>
  Array.from({ length: n }, (_, i) => `<circle class="${cls}" style="--d:${(i * 0.23).toFixed(2)}s" cx="${x0 + ((x1 - x0) * ((i * 37) % 100)) / 100}" cy="${40 + ((i * 29) % 56)}" r="4" fill="#9fe8ff"/>`).join('');
/** A pressure dial; cls animates the needle (af-fall / af-rise). */
const dial = (x, y, cls) =>
  `<g><circle cx="${x}" cy="${y}" r="17" fill="#0d1531" stroke="${INK}" stroke-width="3"/>
     <g class="${cls}"><line x1="${x}" y1="${y}" x2="${x}" y2="${y - 12}" stroke="#ffc94a" stroke-width="3.5" stroke-linecap="round"/></g>
     <circle cx="${x}" cy="${y}" r="3" fill="#ffc94a"/></g>`;

export const AIRLOCK_ART = {
  twoDoors: svg(
    `${room(14, 52, '#24365f')}<text x="40" y="118" text-anchor="middle" font-size="12" font-weight="800" fill="#c9d4e8">base</text>
     ${room(78, 44, '#2d3c72')}<text x="100" y="118" text-anchor="middle" font-size="12" font-weight="800" fill="#c9d4e8">airlock</text>
     <text x="160" y="118" text-anchor="middle" font-size="12" font-weight="800" fill="#c9d4e8">space</text>
     ${door(66, 'af-door-a')}${door(122, 'af-door-b')}`,
    'A base, an airlock and space, with a door on each side of the airlock: only one door is open at a time',
  ),
  depress: svg(
    `${room(30, 90, '#2d3c72')}${dots(40, 110, 'af-leave', 8)}
     <rect x="120" y="30" width="16" height="72" rx="5" fill="#ffb547" stroke="${INK}" stroke-width="3"/>
     ${[40, 58, 76, 94].map((y) => `<path class="af-push" d="M104 ${y} h12" stroke="#ff9b85" stroke-width="4" stroke-linecap="round"/>`).join('')}
     ${dial(166, 64, 'af-fall')}`,
    'Air pushes on the hatch; as the pumps take the air out the pushing stops and the pressure needle falls',
  ),
  saveAir: svg(
    `${room(14, 70, '#24365f')}${room(96, 56, '#2d3c72')}
     <path class="af-flow" d="M120 60 H70" stroke="#9fe8ff" stroke-width="6" stroke-linecap="round" stroke-dasharray="10 8"/>
     <path d="M74 50 l-12 10 l12 10" fill="#9fe8ff"/>
     <g class="af-puff"><circle cx="170" cy="64" r="5" fill="#9fe8ff"/></g>
     <text x="48" y="118" text-anchor="middle" font-size="12" font-weight="800" fill="#c9d4e8">most → base</text>
     <text x="172" y="118" text-anchor="middle" font-size="12" font-weight="800" fill="#c9d4e8">a little</text>`,
    'Pumps move most of the air from the airlock back into the base; only a tiny puff goes out into space',
  ),
  prebreathe: svg(
    `<circle cx="70" cy="58" r="30" fill="#e9eef7" stroke="${INK}" stroke-width="3"/>
     <rect x="52" y="44" width="36" height="24" rx="10" fill="#0d1531" stroke="${INK}" stroke-width="2.5"/>
     ${[0, 1, 2].map((i) => `<g class="af-n2" style="--d:${i * 0.8}s"><circle cx="${60 + i * 10}" cy="98" r="6" fill="#c9d4e8" stroke="${INK}" stroke-width="2"/><text x="${60 + i * 10}" y="101" text-anchor="middle" font-size="7" font-weight="800" fill="${INK}">N</text></g>`).join('')}
     <g class="af-o2"><circle cx="150" cy="50" r="9" fill="#ff6b6b" stroke="${INK}" stroke-width="2"/><circle cx="164" cy="50" r="9" fill="#ff6b6b" stroke="${INK}" stroke-width="2"/></g>
     <path d="M134 56 h-26" stroke="#ffc94a" stroke-width="5" stroke-linecap="round"/><path d="M112 47 l-10 9 l10 9" fill="#ffc94a"/>
     <text x="157" y="80" text-anchor="middle" font-size="12" font-weight="800" fill="#ffb3b3">pure O₂</text>
     <text x="72" y="122" text-anchor="middle" font-size="11" font-weight="800" fill="#c9d4e8">nitrogen out</text>`,
    'Breathing pure oxygen before a spacewalk: nitrogen bubbles leave the body',
  ),
  visor: svg(
    `<circle cx="80" cy="66" r="40" fill="#e9eef7" stroke="${INK}" stroke-width="3"/>
     <path d="M48 58 a32 26 0 0 1 64 0 v10 a32 22 0 0 1 -64 0z" fill="#e3a83b" stroke="${INK}" stroke-width="3"/>
     <path d="M56 56 q10 -10 22 -12" stroke="#fff3c4" stroke-width="4" fill="none" stroke-linecap="round"/>
     <circle cx="170" cy="30" r="12" fill="#ffc94a" stroke="${INK}" stroke-width="2.5"/>
     ${[0, 1, 2].map((i) => `<path class="af-ray" style="--d:${i * 0.4}s" d="M160 ${38 + i * 8} L114 ${56 + i * 6}" stroke="#ffe27a" stroke-width="3" stroke-linecap="round"/>`).join('')}
     ${[0, 1, 2].map((i) => `<path class="af-bounce" style="--d:${0.6 + i * 0.4}s" d="M114 ${56 + i * 6} L150 ${92 + i * 8}" stroke="#ffe27a" stroke-width="3" stroke-linecap="round" stroke-dasharray="5 5"/>`).join('')}`,
    'A helmet with a gold sun visor; sunlight bounces off it',
  ),
  repress: svg(
    `${room(30, 90, '#2d3c72')}${dots(40, 110, 'af-enter', 8)}
     <path class="af-flow" d="M14 64 H38" stroke="#9fe8ff" stroke-width="6" stroke-linecap="round" stroke-dasharray="10 8"/>
     ${dial(166, 64, 'af-rise')}
     <text x="166" y="100" text-anchor="middle" font-size="12" font-weight="800" fill="#7be0a0">match!</text>`,
    'Air flows back into the airlock until its pressure matches the base',
  ),
  dust: svg(
    `<path d="M50 40 h36 v44 h20 q8 0 8 10 v6 h-64z" fill="#e9eef7" stroke="${INK}" stroke-width="3"/>
     ${[[58, 92], [70, 96], [84, 90], [96, 97], [64, 84], [90, 82], [102, 92]].map(([x, y], i) => `<circle class="af-speck" style="--d:${i * 0.2}s" cx="${x}" cy="${y}" r="2.5" fill="#8a7a66"/>`).join('')}
     <g class="af-brush"><rect x="128" y="52" width="40" height="14" rx="4" fill="#c08a5a" stroke="${INK}" stroke-width="2.5"/>
       ${[0, 1, 2, 3, 4].map((i) => `<line x1="${132 + i * 8}" y1="66" x2="${132 + i * 8}" y2="78" stroke="${INK}" stroke-width="2.5"/>`).join('')}</g>`,
    'A boot covered in sharp Moon dust being brushed off',
  ),
};

/** The card. voice: Volt's voice (optional). Returns { show(fact), hide() }. */
export function createAirlockFactCard(root, { voice = null } = {}) {
  const el = document.createElement('aside');
  el.className = 'af-card';
  el.hidden = true;
  el.setAttribute('aria-live', 'polite');
  root.appendChild(el);
  let timer = 0;
  const hide = () => {
    clearTimeout(timer);
    el.classList.remove('is-on');
    timer = setTimeout(() => (el.hidden = true), 400);
  };
  return {
    show(fact) {
      clearTimeout(timer);
      el.innerHTML = `
        <div class="af-head">${voltBot('wow')}<div><p class="af-kicker">VOLT EXPLAINS</p><h3>${fact.title}</h3></div></div>
        ${AIRLOCK_ART[fact.art] ?? ''}
        ${fact.lines.map((l) => `<p class="af-line">${l}</p>`).join('')}
        <div class="af-foot"><span class="af-src">Source: <a href="${fact.source.url}" target="_blank" rel="noopener">${fact.source.label}</a></span>
          <button type="button" class="af-ok">Got it</button></div>`;
      el.hidden = false;
      void el.offsetWidth;
      el.classList.add('is-on');
      el.querySelector('.af-ok').addEventListener('click', hide);
      voice?.speak?.(`${fact.title}. ${fact.lines.join(' ').replace(/<[^>]+>/g, '')}`);
      timer = setTimeout(hide, AIRLOCK.FACT_SECONDS * 1000);
    },
    hide,
  };
}
