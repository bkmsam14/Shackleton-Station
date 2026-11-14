// sfx.js — small synthesized radio sounds for the supply system (no audio files).
// There is no air on the Moon, so nothing is heard from the landing itself; these are
// the base radio's beeps. Web Audio may be missing or blocked: every call is safe.
let ctx = null;
function audio() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = AC ? new AC() : null;
  } catch {
    ctx = null;
  }
  return ctx;
}
function beep(freq, at, dur, type = 'sine', gain = 0.09) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export const sfx = {
  unlock() {
    const a = audio();
    if (a && a.state === 'suspended') a.resume().catch(() => {});
  },
  click: () => beep(900, 0, 0.05, 'triangle', 0.05),
  /** request going out: a short burst of data chirps */
  transmit: () => [0, 0.07, 0.14, 0.21].forEach((t, i) => beep(1200 + i * 180, t, 0.05, 'square', 0.025)),
  /** reply received */
  confirmed: () => {
    beep(660, 0, 0.12, 'triangle');
    beep(990, 0.12, 0.18, 'triangle');
  },
  /** cargo down: the pad's radio beacon */
  landed: () => [0, 0.18, 0.36].forEach((t) => beep(784, t, 0.12, 'triangle', 0.1)),
  open: () => {
    beep(220, 0, 0.12, 'sawtooth', 0.04);
    beep(330, 0.08, 0.12, 'triangle', 0.06);
  },
  collect: () => {
    beep(523, 0, 0.1, 'triangle');
    beep(784, 0.1, 0.2, 'triangle');
  },
  alarm: () => [0, 0.25].forEach((t) => beep(440, t, 0.18, 'square', 0.04)),
  repair: () => [0, 0.08, 0.16, 0.3].forEach((t, i) => beep(500 + i * 160, t, 0.09, 'triangle', 0.08)),
};
