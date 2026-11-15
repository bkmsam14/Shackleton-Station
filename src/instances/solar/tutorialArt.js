// tutorialArt.js — picture panels for the Solar Fix "How to play" cards and the
// "What really happened?" screens (small looping SVG animations, styled in games.css
// under .ts-*; base .ta styles come from the Electrolysis mini-games).
// Colours: cells blue, cracked cell dark with a red edge, flowing electricity yellow dots,
// heat-camera view purple (cool) → orange/white (hot).

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

const cell = (x, y, w = 30, h = 20, fill = '#23458a', extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${fill}" stroke="${INK}" stroke-width="2" ${extra}/>`;
const crack = (x, y) => `<polyline points="${x + 6},${y + 3} ${x + 14},${y + 10} ${x + 11},${y + 14} ${x + 22},${y + 18}" fill="none" stroke="#e8eefb" stroke-width="2"/>`;
/** A row of `n` cells; `bad` = index of the cracked one (or -1). */
function row(x, y, n, bad = -1, { dark = bad >= 0, flow = !dark } = {}) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const cx = x + i * 34;
    out += i === bad ? `${cell(cx, y, 30, 20, '#121c33', 'stroke="#ff7a59"')}${crack(cx, y)}` : cell(cx, y, 30, 20, dark ? '#18284a' : '#23458a');
  }
  out += `<line x1="${x + n * 34 - 4}" y1="${y + 10}" x2="${x + n * 34 + 14}" y2="${y + 10}" stroke="${dark ? '#3a4466' : '#f08a45'}" stroke-width="4" stroke-linecap="round"/>`;
  if (flow) out += `<circle class="ts-flow" cx="${x}" cy="${y + 10}" r="4" fill="#ffe27a"/><circle class="ts-flow ts-late" cx="${x}" cy="${y + 10}" r="4" fill="#ffe27a"/>`;
  return out;
}
const cursor = (x, y, cls = 'ta-cursor') =>
  `<g class="${cls}"><path d="M${x} ${y} l0 26 l7 -6 l5 11 l6 -3 l-5 -11 l9 0 z" fill="#ffffff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/></g>`;
const tapRing = (x, y, cls = 'ta-ring') => `<circle class="${cls}" cx="${x}" cy="${y}" r="18" fill="none" stroke="#ffc94a" stroke-width="4"/>`;

/** A 4×3 grid of cells in heat-camera colours; `hot` = indexes that glow. */
function irGrid(x, y, hot = [], cls = '') {
  let out = `<g class="${cls}">`;
  for (let i = 0; i < 12; i++) {
    const cx = x + (i % 4) * 36;
    const cy = y + Math.floor(i / 4) * 26;
    out += cell(cx, cy, 32, 22, hot.includes(i) ? '#ff9b3d' : '#3b2a7a');
    if (hot.includes(i)) out += `<circle cx="${cx + 16}" cy="${cy + 11}" r="6" fill="#fff3b0"/>`;
  }
  return out + '</g>';
}
function plainGrid(x, y, cls = '') {
  let out = `<g class="${cls}">`;
  for (let i = 0; i < 12; i++) out += cell(x + (i % 4) * 36, y + Math.floor(i / 4) * 26, 32, 22);
  return out + '</g>';
}
const camera = (x, y, on) =>
  `<g><rect x="${x}" y="${y}" width="44" height="30" rx="7" fill="${on ? '#ff7a59' : '#4a5468'}" stroke="${INK}" stroke-width="3"/>
     <circle cx="${x + 22}" cy="${y + 15}" r="9" fill="#0d1531" stroke="${INK}" stroke-width="2.5"/>
     <text x="${x + 22}" y="${y + 46}" text-anchor="middle" font-size="12" font-weight="800" fill="#ffffff">${on ? 'ON' : 'OFF'}</text></g>`;

/** A wire tile: straight or corner, turned `rot` quarters. */
function tile(cx, cy, type, rot, lit, cls = '') {
  const h = 16;
  const d = type === 'straight' ? `M${cx - h - 4} ${cy} L${cx + h + 4} ${cy}` : `M${cx} ${cy - h - 4} Q ${cx} ${cy} ${cx + h + 4} ${cy}`;
  return `<g class="${cls}"><rect x="${cx - 22}" y="${cy - 22}" width="44" height="44" rx="9" fill="#24365f" stroke="${INK}" stroke-width="2.5"/>
    <g transform="rotate(${rot * 90} ${cx} ${cy})"><path d="${d}" fill="none" stroke="${lit ? '#ffe27a' : '#9aa6c4'}" stroke-width="7" stroke-linecap="round"/></g></g>`;
}
const battery = (x, y, full) =>
  `<g><rect x="${x}" y="${y}" width="34" height="50" rx="7" fill="#0d1531" stroke="${INK}" stroke-width="3"/>
     <rect x="${x + 11}" y="${y - 6}" width="12" height="7" rx="2" fill="#c9d4e8"/>
     <rect class="${full ? 'ts-charge' : ''}" x="${x + 5}" y="${y + 5}" width="24" height="40" rx="4" fill="${full ? '#7be0a0' : '#2a3350'}"/></g>`;

export const ART = {
  // ---------------------------------------------------------------- Cell Swap
  cellsDark: svg(`${row(16, 30, 5, -1)}${row(16, 70, 5, 2)}`, 'A row with one cracked cell is dark; a whole row flows'),
  cellsDrag: svg(
    `${row(16, 34, 5, 2, { flow: false })}<g class="ts-drag">${cell(84, 94, 30, 20, '#2f5fc0')}${cursor(104, 104, '')}</g>`,
    'Drag a new cell up onto the cracked one',
  ),
  cellsFlow: svg(`${row(16, 30, 5, -1)}${row(16, 70, 5, -1)}<text x="100" y="118" text-anchor="middle" font-size="16" font-weight="800" fill="#ffe27a">flowing!</text>`, 'Both rows flow again'),

  // ---------------------------------------------------------------- Hot Spot Hunt
  hotSame: svg(`${plainGrid(28, 22)}<text x="100" y="118" text-anchor="middle" font-size="16" font-weight="800" fill="#ffffff">?</text>`, 'All cells look the same: the cracks are too small to see'),
  hotCamera: svg(`${plainGrid(14, 22, 'ts-fade-out')}${irGrid(14, 22, [2, 9], 'ts-fade-in')}${camera(152, 40, true)}`, 'Switch on the heat camera: the cracked cells glow hot'),
  hotTap: svg(`${irGrid(28, 22, [5])}${tapRing(82, 59)}${cursor(90, 66)}`, 'Tap a hot cell to swap it'),

  // ---------------------------------------------------------------- Wire Fix
  wireGap: svg(
    `<path d="M177 90 V114 H12 V64 H18" fill="none" stroke="#9aa6c4" stroke-width="4" stroke-linecap="round"/>
     ${tile(40, 64, 'straight', 0, true)}${tile(88, 64, 'straight', 1, false, 'ts-shake')}${tile(136, 64, 'straight', 0, false)}${battery(160, 40, false)}
     <circle cx="66" cy="64" r="5" fill="#ffe27a"/>`,
    'The electricity flows into the first piece and stops at a piece turned the wrong way',
  ),
  wireTurn: svg(`${tile(100, 60, 'corner', 0, false, 'ts-spin')}${tapRing(100, 60)}${cursor(112, 70)}`, 'Tap a piece to turn it a quarter turn'),
  wireDone: svg(
    `<path d="M177 90 V114 H12 V64 H18" fill="none" stroke="#ffe27a" stroke-width="4" stroke-linecap="round"/>
     ${tile(40, 64, 'straight', 0, true)}${tile(88, 64, 'straight', 0, true)}${tile(136, 64, 'straight', 0, true)}${battery(160, 40, true)}`,
    'All pieces joined into a loop that goes back round: the battery charges',
  ),

  // ---------------------------------------------------------------- What really happened
  learnCells: big(
    `${row(20, 26, 6, 3)}${row(20, 70, 6, -1)}
     <text x="248" y="42" font-size="14" font-weight="800" fill="#ff9b85">no power</text>
     <text x="248" y="86" font-size="14" font-weight="800" fill="#ffe27a">power</text>
     <text x="160" y="140" text-anchor="middle" font-size="14" font-weight="700" fill="#c9d4e8">cells in a chain share one current</text>`,
    'A chain with one cracked cell makes no power; a whole chain makes power',
  ),
  learnHot: big(
    `${plainGrid(16, 26)}${irGrid(168, 26, [6])}
     <text x="84" y="128" text-anchor="middle" font-size="14" font-weight="800" fill="#ffffff">your eyes</text>
     <text x="236" y="128" text-anchor="middle" font-size="14" font-weight="800" fill="#ffb27a">heat camera</text>`,
    'To your eyes all cells look the same; the heat camera shows the cracked one hot',
  ),
  learnWires: big(
    `<rect x="18" y="46" width="44" height="40" rx="6" fill="#23458a" stroke="${INK}" stroke-width="2.5"/>
     <text x="40" y="104" text-anchor="middle" font-size="13" font-weight="800" fill="#c9d4e8">cells</text>
     <path class="ts-loop" d="M62 66 H250 V120 H40 V86" fill="none" stroke="#ffe27a" stroke-width="6" stroke-linecap="round" stroke-dasharray="12 8"/>
     ${battery(250, 40, true)}
     <text x="160" y="146" text-anchor="middle" font-size="14" font-weight="700" fill="#c9d4e8">a complete loop = a circuit</text>`,
    'Cells, wires and battery joined in one complete loop: a circuit',
  ),
};
