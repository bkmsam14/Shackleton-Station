// tutorialArt.js — picture panels for the Leak Fix "How to play" cards and the
// "What really happened?" screens (small looping SVG animations, styled in style.css under
// .tl-*; base .ta styles come from the Electrolysis mini-games). Pictures first, very few words.
//
// Colours: cabin air = soft cyan dots/arrows, the hole = dark dot with a red ring,
// detector = orange, hatches = grey doors (red when closed), pressure needle = yellow.

const INK = '#10182c';
const W = 200;
const H = 130;

const svg = (body, label) =>
  `<svg class="ta" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">
     <rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="16" fill="#1b2a52" stroke="${INK}" stroke-width="3"/>
     ${body}
   </svg>`;
const big = (body, label) =>
  `<svg class="ta ta-big" viewBox="0 0 320 ${H + 30}" role="img" aria-label="${label}">
     <rect x="2" y="2" width="316" height="${H + 26}" rx="16" fill="#1b2a52" stroke="${INK}" stroke-width="3"/>
     ${body}
   </svg>`;

/** A riveted wall panel. */
const wall = (x, y, w, h) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#c9d0d7" stroke="${INK}" stroke-width="3"/>
   ${[0.15, 0.85].flatMap((fx) => [0.18, 0.82].map((fy) => `<circle cx="${x + w * fx}" cy="${y + h * fy}" r="3" fill="#8a96a8"/>`)).join('')}`;
const hole = (x, y, cls = '') => `<g class="${cls}"><circle cx="${x}" cy="${y}" r="9" fill="none" stroke="#ff6b6b" stroke-width="3"/><circle cx="${x}" cy="${y}" r="3.5" fill="${INK}"/></g>`;

/** The ultrasonic leak detector: a handle + a probe tip + bars. */
const detector = (x, y, bars = 3, cls = '') =>
  `<g class="${cls}" transform="translate(${x} ${y})">
     <rect x="-14" y="-6" width="28" height="44" rx="8" fill="#f08a45" stroke="${INK}" stroke-width="3"/>
     <rect x="-4" y="-20" width="8" height="16" rx="3" fill="#4a5468" stroke="${INK}" stroke-width="2.5"/>
     ${[0, 1, 2, 3, 4].map((i) => `<rect x="${-9 + i * 4}" y="${26 - i * 3}" width="3" height="${4 + i * 3}" fill="${i < bars ? '#7be0a0' : '#2a3350'}"/>`).join('')}
   </g>`;

const hatch = (x, y, closed, cls = '') =>
  `<g class="${cls}"><rect x="${x - 7}" y="${y - 22}" width="14" height="44" rx="5" fill="${closed ? '#ff7a59' : '#4a5468'}" stroke="${INK}" stroke-width="3"/>
   <circle cx="${x}" cy="${y}" r="3" fill="${INK}"/></g>`;

/** A round pressure dial; `cls` animates the needle (tl-fall / tl-steady). */
const dial = (x, y, cls) =>
  `<g><circle cx="${x}" cy="${y}" r="17" fill="#0d1531" stroke="${INK}" stroke-width="3"/>
     <path d="M${x - 12} ${y + 6} A13 13 0 0 1 ${x + 12} ${y + 6}" fill="none" stroke="#7be0a0" stroke-width="4"/>
     <g class="${cls}"><line x1="${x}" y1="${y}" x2="${x}" y2="${y - 12}" stroke="#ffc94a" stroke-width="3.5" stroke-linecap="round"/></g>
     <circle cx="${x}" cy="${y}" r="3" fill="#ffc94a"/></g>`;

const cursor = (x, y, cls = 'ta-cursor') =>
  `<g class="${cls}"><path d="M${x} ${y} l0 26 l7 -6 l5 11 l6 -3 l-5 -11 l9 0 z" fill="#ffffff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/></g>`;
const tapRing = (x, y, cls = 'ta-ring') => `<circle class="${cls}" cx="${x}" cy="${y}" r="18" fill="none" stroke="#ffc94a" stroke-width="4"/>`;
const room = (x, w, fill = '#24365f') => `<rect x="${x}" y="30" width="${w}" height="64" rx="8" fill="${fill}" stroke="${INK}" stroke-width="3"/>`;

/** Air escaping: three little arrows out of the hole. */
const airOut = (x, y, cls = 'tl-air') =>
  `<g class="${cls}" stroke="#9fe8ff" stroke-width="3.5" stroke-linecap="round" fill="none">
     <path d="M${x + 8} ${y} h22"/><path d="M${x + 6} ${y - 8} l18 -10"/><path d="M${x + 6} ${y + 8} l18 10"/></g>`;

export const ART = {
  // ---------------------------------------------------------------- Leak Hunt
  huntMove: svg(`${wall(14, 14, 172, 102)}${hole(150, 46, 'tl-hidden')}<g class="tl-sweep">${detector(60, 54, 1)}</g>`, 'Move the leak detector across the wall'),
  huntBars: svg(
    `${wall(14, 14, 172, 102)}${detector(60, 44, 1)}${detector(140, 44, 4)}
     <text x="60" y="106" text-anchor="middle" font-size="15" font-weight="800" fill="${INK}">far</text>
     <text x="140" y="106" text-anchor="middle" font-size="15" font-weight="800" fill="${INK}">close</text>
     <g class="tl-beep"><path d="M162 40 q6 6 0 12 M168 36 q10 10 0 20" stroke="#ffc94a" stroke-width="3" fill="none" stroke-linecap="round"/></g>`,
    'Far from the hole: one bar. Close to the hole: many bars and fast beeps',
  ),
  huntFound: svg(`${wall(14, 14, 172, 102)}${hole(100, 52, 'tl-pop')}${detector(100, 76, 5)}${tapRing(100, 52)}`, 'Full bars right over the hole: found it'),

  // ---------------------------------------------------------------- Hatch Hunt
  hatchTap: svg(
    `${room(12, 54)}${room(73, 54)}${room(134, 54)}${hatch(69, 62, false)}${hatch(130, 62, false, 'tl-shut')}${tapRing(130, 62)}${cursor(140, 70)}`,
    'Three rooms in a row: tap a hatch between them to close it',
  ),
  hatchNeedle: svg(
    `${room(12, 85)}${room(103, 85)}${hatch(100, 62, true)}${dial(54, 62, 'tl-steady')}${dial(146, 62, 'tl-fall')}
     <text x="146" y="114" text-anchor="middle" font-size="14" font-weight="800" fill="#ff9b85">leak!</text>`,
    'With the hatch closed, only the leaking side’s needle falls',
  ),
  hatchOne: svg(
    `${room(12, 54)}${room(73, 54, '#5a2a3a')}${room(134, 54)}${hatch(69, 62, true)}${hatch(130, 62, true)}${hole(100, 50, 'tl-pop')}
     <text x="100" y="86" text-anchor="middle" font-size="13" font-weight="800" fill="#ffffff">here!</text>`,
    'Hatches closed on both sides: the leak is in the middle room',
  ),

  // ---------------------------------------------------------------- Patch It
  patchTape: svg(
    `${wall(14, 14, 172, 102)}${hole(100, 64)}${airOut(100, 64)}<rect class="tl-tape" x="74" y="54" width="52" height="20" rx="3" fill="#e9c46a" stroke="${INK}" stroke-width="2.5" opacity="0.95"/>`,
    'Stick tape over the hole: the leak slows down',
  ),
  patchMix: svg(
    `<g><rect x="34" y="24" width="34" height="56" rx="8" fill="#ffd166" stroke="${INK}" stroke-width="3"/><text x="51" y="58" text-anchor="middle" font-size="20" font-weight="800" fill="${INK}">A</text></g>
     <g><rect x="132" y="24" width="34" height="56" rx="8" fill="#6fe3f0" stroke="${INK}" stroke-width="3"/><text x="149" y="58" text-anchor="middle" font-size="20" font-weight="800" fill="${INK}">B</text></g>
     <text x="100" y="60" text-anchor="middle" font-size="26" font-weight="800" fill="#ffffff">+</text>
     <ellipse cx="100" cy="104" rx="34" ry="12" class="tl-mixed" fill="#ffd166" stroke="${INK}" stroke-width="3"/>`,
    'Mix glue part A with part B',
  ),
  patchPress: svg(
    `${wall(14, 14, 172, 102)}${hole(100, 64)}<rect class="tl-patch" x="70" y="40" width="60" height="48" rx="8" fill="#f2f5ff" stroke="${INK}" stroke-width="3"/>
     <g stroke="#9fe8ff" stroke-width="3.5" stroke-linecap="round"><path d="M100 104 v-10"/><path d="M80 104 v-10"/><path d="M120 104 v-10"/></g>
     <circle class="tl-hold" cx="164" cy="34" r="14" fill="none" stroke="#7be0a0" stroke-width="5" stroke-dasharray="88" stroke-dashoffset="88"/>`,
    'Hold the glue patch on the hole while the air presses it on',
  ),

  // ---------------------------------------------------------------- What really happened
  learnHunt: big(
    `<rect x="18" y="20" width="18" height="120" fill="#8a96a8" stroke="${INK}" stroke-width="3"/>
     <text x="27" y="152" text-anchor="middle" font-size="12" font-weight="800" fill="#c9d4e8">wall</text>
     <path class="tl-wave" d="M44 80 q8 -10 16 0 t16 0 t16 0 t16 0 t16 0 t16 0" fill="none" stroke="#9fe8ff" stroke-width="3"/>
     ${detector(170, 70, 5)}
     <path d="M196 76 h26" stroke="#ffc94a" stroke-width="5" stroke-linecap="round"/><path d="M218 66 l12 10 l-12 10" fill="#ffc94a"/>
     <g class="tl-beep"><path d="M250 64 q10 12 0 24 M262 58 q16 18 0 36" stroke="#ffc94a" stroke-width="4" fill="none" stroke-linecap="round"/></g>
     <text x="84" y="122" text-anchor="middle" font-size="13" font-weight="700" fill="#9fe8ff">too high to hear</text>
     <text x="262" y="122" text-anchor="middle" font-size="13" font-weight="700" fill="#ffc94a">beep beep!</text>`,
    'The leak’s whistle is too high to hear; the detector turns it into beeps',
  ),
  learnHatch: big(
    `${[20, 95, 170, 245].map((x, i) => `<rect x="${x}" y="40" width="58" height="70" rx="8" fill="${i === 2 ? '#5a2a3a' : '#24365f'}" stroke="${INK}" stroke-width="3"/>`).join('')}
     ${[88, 163, 238].map((x, i) => hatch(x, 75, i > 0)).join('')}
     ${dial(124, 75, 'tl-steady')}${dial(199, 75, 'tl-fall')}${dial(274, 75, 'tl-steady')}
     <text x="199" y="132" text-anchor="middle" font-size="14" font-weight="800" fill="#ff9b85">hole here</text>`,
    'Four rooms; with hatches closed, only the room with the hole loses pressure',
  ),
  learnPatch: big(
    `<rect x="150" y="14" width="20" height="132" fill="#8a96a8" stroke="${INK}" stroke-width="3"/>
     <rect x="134" y="52" width="16" height="56" rx="5" fill="#f2f5ff" stroke="${INK}" stroke-width="3"/>
     <text x="70" y="30" text-anchor="middle" font-size="14" font-weight="800" fill="#ffffff">inside: air</text>
     <text x="248" y="30" text-anchor="middle" font-size="14" font-weight="800" fill="#c9d4e8">outside: vacuum</text>
     ${[60, 80, 100].map((y) => `<path class="tl-push" d="M70 ${y} h48" stroke="#9fe8ff" stroke-width="5" stroke-linecap="round"/><path class="tl-push" d="M114 ${y - 8} l12 8 l-12 8" fill="#9fe8ff"/>`).join('')}
     ${[[40, 60], [96, 120], [60, 130], [30, 100], [110, 44]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#9fe8ff"/>`).join('')}
     <text x="248" y="88" text-anchor="middle" font-size="13" font-weight="700" fill="#c9d4e8">nothing pushes back</text>`,
    'Air inside pushes the patch onto the wall; outside, nothing pushes back',
  ),

  /** Intro: why air leaks (air presses out; vacuum outside). */
  introWhy: big(
    `<rect x="16" y="16" width="190" height="128" rx="14" fill="#24365f" stroke="${INK}" stroke-width="3"/>
     ${[[40, 40], [80, 60], [120, 36], [160, 70], [60, 100], [110, 110], [150, 120], [180, 40], [40, 130], [90, 84]].map(([x, y], i) => `<circle class="tl-jiggle" style="--d:${i * 0.17}s" cx="${x}" cy="${y}" r="6" fill="#9fe8ff"/>`).join('')}
     <rect x="200" y="16" width="12" height="128" fill="#8a96a8" stroke="${INK}" stroke-width="3"/>
     <rect x="198" y="74" width="16" height="12" fill="#1b2a52"/>
     ${airOut(210, 80)}
     <text x="111" y="156" text-anchor="middle" font-size="13" font-weight="800" fill="#ffffff">air presses on the walls</text>
     <text x="270" y="40" text-anchor="middle" font-size="13" font-weight="800" fill="#c9d4e8">vacuum</text>
     <text x="270" y="58" text-anchor="middle" font-size="12" font-weight="700" fill="#c9d4e8">(no air)</text>`,
    'Air inside the habitat presses on every wall; outside is a vacuum, so air escapes through the hole',
  ),
};
