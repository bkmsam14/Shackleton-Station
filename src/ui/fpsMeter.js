// fpsMeter.js — optional frame-rate overlay. Add ?fps to the URL to show it.
// Shows the average fps and frame time over the last second, plus draw calls.
export function createFpsMeter(renderer) {
  const on = new URLSearchParams(location.search).has('fps');
  if (!on) return { tick() {} };
  const el = document.createElement('div');
  el.style.cssText =
    'position:fixed;right:8px;bottom:8px;z-index:99;padding:6px 10px;border-radius:8px;' +
    'background:rgba(0,0,0,.7);color:#fff;font:600 16px/1.3 ui-monospace,monospace;pointer-events:none';
  document.body.appendChild(el);
  let frames = 0;
  let t0 = performance.now();
  return {
    tick() {
      frames++;
      const now = performance.now();
      if (now - t0 >= 1000) {
        const fps = (frames * 1000) / (now - t0);
        el.textContent = `${fps.toFixed(0)} fps · ${(1000 / fps).toFixed(1)} ms · ${renderer.info.render.calls} calls`;
        window.__lastFps = fps;
        frames = 0;
        t0 = now;
      }
    },
  };
}
