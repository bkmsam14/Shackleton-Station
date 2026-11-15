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
- **Sabatier:** leftover hydrogen + CO₂ → water + methane. Your breath becomes water again. → On the ISS the methane is vented, and hydrogen the reactor can't use is vented too. *Source: NASA ECLSS — https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/ ; NTRS 20100036570*
- **Oxygen in Moon rocks:** Moon soil (regolith) is about 40% oxygen by weight, locked in minerals. NASA is *testing* ways to extract it. *Source: NASA (add URL)*

### Electrolysis (used by the Molecule Zapper mini-game)
- **Water is H₂O:** 1 oxygen atom + 2 hydrogen atoms; the molecule is bent (H–O–H angle ≈ 104.5°). Splitting it gives **twice as much hydrogen gas as oxygen gas** by volume. Hydrogen forms at the **negative** electrode, oxygen at the **positive** electrode. Hydrogen is extremely flammable. *Source: RSC — https://edu.rsc.org/experiments/exploding-bubbles-of-hydrogen-and-oxygen/752.article*
- **Water used:** 2 H₂O → 2 H₂ + O₂, so 36 g of water gives 32 g of O₂ → **1.125 kg of water per kg of O₂** (stoichiometry; molar masses H₂O 18 g/mol, O₂ 32 g/mol).
- **Energy (minimum):** ΔfH°(H₂O, liquid) = **−285.83 kJ/mol**. 1 kg O₂ needs 62.5 mol of water → 17.86 MJ = **4.96 kWh per kg O₂**. Real electrolysers need more (losses as heat). The game uses the minimum and says so. *Source: NIST Chemistry WebBook — https://webbook.nist.gov/cgi/cbook.cgi?ID=C7732185&Mask=2*
- **ISS Oxygen Generation Assembly (OGA):** electrolyses water supplied by the Water Recovery System; oxygen goes to the cabin, hydrogen is vented or sent to the Sabatier reactor. Cell stack with a solid polymer electrolyte membrane. Selectable **2.3–9.2 kg O₂/day**; **5.4 kg/day** nominal (used for the "real time" line). *Sources: NASA ECLSS — https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/ ; NTRS 20080036243 — https://ntrs.nasa.gov/citations/20080036243 ; NTRS 20180006335 — https://ntrs.nasa.gov/citations/20180006335*
- **Salt water is not used:** electrolysing brine makes **chlorine** (toxic) at the positive electrode instead of oxygen: 2 Cl⁻ → Cl₂ + 2 e⁻. *Source: RSC — https://edu.rsc.org/experiments/electrolysis-of-brine/735.article*
- **Game simplifications (details left out):** a "zap" splits a molecule in the middle of the cell, with bolts from both electrodes; in a real cell the reactions happen at the electrode surfaces, with ions carrying the current. Two O atoms pairing into O₂ is shown; electron/ion steps are left out. Missed zaps cost a little extra power "lost as heat" (game balance amount; real electrolysers do lose energy as heat).

### Water
- The ISS recycles about **98%** of its water, including sweat and urine. *Source: NASA, 2023 ISS water recovery milestone (add URL)*
- Craters near the lunar south pole that never get sunlight (permanently shadowed regions) hold water ice. That's a main reason Artemis is going there. *Source: NASA LRO — https://science.nasa.gov/solar-system/moon/nasas-lro-lunar-ice-deposits-are-widespread/*

### Food and plants
- NASA's **Veggie** system grew lettuce and other plants on the ISS under LED lights, using growing "pillows". *Source: NASA Veggie (add URL)*
- Plants mainly use red and blue light for photosynthesis, which is why grow lights often look pink/purple. *Source: NASA Veggie VEG-04 (red:blue light study) — https://ntrs.nasa.gov/citations/20190033231*
- **Red romaine lettuce on the ISS:** grown in Veggie and eaten by the crew on 10 Aug 2015 — about 33 days from seed to salad. *Source: Scientific American, "Astronauts Take First Bites of Lettuce Grown in Space" (2015) — https://www.scientificamerican.com/article/astronauts-take-first-bites-of-lettuce-grown-in-space/*
- **Radishes on the ISS:** Plant Habitat-02 (PH-02) grew radishes in the Advanced Plant Habitat, harvested on 30 Nov 2020 after about 27 days; radishes were picked partly because they grow fast. *Source: NASA Kennedy blog, "Kennedy Harvests Radish Crop as Part of PH-02 Experiment" — https://blogs.nasa.gov/kennedy/2020/12/15/kennedy-harvests-radish-crop-as-part-of-ph-02-experiment*
- **Food energy of crops (raw, per 100 g):** potato (flesh and skin) **77 kcal** (FDC 170026), romaine lettuce **17 kcal** (FDC 169247), radish **16 kcal** (FDC 169276). Leafy greens and radishes are mostly water: few calories, but fresh vitamins; potatoes are full of starch. *Source: USDA FoodData Central (SR Legacy), read through the FDC API — https://fdc.nal.usda.gov/*
- Seeds are tiny and light, so flying seeds costs far less mass than flying the food they grow into. (Seed-packet mass in the game is game balance.)
- **Fast crop ≠ filling crop:** lettuce and radishes grow fast (≈ 27–33 days) but are mostly water, so they give little energy; potatoes take months but are full of starch (77 kcal / 100 g). In the game a lettuce head (0.6 kg) ≈ 100 kcal ≈ 3 % of a day's food; a game "potato" is a whole plant's crop ≈ 2 kg ≈ 1,530 kcal ≈ half a day. *Source: USDA FoodData Central (above); BVAD 12.778 MJ/day.*
- **Packaged space food:** ISS crews eat mostly packaged food from Earth; the game's "space meal" is a third of the BVAD daily food (0.27 kg dry). *Source: NASA BVAD (above).*
- Plants need light, water, warmth and nutrients, and they take time to grow. They also release some oxygen and take in CO₂.
- ESA's **MELiSSA** project researches life-support loops including spirulina (an algae). *Source: ESA MELiSSA (add URL)*
- CSA food production toolkit: https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/ (an index page; use its linked articles "Food in space: the challenges" and "Growing healthy food in space and in remote areas")

### Power and light at the south pole
- The Sun stays low on the horizon at the lunar south pole, so shadows are very long.
- Some high ridges near the south pole are lit most of the time, but darkness periods still happen. That's partly why Artemis targets this region.
- NASA is developing tall **vertical solar arrays** (VSAT project) that can follow the low Sun. *Source: NASA VSAT annual review, 2023 — https://ntrs.nasa.gov/api/citations/20230012849/downloads/GCD%20Annual%20Review%20VSAT%20September%202023%20Final.pdf*
- During dark periods, a base needs stored energy (batteries or regenerative fuel cells).

### Solar cells (used by the Solar Fix repair lesson: Cell Swap, Hot Spot Hunt, Wire Fix)
- **Photons free electrons:** sunlight is made of photons; only photons the cell absorbs make electricity; absorbed energy knocks electrons loose from the material's atoms. → This is the **photovoltaic effect**. *Source: U.S. EIA — https://www.eia.gov/energyexplained/solar/photovoltaics-and-electricity.php*
- **Like a battery:** the freed electrons collect on one side, making a voltage "similar to the negative and positive terminals of a battery"; when the cell is connected to an outside circuit, electricity flows. PV cells make **direct current (DC)**, which can charge batteries. *Source: U.S. EIA (same page)*
- **One-way gate:** the cell is processed to form a **diode**, which lets current flow in only one direction; metal contacts (the grid lines) carry the current out. Most cells are **silicon**. *Source: U.S. DOE, PV Cells 101 — https://www.energy.gov/eere/solar/articles/pv-cells-101-primer-solar-photovoltaic-cell*
- **Chains of cells:** cells are connected **in series** in a module to raise the voltage; "shading one cell causes the current in the string of cells to fall to the level of the shaded cell". Real modules add **bypass diodes** to isolate a bad cell. *Source: PVEducation (Honsberg & Bowden), Shading — https://www.pveducation.org/pvcdrom/modules-and-arrays/shading*
- **Game simplifications (details left out):** no p–n junction, band gap or bypass diodes on screen; a "cracked" cell in the lesson makes no electricity, so its whole row goes dark (in a real module a bypass diode would limit the loss to its group). The array's 5 rows with 3 dark match the game's damaged output (40 %, game balance). Micrometeorite damage to the array, how often it happens and how much power it costs are **game balance**; the real basis is only that micrometeoroids strike the Moon.

- **Hot spots (Hot Spot Hunt):** a cracked cell in a series chain can't pass the chain's current; the other cells push current into it and the energy turns into heat, making a **hot spot**. Hot spots show up in **infrared (thermal) images**; engineers survey solar farms with aerial infrared thermography. Many cell cracks are too small to see by eye (they are confirmed with other imaging, e.g. electroluminescence). *Sources: NREL (2024), aerial IR thermography of PV — https://nrel.gov/docs/fy24osti/90316.pdf ; IEA PVPS Task 13 (2014), Review of Failures of PV Modules — https://iea-pvps.org/wp-content/uploads/2020/01/IEA-PVPS_T13-01_2014_Review_of_Failures_of_Photovoltaic_Modules_Final.pdf*
- **Circuits (Wire Fix):** current flows only round a **closed loop**; a break anywhere stops it. The game shows the return wire from the battery back to the cells so the loop is visibly complete. *Source: U.S. DOE, PV Cells 101 (above) — cells connected to an external circuit*
- **Hot Spot Hunt simplification:** the heat-camera colours are a made-up false-colour scale (no temperatures shown). Real IR surveys also see other causes of hot spots (shading, soldering faults); the game only has cracks.

### Micrometeoroids and air leaks (habitat leak + Leak Fix lesson)
- **One scheduler, never both at once:** a micrometeoroid hit cracks the solar array OR holes the habitat (`MICROMETEOROIDS.HABITAT_SHARE` 40 %), and no new hit comes while either is broken. How often hits come (one per 3 game days on average), which target, and the grace period are **game balance**; the real basis is only that micrometeoroids strike the Moon all the time.
- **Why air leaks:** the cabin air presses on every wall (about 101 kPa, sea-level pressure, as on the ISS); the vacuum outside presses back with nothing, so air is pushed out. Space doesn't "suck". → A small hole gives **choked flow**: the air leaves at the speed of sound and the flow depends only on the hole and the cabin air: ṁ = C<sub>d</sub>·A·P·√(γ/(R·T))·(2/(γ+1))^((γ+1)/(2(γ−1))). *Source: NASA Glenn, Mass Flow Choking — https://www.grc.nasa.gov/www/k-12/airplane/mflchk.html*
- **Game numbers:** hole diameter **0.7 mm** (game balance; the real 2018 Soyuz hole was 2 mm), C<sub>d</sub> 0.6 (typical sharp-edged hole: simplification), 293 K, γ 1.4, R 287.05 J/(kg·K) → **≈ 0.199 kg air/h**. Dry air is 23.2 % oxygen by mass → **≈ 0.046 kg O₂/h** extra, ≈ 1.24× resting breathing (0.0373 kg/h, BVAD) → the oxygen supply drains **≈ 2.2× faster** inside during a leak (close to the 2.3× of a spacewalk). Computed in `config/gameplay.js` (`LEAK`) and tested in `tests/micrometeoroids.test.js`.
- **The oxygen top-up:** the leak drains the *oxygen supply* because the base keeps the cabin air topped up from it; after the 2018 leak, controllers raised the station's atmosphere with oxygen from a Progress cargo ship. *Source: NASA ISS blog, 30 Aug 2018 — https://www.nasa.gov/blogs/spacestation/2018/08/30/international-space-station-status-3/* (Nitrogen top-up is left out: we have no nitrogen gauge.)
- **Finding a leak — ultrasound (Leak Hunt):** a tiny leak's hiss is mostly too high-pitched to hear; crews use handheld **ultrasonic leak detectors**. In the game the detector's bars follow the sound getting weaker with distance (∝ 1/d², shown on a log scale). *Sources: NASA ISS blog, 29 Sep 2020 — https://www.nasa.gov/blogs/spacestation/2020/09/29/crew-continues-troubleshooting-as-tests-isolate-small-leak/ ; NASA/TM-2008-215347 (listening for hissing, closing hatches, handheld ultrasonic detectors) — https://ntrs.nasa.gov/api/citations/20080041598/downloads/20080041598.pdf*
- **Finding a leak — hatches (Hatch Hunt):** closing hatches splits the station; only the part with the hole keeps losing pressure. In Aug 2020 the crew spent a weekend with hatches closed so controllers could watch each module's pressure. *Source: NASA ISS blog, 20 Aug 2020 — https://www.nasa.gov/blogs/spacestation/2020/08/20/crew-spending-weekend-in-stations-russian-segment/* Simplification: our pressure needles move in seconds (time sped up, the game says so); a real 0.7 mm hole drops the pressure of a big module only slowly, which is why real crews watched for hours.
- **Sealing it (Patch It):** 2018: Kapton tape slowed the leak (ESA, A. Gerst blog — https://blogs.esa.int/alexander-gerst/?p=1604); then epoxy on a gauze wipe plugged the 2 mm hole from inside, and controllers watched the pressure overnight ("cabin pressure is holding steady"). *Source: NASA ISS blog, 30 Aug 2018 (above)* → A patch on the INSIDE is pressed onto the wall by the cabin pressure (physics: the force is outward, toward the hole). Two-part epoxy hardens only once its two parts are mixed.
- **In the game you can't hear the leak:** no hiss sound plays in 3D on purpose (that's the ultrasound lesson); the alarm and the red beacon tell you there is a leak, not where it is.
- **Gentle failure:** an open leak keeps draining the oxygen supply; if it runs out, the usual gentle failure happens and the leak is still there to patch (the rack is next to where you wake up).

### Supply deliveries (supply terminal + cargo pad)
- **Light delay:** one way = distance ÷ speed of light = 384,400 km ÷ 299,792.458 km/s ≈ **1.28 s** (matches "about 1.3 seconds" in Communication below); round trip ≈ 2.56 s. Shown in real seconds, **not sped up**. *Sources: NASA Moon Fact Sheet (distance); speed of light exact by SI definition.*
- **Game simplifications:** Mission Control's review, packing time and the cargo flight time are **game balance** (the flight is shortened and the game says so); no real flight time is shown until a source is added. The crate lands on thrusters (no air, so no parachutes) and the dust it throws up flies in arcs and falls straight back (no air to make a cloud). The landing "sound" is the pad's radio beacon (sound can't travel through vacuum).

### Radiation and shielding
- The Moon has no thick atmosphere and no global magnetic field, so particles from the Sun and from deep space reach the surface.
- Solar flares can be followed by **solar particle events**, bursts of fast particles that are dangerous for astronauts.
- Shielding works with **mass**: water, regolith or plastic between the crew and space. Astronauts shelter in the most shielded spot during solar storms.
- The ISS is in low Earth orbit, inside Earth's magnetic field, which partly protects it. **RadLab ISS readings are not Moon values.**
- **Solar energetic particles (SEPs)** are almost all protons; "some reach Earth… in less than an hour". Only a small fraction of flares/CMEs produce hazardous particles. Shelter: Orion crews build a dense shelter from stowage bags; on the Moon regolith could be piled on shelters; "make use of whatever mass is available". *Source: NASA Science — https://science.nasa.gov/science-research/heliophysics/how-nasa-will-protect-astronauts-from-space-radiation-at-the-moon*
- **Light from a flare** takes about 8.3 minutes to reach Earth/Moon (1 AU ÷ speed of light ≈ 499 s; NASA Sun Fact Sheet distance).
- **Moon vs ISS dose** (not NASA): Chang'e 4 LND measured 1,369 µSv/day on the lunar surface (Jan–Feb 2019, no solar particle event) vs ISS 731 µSv/day in the same period → "about twice". *Source: Zhang et al., Science Advances 2020 — https://www.science.org/doi/10.1126/sciadv.aaz1334* (labelled as non-NASA in the game).
- **Artemis I shelter** (measured in Earth's radiation belts, no solar storm during the flight): the storm-shelter spot got much less dose than less-shielded spots. *Source: DLR — https://www.dlr.de/en/latest/news/2024/orion-spacecraft-radiation-protection-tested-initial-findings-from-artemis-i-moon-mission* (press reports say "four times" — not shown until checked in the Nature paper).

- **Why water (hydrogen):** materials with a lot of hydrogen are generally better radiation shields than materials with little hydrogen (NASA study; preliminary simulation data, so the game says "some of the best", not "the best"). *Source: NASA NTRS 20090020691 — https://ntrs.nasa.gov/citations/20090020691*
- **Why not metal:** fast particles hitting metal make new (secondary) particles; on the ISS, secondary neutrons from the aluminium shell walls are a main source of radiation inside. *Source: NASA TM-20230003044 — https://ntrs.nasa.gov/citations/20230003044*
- **Water Walls (NASA NIAC, Michael Flynn, NASA Ames):** a studied concept for habitat walls of water-filled forward-osmosis bags that give radiation shielding and also treat water and air. A concept, not flown hardware: the game says "NASA engineers have studied". *Source: https://www.nasa.gov/general/water-walls-highly-reliable-and-massively-redundant-life-support-architecture*
- **Water Walls panel:** the "particle test" window and the "out of every 100" bars use the game's own shielding factors (game balance), so what kids see matches their dose. The panel says the numbers are game-sized.

### Real space-weather data used (radiation storms)
- **DONKI** (via api.nasa.gov, archived by `scripts/fetch-space-weather.mjs` into `public/data/space-weather-*.json`): flare alerts (`notifications?type=FLR`; the plain `FLR` endpoint returned 404 in Nov 2026) and SEP events. DONKI calls these "Experimental Research Information… preliminary NASA research products", so the game says **"based on"** and **"Replay of real data from <month>"**; only Live mode says "Live".
- **May 2024 (Stormy Sun):** 4 particle storms after X2.2 (9 May), X3.9 (10 May), X5.8 (11 May) and M6.6 (13 May) flares; DONKI SEP records from GOES, SOHO, STEREO A and ACE.
- **December 2019 (Calm Sun):** no SEP events in DONKI.
- **RadLab CRaTER** (LRO, Moon orbit), absorbed dose rate in its detector, µGy/h (daily means): 6–8 May 2024 ≈ 5; 10 May ≈ 230; 11 May ≈ 1,080; 13 May ≈ 360; 14 May ≈ 1,530. Storm strength in the game = log of (storm-day mean ÷ quiet mean), so the *order and ratios* are real; the dose % per storm is game balance.
- **RadLab ISS** (low Earth orbit) Timepix sensors in JPM/Cupola: about 13–17 µGy/h in December 2019.

### Radiation game simplifications (details left out, nothing false)
- **Storm look and sound:** the particles are invisible, so there is no visible wave or cloud. The game shows camera **"snow"** (white speckles), as in real SOHO images when protons hit the detectors during proton storms, and a ticking dosimeter; both scale with the game's dose rate. The suit display and dosimeter are made-up devices; the snow effect is real. *Source: NASA SVS — https://svs.gsfc.nasa.gov/3159 ; SOHO — https://soho.nascom.nasa.gov/hotshots/2000_07_14*
- Dose is shown as **% of a per-storm safety limit** (NASA plans shielding against limits for big particle events); the **mission total only grows** (dose adds up, it never "heals").
- Location/shelter/water-wall factors and the storm length are game balance. Real shelters would need **thousands of kg** of water; the game's water amounts are game-sized and the game says so.
- Short real warnings are stretched to at least 40 s of play so kids can react; the report card tells the real warning time.

### Ice in cold traps (ice mining)
- **Cold traps:** the Moon's axis is tilted only about 1.6°, so near the poles some deep crater floors never get sunlight. LRO's Diviner measured minimum brightness temperatures below about **35 K (−238 °C)** in parts of these craters; Cabeus averaged about 37 K. The game says "colder than −230 °C". *Source: NASA SVS — https://svs.gsfc.nasa.gov/4043*
- **How much water is in icy soil:** LCROSS (impact 9 Oct 2009, Cabeus crater) measured **5.6 ± 2.9 % water ice by mass** in the regolith. The game uses 5.6 % for every scoop (`ICE.ICE_MASS_FRACTION`) and says other places can have more or less. *Source: Colaprete et al., Science 2010 — https://www.science.org/doi/10.1126/science.1186986*
- **Ice is in many places:** LRO found signs of ice in many cold, shadowed places near both poles. *Source: https://science.nasa.gov/solar-system/moon/nasas-lro-lunar-ice-deposits-are-widespread/*
- **Getting the water out:** icy regolith is heated so the ice sublimates (turns to vapour); a cold surface (cold trap) catches the vapour again as ice/water. NASA-funded projects are testing this; heating times and power are not settled, so the oven's time and kWh are **game balance** and the panel says no real time is shown yet. *Sources: NASA ISRU overview — https://www.nasa.gov/overview-in-situ-resource-utilization/ ; NASA LuSTR thermal mining project — https://www.nasa.gov/directorates/stmd/space-tech-research-grants/advanced-thermal-mining-approach-for-extraction-transportation-and-condensation-of-lunar-ice/*
- **Finding ice by its hydrogen:** neutron spectrometers count neutrons coming off the surface; fewer fast neutrons means more hydrogen. Lunar Prospector found extra hydrogen near the poles in 1998. The drill game's scanner is made up but uses the same idea. *Source: NASA ISRU overview 2023 — https://ntrs.nasa.gov/citations/20230012260*
- **Carrying the bag:** Moon gravity is 1.62 m/s² (NASA Moon Fact Sheet), so 60 kg weighs like ~10 kg on Earth. Mass (and inertia) stays the same — the game only says it "feels like" / "weighs".
- **Game simplifications:** bag size, kg per chunk, drill round, rocks, mega lumps, streaks and the scanner charges are game balance. The cold trap's extra base power is the suit heaters and lamp being recharged by the base (game balance amount); we do **not** claim cold makes you breathe more oxygen.

### The starry sky from the lunar south pole (telescope)
- **Real stars:** the sky uses the **Yale Bright Star Catalog** (5th rev. ed., Hoffleit & Warren 1991) as hosted by NASA HEASARC (table bsc5p): stars with V ≤ 5.5 that can be seen from the lunar south pole (1,640 stars). Built by `scripts/fetch-stars.mjs` → `public/data/stars-bsc.json`. *Source: https://heasarc.gsfc.nasa.gov/W3Browse/star-catalog/bsc5p.html*
- **Geometry:** the Moon's spin axis is ~1.5° from the ecliptic pole (NASA Moon Fact Sheet: 6.68° to its orbit, orbit 5.145° to the ecliptic), so straight up at the south pole is (almost) the **south ecliptic pole**. Altitude ≈ −(ecliptic latitude): stars **never rise or set**, they circle at a fixed height; stars north of the ecliptic (Polaris, the Big Dipper) are never visible. Left out: the ~1.5° wobble. Conversion RA/Dec → ecliptic uses the J2000 obliquity 23.4393° (IAU).
- **Turning:** the sky turns once per **sidereal month (27.3 days)**; the Sun once per synodic month (29.5 days) because it creeps ~0.986° a day along the ecliptic. Both are sped up with the Sun loop (`SKY.GAME_SUN_LOOP_REAL_SECONDS`). Test: `tests/skyMath.test.js` checks the 27.32-day lap.
- **Direction (correction, v0.7.0):** the Moon spins the same way as Earth, so at the south pole the sky turns **counter-clockwise seen from above**. The Sun used to go round the wrong way; fixed in `daycycle.sunAzimuthDeg`.
- **Start date:** the Sun starts at ecliptic longitude 48° (≈ 8 May, the Stormy Sun replay date) — `SKY.SUN_ECLIPTIC_LON_START_DEG`.
- **Distances in the Star Album:** Hipparcos new reduction (van Leeuwen 2007) via NASA HEASARC (hipnewcat), light-years = 3261.56 ÷ parallax (mas), rounded: Acrux ~320, Gacrux ~89, Hadar ~390, Rigel ~860, Canopus ~310, Sirius 8.6. Alpha Centauri ~4.4 ly (NASA APOD — https://science.nasa.gov/image-article/apod-2025-january-1-alpha-centauri-the-closest-star-system/). Betelgeuse "roughly 500–700 ly — still being measured" (Hipparcos ~500 with a large error; NASA says ~700 — https://science.nasa.gov/universe/what-is-betelgeuse-inside-the-strange-volatile-star). LMC ~160,000 ly (Pietrzyński et al., Nature 2013: 49.97 kpc ≈ 163,000 ly).
- **Betelgeuse size:** "in place of our Sun it would swallow Mercury, Venus, Earth and Mars" — true for both NASA's figure (past Jupiter's orbit) and the smaller 2020 estimate (past Mars).
- **Crux** is the smallest of the 88 IAU constellations (~68 square degrees). *Source: IAU*
- **No twinkling on the Moon:** twinkling comes from Earth's moving air. *Source: NASA StarChild — https://starchild.gsfc.nasa.gov/docs/StarChild/questions/question26.html*
- **Star colours:** colour comes from B−V in the catalog; the dot tint uses the Ballesteros (2012) B−V → temperature approximation and a blackbody colour. No temperatures are shown as data.
- **Sun safety:** "Never look at the Sun through a telescope" — the scope's sun shutter closes within 25° of the Sun (game balance angle).
- **Game simplifications:** zoom levels, lock-on time, round time and the hint arrow are game balance; the telescope view uses a flat (gnomonic) map projection.

### Live sky: the real sky right now (Live mode)
- **What:** with "Live" picked on the start screen, the Sun, Earth (with its real phase) and the stars are placed for the real date and time over the Moon's south pole (90°S), moving at real speed. Space weather is live DONKI (as before).
- **How (`src/systems/ephemeris.js`):**
  - Moon orientation: IAU WGCCRE model as published by NASA JPL NAIF, `pck00011.tpc` (BODY301_POLE_RA/DEC/PM + NUT_PREC terms E1–E13). *Source: https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/pck00011.tpc*
  - Sun: US Naval Observatory "approximate solar coordinates" (~1′). *Source: https://aa.usno.navy.mil/faq/sun_approx*
  - Moon's orbit (where Earth is): Astronomical Almanac low-precision formulae (~0.3°).
  - Topocentric: the observer stands on the surface (Moon radius 1,737.4 km, NASA Moon Fact Sheet).
  - Earth's phase from the Moon = (1 + cos(angle at Earth between Sun and Moon)) / 2.
- **Checked against NASA JPL Horizons** (DE441, observer at 0°E 90°S on the Moon) for 5 dates 2024–2027: Sun within 0.01°, Earth within ~0.15° (`tests/ephemeris.test.js`). *Source: https://ssd.jpl.nasa.gov/horizons/*
- **Real facts it shows:** the Sun stays within ~1.5° of the horizon (and can dip just below it); Earth bobs up and down by several degrees each month (libration) and is **below the horizon** for part of the time at the exact pole; full Earth when it is new Moon on Earth.
- **Simplifications:** UTC is used as TT (~70 s, invisible here); the game's base layout keeps Earth's mean direction at `SKY.EARTH_AZIMUTH_DEG` (a rotation of the whole sky, never a mirror); the Sun hides behind the real LOLA horizon (see "Real terrain").

### Real terrain: Shackleton crater rim (NASA LOLA)
- **Data:** NASA Lunar Reconnaissance Orbiter, LOLA laser altimeter gridded elevation maps of the south pole (PDS Geosciences Node, LOLA GDR polar): **LDEM_875S_5M** (5 m/px, near the base) and **LDEM_80S_80M** (80 m/px, out to ~300 km). Built by `scripts/fetch-lola.mjs` (HTTP range request for the 5 m rows; ~10 MB of the 1.8 GB file) → `src/data/lolaTerrain.js` (121 KB). *Source: https://pds-geosciences.wustl.edu/missions/lro/lola.htm*
- **Projection (PDS label):** polar stereographic, sphere 1,737.4 km, centre 90°S; x = (sample − offset)·scale, y = −(line − offset)·scale, lon = atan2(x, y). **Checked:** the Shackleton floor centre comes out at 89.66°S, 127.5°E (published ≈ 89.7°S, 129°E).
- **The south pole lies on Shackleton's rim.** But the exact pole sits on a ~10° slope and a hill ~200 m away blocks the low Sun: from the pole the Sun at 0.75° is visible from only ~37% of directions (80 m map).
- **Base site:** we scanned the 80 m map within 4 km of the pole for the most sunlit, flattest point — like landing-site studies do — and put the base on the ridge **~450 m from the pole (lon 225°)**, ground 1,334.9 m above the 1,737.4 km reference sphere, slope ~1°. From there (5 m map + 80 m map, Moon's curvature, eye 1.6 m) the Sun at 1.5° is visible from **82%** of directions (73% at 0.75°). Being 450 m from the pole changes the sky by ~0.015° (the Live sky is computed for 90°S).
- **Shackleton** is right next to the base: its floor lies ~4.2 km below the rim near the base (LOLA: floor −2,868 m vs base +1,335 m relative to the reference sphere). Its inside is permanently shadowed — in the game it looks like a dark gulf with the far rim lit.
- **Distant terrain** out to 45 km (80 m map) and the far skyline beyond (horizon angles out to 290 km) are drawn with their true directions and elevation angles; they are moved closer to the camera so they fit in the 3D view (you can only walk ~240 m, so parallax is invisible).
- **Game additions on the real terrain:** the levelled base pad (a real base would grade a pad), the small cold-trap crater for ice mining, the telescope mound, tiny craters < 6 m and bumps smaller than the 5 m map can show.
- **Earth stays in view in game mode:** the real horizon toward Earth (lon 0) is ~0.9° high; game Earth sits at 4°.

### Footsteps and the suit (sound)
- **No air, no sound through the air:** outside, footsteps can't be heard through the vacuum; the game plays a soft, low crunch you'd feel through your boots and suit (vibration travels through solids, like the airlock pump "through your boots"). Inside, steps are normal sounds in the cabin air. The suit breathing gets faster when you move outside: working in a spacesuit uses ≈ 2× more oxygen (BVAD).

### Airlock and sound (v0.10.0)
- **Sound needs air:** sound waves are compression waves and need molecules to travel; there is no sound in a vacuum. *Source: NASA Astrobiology, Ask an Astrobiologist — https://webarchive.library.unt.edu/eot2008/20080920072225/http://astrobiology.nasa.gov/ask-an-astrobiologist/question/?id=78*
- In the game the airlock hiss gets quieter and duller as the pressure drops (thin air carries less sound, high notes first); outside the world is silent and you only hear your suit (breathing + fan). The pump motor stays faintly audible "through your boots": vibrations travel through solids.
- **Airlocks lose a little air each cycle:** pumps move most of the air back, the rest is lost; NASA studies ways to reduce these losses. *Source: NASA NTRS 20080013418 "Minimizing EVA Airlock Time and Depress Gas Losses" — https://ntrs.nasa.gov/citations/20080013418*. A US ISS airlock loses about 1 lb (≈ 0.45 kg) of air per cycle (University of Maryland ENAE 697 spacecraft design lecture — https://spacecraft.ssl.umd.edu/academics/697S23/697S23L22.airlocksx.pdf; academic, not NASA). Sources disagree on details, so the game only says "most of the air is pumped back, a little is lost each time".
- **Game simplifications:** the cycle takes ~5.6 real seconds (real ones take much longer); pressure is shown as % of module air; the loss is 0.03 kg of oxygen (1 % of the supply) and 15 base minutes per cycle — all game balance.

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

### Robots and moving on the Moon (used by Volt, the helper robot)
- **Volt is fictional** (a made-up helper), inspired by real robot helpers. The game says so in the Databank.
- **Astrobee:** NASA's free-flying robots inside the ISS move with electric fans (impellers) and only work inside the station. *Source: NTRS 20190002711 — https://ntrs.nasa.gov/citations/20190002711*
- **Fans need air:** a fan or propeller pushes against air; the Moon has almost no air (surface pressure ~3 × 10⁻¹⁵ bar, NASA Moon Fact Sheet), so Volt rolls on wheels everywhere, like real Moon rovers. *Source (rover wheels): NASA Glenn TM on the Apollo Lunar Roving Vehicle wire-mesh wheels — https://ntrs.nasa.gov/citations/20100000019*
- **Gravity is the same inside the base** (about 1/6 g): it comes from the Moon's mass; walls and air don't change it. *Source: NASA Moon Fact Sheet*

### Communication
- A signal takes about **1.3 seconds** to travel one way between the Moon and Earth.
- Between Mars and Earth it takes from about 3 to about 22 minutes one way, depending on the planets' positions.
- At the south pole, Earth is low on the horizon, so terrain can block the signal. NASA and ESA are planning lunar relay satellites.

### Real data events used
- **Stormy Sun:** May 2024. A period of very strong solar activity, including X-class flares on 14 May 2024 (confirm in the DONKI archive JSON before shipping).
- **Calm Sun:** late 2019, around solar minimum (December 2019).

## Game balance (how the numbers fit together) — the 4-day mission (Nov 2026)

These are **game-design** calculations, not facts to show kids. The real numbers come from the
sections above; the sizes (gauge capacity, battery, tank, loads, storm length) are marked
`GAME BALANCE` in `gameplay.js`. Run `npm run balance` to print it all again;
`tests/balance.test.js` fails if a change breaks the targets.

**The day structure (owner's design: "survive the day", FNAF-style).** The mission is **4 days**.
Each day is a **12-hour work shift (07:00 → 19:00)** that lasts **6 real minutes** (the clock runs
**120×** real life: 1 game hour = 30 real s). Survive to 19:00 → congratulations card → the night is
skipped → "Day N" → you wake up in your bunk in the sleeping nook.
- **Overnight refill = a game rule, said so on the card:** oxygen, battery and the water tank go
  back to full. A real base would have to make them (the card says how much water the oxygen would
  really need). **Hunger carries over**, and so does everything you carry and grow.
- **Nights still happen on the base clock:** the Sun keeps moving, the Ice Oven keeps baking, and a
  real storm that came at night is dosed as if you were in the shelter (you sleep in the nook,
  which IS the storm shelter). Plants grow one step per night, but only if the grow lights were on
  for at least half of the day (`LIGHT_SHARE_TO_GROW`).
- **Storms by calendar day:** game Day 1 = the replay's first date at 07:00 UTC, Day 2 the next
  date… so the Stormy May 2024 storms land on Day 2 (9 May, ~14:00), Day 3 (10 May, ~13:00) and the
  night before Day 4 (11 May, 02:10). The day title shows the replay date.
- **Day 1 = the Training Day:** it starts with oxygen and food at **60 %** (`DAYS.DAY1_START`) because
  Volt's tour has you make oxygen and eat breakfast; while the tour runs the base clock is 7× slower
  (`TRAINING.PACE` 0.15: oxygen ≈ −3 %/min inside, −7 %/min outside), and the 6-minute countdown
  starts when the tour ends. Normal speed: oxygen −21 %/min inside, −49 %/min outside (a full supply
  lasts 4.7 / 2 min), food −50 % per resting day (−100 % fully outside), power −25 %/min in the dark
  with the grow lights on, +20 %/min in full sun.
- **Gentle failure = a rescue:** a 1-hour rest (short on purpose: with a countdown, a long rest
  would HELP), partial refill, and the rescue is counted. Day stars: 3 with no rescue, 2 with one,
  1 otherwise.

**Sizes (game balance):** oxygen supply **0.35 kg** (resting inside it lasts ≈ 9.4 game h = 4.7 real
min, so you must make oxygen every day); Electrolysis batches 0.1 / 0.2 / 0.3 kg; water tank 3 kg;
battery **40 kWh** (a whole dark shift with the grow lights ON needs 5 kW × 12 h = 60 kWh →
blackout; OFF 36 kWh fits — the grow-lights choice); food gauge = **1 day of BVAD food (0.8 kg dry,
≈ 3,050 kcal)**, so a resting shift uses half of it. Storms: 2–3 h warning, 2 h long, same dose per
storm as before (2 h × 175 % = the old 5 h × 70 %). Micrometeoroid hits ≈ 2–3 per mission.
Supply deliveries keep their old real waiting times (game hours ÷ 3).

**Food items:**

| Item | Gauge | Why (honest) |
|---|---|---|
| Potato (a plant's crop) | **50 %** (owner's design) | 0.4 kg dry ≈ 1,530 kcal ≈ 2 kg of raw potatoes (USDA 77 kcal / 100 g): a whole plant's harvest, not one potato |
| Packaged space meal (3 at the start) | 33 % | a third of a day's BVAD food |
| Lettuce head (0.6 kg) | 3.3 % | romaine is 17 kcal / 100 g: mostly water. The owner asked for 25 %; that would need ≈ 2 kg of lettuce, so it stays honest |
| Radish handful (0.1 kg, 3 per pot) | 0.5 % each | 16 kcal / 100 g |

Potato: planted on day N, ready on day N + 2 (cut twice: one back into the soil, one to eat).
Lettuce and radish: ready the next morning. F eats fresh greens first, then the potato or meal that
fits your hunger best without wasting any.

**Targets, checked by three bots over 200 runs each** (`src/systems/balanceSim.js`):

| Bot | What it does | Target | Result (Nov 2026) |
|---|---|---|---|
| idle | nothing | first rescue during Day 1, not before 1.5 min | first rescue on Day 1 in every run (earliest 1:48) |
| sloppy | reacts at 25 %, 3 pots (potato, lettuce, radish), 40 % outside, grow lights always on | Days 1–2 without a rescue in ≥ 90 % of runs; ≤ 3 rescues in the mission | 196 / 200 clean Days 1–2; max 2 rescues (Day 3 is dark: lights on → blackout → no oxygen) |
| skilled | makes O₂ at 60 %, 3 potato + 1 lettuce pot, lights off in the dark, mines ice, 2 kg in the walls, spare repair kit | no rescue at all; food never below 15 % | 0 / 200 rescued; food ≥ 22 %, ends O₂ ≥ 76 %, no blackout |

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
- **Real horizon (v0.9.0).** Dark periods come from the real terrain around the base (NASA LOLA): the low Sun hides behind real ridges and mountains. In game mode the Sun is kept at 1.5° (the top of its real ±1.5° range); in Live mode it has its real height.
- **Shadows are near-black** outside (no atmosphere), lit only by faint earthshine — whose strength follows Earth's phase — and the regolith around you. A **helmet lamp** lights the way in shadow (real spacesuit helmets carry lights; we don't state a brightness).
- **Earthshine strength** is scaled by Earth's lit fraction as seen from the Moon: (1 − cos(angle between Sun and Earth)) / 2 — geometry, not a measured brightness.
- **Earth fixed in the sky.** Libration (small wobbles) is left out.

## Needs verification (do not show until resolved)
- **Potato:** a real growth time (seed potato to harvest) and a typical crop per plant in controlled-environment agriculture, from a NASA/USDA source, before the game shows either. (The game potato = 2 kg is only an energy equivalent.)
- [x] ~~BVAD per-person oxygen and food values~~ → done, see "Life support numbers" above. (Water values are copied too, for the future water gauge.)
- A **published** sunlit-time percentage for our base site (LRO/LOLA illumination studies, e.g. Mazarico et al. 2011). The game only shows what we computed ourselves from the LOLA horizon: "the Sun at 1.5° is visible from 82% of directions".
- Real spacesuit oxygen duration (xEMU / EMU) if we ever show suit-tank time.
- BVAD exercise oxygen rates (Tables 3-23 / 3-25) if "sprinting drains oxygen faster" is added.
- A Moon surface vs ISS dose comparison from a NASA source (for example Artemis I or LRO CRaTER results).
- Real growth time for potato in controlled-environment agriculture (lettuce ≈ 33 days and radish ≈ 27 days are sourced above).
- Exact source URLs for every "(add URL)" above.
- Real efficiency of the ISS OGA (kWh per kg O₂ actually used), if we ever show more than the physics minimum.
- The "4× more protection" Artemis I shelter figure (check the Nature 2024 paper, Stuart George et al.) before showing a number.
- RadLab `absorbed_dose_rate` unit (µGy/h per the RadLab API notes) — confirm on the RadLab data-API page when it is back online.

## Corrections log (mistakes we caught; don't repeat them)
- ❌ "Dust storms on the Moon" → ✅ dust blasted by landers and rovers.
- ❌ A powered energy "shield" → ✅ mass shielding (water walls, regolith).
- ❌ "A 14-day night at the south pole" → ✅ shorter, irregular dark periods on the high ridges.
- ❌ "Hydrogen is just stored as fuel" → ✅ on the ISS it goes to the Sabatier system (fuel cells are a separate, valid lunar-base idea).
