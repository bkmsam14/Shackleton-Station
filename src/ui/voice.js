// voice.js — HOOK for future voice lines (e.g. a calm suit voice: "Oxygen low").
// Today it does nothing. Later: map ids to audio files and play them here.
//   ids: 'oxygen-low', 'oxygen-critical', 'food-low', 'food-critical', 'power-low', 'power-out'
const listeners = [];

export function onVoiceLine(fn) {
  listeners.push(fn);
}

export function voiceLine(id) {
  for (const fn of listeners) fn(id);
}
