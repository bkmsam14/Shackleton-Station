# Changelog — Shackleton Station

## 0.5.0 — Solar storms, storm shelter and water walls (real DONKI + RadLab data)

### Gameplay
- **Pick a Sun on the start screen:** *Calm · Dec 2019*, *Stormy · May 2024* (replays of real
  NASA data) or *Live · this week* (DONKI fetched now; falls back to the Stormy replay if offline).
- **Particle storms (QTE):** when a real flare is replayed, Volt warns you, a chip counts down
  ("Particles in 48 s → storm shelter"), an arrow points to the shelter and a purple **dose ring**
  (4th gauge, shown only around storms) appears. Storms keep the real spacing between events.
- **Storm shelter** in the habitat sleeping nook. Being inside protects you; the more water in its
  walls, the more it protects. If a storm's dose reaches the limit, Volt helps you into the
  shelter to rest (gentle failure; no free supplies; the dose stays on your record).
- **Water walls panel:** pump water between the Electrolysis tank and the shelter walls (costs a
  little power). The real trade-off: water in the walls blocks radiation but can't make oxygen.
  The three wall tanks show their water level.
- **"What just happened?" card** after each storm: the real flare (class, date, sunspot region),
  the real time until particles arrived, and how much NASA's LRO (CRaTER) measured at the Moon,
  with sources and an honest "Replay of real data / Live" tag.
- PDA: radiation section (storm status, mission total, wall water, data label). New Volt lines,
  tips and facts. Gentle "dee-doo" storm alarm.

### Real data
- `scripts/fetch-space-weather.mjs` archives DONKI flare alerts (`notifications?type=FLR` — the
  plain FLR endpoint 404s on api.nasa.gov) and SEP events, plus RadLab CRaTER daily dose rates.
- Stormy Sun = 4 storms after X2.2, X3.9, X5.8 and M6.6 flares (9–13 May 2024); each storm's
  strength comes from the real CRaTER ratio (×2, ×44, ×205, ×69 the quiet level).

### Code
- `systems/spaceWeather.js` (DONKI → storms, pure), `systems/radiation.js` (storm phases, dose,
  water walls, pure), `data/spaceWeather.js` (archive / live loader), `instances/waterWalls`,
  `instances/stormReport`. 14 new tests (68 total).
- Volt's speech synthesis now runs in a **Web Worker**, so the game no longer freezes for a
  moment each time he speaks (most noticeable on slow laptops).

## 0.4.0 — Volt, the helper robot

### Gameplay
- **Volt follows you around the base.** The same robot as in the mini-game, now in 3D as a small
  wheeled rover. Real science: the Moon has almost no air, so fans can't fly outside; Volt rolls
  on wheels everywhere, like real Moon rovers. Volt rides through the airlock with you, rolls into
  view when he talks, and waits when you look at him.
- **First-day tour (learn by doing, 7 steps):** walk → meet the three gauge rings → open the PDA
  → make oxygen at Electrolysis → go out through the airlock → visit the solar array → visit the
  greenhouse. A cyan arrow and ring mark the next spot. Skip or replay it from the pause menu.
- **Tips and lessons:** Volt warns when oxygen, food, power or the water tank get low (and says
  how to fix it), reacts to the Sun going behind the ridge, says something new on the first visit
  to a place, and shares a sourced science fact about every 3 minutes. He stays quiet in menus,
  the PDA and mini-games, and never chatters (cooldown).
- **Talk to Volt:** look at him and press E for the most useful tip right now.
- **Volt speaks out loud with a cute, friendly robot voice** — warm and childlike with a touch of
  femininity, the same in every browser, offline. Words come from the eSpeak speech engine (meSpeak, melodic "female 3" voice,
  gently lifted to a warm, childlike ~240 Hz — cute and never scary); a soft Web Audio chain adds
  a slow chorus shimmer, a faint robot tint, warmth, rounded highs and a quiet "bip-bip" before each line. The engine (~600 KB gzipped) is
  loaded in the background after the game starts; if it fails, Volt falls back to the browser
  voice. Talking mouth on the 3D face. Symbols are read as words ("2×" → "2 times", "H₂O" → "H 2 O"). He stops talking when
  you pause, open the PDA or go through a door; the bubble stays up until he finishes. Volt in the
  Molecule Zapper speaks too (intro, question, hint, answer, result). Pause menu: "Volt's voice:
  On / Off" (saved).
- **Pause menu:** "Volt talks: Chatty / Helpful / Quiet" (saved) and "Replay / Skip Volt's tour".
- Oxygen now starts at 60% (game balance) so the tour can make oxygen on day one.

### Code
- `systems/assistant.js` (Volt's brain: tour state machine, priority queue, cooldown, chattiness;
  pure logic, 15 tests), `data/voltLines.js` (every line; ≤ 14 words; facts point at sourced
  Databank entries), `world/volt.js` (model, following, tour marker), `ui/voltBubble.js`
  (in-world speech bubble that docks at the screen edge when Volt is out of view).
- Event captions now come from Volt, with the old caption as a fallback in Quiet mode.
- Volt costs about 6 draw calls.

### Science
- New sourced Databank entries: gravity is the same inside the base, Astrobee robots fly on fans
  inside the ISS and rovers use wheels on the airless Moon, Moon ice, why the sky is black, why
  grow lights are pink.

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
  rotating kid-level quiz question that can be answered from what the player just saw (how many
  H in H₂O, what splits water, which tube filled faster, which gas you breathe, where a Moon base
  finds water). Short picture answers in random order; a wrong answer gets Volt's hint and a
  second try (the bonus star is for a right first try). Harder facts (Sabatier, salt → chlorine)
  live in the PDA Databank.
- **Look:** "toy lab console" UI with custom sticker icons and Volt, a helper robot who speaks
  the lesson lines.
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
