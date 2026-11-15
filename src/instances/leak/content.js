// content.js — every word the Leak Fix lesson shows, with sources.
// Facts mirror docs/SCIENCE.md ("Micrometeoroids and air leaks") and public/data/facts.json.
// Plain language for ages 7–12; real terms (pressure, vacuum, ultrasound, hatch, epoxy) are
// explained once. Simplified by leaving details out (no flow equations on screen, no
// nitrogen tanks, one hole only), never by saying something false.

export const SOURCES = {
  isolate2020: {
    label: 'NASA Space Station blog (29 Sep 2020): tests isolate a small leak',
    url: 'https://www.nasa.gov/blogs/spacestation/2020/09/29/crew-continues-troubleshooting-as-tests-isolate-small-leak/',
  },
  weekend2020: {
    label: 'NASA Space Station blog (20 Aug 2020): crew spends the weekend in the Russian segment',
    url: 'https://www.nasa.gov/blogs/spacestation/2020/08/20/crew-spending-weekend-in-stations-russian-segment/',
  },
  soyuz2018: {
    label: 'NASA Space Station blog (30 Aug 2018): Soyuz hole plugged with epoxy on gauze',
    url: 'https://www.nasa.gov/blogs/spacestation/2018/08/30/international-space-station-status-3/',
  },
  leakTM: {
    label: 'NASA/TM-2008-215347: Leak Detection and Location Technology',
    url: 'https://ntrs.nasa.gov/api/citations/20080041598/downloads/20080041598.pdf',
  },
  choked: {
    label: 'NASA Glenn Research Center: Mass Flow Choking',
    url: 'https://www.grc.nasa.gov/www/k-12/airplane/mflchk.html',
  },
};

export const TEXT = {
  title: 'Leak Fix',
  introTitle: 'Why does air leak out?',
  intro: [
    'A micrometeorite made a tiny hole in the habitat wall. Air is escaping!',
    'Air <b>presses</b> on every wall. Space is a <b>vacuum</b>: empty, no air to press back. So the air inside pushes out through the hole.',
  ],
  introGo: 'Let’s find it!',
  why: 'Why does air leak?',
  leave: 'Leave (the leak keeps going)',
  back: 'Back to base',
};

// First-time "How to play" cards: pictures first, a few words each (tutorialArt.js).
export const TUTORIALS = {
  hunt: {
    title: 'Leak Hunt',
    panels: [
      { art: 'huntMove', caption: 'Move the detector', say: 'Move the leak detector over the wall.' },
      { art: 'huntBars', caption: 'More bars = closer', say: 'More bars and faster beeps mean you are closer.' },
      { art: 'huntFound', caption: 'Full bars: found!', say: 'Full bars: you found the hole!' },
    ],
  },
  hatch: {
    title: 'Hatch Hunt',
    panels: [
      { art: 'hatchTap', caption: 'Tap a hatch to close it', say: 'Tap a hatch to close it.' },
      { art: 'hatchNeedle', caption: 'Needle falls = leak side', say: 'Watch the needles. The side whose needle falls has the hole.' },
      { art: 'hatchOne', caption: 'Shrink it to 1 room', say: 'Close hatches until the falling side is just one room.' },
    ],
  },
  patch: {
    title: 'Patch It',
    panels: [
      { art: 'patchTape', caption: 'Tape it', say: 'Put tape over the hole to slow the leak.' },
      { art: 'patchMix', caption: 'Mix A + B', say: 'Mix the two parts of the glue.' },
      { art: 'patchPress', caption: 'Hold to press', say: 'Hold the glue patch on the hole.' },
    ],
  },
};

// Volt teaches the IDEA in three short beats (same pattern as Electrolysis):
//   CONCEPT — one line on the How-to-play card and above the game
//   TIPS    — one-time reactions at the moment the kid sees it happen
//   LEARN   — "What really happened" after play (first LEARN_SHOWS times per game)
export const CONCEPT = {
  hunt: 'A tiny leak whistles too high for our ears. This detector can hear it!',
  hatch: 'Close the doors between rooms. Only the room with the hole loses air!',
  patch: 'Patch the hole from the inside. The air will push the patch on tight!',
};

export const TIPS = {
  hunt: {
    closer: 'Faster beeps! You’re getting closer.',
    found: 'Found it! The hole is as thin as pencil lead.',
  },
  hatch: {
    split: 'See? Only one side’s needle is falling.',
    steady: 'That side holds steady: no hole there.',
    found: 'This room is losing air: the hole is here!',
  },
  patch: {
    tape: 'Tape slows the leak, but it won’t last.',
    mix: 'Two parts mixed: now the glue can harden.',
    press: 'Feel that? The air inside presses the patch on.',
    check: 'The needle stays still: no more leak!',
  },
};

export const LEARN_SHOWS = 2;
export const LEARN = {
  hunt: {
    art: 'learnHunt',
    lines: ['Air rushing through a tiny hole whistles too high for us to hear: <b>ultrasound</b>.', 'The detector turns it into beeps we can hear.'],
    real: 'Space Station crews really hunt leaks with ultrasonic leak detectors.',
    source: SOURCES.isolate2020,
  },
  hatch: {
    art: 'learnHatch',
    lines: ['Closed hatches split the base into parts.', 'Only the part with the hole lost <b>pressure</b>.'],
    real: 'In 2020 the Space Station crew closed hatches for a whole weekend to find a leak.',
    source: SOURCES.weekend2020,
  },
  patch: {
    art: 'learnPatch',
    lines: ['Tape slowed the leak. Glue on cloth sealed it for good.', 'The air inside pushes the patch onto the wall.'],
    real: 'In 2018 a cosmonaut sealed a 2 mm hole in a Soyuz spacecraft with glue (epoxy) on cloth.',
    source: SOURCES.soyuz2018,
  },
};

// The quick question matches the game just played (rotates by repair number).
export const QUIZ = {
  hunt: [
    {
      q: 'Why couldn’t you hear the leak with your ears?',
      options: ['Its whistle is too high for us', 'Air makes no sound', 'Leaks are always silent', 'The Moon is too quiet'],
      answer: 0,
      hint: 'What did the detector do that your ears can’t?',
      explain: 'Air squeezing through a tiny hole whistles so high that it is ultrasound: above what human ears can hear. The detector can hear it.',
      source: SOURCES.leakTM,
    },
    {
      q: 'Why does air rush out of a hole in the habitat?',
      options: ['The air inside pushes it out', 'Space sucks it like a vacuum cleaner', 'The Moon pulls it down', 'The air is too hot'],
      answer: 0,
      hint: 'Is there any air outside to push back?',
      explain: 'Space doesn’t suck! The air inside presses on every wall, and outside there is no air to press back, so the air is pushed out through the hole.',
      source: SOURCES.choked,
    },
  ],
  hatch: [
    {
      q: 'How did closing hatches show where the leak was?',
      options: ['Only the part with the hole lost pressure', 'The hatches beeped', 'The leak moved', 'All the needles fell'],
      answer: 0,
      hint: 'Which needle was falling?',
      explain: 'A closed hatch stops air moving between parts of the base, so only the part with the hole keeps losing pressure.',
      source: SOURCES.isolate2020,
    },
    {
      q: 'Why does the oxygen supply go down faster during a leak?',
      options: ['The base tops up the leaking air', 'You breathe faster', 'Oxygen turns into water', 'The Sun burns it'],
      answer: 0,
      hint: 'Where does the base get air to replace what leaks out?',
      explain: 'Air keeps escaping, so the base adds oxygen from the supply to keep the cabin air right. The Space Station did this after its 2018 leak.',
      source: SOURCES.soyuz2018,
    },
  ],
  patch: [
    {
      q: 'Why put the patch on the INSIDE of the wall?',
      options: ['The air inside pushes it on tight', 'It looks nicer', 'It is colder inside', 'The Moon’s gravity holds it'],
      answer: 0,
      hint: 'Which way does the air push?',
      explain: 'The air inside pushes outward on everything. On the inside of the wall it presses the patch onto the hole, helping it seal.',
      source: SOURCES.soyuz2018,
    },
    {
      q: 'How did the crew check that the patch worked?',
      options: ['They watched the pressure stay steady', 'They looked outside', 'They listened to the radio', 'They waited for rain'],
      answer: 0,
      hint: 'Remember the needle at the end.',
      explain: 'If the pressure stays steady for hours, no more air is escaping. In 2018 mission control watched the pressure overnight after the repair.',
      source: SOURCES.soyuz2018,
    },
  ],
};

export const DEEPER =
  'A tiny hole lets air out at the <b>speed of sound</b>: this is called <b>choked flow</b>. How fast the air escapes depends on the hole’s size and the air pressure inside, not on the vacuum outside. Our hole is only 0.7 mm wide, so it loses about 0.2 kg of air an hour: slow enough to find and fix calmly, which is what real crews do.';
