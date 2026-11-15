// airlockFacts.js — which airlock fact Volt explains, if any (PURE LOGIC: no DOM).
// On an airlock cycle there is a chance (AIRLOCK.FACT_CHANCE) that Volt explains one fact
// that fits the direction and hasn't been shown yet in this mission (the mission save keeps
// the ids; a new mission starts with none seen).
import { AIRLOCK } from '../config/gameplay.js';

/**
 * facts: [{ id, dir: 'out' | 'in' | 'any' }]; seen: ids already shown; direction: 'out' | 'in'.
 * Returns a fact or null (no luck this time, or nothing new left for this direction).
 */
export function pickAirlockFact(facts, seen, direction, { random = Math.random, chance = AIRLOCK.FACT_CHANCE } = {}) {
  const left = facts.filter((f) => (f.dir === direction || f.dir === 'any') && !seen.includes(f.id));
  if (!left.length || !(random() < chance)) return null;
  return left[Math.floor(random() * left.length) % left.length];
}
