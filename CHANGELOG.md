# Changelog — Shackleton Station

## 0.8.0 — Live sky: the real sky over Shackleton right now

### Gameplay
- Pick **Live** on the start screen: besides live NASA space weather, the **Sun, Earth and stars are
  exactly where they are over the Moon's south pole at this moment**, moving at real speed. The HUD
  clock says "LIVE SKY"; the PDA shows the real date, Sun height, whether Earth is up, and how much
  of Earth is lit; the telescope's Star Hunt uses the live sky too.
- Earth really dips below the horizon for part of each month here (libration) — Volt tells you when.

### Science
- `systems/ephemeris.js`: Moon orientation from the IAU model (NASA JPL NAIF pck00011), Sun (USNO),
  Moon orbit (Astronomical Almanac); checked against NASA JPL Horizons (Sun < 0.05°, Earth < 0.3°).
- One sky matrix (`getSun().skyMatrix`) now places stars, constellation lines and the telescope view
  in both the sped-up game sky and the live sky.

## 0.7.0 — Telescope: the real starry sky + Star Hunt

### Gameplay
- **Real stars everywhere:** the random dots are gone. The sky now shows 1,640 real stars from the
  Yale Bright Star Catalog (via NASA HEASARC), with real brightness and colour, placed for the
  Moon's south pole and slowly turning (once per 27.3-day sidereal month, sped up).
- **Telescope** on a small rise north-east of the habitat (follow the lamps). **Star Hunt**: pick
  a target, pan and zoom the real sky to find it, keep it in the crosshair to lock on, then tap the
  stars in order to draw it. Volt can help (hint arrow, "Help me, Volt!"). Stars + mastery.
- **6 targets:** Southern Cross, Alpha & Beta Centauri, Orion, Canis Major (Sirius), Carina
  (Canopus) and the Large Magellanic Cloud — each with a card of real facts and sources.
- **Sun shutter:** pointing near the Sun closes the shutter — "Never look at the Sun through a
  telescope!"
- **Star Album** in the PDA; found constellations show faint lines + names in the sky outside when
  you look at them (toggle: pause menu → Star names in the sky).

### Science fix
- The Sun went round the sky the wrong way for the lunar south pole. It now turns counter-clockwise
  seen from above (the Moon spins the same way as Earth). The first dark period comes a little
  later in a session than before.

### Code
- `scripts/fetch-stars.mjs`, `public/data/stars-bsc.json`, `systems/skyMath.js` (+ tests),
  `data/stars.js`, `data/constellations.js` (+ tests), `world/telescope.js`,
  `instances/telescope/`; `world/sky.js` draws the real stars; `getSun()` returns `skyTurnDeg`.

## 0.6.0 — Ice mining: make water from Moon ice

### Gameplay
- **Cold-trap crater** past the solar array (follow the lamps): a crater floor that never sees the
  Sun. Your helmet lamp switches on down there, frost glitters, and three glowing dig spots wait.
  Being in the cold trap costs base power (suit heaters + lamp).
- **Ice Drill** (arcade mini-game): steer the drill through Moon soil, grab blue icy soil, dodge
  rocks. **Ice streaks** (grab several in a row) with rising crunch sounds, rare **MEGA ICE**
  lumps, a **scanner pulse** (S) that shows hidden ice for a few seconds, a depth bar, best-streak
  record, one easy quiz, stars and bronze/silver/gold mastery. A dug spot rests for a game day.
- **Carry the bag home:** a chip shows how much icy soil you carry and an arrow points to the oven.
  If you faint on the way (gentle failure), half the soil spills.
- **Ice Oven** in the work bay next to Electrolysis: heats the soil (base power), the ice turns to
  vapour and a cold plate catches it as water, which trickles into the Electrolysis tank while you
  play. The panel compares water from Earth (supply terminal) with water from Moon ice (ISRU).

### Real science
- Water = **5.6 %** of the soil's mass (NASA LCROSS, Cabeus crater, 2009). 60 kg of soil → 3.4 kg
  of water. Cold traps colder than −230 °C (LRO Diviner). Bag weight in Moon gravity.
- New Databank entries (cold traps, how much water in icy soil, finding ice by hydrogen, ISRU),
  Volt lines and facts.json entries, all with sources.

### Code
- `systems/iceMining.js` (pure rules + tests), `world/iceSite.js`, `world/iceOven.js`,
  `instances/iceDrill/`, `instances/iceOven/`; `computePowerFlow` takes `extraLoadKw`.

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
- **The Water Walls panel teaches:** a live *particle test* (particles stopped by the wall or
  getting through, using the game's real shielding numbers), a *Where are you safest?* chart
  (particles out of every 100 for each place), sourced *Did you know?* cards (why water, why not
  metal, NASA's Water Walls concept, use the mass you have) and an easy quick-check question.
- **Storm snow and dosimeter ticks:** camera "snow" on screen and a ticking dosimeter, both
  following the dose rate, so the shelter's protection can be seen and heard.
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
