// icons.js — simple custom line icons (original art) for the HUD. stroke = currentColor.
const S = 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';

export const ICONS = {
  // two bubbles = oxygen
  oxygen: `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="13" cy="18" r="7.5" ${S}/><circle cx="23" cy="9" r="4" ${S}/><path d="M10 17.5a3.2 3.2 0 0 1 3-3" ${S}/></svg>`,
  // apple outline = food
  food: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 10c-3-2.6-9.5-1.6-9.5 6 0 5.5 3.6 11 6.5 11 1.2 0 2-.6 3-.6s1.8.6 3 .6c2.9 0 6.5-5.5 6.5-11 0-7.6-6.5-8.6-9.5-6z" ${S}/><path d="M16 10c0-2.8 1.4-4.8 3.8-5.8" ${S}/></svg>`,
  arrowUp: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" ${S}/></svg>`,
  arrowDown: `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3.5 8.5 8 13l4.5-4.5" ${S}/></svg>`,
};

/** Battery icon with a fill level 0..1. */
export function batteryIcon(level) {
  const w = Math.max(0, Math.min(1, level)) * 22;
  return `<svg viewBox="0 0 32 16" aria-hidden="true"><rect x="1.5" y="2" width="26" height="12" rx="2.5" ${S}/><rect x="29" y="5.5" width="2" height="5" rx="1" fill="currentColor"/><rect x="3.5" y="4" width="${w.toFixed(1)}" height="8" rx="1.2" fill="currentColor"/></svg>`;
}
