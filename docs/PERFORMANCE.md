# Performance — Shackleton Station

Budget (CLAUDE.md): 60 fps on a mid-range laptop = **16.7 ms per frame**.

> **Out of date.** These numbers were measured at v0.2.0–0.2.1, before the real LOLA terrain,
> real stars, Volt, farming, supply, airlock room, helmet visor and the graphics overhaul (ACES
> tone mapping, procedural textures, brighter outdoor exposure). Re-measure the same three views
> with the method below (or with `?fps` on a real laptop) before quoting them.
>
> What still holds: Low quality renders without post-processing, and on High the AO pass turns
> itself off if frames average more than ~17.5 ms. Interiors are drawn only when you are inside
> them.

## How these numbers were measured

- Machine: **Intel UHD Graphics (integrated, ANGLE / Direct3D 11)**, Chrome-based browser.
- Viewport **1280 × 720**, pixel ratio 1.
- The dev build's `__dev` helpers render a fixed view repeatedly and force the GPU to
  finish (1-pixel `readPixels` per measurement), then report **ms per frame**. This works
  even when the browser tab is hidden, but the forced sync adds a little overhead, so
  real frame times are slightly better than shown.
- Same three views each time: habitat (looking down the module), outside (towards the
  greenhouse and solar array), greenhouse (down the aisle).

**Measure on your own laptop:** open the game with `?fps` at the end of the URL
(e.g. `http://localhost:5173/?fps`). A small box shows fps, ms per frame and draw calls.

## Results

| View | Before polish (Demo 0) | After polish — High | After polish — Low |
|---|---|---|---|
| Outside | 4.0 ms\* | 10.3 ms (~97 fps) | 6.9 ms |
| Habitat | 0.9 ms\* | 18.3 ms (~55 fps) | 5.6 ms |
| Greenhouse | 0.8 ms\* | 19.8 ms (~50 fps) | 8.7 ms |

\* The "before" numbers used `gl.finish()` for the sync, which ANGLE does not fully honour,
so they under-report. Re-measured the same way as the "after" columns, the Demo 0 build
with post-processing off was **6.2 / 5.0 / 7.3 ms** (outside / habitat / greenhouse).

## What costs what (High, measured)

| Effect | Cost on Intel UHD @720p |
|---|---|
| N8AO ambient occlusion (half-res) | ~7.7 ms → **indoors only** |
| SMAA | ~3.4 ms → replaced by **FXAA** |
| Bloom + AgX tone mapping | ~1.8 ms |

## Safety valves

- **Adaptive AO:** on High, if frames average more than ~17.5 ms for a few seconds, AO
  switches itself off (bloom stays). On a GPU like the test machine this brings indoor
  frames to ~10 ms; faster GPUs keep the full look.
- **Low quality** (start/pause menu): no post-processing, 1024 shadow map, pixel ratio 1,
  fewer stars — 5.6–8.7 ms on the test machine.
- Indoors the outside world is hidden and the shadow map is not re-rendered.

## Draw calls

About 26 on the outside view, ~20 inside (static building parts are merged per material;
rocks, plants and lamp posts are instanced).
