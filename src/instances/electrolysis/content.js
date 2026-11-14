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

// Rotating end-of-round questions — one per visit (visit number % length).
// Written for ages 7–12: each one can be answered from what the kid just SAW in the
// intro or the game (no outside knowledge needed). Short answers with a picture each,
// shown in a random order. A wrong answer gets Volt's hint and a second try; the bonus
// star is only for a right first try. Harder facts (Sabatier, salt → chlorine) stay in
// the PDA Databank for curious older kids.
// option.icon = a key of IC in icons.js (or null).
export const QUIZ = [
  {
    q: 'How many hydrogen atoms are in one water molecule?',
    options: [
      { text: '1', icon: null },
      { text: '2', icon: null },
      { text: '3', icon: null },
    ],
    answer: 1,
    big: true, // short number answers shown as big tiles
    hint: 'Look at the little number after the H in H₂O!',
    explain: 'H₂O means 2 hydrogen atoms (H) and 1 oxygen atom (O).',
    source: SOURCES.rscWater,
  },
  {
    q: 'What splits the water apart?',
    options: [
      { text: 'Electricity', icon: 'power' },
      { text: 'Fire', icon: 'heat' },
      { text: 'Ice', icon: 'snow' },
    ],
    answer: 0,
    hint: 'Think about the zaps you made in the game!',
    explain: 'Electricity pulls water molecules apart. That is what electrolysis means: splitting with electricity!',
    source: SOURCES.rscWater,
  },
  {
    q: 'Which tube filled up faster?',
    options: [
      { text: 'Hydrogen', icon: 'h2' },
      { text: 'Oxygen', icon: 'oxygen' },
      { text: 'Both the same', icon: 'equal' },
    ],
    answer: 0,
    hint: 'Look back at the two tubes. Which one was taller?',
    explain: 'Every water molecule has 2 hydrogen atoms but only 1 oxygen atom — so you get twice as much hydrogen.',
    source: SOURCES.rscWater,
  },
  {
    q: 'Which gas from the machine do you need to breathe?',
    options: [
      { text: 'Oxygen', icon: 'oxygen' },
      { text: 'Hydrogen', icon: 'h2' },
    ],
    answer: 0,
    hint: 'It is the gas in the blue tube on the + side!',
    explain: 'The oxygen goes into the base air for you to breathe. The Space Station’s oxygen machine does the same thing.',
    source: SOURCES.eclss,
  },
  {
    q: 'Where could a Moon base find water?',
    options: [
      { text: 'Ice in dark craters', icon: 'snow' },
      { text: 'Rain', icon: 'cloud' },
      { text: 'Rivers', icon: 'wave' },
    ],
    answer: 0,
    hint: 'The Moon has no air, so it never rains there. Where could water hide?',
    explain: 'Some craters near the Moon’s south pole never get sunlight. They are so cold that water stays frozen as ice.',
    source: SOURCES.moonIce,
  },
];

/** Shuffle the options for display (so the right answer is not always in the same spot). */
export function shuffledOptions(question, random = Math.random) {
  const order = question.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order; // display position → original option index
}

/** Kid-friendly "real time" line: rounds to the nearest half hour. */
export function realTimeLine(hours) {
  const half = Math.max(0.5, Math.round(hours * 2) / 2);
  let txt;
  if (half === 0.5) txt = 'half an hour';
  else if (half === 1) txt = '1 hour';
  else txt = `${Number.isInteger(half) ? half : `${Math.floor(half)}½`} hours`;
  return `In real life, the Space Station’s oxygen machine needs about ${txt} to make this much.`;
}
