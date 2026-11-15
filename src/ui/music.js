// music.js — the calm space ambience: "Outer Space Loop" by wipics (CC0 / public domain,
// OpenGameArt: https://opengameart.org/content/outer-space-loop), credited in public/CREDITS.md
// and the pause-menu credits. One looping <audio> element; it fades between three moods:
//   menu / outside (in space): full · inside a module: softer · in a lesson or rest: quiet.
// Starts on the first click (browsers only allow sound after a user gesture). Volume saved.
const SRC = `${import.meta.env.BASE_URL}audio/outer-space-loop.mp3`;
const LEVEL = { menu: 1, outside: 1, inside: 0.45, lesson: 0.3, off: 0 };

export function createMusic({ volume = 0.5 } = {}) {
  let el = null;
  let vol = volume;
  let mood = 'menu';
  let level = 0; // current fade level 0..1 (times vol)
  let started = false;

  function ensure() {
    if (el) return el;
    try {
      el = new Audio(SRC);
      el.loop = true;
      el.preload = 'auto';
      el.volume = 0;
    } catch {
      el = null;
    }
    return el;
  }

  return {
    /** Call from a click/key handler: starts the music (once). */
    start() {
      const a = ensure();
      if (!a || started) return;
      started = true;
      a.play().catch(() => {
        started = false; // blocked: try again on the next gesture
      });
    },
    /** 'menu' | 'outside' | 'inside' | 'lesson' | 'off' */
    setMood(m) {
      mood = LEVEL[m] === undefined ? 'inside' : m;
    },
    setVolume(v) {
      vol = Math.max(0, Math.min(1, Number(v) || 0));
    },
    get volume() {
      return vol;
    },
    /** Each frame (real seconds): ease toward the mood's level. */
    update(dt) {
      if (!el) return;
      const target = LEVEL[mood] * vol;
      level += (target - level) * Math.min(1, dt * 1.2);
      const v = Math.max(0, Math.min(1, level * 0.6)); // 0.6: music sits under the sound effects
      if (Math.abs(el.volume - v) > 0.002) el.volume = v;
    },
  };
}
