// minigames.js — the Leak Fix lesson's mini-games and their rules (PURE LOGIC: no DOM).
// Every game ends with the hole sealed; each teaches a real part of how space-station crews
// handle a leak (docs/SCIENCE.md → Micrometeoroids and air leaks):
//
//   hunt   — Leak Hunt: a tiny leak whistles too high for our ears (ultrasound). An
//            ultrasonic leak detector turns it into beeps: louder = closer.
//   hatch  — Hatch Hunt: close hatches to split the base into parts. Only the part with the
//            hole keeps losing pressure (how the ISS crew narrowed down leaks in 2018 and 2020).
//   patch  — Patch It: tape slows the leak; two-part epoxy on cloth seals it from the INSIDE,
//            where the cabin air presses the patch onto the wall (the 2018 Soyuz repair).

export const GAMES = [
  { id: 'hunt', name: 'Leak Hunt', short: 'Follow the beeps' },
  { id: 'hatch', name: 'Hatch Hunt', short: 'Close hatches, watch the needles' },
  { id: 'patch', name: 'Patch It', short: 'Tape, glue, press, check' },
];

export const gameById = (id) => GAMES.find((g) => g.id === id) ?? GAMES[0];

/** Today's game: random, never the same one twice in a row. */
export function nextGame(lastId, random = Math.random) {
  const pool = GAMES.filter((g) => g.id !== lastId);
  return pool[Math.floor(random() * pool.length) % pool.length].id;
}

// ---------------------------------------------------------------- Leak Hunt
/**
 * Detector reading 0..5 bars for the distance to the hole (same units as `range`).
 * Sound spreads out, so it gets weaker with distance (intensity ∝ 1/d²); the bars follow
 * that on a log scale, like a real meter. Inside `found` it reads full.
 */
export function detectorBars(dist, { range = 320, found = 26 } = {}) {
  if (dist <= found) return 5;
  if (dist >= range) return 0;
  const level = Math.log(range / dist) / Math.log(range / found); // 0 at the edge … 1 at `found`
  return Math.max(0, Math.min(5, Math.floor(level * 5 + 1e-9)));
}

/** Beeps per second for a bar count (0 bars: silent). */
export const beepRate = (bars) => (bars <= 0 ? 0 : 1 + bars * 1.4);

// ---------------------------------------------------------------- Hatch Hunt
// Sections in a row, with one hatch between each pair: hatch i joins section i and i+1.
export const SECTIONS = [
  { id: 'nook', name: 'Sleeping nook' },
  { id: 'lounge', name: 'Lounge' },
  { id: 'bay', name: 'Work bay' },
  { id: 'airlock', name: 'Airlock' },
];

export function createHatchRound(random = Math.random, sections = SECTIONS.length) {
  return { leak: Math.floor(random() * sections) % sections, closed: Array(sections - 1).fill(false), tests: 0 };
}

/** The connected parts of the base: arrays of section indices (closed hatches split them). */
export function groupsOf(round) {
  const groups = [[0]];
  round.closed.forEach((shut, i) => {
    if (shut) groups.push([i + 1]);
    else groups[groups.length - 1].push(i + 1);
  });
  return groups;
}

/** Open / close hatch i. */
export function toggleHatch(round, i) {
  if (i < 0 || i >= round.closed.length) return false;
  round.closed[i] = !round.closed[i];
  round.tests++;
  return true;
}

/** The part of the base whose pressure is falling (the one with the hole in it). */
export const leakingGroup = (round) => groupsOf(round).find((g) => g.includes(round.leak));

/** Found when the falling part is just one section. */
export const hatchFound = (round) => leakingGroup(round).length === 1;

// ---------------------------------------------------------------- Patch It
export const PATCH_STEPS = [
  { id: 'tape', label: 'Tape' },
  { id: 'mix', label: 'Mix' },
  { id: 'press', label: 'Press' },
  { id: 'check', label: 'Check' },
];
