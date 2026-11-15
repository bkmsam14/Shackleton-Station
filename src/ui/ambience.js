// ambience.js — background sounds, all synthesised with WebAudio (no files to download).
//
// The science: SOUND NEEDS AIR. Inside a module you hear its air vents humming. In the airlock
// the pump hiss gets quieter and more muffled as the air is pumped out, until it is almost
// silent — you still faintly "hear" the pump motor through your boots (vibration travels
// through solid things). Outside, in vacuum, the world is silent: you only hear your own suit
// (breathing and its fan).
// Kid-safe: everything is soft; no sudden loud sounds. All of it goes through the master
// volume in ui/sfx.js (pause menu → Sound effects).
import { getAudio } from './sfx.js';

const LEVEL = {
  habitat: 0.05, // air-vent hum inside a module
  suitBreath: 0.05,
  suitFan: 0.025,
  hiss: 0.22, // airlock air rushing
  motor: 0.08, // airlock pump motor (through the air)
  boots: 0.025, // the same motor felt through your boots (no air needed)
};

export function createAmbience() {
  let a = null; // { ctx, out, noise, habitat, suit, lock }
  let zone = 'habitat';
  let lockOn = false;

  function setup() {
    if (a) return a;
    const audio = getAudio();
    if (!audio) return null;
    const { ctx, out } = audio;
    // 2 s of white noise, looped by every noise source
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const noiseSrc = () => {
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.loop = true;
      s.start();
      return s;
    };
    const gain = (v = 0) => {
      const g = ctx.createGain();
      g.gain.value = v;
      return g;
    };
    const filter = (type, freq, q = 0.7) => {
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      return f;
    };

    // habitat: low air-vent rumble + a soft 60 Hz-ish fan tone
    const habitatBus = gain(0);
    noiseSrc().connect(filter('lowpass', 220)).connect(habitatBus);
    const fan = ctx.createOscillator();
    fan.type = 'sine';
    fan.frequency.value = 58;
    const fanG = gain(0.35);
    fan.connect(fanG).connect(habitatBus);
    fan.start();
    habitatBus.connect(out);

    // suit: breathing (band-passed noise, slow in/out) + a quiet fan
    const suitBus = gain(0);
    const breathG = gain(0);
    noiseSrc().connect(filter('bandpass', 750, 0.9)).connect(breathG).connect(suitBus);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.22; // ~4.5 s per breath
    const lfoDepth = gain(LEVEL.suitBreath / 2);
    lfo.connect(lfoDepth).connect(breathG.gain);
    breathG.gain.value = LEVEL.suitBreath / 2;
    lfo.start();
    const suitFanG = gain(LEVEL.suitFan);
    noiseSrc().connect(filter('lowpass', 300)).connect(suitFanG).connect(suitBus);
    suitBus.connect(out);

    // airlock: rushing air (its brightness + loudness follow the pressure) + pump motor
    const hissF = filter('bandpass', 2400, 0.6);
    const hissG = gain(0);
    noiseSrc().connect(hissF).connect(hissG).connect(out);
    const motor = ctx.createOscillator();
    motor.type = 'sawtooth';
    motor.frequency.value = 74;
    const motorF = filter('lowpass', 420);
    const motorG = gain(0);
    motor.connect(motorF).connect(motorG).connect(out);
    const bootsG = gain(0);
    motor.connect(filter('lowpass', 110)).connect(bootsG).connect(out);
    motor.start();

    a = { ctx, out, habitatBus, suitBus, hissF, hissG, motorG, motorF, bootsG };
    return a;
  }

  const ramp = (param, v, t = 0.25) => a && param.setTargetAtTime(v, a.ctx.currentTime, t);

  function oneShot(build) {
    const s = setup();
    if (!s) return;
    try {
      build(s.ctx, s.out);
    } catch {
      // never let sound break the game
    }
  }

  return {
    /** Each frame: where you are. zoneId 'outside' = suit sounds; a module = its hum. */
    update(zoneId, active) {
      zone = zoneId;
      const s = active ? setup() : a;
      if (!s) return;
      const inside = zone !== 'outside';
      ramp(s.habitatBus.gain, active && !lockOn && inside ? LEVEL.habitat : 0, 0.6);
      ramp(s.suitBus.gain, active && !lockOn && !inside ? 1 : 0, 0.6);
    },

    /** Airlock: start / follow the pressure / stop. pressure 1 = module air, 0 = vacuum. */
    airlockStart() {
      lockOn = true;
      setup();
    },
    airlockUpdate(pressure, phase) {
      if (!a) return;
      const p = Math.max(0, Math.min(1, pressure));
      const moving = phase === 'pump' || phase === 'vent';
      // thin air carries less sound, and the high notes go first (muffled)
      ramp(a.hissF.frequency, 500 + 3200 * p, 0.1);
      ramp(a.hissG.gain, moving ? LEVEL.hiss * p * (phase === 'vent' ? 1.4 : 1) : 0, 0.12);
      ramp(a.motorF.frequency, 120 + 500 * p, 0.1);
      ramp(a.motorG.gain, phase === 'pump' ? LEVEL.motor * p : 0, 0.15);
      ramp(a.bootsG.gain, phase === 'pump' ? LEVEL.boots : 0, 0.15); // felt through your boots
    },
    airlockStop() {
      lockOn = false;
      if (!a) return;
      ramp(a.hissG.gain, 0, 0.1);
      ramp(a.motorG.gain, 0, 0.1);
      ramp(a.bootsG.gain, 0, 0.1);
    },

    /** A hatch sealing: a low thump + a short metal clank (quieter in thin air). */
    clunk(pressure = 1) {
      oneShot((ctx, out) => {
        const t = ctx.currentTime;
        const thump = ctx.createOscillator();
        const tg = ctx.createGain();
        thump.frequency.setValueAtTime(110, t);
        thump.frequency.exponentialRampToValueAtTime(42, t + 0.25);
        tg.gain.setValueAtTime(0.0001, t);
        tg.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
        tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        thump.connect(tg).connect(out);
        thump.start(t);
        thump.stop(t + 0.32);
        const clank = ctx.createOscillator();
        const cg = ctx.createGain();
        clank.type = 'square';
        clank.frequency.setValueAtTime(620, t);
        const air = 0.25 + 0.75 * pressure;
        cg.gain.setValueAtTime(0.0001, t);
        cg.gain.exponentialRampToValueAtTime(0.06 * air, t + 0.005);
        cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 900 + 2000 * pressure;
        clank.connect(lp).connect(cg).connect(out);
        clank.start(t);
        clank.stop(t + 0.14);
      });
    },

    /** Soft two-note "ready" chime (lights green). */
    chime() {
      oneShot((ctx, out) => {
        [784, 1175].forEach((f, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          const t = ctx.currentTime + i * 0.16;
          o.type = 'triangle';
          o.frequency.value = f;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.09, t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
          o.connect(g).connect(out);
          o.start(t);
          o.stop(t + 0.5);
        });
      });
    },
  };
}
