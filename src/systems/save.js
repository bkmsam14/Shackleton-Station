// save.js — tiny settings store. localStorage can be missing or blocked, so every
// access is wrapped in try/catch and the game works without it.
const KEY = 'shackleton-station:v1';

export function loadSettings() {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveSettings(patch) {
  const next = { ...loadSettings(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage unavailable — keep going
  }
  return next;
}
