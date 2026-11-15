// minigames.js — the Solar Fix repair's mini-games and their rules (PURE LOGIC: no DOM).
// Every game repairs the same micrometeoroid damage with the same Solar Panel Repair Kit;
// each teaches a different part of the science (docs/SCIENCE.md → Solar cells):
//
//   cells   — Cell Swap: cells are joined in chains (series), so one cracked cell holds
//             back its whole chain. Swap the cracked cells.                       (existing)
//   hotspot — Hot Spot Hunt: tiny cracks are hard to see, but a cracked cell gets hot.
//             An infrared (heat) camera shows the hot cells.
//   wires   — Wire Fix: the hit knocked the wire pieces loose. Electricity only flows round
//             a complete path (a circuit): turn the pieces until the path is unbroken.

export const GAMES = [
  { id: 'cells', name: 'Cell Swap', short: 'Swap the cracked cells' },
  { id: 'hotspot', name: 'Hot Spot Hunt', short: 'Find the hot cells' },
  { id: 'wires', name: 'Wire Fix', short: 'Join the wire path' },
];

export const gameById = (id) => GAMES.find((g) => g.id === id) ?? GAMES[0];

/** Today's game: random, never the same one twice in a row. */
export function nextGame(lastId, random = Math.random) {
  const pool = GAMES.filter((g) => g.id !== lastId);
  return pool[Math.floor(random() * pool.length) % pool.length].id;
}

/** Which cells are cracked: one in each of `broken` different rows (row → column). */
export function pickCracked(rows, cols, broken, random = Math.random) {
  const order = [...Array(rows).keys()];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return new Map(order.slice(0, broken).map((r) => [r, Math.floor(random() * cols) % cols]));
}

// ---------------------------------------------------------------- Wire Fix
// Sides: 0 = up, 1 = right, 2 = down, 3 = left. A piece turns clockwise a quarter at a time.
// A straight piece joins left–right at turn 0; a corner joins up–right at turn 0.
const opposite = (s) => (s + 2) % 4;

/** The sides a piece joins at its current turn. */
export function pieceSides(type, rot) {
  const base = type === 'straight' ? [3, 1] : [0, 1];
  return base.map((s) => (s + rot) % 4);
}

/** The snake-shaped path across a cols × rows grid (left to right, then back, …). */
export function snakePath(cols, rows) {
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) cells.push({ c: r % 2 === 0 ? k : cols - 1 - k, r });
  }
  return cells;
}

/**
 * A round: the wire path from the solar cells (enters the first piece from the left) to the
 * battery (leaves the last piece). `scramble` pieces start turned the wrong way.
 */
export function createWireRound({ cols = 4, rows = 3, scramble = 4, random = Math.random } = {}) {
  const path = snakePath(cols, rows);
  const dirTo = (a, b) => (b.c > a.c ? 1 : b.c < a.c ? 3 : b.r > a.r ? 2 : 0);
  const pieces = path.map((p, i) => {
    const inSide = i === 0 ? 3 : opposite(dirTo(path[i - 1], p));
    const outSide = i === path.length - 1 ? (p.c === cols - 1 ? 1 : 3) : dirTo(p, path[i + 1]);
    const type = inSide === opposite(outSide) ? 'straight' : 'corner';
    let need = 0;
    while (!sameSides(pieceSides(type, need), [inSide, outSide])) need++;
    return { ...p, type, need, rot: need, inSide, outSide };
  });
  const idx = [...pieces.keys()];
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  for (const i of idx.slice(0, Math.min(scramble, pieces.length))) {
    const p = pieces[i];
    p.rot = (p.need + 1 + (p.type === 'straight' ? 0 : Math.floor(random() * 3))) % 4;
  }
  return { cols, rows, pieces, turns: 0 };
}
function sameSides(a, b) {
  return (a[0] === b[0] && a[1] === b[1]) || (a[0] === b[1] && a[1] === b[0]);
}

/** Is this piece turned so it joins its neighbours? */
export const pieceOk = (p) => sameSides(pieceSides(p.type, p.rot), [p.inSide, p.outSide]);

/** Turn a piece a quarter clockwise. */
export function turnPiece(round, i) {
  const p = round.pieces[i];
  if (!p) return false;
  p.rot = (p.rot + 1) % 4;
  round.turns++;
  return true;
}

/** How far the electricity gets: the number of pieces joined in a row from the start. */
export function flowReach(round) {
  let n = 0;
  while (n < round.pieces.length && pieceOk(round.pieces[n])) n++;
  return n;
}

export const wireSolved = (round) => flowReach(round) === round.pieces.length;
