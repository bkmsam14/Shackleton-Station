import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GAMES,
  gameById,
  nextGame,
  bubbleCount,
  bubbleSequence,
  electrodeFor,
  atomRounds,
  createAtomRound,
  tapAtom,
} from '../src/instances/electrolysis/minigames.js';
import { tutorialSeen, markTutorialSeen } from '../src/systems/tutorials.js';
import { ELECTROLYSIS } from '../src/config/gameplay.js';
import { TUTORIALS, QUIZ, CONCEPT, TIPS, LEARN } from '../src/instances/electrolysis/content.js';
import { readFileSync } from 'node:fs';

// the picture names defined in tutorialArt.js (it builds SVG strings only, but read the
// names from the source so the test needs no DOM)
const ART_KEYS = [...readFileSync(new URL('../src/instances/electrolysis/tutorialArt.js', import.meta.url), 'utf8').matchAll(/^  (\w+): (?:svg|big)\(/gm)].map((m) => m[1]);

test('there are at least 3 electrolysis mini-games, each with a tutorial', () => {
  assert.ok(GAMES.length >= 3);
  for (const g of GAMES) {
    assert.ok(TUTORIALS[g.id], `tutorial for ${g.id}`);
    assert.ok(TUTORIALS[g.id].panels.length >= 2, 'picture panels');
    for (const p of TUTORIALS[g.id].panels) {
      assert.ok(ART_KEYS.includes(p.art), `picture ${p.art} exists`);
      assert.ok(p.caption.replace(/<[^>]+>/g, '').split(/\s+/).length <= 5, `short caption: ${p.caption}`);
    }
  }
  assert.equal(gameById('nope').id, 'zapper'); // unknown → the first game
});

test('the station picks the game at random, never the same one twice in a row', () => {
  for (const g of GAMES) {
    for (const r of [0, 0.3, 0.6, 0.99]) {
      const next = nextGame(g.id, () => r);
      assert.notEqual(next, g.id);
      assert.ok(GAMES.some((x) => x.id === next));
    }
  }
  // every other game can come up
  const seen = new Set([0, 0.99].map((r) => nextGame('zapper', () => r)));
  assert.deepEqual([...seen].sort(), ['atoms', 'bubbles']);
});

test('Bubble Detective: always 2 hydrogen for every oxygen', () => {
  for (const b of ELECTROLYSIS.BATCHES) {
    const n = bubbleCount(b.zaps);
    assert.equal(n % 3, 0);
    const seq = bubbleSequence(n, () => 0.42);
    assert.equal(seq.length, n);
    const h = seq.filter((g) => g === 'h2').length;
    const o = seq.filter((g) => g === 'o2').length;
    assert.equal(h, 2 * o);
  }
  assert.equal(electrodeFor('h2'), 'minus'); // hydrogen at the − electrode
  assert.equal(electrodeFor('o2'), 'plus'); // oxygen at the + electrode
});

test('Atom Match: 2 H₂O → 2 H₂ + 1 O₂, twins only, no atom lost', () => {
  const r = createAtomRound();
  assert.equal(r.atoms.filter((a) => a.el === 'H').length, 4);
  assert.equal(r.atoms.filter((a) => a.el === 'O').length, 2);
  assert.equal(tapAtom(r, 0).type, 'select'); // H
  assert.equal(tapAtom(r, 2).type, 'mismatch'); // H + O: no
  assert.equal(r.atoms.every((a) => !a.used), true);
  assert.equal(tapAtom(r, 0).type, 'select');
  assert.equal(tapAtom(r, 0).type, 'deselect');
  let res = (tapAtom(r, 0), tapAtom(r, 1));
  assert.deepEqual([res.type, res.molecule, res.done], ['pair', 'H2', false]);
  assert.equal(tapAtom(r, 1).type, 'ignored'); // used
  res = (tapAtom(r, 3), tapAtom(r, 4));
  assert.equal(res.molecule, 'H2');
  res = (tapAtom(r, 2), tapAtom(r, 5));
  assert.deepEqual([res.molecule, res.done], ['O2', true]);
  assert.deepEqual(r.made, { H2: 2, O2: 1 });
  for (const b of ELECTROLYSIS.BATCHES) assert.ok(atomRounds(b.zaps) >= 2);
});

test('a tutorial shows once: seen after it is marked', () => {
  let data = {};
  const store = { load: () => data, save: (p) => (data = { ...data, ...p }) };
  assert.equal(tutorialSeen('electrolysis-bubbles', store), false);
  markTutorialSeen('electrolysis-bubbles', store);
  assert.equal(tutorialSeen('electrolysis-bubbles', store), true);
  assert.equal(tutorialSeen('electrolysis-atoms', store), false);
  // blocked storage never throws
  const broken = { load: () => { throw new Error('blocked'); }, save: () => { throw new Error('blocked'); } };
  assert.equal(tutorialSeen('x', broken), false);
  markTutorialSeen('x', broken);
});

test('every quiz question has a right answer, a hint and a source', () => {
  for (const q of QUIZ) {
    assert.ok(q.options[q.answer]);
    assert.ok(q.hint && q.explain && q.source?.url);
  }
});

const words = (t) => t.replace(/<[^>]+>/g, '').trim().split(/\s+/).length;

test('Volt teaches every game in few words: idea, tips, what really happened', () => {
  for (const g of GAMES) {
    assert.ok(CONCEPT[g.id] && words(CONCEPT[g.id]) <= 16, `idea for ${g.id}`);
    const L = LEARN[g.id];
    assert.ok(L && ART_KEYS.includes(L.art), `diagram for ${g.id}`);
    assert.ok(L.lines.length <= 2 && L.lines.every((l) => words(l) <= 12), `short recap for ${g.id}`);
    assert.ok(words(L.real) <= 20 && L.source?.url, `real-world line + source for ${g.id}`);
  }
  for (const set of Object.values(TIPS)) for (const t of Object.values(set)) assert.ok(words(t) <= 10, `short tip: ${t}`);
});
