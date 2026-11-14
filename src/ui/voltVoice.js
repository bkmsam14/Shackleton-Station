// voltVoice.js — Volt speaks out loud with the browser's built-in text-to-speech
// (Web Speech API). Free, no download, no account; every line works, even new ones.
//
// - Prefers voices installed on the computer (voice.localService): they work offline and
//   the text never leaves the machine. Falls back to any English voice.
// - Pitch/rate are tuned so Volt sounds like a friendly robot (GAME BALANCE, in config).
// - Silent if the browser has no speech support, or if the player switched the voice off.
// One function (speak) is the whole interface, so recorded voice files could replace this
// module later without touching the rest of the game.
import { toSpeech } from '../systems/speechText.js';
import { ASSISTANT } from '../config/gameplay.js';

export function createVoltVoice({ store } = {}) {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  let enabled = true;
  try {
    enabled = store?.load()?.voltVoice !== false;
  } catch {
    enabled = true;
  }
  let voice = null;
  let speaking = false;
  let onDone = null;
  // Safety net: some browsers never fire 'end' (long lines, dropped online voices). After
  // the expected length plus a margin we treat the line as finished, so the bubble and the
  // talking mouth can't get stuck.
  let safetyTimer = 0;
  const WORDS_PER_SECOND = 2.6; // typical TTS pace at rate 1
  const SAFETY_MARGIN_MS = 3000;

  function pickVoice() {
    if (!synth) return;
    const voices = synth.getVoices();
    if (!voices.length) return;
    const english = voices.filter((v) => /^en(-|_|$)/i.test(v.lang));
    const pool = english.length ? english : voices;
    const score = (v) =>
      (v.localService ? 4 : 0) + // offline + private first
      (/en-(US|GB)/i.test(v.lang) ? 2 : 0) +
      (/natural|neural|online/i.test(v.name) ? 1 : 0) +
      (v.default ? 1 : 0);
    voice = [...pool].sort((a, b) => score(b) - score(a))[0];
  }
  if (synth) {
    pickVoice();
    synth.addEventListener?.('voiceschanged', pickVoice); // voices load late in Chrome
  }

  function finish() {
    clearTimeout(safetyTimer);
    speaking = false;
    const fn = onDone;
    onDone = null;
    fn?.();
  }

  return {
    get supported() {
      return Boolean(synth);
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
    /**
     * Say a line out loud (stops whatever Volt was saying). done() runs when he finishes,
     * or right away if the voice is off/unsupported.
     */
    speak(text, done) {
      this.stop();
      if (!synth || !enabled) {
        done?.();
        return false;
      }
      try {
        const spoken = toSpeech(text);
        const u = new SpeechSynthesisUtterance(spoken);
        if (voice) u.voice = voice;
        u.lang = voice?.lang ?? 'en-US';
        u.pitch = ASSISTANT.VOICE_PITCH;
        u.rate = ASSISTANT.VOICE_RATE;
        u.volume = ASSISTANT.VOICE_VOLUME;
        onDone = done ?? null;
        u.onend = finish;
        u.onerror = finish;
        speaking = true;
        synth.speak(u);
        const words = spoken.split(/\s+/).length;
        clearTimeout(safetyTimer);
        safetyTimer = setTimeout(finish, (words / WORDS_PER_SECOND / ASSISTANT.VOICE_RATE) * 1000 + SAFETY_MARGIN_MS);
        return true;
      } catch {
        finish();
        return false;
      }
    },
    /** Stop talking right now (pause menu, PDA, mini-game, new line). */
    stop() {
      if (!synth) return;
      clearTimeout(safetyTimer);
      onDone = null;
      speaking = false;
      try {
        synth.cancel();
      } catch {
        // ignore
      }
    },
  };
}
