// voltVoice.worker.js — runs Volt's speech engine (meSpeak/eSpeak, GPL-3.0) in a Web Worker.
// Synthesis is one long synchronous call; on the main thread it froze the game for a moment
// every time Volt spoke (much longer on slow school laptops). Here it runs in the background.
// In a worker there is no `window`, so meSpeak takes its "raw data only" path — which is all
// we need: it returns WAV bytes that the page plays through the Web Audio robot chain.
import meSpeak from 'mespeak';
import config from 'mespeak/src/mespeak_config.json';
import voice from 'mespeak/voices/en/en-us.json';

let ready = false;
function init() {
  if (ready) return;
  meSpeak.loadConfig(config);
  meSpeak.loadVoice(voice);
  ready = true;
}

self.onmessage = (e) => {
  const { id, text, options } = e.data ?? {};
  try {
    init();
    if (id === 'warmup') {
      self.postMessage({ id, ok: true });
      return;
    }
    const data = meSpeak.speak(text, { ...options, rawdata: 'array' });
    if (!data || !data.length) throw new Error('meSpeak returned no audio');
    const bytes = new Uint8Array(data);
    self.postMessage({ id, ok: true, bytes }, [bytes.buffer]);
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err?.message ?? err) });
  }
};
