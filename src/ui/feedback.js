// feedback.js — crosshair, interaction prompt, toasts and the screen fade.
import { UI } from '../config/gameplay.js';

export function createFeedback(root) {
  const crosshair = el('div', 'crosshair');
  const prompt = el('div', 'prompt');
  prompt.setAttribute('role', 'status');
  prompt.innerHTML = '<span class="keycap">E</span><span class="prompt-text"></span>';
  const promptText = prompt.querySelector('.prompt-text');
  const toasts = el('div', 'toast-stack');
  toasts.setAttribute('aria-live', 'polite');
  const fade = el('div', 'fade');
  const card = el('div', 'fade-card');
  fade.appendChild(card);
  root.append(crosshair, prompt, toasts, fade);

  let currentPrompt = null;

  return {
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
    /** kind: 'warn' | 'info' | 'good' */
    toast(html, { kind = 'info', icon = 'ℹ️', seconds = UI.TOAST_SECONDS, key } = {}) {
      if (key) {
        const old = toasts.querySelector(`[data-key="${key}"]`);
        if (old) old.remove();
      }
      const t = el('div', `toast is-${kind}`);
      if (key) t.dataset.key = key;
      t.innerHTML = `<span class="toast-icon" aria-hidden="true">${icon}</span><div>${html}</div>`;
      toasts.appendChild(t);
      while (toasts.children.length > 3) toasts.firstChild.remove();
      setTimeout(() => {
        t.classList.add('is-leaving');
        setTimeout(() => t.remove(), 320);
      }, seconds * 1000);
    },
    /** Fade to black (or back). Resolves when done. */
    fadeTo(on, seconds) {
      fade.style.transitionDuration = `${seconds}s`;
      fade.style.pointerEvents = on ? 'auto' : 'none';
      // force style flush so the transition runs
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
