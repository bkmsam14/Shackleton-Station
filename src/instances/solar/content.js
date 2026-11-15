// content.js — every word the Solar Fix lesson shows, with sources.
// Facts mirror docs/SCIENCE.md ("Solar cells") and public/data/facts.json.
// Plain language for ages 7–12; real terms (photon, electron, circuit, DC) are explained once.
// Simplified by leaving details out (no p–n junction, band gaps or bypass diodes on screen).

export const SOURCES = {
  eia: {
    label: 'U.S. EIA — Photovoltaics and electricity',
    url: 'https://www.eia.gov/energyexplained/solar/photovoltaics-and-electricity.php',
  },
  doe: {
    label: 'U.S. Department of Energy — PV Cells 101',
    url: 'https://www.energy.gov/eere/solar/articles/pv-cells-101-primer-solar-photovoltaic-cell',
  },
  pvShading: {
    label: 'PVEducation (Honsberg & Bowden) — Shading',
    url: 'https://www.pveducation.org/pvcdrom/modules-and-arrays/shading',
  },
};

export const TEXT = {
  title: 'Solar Fix',
  introTitle: 'Sunlight → electricity',
  intro: [
    'A micrometeorite cracked some <b>solar cells</b> on the array. Let’s fix them!',
    'First, let’s see how a solar cell turns <b class="sf-sun">sunlight</b> into <b class="sf-elec">electricity</b>.',
  ],
  introGo: 'Let’s fix it!',

  lightTitle: 'Catch the light',
  light: 'Sunlight is made of tiny packets of energy called <b class="sf-sun">photons</b>. When a photon soaks into the silicon, it knocks an <b class="sf-elec">electron</b> loose.',
  lightDo: 'Tap the Sun to send photons into the cell.',
  lightDone: 'You freed 5 electrons! Now they need somewhere to go.',

  circuitTitle: 'Close the circuit',
  circuit:
    'The cell pushes the loose electrons to one side, like the two ends of a battery. Join the ends with a wire and the electrons flow round and round: that flow is <b class="sf-elec">electricity</b>!',
  circuitDo: 'Drag the loose wire end onto the cell’s connector (or click it, then the connector).',
  circuitDone: 'The base battery is charging! It only flows one way: <b>direct current (DC)</b>.',

  fixTitle: 'Swap the cracked cells',
  fix: 'Solar cells are joined in <b>chains</b>. A cell that makes no electricity holds back its whole chain, so one crack can darken a whole row!',
  fixDo: 'Drag a new cell from the repair kit onto each cracked cell (or click a new cell, then a cracked one).',
  fixDone: 'All chains are flowing again. Full power!',

  leave: 'Leave (array stays broken, kit kept)',
  back: 'Back to base',
  next: 'Next',
};

// Rotating end-of-lesson question — one per repair (repair number % length).
export const QUIZ = [
  {
    q: 'What knocks electrons loose in a solar cell?',
    options: ['Light (photons)', 'Wind', 'Moon dust', 'Sound'],
    answer: 0,
    hint: 'Look at what you sent from the Sun.',
    explain: 'Photons from sunlight give electrons in the silicon enough energy to break free.',
    source: SOURCES.eia,
  },
  {
    q: 'Why did a whole row go dark when only one cell cracked?',
    options: ['The cells are joined in a chain', 'The Sun went out', 'The wires got cold', 'Rows take turns'],
    answer: 0,
    hint: 'Think about how the cells in a row were connected.',
    explain: 'Cells in a chain carry the same current, so a cell that makes no electricity holds back the whole chain.',
    source: SOURCES.pvShading,
  },
  {
    q: 'Which way does the electricity from a solar cell flow?',
    options: ['One way only (DC)', 'Back and forth', 'Nowhere, it stays in the cell', 'Up into space'],
    answer: 0,
    hint: 'Remember the arrows going round the wire.',
    explain: 'A solar cell makes direct current (DC): the electrons flow one way round the circuit, which can charge a battery.',
    source: SOURCES.eia,
  },
];

export const DEEPER =
  'This is called the <b>photovoltaic effect</b>. Sunlight is made of photons. When the silicon absorbs one, an electron gets enough energy to move. The cell is built like a one-way gate (a diode), so the current comes out as direct current (DC), which charges the base battery.';
