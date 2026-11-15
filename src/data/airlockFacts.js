// airlockFacts.js — what Volt can explain while the airlock cycles (one card at a time:
// a looping picture + two short lines). Each one is shown at most once per mission.
// dir: 'out' (going outside), 'in' (coming home) or 'any'. art: a key in ui/airlockFactCard.js.
// Every fact mirrors docs/SCIENCE.md ("Airlock facts") and public/data/facts.json.
export const AIRLOCK_SOURCES = {
  quest: { label: 'NASA — Quest Airlock (ISS)', url: 'https://www.nasa.gov/international-space-station/quest-airlock/' },
  pressure: { label: 'NASA Glenn — Gas Pressure', url: 'https://www.grc.nasa.gov/www/k-12/airplane/pressure.html' },
  depressGas: { label: 'NASA NTRS 20080013418 — Minimizing EVA Airlock Time and Depress Gas Losses', url: 'https://ntrs.nasa.gov/citations/20080013418' },
  prebreathe: { label: 'NASA-STD-3001 Technical Brief — Decompression Sickness', url: 'https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-037-decompression-sickness.pdf' },
  suitPressure: { label: 'NASA — Modeling a 15-min EVA prebreathe protocol (suit at 29.7 kPa / 4.3 psi)', url: 'https://www.nasa.gov/wp-content/uploads/2023/03/abercromby-8.2-34-atm-2015.pdf' },
  visor: { label: 'NASA — What Is a Spacesuit?', url: 'https://www.nasa.gov/humans-in-space/what-is-a-spacesuit/' },
  moondust: { label: 'NASA Ames — Interesting Fact of the Month 2021 (the smell of moondust)', url: 'https://www.nasa.gov/space-science-and-astrobiology-at-ames/interesting-fact-of-the-month-current/interesting-fact-of-the-month-2021/' },
  dust: { label: 'NASA Human Research Program — Risk of Adverse Health Effects from Lunar Dust', url: 'https://humanresearchroadmap.nasa.gov/evidence/reports/lunar%20dust.pdf' },
};

export const AIRLOCK_FACTS = [
  {
    id: 'two-doors',
    dir: 'any',
    title: 'Why two doors?',
    art: 'twoDoors',
    lines: ['An airlock is a small room with two doors.', 'Only one opens at a time, so the base’s air never rushes out into space.'],
    source: AIRLOCK_SOURCES.quest,
  },
  {
    id: 'depress',
    dir: 'out',
    title: 'Depressurizing',
    art: 'depress',
    lines: [
      'The pumps take the air out of this little room: that’s called <b>depressurizing</b>.',
      'Air pushes hard on the hatch: on a door 1 metre square, as hard as 150 grown-ups pushing! It only opens once the air is gone.',
    ],
    source: AIRLOCK_SOURCES.pressure,
  },
  {
    id: 'save-air',
    dir: 'out',
    title: 'Saving the air',
    art: 'saveAir',
    lines: ['First, the pumps push most of the air back into the base. Air is precious up here!', 'Only the last little bit is let out into space.'],
    source: AIRLOCK_SOURCES.depressGas,
  },
  {
    id: 'prebreathe',
    dir: 'out',
    title: 'Breathing pure oxygen',
    art: 'prebreathe',
    lines: [
      'A real spacesuit is filled with pure oxygen at less than a third of the base’s air pressure, so it can bend.',
      'Before a spacewalk, astronauts breathe pure oxygen to wash <b>nitrogen</b> out of their blood, so no bubbles form.',
    ],
    source: AIRLOCK_SOURCES.prebreathe,
  },
  {
    id: 'visor',
    dir: 'out',
    title: 'A golden visor',
    art: 'visor',
    lines: ['Your helmet’s sun visor has a very thin layer of real gold.', 'It works like super sunglasses against the Sun’s harsh rays.'],
    source: AIRLOCK_SOURCES.visor,
  },
  {
    id: 'repress',
    dir: 'in',
    title: 'Repressurizing',
    art: 'repress',
    lines: ['Now air flows back in: that’s called <b>repressurizing</b>.', 'When the air in here matches the base, the inner hatch can open.'],
    source: AIRLOCK_SOURCES.quest,
  },
  {
    id: 'dust',
    dir: 'in',
    title: 'Sticky Moon dust',
    art: 'dust',
    lines: [
      'Moon dust is sharp, like tiny bits of glass, and it sticks to everything.',
      'Apollo astronauts said it smelled like burnt gunpowder! Crews try to brush it off before going inside.',
    ],
    source: AIRLOCK_SOURCES.moondust,
  },
];
