// tutorialArt.js — the picture panels of the "How to play" cards (small looping SVG
// animations, styled in minigames.css under .ta-*). Pictures first, very few words:
// the kid SEES what to do. Same colours as the games: hydrogen white, oxygen red atoms,
// O₂ gas cyan, − electrode dark grey, + electrode orange.
//
// Science shown (docs/SCIENCE.md → Electrolysis): water is H₂O; electricity splits it;
// hydrogen forms at the − electrode, oxygen at the + electrode, twice as much hydrogen;
// H + H → H₂, O + O → O₂ (2 H₂O → 2 H₂ + O₂).

const INK = '#10182c';
const W = 200;
const H = 130;

/** A wider picture for the "What really happened" screen. */
const big = (body, label) =>
  `<svg class="ta ta-big" viewBox="0 0 320 ${H + 30}" role="img" aria-label="${label}">
     <rect x="2" y="2" width="316" height="${H + 26}" rx="16" fill="#1b2a52" stroke="${INK}" stroke-width="3"/>
     ${body}
   </svg>`;

const svg = (body, label) =>
  `<svg class="ta" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">
     <rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="16" fill="#1b2a52" stroke="${INK}" stroke-width="3"/>
     ${body}
   </svg>`;

const atom = (x, y, el, cls = '') => {
  const r = el === 'O' ? 14 : 10;
  const fill = el === 'O' ? '#ff6b6b' : '#f2f5ff';
  return `<g class="${cls}"><circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${INK}" stroke-width="3"/>
    <text x="${x}" y="${y + (el === 'O' ? 6 : 5)}" text-anchor="middle" font-size="${el === 'O' ? 16 : 13}" font-weight="800" fill="${INK}">${el}</text></g>`;
};

/** A bent water molecule (O on top, H below left and right). */
const water = (x, y, cls = '') =>
  `<g class="${cls}">
     <line x1="${x}" y1="${y}" x2="${x - 15}" y2="${y + 15}" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
     <line x1="${x}" y1="${y}" x2="${x + 15}" y2="${y + 15}" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
     ${atom(x - 15, y + 15, 'H')}${atom(x + 15, y + 15, 'H')}${atom(x, y, 'O')}
   </g>`;

const electrode = (x, sign, top = 34) =>
  `<g><rect x="${x - 8}" y="${top}" width="16" height="${H - 8 - top}" rx="4" fill="${sign === '−' ? '#4a5468' : '#f2873f'}" stroke="${INK}" stroke-width="3"/>
     <text x="${x}" y="${top - 6}" text-anchor="middle" font-size="22" font-weight="800" fill="${sign === '−' ? '#ffffff' : '#ffc08f'}">${sign}</text></g>`;

const waterBg = (top = 46) => `<rect x="5" y="${top}" width="${W - 10}" height="${H - top - 5}" fill="#2a6f9a" opacity="0.85"/>`;

const cursor = (x, y, cls = 'ta-cursor') =>
  `<g class="${cls}"><path d="M${x} ${y} l0 26 l7 -6 l5 11 l6 -3 l-5 -11 l9 0 z" fill="#ffffff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/></g>`;

const tapRing = (x, y, cls = 'ta-ring') => `<circle class="${cls}" cx="${x}" cy="${y}" r="18" fill="none" stroke="#ffc94a" stroke-width="4"/>`;

const bubble = (x, y, cls, label = '') =>
  `<g class="${cls}"><circle cx="${x}" cy="${y}" r="11" fill="rgba(255,255,255,0.35)" stroke="#ffffff" stroke-width="2.5"/>${
    label ? `<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="10" font-weight="800" fill="${INK}">${label}</text>` : ''
  }</g>`;

const button = (x, y, text, fill, cls = '') =>
  `<g class="${cls}"><rect x="${x - 28}" y="${y - 16}" width="56" height="32" rx="10" fill="${fill}" stroke="${INK}" stroke-width="3"/>
     <text x="${x}" y="${y + 6}" text-anchor="middle" font-size="17" font-weight="800" fill="${INK}">${text}</text></g>`;

/** A gas molecule: two atoms side by side (O atoms are bigger, so they sit further apart). */
const gas = (x, y, el, cls = '') => {
  const d = el === 'O' ? 13 : 9;
  return `<g class="${cls}">${atom(x - d, y, el)}${atom(x + d, y, el)}</g>`;
};

// ---------------------------------------------------------------- panels
export const ART = {
  // Molecule Zapper
  zapClick: svg(
    `${waterBg()}${electrode(26, '−')}${electrode(174, '+')}${water(100, 70)}${tapRing(100, 80)}${cursor(116, 84)}`,
    'Click a water molecule between the minus and plus plates',
  ),
  zapSplit: svg(
    `${waterBg()}${electrode(26, '−')}${electrode(174, '+')}
     <polyline class="ta-flash" points="96,30 106,52 94,54 104,78" fill="none" stroke="#fff59d" stroke-width="5" stroke-linejoin="round"/>
     ${gas(100, 88, 'H', 'ta-to-minus')}${atom(100, 66, 'O', 'ta-to-plus')}`,
    'A zap splits it: hydrogen goes to the minus side, oxygen to the plus side',
  ),
  zapTubes: svg(
    `<g><rect x="44" y="12" width="36" height="86" rx="11" fill="#0a1024" stroke="${INK}" stroke-width="3"/>
       <rect class="ta-fill ta-fill-full" x="47" y="15" width="30" height="80" rx="8" fill="#f2f5ff"/></g>
     <g><rect x="120" y="12" width="36" height="86" rx="11" fill="#0a1024" stroke="${INK}" stroke-width="3"/>
       <rect class="ta-fill ta-fill-half" x="123" y="15" width="30" height="80" rx="8" fill="#6fe3f0"/></g>
     <text x="62" y="120" text-anchor="middle" font-size="18" font-weight="800" fill="#ffffff">H₂</text>
     <text x="138" y="120" text-anchor="middle" font-size="18" font-weight="800" fill="#6fe3f0">O₂</text>`,
    'The hydrogen tube fills twice as fast as the oxygen tube',
  ),

  // Bubble Detective
  bubRise: svg(
    `${waterBg(30)}${electrode(64, '−', 50)}${electrode(136, '+', 50)}
     ${bubble(82, 112, 'ta-rise')}${bubble(82, 112, 'ta-rise ta-late')}${bubble(118, 112, 'ta-rise ta-later')}`,
    'Bubbles rise from both plates: two from the minus plate for every one from the plus plate',
  ),
  bubMinus: svg(
    `${waterBg(30)}${electrode(40, '−', 50)}${bubble(62, 80, 'ta-bob', '?')}
     <path class="ta-arrow" d="M84 80 h32" stroke="#ffc94a" stroke-width="6" stroke-linecap="round" marker-end="url(#ta-head)"/>
     <defs><marker id="ta-head" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto"><path d="M0 0 L4 2 L0 4 z" fill="#ffc94a"/></marker></defs>
     ${button(152, 80, 'H₂', '#f2f5ff', 'ta-glow')}`,
    'A bubble from the minus side is hydrogen: tap H2',
  ),
  bubPlus: svg(
    `${waterBg(30)}${electrode(160, '+', 50)}${bubble(138, 80, 'ta-bob', '?')}
     <path class="ta-arrow" d="M116 80 h-32" stroke="#ffc94a" stroke-width="6" stroke-linecap="round" marker-end="url(#ta-head2)"/>
     <defs><marker id="ta-head2" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto"><path d="M0 0 L4 2 L0 4 z" fill="#ffc94a"/></marker></defs>
     ${button(48, 80, 'O₂', '#6fe3f0', 'ta-glow')}`,
    'A bubble from the plus side is oxygen: tap O2',
  ),

  // Atom Match
  atomSplit: svg(
    `<g class="ta-out">${water(65, 50)}${water(135, 50)}</g>
     <g class="ta-in">${atom(30, 40, 'H')}${atom(62, 96, 'H')}${atom(100, 52, 'O')}${atom(140, 98, 'H')}${atom(172, 44, 'H')}${atom(104, 104, 'O')}</g>`,
    'Two water molecules split into four hydrogen atoms and two oxygen atoms',
  ),
  atomH: svg(
    `${atom(50, 62, 'H', 'ta-join-r')}${atom(150, 62, 'H', 'ta-join-l')}${tapRing(50, 62, 'ta-ring ta-ring-a')}${tapRing(150, 62, 'ta-ring ta-ring-b')}
     <text class="ta-result" x="100" y="112" text-anchor="middle" font-size="22" font-weight="800" fill="#ffffff">H + H = H₂</text>`,
    'Tap two hydrogen atoms: together they make H2',
  ),
  atomO: svg(
    `${atom(50, 62, 'O', 'ta-join-r ta-wide')}${atom(150, 62, 'O', 'ta-join-l ta-wide')}${tapRing(50, 62, 'ta-ring ta-ring-a')}${tapRing(150, 62, 'ta-ring ta-ring-b')}
     <text class="ta-result" x="100" y="112" text-anchor="middle" font-size="22" font-weight="800" fill="#6fe3f0">O + O = O₂</text>`,
    'Tap two oxygen atoms: together they make O2, the oxygen we breathe',
  ),

  // ---------------------------------------------------------------- "What really happened"
  learnZapper: big(
    `${water(40, 62)}${water(106, 62)}
     <text x="73" y="118" text-anchor="middle" font-size="15" font-weight="700" fill="#c9d4e8">water</text>
     <g><path d="M138 74 h44" stroke="#ffc94a" stroke-width="6" stroke-linecap="round"/><path d="M178 64 l12 10 l-12 10" fill="#ffc94a"/>
       <polyline points="160,40 166,54 156,56 162,70" fill="none" stroke="#fff59d" stroke-width="4" stroke-linejoin="round"/></g>
     ${gas(212, 56, 'H')}${gas(212, 90, 'H')}${gas(282, 74, 'O')}
     <text x="210" y="128" text-anchor="middle" font-size="14" font-weight="700" fill="#ffffff">hydrogen</text>
     <text x="284" y="128" text-anchor="middle" font-size="14" font-weight="700" fill="#6fe3f0">oxygen</text>`,
    'Electricity splits two water molecules into two hydrogen molecules and one oxygen molecule',
  ),
  learnBubbles: big(
    `<g><rect x="132" y="8" width="56" height="26" rx="6" fill="#ffc94a" stroke="${INK}" stroke-width="3"/>
       <text x="146" y="27" text-anchor="middle" font-size="18" font-weight="800" fill="${INK}">−</text>
       <text x="174" y="27" text-anchor="middle" font-size="18" font-weight="800" fill="${INK}">+</text></g>
     <path d="M132 21 H96 V60" fill="none" stroke="#c9d4e8" stroke-width="4"/>
     <path d="M188 21 H224 V60" fill="none" stroke="#c9d4e8" stroke-width="4"/>
     <rect x="40" y="54" width="240" height="96" rx="12" fill="#2a6f9a" stroke="${INK}" stroke-width="3"/>
     ${electrode(96, '−', 60).replace(/<text[^>]*>−<\/text>/, '')}${electrode(224, '+', 60).replace(/<text[^>]*>\+<\/text>/, '')}
     ${bubble(118, 128, '')}${bubble(120, 106, '')}${bubble(116, 84, '')}${bubble(124, 64, '')}
     <text x="96" y="144" text-anchor="middle" font-size="18" font-weight="800" fill="#ffffff">−</text>
     <text x="224" y="144" text-anchor="middle" font-size="18" font-weight="800" fill="#ffc08f">+</text>
     ${bubble(204, 116, '')}${bubble(202, 76, '')}
     ${button(50, 22, 'H₂ ×2', '#f2f5ff')}${button(270, 22, 'O₂ ×1', '#6fe3f0')}`,
    'A battery is wired to two plates in water: the minus plate makes two hydrogen bubbles for every oxygen bubble at the plus plate',
  ),
  learnAtoms: big(
    `${water(40, 56)}${water(106, 56)}
     <text x="73" y="118" text-anchor="middle" font-size="15" font-weight="700" fill="#ffffff">4 H · 2 O</text>
     <path d="M140 68 h40" stroke="#ffc94a" stroke-width="6" stroke-linecap="round"/><path d="M176 58 l12 10 l-12 10" fill="#ffc94a"/>
     ${gas(212, 52, 'H')}${gas(212, 86, 'H')}${gas(282, 68, 'O')}
     <text x="250" y="118" text-anchor="middle" font-size="15" font-weight="700" fill="#ffffff">4 H · 2 O</text>`,
    'Before and after: the same four hydrogen and two oxygen atoms, in new pairs',
  ),
};