// minigames.js — the Electrolysis station's mini-games and their rules (PURE LOGIC:
// no DOM). Every game makes the same batch of oxygen for the same water + power cost
// (systems/electrolysis.js); only HOW you help the machine changes, and each game
// teaches a different part of the science (docs/SCIENCE.md → Electrolysis):
//
//   zapper  — Molecule Zapper: electricity splits water molecules.            (existing)
//   bubbles — Bubble Detective: hydrogen bubbles form at the − electrode, oxygen at
//             the + electrode, and there are twice as many hydrogen bubbles.
//   atoms   — Atom Match: the atoms of 2 H₂O regroup into 2 H₂ + 1 O₂ — every atom is
//             still there (H pairs with H, O pairs with O).

export const GAMES = [
  { id: 'zapper', name: 'Molecule Zapper', short: 'Split water with zaps' },
  { id: 'bubbles', name: 'Bubble Detective', short: 'Which gas is that bubble?' },
  { id: 'atoms', name: 'Atom Match', short: 'Pair up the atoms' },
];

export const gameById = (id) => GAMES.find((g) => g.id === id) ?? GAMES[0];

/**
 * The station picks the game at random — never the same one twice in a row — so a kid
 * can't always play the easiest one. (The pick is kept until a round is played, so
 * leaving and coming back doesn't re-roll it: see electrolysis/index.js.)
 */
export function nextGame(lastId, random = Math.random) {
  const pool = GAMES.filter((g) => g.id !== lastId);
  return pool[Math.floor(random() * pool.length) % pool.length].id;
}

// ---------------------------------------------------------------- Bubble Detective
/** How many bubbles for a batch: a multiple of 3 (2 hydrogen : 1 oxygen), at least 3. */
export function bubbleCount(zaps) {
  return Math.max(3, Math.round(zaps / 3) * 3);
}

/**
 * The bubbles in the order they rise: exactly 2 hydrogen for every oxygen, shuffled a
 * little (each group of three holds 2 H₂ and 1 O₂, so the 2 : 1 ratio is always visible).
 */
export function bubbleSequence(count, random = Math.random) {
  const out = [];
  for (let i = 0; i < count / 3; i++) {
    const group = ['h2', 'h2', 'o2'];
    for (let j = group.length - 1; j > 0; j--) {
      const k = Math.floor(random() * (j + 1));
      [group[j], group[k]] = [group[k], group[j]];
    }
    out.push(...group);
  }
  return out;
}

/** Where a gas forms: hydrogen at the negative electrode, oxygen at the positive one. */
export const electrodeFor = (gas) => (gas === 'h2' ? 'minus' : 'plus');

// ---------------------------------------------------------------- Atom Match
/** How many rounds (each round: 2 water molecules → 2 H₂ + 1 O₂). */
export function atomRounds(zaps) {
  return Math.max(2, Math.round(zaps / 6));
}

/** One round: the atoms of 2 H₂O, loose. */
export function createAtomRound() {
  return {
    atoms: [
      { id: 0, el: 'H', used: false },
      { id: 1, el: 'H', used: false },
      { id: 2, el: 'O', used: false },
      { id: 3, el: 'H', used: false },
      { id: 4, el: 'H', used: false },
      { id: 5, el: 'O', used: false },
    ],
    selected: null,
    made: { H2: 0, O2: 0 },
  };
}

/**
 * Tap an atom. Returns what happened:
 *   { type: 'select' }               first atom of a pair picked
 *   { type: 'deselect' }             tapped the same atom again
 *   { type: 'pair', molecule }       two twins joined (H₂ or O₂); round.done when all paired
 *   { type: 'mismatch' }             H with O — they don't make a gas molecule here
 *   { type: 'ignored' }              atom already used
 */
export function tapAtom(round, id) {
  const atom = round.atoms.find((a) => a.id === id);
  if (!atom || atom.used) return { type: 'ignored' };
  if (round.selected === null) {
    round.selected = id;
    return { type: 'select' };
  }
  if (round.selected === id) {
    round.selected = null;
    return { type: 'deselect' };
  }
  const first = round.atoms.find((a) => a.id === round.selected);
  round.selected = null;
  if (first.el !== atom.el) return { type: 'mismatch', first: first.id };
  first.used = true;
  atom.used = true;
  const molecule = atom.el === 'H' ? 'H2' : 'O2';
  round.made[molecule]++;
  return { type: 'pair', molecule, ids: [first.id, atom.id], done: round.atoms.every((a) => a.used) };
}
