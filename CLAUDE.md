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

## Tech stack

- **Vite** + **Three.js** (ES modules, plain JavaScript, no TypeScript unless the team decides otherwise)
- `three/examples/jsm` addons: `PointerLockControls`, `GLTFLoader`, `RoomEnvironment` (PMREM)
- Post-processing (team decision, polish pass): pmndrs `postprocessing` + `n8ao` — N8AO ambient occlusion (indoors only) + subtle bloom + AgX tone mapping + FXAA, **High quality only**; AO switches itself off if frames get slow. Low quality renders directly.
- HTML/CSS for the HUD and all instances. Keep game logic out of the DOM code.
- Physics: none at first. Use a simple ground-height sample plus capsule collision. Add `@dimforge/rapier3d-compat` only if it is really needed.
- Save data: `localStorage`, wrapped in try/catch (it can be unavailable)
- Deploy: GitHub Pages (`vite build`, `base` set for the repo name)
- **Never commit API keys.** Use `import.meta.env.VITE_NASA_API_KEY`, with a fallback to `DEMO_KEY`, and `.env` in `.gitignore`.

## Folder structure

```
src/
  main.js              # boot, game loop
  config/
    gameplay.js        # ALL rates, timings, costs (with source comments)
  world/               # terrain, lighting, sky, Earth, sun, buildings
  player/              # first-person controls, suit, interaction raycast
  systems/
    gauges.js          # gauge state + drain/refill (pure logic, unit-testable)
    daycycle.js        # sunlight / dark periods → solar power
    events.js          # QTE scheduler (flare, leak, ...)
    mastery.js         # per-station mastery levels (bronze/silver/gold)
    save.js
  instances/
    InstanceManager.js # opens/closes overlays, pauses world
    electrolysis/      # each instance: index.js + style.css + content.js
    greenhouse/
    solar/
  data/
    donki.js           # fetch live DONKI + load archived JSON fallback
    facts.js           # loads public/data/facts.json
  ui/                  # HUD, prompts, menus, credits screen
public/
  data/
    donki-flr-2024-05.json   # archived real DONKI flares (Stormy Sun)
    donki-flr-2019-12.json   # archived real DONKI flares (Calm Sun)
    facts.json               # every in-game fact + source URL
  models/  audio/  textures/
docs/
  GAME_DESIGN.md  SCIENCE.md
```

Keep the systems (`systems/`) as pure logic with no Three.js imports, so they can be tested and tuned on their own.

## How to work in this repo

- One feature per session. Make a small commit after each working step, with a clear message.
- After every change: `npm run dev` must start with no console errors. Check the browser console.
- Performance budget: 60 fps on a mid-range laptop. One shadow-casting directional light, low-poly models, textures 1024px at most, total download around 30 MB at most. Add a Low/High quality toggle.
- Placeholder art is fine: simple boxes, cylinders and domes in a consistent low-poly style. A teammate will swap in real models (glTF) later. Keep model loading behind one function so swapping is easy.
- When you add an in-game fact, add it to `public/data/facts.json` with a `source` URL at the same time.
- If something in the design conflicts with these rules, the rules win. Mention the conflict to the user.

## Current target: Demo 0 (build this first, nothing more)

The user wants to see this before anything else gets built:

1. **Spawn inside the habitat**, in first person, as the astronaut.
2. **Exit the habitat** through an airlock/door onto the lunar south-pole surface (low Sun, long hard shadows, black sky, stars, Earth near the horizon).
3. **See the solar panel array** outside: a tall vertical array that slowly turns to follow the Sun.
4. **Walk to the greenhouse and enter it**: an interior with grow racks under pink-purple (red and blue) LED light.
5. **Three gauges:**
   - **Oxygen** (shown in the astronaut panel): **one shared oxygen supply for the habitat, greenhouse and suit together** (team decision, Nov 2026). The suit is assumed to stay topped up from it. It drains slowly while the astronaut is inside and faster outside (BVAD spacewalk rate). **Nothing refills it in Demo 0**: making oxygen comes with the electrolysis mini-game, which will call `addOxygen()` in `systems/gauges.js` and pay its own water + power cost.
   - **Food / hunger** (astronaut): drains slowly all the time.
   - **Power** (the whole base, not the astronaut): shown **separately from the astronaut rings**, top-centre. **Team decision (polish pass):** the full readout (battery + % + charging/draining arrow) appears only inside a pressurized module; outside only a tiny battery icon shows. Details are in the PDA (Tab). It drains with base load and recharges from the solar array while it's in sunlight.
6. Interaction prompt ("Press E to open door") and smooth inside/outside transitions.
7. Gentle failure: if Oxygen or Food reaches 0, fade out and wake up in the habitat (no death screen).

**Not in Demo 0:** instances/mini-games, risk events (QTEs), water gauge, missions, upgrades, real NASA terrain, touch controls. Leave clean hooks for them (for example, interactable stations as objects with an `onInteract` that currently shows a "Coming soon: Electrolysis lesson" toast).

## Required NASA sources (the user says these MUST be used)

Demo 0 only needs the BVAD (for realistic *relative* drain rates). Use the others when building the educational mini-games and events:

| Source | What it is | Use it for |
|---|---|---|
| https://ntrs.nasa.gov/citations/20210024855 | NASA **Life Support Baseline Values and Assumptions Document (BVAD)**, NASA Technical Publication, Feb 2022 (Ewert, Chen, Powell) | Per-crewmember oxygen, water and food values, so the gauges drain at realistic *relative* speeds (scaled to game time). Read the PDF and copy the values with page numbers into `docs/SCIENCE.md` before using them. |
| https://science.nasa.gov/biological-physical/data/ | NASA Biological & Physical Sciences data hub: OSDR (biology), PSI (physical sciences), NASA Task Book, Space Life Sciences Library | Plant growth / greenhouse and astronaut health facts for the mini-games |
| https://visualization.osdr.nasa.gov/radlab/gui/overview/ | RadLab: radiation telemetry from several space agencies (ISS/LEO and beyond-LEO instruments), with a Data API and CSV/TSV/JSON export | Radiation dose facts and the flare/shelter event. ISS values are low Earth orbit, **not** Moon values: label them that way. |
| https://ccmc.gsfc.nasa.gov/donki/ | DONKI space weather database (flares, CMEs, SEPs), with web search and an API (also through https://api.nasa.gov/) | Real solar flare events for the radiation QTE. DONKI calls its real-time data "science and prototyping quality", so say "based on" in the game. |

**Status (Demo 0):** The BVAD values are copied with page numbers into `docs/SCIENCE.md` §1 and used in `src/config/gameplay.js`. The **BPS data hub, RadLab and DONKI are reserved for the upcoming mini-games and events: do not use them in Demo 0.**

## Open decisions (ask the user if a task depends on one)

- Demo 0 uses **3 gauges** (Oxygen, Food, Power). A Water gauge may come later with the electrolysis mini-game (`ENABLE_WATER_GAUGE`, default `false`).
- Controls: keyboard and mouse first; touch controls (on-screen joystick) later.
- One astronaut (decided).
