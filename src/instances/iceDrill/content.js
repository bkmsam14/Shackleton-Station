// content.js — every word of the Ice Drill and the Ice Oven, with sources.
// Facts mirror docs/SCIENCE.md ("Ice in cold traps") and public/data/facts.json.

export const SOURCES = {
  lcross: {
    label: 'Colaprete et al., Science 2010 — Detection of water in the LCROSS ejecta plume',
    url: 'https://www.science.org/doi/10.1126/science.1186986',
  },
  diviner: {
    label: 'NASA Scientific Visualization Studio — LRO peers into permanent shadows',
    url: 'https://svs.gsfc.nasa.gov/4043',
  },
  moonIce: {
    label: 'NASA — LRO: lunar ice deposits are widespread',
    url: 'https://science.nasa.gov/solar-system/moon/nasas-lro-lunar-ice-deposits-are-widespread/',
  },
  isru: {
    label: 'NASA — In-situ resource utilization (ISRU) overview',
    url: 'https://www.nasa.gov/overview-in-situ-resource-utilization/',
  },
};

export const TEXT = {
  title: 'Ice Drill',
  introTitle: 'Ice in the dark',
  intro: [
    'Some crater floors near the Moon’s poles <b>never see the Sun</b>. They stay colder than <b>−230 °C</b>, so water ice can stay there for a very long time.',
    'The ice is mixed into the Moon soil, called <b>regolith</b>. Drill up icy soil and bake the water out of it at home!',
  ],
  introGo: 'Start drilling!',
  controls: 'Steer with <b>A</b>/<b>D</b>, the arrows or the mouse. Hold <b>Space</b> to drill faster (rocks stop you longer!). Press <b>S</b> to scan for hidden ice.',
  goal: 'Grab icy soil in a row for a streak! Dodge the rocks.',
  bagFull: 'Your bag is full! Carry it to the Ice Oven in the habitat.',
  resting: 'This spot is dug out for now. Try another glowing spot!',
  leave: 'Stop drilling',
  back: 'Back to the crater',
};

/** One easy question per visit (rotating). */
export const QUIZ = [
  {
    q: 'Where can water ice last on the Moon?',
    options: ['In craters the Sun never reaches', 'On sunny hilltops', 'Floating in the sky'],
    answer: 0,
    hint: 'Ice melts or turns to gas in sunlight. Where is it always dark?',
    explain: 'Some crater floors near the poles are always in shadow and super cold, so ice can last there.',
    source: SOURCES.diviner,
  },
  {
    q: 'You dig 100 kg of icy soil. About how much water is inside?',
    options: ['About 6 kg', 'About 100 kg', 'About 50 kg'],
    answer: 0,
    hint: 'Most of it is soil. Only a little is ice.',
    explain: 'NASA’s LCROSS mission found about 5.6% water ice in Cabeus crater’s soil — so lots of soil gives a little water.',
    source: SOURCES.lcross,
  },
  {
    q: 'What does the Ice Oven do?',
    options: ['Heats the soil so the ice turns to vapour, then catches it as water', 'Turns the soil into oxygen', 'Freezes the ice even harder'],
    answer: 0,
    hint: 'What happens to ice when it gets warm?',
    explain: 'Heating makes the ice turn into water vapour (a gas). A cold plate catches the vapour as water. Electrolysis can then turn it into oxygen.',
    source: SOURCES.isru,
  },
];

/** "Did you know?" for the Ice Oven screen. */
export const OVEN_FACTS = [
  {
    title: 'Live off the land',
    text: 'Using things you find on the Moon instead of shipping them from Earth is called <b>ISRU</b> (in-situ resource utilization). NASA is working on it so astronauts need fewer deliveries.',
    source: SOURCES.isru,
  },
  {
    title: 'One water, many jobs',
    text: 'Water from Moon ice can be for drinking, for making oxygen by electrolysis, and even as a radiation shield — like your water walls!',
    source: SOURCES.isru,
  },
  {
    title: 'Ice is spread out',
    text: 'NASA’s LRO spacecraft found signs of ice in many cold, shadowed places near both poles — not just one crater.',
    source: SOURCES.moonIce,
  },
];

export const OVEN_REASONS = {
  'no-soil': 'The oven is empty. Dig icy soil in the dark crater past the solar array!',
  busy: 'The oven is already baking.',
  power: 'Not enough power to heat it. Wait for sunlight!',
};
