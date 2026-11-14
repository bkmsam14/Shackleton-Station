# Changelog — Shackleton Station

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
