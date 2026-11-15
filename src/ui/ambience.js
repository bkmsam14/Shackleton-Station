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
  suitBreath: 0.32, // one breath at its loudest (close to your mouth inside the helmet)
  suitFan: 0.02, // the suit's steady ventilation airflow
  hiss: 0.22, // airlock air rushing
  motor: 0.08, // airlock pump motor (through the air)
  boots: 0.025, // the same motor felt through your boots (no air needed)
};

export function createAmbience() {
  let a = null; // { ctx, out, noise, habitat, suit, lock }
  let zone = 'habitat';
  let lockOn = false;
  let exertion = 0; // 0 resting … 1 hopping fast (breaths come faster and stronger)
  let nextBreath = 0; // AudioContext time of the next breath (0 = not breathing in a suit)

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

    // suit: real breaths (scheduled one by one in update(): in → pause → out) + the suit's
    // ventilation fan, all through a tiny "helmet" echo (sound bouncing inside the bubble helmet,
    // right next to your face). Outside there is no air, so this is ALL you hear out there.
    const suitBus = gain(0);
    const helmetIn = gain(1);
    const helmetTone = filter('lowpass', 5200, 0.5);
    helmetIn.connect(helmetTone);
    for (const [sec, fb] of [[0.0085, 0.26], [0.0145, 0.18]]) {
      const dl = ctx.createDelay(0.05);
      dl.delayTime.value = sec;
      const fbG = gain(fb);
      helmetIn.connect(dl);
      dl.connect(fbG).connect(dl);
      dl.connect(gain(0.35)).connect(helmetTone);
    }
    helmetTone.connect(suitBus);
    const suitFanG = gain(LEVEL.suitFan);
    noiseSrc().connect(filter('bandpass', 900, 0.6)).connect(suitFanG).connect(helmetIn);
    noiseSrc().connect(filter('lowpass', 180)).connect(gain(LEVEL.suitFan * 1.5)).connect(helmetIn);
    suitBus.connect(out);

    /** One breath (in + out) starting at time t0. e = exertion 0..1. Returns its length (s). */
    function breath(t0, e) {
      const inDur = 1.25 - 0.4 * e + Math.random() * 0.15;
      const gap = 0.16 + Math.random() * 0.08;
      const outDur = 1.65 - 0.45 * e + Math.random() * 0.2;
      const peak = LEVEL.suitBreath * (1 + 0.6 * e);
      const shot = (start, dur) => {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        src.start(start, Math.random() * 1.5);
        src.stop(start + dur + 0.05);
        return src;
      };
      // breathing IN: an airy, rising hiss (air rushing past the lips)
      {
        const src = shot(t0, inDur);
        const bp = filter('bandpass', 1000, 1.1);
        bp.frequency.setValueAtTime(950, t0);
        bp.frequency.linearRampToValueAtTime(1750, t0 + inDur);
        const air = filter('highpass', 3600, 0.7);
        const g = gain(0);
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(peak * 0.85, t0 + inDur * 0.55);
        g.gain.linearRampToValueAtTime(0, t0 + inDur);
        src.connect(bp).connect(g);
        src.connect(air).connect(gain(0.18)).connect(g);
        g.connect(helmetIn);
      }
      // breathing OUT: warmer and lower, falling away (a soft "hhhh")
      {
        const t1 = t0 + inDur + gap;
        const src = shot(t1, outDur);
        const lp = filter('lowpass', 1500, 0.7);
        lp.frequency.setValueAtTime(1600, t1);
        lp.frequency.exponentialRampToValueAtTime(700, t1 + outDur);
        const chest = filter('bandpass', 420, 1.0); // a little chest/mouth body
        const g = gain(0);
        g.gain.setValueAtTime(0, t1);
        g.gain.linearRampToValueAtTime(peak, t1 + 0.14);
        g.gain.exponentialRampToValueAtTime(peak * 0.25, t1 + outDur * 0.8);
        g.gain.linearRampToValueAtTime(0, t1 + outDur);
        src.connect(lp).connect(g);
        src.connect(chest).connect(gain(0.6)).connect(g);
        g.connect(helmetIn);
      }
      return inDur + gap + outDur;
    }

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

    a = { ctx, out, habitatBus, suitBus, hissF, hissG, motorG, motorF, bootsG, breath };
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
      const suit = active && !lockOn && !inside;
      ramp(s.habitatBus.gain, active && !lockOn && inside ? LEVEL.habitat : 0, 0.6);
      ramp(s.suitBus.gain, suit ? 1 : 0, 0.6);
      // breaths: schedule each one a moment before it starts (rest ≈ one every 4.5 s)
      const now = s.ctx.currentTime;
      if (!suit) {
        nextBreath = 0;
        return;
      }
      if (!nextBreath || nextBreath < now) nextBreath = now + 0.4;
      if (nextBreath < now + 0.2) {
        const len = s.breath(nextBreath, exertion);
        const rest = (1.7 - 1.1 * exertion) * (0.85 + Math.random() * 0.3); // a natural pause
        nextBreath += len + rest;
      }
    },

    /**
     * How hard you are working in the suit (0 resting … 1 hopping fast): you breathe faster
     * and a little louder — like a real spacewalk, where you use about 2× more oxygen (BVAD).
     */
    setExertion(x) {
      exertion = Math.max(0, Math.min(1, x));
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
