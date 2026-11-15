# Changelog — Shackleton Station

## Unreleased — on main after 0.11.0

Merged after the 0.11.0 balance pass; `package.json` still says 0.11.0.

### Gameplay
- **Volt's airlock facts:** while the airlock cycles there's a 50 % chance Volt explains one
  thing about it: why two doors, depressurizing (air pushes on a 1 m² hatch like 150 grown-ups),
  saving the air, the pure-oxygen prebreathe, the gold visor, repressurizing, sticky Moon dust.
  Each is a small card with a looping picture and two lines, never repeated in a mission, never
  during a storm. Also: an airlock cycle now costs 1 % of the oxygen supply again (it had become
  8.6 % when the supply shrank).
- **Days: survive 4 shifts (FNAF-style).** Each day runs 07:00 → 19:00 on the base clock, 6 real
  minutes (time 120× real life), with a countdown in the HUD. Survive it → "Day N complete!" card
  with stars → the night is skipped → "Day N + 1" (with the replay's real date) → fade in, waking in
  your bunk. Day 4 → "Mission complete". Overnight, oxygen, power and water refill to full (a game
  rule, said on the card); hunger, food and crops carry over. A gentle failure is now a short 1-hour
  rest counted as a rescue (3 / 2 / 1 stars). Saved: the menu offers "Continue · Day N".
- **Crops grow overnight:** potato ready on the third morning (2 nights), lettuce and radish the
  next morning — only if the grow lights were on for half the day.
- **Food values:** the food gauge holds one day of BVAD food. A potato (a whole plant's crop,
  ≈ 2 kg) fills **50 %**, a packaged space meal 33 % (2 at the start), lettuce ≈ 3 % and a radish
  handful ≈ 0.5 % (honest USDA calories: the requested 25 % for lettuce would need ≈ 2 kg of
  lettuce). F picks the food that fits without waste. Day 1 (the Training Day) starts with oxygen
  and food at 60 % (Volt has you make oxygen and eat), 3 space meals in the store, and the tour
  clock runs 7× slower (was 20×) so the gauges visibly move while you learn.
- **Storms by calendar day:** Day 1 = the replay's first date; a storm that really came at night
  is dosed in the shelter (you sleep in it) and reported in the morning.
- **Ice Oven:** an animated picture (heat → vapour → cold plate → water) and a first-time
  3-picture "How it works" card; fewer words.
- **Main menu (indie style):** the live base drifting by under the stars, a big title, Volt
  waving, Continue / New mission / Settings / How to play / Credits.
- **Sound:** two CC0 music tracks that crossfade: "Outer Space Loop" by wipics in the menu and
  inside the base, "Blue Moon Beach" by Tsorthan Grove outside on the Moon (it is mastered ≈ 15 dB
  quieter, so each track gets its own Web Audio gain + a soft limiter: both play equally loud);
  in-suit breathing made of real breaths (in → pause → out) inside a small helmet echo, faster and
  stronger when you hop; footsteps (metal taps inside, a soft
  crunch felt through the boots outside: no air), faster suit breathing when you move, and themed
  sound kits for the mini-games (fizz and bubbles, sparks and hum, hiss and clank, drill, oven).
- **Micrometeoroids hit the array OR the habitat (never both at once).** One scheduler
  (`systems/micrometeoroids.js`) replaces the array-only hits: about one hit per 3 game days,
  60 % crack the solar array, 40 % hole the habitat, and no new hit comes while something is
  still broken. No random hits on the Training Day.
  - **Array hit (unchanged power penalty):** 40 % output, so in sunlight the battery drains
    ≈ 1.4 kW instead of charging ≈ 4 kW. At night it changes nothing: a broken array can't make
    the dark worse (physics check).
  - **Habitat air leak (new):** a red beacon and "AIR LEAK" sign on the life-support rack, a
    soft alarm beep in the habitat, and Volt's warning. The base tops the cabin air up from the
    oxygen supply, so oxygen drains ≈ 2.2× faster until the hole is patched. The rate is real
    physics: choked flow through a 0.7 mm hole (game balance) ≈ 0.2 kg of air an hour. The PDA
    explains it, and E at the rack opens the new Leak Fix lesson. Patching costs 1 game hour.
- **Leak Fix lesson: 3 habitat mini-games**, picked at random like Electrolysis, each with a
  first-time picture tutorial, Volt's idea line and tips, "What really happened", a quiz and
  sources. A first-time "Why does air leak?" screen comes first (air pushes out; space doesn't
  suck).
  - **Leak Hunt:** follow an ultrasonic leak detector's bars and beeps (the leak whistles too high
    to hear).
  - **Hatch Hunt:** close hatches and watch the pressure needles; only the part with the hole
    keeps falling (the ISS crews' 2020 method).
  - **Patch It:** tape (slows it), mix two-part epoxy, press the cloth patch on from the inside,
    then watch the pressure hold (the 2018 Soyuz repair).
- **Solar Fix: 3 mini-games.** Cell Swap (the old repair step), plus two new ones:
  - **Hot Spot Hunt:** cracks too small to see; switch on the infrared camera and tap the hot
    cells.
  - **Wire Fix:** turn the wire pieces until the loop from the cells to the battery and back is
    closed.

  The "how a solar cell works" steps (light, circuit) now play only on the first repair (and
  from a button). Every game has a first-time picture tutorial, a learn screen and its own quiz.
- **Shared lesson frame** (`instances/lessonKit.js`) for the repair lessons: card, steps,
  tips, learn screen and quiz.
- **Fixes:** a faded Volt bubble left its Training Day "Next" button clickable on top of
  lessons (blocked clicks). Resting or running a machine now keeps a damaged array's lower
  output and an open leak.
- **Balance:** the bots get the new hits (`npm run balance` shows array vs leak hits). The idle
  target is now 4–8 min, since an unpatched leak can end a do-nothing run early; sloppy and
  skilled still meet their targets. 185 tests.
- **Three electrolysis mini-games.** The station picks one at random (never the same twice in
  a row, and leaving doesn't re-roll it):
  - **Molecule Zapper**
  - **Bubble Detective:** H₂ at the − plate, O₂ at the +, 2 : 1.
  - **Atom Match:** 2 H₂O → 2 H₂ + O₂, no atom lost.

  First-time "How to play" cards use looping pictures (`ui/tutorial.js`). Volt explains the
  idea, gives one-time tips and a "What really happened" recap. Batch, cost and quiz are the same
  for every game.
- **Helmet visor outside:** you see through a spacesuit helmet (visor rim, glass tint and
  reflections, chin at the bottom). It's one SVG under the HUD, so it costs no GPU time, and the
  HUD moves inward while the suit is on. The helmet goes on in the airlock after the hatch
  closes, before the air is pumped out, and comes off once the pressure is back.
- **Climbable airlock stairs:** the stairs used to be a wall. `world/ground.js` now gives them a
  smooth walkable height for the player, Volt and the guide trail, with thin walls under the
  handrails. "E to enter" is now at the hatch at the top of the stairs (interactables can set a
  `reach`).
- **Tidier work bay:** the decorative crates are gone and the Supply terminal stands alone. The
  console desk is replaced by BASE STATUS / COMMS wall screens. The Ice Oven moved to the −Z wall,
  with its water pipe running into the Electrolysis tank.
- **Training Day step:** after the Ice Oven, visit the telescope (Star Hunt). The storm drill
  then starts while you're outside, with the real warning time (about 45 s of play) to get back
  to the shelter. TOUR_VERSION 3.

### Look
- **Stylized semi-realistic graphics overhaul (visuals only):**
  - **Textures:** procedural PBR textures made at start-up, with no download (wall plates with
    seams and screws, perforated floor, solar cells, soil).
  - **Palette and indoor light:** a shared palette, and indoors warm light from above with a soft
    blue-purple bounce.
  - **Post-processing:** ACES Filmic tone mapping (replaces AgX), slight saturation, a subtle
    vignette and softer bloom.
- **Brighter outside:** camera exposure 1.8 outdoors, plus more fill, earthshine and ground
  reflection, so kids can see. The sky stays black and shadows stay sharp; indoors is unchanged.

## 0.11.0 — Game balance: challenging, not crushing

### Gameplay
- **Grow-lights switch** by the greenhouse door. The base's long night (≈ 21 game hours) needs
  104 kWh with the lights on — more than the 80 kWh battery, so the base blacks out before sunrise.
  Switch them off and it needs only 62 kWh, but the potatoes stop growing: power vs food.
- **Blackouts stop machines:** grow lights, potatoes, Electrolysis, the water pump and now the
  Ice Oven pause until power is back. The airlock keeps working, so you never get stuck outside.
- **Lettuce and radish** join the potato in the grow pots, both really grown by NASA on the ISS.
  Pick a seed on the farm panel: potato (slow, lots of food) or lettuce / radish (≈ 3× faster, a
  little food). Food follows real USDA calories. Cut a lettuce head once, or pull up 3 radishes.
  You start with 4 + 4 seeds; order seed packets (6 seeds, very light) at the supply terminal.
  F eats fresh greens first, then potatoes. Pots are now called GROW POTS.
- **Solar array damage tuned:** a micrometeorite hit about every 3 game days (was 2), and you start
  with 1 spare repair kit.
- A full farm now makes 1.4× the food of a resting astronaut (was 1×), since there's no food from Earth.
- **Tighter start:** oxygen 50 %, food 80 %, water tank 6 kg.
- **Big storms need water walls:** the shelter now lets 35 of 100 particles through. Weaker
  May-2024 storms are fine in the shelter; the strongest (11 May) also needs water in the walls,
  and Volt's warning says so.

### Under the hood
- `src/systems/balanceSim.js` + `npm run balance`: three bots (idle / sloppy / skilled) play a
  20-min lunar day on the real rules, 200 runs each with random array hits;
  `tests/balance.test.js` locks the targets in. `tests/crops.test.js` covers the new crops.
- SCIENCE.md "Game balance": every calculation (BVAD food and oxygen, night power budget, storm doses).

## 0.10.1 — Calmer Water Walls and Ice Oven screens

- **Simpler for kids:** each screen now has one picture, one big number and one main button.
  Water Walls: the particle animation + "8 of 100 particles reach you", the tank ⇄ walls slider,
  and "Pump into walls (uses 1% power)". Ice Oven: "60 kg of icy soil → about 3.4 kg of water", a
  3-step Heat → Ice → vapour → Water picture with a progress bar, and "Bake (uses 4% power)".
- Extra facts and sources moved behind an optional **Did you know?** button; the easy question
  after pumping stays. Removed the bar chart, cost meters, Earth-vs-Moon box and small print.
- The airlock room got a realistic crew-lock interior (cylinder, padded panels, real-style hatches,
  spacesuits, control panel, caution beacons).

## 0.10.0 — The airlock: hatches, pumps and the sound of air

### Gameplay
- Going out or in (habitat and greenhouse) now runs a short **airlock cycle** you see from inside:
  the hatch behind you seals, a wall gauge shows the air pressure falling (or rising), the lights go
  amber → green, and the far hatch opens. You can look around; E/Space fast-forwards after the first.
- **Sound needs air:** the pump hiss gets quieter and duller as the air is pumped out, then near
  silence; you still feel the pump through your boots. Outside you only hear your suit (breathing +
  fan); inside, the module's air vents hum. Volt explains it the first few times.
- **Never free:** each cycle loses a little air (0.03 kg of oxygen) and takes 15 base minutes.
- **Sound effects volume** slider in the pause menu (saved).

## 0.9.0 — Real terrain: the Shackleton crater rim (NASA LOLA)

### Gameplay
- **You walk on the real Moon.** The ground around the base is the real terrain of the Shackleton
  crater rim, measured by NASA's LRO laser altimeter (LOLA): 5 m detail near the base, 80 m out to
  45 km, plus the real far skyline. Shackleton's 4 km-deep, permanently dark bowl lies right next
  to the base, with its far rim lit by the low Sun.
- **The base moved to a real well-lit spot**, ~450 m from the south pole on the ridge (the exact pole
  is on a slope and often shadowed by a nearby hill) — picked by scanning the real terrain, the
  way landing-site studies do.
- **Real dark periods:** the Sun now hides behind the real ridges and mountains instead of a made-up
  ridge (game mode: the Sun is visible from 82% of directions).

### Code
- `scripts/fetch-lola.mjs` → `src/data/lolaTerrain.js`; `world/lola.js` (map ↔ world, heights,
  horizon); `heightfield.js` uses real heights; `terrain.js` builds the real disc + distant land +
  skyline; `sunVisibility(az, elevation)` uses the real horizon. Removed the made-up big craters and
  the ridge settings. Tests: `tests/terrain.test.js`.

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

## Guided Training Day + tutorial guidance — merged after 0.6.0 (no version number)

- **Training Day:** Volt's first-day tour becomes a 19-step guided Day 1 (`data/trainingDay.js`):
  gauges, PDA, electrolysis, a supply order (light delay), eating, planting and watering, a
  micrometeorite hit, a cargo landing, Solar Fix, ice drill + oven, a storm drill (shelter +
  water walls + real-storm card), harvest, then a report card.
- **Pace:** the base clock runs 20× slower while training (`TRAINING.PACE`), but the storm drill
  runs at normal speed. There are no random events on Day 1; scripted ones fire as Volt says the
  line.
- **Controls:** a "Next ▶ Enter" button passes a step and Esc skips the tour. Day 1 (and a page
  reload) always starts the Training Day from step 1, including for players who finished the
  old 7-step tour.
- **Guidance:**
  - `systems/navigation.js` builds walkable grids from the colliders and finds paths with A* +
    line-of-sight smoothing.
  - `world/guide.js` draws a chevron trail to the next spot (routed through doors), an arrow
    above the machine and a circle where you stand.
  - Volt rolls ahead along the trail and never clips walls or furniture.

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

## Supply terminal, cargo pad and Solar Fix — merged after 0.5.0 (no version number)

- **Supply terminal** in the habitat work bay ([E] Request Supplies): pick supplies and
  quantities, and see cargo mass (60 kg lander limit), light delay and arrival time.
  - **Order stages:** transmitting → Mission Control review → approval → preparing → in
    transit → landing → arrived → collected, shown with a live countdown.
  - **Communication delay:** 384,400 km ÷ the speed of light = 1.28 s each way, always in real
    time (not sped up). Orders keep moving in the background.
- **Cargo pad** east of the habitat: crates land on thrusters (no air, so no parachutes) and
  throw up regolith dust. It holds up to 6 crates; extra cargo waits in orbit.
- **Opening a crate:** [E] Open Cargo Crate, tick the items you want and collect them. Repair
  kits and seeds go to the inventory, water to the Electrolysis tank, battery packs to the base
  battery. Orders, crates and IDs (SR-001…) persist across reloads.
- **Solar array damage + Solar Fix:** micrometeorite hits drop the array to 40 % output (game
  balance). [E] at the damaged array with a repair kit opens the Solar Fix lesson: free
  electrons with photons, close the circuit (DC), swap cracked cells in series chains, then a
  quiz. Sources: U.S. EIA, U.S. DOE PV Cells 101, PVEducation, NASA Moon Fact Sheet.
  Tests: `tests/supply.test.js`.

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

## Potato farming — merged after 0.4.0 (no version number)

- **Grow pots** in the greenhouse, in the gap between the rack runs.
- **Close-up pot view (E):** drag the seed potato into the soil, cover it, and tilt the watering
  can. The plant grows under the grow lights, only while base power is on.
- **Harvest:** each snip of a leafy stem pulls it up with its potato hanging from the root
  (potatoes grow underground, not on the leaves).
- **Eating:** an inventory panel (bottom-right), and F eats a potato through `addFood()`
  (the twin of `addOxygen()`). You can't eat the last seed potato while nothing is planted.
- **Food value:** derived in `gameplay.js` from grow time and the BVAD hunger rate (0.8 kg/day),
  so a full farm feeds a resting astronaut (raised to 1.4× in 0.11.0). Pots and inventory are
  saved.

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
