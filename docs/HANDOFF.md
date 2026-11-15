# Handoff — continuing Shackleton Station with Claude Code

This file is for the next person **and their Claude Code agent**. Read it right after
`CLAUDE.md`. Together with `docs/GAME_DESIGN.md`, `docs/SCIENCE.md` and `CHANGELOG.md`, it holds
everything the first owner and their agent agreed on, so you can pick up from the last update
without re-asking.

Last update: **15 Nov 2026**, commit "Micrometeoroids hit the array OR the habitat; Leak Fix + 2
new Solar Fix mini-games" (see `CHANGELOG.md` → Unreleased).

---

## 1. First 5 minutes (person)

```bash
npm install          # if registry.npmjs.org fails: npm install --registry=https://registry.yarnpkg.com
npm run dev          # http://localhost:5173
npm test             # 186 pure-logic tests, all must pass
npm run balance      # bots play a lunar day on the real rules
```

Open the folder in Claude Code. It loads `CLAUDE.md` and the 8 project skills in
`.claude/skills/` automatically. `.claude/launch.json` defines the `vite-dev` preview server (used
by the desktop app's browser pane).

No account, API key or `.env` is needed to play. Only **Live** space weather and
`scripts/fetch-space-weather.mjs` need a free NASA key (`VITE_NASA_API_KEY` in `.env`, never
committed; the code falls back to `DEMO_KEY`).

---

## 2. How the agent must work (standing instructions, all still in force)

These came from the owner over many sessions. Treat them as the user's own instructions.

1. **Two roles on every feature: astrophysicist + pedagogical teacher.**
   - *Astrophysicist:* the physics, astronomy and life-support numbers must be right (units,
     cause and effect, real sources: NASA first, then peer-reviewed or official agency data). Say
     when something is a simplification. Anything uncertain goes on "Needs verification" in
     `docs/SCIENCE.md`, not into the game.
   - *Teacher for ages 7–12:* one idea at a time, learn by doing, plain words, a real term plus a
     one-line explanation, concrete comparisons ("as thin as pencil lead"), a quick check (quiz),
     a "go deeper" layer, and never make the science false to make it simpler.
   - Every plan and every final report includes a short **physics check** and **teaching check**
     per feature, and points out anything that would teach something wrong. Examples from the
     last update: Wire Fix first showed a one-way path but called it a circuit, so we added the
     return wire to make it a loop. Tape only *slows* a leak, so air still visibly seeps past it.
     No hiss sound plays for the leak, because tiny leaks are ultrasonic (the game teaches that).
2. **Use the same Three.js skills.** Before writing code in an area, load the matching skill from
   `.claude/skills/` and tell the user which one you loaded (table in `CLAUDE.md`).
3. **Plan first on big features.** For a new feature or system, give a short plan (with physics +
   teaching checks) and wait for the user's go-ahead before writing lots of code. Small fixes can
   go straight ahead.
4. **If a request conflicts with `CLAUDE.md` or real science, say so** and propose the honest
   version. Never silently "fix" the science, and never silently ignore the request.
5. **Never invent numbers.** Every rate lives in `src/config/gameplay.js`. Real values carry a
   source comment; invented ones say `// GAME BALANCE (not real data)`. Derived values are
   computed in code (e.g. the leak rate from the choked-flow formula), not typed in.
6. **Every in-game fact** goes into `public/data/facts.json` (with a source URL) and
   `docs/SCIENCE.md` at the same time. Databank entries (`src/data/databank.js`) mirror them.
7. **Git:** make small commits with clear messages. **Push only when the user asks. Never deploy:**
   `.github/workflows/deploy.yml` is manual on purpose ("just push, do not deploy"). Ask before
   anything hard to undo.
8. **Verify before saying "done":** `npm test`, `npm run balance` if gameplay numbers changed,
   `npx vite build`, then play the change in the browser with no console errors. Report honestly
   what was and wasn't checked.
9. **Kids-first UI rules** (`CLAUDE.md` rule 8): body text ≥ 16 px, HUD ≥ 18 px, touch targets
   ≥ 44 px, contrast ≥ 4.5:1, max 4 gauges, minimal HUD (rings + numbers), explanations in the
   PDA, gentle failure (no death screen).
10. **Style of mini-games** (owner's words): "short, more symbols and visual learning than
    overwhelming the child with text". Pictures first, captions of a few words.

---

## 3. What exists now (short)

- **The mission = 4 days** (FNAF-style shifts of 6 real minutes, 07:00 → 19:00), with a day card,
  "Day N" titles, overnight refill (game rule) and a "Mission complete" screen. A main menu with
  Continue / New mission. See SCIENCE.md "Game balance" for every size and why.

Full list: `CLAUDE.md` → "Current state", plus `CHANGELOG.md`.

- 3D base at the real Shackleton rim (NASA LOLA), real stars, Live sky, habitat / greenhouse /
  solar array / cold-trap crater / telescope / cargo pad, first-person airlock with helmet visor.
- Gauges: shared **oxygen** (refilled only by Electrolysis: costs water + power), **food**
  (farm crops), **base power** (battery + solar), a **dose ring** during particle storms.
- Lessons (2D overlays, world paused):
  - **Electrolysis** (3 games)
  - **Solar Fix** (3 games: Cell Swap, Hot Spot Hunt, Wire Fix)
  - **Leak Fix** (3 games: Leak Hunt, Hatch Hunt, Patch It)
  - **Ice Drill + Ice Oven**, **Water Walls**, **Telescope Star Hunt**, storm and Training Day
    report cards
- Events: real DONKI + RadLab particle storms. **Micrometeoroids** hit the array (40 % power) OR
  the habitat (air leak: oxygen drains ≈ 2.2× faster), never both at once.
- Volt the robot (voice, 19-step Training Day on Day 1), supply terminal with the real 1.28 s
  light delay, farming (potato, lettuce, radish), balance bots.

---

## 4. Decisions log (why things are the way they are)

| Decision | Why |
|---|---|
| One shared oxygen gauge (habitat + greenhouse + suit) | Owner's design; only Electrolysis makes oxygen, so every refill costs water + power |
| 3 gauges + a dose ring only during storms; water tank shown in the PDA (`ENABLE_WATER_GAUGE` = false) | ≤ 4 gauges rule, simpler HUD |
| Minimal HUD (rings + numbers), oxygen blue, food green, power big at top-centre | Owner's polish-pass requests |
| Smooth, rounded "clean" look (v0.2.1), homey habitat | Owner: objects looked "gamey" and unpolished |
| ACES tone mapping, outdoor exposure 1.8, black sky | Kids must see outside; no atmosphere means a black sky |
| Mini-games picked at random, never twice in a row, kept until played | Owner: "follow the example of electrolysis"; a kid can't farm the easiest game |
| First-time "How to play" picture card per game (`ui/tutorial.js`) | Owner: tutorial the first time, visual, little text |
| Micrometeoroids: one scheduler, 60 % array / 40 % habitat, never both | Owner: "the 2 never happen simultaneously"; shares are game balance |
| Solar hit penalty = 40 % output (battery drains in sun, no extra drain at night) | Owner wanted "faster than usual, not too fast"; a broken array can't drain a battery at night (honest physics) |
| Leak = choked flow through a 0.7 mm hole, oxygen used to top the air up | Real formula (NASA Glenn); the hole size is game balance, chosen so the drain ≈ the spacewalk rate |
| Leak repair costs 1 game hour + the oxygen lost, no kit | Real stations carry leak-repair kits. **Open:** the owner may want an orderable patch kit like the solar kit |
| Idle balance bot target 4–8 min (was 5–8) | An unpatched leak can end a do-nothing run early; that's the intended consequence |
| Volt's voice via mespeak (GPL-3.0) in a worker | Works offline, falls back to the browser voice |
| Deploy workflow manual only | Owner: push, don't deploy |
| 4-day mission, 6-min shifts, nights skipped (Nov 2026) | Owner: "FNAF style, survive the day"; 4 days |
| Overnight free refill of oxygen/power/water; hunger carries over | Owner's choice; the card says it's a game rule |
| Potato = 50 % of the food gauge; lettuce honest (~3 %) | Owner asked 50 % / 25 %; 25 % lettuce would need ~2 kg of lettuce, so it stays honest (rule 1) |
| Crops: potato 2 nights, greens 1 night, need grow light half the day | Owner's design; keeps the grow-lights power trade-off |
| Gentle failure = 1-hour rest + a counted rescue (stars) | With a countdown, a long rest would help the player |
| Storms mapped by calendar day | Real dates stay honest; night storms are dosed in the shelter (you sleep in it) |
| CC0 music: "Outer Space Loop" (wipics) in the menu + inside; "Blue Moon Beach" (Tsorthan Grove) outside | Owner: the space track for menu/habitat only, a serene moon-vibe track outside (FF14's "Mare Lamentorum" as the feel, not copied) |

---

## 5. Code map and patterns to copy

- **Pure logic** in `src/systems/` (no Three.js, no DOM), unit-tested in `tests/`. Key files:
  `gauges.js` (`stepGauges(g, dt, ctx)`, where ctx includes `extraOxygenKgPerGameHour` for leaks),
  `micrometeoroids.js` (hit scheduler + leak physics), `balanceSim.js` (bots).
- **Wiring** in `src/main.js` (game loop, modes, `advanceGameHours`, `voltEvent`), `src/leak/`
  (scheduler + habitat leak: beacon, rack panel), `src/supply/` (terminal, pad, solar damage).
- **A new mini-game lesson:** copy the Leak Fix layout in `src/instances/leak/`:
  - `minigames.js`: GAMES list, `nextGame`, pure rules (testable)
  - `games.js`: `create<X>Game({ mount, announce, onComplete, onTip })` → `{ destroy, onKey }`
  - `content.js`: TEXT, TUTORIALS, CONCEPT, TIPS, LEARN (+ `LEARN_SHOWS`), QUIZ per game,
    SOURCES, DEEPER
  - `tutorialArt.js`: 200×130 SVG panels (`svg()` / `big()`), looping CSS animations
  - `index.js`: flow intro → play (tutorial first time) → learn → quiz → result, using
    `src/instances/lessonKit.js`
  - Pick state is saved in settings (`<name>Next` / `<name>Last`). Tests go in `tests/`.
- **Opening a lesson:** `instances.open(id, factory, ctx)`; handle the result in `main.js`
  `onClose`.
- **Save data:** one localStorage key `shackleton-station:v1` (`systems/save.js`), wrapped in
  try/catch.

---

## 6. Testing tips (learned the hard way)

- **Dev hooks** (dev build only): `window.__game` (world, player, gauges, instances, …),
  `__leak` (`hitHabitat()`, `interact()`), `__supply`, `__farm`, `__dev`. For example, force a
  leak with `__leak.hitHabitat()`.
- To force a specific mini-game, set e.g. `solarNext: 'wires'` or `leakNext: 'hatch'` in the
  `shackleton-station:v1` localStorage object, then reload. Remove `seenTutorials` entries to
  see the tutorials again.
- A fresh save starts the **Training Day** (base clock 20× slower, no random hits). The start
  screen needs **two** clicks.
- Vite does a full page reload when you edit modules without HMR: the game goes back to the start
  screen.
- The embedded browser may refuse pointer lock; the game falls back to drag-to-look.
- Browser-pane screenshots can lag behind the page. Confirm with `read_page` / page text.
- On Windows, bash heredocs that contain JS template literals (`${…}`) can break. Write patch
  scripts to a file and run them with Python instead.
- `?fps` in the URL shows fps, frame time and draw calls.

---

## 7. What's next (backlog, from `CLAUDE.md` and the last sessions)

1. **Calm Sun data missing:** `public/data/space-weather-2019-12.json` was never committed; Calm
   plays the Stormy replay. Run `scripts/fetch-space-weather.mjs` with a NASA key and commit it.
2. **Version bump:** `package.json` still says 0.11.0, though a lot has merged since. It's the
   team's call.
3. `docs/PERFORMANCE.md` numbers are old. Re-measure the 3 views (method is in the file).
4. Not built yet:
   - moonquake, lander dust on the panels, and the dark-period "choose machines to turn off"
     event
   - comms dish instance, scheduled supply landers with food
   - missions, science points, upgrades, the crew-swap goal, an end screen
   - water gauge, greenhouse LED level, BPS data hub facts, touch controls, glTF models
5. Open question for the owner: should habitat leaks need an orderable **patch kit** (like the
   Solar Panel Repair Kit)?

---

## 8. What is NOT in this folder (and doesn't need to be)

- `node_modules/` and `dist/`: recreated by `npm install` / `npm run build`.
- `.env`: personal NASA key, never shared or committed.
- Testing a later day: set `mission: { day: N }` in the `shackleton-station:v1` localStorage object
  (Day 1 always runs the Training Day), and jump the clock with `__game.day.gameSeconds`.
- The first owner's private Claude memory and chat transcripts. Everything that mattered from
  them is written down in this file, `CLAUDE.md`, `docs/` and `CHANGELOG.md`.
