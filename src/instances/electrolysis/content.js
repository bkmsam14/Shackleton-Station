// content.js — every word the Molecule Zapper shows, with sources.
// Facts mirror docs/SCIENCE.md ("Electrolysis") and public/data/facts.json.
// Plain language for ages 7–12; real terms (electrolysis, molecule, atom) are explained once.

export const SOURCES = {
  eclss: {
    label: 'NASA — Environmental Control and Life Support Systems (ECLSS)',
    url: 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/',
  },
  oga: {
    label: 'NASA — ISS Oxygen Generation Assembly (NTRS 20180006335)',
    url: 'https://ntrs.nasa.gov/citations/20180006335',
  },
  rscWater: {
    label: 'Royal Society of Chemistry — Electrolysis of water',
    url: 'https://edu.rsc.org/experiments/exploding-bubbles-of-hydrogen-and-oxygen/752.article',
  },
  rscBrine: {
    label: 'Royal Society of Chemistry — Electrolysis of brine (salt water)',
    url: 'https://edu.rsc.org/experiments/electrolysis-of-brine/735.article',
  },
  nist: {
    label: 'NIST Chemistry WebBook — Water',
    url: 'https://webbook.nist.gov/cgi/cbook.cgi?ID=C7732185&Mask=2',
  },
  moonIce: {
    label: 'NASA — LRO: lunar ice deposits are widespread',
    url: 'https://science.nasa.gov/solar-system/moon/nasas-lro-lunar-ice-deposits-are-widespread/',
  },
};

export const TEXT = {
  title: 'Electrolysis',
  introTitle: 'Meet H₂O',
  intro: [
    'Water is made of tiny pieces called <b>molecules</b>. Each water molecule is <b>H₂O</b>: 1 <b class="t-o">oxygen</b> atom and 2 <b class="t-h">hydrogen</b> atoms.',
    '<b>Electrolysis</b> means using electricity to split water apart. The oxygen goes into the base air for you to breathe!',
  ],
  introGo: "Let's zap!",
  chooseTitle: 'How much oxygen?',
  chooseSub: 'Bigger batches use more water and more power. Plan ahead!',
  powerNote:
    'Power shown is the least that physics allows (NIST). Real machines need a bit more.',
  playHint: 'Click a water molecule — or press Space when one is in the glowing zone.',
  whyPop: 'Hydrogen tube fills 2× faster! Each H₂O has 2 H but only 1 O.',
  heatPop: 'Missed! Some electricity just turned into heat.',
  oxygenPair: 'Two O atoms team up → O₂',
  leave: 'Leave (nothing is made)',
  back: 'Back to base',
  reasons: {
    full: 'Oxygen supply is too full for this batch',
    water: 'Not enough water in the tank',
    power: 'Not enough power — wait for sunlight',
  },
  tankEmpty: 'The water tank is empty. Ice mining is coming in a later update!',
  allFull: 'The oxygen supply is almost full. Come back when it gets lower — no need to use water yet!',
};

// Rotating end-of-round questions. One per visit (visit number % length).
export const QUIZ = [
  {
    q: 'Which tube filled up faster?',
    options: ['The hydrogen tube (−)', 'The oxygen tube (+)', 'Both the same'],
    answer: 0,
    explain: 'Each water molecule has 2 hydrogen atoms but only 1 oxygen atom, so you get twice as much hydrogen gas as oxygen gas.',
    source: SOURCES.rscWater,
  },
  {
    q: 'On the Space Station, what happens to the leftover hydrogen?',
    options: [
      'It can be joined with the CO₂ astronauts breathe out to make water again',
      'It is turned back into oxygen',
      'It powers the lights',
    ],
    answer: 0,
    explain:
      'A machine called the Sabatier reactor joins hydrogen with carbon dioxide to make water (and methane, which is let out into space). Hydrogen it can’t use is let out into space too.',
    source: SOURCES.eclss,
  },
  {
    q: 'Why not add salt to the water to help the electricity flow?',
    options: [
      'Salt water makes chlorine gas instead of oxygen — and chlorine is poisonous',
      'Salt would make the oxygen taste salty',
      'Salt makes the water freeze',
    ],
    answer: 0,
    explain:
      'With salt water, the + side makes chlorine instead of oxygen. That is why oxygen machines use very clean water.',
    source: SOURCES.rscBrine,
  },
  {
    q: 'Where could a Moon base find water to make oxygen?',
    options: ['Ice in craters that never get sunlight', 'Lakes on the Moon', 'Rain clouds'],
    answer: 0,
    explain:
      'Craters near the Moon’s south pole stay in shadow and are so cold that they hold water ice. That is one reason Artemis is going there.',
    source: SOURCES.moonIce,
  },
];

/** Kid-friendly "real time" line: rounds to the nearest half hour. */
export function realTimeLine(hours) {
  const half = Math.max(0.5, Math.round(hours * 2) / 2);
  let txt;
  if (half === 0.5) txt = 'half an hour';
  else if (half === 1) txt = '1 hour';
  else txt = `${Number.isInteger(half) ? half : `${Math.floor(half)}½`} hours`;
  return `In real life, the Space Station’s oxygen machine needs about ${txt} to make this much.`;
}
