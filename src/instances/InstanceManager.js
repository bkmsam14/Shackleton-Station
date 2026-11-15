// InstanceManager.js — opens and closes instance overlays (the 2D mini-games).
// While an instance is open the 3D world and the gauges are paused (main.js sets
// mode = 'instance'), the mouse is released so the kid can click, and keys go to the
// instance. Each instance is a factory: create({ root, ctx, done }) → { destroy(), onKey(e) }.
//   done(result) closes the overlay and hands the result back to main.js.

export function createInstanceManager(uiRoot, hooks) {
  const host = document.createElement('div');
  host.className = 'instance-host';
  host.hidden = true;
  // Stop clicks reaching document.body, where the drag-to-look fallback listens.
  host.addEventListener('pointerdown', (e) => e.stopPropagation());
  uiRoot.appendChild(host);

  let current = null; // { id, api }

  function onKeyDown(e) {
    if (!current) return;
    if (e.code === 'Tab') return; // Tab stays blocked by input.js (no PDA inside instances)
    current.api.onKey?.(e);
  }
  window.addEventListener('keydown', onKeyDown);

  function close(result) {
    if (!current) return;
    const { id, api } = current;
    current = null;
    try {
      api.destroy?.();
    } catch (err) {
      console.error(`[instance:${id}] destroy failed`, err);
    }
    host.replaceChildren();
    host.hidden = true;
    hooks.onClose(id, result ?? { completed: false });
  }

  function open(id, factory, ctx) {
    if (current) return false;
    host.hidden = false;
    hooks.onOpen(id);
    try {
      const api = factory({ root: host, ctx, done: (result) => close(result) });
      current = { id, api };
    } catch (err) {
      // A broken instance must never trap the player: log it and return to the base.
      console.error(`[instance:${id}] failed to open`, err);
      current = { id, api: {} };
      close({ completed: false, error: true });
      return false;
    }
    return true;
  }

  return {
    open,
    close,
    get isOpen() {
      return current !== null;
    },
    /** the open instance's API (dev tools / tests) */
    get api() {
      return current?.api ?? null;
    },
  };
}
