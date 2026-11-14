// databank.js — science entries shown in the PDA "Databank". Every entry mirrors a fact
// in docs/SCIENCE.md (core sentence → go deeper) and carries its NASA source.
// More entries will be unlocked by the mini-games later.
export const DATABANK = [
  {
    id: 'oxygen-use',
    title: 'Oxygen for one astronaut',
    core: 'An astronaut breathes about 0.9 kg of oxygen a day — and about 2 times faster while working outside in a spacesuit.',
    deeper: '0.895 kg per day at rest (BVAD Table 3-31, p. 58) vs 0.086 kg per hour on a spacewalk (Table 4-70, p. 135).',
    source: 'NASA Life Support Baseline Values and Assumptions Document (BVAD), 2022',
    url: 'https://ntrs.nasa.gov/citations/20210024855',
  },
  {
    id: 'electrolysis',
    title: 'Electrolysis',
    core: 'Electricity can split water into hydrogen and oxygen. That is how a base can make new oxygen to breathe.',
    deeper: '2 H₂O → 2 H₂ + O₂. The hydrogen side makes twice as much gas as the oxygen side.',
    source: 'NASA ISS Oxygen Generation Assembly (NTRS)',
    url: 'https://ntrs.nasa.gov/citations/20200002346',
  },
  {
    id: 'water-molecule',
    title: 'Water is H₂O',
    core: 'Every water molecule has 1 oxygen atom and 2 hydrogen atoms. Splitting it gives twice as much hydrogen gas as oxygen gas.',
    deeper: '2 H₂O → 2 H₂ + O₂. Hydrogen bubbles at the negative (−) side, oxygen at the positive (+) side. 1 kg of oxygen uses 1.125 kg of water.',
    source: 'Royal Society of Chemistry — electrolysis of water',
    url: 'https://edu.rsc.org/experiments/exploding-bubbles-of-hydrogen-and-oxygen/752.article',
  },
  {
    id: 'electrolysis-energy',
    title: 'Splitting water takes energy',
    core: 'You must put energy in to split water — at least about 5 kWh for every kg of oxygen. Real machines need more, because some electricity turns into heat.',
    deeper: 'Water’s heat of formation is −285.83 kJ/mol. 1 kg of O₂ needs 62.5 mol of water → 17.9 MJ ≈ 4.96 kWh (the minimum).',
    source: 'NIST Chemistry WebBook — Water',
    url: 'https://webbook.nist.gov/cgi/cbook.cgi?ID=C7732185&Mask=2',
  },
  {
    id: 'iss-oxygen-machine',
    title: 'The Space Station’s oxygen machine',
    core: 'The Space Station makes its oxygen by electrolysis, using water cleaned by its water recycler. Some of the hydrogen goes to the Sabatier reactor, which turns it and breathed-out CO₂ into water.',
    deeper: 'The Oxygen Generation Assembly can make 2.3–9.2 kg of oxygen a day (about 5.4 kg/day normally). The Sabatier reactor also makes methane, which is let out into space.',
    source: 'NASA ECLSS; NASA NTRS 20080036243 and 20180006335',
    url: 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/',
  },
  {
    id: 'no-salt',
    title: 'Why oxygen machines use clean water',
    core: 'If you split salt water, the + side makes chlorine gas instead of oxygen — and chlorine is poisonous.',
    deeper: 'In brine (salt water), chloride ions are discharged at the positive electrode: 2 Cl⁻ → Cl₂ + 2 e⁻.',
    source: 'Royal Society of Chemistry — electrolysis of brine',
    url: 'https://edu.rsc.org/experiments/electrolysis-of-brine/735.article',
  },
  {
    id: 'moon-gravity',
    title: 'Moon gravity',
    core: 'Moon gravity is about 1/6 of Earth’s, so you jump high and fall slowly.',
    deeper: '1.62 m/s² on the Moon vs 9.81 m/s² on Earth.',
    source: 'NASA Moon Fact Sheet',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html',
  },
];
