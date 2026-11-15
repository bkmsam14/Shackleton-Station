// sfx.js — tiny synthesised sound effects (WebAudio, no audio files to download).
// Silent when WebAudio is missing or blocked. The AudioContext is created on the first
// sound, which always follows a click or key press (browsers require a user gesture).

let ctx = null;
let failed = false;
let master = null; // one volume knob for every game sound (pause menu → Sound effects)
let volume = 0.8;
const MASTER_GAIN = 0.18; // keep it gentle

function audio() {
  if (ctx || failed) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error('no WebAudio');
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
  } catch {
    failed = true;
  }
  return ctx;
}

/** The shared AudioContext + master gain (null if audio is unavailable). Used by ui/ambience.js. */
export function getAudio() {
  const ac = audio();
  if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
  return ac ? { ctx: ac, out: master } : null;
}

/** Sound-effects volume 0..1 (saved by main.js). */
export function setVolume(v) {
  volume = Math.max(0, Math.min(1, Number(v) || 0));
  if (master && ctx) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.05);
}
export const getVolume = () => volume;

function tone({ freq, to = freq, type = 'sine', seconds = 0.15, gain = 1, delay = 0 }) {
  const ac = audio();
  if (!ac) return;
  try {
    if (ac.state === 'suspended') ac.resume();
    const t0 = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + seconds);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(MASTER_GAIN * gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.02);
  } catch {
    // never let sound break the game
  }
}

export const sfx = {
  /** combo raises the pitch a little for each quick zap in a row */
  zap(combo = 1) {
    const up = 1 + Math.min(combo - 1, 6) * 0.08;
    tone({ freq: 900 * up, to: 180 * up, type: 'sawtooth', seconds: 0.12, gain: 0.6 });
  },
  pop() {
    tone({ freq: 520, to: 980, type: 'sine', seconds: 0.09, gain: 0.7 });
  },
  bubble() {
    tone({ freq: 300 + Math.random() * 200, to: 700, type: 'sine', seconds: 0.07, gain: 0.35 });
  },
  miss() {
    tone({ freq: 160, to: 90, type: 'triangle', seconds: 0.18, gain: 0.6 });
  },
  success() {
    [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, type: 'triangle', seconds: 0.22, gain: 0.7, delay: i * 0.1 }));
  },
  /** Storm warning: a soft two-tone "dee-doo" ×3 — noticeable, not scary. */
  alarm() {
    for (let i = 0; i < 3; i++) {
      tone({ freq: 880, type: 'triangle', seconds: 0.22, gain: 0.8, delay: i * 0.55 });
      tone({ freq: 660, type: 'triangle', seconds: 0.26, gain: 0.8, delay: i * 0.55 + 0.24 });
    }
  },
  /** One dosimeter tick (very short and quiet; many of them make the "Geiger" crackle). */
  tick() {
    tone({ freq: 2400, to: 1200, type: 'square', seconds: 0.014, gain: 0.22 });
  },
  click() {
    tone({ freq: 700, to: 500, type: 'sine', seconds: 0.05, gain: 0.4 });
  },
};
