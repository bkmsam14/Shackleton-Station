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

  // ---------------------------------------------------------------- mini-game sound kits
  // Chemistry (Electrolysis): fizzing gas and bubbly pops.
  /** Gas fizzing out of water (a short bright hiss). */
  fizz() {
    noise({ seconds: 0.35, type: 'highpass', freq: 3200, gain: 0.35, attack: 0.02 });
    for (let i = 0; i < 3; i++) tone({ freq: 600 + Math.random() * 500, to: 1300, type: 'sine', seconds: 0.05, gain: 0.25, delay: 0.05 + i * 0.07 });
  },
  /** A little bubbly "blub-blub" (two bubbles joining up). */
  blub() {
    tone({ freq: 220, to: 520, type: 'sine', seconds: 0.08, gain: 0.5 });
    tone({ freq: 330, to: 760, type: 'sine', seconds: 0.08, gain: 0.45, delay: 0.09 });
  },
  // Electricity (Solar Fix): sparks, buzz and a power-up hum.
  /** A crackly electric spark. */
  spark() {
    noise({ seconds: 0.12, type: 'bandpass', freq: 4200, q: 1.5, gain: 0.5 });
    tone({ freq: 1800, to: 300, type: 'square', seconds: 0.06, gain: 0.25 });
  },
  /** Current starts flowing: a rising electric hum. */
  powerUp() {
    tone({ freq: 90, to: 240, type: 'sawtooth', seconds: 0.6, gain: 0.35 });
    tone({ freq: 180, to: 480, type: 'square', seconds: 0.6, gain: 0.12 });
  },
  /** A short electric buzz (a wire piece clicking into place). */
  buzz() {
    tone({ freq: 120, to: 120, type: 'sawtooth', seconds: 0.09, gain: 0.35 });
  },
  // Air + metal (Leak Fix): hiss, clank, sticky tape, squish.
  /** Air rushing out. */
  hiss() {
    noise({ seconds: 0.6, type: 'bandpass', freq: 2600, q: 0.8, gain: 0.35, attack: 0.05 });
  },
  /** A heavy hatch closing. */
  clank() {
    tone({ freq: 140, to: 60, type: 'triangle', seconds: 0.18, gain: 0.8 });
    tone({ freq: 900, to: 700, type: 'square', seconds: 0.05, gain: 0.15, delay: 0.01 });
  },
  /** Sticky tape pulled off the roll. */
  tape() {
    noise({ seconds: 0.25, type: 'bandpass', freq: 1500, q: 2, gain: 0.35 });
  },
  /** Something soft pressed down (the glue patch). */
  squish() {
    tone({ freq: 260, to: 110, type: 'sine', seconds: 0.16, gain: 0.5 });
    noise({ seconds: 0.12, type: 'lowpass', freq: 600, gain: 0.25 });
  },
  // Ice Drill / Ice Oven.
  /** The drill biting into frozen soil. */
  grind() {
    noise({ seconds: 0.18, type: 'bandpass', freq: 700, q: 1.2, gain: 0.45 });
    tone({ freq: 70, to: 60, type: 'sawtooth', seconds: 0.18, gain: 0.3 });
  },
  /** The oven's heater coming on (a warm "whoomp"). */
  heatUp() {
    noise({ seconds: 0.7, type: 'lowpass', freq: 500, gain: 0.4, attack: 0.15 });
    tone({ freq: 60, to: 110, type: 'sine', seconds: 0.7, gain: 0.35 });
  },
};

/** A short burst of filtered noise (fizz, hiss, sparks, crunch). */
function noise({ seconds = 0.2, type = 'bandpass', freq = 1000, q = 0.7, gain = 1, attack = 0.005, delay = 0 }) {
  const ac = audio();
  if (!ac) return;
  try {
    if (ac.state === 'suspended') ac.resume();
    const t0 = ac.currentTime + delay;
    const len = Math.max(1, Math.floor(ac.sampleRate * seconds));
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(MASTER_GAIN * gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    src.connect(f).connect(g).connect(master);
    src.start(t0);
    src.stop(t0 + seconds + 0.02);
  } catch {
    // never let sound break the game
  }
}

/**
 * One footstep. inside: a light tap on the metal floor (heard through the cabin air).
 * outside: a muffled crunch of moon dust — there is NO air outside, so you don't hear it
 * through the air: you feel it through your boots and suit, low and soft.
 */
export function footstep(inside, heavy = false) {
  const k = heavy ? 1.6 : 1;
  if (inside) {
    tone({ freq: 160, to: 90, type: 'triangle', seconds: 0.07, gain: 0.35 * k });
    noise({ seconds: 0.05, type: 'bandpass', freq: 2200 + Math.random() * 600, q: 2.5, gain: 0.18 * k });
  } else {
    noise({ seconds: 0.14, type: 'lowpass', freq: 380 + Math.random() * 120, gain: 0.5 * k, attack: 0.01 });
    tone({ freq: 70, to: 45, type: 'sine', seconds: 0.12, gain: 0.35 * k });
  }
}
