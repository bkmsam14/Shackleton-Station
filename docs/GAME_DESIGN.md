# GAME_DESIGN.md — Shackleton Station

> This file was created during Demo 0 from the team's brief. CLAUDE.md wins over anything here.
> If the team has a fuller design doc, merge it in and keep the "Look and feel" section.

## Pitch

You are one astronaut at a small base near Shackleton Crater at the Moon's south pole.
Keep yourself and the base alive. Every refill costs something else.

## Demo 0 scope

See CLAUDE.md "Current target: Demo 0". Habitat → airlock → surface → solar array →
greenhouse. Three gauges: Oxygen + Food (astronaut, bottom-left), Base Power (separate
panel, top-right). Gentle failure (wake up in the habitat).

## Core loop (Demo 0)

1. Gauges drain at different rates (real relative rates from NASA BVAD, see SCIENCE.md).
2. Oxygen drains ~2.3× faster outside in the suit, and refills inside pressurized modules —
   but refilling draws extra **base power** (no free refills).
3. Power charges from the sun-tracking solar array while the Sun is up and not hidden by
   the ridge; the base load always drains it. The greenhouse LEDs are part of that load.
4. Food drains slowly all the time. (Eating comes later with the greenhouse lesson.)
5. At 0 Oxygen or 0 Food: fade out, wake up in the habitat with gauges partly restored,
   lose some time. Kind message, no death screen.

## Look and feel

- **Style:** clean low-poly, flat-shaded primitives, consistent bevel-free shapes.
  White/off-white modules with orange accent bands; grey regolith; black sky.
- **Fonts:** **Fredoka** (headings, gauge labels, HUD numbers) and **Nunito** (body text,
  prompts, toasts). Self-hosted via `@fontsource`.
- **Accent colours:**
  - Cyan `#38D9F5` — Oxygen, interaction prompts
  - Orange `#FF9F43` — Food, NASA-suit accent, warnings
  - Green `#4BE38A` — Power charging, "good" states
  - Warning red-pink `#FF6B81` — low gauges (< 25 %), always paired with an icon + text, not
    colour alone
- **Panels:** dark translucent navy `rgba(10, 16, 32, 0.82)` with a 2px light border, so
  white text stays ≥ 4.5:1 contrast on both the bright regolith and the black sky.
- **Text sizes:** body ≥ 16px, HUD labels ≥ 18px, buttons ≥ 44px tall.
- **Greenhouse light:** pink-purple (red + blue LEDs).

## Hooks for later

- Electrolysis unit (habitat) → "Coming soon: Electrolysis lesson"
- Grow racks (greenhouse) → "Coming soon: Greenhouse lesson"
- Instances, QTE events, water gauge (`ENABLE_WATER_GAUGE=false`), missions, upgrades,
  touch controls — not in Demo 0.
