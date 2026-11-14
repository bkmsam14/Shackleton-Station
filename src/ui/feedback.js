// feedback.js — crosshair, minimal interaction prompt, one-line captions, screen fade.
// Captions replace the old toast cards: a few words, no box. The full sentence goes to the
// PDA log (Tab), so the main HUD stays clean.

export function createFeedback(root) {
  const crosshair = el('div', 'crosshair');
  const prompt = el('div', 'prompt');
  prompt.setAttribute('role', 'status');
  prompt.innerHTML = '<span class="keycap-line">E</span><span class="prompt-text"></span>';
  const promptText = prompt.querySelector('.prompt-text');
  const caption = el('div', 'caption');
  caption.setAttribute('aria-live', 'polite');
  const fade = el('div', 'fade');
  const card = el('div', 'fade-card');
  fade.appendChild(card);
  root.append(crosshair, prompt, caption, fade);

  let currentPrompt = null;
  let captionTimer = 0;
  const log = [];
  let clock = () => '';

  function setCaption(text, seconds, tone) {
    caption.textContent = text;
    caption.dataset.tone = tone;
    caption.classList.remove('is-on');
    void caption.offsetWidth;
    caption.classList.add('is-on');
    clearTimeout(captionTimer);
    captionTimer = setTimeout(() => caption.classList.remove('is-on'), seconds * 1000);
  }

  return {
    log,
    /** Provide a function that returns the in-game time label for log entries. */
    setClock(fn) {
      clock = fn;
    },
    setPrompt(text) {
      if (text === currentPrompt) return;
      currentPrompt = text;
      if (text) {
        const t = text.replace(/^Press E to /, '');
        promptText.textContent = t.charAt(0).toUpperCase() + t.slice(1);
        prompt.classList.add('is-visible');
        crosshair.classList.add('is-target');
      } else {
        prompt.classList.remove('is-visible');
        crosshair.classList.remove('is-target');
      }
    },
    setCrosshairVisible(v) {
      crosshair.style.display = v ? '' : 'none';
      if (!v) this.setPrompt(null);
    },
    /**
     * short: a few words shown on screen; long: optional full sentence for the PDA log.
     * tone: 'normal' | 'low' | 'critical' (colour only shows state)
     */
    notify(short, { long = null, seconds = 3, tone = 'normal' } = {}) {
      setCaption(short, seconds, tone);
      log.unshift({ time: clock(), text: long ?? short });
      if (log.length > 14) log.length = 14;
    },
    fadeTo(on, seconds) {
      fade.style.transitionDuration = `${seconds}s`;
      fade.style.pointerEvents = on ? 'auto' : 'none';
      void fade.offsetWidth;
      fade.classList.toggle('is-on', on);
      return wait(seconds * 1000);
    },
    showFadeCard(html) {
      card.innerHTML = html;
      card.classList.toggle('is-visible', Boolean(html));
    },
  };
}

function el(tag, cls) {
  const e = document.createElement(tag);
  e.className = cls;
  return e;
}

export function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
