// content.js — what the Water Walls panel teaches. Plain language for ages 7–12.
// Every fact carries its source (also in docs/SCIENCE.md and public/data/facts.json).

/** "Did you know?" cards, shown one at a time (Next button). */
export const FACTS = [
  {
    id: 'why-water',
    title: 'Why water?',
    text: 'Water is full of <b>hydrogen</b>. Materials with lots of hydrogen are some of the best at slowing down fast space particles.',
    source: 'NASA Technical Reports Server — radiation shielding materials study (2009)',
    url: 'https://ntrs.nasa.gov/citations/20090020691',
  },
  {
    id: 'not-metal',
    title: 'Why not a thick metal wall?',
    text: 'When fast particles crash into metal, they can knock out <b>new particles</b>. On the Space Station, many particles inside come from the aluminium walls themselves!',
    source: 'NASA Technical Memorandum 20230003044',
    url: 'https://ntrs.nasa.gov/citations/20230003044',
  },
  {
    id: 'real-water-walls',
    title: 'Real “water walls”',
    text: 'NASA engineers have studied <b>water walls</b>: habitat walls made of water bags that block radiation <b>and</b> help clean water and air.',
    source: 'NASA NIAC — Water Walls (Michael Flynn, NASA Ames)',
    url: 'https://www.nasa.gov/general/water-walls-highly-reliable-and-massively-redundant-life-support-architecture',
  },
  {
    id: 'use-the-mass',
    title: 'Use what you have',
    text: 'In a storm, astronauts hide where the most stuff is around them. On Orion, the crew builds a shelter out of <b>supply bags</b>.',
    source: 'NASA Science — How NASA will protect astronauts from space radiation at the Moon',
    url: 'https://science.nasa.gov/science-research/heliophysics/how-nasa-will-protect-astronauts-from-space-radiation-at-the-moon',
  },
];

/** Quick check after pumping (one per visit, rotating). Easy on purpose. */
export const QUIZ = [
  {
    q: 'You add more water to the walls. What happens?',
    options: ['Fewer particles reach you', 'More particles reach you', 'Nothing changes'],
    answer: 0,
    hint: 'Watch the particle test window!',
    explain: 'More water in the way stops more particles. Shielding is all about mass.',
  },
  {
    q: 'Why is water a good shield?',
    options: ['It is cold', 'It has lots of hydrogen', 'It is blue'],
    answer: 1,
    hint: 'Look at the “Did you know?” card about water.',
    explain: 'Water is full of hydrogen, which is great at slowing down fast particles.',
  },
  {
    q: 'Water in the walls is a shield. What can’t it do while it is there?',
    options: ['Make oxygen', 'Block particles', 'Be water'],
    answer: 0,
    hint: 'Where does the Electrolysis unit get its water?',
    explain: 'Every choice costs something: water in the walls can’t be split into oxygen until you pump it back.',
  },
];
