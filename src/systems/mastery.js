// mastery.js — per-station mastery (bronze / silver / gold) from the best star score.
// PURE LOGIC: the storage is injected ({ load, save }), so tests use an in-memory store
// and the game passes the try/catch-safe loadSettings/saveSettings from save.js.

const LEVELS = ['none', 'bronze', 'silver', 'gold']; // index = best stars (0–3)

export function levelFor(bestStars) {
  return LEVELS[Math.max(0, Math.min(3, bestStars | 0))];
}

export function createMastery(store) {
  let data = {};
  try {
    data = { ...(store.load().mastery ?? {}) };
  } catch {
    data = {}; // storage blocked — play on without saving
  }

  function get(station) {
    const e = data[station] ?? { bestStars: 0, runs: 0 };
    return { ...e, level: levelFor(e.bestStars) };
  }

  function recordRun(station, stars) {
    const prev = get(station);
    data[station] = { bestStars: Math.max(prev.bestStars, stars), runs: prev.runs + 1 };
    try {
      store.save({ mastery: data });
    } catch {
      // storage blocked — keep it in memory for this session
    }
    return get(station);
  }

  return { get, recordRun };
}
