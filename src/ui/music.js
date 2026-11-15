// music.js — two calm CC0 (public-domain) tracks that crossfade with where you are:
//   SPACE: "Outer Space Loop" by wipics — the main menu and inside the habitat/greenhouse
//          (https://opengameart.org/content/outer-space-loop)
//   MOON:  "Blue Moon Beach" by Tsorthan Grove (version without the lo-fi crackle) — outside
//          on the lunar surface: slow, wide and serene (https://opengameart.org/content/blue-moon-beach)
// Both are credited in public/CREDITS.md and the menus' credits. Lessons, the PDA and the pause
// menu keep the current track playing quietly. Starts on the first click (browsers only allow
// sound after a user gesture). One volume slider for both; saved by main.js.
//
// LOUDNESS MATCHING: the two files are mastered very differently (measured average level:
// space −12.9 dBFS, moon −27.6 dBFS, peaks 0.97 vs 0.40). So each track goes through its own
// Web Audio gain (NORMALIZE) into one music bus with a soft limiter, and both play equally loud.
// Without Web Audio it falls back to the element volume (the moon track is then quieter).
import { getAudio } from './sfx.js';

const BASE = import.meta.env.BASE_URL;
const TRACKS = {
  space: `${BASE}audio/outer-space-loop.mp3`,
  moon: `${BASE}audio/blue-moon-beach.ogg`,
};
// gain that brings each file to the same average level (≈ −20 dBFS before the volume slider)
const NORMALIZE = { space: 0.45, moon: 2.4 };
const MUSIC_MAX = 1.35; // overall music loudness at 100 % on the slider (under the sound effects)
// mood → [track, loudness]
const MOODS = {
  menu: ['space', 1],
  inside: ['space', 0.8],
  outside: ['moon', 1],
  lesson: [null, 0.35], // keep whichever track is playing, quieter
  off: [null, 0],
};

export function createMusic({ volume = 0.5 } = {}) {
  let vol = volume;
  let mood = 'menu';
  let current = 'space'; // the track the current mood wants
  let started = false;
  let graph = null; // { ctx, bus } once Web Audio is set up
  const tracks = {}; // id → { el, gain, level, ok, playing }

  function setupGraph() {
    if (graph) return graph;
    const a = getAudio();
    if (!a) return null;
    try {
      const { ctx } = a;
      const limiter = ctx.createDynamicsCompressor(); // catches any peak the boost could clip
      limiter.threshold.value = -6;
      limiter.knee.value = 6;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.005;
      limiter.release.value = 0.25;
      const bus = ctx.createGain();
      bus.connect(limiter).connect(ctx.destination); // music has its own slider, not the effects one
      graph = { ctx, bus };
    } catch {
      graph = null;
    }
    return graph;
  }

  function ensure(id) {
    if (tracks[id]) return tracks[id];
    const t = { el: null, gain: null, level: 0, ok: true, playing: false };
    try {
      t.el = new Audio(TRACKS[id]);
      t.el.loop = true;
      t.el.preload = id === 'space' ? 'auto' : 'metadata';
      t.el.addEventListener('error', () => (t.ok = false)); // e.g. a browser that can't play OGG
      const g = setupGraph();
      if (g) {
        const src = g.ctx.createMediaElementSource(t.el);
        t.gain = g.ctx.createGain();
        t.gain.gain.value = 0;
        src.connect(t.gain).connect(g.bus);
        t.el.volume = 1;
      } else t.el.volume = 0;
    } catch {
      t.ok = false;
    }
    tracks[id] = t;
    return t;
  }
  function play(t) {
    if (!t.el || t.playing || !started) return;
    t.playing = true;
    t.el.play().catch(() => (t.playing = false));
  }

  return {
    /** Call from a click/key handler: unlocks audio and starts the music. */
    start() {
      if (started) return;
      started = true;
      ensure('space');
      ensure('moon');
      play(tracks[current] ?? tracks.space);
    },
    /** 'menu' | 'inside' | 'outside' | 'lesson' | 'off' */
    setMood(m) {
      mood = MOODS[m] ? m : 'inside';
      const want = MOODS[mood][0];
      if (want) current = want;
    },
    setVolume(v) {
      vol = Math.max(0, Math.min(1, Number(v) || 0));
    },
    get volume() {
      return vol;
    },
    /** For testing: which track is wanted and each track's level / play state. */
    debug() {
      return {
        mood,
        current,
        webAudio: Boolean(graph),
        tracks: Object.fromEntries(
          Object.entries(tracks).map(([k, t]) => [k, { level: +t.level.toFixed(3), gain: t.gain ? +t.gain.gain.value.toFixed(3) : null, playing: t.playing, ok: t.ok, paused: t.el?.paused }]),
        ),
      };
    },
    /** Each frame (real seconds): crossfade toward the mood's track and loudness. */
    update(dt) {
      if (!started) return;
      // if the moon track can't play here, outside falls back to the space track
      const id = current === 'moon' && tracks.moon && !tracks.moon.ok ? 'space' : current;
      const loud = MOODS[mood][1];
      for (const [tid, t] of Object.entries(tracks)) {
        if (!t.el) continue;
        const target = tid === id ? loud * vol : 0;
        t.level += (target - t.level) * Math.min(1, dt * 0.8); // ~2–3 s crossfade
        if (target > 0) play(t);
        if (t.gain) {
          const g = t.level * NORMALIZE[tid] * MUSIC_MAX;
          if (Math.abs(t.gain.gain.value - g) > 0.002) t.gain.gain.value = g;
        } else {
          const v = Math.max(0, Math.min(1, t.level * 0.6));
          if (Math.abs(t.el.volume - v) > 0.002) t.el.volume = v;
        }
        if (t.playing && target === 0 && t.level < 0.003) {
          t.el.pause(); // silent track: stop decoding (resumes where it was)
          t.playing = false;
        }
      }
    },
  };
}
