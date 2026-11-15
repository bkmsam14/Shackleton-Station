// Volt's airlock fact cards: the right direction, never the same fact twice in a mission.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AIRLOCK_FACTS } from '../src/data/airlockFacts.js';
import { pickAirlockFact } from '../src/systems/airlockFacts.js';
import { createMission, serializeMission } from '../src/systems/days.js';

test('airlock facts: only ones that fit the direction, each once per mission', () => {
  const seen = [];
  const always = { random: () => 0, chance: 1 };
  for (let i = 0; i < 20; i++) {
    const f = pickAirlockFact(AIRLOCK_FACTS, seen, 'out', always);
    if (!f) break;
    assert.ok(f.dir === 'out' || f.dir === 'any', f.id);
    assert.ok(!seen.includes(f.id), `repeated ${f.id}`);
    seen.push(f.id);
  }
  assert.equal(seen.length, AIRLOCK_FACTS.filter((f) => f.dir !== 'in').length);
  assert.equal(pickAirlockFact(AIRLOCK_FACTS, seen, 'out', always), null); // nothing new left going out
  const inFact = pickAirlockFact(AIRLOCK_FACTS, seen, 'in', always);
  assert.equal(inFact.dir, 'in');
});

test('airlock facts: a chance, not every time', () => {
  assert.equal(pickAirlockFact(AIRLOCK_FACTS, [], 'in', { random: () => 0.99, chance: 0.5 }), null);
  assert.ok(pickAirlockFact(AIRLOCK_FACTS, [], 'in', { random: () => 0.1, chance: 0.5 }));
});

test('airlock facts: every fact has a picture, two lines and a source; the mission save keeps what was shown', () => {
  for (const f of AIRLOCK_FACTS) {
    assert.ok(f.art && f.lines.length === 2 && f.source?.url?.startsWith('https://'), f.id);
  }
  const m = createMission();
  m.airlockFacts.push('depress');
  const again = createMission(JSON.parse(JSON.stringify(serializeMission(m))));
  assert.deepEqual(again.airlockFacts, ['depress']);
  assert.deepEqual(createMission(null).airlockFacts, []); // a new mission: none seen
});
