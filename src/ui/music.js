// music.js — two calm CC0 (public-domain) tracks that crossfade with where you are:
//   SPACE: "Outer Space Loop" by wipics — the main menu and inside the habitat/greenhouse
//          (https://opengameart.org/content/outer-space-loop)
//   MOON:  "Blue Moon Beach" by Tsorthan Grove (version without the lo-fi crackle) — outside
//          on the lunar surface: slow, wide and serene (https://opengameart.org/content/blue-moon-beach)
// Both are credited in public/CREDITS.md and the menus' credits. Lessons, the PDA and the pause
// menu keep the current track playing quietly. Starts on the first click (browsers only allow
// sound after a user gesture). One volume slider for both; saved by main.js.
const BASE = import.meta.env.BASE_URL;
const TRACKS = {
  space: `${BASE}audio/outer-space-loop.mp3`,
  moon: `${BASE}audio/blue-moon-beach.ogg`,
};
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
  const tracks = {}; // id → { el, level, ok }

  function ensure(id) {
    if (tracks[id]) return tracks[id];
    const t = { el: null, level: 0, ok: true, playing: false };
    try {
      t.el = new Audio(TRACKS[id]);
      t.el.loop = true;
      t.el.preload = id === 'space' ? 'auto' : 'metadata';
      t.el.volume = 0;
      t.el.addEventListener('error', () => (t.ok = false)); // e.g. a browser that can't play OGG
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
      return { mood, current, tracks: Object.fromEntries(Object.entries(tracks).map(([k, t]) => [k, { level: +t.level.toFixed(3), playing: t.playing, ok: t.ok, paused: t.el?.paused }])) };
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
        const v = Math.max(0, Math.min(1, t.level * 0.6)); // 0.6: music sits under the sound effects
        if (Math.abs(t.el.volume - v) > 0.002) t.el.volume = v;
        if (t.playing && target === 0 && t.level < 0.003) {
          t.el.pause(); // silent track: stop decoding (resumes where it was)
          t.playing = false;
        }
      }
    },
  };
}
