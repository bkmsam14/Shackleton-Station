// icons.js — original two-tone "sticker" icons + the Volt helper robot for the Molecule
// Zapper. Chunky dark outline (#10182c) + flat colour fills, so they read well for kids on
// the dark console. All decorative: aria-hidden; the text next to them carries the meaning.

const INK = '#10182c';
const O = `stroke="${INK}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
const svg = (body, vb = '0 0 32 32', cls = 'ez-ic') =>
  `<svg class="${cls}" viewBox="${vb}" aria-hidden="true" focusable="false">${body}</svg>`;

export const IC = {
  water: svg(
    `<path d="M16 3.5C12 9 7.5 13.6 7.5 19a8.5 8.5 0 0 0 17 0C24.5 13.6 20 9 16 3.5z" fill="#4fa8ff" ${O}/>
     <path d="M12 19.5a4 4 0 0 0 3 4" fill="none" stroke="#d6ecff" stroke-width="2.4" stroke-linecap="round"/>`,
  ),
  power: svg(
    `<path d="M18.5 2.5 6.5 18h8l-2 11.5L25.5 13h-8.5z" fill="#ffd43b" ${O}/>`,
  ),
  oxygen: svg(
    `<circle cx="12.5" cy="19" r="8.5" fill="#4fd1e8" ${O}/>
     <circle cx="23.5" cy="9.5" r="5" fill="#4fd1e8" ${O}/>
     <path d="M9 18a4 4 0 0 1 3.5-3.6" fill="none" stroke="#e3fbff" stroke-width="2.4" stroke-linecap="round"/>`,
  ),
  clock: svg(
    `<circle cx="16" cy="17" r="11.5" fill="#ffb547" ${O}/>
     <circle cx="16" cy="17" r="8" fill="#fff4dc"/>
     <path d="M16 12v5.5l3.5 2.5" fill="none" ${O}/>
     <path d="M12.5 3.5h7" ${O}/>`,
  ),
  heat: svg(
    `<path d="M16 3c1 5 7 7.5 7 15a7 7 0 0 1-14 0c0-4 2-6 3.5-8 .5 3 2 4 3 4.5C15 10 15.5 6.5 16 3z" fill="#ff7a59" ${O}/>
     <path d="M16 18c1.5 1.5 3 3 3 5a3 3 0 0 1-6 0c0-1.5 1.2-3 3-5z" fill="#ffd43b"/>`,
  ),
  back: svg(`<path d="M19 7 10 16l9 9" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`),
  check: svg(`<path d="M7 16.5 13.5 23 25.5 9.5" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`),
  cross: svg(`<path d="M9 9l14 14M23 9 9 23" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>`),
  lock: svg(
    `<rect x="7" y="14" width="18" height="14" rx="3.5" fill="#9aa3b5" ${O}/>
     <path d="M11 14v-3.5a5 5 0 0 1 10 0V14" fill="none" ${O}/>
     <circle cx="16" cy="21" r="2" fill="${INK}"/>`,
  ),
  book: svg(
    `<path d="M4 7c4-1.5 8-1.5 12 1v18c-4-2.5-8-2.5-12-1z" fill="#7be0a0" ${O}/>
     <path d="M28 7c-4-1.5-8-1.5-12 1v18c4-2.5 8-2.5 12-1z" fill="#b6f0cb" ${O}/>`,
  ),
  link: svg(
    `<path d="M13 19l6-6M11 14l-2.5 2.5a4.2 4.2 0 0 0 6 6L17 20M21 18l2.5-2.5a4.2 4.2 0 0 0-6-6L15 12" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>`,
  ),
  keySpace: svg(
    `<rect x="2.5" y="10" width="27" height="13" rx="3.5" fill="#e8eefb" ${O}/><path d="M9 17.5h14" ${O}/>`,
  ),
  mouse: svg(
    `<rect x="9" y="4" width="14" height="24" rx="7" fill="#e8eefb" ${O}/><path d="M16 4v8M9 12h14" ${O}/>`,
  ),
};

/** Big star for the result screen (on = gold, off = dim). */
export function starIcon(on) {
  return svg(
    `<path d="M32 5.5l7.8 16.2 17.7 2.4-13 12.3 3.3 17.6L32 45.5 16.2 54l3.3-17.6-13-12.3 17.7-2.4z"
       fill="${on ? '#ffc94a' : '#2a3450'}" stroke="${on ? INK : '#3a4566'}" stroke-width="3.5" stroke-linejoin="round"/>
     ${on ? '<path d="M22 24l5-1.2" stroke="#fff6cf" stroke-width="3.5" stroke-linecap="round"/>' : ''}`,
    '0 0 64 60',
    `ez-star${on ? ' is-on' : ''}`,
  );
}

/** Medal ribbon. level: bronze | silver | gold. */
export function medalIcon(level) {
  const c = { bronze: ['#e09456', '#b86a2e'], silver: ['#dfe6f2', '#9aa3b5'], gold: ['#ffd43b', '#e0a400'] }[level];
  if (!c) return '';
  return svg(
    `<path d="M10 2h8l4 11h-8zM22 2h-8l4 11" fill="#4fd1e8" ${O}/>
     <path d="M22 2h-6l-4 11h6z" fill="#ff7a59" ${O}/>
     <circle cx="16" cy="21" r="9" fill="${c[0]}" ${O}/>
     <circle cx="16" cy="21" r="5" fill="none" stroke="${c[1]}" stroke-width="2.4"/>`,
    '0 0 32 32',
    'ez-ic ez-ic-medal',
  );
}

/**
 * Flask filled to `fill` (0..1). size: 0 small, 1 medium, 2 big — the flask itself grows,
 * so the three batch cards compare at a glance.
 */
export function flaskIcon(size, disabled = false) {
  const scale = [0.72, 0.86, 1][size];
  const liquid = disabled ? '#5b647a' : '#4fd1e8';
  const fillY = [44, 36, 26][size];
  return svg(
    `<g transform="translate(32 64) scale(${scale}) translate(-32 -64)">
       <defs><clipPath id="ez-flask-${size}"><path d="M25 6h14v16l15 28a6 6 0 0 1-5.3 9H15.3a6 6 0 0 1-5.3-9l15-28z"/></clipPath></defs>
       <path d="M25 6h14v16l15 28a6 6 0 0 1-5.3 9H15.3a6 6 0 0 1-5.3-9l15-28z" fill="#1a2440"/>
       <rect x="0" y="${fillY}" width="64" height="40" fill="${liquid}" clip-path="url(#ez-flask-${size})"/>
       ${disabled ? '' : `<circle cx="27" cy="${fillY + 10}" r="3" fill="#e3fbff"/><circle cx="36" cy="${fillY + 16}" r="2" fill="#e3fbff"/>`}
       <path d="M25 6h14v16l15 28a6 6 0 0 1-5.3 9H15.3a6 6 0 0 1-5.3-9l15-28z" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
       <rect x="22" y="3" width="20" height="6" rx="3" fill="#e8eefb" stroke="${INK}" stroke-width="3"/>
     </g>`,
    '0 0 64 64',
    'ez-flask',
  );
}

/**
 * Volt, the station's helper robot. mood: happy | wow | think | cheer.
 * Original character (simple shapes), used to speak the lesson lines.
 */
export function voltBot(mood = 'happy') {
  const eyes = {
    happy: `<path d="M26 37q4-4 8 0M46 37q4-4 8 0" fill="none" stroke="#4fd1e8" stroke-width="3.6" stroke-linecap="round"/>`,
    wow: `<circle cx="30" cy="36" r="4.5" fill="#4fd1e8"/><circle cx="50" cy="36" r="4.5" fill="#4fd1e8"/>`,
    think: `<circle cx="30" cy="37" r="3.6" fill="#4fd1e8"/><path d="M46 37h8" stroke="#4fd1e8" stroke-width="3.6" stroke-linecap="round"/>`,
    cheer: `<path d="M26 38l4-5 4 5M46 38l4-5 4 5" fill="none" stroke="#4fd1e8" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  }[mood];
  const mouth = {
    happy: `<path d="M34 46q6 5 12 0" fill="none" stroke="#4fd1e8" stroke-width="3.2" stroke-linecap="round"/>`,
    wow: `<ellipse cx="40" cy="47" rx="4" ry="4.5" fill="#4fd1e8"/>`,
    think: `<path d="M35 47h10" stroke="#4fd1e8" stroke-width="3.2" stroke-linecap="round"/>`,
    cheer: `<path d="M33 44q7 9 14 0z" fill="#4fd1e8"/>`,
  }[mood];
  return `<svg class="ez-volt" viewBox="0 0 80 84" aria-hidden="true" focusable="false">
    <line x1="40" y1="14" x2="40" y2="5" stroke="${INK}" stroke-width="3"/>
    <circle class="ez-volt-light" cx="40" cy="6" r="4.5" fill="#ffd43b" stroke="${INK}" stroke-width="2.6"/>
    <rect x="6" y="28" width="8" height="18" rx="4" fill="#ff7a59" stroke="${INK}" stroke-width="2.6"/>
    <rect x="66" y="28" width="8" height="18" rx="4" fill="#ff7a59" stroke="${INK}" stroke-width="2.6"/>
    <rect x="12" y="14" width="56" height="46" rx="16" fill="#e8eefb" stroke="${INK}" stroke-width="3"/>
    <rect x="19" y="22" width="42" height="31" rx="11" fill="#10182c"/>
    ${eyes}${mouth}
    <rect x="22" y="62" width="36" height="18" rx="8" fill="#ffb547" stroke="${INK}" stroke-width="3"/>
    <path d="M38 65l-4 7h5l-2 6 7-9h-5l2-4z" fill="#10182c"/>
  </svg>`;
}
