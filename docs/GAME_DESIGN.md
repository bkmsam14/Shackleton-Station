# Game Design — Shackleton Station

## Core idea

A small 3D sandbox at the lunar south pole. You play one astronaut and manage a **solar array**, a **habitat** (which holds the **electrolysis unit**, the **water recycler** and the **storm shelter**) and a **greenhouse**. The gauges drain at the same time but at different speeds. To refill one, you go to the right station and enter an **instance** (a short interactive lesson). **Environmental risks** strike as quick-time events.

What the player should learn: **every refill costs another resource, so you have to plan.**

## Gauges

| Gauge | Scope | Drains | Drains faster when | Refilled at | Refill costs |
|---|---|---|---|---|---|
| Oxygen | **One shared supply** for habitat + greenhouse + suit (the suit stays topped up from it) | Fast | Outside in the suit; sprinting | Electrolysis unit | Water + Power |
| Water | Base supply | Slow | Making oxygen; watering plants | Ice crater (mining) + Water recycler | Power (recycler, melting ice); trip time outside (suit O₂) |
| Food | Astronaut | Slow | Working hard outside | Greenhouse harvest, supply lander, emergency rations | Power for the grow lights + time to grow |
| Power | Whole base | Depends on load | More machines running; dark periods (no solar input); dusty panels | Solar array (automatic in sunlight), solar instance (aim panels, clean dust) | Time; nothing comes in during dark periods |

- **Oxygen decision (Nov 2026):** one gauge for the base's whole oxygen supply. Being inside a module does not refill it; only making oxygen (the electrolysis instance) does. In Demo 0 nothing refills it except the gentle failure.
- Drain rates are in `src/config/gameplay.js`. **Relative** rates should follow NASA's real per-person consumption (oxygen, water, food per day, from the BVAD; see SCIENCE.md), sped up to game time.
- Gauges below 25% pulse and play a soft alarm. Show a small "why" note under a falling gauge (for example, "The greenhouse lights are using power").
- When a gauge reaches 0, the gentle failure rule applies: the astronaut is brought back to the habitat and time passes (in-game). There is no death screen.

## Locations (the minimum set)

1. **Habitat:** the inside space. Contains the electrolysis unit, the water recycler, the storm shelter (its walls are water tanks) and the comms console (after the alpha).
2. **Greenhouse:** grow racks with LED lighting (red and blue).
3. **Solar array:** a tall vertical array that rotates to follow the low Sun.
4. **Ice crater edge:** a permanently shadowed area where you mine ice. It's dark and cold, and the suit drains faster there.
5. **Landing pad:** where the supply lander touches down (it delivers food and seeds every few in-game days).

## Instances (Duolingo-style)

Every instance follows the same frame: **intro (1 line) → 3–5 hands-on steps → 1 quick question → result + "Go deeper" card**. The first visit takes 60–90 seconds. Mastery (bronze → silver → gold, saved locally) makes later visits faster; gold unlocks "Quick refill". The 3D world pauses while an instance is open (gauges stop draining).

### 1. Electrolysis (refills Oxygen) — alpha
1. Pour water into the cell (costs Water).
2. Connect power (costs Power). Show the two electrodes.
3. Watch the bubbles: the **hydrogen** side bubbles twice as much as the **oxygen** side. Ask the kid which side has more bubbles and why.
4. Send oxygen to the air tank.
5. Question: "What happens to the hydrogen?" Answer: on the ISS, the Sabatier system combines it with the CO₂ astronauts breathe out to make water again (and methane, which is vented).
- Go deeper: 2H₂O → 2H₂ + O₂

### 2. Greenhouse (refills Food) — alpha
- Harvest ripe plants (refills Food).
- Plant seeds: choose **lettuce** (fast, fewer calories) or **potato** (slow, more calories).
- Set the LED light level (more light means faster growth but costs more power).
- Water the plants (costs Water).
- Fact: the grow lights look pink because plants mainly use red and blue light.
- Show the real growth time next to the game time.

### 3. Solar array (Power) — alpha
- Rotate the panel to face the low south-pole Sun (output changes live as you turn it).
- Brush off regolith dust (it's sharp, sticky, and lowers output).
- See the battery charge and the forecast for the next dark period.

### 4. Ice mining (Water) — after the alpha
### 5. Comms dish (communication delay) — after the alpha
- Aim the dish at Earth, which sits low on the horizon at the south pole. Crater rims can block the signal; a relay satellite can help.
- Compare: a one-way signal takes about 1.3 s between the Moon and Earth, and up to about 20 minutes between Mars and Earth.
- A blocked dish means Mission Control's flare warning arrives late.

## Environmental risks (QTEs)

Each QTE: alert → a short, generous timer → one simple input (key or tap) → result → a "What just happened?" card with the real science.

| Event | Player action | Consequence if missed | Real basis |
|---|---|---|---|
| Solar flare / solar particle event (**alpha**) | Get to the storm shelter before the timer ends | Big Health/oxygen penalty (see config) | Real flare dates from DONKI archives; the Moon has no thick atmosphere or global magnetic field |
| Micrometeorite hits the habitat (**alpha**) | Find and patch the leak | Oxygen drains fast until it's patched | Tiny meteoroids hit the Moon constantly |
| Lander dust coats the panels | Go clean the panels | Lower power output | Rocket exhaust blasts regolith; there is no wind and no dust storms on the Moon |
| Moonquake | Secure the equipment | A piece of equipment is damaged | Apollo seismometers recorded moonquakes |
| Dark period starts | Choose which machines to turn off | Power runs out sooner | South-pole light comes and goes |

## Radiation shielding trade-off

Shielding is **mass**, not an energy shield. The storm shelter walls are water tanks. The player can move water into the walls for better protection (fewer flare penalties), but that water can't be drunk or used to make oxygen.

## Missions, goal and progression

- **Goal:** survive until the crew-swap ship arrives (10 in-game days in the alpha; about 3–4 real minutes per day).
- **Mission Control tasks** give the player a reason to explore: collect a rock sample, photograph Earth, place a seismometer. They earn science points.
- **Upgrades** (bought with science points): a bigger battery, a second panel, more greenhouse racks, an algae bioreactor (spirulina, as in ESA's MELiSSA project: a little food plus a little oxygen).
- **End screen:** stars for crew health, science and resources; a timeline of the player's key decisions; and a "Real science behind your mission" panel with data credits.

## Real NASA data in the game

- **DONKI** (via api.nasa.gov): flare events. Archived month JSON files for "Calm Sun (late 2019, solar minimum)" and "Stormy Sun (May 2024)"; a "Live: this week" mode fetches the last 7 days.
- **RadLab (OSDR):** ISS dose-rate readings for the radiation facts. These are low-Earth-orbit values, partly shielded by Earth's magnetic field. Do not present them as Moon values.
- **OSDR:** astronaut health findings (bone, muscle, sleep) for the facts cards.
- **Moon Trek (LRO data):** south-pole elevation for the terrain heightmap (after the alpha; the alpha uses procedural terrain).
- **CSA food production toolkit:** greenhouse content.
- Credits screen + a "Where does this come from?" button on every fact card.

## Alpha scope (build in this order)

- **M0 Scaffold:** Vite + Three.js, folder structure, GitHub Pages deploy, a blank scene.
- **M1 World:** procedural low-poly terrain, black sky + stars, a low Sun with long hard shadows, Earth near the horizon, placeholder habitat, greenhouse and solar array.
- **M2 Player:** pointer-lock first-person controls, WASD, 1/6 g jump, interaction prompt (E), inside/outside zones (habitat = breathable air).
- **M3 Survival:** gauges + HUD, suit vs habitat oxygen, day/dark cycle driving solar power, gentle failure.
- **M4 Instances:** InstanceManager + Electrolysis, then Greenhouse (growth timers), then Solar. Mastery saved.
- **M5 Events:** solar flare QTE with archived DONKI data + credit; micrometeorite leak QTE.
- **M6 Polish:** title screen, Calm/Stormy/Live Sun picker, sound (helmet breathing, habitat hum, alarms), gauge animations, credits screen, quality toggle.

Not in the alpha: ice mining, comms dish, supply lander, upgrades, touch controls, real terrain. Design the code so these slot in later.

## Look and feel

- Clean, consistent low-poly style. Black sky; gray regolith in several shades; warm sun orange (#FFB547), cyan (#4FD1E8) for UI and habitat lights, greenhouse green (#7BE0A0), alert orange-red (#FF7A59).
- Fonts: Fredoka for headings, Nunito for body text (Google Fonts).
- The HUD sits in the corners and stays readable on bright and dark backgrounds (use semi-opaque panels).
- Juice: gauges pulse when low, a small camera shake for moonquakes, a soft click on every interaction, smooth fades into and out of instances.
