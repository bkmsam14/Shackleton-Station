// input.js — keyboard state. Movement keys are held; action keys are edge-triggered.

const MOVE = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'run',
  ShiftRight: 'run',
  Space: 'jump',
};

export function createInput() {
  const held = { forward: false, back: false, left: false, right: false, run: false, jump: false };
  let interactPressed = false;
  let tabPressed = false;
  let nextPressed = false;

  function onDown(e) {
    const k = MOVE[e.code];
    if (k) {
      held[k] = true;
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    }
    if (e.code === 'KeyE' && !e.repeat) interactPressed = true;
    if ((e.code === 'Enter' || e.code === 'NumpadEnter') && !e.repeat) nextPressed = true;
    if (e.code === 'Tab') {
      e.preventDefault(); // keep focus in the game
      if (!e.repeat) tabPressed = true;
    }
  }
  function onUp(e) {
    const k = MOVE[e.code];
    if (k) held[k] = false;
  }
  function clear() {
    for (const k of Object.keys(held)) held[k] = false;
    interactPressed = false;
    tabPressed = false;
    nextPressed = false;
  }
  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  window.addEventListener('blur', clear);

  return {
    held,
    /** true once per E press */
    consumeInteract() {
      const v = interactPressed;
      interactPressed = false;
      return v;
    },
    /** true once per Enter press (Training Day: next step) */
    consumeNext() {
      const v = nextPressed;
      nextPressed = false;
      return v;
    },
    /** true once per Tab press */
    consumeTab() {
      const v = tabPressed;
      tabPressed = false;
      return v;
    },
    clear,
  };
}
