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
  pvFailures: {
    label: 'IEA PVPS Task 13 (2014) — Review of Failures of Photovoltaic Modules (cell cracks, thermography)',
    url: 'https://iea-pvps.org/wp-content/uploads/2020/01/IEA-PVPS_T13-01_2014_Review_of_Failures_of_Photovoltaic_Modules_Final.pdf',
  },
  nrelIR: {
    label: 'NREL (2024) — Aerial infrared thermography of PV arrays',
    url: 'https://nrel.gov/docs/fy24osti/90316.pdf',
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
  jobTitle: 'Array hit!',
  job: 'A micrometeorite cracked some cells. Let’s fix the array!',
  lesson: 'How do solar cells work?',

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

// The quick question matches the game just played (rotates by repair number).
export const QUIZ = {
  cells: [
    {
      q: 'Why did a whole row go dark when only one cell cracked?',
      options: ['The cells are joined in a chain', 'The Sun went out', 'The wires got cold', 'Rows take turns'],
      answer: 0,
      hint: 'Think about how the cells in a row were connected.',
      explain: 'Cells in a chain carry the same current, so a cell that makes no electricity holds back the whole chain.',
      source: SOURCES.pvShading,
    },
    {
      q: 'What knocks electrons loose in a solar cell?',
      options: ['Light (photons)', 'Wind', 'Moon dust', 'Sound'],
      answer: 0,
      hint: 'What comes from the Sun?',
      explain: 'Photons from sunlight give electrons in the silicon enough energy to break free.',
      source: SOURCES.eia,
    },
  ],
  hotspot: [
    {
      q: 'What does a heat (infrared) camera see?',
      options: ['How warm things are', 'Sounds', 'Wind', 'Electricity'],
      answer: 0,
      hint: 'What made the cracked cells glow orange?',
      explain: 'Warm things give off infrared light, which our eyes can’t see. An infrared camera turns it into colours, so hot cells stand out.',
      source: SOURCES.nrelIR,
    },
    {
      q: 'Why does a cracked cell get hot?',
      options: ['Its blocked energy turns into heat', 'Cracks catch fire', 'It is closer to the Sun', 'Moon dust warms it'],
      answer: 0,
      hint: 'Where does the energy go if it can’t flow on?',
      explain: 'The crack blocks the electricity. The energy the chain pushes into that cell turns into heat instead: a hot spot.',
      source: SOURCES.pvFailures,
    },
  ],
  wires: [
    {
      q: 'Why did the battery only charge when every piece joined up?',
      options: ['Electricity needs a complete loop', 'The battery was asleep', 'Wires need sunlight', 'Electricity jumps gaps'],
      answer: 0,
      hint: 'What happened at the first piece turned the wrong way?',
      explain: 'Electricity only flows round a complete loop: a circuit. One gap anywhere stops the flow.',
      source: SOURCES.doe,
    },
    {
      q: 'Which way does the electricity from a solar cell flow?',
      options: ['One way only (DC)', 'Back and forth', 'Nowhere, it stays in the cell', 'Up into space'],
      answer: 0,
      hint: 'Remember the path from the cells to the battery.',
      explain: 'A solar cell makes direct current (DC): the electrons flow one way round the circuit, which can charge a battery.',
      source: SOURCES.eia,
    },
  ],
};

// First-time "How to play" cards: pictures first, a few words each (tutorialArt.js).
export const TUTORIALS = {
  cells: {
    title: 'Cell Swap',
    panels: [
      { art: 'cellsDark', caption: '1 crack = dark row', say: 'One cracked cell makes its whole row go dark.' },
      { art: 'cellsDrag', caption: 'Drag a new cell on', say: 'Drag a new cell from the kit onto the cracked one.' },
      { art: 'cellsFlow', caption: 'The row flows again', say: 'The row lights up and flows again.' },
    ],
  },
  hotspot: {
    title: 'Hot Spot Hunt',
    panels: [
      { art: 'hotSame', caption: 'Cracks hide!', say: 'The cracks are too small to see.' },
      { art: 'hotCamera', caption: 'Heat camera ON', say: 'Switch on the heat camera.' },
      { art: 'hotTap', caption: 'Tap the hot cells', say: 'Tap the bright hot cells to swap them.' },
    ],
  },
  wires: {
    title: 'Wire Fix',
    panels: [
      { art: 'wireGap', caption: 'A gap stops the flow', say: 'The electricity stops at a gap.' },
      { art: 'wireTurn', caption: 'Tap to turn', say: 'Tap a piece to turn it.' },
      { art: 'wireDone', caption: 'Close the loop', say: 'Join every piece so the loop is complete.' },
    ],
  },
};

// Volt teaches the IDEA in three short beats (same pattern as Electrolysis).
export const CONCEPT = {
  cells: 'Solar cells hold hands in chains. One broken cell stops its whole chain!',
  hotspot: 'A cracked cell gets hot. A heat camera can see what our eyes can’t!',
  wires: 'Electricity only flows round a loop with no gaps!',
};

export const TIPS = {
  cells: { row: 'The whole row lights up again!' },
  hotspot: {
    ir: 'Whoa! Now we see heat instead of light.',
    hot: 'Hot! The electricity was stuck there and turned into heat.',
    cool: 'All cool again: every cell is working.',
  },
  wires: {
    gap: 'See? The electricity stops right at the gap.',
    loop: 'A complete loop: that’s a circuit!',
  },
};

export const LEARN_SHOWS = 2;
export const LEARN = {
  cells: {
    art: 'learnCells',
    lines: ['One cracked cell stopped its whole chain.', 'New cells in: every chain flows again.'],
    real: 'Real solar panels join cells in chains too, so one bad cell can cost a lot of power.',
    source: SOURCES.pvShading,
  },
  hotspot: {
    art: 'learnHot',
    lines: ['The crack blocked the electricity, so the cell got hot.', 'Infrared (heat) light shows it, even when eyes can’t.'],
    real: 'Solar farm workers fly infrared cameras over panels to find hot spots.',
    source: SOURCES.nrelIR,
  },
  wires: {
    art: 'learnWires',
    lines: ['Electricity flows only round a complete loop: a <b>circuit</b>.', 'One gap anywhere and the flow stops.'],
    real: 'That’s why every cell, wire and battery on the base must be joined in a loop.',
    source: SOURCES.doe,
  },
};

export const DEEPER =
  'This is called the <b>photovoltaic effect</b>. Sunlight is made of photons. When the silicon absorbs one, an electron gets enough energy to move. The cell is built like a one-way gate (a diode), so the current comes out as direct current (DC), which charges the base battery.';
