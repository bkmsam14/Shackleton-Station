# Changelog — Shackleton Station

## 0.3.0 — Electrolysis mini-game (Molecule Zapper)

### Gameplay
- **The Electrolysis unit works.** Press E in the habitat work bay to open the first instance, an
  arcade mini-game. Zap water molecules: each H₂O splits into an H₂ (to the − tube) and an O atom;
  two O atoms team up as O₂ (to the + tube), so the hydrogen tube fills twice as fast.
- **Choose a batch first** (Small / Medium / Big = 0.5 / 1.0 / 1.5 kg O₂), with costs shown up
  front. Batches that won't fit in the oxygen supply, or that the water tank or battery can't pay
  for, are greyed out with the reason.
- **Real costs:** water from the unit's own tank (10 kg to start; nothing refills it yet) at
  1.125 kg per kg O₂, and base power at the physics minimum of 4.96 kWh per kg O₂ (NIST). Missed
  zaps lose a little power as heat (capped at 25% of the batch). The base clock moves on by the
  real ISS production time (5.4 kg O₂/day), so a Big batch costs about 6½ in-game hours.
- **Learning beats:** a "Meet H₂O" intro on the first visit, a mid-round "Why?" bubble, and a
  rotating quiz question (2:1 ratio, Sabatier, why not salt water, Moon ice) with its source.
- **Stars and mastery:** 1 star for finishing, +1 for accurate zapping, +1 for the quiz. Best stars
  give bronze / silver / gold, saved in localStorage and shown on the station prompt.
- Click/tap or Space to zap; Esc leaves (nothing is made or paid). Simple WebAudio sound effects.

### Code
- `systems/electrolysis.js` and `systems/mastery.js` (pure logic, unit-tested).
- `instances/InstanceManager.js`: reusable overlay manager (pauses the world, frees the mouse,
  re-locks it on return), ready for the greenhouse and solar instances.
- `main.js`: new `instance` mode; `advanceGameHours()` shared by electrolysis and gentle failure.

### Science
- New sourced facts in `docs/SCIENCE.md`, the PDA Databank and `public/data/facts.json`: water
  stoichiometry, the NIST energy minimum, ISS OGA rates, Sabatier (URL added), salt → chlorine, and
  Moon ice (URL added).

## 0.2.1 — Homier habitat, polished objects

### Habitat
- **Bigger module:** 20 m long and about 6 m wide inside (was 12 m × 3.7 m), on short legs, with
  an airlock, stairs and handrails on the work-bay end.
- **Three areas, split by an open bulkhead:**
  - **Sleeping nook:** bunk with blanket, pillow and curtain, bookshelf, reading lamp,
    framed Earth photo, wardrobe, nightstand, round rug.
  - **Lounge + galley:** sofa with cushions, a big *Earth-view camera screen* (a screen,
    not a window), coffee table, rug, kitchen counter with herbs, kettle and mugs, food
    store, round dining table with stools, pendant lamps, a potted plant.
  - **Work bay (the "habitat stuff"):** life-support rack, control console with screens and
    a chair, electrolysis unit with water and oxygen tanks, lockers, crates, exposed pipes
    and a cable tray, airlock hatch.
- **Warm, homey lighting** in the living areas (lowered ceiling with light coves, warm
  lights, soft painted walls); cool, bright light in the work bay.

### Objects
- **Smooth shading everywhere** (rocks stay angular), higher-detail curves, bevelled edges.
- **New rounded hatch doors** (frame, door leaf, porthole, handwheel) on the habitat and
  the greenhouse.
- **Cleaner signs:** rounded panels and better text.
- **Plants:** lettuce rosettes made of real leaves instead of faceted blobs. Racks have
  slim posts, rounded trays and LED bars.
- **Smoother ground:** the regolith normal map gives the detail. Rounder lamp posts and a
  smoother solar array.

### Performance
- Building **interiors are only drawn when you are inside them**, and exteriors only when
  outside (the modules have no windows).
- Indoor lights switch off when you leave a module, so they no longer glow through walls
  onto the ground.
- Outside view went from about 130 to 79 draw calls and from 430k to 262k triangles.
  The habitat interior is 46 calls and 28k triangles.

### Docs
- CLAUDE.md: the art style is now "clean, smooth-shaded" instead of low-poly.

## 0.2.0 — Visual polish pass
AgX tone mapping, environment maps, N8AO + bloom (High), CC0 textures, detail geometry,
Moon lighting with a helmet lamp, and the minimal HUD with PDA (see git history).

## 0.1.0 — Demo 0
Habitat, airlock, surface, solar array, greenhouse, three gauges, gentle failure.
