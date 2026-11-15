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
  introGo: "Let's go!",
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
    q: 'Which electrode makes the hydrogen bubbles?',
    options: [
      { text: '−', icon: null },
      { text: '+', icon: null },
    ],
    answer: 0,
    big: true,
    hint: 'In Bubble Detective, which side sent up the H₂ bubbles?',
    explain: 'Hydrogen forms at the negative (−) electrode and oxygen at the positive (+) electrode.',
    source: SOURCES.rscWater,
  },
  {
    q: '2 water molecules split. How many oxygen molecules (O₂) do you get?',
    options: [
      { text: '1', icon: null },
      { text: '2', icon: null },
      { text: '4', icon: null },
    ],
    answer: 0,
    big: true,
    hint: 'Count the O atoms in 2 H₂O, then pair them up!',
    explain: '2 H₂O has 2 oxygen atoms. Two O atoms join as one O₂. Nothing is lost: 2 H₂O → 2 H₂ + O₂.',
    source: SOURCES.rscWater,
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

// First-time "How to play" cards, one per mini-game (ui/tutorial.js shows them).
// Pictures first (tutorialArt.js), captions of a few words. `say` is what Volt reads out.
export const TUTORIALS = {
  zapper: {
    title: 'Molecule Zapper',
    panels: [
      { art: 'zapClick', caption: 'Click the water', say: 'Click a water molecule.' },
      { art: 'zapSplit', caption: 'Zap! It splits', say: 'Zap! Hydrogen goes to the minus side, oxygen to the plus side.' },
      { art: 'zapTubes', caption: '2× more H₂', say: 'You get twice as much hydrogen as oxygen.' },
    ],
  },
  bubbles: {
    title: 'Bubble Detective',
    panels: [
      { art: 'bubRise', caption: 'Bubbles rise', say: 'Bubbles rise from the two plates.' },
      { art: 'bubMinus', caption: '<b>−</b> side → <b>H₂</b>', say: 'A bubble from the minus side is hydrogen. Tap H2.' },
      { art: 'bubPlus', caption: '<b>+</b> side → <b>O₂</b>', say: 'A bubble from the plus side is oxygen. Tap O2.' },
    ],
  },
  atoms: {
    title: 'Atom Match',
    panels: [
      { art: 'atomSplit', caption: '2 H₂O split', say: 'Two water molecules split into atoms.' },
      { art: 'atomH', caption: 'Tap <b>H</b> + <b>H</b>', say: 'Tap two hydrogen atoms to make H2.' },
      { art: 'atomO', caption: 'Tap <b>O</b> + <b>O</b>', say: 'Tap two oxygen atoms to make O2, the oxygen we breathe.' },
    ],
  },
};

// Volt teaches the IDEA around each mini-game, in three short beats (few words!):
//   CONCEPT — one line on the How-to-play card: what the real machine does
//   TIPS    — one-time reactions during play, at the moment the kid sees it happen
//   LEARN   — "What really happened" after play: a diagram + two lines + the real-world
//             link (shown the first LEARN_SHOWS times per game, so it never nags)
// Every fact is in docs/SCIENCE.md → Electrolysis (RSC; NASA OGA / ECLSS; stoichiometry).
export const CONCEPT = {
  zapper: 'Electricity can pull water apart into two gases!',
  bubbles: 'Our machine has two metal plates in water. Electricity makes gas bubbles on both!',
  atoms: 'Splitting water never destroys atoms. They just find new partners!',
};

export const TIPS = {
  bubbles: {
    h2: 'Hydrogen! It always comes from the − plate.',
    o2: 'Oxygen! It comes from the + plate. We breathe it!',
    ratio: 'See? Two hydrogen bubbles for every oxygen one.',
  },
  atoms: {
    H2: 'H + H = H₂: hydrogen gas!',
    O2: 'O + O = O₂: the oxygen we breathe!',
  },
};

export const LEARN_SHOWS = 2;
export const LEARN = {
  zapper: {
    art: 'learnZapper',
    lines: ['Electricity split water into hydrogen and oxygen.', '2 H₂O → 2 H₂ + O₂'],
    real: 'The Space Station makes its oxygen this way.',
    source: SOURCES.oga,
  },
  bubbles: {
    art: 'learnBubbles',
    lines: ['The − plate makes hydrogen. The + plate makes oxygen.', 'Twice as much hydrogen, because water is H₂O.'],
    real: 'On the Space Station, oxygen goes into the air and hydrogen is sent away: it burns very easily.',
    source: SOURCES.eclss,
  },
  atoms: {
    art: 'learnAtoms',
    lines: ['Same 6 atoms before and after: just new partners.', '2 H₂O → 2 H₂ + O₂'],
    real: 'That’s why 1 kg of oxygen needs about 1.1 kg of water.',
    source: SOURCES.rscWater,
  },
};

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
