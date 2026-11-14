import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toSpeech } from '../src/systems/speechText.js';
import * as LINES from '../src/data/voltLines.js';

test('symbols are read out as words', () => {
  assert.equal(toSpeech('Oxygen drains about 2× faster!'), 'Oxygen drains about 2 times faster!');
  assert.equal(toSpeech('still 1/6 of Earth’s!'), 'still one sixth of Earth’s!');
  assert.equal(toSpeech('Each H₂O has 2 H'), 'Each H 2 O has 2 H');
  assert.equal(toSpeech('O₂ and H₂'), 'O 2 and H 2');
  assert.equal(toSpeech('about 0.9 kg of oxygen'), 'about 0.9 kilograms of oxygen');
  assert.equal(toSpeech('7.4 kWh'), '7.4 kilowatt hours');
  assert.equal(toSpeech('Walk with W A S D.'), 'Walk with W, A, S, D.');
});

test('HTML tags and arrows are removed, spacing tidied', () => {
  assert.equal(toSpeech('<b>Electrolysis</b> means   splitting → water'), 'Electrolysis means splitting water');
});

test('every Volt line turns into plain speakable text (no leftover symbols)', () => {
  const all = [
    ...LINES.TOUR,
    LINES.TOUR_DONE,
    ...Object.values(LINES.EVENTS),
    ...Object.values(LINES.VISITS),
    ...LINES.FACTS,
    ...Object.values(LINES.TALK),
  ];
  for (const l of all) assert.doesNotMatch(toSpeech(l.text), /[×₂→<>]|\b1\/6\b/, l.text);
});
