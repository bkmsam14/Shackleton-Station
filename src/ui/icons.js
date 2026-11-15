// icons.js — simple custom line icons (original art) for the HUD. stroke = currentColor.
const S = 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';

/** Radiation trefoil: a centre dot + three 60° blades (pointing up, lower-right, lower-left). */
function trefoil() {
  const c = 16;
  const r0 = 4.4;
  const r1 = 12.5;
  const pt = (r, deg) => {
    const a = (deg * Math.PI) / 180;
    return `${(c + r * Math.cos(a)).toFixed(2)} ${(c + r * Math.sin(a)).toFixed(2)}`;
  };
  const blade = (mid) =>
    `M${pt(r0, mid - 30)} L${pt(r1, mid - 30)} A${r1} ${r1} 0 0 1 ${pt(r1, mid + 30)} L${pt(r0, mid + 30)} A${r0} ${r0} 0 0 0 ${pt(r0, mid - 30)}Z`;
  const blades = [-90, 30, 150].map(blade).join(' ');
  return `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="${c}" cy="${c}" r="2.6" fill="currentColor"/><path d="${blades}" fill="currentColor"/></svg>`;
}

export const ICONS = {
  // two bubbles = oxygen
  oxygen: `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="13" cy="18" r="7.5" ${S}/><circle cx="23" cy="9" r="4" ${S}/><path d="M10 17.5a3.2 3.2 0 0 1 3-3" ${S}/></svg>`,
  // apple outline = food
  food: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 10c-3-2.6-9.5-1.6-9.5 6 0 5.5 3.6 11 6.5 11 1.2 0 2-.6 3-.6s1.8.6 3 .6c2.9 0 6.5-5.5 6.5-11 0-7.6-6.5-8.6-9.5-6z" ${S}/><path d="M16 10c0-2.8 1.4-4.8 3.8-5.8" ${S}/></svg>`,
  // radiation trefoil = storm dose (dosimeter)
  dose: trefoil(),
  arrowUp: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" ${S}/></svg>`,
  arrowDown: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3.5 8.5 8 13l4.5-4.5" ${S}/></svg>`,
};

/** Battery icon with 5 cells; level 0..1 lights cells (partly lit last cell fades). */
export function batteryIcon(level) {
  const l = Math.max(0, Math.min(1, level));
  let cells = '';
  for (let i = 0; i < 5; i++) {
    const fill = Math.max(0, Math.min(1, l * 5 - i)); // 0..1 for this cell
    const op = fill <= 0 ? 0.16 : 0.35 + 0.65 * fill;
    cells += `<rect x="${5 + i * 10.4}" y="5" width="8.6" height="18" rx="1.8" fill="currentColor" opacity="${op.toFixed(2)}"/>`;
  }
  return `<svg viewBox="0 0 64 28" aria-hidden="true"><rect x="1.5" y="1.5" width="56" height="25" rx="5" fill="none" stroke="currentColor" stroke-width="3"/><rect x="59" y="9" width="4" height="10" rx="1.5" fill="currentColor"/>${cells}</svg>`;
}
