// voltVoice.js — Volt's cute robot voice.
//
// 1. Words come from eSpeak (via the meSpeak package, GPL-3.0 — see public/CREDITS.md):
//    a small speech engine that runs inside the page, offline, the same in every browser.
//    We use its "Klatt" synthesizer at a high pitch: even and robotic, neither male nor female.
// 2. The sound then goes through a Web Audio "robot" chain: a ring modulator (metallic
//    shimmer), a tiny comb echo (tin-can sparkle), less bass + a little treble (a small,
//    cute robot), plus a "bip-bip" chirp before each line.
// 3. If the engine can't load, Volt falls back to the browser's built-in voice.
//
// The engine (~5 MB, ~1.5 MB gzipped) is a separate chunk, loaded in the background after
// the game starts (prewarm), so it doesn't slow the first screen.
// Interface: speak(text, done) / stop() / speaking / enabled / setEnabled(on).
import { toSpeech } from '../systems/speechText.js';
import { ASSISTANT as A } from '../config/gameplay.js';

let enginePromise = null;
/** Load meSpeak + its config + the English voice once (code-split by Vite). */
function loadEngine() {
  enginePromise ??= Promise.all([
    import('mespeak'),
    import('mespeak/src/mespeak_config.json'),
    import('mespeak/voices/en/en-us.json'),
  ]).then(([mod, cfg, voice]) => {
    const meSpeak = mod.default ?? mod;
    meSpeak.loadConfig(cfg.default ?? cfg);
    meSpeak.loadVoice(voice.default ?? voice);
    return meSpeak;
  });
  return enginePromise;
}

/** Synthesize a line to WAV bytes (Uint8Array). */
async function synthesize(text) {
  const meSpeak = await loadEngine();
  const bytes = meSpeak.speak(toSpeech(text), {
    rawdata: 'array',
    variant: A.VOICE_VARIANT,
    pitch: A.VOICE_ENGINE_PITCH,
    speed: A.VOICE_ENGINE_SPEED,
    amplitude: 100,
  });
  if (!bytes || !bytes.length) throw new Error('meSpeak returned no audio');
  return new Uint8Array(bytes);
}

/**
 * The robot effect chain. Works with a live AudioContext or an OfflineAudioContext
 * (used for previews/tests). Returns { input } — connect the voice source to it.
 */
export function buildRobotChain(ctx, destination) {
  const input = ctx.createGain();

  // ring modulation: voice × sine carrier → metallic robot tone (mixed with the clean voice)
  const ring = ctx.createGain();
  ring.gain.value = 0;
  const carrier = ctx.createOscillator();
  carrier.type = 'sine';
  carrier.frequency.value = A.ROBOT_RING_HZ;
  carrier.connect(ring.gain);
  carrier.start();
  const wet = ctx.createGain();
  wet.gain.value = A.ROBOT_RING_MIX;
  const dry = ctx.createGain();
  dry.gain.value = 1 - A.ROBOT_RING_MIX;
  const mix = ctx.createGain();
  input.connect(ring).connect(wet).connect(mix);
  input.connect(dry).connect(mix);

  // tiny comb echo: the "tin can" sparkle
  const delay = ctx.createDelay(0.05);
  delay.delayTime.value = A.ROBOT_COMB_MS / 1000;
  const feedback = ctx.createGain();
  feedback.gain.value = A.ROBOT_COMB_FEEDBACK;
  const comb = ctx.createGain();
  comb.gain.value = A.ROBOT_COMB_MIX;
  mix.connect(delay);
  delay.connect(feedback).connect(delay);
  delay.connect(comb);

  // tone: thin out the bass (a small robot), add a little sparkle, keep levels even
  const sum = ctx.createGain();
  mix.connect(sum);
  comb.connect(sum);
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = A.ROBOT_HIGHPASS_HZ;
  const presence = ctx.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 3000;
  presence.Q.value = 0.9;
  presence.gain.value = A.ROBOT_PRESENCE_DB;
  const compressor = ctx.createDynamicsCompressor();
  const out = ctx.createGain();
  out.gain.value = A.VOICE_VOLUME;
  sum.connect(highpass).connect(presence).connect(compressor).connect(out).connect(destination);
  return { input };
}

/** The cute "bip-bip" before Volt talks. Returns its length in seconds. */
function chirp(ctx, destination, at) {
  const notes = [
    [1050, 1500, 0.06],
    [1500, 1900, 0.05],
  ];
  let t = at;
  for (const [f0, f1, len] of notes) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(f1, t + len);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    osc.connect(g).connect(destination);
    osc.start(t);
    osc.stop(t + len + 0.02);
    t += len + 0.03;
  }
  return t - at;
}

export function createVoltVoice({ store } = {}) {
  const AudioCtx = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null;
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  let enabled = true;
  try {
    enabled = store?.load()?.voltVoice !== false;
  } catch {
    enabled = true;
  }
  let ctx = null;
  let chain = null;
  let source = null;
  let speaking = false;
  let onDone = null;
  let seq = 0; // each speak() call gets a number; stale async results are ignored
  let safetyTimer = 0;
  let engineBroken = false;

  function audio() {
    if (!ctx && AudioCtx) {
      ctx = new AudioCtx();
      chain = buildRobotChain(ctx, ctx.destination);
    }
    if (ctx?.state === 'suspended') ctx.resume();
    return ctx;
  }

  function finish(token) {
    if (token !== seq) return;
    clearTimeout(safetyTimer);
    speaking = false;
    source = null;
    const fn = onDone;
    onDone = null;
    fn?.();
  }

  /** Fallback: the browser's built-in voice (only if the robot engine failed). */
  function speakBrowser(text, token) {
    if (!synth) return finish(token);
    try {
      const u = new SpeechSynthesisUtterance(toSpeech(text));
      u.pitch = A.VOICE_PITCH;
      u.rate = A.VOICE_RATE;
      u.volume = A.VOICE_VOLUME;
      u.onend = u.onerror = () => finish(token);
      synth.speak(u);
      safetyTimer = setTimeout(() => finish(token), (text.split(/\s+/).length / 2.6) * 1000 + 3000);
    } catch {
      finish(token);
    }
  }

  async function speakRobot(text, token) {
    const bytes = await synthesize(text);
    if (token !== seq) return;
    const ac = audio();
    const buffer = await ac.decodeAudioData(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    if (token !== seq) return;
    const start = ac.currentTime + 0.03;
    const lead = A.ROBOT_CHIRP ? chirp(ac, chain.input, start) : 0;
    source = ac.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = A.VOICE_PLAYBACK_RATE;
    source.connect(chain.input);
    source.onended = () => finish(token);
    source.start(start + lead);
    const seconds = buffer.duration / A.VOICE_PLAYBACK_RATE + lead;
    clearTimeout(safetyTimer);
    safetyTimer = setTimeout(() => finish(token), seconds * 1000 + 1500);
  }

  return {
    /** Start loading the speech engine in the background (call once play begins). */
    prewarm() {
      if (AudioCtx) loadEngine().catch(() => (engineBroken = true));
    },
    get supported() {
      return Boolean(AudioCtx || synth);
    },
    get enabled() {
      return enabled;
    },
    get speaking() {
      return speaking;
    },
    setEnabled(on) {
      enabled = Boolean(on);
      if (!enabled) this.stop();
      try {
        store?.save({ voltVoice: enabled });
      } catch {
        // storage blocked — the setting just won't be remembered
      }
    },
    /** Say a line (stops the previous one). done() runs when Volt finishes. */
    speak(text, done) {
      this.stop();
      if (!enabled || !this.supported) {
        done?.();
        return false;
      }
      const token = seq;
      speaking = true; // includes the short synthesis time, so the bubble waits for him
      onDone = done ?? null;
      if (!AudioCtx || engineBroken) {
        speakBrowser(text, token);
        return true;
      }
      speakRobot(text, token).catch((err) => {
        console.warn('[volt] robot voice failed, using the browser voice instead', err);
        engineBroken = true;
        if (token === seq) speakBrowser(text, token);
      });
      return true;
    },
    /** Stop talking right now (pause menu, PDA, doors, mini-game, new line). */
    stop() {
      seq++;
      clearTimeout(safetyTimer);
      onDone = null;
      speaking = false;
      try {
        source?.stop();
      } catch {
        // already stopped
      }
      source = null;
      try {
        synth?.cancel();
      } catch {
        // ignore
      }
    },
    /**
     * Dev/preview helper: render a line through the robot chain offline.
     * Returns { sampleRate, samples: Float32Array } (mono).
     */
    async renderPreview(text) {
      const bytes = await synthesize(text);
      const probe = new OfflineAudioContext(1, 1, 22050);
      const buffer = await probe.decodeAudioData(bytes.buffer.slice(0));
      const lead = 0.2;
      const length = Math.ceil((buffer.duration / A.VOICE_PLAYBACK_RATE + lead + 0.3) * 44100);
      const off = new OfflineAudioContext(1, length, 44100);
      const c = buildRobotChain(off, off.destination);
      chirp(off, c.input, 0.02);
      const src = off.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = A.VOICE_PLAYBACK_RATE;
      src.connect(c.input);
      src.start(lead);
      const rendered = await off.startRendering();
      return { sampleRate: rendered.sampleRate, samples: rendered.getChannelData(0) };
    },
  };
}
