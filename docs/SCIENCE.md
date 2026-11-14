# Science Bible — Shackleton Station

Every fact the game shows must come from this file (or `public/data/facts.json`, which mirrors it) and have a source. If a fact isn't here, it doesn't ship.

## Rules

1. Simplify by **leaving details out**, never by saying something false.
2. Time and amounts may be scaled; **cause and effect and ratios stay real**. Show the real value next to the game value.
3. Use real terms with a one-line explanation (electrolysis, regolith, sol, solar particle event).
4. Two levels: a core sentence for ages 7+, and a "Go deeper" line for ages 10–12 and parents.
5. Mark future tech as future: "NASA is testing…", not "astronauts do…".
6. Simulated values are labeled as simulated. Archived data is labeled "replay"; only live fetches are labeled "live".

## Verified facts (core sentence → go deeper)

### Life support numbers — NASA BVAD (used for gauge drain rates)
Source: Ewert, Chen, Powell, *Life Support Baseline Values and Assumptions Document* (BVAD), NASA/TP-2015-218570/REV2, Feb 2022 — https://ntrs.nasa.gov/citations/20210024855 (PDF: https://ntrs.nasa.gov/api/citations/20210024855/downloads/BVAD_2.15.22-final.pdf). Page numbers are the numbers printed on the pages. CM = crewmember.

| Quantity | Value | Where |
|---|---|---|
| Oxygen consumed, nominal (inside) | **0.895 kg/CM-day** (text rounds to 0.90) | Table 3-31, p. 58; footnote 77, p. 59 |
| Carbon dioxide produced | 1.085 kg/CM-day | Table 3-31, p. 58 |
| Food eaten, dry mass (no packaging) | **0.800 kg/CM-day** (= 1.56 kg eaten at 48.7 % water) | Table 3-31, p. 58; p. 59 |
| Food energy | 12.778 MJ/CM-day | Table 3-31, p. 58 |
| Drinking + food-prep water | 3.217 kg/CM-day | Table 3-31, p. 58 |
| Oxygen during a spacewalk (EVA) | **0.086 kg/CM-hour** | Table 4-70, p. 135 |
| Food energy during a spacewalk | **1.062 MJ/CM-hour** | Table 4-70, p. 135 |
| Metabolic rate on a lunar-surface EVA (nominal) | 352 W/CM | Table 4-69, p. 135 |

How the game uses them (ratios stay real, amounts are scaled):
- Oxygen drains **0.086 ÷ (0.895 ÷ 24) ≈ 2.3×** faster outside than inside. *Core:* working in a heavy suit is hard work, so you breathe more.
- Food drains **1.062 ÷ (12.778 ÷ 24) ≈ 2.0×** faster outside than inside. *Core:* hard work outside burns more food energy.
- Time is sped up 360× (1 in-game day = 4 real minutes). The *size* of each full gauge (3 kg oxygen supply, 3 days of food) is game balance, marked in `gameplay.js`.

### Oxygen and air
- **Electrolysis:** electricity splits water into hydrogen and oxygen. → 2H₂O → 2H₂ + O₂. The hydrogen side makes twice as much gas as the oxygen side. *Source: NASA ISS Oxygen Generation Assembly — https://ntrs.nasa.gov/citations/20200002346*
- **CO₂ removal:** astronauts breathe out carbon dioxide, which must be removed or it builds up. → The ISS uses CO₂ removal systems in its life support (ECLSS). *Source: NASA ECLSS (add URL)*
- **Sabatier:** leftover hydrogen + CO₂ → water + methane. Your breath becomes water again. → On the ISS the methane is vented. *Source: NASA (add URL)*
- **Oxygen in Moon rocks:** Moon soil (regolith) is about 40% oxygen by weight, locked in minerals. NASA is *testing* ways to extract it. *Source: NASA (add URL)*

### Water
- The ISS recycles about **98%** of its water, including sweat and urine. *Source: NASA, 2023 ISS water recovery milestone (add URL)*
- Craters near the lunar south pole that never get sunlight (permanently shadowed regions) hold water ice. That's a main reason Artemis is going there. *Source: NASA (add URL)*

### Food and plants
- NASA's **Veggie** system grew lettuce and other plants on the ISS under LED lights, using growing "pillows". *Source: NASA Veggie (add URL)*
- Plants mainly use red and blue light for photosynthesis, which is why grow lights often look pink/purple. *Source: NASA Veggie VEG-04 (red:blue light study) — https://ntrs.nasa.gov/citations/20190033231*
- Plants need light, water, warmth and nutrients, and they take time to grow. They also release some oxygen and take in CO₂.
- ESA's **MELiSSA** project researches life-support loops including spirulina (an algae). *Source: ESA MELiSSA (add URL)*
- CSA food production toolkit: https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/ (an index page; use its linked articles "Food in space: the challenges" and "Growing healthy food in space and in remote areas")

### Power and light at the south pole
- The Sun stays low on the horizon at the lunar south pole, so shadows are very long.
- Some high ridges near the south pole are lit most of the time, but darkness periods still happen. That's partly why Artemis targets this region.
- NASA is developing tall **vertical solar arrays** (VSAT project) that can follow the low Sun. *Source: NASA VSAT annual review, 2023 — https://ntrs.nasa.gov/api/citations/20230012849/downloads/GCD%20Annual%20Review%20VSAT%20September%202023%20Final.pdf*
- During dark periods, a base needs stored energy (batteries or regenerative fuel cells).

### Radiation and shielding
- The Moon has no thick atmosphere and no global magnetic field, so particles from the Sun and from deep space reach the surface.
- Solar flares can be followed by **solar particle events**, bursts of fast particles that are dangerous for astronauts.
- Shielding works with **mass**: water, regolith or plastic between the crew and space. Astronauts shelter in the most shielded spot during solar storms.
- The ISS is in low Earth orbit, inside Earth's magnetic field, which partly protects it. **RadLab ISS readings are not Moon values.** Moon surface doses are higher (find a NASA source for the Moon/ISS comparison before showing a number).

### Dust
- Lunar regolith is sharp, abrasive and sticky. It clings to suits and covers equipment.
- **There is no wind, so there are no dust storms on the Moon.** Dust gets thrown up by rocket exhaust, rovers and walking.

### Gravity and the environment
- Moon gravity is about 1/6 of Earth's. → 1.62 m/s² vs 9.81 m/s². *Source: NASA Moon Fact Sheet — https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html*
- The Moon has almost no air, so the sky is black even in daytime and shadows are sharp. → Surface pressure about 3 × 10⁻¹⁵ bar. *Source: NASA Moon Fact Sheet*
- Moonquakes are real; seismometers left by the Apollo missions recorded them.
- Micrometeoroids constantly strike the Moon; there is no atmosphere to burn them up.

### Sun and sky at the south pole (used in the Demo 0 world)
- The Sun stays within about 1.5° of the horizon at the lunar south pole. → Moon's equator is tilted ~1.54° to the ecliptic (6.68° obliquity to orbit − 5.145° orbit inclination). *Source: derived from NASA Moon Fact Sheet*
- The Sun takes about **29.5 days** to circle the sky once (one synodic month, 29.53 days). *Source: NASA Moon Fact Sheet*
- Seen from the Moon, Earth stays in nearly the same spot in the sky and shows phases (opposite to the Moon's phase). Its size in the sky is about 1.9° (12,742 km ÷ 384,400 km). *Source: NASA Earth and Moon Fact Sheets — https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html*
- The Sun looks about 0.53° wide from the Moon. *Source: NASA Sun Fact Sheet — https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html*
- Earth's axis is tilted 23.44° and it turns once a day. *Source: NASA Earth Fact Sheet*

### Communication
- A signal takes about **1.3 seconds** to travel one way between the Moon and Earth.
- Between Mars and Earth it takes from about 3 to about 22 minutes one way, depending on the planets' positions.
- At the south pole, Earth is low on the horizon, so terrain can block the signal. NASA and ESA are planning lunar relay satellites.

### Real data events used
- **Stormy Sun:** May 2024. A period of very strong solar activity, including X-class flares on 14 May 2024 (confirm in the DONKI archive JSON before shipping).
- **Calm Sun:** late 2019, around solar minimum (December 2019).

## Data sources (credit these in the game)
**Required by the team:** BVAD (https://ntrs.nasa.gov/citations/20210024855), NASA BPS data hub (https://science.nasa.gov/biological-physical/data/), RadLab overview (https://visualization.osdr.nasa.gov/radlab/gui/overview/), DONKI (https://ccmc.gsfc.nasa.gov/donki/). See the table in CLAUDE.md for what each one is used for.

- NASA Open APIs: https://api.nasa.gov/ (DONKI endpoint, e.g. `https://api.nasa.gov/DONKI/FLR?startDate=2024-05-01&endDate=2024-05-31&api_key=...`)
- DONKI: https://ccmc.gsfc.nasa.gov/tools/DONKI/
- OSDR: https://osdr.nasa.gov/bio/repo/
- RadLab API: https://visualization.osdr.nasa.gov/radlab/gui/data-api/ (fields include `absorbed_dose_rate` in μGy/hour and `dose_equivalent_rate` in μSv/hour; CORS support unconfirmed, so plan to ship an archived extract)
- Moon Trek: https://trek.nasa.gov/moon/
- CSA food production toolkit (above)

## Simplifications in Demo 0 (details left out, nothing false)
- **Two clocks.** Life support runs 360× faster than real life; the Sun's trip around the sky is sped up more (about 20 real minutes instead of 29.5 days). Both real values are shown on the start and pause screens.
- **One oxygen supply.** Real suits carry their own tank that is refilled before each walk; the game merges suit + base into one supply.
- **One ridge.** Dark periods come from one simple ridge on the horizon hiding the low Sun.
- **Shadows are near-black** outside (no atmosphere), lit only by faint earthshine — whose strength follows Earth's phase — and the regolith around you. A **helmet lamp** lights the way in shadow (real spacesuit helmets carry lights; we don't state a brightness).
- **Earthshine strength** is scaled by Earth's lit fraction as seen from the Moon: (1 − cos(angle between Sun and Earth)) / 2 — geometry, not a measured brightness.
- **Earth fixed in the sky.** Libration (small wobbles) is left out.

## Needs verification (do not show until resolved)
- [x] ~~BVAD per-person oxygen and food values~~ → done, see "Life support numbers" above. (Water values are copied too, for the future water gauge.)
- Percentage of time the Shackleton rim is sunlit, and a source for terrain-caused dark periods (LRO/LOLA illumination studies).
- Real spacesuit oxygen duration (xEMU / EMU) if we ever show suit-tank time.
- BVAD exercise oxygen rates (Tables 3-23 / 3-25) if "sprinting drains oxygen faster" is added.
- A Moon surface vs ISS dose comparison from a NASA source (for example Artemis I or LRO CRaTER results).
- Real growth times for lettuce and potato in controlled-environment agriculture.
- Exact source URLs for every "(add URL)" above.

## Corrections log (mistakes we caught; don't repeat them)
- ❌ "Dust storms on the Moon" → ✅ dust blasted by landers and rovers.
- ❌ A powered energy "shield" → ✅ mass shielding (water walls, regolith).
- ❌ "A 14-day night at the south pole" → ✅ shorter, irregular dark periods on the high ridges.
- ❌ "Hydrogen is just stored as fuel" → ✅ on the ISS it goes to the Sabatier system (fuel cells are a separate, valid lunar-base idea).
