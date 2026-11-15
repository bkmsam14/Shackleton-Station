# Credits — Shackleton Station

## Textures (CC0 — public domain)

All textures are CC0 1.0 (no attribution required, credited here with thanks).
They were downscaled to 1024 px or less and re-encoded as WebP for the browser.
Some colour maps were converted to neutral grey so the game can tint them.

| Used for | Asset | Source | License |
|---|---|---|---|
| Habitat wall panels, hull detail | MetalPlates006 | ambientCG — https://ambientcg.com/view?id=MetalPlates006 | CC0 1.0 |
| Floor grating (habitat + greenhouse) | MetalWalkway014 (colour made grey, holes darkened) | ambientCG — https://ambientcg.com/view?id=MetalWalkway014 | CC0 1.0 |
| Metal trim, racks, doors | Metal032 | ambientCG — https://ambientcg.com/view?id=Metal032 | CC0 1.0 |
| Lunar regolith (terrain, rocks) | Moon 01 | Poly Haven — https://polyhaven.com/a/moon_01 | CC0 1.0 |

## Fonts

- Fredoka and Nunito — SIL Open Font License 1.1, via Fontsource (self-hosted).

## Data

See the in-game pause menu and `docs/SCIENCE.md` for every NASA data source
(BVAD life-support values, NASA fact sheets, VSAT, Veggie).

## Code libraries

- three.js (MIT), postprocessing by pmndrs (Zlib), n8ao (CC0 / MIT), Vite (MIT).
- Volt's voice: **meSpeak** by Norbert Landsteiner (npm package by Mikola Lysenko), based on
  speak.js by Alon Zakai and the **eSpeak** speech synthesizer by Jonathan Duddington —
  GNU **GPL-3.0**. https://www.masswerk.at/mespeak/ · https://github.com/espeak-ng/espeak-ng
  Because this GPL code ships inside the game, the game itself must be shared under the GPL-3.0
  (or a compatible licence) when it is published.

## Real terrain
- Elevation of the lunar south pole: NASA Lunar Reconnaissance Orbiter, LOLA (Lunar Orbiter Laser Altimeter) gridded data LDEM_875S_5M and LDEM_80S_80M, PDS Geosciences Node, Washington University in St. Louis — https://pds-geosciences.wustl.edu/missions/lro/lola.htm (public domain, NASA).

## Real sky
- Stars: Yale Bright Star Catalog (5th rev. ed.) and Hipparcos (new reduction), via NASA HEASARC.
- Moon orientation: IAU WGCCRE model, NASA JPL NAIF pck00011.tpc. Checked against NASA JPL Horizons.
