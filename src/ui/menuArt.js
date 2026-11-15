// menuArt.js — drawn pictures for the menus and day cards: the game's own mission patch,
// small line icons (instead of emoji) and outlined stars. Same "toy flight console" style as
// the mini-games: ink outlines (#10182c), solid colours, no glows.
const INK = '#10182c';

let patchN = 0;
/** The Shackleton Station mission patch (an original design: crater rim, habitat, Earth). */
export function missionPatch(size = 120, cls = 'mm-patch') {
  // unique ids per copy: a second patch must not point at the (maybe hidden) first one's paths
  const id = `patch${++patchN}`;
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 200 200" role="img" aria-label="Shackleton Station mission patch">
    <defs>
      <path id="${id}-top" d="M 34 100 A 66 66 0 0 1 166 100"/>
      <path id="${id}-bot" d="M 40 112 A 60 60 0 0 0 160 112"/>
      <clipPath id="${id}-in"><circle cx="100" cy="100" r="62"/></clipPath>
    </defs>
    <circle cx="100" cy="100" r="96" fill="${INK}"/>
    <circle cx="100" cy="100" r="90" fill="#ffb547"/>
    <circle cx="100" cy="100" r="66" fill="${INK}"/>
    <g clip-path="url(#${id}-in)">
      <rect x="30" y="30" width="140" height="140" fill="#0c1430"/>
      ${[[62, 62], [80, 48], [120, 58], [142, 80], [70, 86], [108, 78], [52, 104]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 ? 1.6 : 2.4}" fill="#ffffff"/>`).join('')}
      <circle cx="134" cy="70" r="13" fill="#4fa8ff"/>
      <path d="M134 57 a13 13 0 0 1 0 26 a9 13 0 0 0 0 -26z" fill="#0c1430" opacity="0.75"/>
      <path d="M30 128 L64 112 L86 118 L110 104 L140 116 L170 108 L170 170 L30 170z" fill="#8a96a8"/>
      <path d="M30 138 Q100 124 170 136 L170 170 L30 170z" fill="#5d6a80"/>
      <path d="M84 132 q16 -16 32 0z" fill="#e9eef7" stroke="${INK}" stroke-width="2.5"/>
      <circle cx="100" cy="126" r="3" fill="#ffd27a"/>
      <rect x="120" y="116" width="4" height="18" fill="${INK}"/>
      <rect x="114" y="104" width="16" height="12" fill="#2f5fc0" stroke="${INK}" stroke-width="2"/>
    </g>
    <text font-family="Fredoka, sans-serif" font-weight="700" font-size="17" fill="${INK}" letter-spacing="2.5"><textPath href="#${id}-top" startOffset="50%" text-anchor="middle">SHACKLETON STATION</textPath></text>
    <text font-family="Fredoka, sans-serif" font-weight="700" font-size="13" fill="${INK}" letter-spacing="3"><textPath href="#${id}-bot" startOffset="50%" text-anchor="middle">LUNAR SOUTH POLE</textPath></text>
    <circle cx="28" cy="100" r="4" fill="${INK}"/><circle cx="172" cy="100" r="4" fill="${INK}"/>
  </svg>`;
}

const ic = (body, extra = '') => `<svg class="mi" viewBox="0 0 24 24" aria-hidden="true" ${extra}>${body}</svg>`;
const S = `fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"`;

/** Small line icons for buttons and card rows. */
export const MI = {
  play: ic('<path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/>'),
  star: ic(`<path d="M12 3l2.7 5.6 6.1.8-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.8z" ${S}/>`),
  gear: ic(`<circle cx="12" cy="12" r="3.2" ${S}/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M5.5 18.5l2.1-2.1M16.4 7.6l2.1-2.1" ${S}/>`),
  book: ic(`<path d="M4 5.5c3-1 5.5-.8 8 1 2.5-1.8 5-2 8-1v13c-3-1-5.5-.8-8 1-2.5-1.8-5-2-8-1z" ${S}/><path d="M12 6.5v13" ${S}/>`),
  heart: ic(`<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" ${S}/>`),
  close: ic(`<path d="M6 6l12 12M18 6L6 18" ${S}/>`),
  sprout: ic(`<path d="M12 20v-8M12 12c0-4 3-6 7-6 0 4-3 6-7 6zM12 14c0-3-2.5-5-6-5 0 3 2.5 5 6 5z" ${S}/>`),
  sun: ic(`<circle cx="12" cy="12" r="4" ${S}/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.2 5.2l1.8 1.8M17 17l1.8 1.8M5.2 18.8 7 17M17 7l1.8-1.8" ${S}/>`),
  moon: ic(`<path d="M15.5 3.5a8.5 8.5 0 1 0 5 13.5 7 7 0 0 1-5-13.5z" ${S}/>`),
  food: ic(`<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M16 3c-2 2-2.5 5-2.5 8h3V21" ${S}/>`),
  refill: ic(`<path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4" ${S}/>`),
};

/** A row of 3 drawn stars, `n` of them filled. */
export function starRow(n, size = 46) {
  return Array.from({ length: 3 }, (_, i) => {
    const on = i < n;
    return `<svg class="ds ${on ? 'is-on' : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.8 5.8 6.3.9-4.6 4.5 1.1 6.3L12 17.1l-5.6 3 1.1-6.3L2.9 9.3l6.3-.9z" fill="${on ? '#ffc94a' : 'none'}" stroke="${on ? INK : '#8f9bb5'}" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
  }).join('');
}
