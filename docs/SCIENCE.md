# SCIENCE.md — Shackleton Station

Rules (from CLAUDE.md): we simplify by **leaving details out**, never by saying something false.
Every number used in gameplay comes from a source listed here, or is marked
`// GAME BALANCE (not real data)` in `src/config/gameplay.js`.

---

## 1. Life support values — NASA BVAD (2022)

**Source:** Ewert, M. K., Chen, T. T., Powell, C. D. *Life Support Baseline Values and
Assumptions Document* (BVAD), NASA/TP-2015-218570/REV2, February 2022.
https://ntrs.nasa.gov/citations/20210024855
(PDF: https://ntrs.nasa.gov/api/citations/20210024855/downloads/BVAD_2.15.22-final.pdf)

"CM" = crewmember. "CM-d" = per crewmember per day. Page numbers are the numbers printed
at the bottom of the PDF pages.

### 1a. Nominal daily values (inside a habitat) — Table 3-31, p. 58 (explained on p. 59)

| Quantity | Value | Units | Where |
|---|---|---|---|
| Reference astronaut body mass | 82 | kg/CM | Table 3-31, p. 58 |
| **Oxygen consumed** | **0.895** (the text rounds it to 0.90) | kg/CM-d | Table 3-31, p. 58; footnote 77, p. 59 |
| Carbon dioxide produced | 1.085 | kg/CM-d | Table 3-31, p. 58 |
| **Food consumed, dry mass (no packaging)** | **0.800** | kg/CM-d | Table 3-31, p. 58; p. 59 |
| Food consumed, energy content | 12.778 | MJ/CM-d | Table 3-31, p. 58; p. 59 |
| Potable water | 3.217 | kg/CM-d | Table 3-31, p. 58; p. 59 |
| Respiratory quotient (nominal) | 0.86 | — | Table 3-31, p. 58; p. 59 |

Note (p. 59): the 0.8 kg/CM-d of dry food comes from 1.56 kg of food eaten at 48.7 % water
(1.56 × (1 − 0.487) ≈ 0.8). ISS food supply planning value is 2.39 kg/person/day **including
packaging**.

### 1b. Spacewalk (EVA) values — Table 4-70, p. 135

| Quantity | Value | Units | Where |
|---|---|---|---|
| **Oxygen consumption during EVA** | **0.086** | kg/CM-h | Table 4-70, p. 135 |
| Food energy consumption during EVA | 1.062 | MJ/CM-h | Table 4-70, p. 135 |
| Potable water during EVA (> 3 h sorties) | 0.240 | kg/CM-h | Table 4-70, p. 135 |
| Carbon dioxide production during EVA | 0.109 | kg/CM-h | Table 4-70, p. 135 |
| Human metabolic rate during EVA, lunar surface (nominal) | 352 | W/CM | Table 4-69, p. 135 |

### 1c. How the game uses these (relative rates)

- Inside: 0.895 kg/day ÷ 24 = **0.0373 kg/h** of oxygen.
- Outside (EVA): **0.086 kg/h**.
- **Ratio outside : inside = 0.086 ÷ 0.0373 ≈ 2.31.**
  So the Oxygen gauge drains about **2.3× faster outside** than inside. *Why (kid version):*
  walking and working on the Moon in a heavy suit is hard work, and hard work makes you
  breathe more.
- Food: 0.800 kg dry food per day, all the time. (BVAD shows spacewalks burn about 2× the food
  energy per hour (1.062 vs 12.778 ÷ 24 = 0.532 MJ/h). Demo 0 **leaves this detail out** and
  drains food at one steady rate.)
- **Scaled time:** 1 in-game day ≈ 4 real minutes (240 s), i.e. **360× real time**.
- The *size* of a full gauge (how much oxygen a suit tank holds, how many days of food are in
  the pantry) is a **game balance** choice, marked as such in `gameplay.js`.

---

## 2. The Moon and the south pole

| Fact used in game | Value | Source | Status |
|---|---|---|---|
| Moon surface gravity | 1.62 m/s² (about 1/6 of Earth's 9.81 m/s²) | NASA Moon Fact Sheet, https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html | Verified |
| No atmosphere → black sky in daytime, no haze, hard shadows | — | NASA Moon Fact Sheet (surface pressure ~3×10⁻¹⁵ bar) | Verified |
| Synodic month (Sun returns to same place in the lunar sky) | 29.53 Earth days | NASA Moon Fact Sheet | Verified |
| At the poles the Sun stays close to the horizon and circles around the sky over a lunar month; this makes very long shadows | Sun elevation at the south pole is within about ±1.5° of the horizon | Derived from NASA Moon Fact Sheet: obliquity to orbit 6.68° minus orbit inclination to ecliptic 5.145° ≈ 1.54° tilt of the Moon's equator to the ecliptic (Cassini's laws) | Verified (geometry, derived) |
| Shackleton Crater is at the lunar south pole; its rim has places that are sunlit most of the time, its floor is in permanent shadow | — | NASA SVS / LRO, https://svs.gsfc.nasa.gov/ (search "Shackleton crater") | **Needs verification** (exact % sunlit) |
| Vertical, sun-tracking solar arrays are being developed for the lunar south pole because the Sun is so low | — | NASA VSAT annual review (2023), https://ntrs.nasa.gov/api/citations/20230012849/downloads/GCD%20Annual%20Review%20VSAT%20September%202023%20Final.pdf | Verified |
| Space greenhouses (NASA Veggie) light plants with red and blue LEDs; red:blue ratio is studied | — | VEG-04 (2019), https://ntrs.nasa.gov/citations/20190033231 | Verified |
| Electrolysis splits water into oxygen and hydrogen; ISS makes breathing oxygen this way | 2 H₂O → 2 H₂ + O₂ | ISS Oxygen Generation Assembly (NTRS), https://ntrs.nasa.gov/citations/20200002346 | Verified |
| Sun's angular diameter seen from the Moon | ~0.53° | Sun diameter 1.39 × 10⁶ km at ~1.496 × 10⁸ km (NASA Sun Fact Sheet, https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html) | Verified (derived) |

---

## 3. Simplifications we chose (details left out — nothing false)

1. **Sun speed.** The real Sun takes about **29.5 Earth days** to circle the sky at the south
   pole. In the game it circles once every ~20 real minutes so you can see the solar array
   turn and the battery charge and drain. The game says so on screen. This is a *second*
   speed-up on top of the 360× life-support clock (allowed by CLAUDE.md rule 3 — the real
   value is shown).
2. **Sun hidden by a ridge.** Polar sites lose sunlight when the low Sun goes behind distant
   hills and crater rims. The game uses one simple ridge on the horizon to show this.
   **Needs verification:** find a NASA/LRO source for polar illumination being interrupted by
   terrain, and the typical lit fraction near Shackleton.
3. **Earth in the sky.** Seen from the Moon, Earth stays in nearly the same place in the sky
   (the Moon always shows the same face to Earth). From the south pole Earth sits near the
   horizon, and small wobbles (libration) can move it above or below local hills. The game
   shows Earth fixed, small and low. Earth's real angular size from the Moon is about 2°
   (Earth diameter 12,742 km ÷ 384,400 km). Source: NASA Earth & Moon Fact Sheets.
4. **Earth's apparent size vs. Sun.** The Sun is ~0.5° across; Earth from the Moon ~1.9°.
   Our sky draws them at these relative sizes (scaled up slightly for readability on small
   screens — **marked game balance** in `gameplay.js`).

---

## 4. Needs verification (do not ship as facts until checked)

- [ ] Percentage of time the Shackleton rim is sunlit (LRO/LOLA illumination studies).
- [x] NASA source for VSAT (vertical solar arrays for lunar south pole) — see §2.
- [x] NASA source for Veggie / red + blue LED grow lights — see §2.
- [ ] Real suit oxygen duration (xEMU / EMU PLSS hours) — Demo 0 suit tank size is game balance.
- [ ] Polar illumination interrupted by terrain (source for the "ridge" simplification).

## 5. Sources reserved for later mini-games (not used in Demo 0)

- NASA Biological & Physical Sciences data hub (OSDR, PSI, Task Book, Space Life Sciences
  Library): https://science.nasa.gov/biological-physical/data/
- RadLab (radiation telemetry; ISS values are **low Earth orbit, not the Moon**):
  https://visualization.osdr.nasa.gov/radlab/gui/overview/
- DONKI space weather (flares, CMEs, SEPs; "science and prototyping quality" → say "based on"):
  https://ccmc.gsfc.nasa.gov/donki/
