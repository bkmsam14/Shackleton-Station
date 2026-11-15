# Shackleton Station

A browser-based 3D survival sandbox for kids (7–12) at the Moon's south pole, built for the
NASA Space Apps Challenge 2026. No download, no account. Version **0.11.0** (plus newer changes
on `main`, see `CHANGELOG.md`).

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # pure-logic unit tests (185)
npm run balance  # bots play a lunar day on the real rules (balance check)
npm run build    # production build in dist/ (base path /Shackleton-Station/)
```

If `npm install` cannot reach registry.npmjs.org on your network, add
`--registry=https://registry.yarnpkg.com` (official npm mirror).

GitHub Pages: `.github/workflows/deploy.yml` is **manual only**, so pushing does not deploy.
To publish: *Actions → Deploy to GitHub Pages → Run workflow* (and set
*Settings → Pages → Source: GitHub Actions* once).

## Controls

| Key | Action |
|---|---|
| Mouse | Look (click to lock the mouse; if the browser refuses, drag to look) |
| W A S D / arrows | Walk |
| Shift | Hop faster |
| Space | Jump — Moon gravity is 1/6 of Earth's |
| E | Use / open doors / start a station mini-game / talk to Volt (look at him) |
| F | Eat (fresh greens first, then potatoes) |
| Tab | PDA: detailed stats, Databank (science + NASA sources), Star Album, log |
| Enter | Next step in Volt's Training Day |
| Esc | Pause (time notes, credits, graphics, sound, Volt settings) — or leave a mini-game |

Mini-games show their own controls (e.g. click/Space to zap, S for the Ice Drill scanner).

## What is in the game

- **Base at the real Shackleton crater rim** (NASA LRO LOLA terrain), a habitat (sleeping nook
  with a storm shelter, lounge + galley, work bay), a greenhouse, a vertical solar array, a
  cold-trap crater, a telescope and a cargo pad.
- **Sky:** black sky with 1,640 real stars, a low Sun circling the horizon and Earth near it.
  **Live sky** mode shows the real Sun, Earth and stars over the south pole right now.
- **Gauges:**
  - **Oxygen** (blue ring) is one shared supply for habitat + greenhouse + suit.
  - **Food** (green ring).
  - **Base power** (battery, top-centre).
  - A **dose ring** appears around particle storms.
  - Drain rates use NASA BVAD (2022) values; see `docs/SCIENCE.md`.
- **Lessons / mini-games:** Electrolysis (3 games: Molecule Zapper, Bubble Detective, Atom
  Match), Solar Fix (Cell Swap, Hot Spot Hunt, Wire Fix), Leak Fix (Leak Hunt, Hatch Hunt,
  Patch It), Ice Drill + Ice Oven, Water Walls, Telescope Star Hunt.
- **Micrometeoroids:** a random hit cracks the solar array (less power) or makes a tiny hole in
  the habitat (an air leak drains oxygen ≈ 2× faster until you find and patch it at the
  life-support rack). Never both at once.
- **Farming:** potato, lettuce and radish in grow pots; F to eat. A grow-lights switch trades
  power for food.
- **Supply terminal:** order kits, water, seeds and battery packs with the real light delay
  (1.28 s); crates land on the pad.
- **Particle storms** from real NASA DONKI + RadLab data: *Calm · Dec 2019* / *Stormy · May 2024*
  replays, or *Live*. Get to the storm shelter; water in its walls blocks more, but can't make
  oxygen. (Known issue: the Calm data file is missing, so Calm currently plays the Stormy replay.
  See CLAUDE.md.)
- **Airlock cycle** seen from inside, with a pressure gauge and air sounds; a helmet visor
  outside.
- **Volt**, a helper robot with a voice, guides Day 1 (the Training Day) and gives tips and
  sourced facts.
- **Gentle failure:** you wake up in the habitat, time passes, and there's no death screen.

## Updating real data

```bash
NASA_API_KEY=your_key node scripts/fetch-space-weather.mjs   # public/data/space-weather-*.json
node scripts/fetch-stars.mjs                                 # public/data/stars-bsc.json
node scripts/fetch-lola.mjs                                  # src/data/lolaTerrain.js
```

Get a free key at https://api.nasa.gov (the shared `DEMO_KEY` is rate-limited). For Live mode in
the browser, put `VITE_NASA_API_KEY=your_key` in `.env` (never committed).

## Performance check

Add `?fps` to the URL (e.g. `http://localhost:5173/?fps`) to show fps, frame time and draw
calls. Graphics Low/High is in the start and pause menus; on High, ambient occlusion turns
itself off if frames get slow. See `docs/PERFORMANCE.md`.

## Where things live

- `src/config/gameplay.js`: every rate and cost (sourced, or marked GAME BALANCE).
- `src/systems/`: pure logic, no Three.js, unit-tested (gauges, day cycle, electrolysis,
  radiation, space weather, ice mining, airlock, Volt's brain, navigation, live sky, balance
  bots).
- `src/world/`: terrain, sky, lighting, buildings, Volt, guide trail.
- `src/instances/`: the 2D lessons and mini-games.
- `src/farming/`, `src/supply/`, `src/training/`: farming, supplies, Training Day.
- `src/ui/`: HUD, PDA, menus, Volt's bubble and voice, visor, sounds.
- `docs/SCIENCE.md`: every fact and number with its source. `docs/GAME_DESIGN.md`: the design.
- `CLAUDE.md`: project rules, current state, what's not built yet, known issues.
