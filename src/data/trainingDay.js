// trainingDay.js — Day 1, guided by Volt: every situation once, in a safe order.
// This is Volt's first-day tour (assistant.js runs it as lines.TOUR).
//
// Each step:
//   id, chapter        — chapter groups steps on the end-of-day report card
//   text / long / mood — what Volt says (bubble / PDA log) — facts must match docs/SCIENCE.md
//   target             — where the cyan arrow points (main.js → trainingTarget)
//   done               — { walk } | { event: '…' } | { flag: 'snapshotField' } | { after: seconds }
//   trigger            — scripted event fired when Volt says the line (src/training/index.js)
//   pace               — base-clock speed during this step (default TRAINING.PACE; storm drill: 1)
// Real things only: no random events on Day 1 — every surprise here is planned.

export const TRAINING_DAY = [
  // ---------------------------------------------------------------- wake up
  {
    id: 'move',
    chapter: 'wake',
    text: "Good morning! I'm Volt. Walk with W A S D, look with the mouse.",
    long: "Good morning, astronaut! I'm Volt, your helper robot. Today is your training day: I'll show you everything. Walk with W A S D (or the arrow keys) and look around with the mouse.",
    mood: 'wow',
    done: { walk: true },
  },
  {
    id: 'gauges',
    chapter: 'wake',
    text: 'Great! These three rings keep you alive. Watch them!',
    long: 'These rings are your gauges: blue Oxygen, green Food, and the Base Power battery at the top. If one runs low, we fix it.',
    mood: 'happy',
    action: 'show-gauges',
    done: { event: 'gauges-shown' },
  },
  {
    id: 'pda',
    chapter: 'wake',
    text: 'Press Tab to open your PDA. It explains everything!',
    long: 'Press Tab to open your PDA. It shows how fast each gauge drops and why, plus a Databank of real NASA science.',
    mood: 'happy',
    done: { event: 'pda-opened' },
  },
  // ---------------------------------------------------------------- air
  {
    id: 'oxygen',
    chapter: 'air',
    text: 'Our oxygen is at 60%. Let’s make more at Electrolysis!',
    long: 'Our oxygen supply is at 60%. Walk to the Electrolysis unit in the work bay (follow the arrow) and press E to make more.',
    mood: 'wow',
    target: 'electrolysis',
    done: { event: 'oxygen-made' },
  },
  // ---------------------------------------------------------------- supplies
  {
    id: 'order',
    chapter: 'supplies',
    text: 'Now order a Solar Panel Repair Kit and water at the Supply terminal!',
    long: 'Let’s order supplies from Earth at the Supply terminal, next to the airlock. Add a Solar Panel Repair Kit and a Water container, then press Confirm. Watch the message travel: radio signals take about 1.3 seconds to reach Earth, at the speed of light!',
    mood: 'happy',
    target: 'terminal',
    done: { event: 'order-kit' },
  },
  // ---------------------------------------------------------------- food
  {
    id: 'eat',
    chapter: 'food',
    text: 'Breakfast! Press F to eat a potato. Keep the rest to plant!',
    long: 'Breakfast time! Press F to eat a potato: it fills the green Food ring a little. Keep the others, because a potato you keep can be planted to grow more.',
    mood: 'happy',
    done: { event: 'eat-tried' },
  },
  // ---------------------------------------------------------------- outside + grow
  {
    id: 'outside',
    chapter: 'grow',
    text: 'Let’s go outside! Walk to the orange hatch.',
    long: 'Let’s go outside: walk to the orange hatch and press E. Your suit uses the same oxygen supply.',
    mood: 'cheer',
    target: 'airlock',
    done: { event: 'zone:outside' },
  },
  {
    id: 'greenhouse',
    chapter: 'grow',
    text: 'Outside, you use oxygen about 2× faster! First stop: the greenhouse.',
    long: 'Working outside in a suit is hard work, so you use oxygen about 2× faster (NASA BVAD). Our first stop is the greenhouse (follow the arrow).',
    mood: 'wow',
    target: 'greenhouse',
    done: { event: 'zone:greenhouse' },
  },
  {
    id: 'plant',
    chapter: 'grow',
    text: 'Find the potato pots. Plant, cover and water a potato!',
    long: 'Find the POTATO POTS between the grow racks and press E. Drag a seed potato into the soil, cover it, then tilt the watering can until the soil is wet. It grows under the red and blue lights.',
    mood: 'happy',
    target: 'pots',
    done: { event: 'potato-watered' },
  },
  // ---------------------------------------------------------------- micrometeorite
  {
    id: 'array',
    chapter: 'meteor',
    text: 'Now follow the lamps to the tall solar array.',
    long: 'The base runs on sunlight. Follow the path lamps to the tall solar array: it turns to follow the low Sun.',
    mood: 'happy',
    target: 'array',
    done: { flag: 'nearArray' },
  },
  {
    id: 'hit',
    chapter: 'meteor',
    text: 'Whoa, see that flash? A micrometeorite hit the array!',
    long: 'Whoa! A micrometeorite, a tiny speck of space rock, hit the array. They hit the Moon all the time, because there is no air to burn them up. Our power is down to 40%. Good thing we ordered a repair kit!',
    mood: 'wow',
    trigger: 'micrometeorite',
    done: { after: 7 },
  },
  // ---------------------------------------------------------------- delivery
  {
    id: 'cargo',
    chapter: 'delivery',
    text: 'Look up! Our cargo is landing. Go open the crate on the pad!',
    long: 'Our supply crate is coming down on its thrusters (no parachutes on the Moon: there is no air for them). Walk to the CARGO PAD east of the habitat, press E on the crate and collect the repair kit.',
    mood: 'cheer',
    target: 'pad',
    trigger: 'rush-delivery',
    done: { event: 'kit-collected' },
  },
  // ---------------------------------------------------------------- solar fix
  {
    id: 'repair',
    chapter: 'solar',
    text: 'Got the kit! Back to the array and press E to fix it.',
    long: 'Take the repair kit back to the solar array and press E. You’ll swap the cracked cells and see how sunlight becomes electricity.',
    mood: 'happy',
    target: 'array',
    done: { event: 'solar-repaired' },
  },
  // ---------------------------------------------------------------- moon ice
  {
    id: 'ice',
    chapter: 'ice',
    text: 'Water from Earth is slow. Let’s dig our own in the dark crater!',
    long: 'Shipping water from Earth is slow. Some craters near the south pole never get sunlight, and they hold water ice. Follow the lamps past the array down into the cold crater, then press E at a glowing dig spot.',
    mood: 'wow',
    target: 'ice',
    done: { event: 'ice-dug' },
  },
  {
    id: 'oven',
    chapter: 'ice',
    text: 'Great haul! Carry the bag home to the Ice Oven.',
    long: 'Carry your bag of icy soil back to the habitat and put it in the Ice Oven next to Electrolysis. It heats the soil, and the water goes into our tank.',
    mood: 'cheer',
    target: 'oven',
    done: { event: 'ice-oven-started' },
  },
  // ---------------------------------------------------------------- storm drill (normal speed)
  {
    id: 'storm',
    chapter: 'storm',
    text: 'Solar flare! Fast particles are coming. Run to the storm shelter!',
    long: 'Storm drill! This replays a real solar flare. Fast particles from the Sun are on their way. Go to the storm shelter in the sleeping nook (follow the arrow). The chip shows how long you have.',
    mood: 'wow',
    target: 'shelter',
    trigger: 'storm-drill',
    pace: 1,
    done: { flag: 'inShelter' },
  },
  {
    id: 'walls',
    chapter: 'storm',
    text: 'Safe! Now pump water into the shelter walls: water blocks particles.',
    long: 'Good, the shelter’s mass protects you. Water is one of the best blockers, so press E at the WATER WALLS panel and pump some water into the walls. Remember: water in the walls can’t make oxygen.',
    mood: 'cheer',
    target: 'water-walls',
    pace: 1,
    done: { flag: 'wallsFilled' },
  },
  {
    id: 'storm-over',
    chapter: 'storm',
    text: 'Stay in the shelter until the storm passes.',
    long: 'Stay inside the shelter until the storm is over. Afterwards you’ll see the real flare this storm came from.',
    mood: 'think',
    pace: 1,
    done: { event: 'storm-report-closed' },
  },
  // ---------------------------------------------------------------- harvest
  {
    id: 'harvest',
    chapter: 'harvest',
    text: 'Your potato plant is ready! Go harvest it in the greenhouse.',
    long: 'Your potato plant is ready (for training we let it grow fast; real potatoes take much longer). Go to the greenhouse and cut its leafy stems to pull up the potatoes.',
    mood: 'cheer',
    target: 'pots',
    trigger: 'ripen',
    done: { event: 'potato-harvested' },
  },
];

/** What each chapter taught (the end-of-day report card). */
export const TRAINING_CHAPTERS = [
  { id: 'wake', title: 'Wake up', learned: 'Your gauges and the PDA' },
  { id: 'air', title: 'Air', learned: 'Electrolysis splits water to make oxygen' },
  { id: 'supplies', title: 'Supplies', learned: 'Radio signals take about 1.3 s to reach Earth' },
  { id: 'food', title: 'Food', learned: 'Eat potatoes, keep some to plant' },
  { id: 'grow', title: 'Grow', learned: 'Plant, cover and water under red + blue light' },
  { id: 'meteor', title: 'Micrometeorite', learned: 'No air: tiny space rocks reach the ground' },
  { id: 'delivery', title: 'Delivery', learned: 'Cargo lands on thrusters, not parachutes' },
  { id: 'solar', title: 'Solar Fix', learned: 'Sunlight frees electrons: that is electricity' },
  { id: 'ice', title: 'Moon ice', learned: 'Dark craters hold ice we can turn into water' },
  { id: 'storm', title: 'Storm drill', learned: 'Mass and water shield you from particles' },
  { id: 'harvest', title: 'Harvest', learned: 'Plant one potato, harvest more' },
];

export const TRAINING_DONE = {
  id: 'tour-done',
  text: 'Training day done! From now on, you’re in charge.',
  long: 'Training day done! You made oxygen, ordered supplies, grew food, fixed the solar array, mined Moon ice and got through a solar storm. From now on time runs at normal speed and you’re in charge. Press E on me any time for a tip.',
  mood: 'cheer',
};
