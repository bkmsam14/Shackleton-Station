// sfx.js — tiny synthesized sounds for the farming minigame (no audio files needed).
// Web Audio can be missing or blocked, so every call is safe to make without it.
let ctx = null;
let noiseBuf = null;
let pour = null;

function audio() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch {
    ctx = null;
  }
  return ctx;
}

function env(gain, t0, attack, hold, release, peak) {
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  gain.gain.setValueAtTime(peak, t0 + attack + hold);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + hold + release);
}

function tone(freqFrom, freqTo, dur, type = 'sine', peak = 0.18, delay = 0) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freqFrom, t);
  o.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
  env(g, t, 0.008, 0, dur, peak);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur, { type = 'lowpass', freq = 800, q = 0.7, peak = 0.2 } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  const src = a.createBufferSource();
  src.buffer = noiseBuf;
  const f = a.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = a.createGain();
  env(g, t, 0.01, dur * 0.3, dur * 0.7, peak);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
}

export const sfx = {
  /** Call from a user gesture so the browser lets audio start. */
  unlock() {
    const a = audio();
    if (a && a.state === 'suspended') a.resume().catch(() => {});
  },
  pickUp: () => tone(500, 700, 0.07, 'triangle', 0.08),
  plop: () => {
    tone(320, 110, 0.16, 'sine', 0.22);
    noise(0.12, { freq: 500, peak: 0.08 });
  },
  scrape: () => noise(0.22, { type: 'bandpass', freq: 1300, q: 0.8, peak: 0.16 }),
  snip: () => {
    noise(0.05, { type: 'highpass', freq: 3500, peak: 0.22 });
    tone(2600, 1800, 0.06, 'square', 0.03);
  },
  crunch: () => {
    noise(0.07, { type: 'bandpass', freq: 1800, q: 1.2, peak: 0.2 });
    setTimeout(() => noise(0.07, { type: 'bandpass', freq: 1500, q: 1.2, peak: 0.16 }), 120);
  },
  success: () => {
    tone(523, 523, 0.14, 'triangle', 0.12);
    tone(784, 784, 0.22, 'triangle', 0.12, 0.12);
  },
  reward: () => {
    tone(523, 523, 0.12, 'triangle', 0.12);
    tone(659, 659, 0.12, 'triangle', 0.12, 0.1);
    tone(988, 988, 0.3, 'triangle', 0.12, 0.2);
  },
  /** Continuous water sound; level 0..1 (0 = silent). */
  pouring(level) {
    const a = level > 0 ? audio() : ctx;
    if (!a) return;
    if (!pour && level > 0) {
      const src = a.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      const f = a.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 2200;
      f.Q.value = 0.6;
      const g = a.createGain();
      g.gain.value = 0;
      src.connect(f).connect(g).connect(a.destination);
      src.start();
      pour = { src, g };
    }
    if (pour) pour.g.gain.setTargetAtTime(level * 0.12, a.currentTime, 0.05);
  },
};
