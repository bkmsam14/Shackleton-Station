# CLAUDE.md — Shackleton Station

Read this file fully at the start of every session. Then read `docs/GAME_DESIGN.md` and `docs/SCIENCE.md` before writing gameplay or educational content.

## What we are building

**Shackleton Station** (working title) is a browser-based 3D survival sandbox for kids aged 7–12, built for the **NASA Space Apps Challenge 2026**. You play one astronaut at a small base near Shackleton Crater, at the Moon's south pole. The game has two parts:

1. **The sandbox (3D, Three.js).** Walk around in first person. Survival gauges drain at different rates, so the player must keep deciding what to fix first.
2. **Instances (2D HTML/CSS overlays).** To refill a gauge, you go to a station (for example, the electrolysis unit for oxygen) and enter an instance: a short, Duolingo-style interactive lesson that teaches the real science while you refill.

**Environmental risks** are quick-time events (QTEs) that interrupt the player's plans, such as a real solar flare from NASA DONKI data or a micrometeorite leak.

The challenge brief: kids must experience real engineering trade-offs (life support, radiation shielding, power, food production, communication delay). **No choice is free.** The game must use real NASA data and credit it inside the game. It must run in a browser with no download and no account.

## Non-negotiable rules

1. **Science is never changed or dumbed down.** We simplify by *leaving details out*, never by saying something false. Follow `docs/SCIENCE.md`. If you are not sure a fact is true, do not ship it: add it to the "Needs verification" list in `docs/SCIENCE.md` and use a clearly marked placeholder.
2. **Never invent numbers.** All gameplay rates live in `src/config/gameplay.js`. Numbers based on real data carry a comment with their source. Game-balance numbers are marked `// GAME BALANCE (not real data)`.
3. **Time may be sped up; cause and effect may not change.** Whenever we speed something up, the game shows the real value ("In real life a potato takes about 3 months").
4. **Every refill costs something else.** Making oxygen costs water and power. Running grow lights costs power. Don't add a "free" option.
5. **Use real terms, then explain them.** Electrolysis, regolith, solar particle event: each gets a one-line kid-friendly explanation, never a made-up replacement word.
6. **Label data honestly.** Archived data is labeled "Replay of real data from <date>". Only data fetched now is labeled "Live". Credit sources on screen.
7. **Failure is gentle.** When a gauge reaches 0, the astronaut is brought back to the habitat and loses time or supplies. There is no death screen.
8. **Kids first.** Big text (body at least 16px, HUD labels at least 18px), touch targets at least 44px, text contrast at least 4.5:1, plain language, and no more than 4 gauges on screen. The main HUD is minimal (rings + numbers, no boxes or sentences; team decision in the polish pass); explanations live in the PDA (Tab).

## How Claude works on this project (team decision, Nov 2026)

**Two roles on every feature.** Whenever you build something with the team, work as both:

1. **Astrophysicist:** make sure the physics, astronomy and space science are right: gravity,
   light and shadows, the sky and orbits, radiation, life-support numbers, units, and cause and
   effect. Use real sources (NASA, peer-reviewed data). Say when something is a simplification.
   Anything wrong or uncertain goes on the "Needs verification" list in `docs/SCIENCE.md`
   instead of into the game.
2. **Teacher for ages 7–12:** make each key concept easy to understand.
   - One idea at a time; learn by doing.
   - Plain words; a real term followed by a one-line explanation.
   - Concrete comparisons, and a quick check that the child understood.
   - A "go deeper" layer for older kids.
   - Never make the science false to make it simpler.

Every plan and review includes a short **physics check** and a short **teaching check** for each
feature. Point out where a design would teach something wrong or confusing, and suggest how a
teacher would structure it.

**Same skills for all game development.** Load the matching skill from `.claude/skills/` before
writing code in its area, and tell the team which one you loaded:

| Skill | Area |
|---|---|
| threejs-fundamentals | scene, renderer, game loop |
| threejs-lighting | lights, shadows |
| threejs-geometry | meshes, instancing, merging |
| threejs-materials | materials, PBR |
| threejs-interaction | controls, picking |
| threejs-postprocessing | AO, bloom, tone mapping |
| threejs-textures | textures |
| threejs-performance | draw calls, frame time |

## Tech stack

- **Vite** + **Three.js** (ES modules, plain JavaScript, no TypeScript unless the team decides otherwise)
- `three/examples/jsm` addons: `PointerLockControls`, `GLTFLoader`, `RoomEnvironment` (PMREM)
- Post-processing (team decision): pmndrs `postprocessing` + `n8ao` — N8AO ambient occlusion (indoors only) + soft bloom + **ACES Filmic** tone mapping (graphics overhaul; replaced AgX) + slight saturation + subtle vignette + FXAA, **High quality only**; AO switches itself off if frames get slow. Low quality renders directly (still ACES). Outdoors the camera exposure is 1.8 so kids can see; the sky stays black.
- Textures: CC0 sets in `public/textures/` (see `public/CREDITS.md`) plus **procedural PBR textures** made at start-up (`world/proceduralTextures.js`, no download).
- Volt's voice: `mespeak` (eSpeak, GPL-3.0) in a Web Worker (`ui/voltVoice.worker.js`); `vite.config.js` reads its ESpeak.js as Latin-1. Falls back to the browser voice.
- HTML/CSS for the HUD and all instances. Keep game logic out of the DOM code.
- Physics: none at first. Use a simple ground-height sample plus capsule collision. Add `@dimforge/rapier3d-compat` only if it is really needed.
- Save data: `localStorage`, wrapped in try/catch (it can be unavailable)
- Deploy: GitHub Pages (`vite build`, `base` set for the repo name)
- **Never commit API keys.** Use `import.meta.env.VITE_NASA_API_KEY`, with a fallback to `DEMO_KEY`, and `.env` in `.gitignore`.

## Folder structure

```
src/
  main.js              # boot, game loop, modes (start/playing/paused/busy/pda/instance)
  config/
    gameplay.js        # ALL rates, timings, costs (with source comments)
  world/               # LOLA terrain, sky + real stars, lighting, habitat, greenhouse,
                       # airlock room, solar array, ice site + oven, telescope, Volt, guide trail
  player/              # first-person controls, collision, input, interaction
  systems/             # PURE logic (no Three.js), all unit-tested:
    gauges.js            gauge drain/refill, power flow (addOxygen / addFood)
    daycycle.js          game + live clocks, Sun position, real-horizon visibility
    electrolysis.js      batch costs (water, power, time)   mastery.js  bronze/silver/gold
    radiation.js         storm phases, dose, water walls    spaceWeather.js  DONKI → storms
    iceMining.js         LCROSS ice share, bag, dig spots   airlock.js  cycle steps
    assistant.js         Volt's brain (tour, tips, cooldown) navigation.js  A* walk grids
    ephemeris.js / skyMath.js   live sky (IAU, USNO), star placement
    micrometeoroids.js   hits on the array OR habitat, air-leak choked flow
    balanceSim.js        bots that play the real rules (npm run balance)
    save.js, speechText.js, tutorials.js
  instances/           # 2D lessons/mini-games (InstanceManager pauses the world)
    lessonKit.js         shared repair-lesson frame (card, tips, learn, quiz)
    electrolysis/  solar/  leak/  iceDrill/  iceOven/  waterWalls/  telescope/
    stormReport/  trainingReport/
  farming/             # grow pots (potato, lettuce, radish), inventory, eating
  supply/              # supply terminal, light-delay orders, cargo pad, solar damage
  leak/                # hit scheduler + habitat air leak (beacon, rack panel, Leak Fix)
  training/            # Training Day (Day 1 guided by Volt)
  data/                # databank, Volt lines, Training Day script, stars, constellations,
                       # LOLA terrain, space-weather loader
  ui/                  # HUD, PDA, menus, Volt bubble + voice, visor, sounds, tutorials
public/
  data/
    facts.json                 # every in-game fact + source URL
    space-weather-2024-05.json # archived real DONKI + RadLab data (Stormy Sun)
    stars-bsc.json             # Yale Bright Star Catalog (NASA HEASARC)
    # space-weather-2019-12.json (Calm Sun) is MISSING — see "Known issues"
  textures/  CREDITS.md
scripts/               # fetch-lola, fetch-space-weather, fetch-stars, balance-sim
tests/                 # node --test (185 tests)
docs/
  GAME_DESIGN.md  SCIENCE.md  PERFORMANCE.md  screenshots/
```

Keep the systems (`systems/`) as pure logic with no Three.js imports, so they can be tested and tuned on their own.

## How to work in this repo

- One feature per session. Make a small commit after each working step, with a clear message.
- After every change: `npm run dev` must start with no console errors. Check the browser console.
- Performance budget: 60 fps on a mid-range laptop. One shadow-casting directional light, light models (merge static meshes per material, instance repeats), textures 1024px at most, total download around 30 MB at most. Add a Low/High quality toggle.
- Placeholder art is fine: simple shapes in one **clean, smooth-shaded style** (v0.2.1 team decision: rounded/bevelled edges, smooth shading, no faceted low-poly look; rocks may stay angular). A teammate will swap in real models (glTF) later. Keep model loading behind one function so swapping is easy.
- When you add an in-game fact, add it to `public/data/facts.json` with a `source` URL at the same time.
- If something in the design conflicts with these rules, the rules win. Mention the conflict to the user.

## Current state (v0.11.0 + unreleased changes on main)

Demo 0 is long done; see `CHANGELOG.md` for every version. What the game has now:

- **World:** real Shackleton-rim terrain (NASA LOLA), real stars, an optional Live sky, a habitat
  (sleeping nook, lounge + galley, work bay, storm shelter), a greenhouse with grow pots, a
  vertical solar array, a cold-trap crater for ice, a telescope, a cargo pad, and a first-person
  airlock cycle with a helmet visor outside.
- **Gauges (rules that still hold):**
  - **Oxygen:** one shared supply for habitat + greenhouse + suit. It drains faster outside
    (BVAD spacewalk rate) and is refilled **only** by Electrolysis, which costs water and power.
    Each airlock cycle loses 0.03 kg.
  - **Food:** drains faster outside (BVAD) and is refilled by eating farm crops (F).
  - **Base power:** shown separately, top-centre. It's large inside modules and smaller outside.
    A blackout stops the machines.
  - **Colours:** oxygen blue, food green; amber = low, red = critical.
  - **Dose ring:** a 4th ring, shown only around particle storms.
  - **Water:** the Electrolysis water tank is shown in the PDA, but there is no water gauge
    (`ENABLE_WATER_GAUGE` = false).
- **Lessons / mini-games:**
  - Electrolysis (3 games, picked at random)
  - Solar Fix (3 games: Cell Swap, Hot Spot Hunt, Wire Fix) after an array hit
  - Leak Fix (3 games: Leak Hunt, Hatch Hunt, Patch It) after a habitat hit
  - Ice Drill + Ice Oven
  - Water Walls (shielding)
  - Telescope Star Hunt
  - Storm report and Training Day report cards
- **Events:** particle storms from real DONKI + RadLab data (Calm / Stormy replays or Live) and
  random micrometeoroid hits on the solar array (power drop) OR the habitat (air leak: oxygen
  drains ≈ 2.2× faster), never both at once.
- **Volt:** a helper robot with a voice. He runs a 19-step Training Day on Day 1 (base clock 20×
  slower), with a ground trail and machine markers.
- **Supply:** orders with the real light delay (1.28 s), a 60 kg lander limit, and crates that
  land on the pad.
- **Balance:** `npm run balance` (bot playthroughs); targets are locked in `tests/balance.test.js`.

### Not built yet (from `docs/GAME_DESIGN.md`)
- **Moonquake**, **lander dust** on the
  panels, and the dark-period "choose machines to turn off" event (only the grow-lights switch
  exists).
- **Comms dish** instance. **Scheduled supply landers** every few days with food (today you
  order kits, water, seeds and battery packs at the terminal; there is no food item, so food
  comes only from the farm).
- **Missions:** Mission Control tasks, science points, upgrades, the crew-swap goal and an end
  screen with stars.
- **Water gauge**, greenhouse LED light-level choice, BPS data hub facts, touch controls,
  glTF models.

### Known issues
- **Calm Sun data is missing:** `public/data/space-weather-2019-12.json` was never committed.
  Picking "Calm · Dec 2019" logs a warning and silently plays the Stormy May 2024 replay. Run
  `scripts/fetch-space-weather.mjs` (with a NASA API key) and commit the file.
- `package.json` still says 0.11.0, although more features were merged after it (see
  "Unreleased" in `CHANGELOG.md`).
- `docs/PERFORMANCE.md` numbers predate the 0.3–0.11 features.

## Required NASA sources (the user says these MUST be used)

All four are required by the team; three are in use (see Status below):

| Source | What it is | Use it for |
|---|---|---|
| https://ntrs.nasa.gov/citations/20210024855 | NASA **Life Support Baseline Values and Assumptions Document (BVAD)**, NASA Technical Publication, Feb 2022 (Ewert, Chen, Powell) | Per-crewmember oxygen, water and food values, so the gauges drain at realistic *relative* speeds (scaled to game time). Read the PDF and copy the values with page numbers into `docs/SCIENCE.md` before using them. |
| https://science.nasa.gov/biological-physical/data/ | NASA Biological & Physical Sciences data hub: OSDR (biology), PSI (physical sciences), NASA Task Book, Space Life Sciences Library | Plant growth / greenhouse and astronaut health facts for the mini-games |
| https://visualization.osdr.nasa.gov/radlab/gui/overview/ | RadLab: radiation telemetry from several space agencies (ISS/LEO and beyond-LEO instruments), with a Data API and CSV/TSV/JSON export | Radiation dose facts and the flare/shelter event. ISS values are low Earth orbit, **not** Moon values: label them that way. |
| https://ccmc.gsfc.nasa.gov/donki/ | DONKI space weather database (flares, CMEs, SEPs), with web search and an API (also through https://api.nasa.gov/) | Real solar flare events for the radiation QTE. DONKI calls its real-time data "science and prototyping quality", so say "based on" in the game. |

**Status (v0.11.0):**
- **BVAD:** values are in `docs/SCIENCE.md` and `src/config/gameplay.js` (oxygen, food, water, spacewalk rates).
- **DONKI** (flare alerts + SEP events) and **RadLab** (CRaTER on LRO, ISS Timepix): drive the particle storms. `scripts/fetch-space-weather.mjs` writes the archives to `public/data/space-weather-*.json`, and Live mode fetches DONKI at runtime.
- **BPS data hub:** still unused (planned for greenhouse facts).
- **Other NASA data now in the game:** LRO LOLA terrain (`scripts/fetch-lola.mjs`), the Yale Bright Star Catalog via NASA HEASARC (`scripts/fetch-stars.mjs`), IAU / JPL NAIF Moon orientation and USNO Sun formulas for the Live sky, LCROSS (ice share) and LRO Diviner (cold traps).

## Open decisions (ask the user if a task depends on one)

- **3 gauges** (Oxygen, Food, Power) + the dose ring during storms. A Water gauge is still off (`ENABLE_WATER_GAUGE`, default `false`): the water tank lives in the PDA.
- Version numbers: the changelog has features merged after 0.11.0 without a new version; bump `package.json` when the team agrees.
- Controls: keyboard and mouse first; touch controls (on-screen joystick) later.
- One astronaut (decided).
