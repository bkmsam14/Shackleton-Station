# Shackleton Station — Demo 0

A browser-based 3D survival sandbox for kids (7–12) at the Moon's south pole.
NASA Space Apps Challenge 2026. No download, no account.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # pure-logic unit tests (gauges, day cycle, collision)
npm run build    # production build in dist/ (base path /Shackleton-Station/)
```

If `npm install` cannot reach registry.npmjs.org on your network, add
`--registry=https://registry.yarnpkg.com` (official npm mirror).

GitHub Pages: `.github/workflows/deploy.yml` is **manual only** — pushing does not deploy.
To publish: *Actions → Deploy to GitHub Pages → Run workflow* (and set
*Settings → Pages → Source: GitHub Actions* once).

## Controls

| Key | Action |
|---|---|
| Mouse | Look (click to lock the mouse; if the browser refuses, drag to look) |
| W A S D / arrows | Walk |
| Shift | Hop faster |
| Space | Jump — Moon gravity is 1/6 of Earth's |
| E | Use / open doors / start a station mini-game |
| Click or Space | Zap water molecules in the Electrolysis mini-game (Esc leaves it) |
| Tab | PDA: detailed stats, Databank (science + NASA sources), log |
| E (looking at Volt) | Ask Volt for a tip |
| Esc | Pause (credits + time notes, Low/High graphics) |

## Performance check

Add `?fps` to the URL (e.g. `http://localhost:5173/?fps`) to show fps, frame time and draw
calls. Measurements and the cost of each effect are in `docs/PERFORMANCE.md`.

## What is in Demo 0

- Spawn inside the habitat → airlock → lunar south-pole surface (black sky, stars, Sun
  1.5° above the horizon, long shadows, Earth low on the horizon with real phase).
- Tall vertical solar array that turns to follow the Sun.
- Greenhouse with grow racks under red + blue LEDs.
- Gauges: **Oxygen** (one shared supply for habitat + greenhouse + suit) and **Food**
  (bottom-left), and **Base Power** (whole base, top-right). Drain rates use NASA BVAD (2022)
  values — see `docs/SCIENCE.md`. Oxygen is refilled only at the Electrolysis unit (below).
- Gentle failure: wake up in the habitat, time passes, no death screen.
- **Electrolysis mini-game "Molecule Zapper" (v0.3.0):** in the habitat work bay, press E. Pick a
  batch (Small / Medium / Big, costs shown up front), zap H₂O molecules and watch the H₂ tube fill
  twice as fast as the O₂ tube, answer one quiz question, and earn 1–3 stars (bronze / silver /
  gold mastery, saved). Each batch costs water from the unit's own tank (1.125 kg per kg O₂) and
  base power (physics minimum 4.96 kWh per kg O₂, NIST), and the base clock moves on by the real
  ISS production time.
- The grow racks still show a "Coming soon" lesson toast.
- **Volt, the helper robot (v0.4.0):** a small wheeled robot follows you, runs a 7-step
  learn-by-doing first-day tour, warns when a gauge gets low (and says how to fix it), and shares
  sourced science facts now and then. Look at Volt and press E for a tip. Volt speaks out loud
  in a cute robot voice (eSpeak engine + robot effects; GPL-3.0, see public/CREDITS.md). Pause menu: how often
  Volt talks (Chatty / Helpful / Quiet), his voice On / Off, and Replay / Skip the tour.

- **Solar storms + storm shelter (v0.5.0):** pick a Sun on the start screen (Calm Dec 2019 /
  Stormy May 2024 replays of real NASA DONKI + RadLab data, or Live). When a real flare is
  replayed, get to the storm shelter in the sleeping nook before the particles arrive. Pump water
  into the shelter walls for more protection — but that water can't make oxygen.

### Updating the space-weather data

```bash
NASA_API_KEY=your_key node scripts/fetch-space-weather.mjs   # writes public/data/space-weather-*.json
```

Get a free key at https://api.nasa.gov (the shared `DEMO_KEY` is rate-limited). For Live mode in
the browser, put `VITE_NASA_API_KEY=your_key` in `.env` (never committed).

## Where things live

- `src/config/gameplay.js` — every rate and cost (sourced, or marked GAME BALANCE)
- `src/systems/` — pure logic (no Three.js): gauges, day cycle, save
- `src/world/` — terrain, sky, lighting, buildings (one model function per object)
- `src/player/` — controller, collision, interaction
- `src/ui/` — HUD, menus, prompts, toasts
- `docs/SCIENCE.md` — every fact and number with its source
