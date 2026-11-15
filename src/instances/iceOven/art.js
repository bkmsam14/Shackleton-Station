// art.js — pictures for the Ice Oven (styled in style.css under .ov-*): one big animated
// scene for the panel and three small panels for the first-time "How it works" card.
// Pictures first, a few words: icy soil → heat → the ice turns into vapour (a gas) → a cold
// plate turns it back into water → drops fall into the tank.
// Physics (SCIENCE.md "Ice in cold traps"): warming icy regolith releases its water as
// vapour; a cold surface condenses it. No air is needed for that.

const INK = '#10182c';

/** Icy soil: brown lumps with white ice specks. */
function soil(x, y, w) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="26" rx="8" fill="#7a5a43" stroke="${INK}" stroke-width="3"/>`;
  for (let i = 0; i < 9; i++) s += `<circle cx="${x + 10 + ((i * 37) % (w - 20))}" cy="${y + 8 + ((i * 11) % 14)}" r="3" fill="#e8f6ff"/>`;
  return s;
}
/** Heat waves under the soil (red-orange). */
const heat = (x, y, w, cls = 'ov-heat') =>
  `<g class="${cls}">${[0, 1, 2].map((i) => `<path d="M${x + 14 + i * (w / 3)} ${y} q6 -8 0 -16 q-6 -8 0 -16" fill="none" stroke="#ff7a3d" stroke-width="4" stroke-linecap="round"/>`).join('')}</g>`;
/** Vapour puffs rising (light cyan). */
const vapour = (x, y, cls = 'ov-vapour') =>
  `<g class="${cls}">${[0, 1, 2, 3].map((i) => `<circle class="ov-puff" style="--d:${i * 0.45}s" cx="${x + i * 16}" cy="${y}" r="6" fill="#bff3ff" opacity="0.9"/>`).join('')}</g>`;
/** The cold plate (frosty blue bar). */
const plate = (x, y, w) => `<rect x="${x}" y="${y}" width="${w}" height="10" rx="4" fill="#9fdcff" stroke="${INK}" stroke-width="3"/><text x="${x + w + 6}" y="${y + 9}" font-size="12" font-weight="800" fill="#bfe8ff">cold</text>`;
/** Drops falling + the tank filling. */
const drops = (x, y, cls = 'ov-drops') =>
  `<g class="${cls}">${[0, 1, 2].map((i) => `<path class="ov-drop" style="--d:${i * 0.5}s" d="M${x} ${y} q5 8 0 12 q-5 -4 0 -12z" fill="#4fa8ff" stroke="${INK}" stroke-width="1.5"/>`).join('')}</g>`;
const tank = (x, y, cls = 'ov-tank-fill') =>
  `<rect x="${x}" y="${y}" width="44" height="60" rx="8" fill="#0d1531" stroke="${INK}" stroke-width="3"/>
   <rect class="${cls}" x="${x + 5}" y="${y + 5}" width="34" height="50" rx="5" fill="#4fa8ff"/>
   <text x="${x + 22}" y="${y + 76}" text-anchor="middle" font-size="12" font-weight="800" fill="#c9d4e8">tank</text>`;

const panel = (body, label) =>
  `<svg class="ta" viewBox="0 0 200 130" role="img" aria-label="${label}">
     <rect x="2" y="2" width="196" height="126" rx="16" fill="#1b2a52" stroke="${INK}" stroke-width="3"/>${body}</svg>`;

export const OVEN_ART = {
  /** The big scene on the panel: oven box, soil, heat, vapour, cold plate, drops, tank. */
  scene: `<svg class="ov-scene" viewBox="0 0 360 170" role="img" aria-label="The Ice Oven: heat under the icy soil turns the ice into vapour, a cold plate turns the vapour into water, and drops fall into the tank">
      <rect x="20" y="20" width="200" height="130" rx="18" fill="#24365f" stroke="${INK}" stroke-width="4"/>
      ${plate(40, 34, 150)}
      ${vapour(70, 100)}
      ${soil(40, 108, 160)}
      ${heat(40, 152, 160)}
      <path d="M190 44 H260 V70" fill="none" stroke="#9fdcff" stroke-width="5" stroke-linecap="round"/>
      ${drops(260, 76)}
      ${tank(238, 92)}
      <text x="120" y="16" text-anchor="middle" font-size="14" font-weight="800" fill="#ffffff">ICE OVEN</text>
    </svg>`,
  // "How it works" card (first visit)
  load: panel(`<rect x="44" y="42" width="112" height="66" rx="12" fill="#24365f" stroke="${INK}" stroke-width="3"/>${soil(58, 76, 84)}
      <g class="ov-bag"><rect x="84" y="10" width="34" height="26" rx="6" fill="#c08a5a" stroke="${INK}" stroke-width="3"/></g>`, 'Pour the icy soil into the oven'),
  heat: panel(`${soil(40, 70, 120)}${heat(40, 118, 120)}${vapour(70, 58)}`, 'Heat it: the ice turns into vapour, a gas'),
  water: panel(`${plate(26, 24, 100)}${vapour(46, 54)}${drops(150, 30)}${tank(128, 46)}`, 'A cold plate turns the vapour back into water, which drips into the tank'),
};
