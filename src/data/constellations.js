// constellations.js — the Star Hunt targets: which real stars, how to join them, and what to
// learn. Stars are Yale Bright Star Catalog HR numbers (public/data/stars-bsc.json).
//
// Distances: Hipparcos new reduction (van Leeuwen 2007) via NASA HEASARC (table hipnewcat),
// light-years = 3261.56 ÷ parallax in milliarcseconds, rounded — unless another source is named.
// Every target is really visible from the Moon's south pole (ecliptic latitude < 0) and never
// sets there (see systems/skyMath.js).

export const SOURCES = {
  bsc: { label: 'Yale Bright Star Catalog via NASA HEASARC', url: 'https://heasarc.gsfc.nasa.gov/W3Browse/star-catalog/bsc5p.html' },
  hip: { label: 'Hipparcos catalogue (new reduction) via NASA HEASARC', url: 'https://heasarc.gsfc.nasa.gov/W3Browse/all/hipnewcat.html' },
  alphaCen: { label: 'NASA APOD — Alpha Centauri: the closest star system', url: 'https://science.nasa.gov/image-article/apod-2025-january-1-alpha-centauri-the-closest-star-system/' },
  betelgeuse: { label: 'NASA — What is Betelgeuse?', url: 'https://science.nasa.gov/universe/what-is-betelgeuse-inside-the-strange-volatile-star' },
  lmc: { label: 'Pietrzyński et al., Nature 2013 — distance to the Large Magellanic Cloud', url: 'https://www.nature.com/articles/nature11878' },
  iau: { label: 'IAU — The constellations', url: 'https://www.iau.org/public/themes/constellations/' },
  twinkle: { label: 'NASA StarChild — Why do stars twinkle?', url: 'https://starchild.gsfc.nasa.gov/docs/StarChild/questions/question26.html' },
};

/**
 * paths: lists of HR numbers to tap in order (each list is one line; a new list starts a new
 * line). cloud: a fuzzy object instead of stars (tap it once).
 */
export const TARGETS = [
  {
    id: 'crux',
    name: 'Southern Cross',
    real: 'Crux',
    hint: 'Look for a small, bright cross. Two bright “Pointer” stars point right at it.',
    paths: [
      [4763, 4730], // Gacrux → Acrux (the long bar)
      [4853, 4656], // Mimosa → Delta Crucis (the short bar)
    ],
    labels: { 4730: 'Acrux', 4853: 'Mimosa', 4763: 'Gacrux' },
    card: [
      'The <b>smallest</b> of all 88 constellations — but one of the easiest to spot.',
      '<b>Acrux</b>, its brightest star, is <b>blue-white</b> and about <b>320 light-years</b> away.',
      '<b>Gacrux</b>, at the top, is a <b>red giant</b> only about <b>89 light-years</b> away — the cross’s stars are not all at the same distance!',
    ],
    sources: ['iau', 'hip'],
  },
  {
    id: 'pointers',
    name: 'Alpha & Beta Centauri',
    real: 'the Pointers (Centaurus)',
    hint: 'Two very bright stars side by side, near the Southern Cross.',
    paths: [[5459, 5267]],
    labels: { 5459: 'Alpha Centauri', 5267: 'Hadar' },
    card: [
      '<b>Alpha Centauri</b> is the <b>closest star system</b> to the Sun: about <b>4.4 light-years</b>. Light from it takes over 4 years to reach you!',
      '<b>Hadar</b> (Beta Centauri) looks right next to it, but it is about <b>390 light-years</b> away — almost 90 times farther.',
      'Together they point to the Southern Cross.',
    ],
    sources: ['alphaCen', 'hip'],
  },
  {
    id: 'orion',
    name: 'Orion',
    real: 'Orion, the hunter',
    hint: 'Find three stars in a short straight row: Orion’s belt. It sits low in the Moon’s sky.',
    paths: [
      [2061, 1790], // Betelgeuse → Bellatrix (shoulders)
      [1852, 1903, 1948], // Mintaka → Alnilam → Alnitak (belt)
      [1713, 2004], // Rigel → Saiph (feet)
    ],
    labels: { 2061: 'Betelgeuse', 1713: 'Rigel', 1903: 'Belt' },
    card: [
      '<b>Betelgeuse</b> is a <b>red supergiant</b>. In place of our Sun it would swallow Mercury, Venus, Earth and Mars! It is roughly <b>500–700 light-years</b> away — scientists are still measuring.',
      '<b>Rigel</b> is a hot <b>blue supergiant</b>, about <b>860 light-years</b> away.',
      'Colour tells temperature: <b>blue stars are hotter</b>, red stars are cooler.',
    ],
    sources: ['betelgeuse', 'hip'],
  },
  {
    id: 'canis-major',
    name: 'Canis Major',
    real: 'the Great Dog',
    hint: 'Start at the brightest star in the whole sky: Sirius.',
    paths: [
      [2294, 2491, 2693, 2618], // Mirzam → Sirius → Wezen → Adhara
      [2693, 2827], // Wezen → Aludra
    ],
    labels: { 2491: 'Sirius' },
    card: [
      '<b>Sirius</b> is the <b>brightest star</b> in the night sky.',
      'It is only about <b>8.6 light-years</b> away — one of our nearest neighbours.',
      'Sirius has a tiny partner star, a <b>white dwarf</b>, too faint to see without a big telescope.',
    ],
    sources: ['hip', 'bsc'],
  },
  {
    id: 'carina',
    name: 'Carina',
    real: 'the Keel (of a ship)',
    hint: 'Look high up for Canopus, the second-brightest star of the night.',
    paths: [[2326, 3307, 3699, 3685]], // Canopus → Avior → Aspidiske → Miaplacidus
    labels: { 2326: 'Canopus' },
    card: [
      '<b>Canopus</b> is the <b>second-brightest</b> star of the night sky, about <b>310 light-years</b> away.',
      'It shines so brightly from so far away because it is much bigger and brighter than our Sun.',
      'From the Moon’s south pole, Canopus is always <b>high in the sky</b> — it never sets.',
    ],
    sources: ['hip', 'bsc'],
  },
  {
    id: 'lmc',
    name: 'Large Magellanic Cloud',
    real: 'a small galaxy',
    hint: 'Look almost straight up for a soft, misty patch.',
    cloud: { ra: 80.894, dec: -69.756, radiusDeg: 4 }, // centre of the LMC (J2000)
    paths: [],
    card: [
      'This misty patch is not a cloud — it is a whole <b>galaxy</b> of billions of stars, a neighbour of our Milky Way.',
      'It is about <b>160,000 light-years</b> away. The light you see left it about 160,000 years ago!',
      'From the Moon’s south pole it is almost <b>straight overhead</b>.',
    ],
    sources: ['lmc'],
  },
];

/** "Sky from the Moon" lessons shown in the telescope (rotating). */
export const MOON_SKY_FACTS = [
  { text: 'Stars on the Moon <b>don’t twinkle</b>. Twinkling comes from Earth’s moving air — and the Moon has almost none.', source: 'twinkle' },
  { text: 'At the Moon’s south pole the stars <b>never rise or set</b>. They slowly circle around you, once every <b>27.3 days</b>.', source: 'bsc' },
  { text: 'You can <b>never</b> see the North Star (Polaris) or the Big Dipper from here — they are always below the horizon.', source: 'bsc' },
  { text: 'With no air to scatter sunlight, the Moon’s sky is <b>black even in daytime</b>. Just keep the Sun out of your view!', source: 'twinkle' },
];

export const allHr = (t) => [...new Set(t.paths.flat())];
