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
    id: 'moon-gravity',
    title: 'Moon gravity',
    core: 'Moon gravity is about 1/6 of Earth’s, so you jump high and fall slowly.',
    deeper: '1.62 m/s² on the Moon vs 9.81 m/s² on Earth.',
    source: 'NASA Moon Fact Sheet',
    url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html',
  },
];
