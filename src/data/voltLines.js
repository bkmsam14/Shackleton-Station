// voltLines.js — everything Volt says. Plain language for ages 7–12.
//  text:  what shows in Volt's bubble (short: ≤ 14 words, checked by tests/assistant.test.js)
//  long:  the full line for the PDA log (optional; defaults to text)
//  mood:  Volt's face: happy | wow | think | cheer
// Every science fact points at a DATABANK entry (src/data/databank.js), which holds the source.

// ---------------------------------------------------------------- first-day tour
// done: how the step is completed — { walk: metres } | { event } | { flag } (see systems/assistant.js)
// target: where the 3D marker goes (resolved to a position in main.js)
export const TOUR = [
  {
    id: 'move',
    text: "Hi, I'm Volt! Walk with W A S D. Look with the mouse.",
    long: "Hi, I'm Volt, your helper robot! Walk with W A S D (or the arrow keys) and look around with the mouse.",
    mood: 'wow',
    done: { walk: true },
  },
  {
    id: 'gauges',
    text: 'Great! These three rings keep you alive. Watch them!',
    long: 'These rings are your gauges: blue Oxygen, green Food, and the Base Power battery at the top. If one runs low, we fix it.',
    mood: 'happy',
    action: 'show-gauges',
    done: { event: 'gauges-shown' },
  },
  {
    id: 'pda',
    text: 'Press Tab to open your PDA. It explains everything!',
    long: 'Press Tab to open your PDA. It shows how fast each gauge drops and why, plus a Databank of real NASA science.',
    mood: 'happy',
    done: { event: 'pda-opened' },
  },
  {
    id: 'oxygen',
    text: 'Our oxygen is at 60%. Let’s make more at Electrolysis!',
    long: 'Our oxygen supply is at 60%. Walk to the Electrolysis unit in the work bay (follow the arrow) and press E to make more.',
    mood: 'wow',
    target: 'electrolysis',
    done: { event: 'oxygen-made' },
  },
  {
    id: 'outside',
    text: 'Nice work! Now go out through the orange hatch.',
    long: 'Nice work! Now let’s go outside: walk to the orange hatch and press E. Your suit uses the same oxygen supply.',
    mood: 'cheer',
    target: 'airlock',
    done: { event: 'zone:outside' },
  },
  {
    id: 'array',
    text: 'Outside, oxygen drains about 2× faster! Follow the lamps to the solar array.',
    long: 'Working outside in a suit is hard work, so you use oxygen about 2× faster (NASA BVAD). Follow the lamps to the tall solar array.',
    mood: 'wow',
    target: 'array',
    done: { flag: 'nearArray' },
  },
  {
    id: 'greenhouse',
    text: 'The array turns to follow the low Sun. Last stop: the greenhouse!',
    long: 'The solar array turns to follow the low Sun and charges our battery. When the Sun hides behind the ridge, we run on the battery. Last stop: the greenhouse!',
    mood: 'happy',
    target: 'greenhouse',
    done: { event: 'zone:greenhouse' },
  },
];

export const TOUR_DONE = {
  id: 'tour-done',
  text: 'Tour done! Press E on me any time for a tip.',
  long: 'Tour done! Plants grow here under red and blue lights. Press E on me any time for a tip. You can replay the tour from the pause menu (Esc).',
  mood: 'cheer',
};
export const TOUR_SKIPPED = {
  id: 'tour-skipped',
  text: 'Okay! Press E on me any time for a tip.',
  mood: 'happy',
};
export const WELCOME_BACK = {
  id: 'welcome-back',
  text: 'Welcome back! Press E on me if you need a tip.',
  mood: 'happy',
};
/** Shown in the tour bubble so kids know how to skip (the mouse is locked during play). */
export const TOUR_SKIP_HINT = 'Esc → Skip tour';

// ---------------------------------------------------------------- events
// kind: 'warning' (always said, even in Quiet mode) | 'news' (Chatty + Helpful)
export const EVENTS = {
  'oxygen-low': {
    kind: 'warning',
    text: 'Oxygen is getting low! Let’s make some at Electrolysis.',
    long: 'The oxygen supply is low. Go to the Electrolysis unit in the habitat work bay to make more (it uses water and power).',
    mood: 'wow',
  },
  'oxygen-low-outside': {
    kind: 'warning',
    text: 'Oxygen is low! Let’s head back inside, quick.',
    long: 'The oxygen supply is low, and working outside uses it about 2× faster. Head back inside and make more at Electrolysis.',
    mood: 'wow',
  },
  'food-low': {
    kind: 'warning',
    text: 'Food is low. Resting inside makes it last longer.',
    long: 'Food is low. You use food energy about 2× faster working outside, so rest inside. Press F to eat a potato, and grow more in the greenhouse pots.',
    mood: 'think',
  },
  'power-low': {
    kind: 'warning',
    text: 'Base power is low. The battery needs sunlight on the array.',
    long: 'Base power is low. The battery charges when sunlight reaches the solar array. Wait for the Sun, and don’t run big batches now.',
    mood: 'think',
  },
  'power-out': {
    kind: 'warning',
    text: 'Power is out! The grow lights are off until the Sun returns.',
    mood: 'wow',
  },
  'power-back': {
    kind: 'news',
    text: 'Power is back! The solar array is charging us again.',
    mood: 'cheer',
  },
  'sun-down': {
    kind: 'news',
    text: 'The Sun went behind the ridge. We’re on battery now.',
    long: 'The Sun went behind the ridge, so the solar array makes no power. The base runs on its battery until the Sun comes back.',
    mood: 'think',
  },
  'sun-up': {
    kind: 'news',
    text: 'The Sun is back! The array is making power again.',
    mood: 'cheer',
  },
  'tank-low': {
    kind: 'warning',
    text: 'The water tank is low. Let’s mine ice for more!',
    long: 'The Electrolysis water tank is getting low. Drill icy soil in the cold-trap crater past the solar array and bake it in the Ice Oven — or order water from Earth at the supply terminal.',
    mood: 'think',
  },
  // --- ice mining
  'ice-coldtrap': {
    kind: 'news',
    text: 'Brr! This crater never sees the Sun. Ice hides in its soil!',
    long: 'This crater floor never sees the Sun, so it stays colder than −230 °C (NASA LRO Diviner) and water ice can last in the soil. Press E on a glowing spot to drill.',
    mood: 'wow',
  },
  'ice-water-done': {
    kind: 'news',
    text: 'The Ice Oven is done! Fresh Moon water is in the tank.',
    mood: 'cheer',
  },
  // --- telescope
  'star-found': {
    kind: 'news',
    text: 'New star card! Look up outside — its name shows in the sky.',
    long: 'You found a new constellation with the telescope. It is in your Star Album (PDA, Tab), and when you look at it outside, its lines and name appear in the real sky.',
    mood: 'cheer',
  },
  'recovered': {
    kind: 'news',
    text: 'Phew, you’re safe! Let’s keep an eye on those rings.',
    mood: 'happy',
  },
  // --- particle storms (radiation)
  'storm-warning': {
    kind: 'warning',
    text: 'A solar flare! Fast particles are coming. Run to the storm shelter!',
    long: 'A real solar flare was seen (based on NASA DONKI data). Fast particles may follow. Go to the storm shelter in the sleeping nook — follow the arrow.',
    mood: 'wow',
  },
  'storm-exposed': {
    kind: 'warning',
    text: 'The particles are here! Get into the shelter, quick!',
    mood: 'wow',
  },
  'storm-sheltered': {
    kind: 'news',
    text: 'Great, we’re in the shelter! The walls and water block particles.',
    mood: 'cheer',
  },
  'storm-over': {
    kind: 'news',
    text: 'The storm is over. It’s safe to go out again!',
    mood: 'happy',
  },
  'sun-stormy': {
    kind: 'news',
    text: 'Stormy Sun! Real data from May 2024. Watch for solar storms.',
    long: 'Stormy Sun mode: a replay of real NASA DONKI and RadLab data from May 2024, one of the most active times of the Sun in 20 years.',
    mood: 'wow',
  },
  'sun-calm': {
    kind: 'news',
    text: 'Calm Sun: real data from December 2019, when the Sun was quiet.',
    mood: 'happy',
  },
  'sun-live': {
    kind: 'news',
    text: 'Live Sun! Real space weather from the last 7 days.',
    mood: 'wow',
  },
};

// ---------------------------------------------------------------- first visits (news)
export const VISITS = {
  outside: {
    id: 'visit-outside',
    text: 'No air out here, so fans can’t fly. I roll on wheels!',
    long: 'Outside there is almost no air, so a fan or propeller can’t push against anything. That’s why Moon rovers roll on wheels, and so do I.',
    mood: 'happy',
    databank: 'robot-helpers',
  },
  greenhouse: {
    id: 'visit-greenhouse',
    text: 'Pink lights! Plants mostly use red and blue light to grow.',
    mood: 'wow',
    databank: 'pink-lights',
  },
  habitat: {
    id: 'visit-habitat',
    text: 'Home sweet habitat! Inside you breathe slower, so oxygen lasts longer.',
    mood: 'happy',
  },
};

// ---------------------------------------------------------------- idle science facts
export const FACTS = [
  { id: 'fact-gravity', text: 'Gravity is the same inside the base: still 1/6 of Earth’s!', databank: 'gravity-inside', mood: 'wow' },
  { id: 'fact-oxygen', text: 'An astronaut breathes about 0.9 kg of oxygen every day.', databank: 'oxygen-use', mood: 'think' },
  { id: 'fact-water', text: 'Every water molecule has 2 hydrogen atoms and 1 oxygen atom.', databank: 'water-molecule', mood: 'happy' },
  { id: 'fact-energy', text: 'Splitting water always costs energy. That’s why oxygen costs power!', databank: 'electrolysis-energy', mood: 'think' },
  { id: 'fact-iss', text: 'The Space Station makes its oxygen from water too!', databank: 'iss-oxygen-machine', mood: 'wow' },
  { id: 'fact-astrobee', text: 'Real robots called Astrobee fly inside the Space Station using fans!', databank: 'robot-helpers', mood: 'cheer' },
  { id: 'fact-ice', text: 'Ice hides in dark craters near the Moon’s south pole.', databank: 'moon-ice', mood: 'wow' },
  { id: 'fact-sky', text: 'The sky is black because the Moon has almost no air.', databank: 'black-sky', mood: 'think' },
  { id: 'fact-salt', text: 'Oxygen machines use clean water. Salt water makes poison gas!', databank: 'no-salt', mood: 'wow' },
  { id: 'fact-sep', text: 'Only some solar flares send dangerous particles. Scientists watch them all!', databank: 'solar-particles', mood: 'think' },
  { id: 'fact-shelter', text: 'Water, food and supplies can all be a radiation shield!', databank: 'storm-shelter', mood: 'happy' },
  { id: 'fact-snow', text: 'Storm sparkles on screen? Real space cameras show that “snow” too!', databank: 'camera-snow', mood: 'wow' },
  { id: 'fact-ice-share', text: 'Icy Moon soil: 100 kg holds only about 6 kg of water!', databank: 'moon-ice-soil', mood: 'think' },
  { id: 'fact-scan', text: 'Spacecraft find Moon ice by sniffing its hydrogen from orbit!', databank: 'hydrogen-scan', mood: 'wow' },
  { id: 'fact-twinkle', text: 'Stars don’t twinkle on the Moon. Twinkling comes from Earth’s air!', databank: 'moon-sky', mood: 'wow' },
  { id: 'fact-polaris', text: 'From here you can never see the North Star. It’s always below us!', databank: 'moon-sky', mood: 'think' },
  { id: 'fact-star-colour', text: 'Blue stars are hotter than red ones. Colour tells temperature!', databank: 'star-colours', mood: 'happy' },
  { id: 'fact-isru', text: 'Making water from Moon ice means fewer deliveries from Earth!', databank: 'isru', mood: 'happy' },
  { id: 'fact-moon-dose', text: 'On the Moon’s surface, radiation is about twice the Space Station’s.', databank: 'moon-radiation', mood: 'think' },
];

// ---------------------------------------------------------------- "talk to Volt" (E)
export const TALK = {
  stormWarning: { id: 'talk-storm-warn', text: 'Particles are coming! Follow the arrow to the storm shelter.', mood: 'wow' },
  stormInside: { id: 'talk-storm-in', text: 'Stay in the shelter until the storm is over.', mood: 'think' },
  stormOutside: { id: 'talk-storm-out', text: 'A storm is on! Get to the shelter in the sleeping nook.', mood: 'wow' },
  oxygen: { id: 'talk-oxygen', text: 'Oxygen first! Make some at Electrolysis in the work bay.', mood: 'wow' },
  oxygenOutside: { id: 'talk-oxygen-out', text: 'Oxygen drains fast out here. Let’s go back inside!', mood: 'wow' },
  power: { id: 'talk-power', text: 'Power is low. Wait for sunlight before big oxygen batches.', mood: 'think' },
  food: { id: 'talk-food', text: 'Food is low. Rest inside, it lasts longer there.', mood: 'think' },
  tank: { id: 'talk-tank', text: 'Water is low. Mine ice in the dark crater past the array!', mood: 'think' },
  iceBag: { id: 'talk-ice-bag', text: 'Carry your icy soil to the Ice Oven, next to Electrolysis.', mood: 'happy' },
  // when everything is fine, Volt shares the next science fact instead
};
