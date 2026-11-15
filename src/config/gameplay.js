// =============================================================================
// gameplay.js — ALL gameplay rates, timings and costs live here.
//
// Rules (CLAUDE.md):
//  - Numbers from real data carry a source comment (see docs/SCIENCE.md).
//  - Pure balance numbers are marked  // GAME BALANCE (not real data)
// This file must not import Three.js: systems/ and tests/ load it directly.
// =============================================================================

// ---------------------------------------------------------------------------
// TIME
// ---------------------------------------------------------------------------
export const TIME = {
  // 1 in-game day = 12 real minutes, so one 12-hour work shift (DAYS) lasts 6 real minutes.
  REAL_SECONDS_PER_GAME_DAY: 720, // GAME BALANCE (not real data)
  GAME_SECONDS_PER_DAY: 86400, // 24 h × 3600 s (definition)
  START_HOUR: 7, // GAME BALANCE (not real data) — clock shown in HUD
};
// How many times faster than real life the life-support clock runs (= 120×).
TIME.SCALE = TIME.GAME_SECONDS_PER_DAY / TIME.REAL_SECONDS_PER_GAME_DAY;
// Game hours that pass per real second (≈ 0.033 h/s: 1 game hour = 30 real s).
TIME.GAME_HOURS_PER_REAL_SECOND = TIME.SCALE / 3600;

// ---------------------------------------------------------------------------
// DAYS — the mission is 4 work shifts (owner's design, Nov 2026: "survive the day", FNAF-style).
// Each day runs from START_HOUR to END_HOUR on the base clock (6 real minutes). Survive it and
// the day is done: a congratulations card, then the next morning in the habitat. Overnight the
// oxygen supply, battery and water tank are refilled to full as a GAME RULE (the card says so
// honestly); hunger carries over, and so does everything you carry and grow.
// ---------------------------------------------------------------------------
export const DAYS = {
  COUNT: 4, // days to survive — GAME BALANCE (not real data)
  START_HOUR: 7, // shift starts — GAME BALANCE (not real data)
  END_HOUR: 19, // shift ends — GAME BALANCE (not real data)
  TITLE_SECONDS: 2.2, // "Day 2" on black before the fade-in — GAME BALANCE (not real data)
  // Day 1 (the Training Day) does NOT start full: Volt's tour has you make oxygen and eat, so
  // those gauges start low enough to need it. Days 2–4 start with the overnight refill.
  DAY1_START: { OXYGEN_PERCENT: 60, FOOD_PERCENT: 60 }, // GAME BALANCE (not real data)
};
DAYS.SHIFT_HOURS = DAYS.END_HOUR - DAYS.START_HOUR;
DAYS.NIGHT_HOURS = 24 - DAYS.SHIFT_HOURS;
DAYS.SHIFT_REAL_SECONDS = (DAYS.SHIFT_HOURS * 3600) / TIME.SCALE; // = 360 s

// ---------------------------------------------------------------------------
// REAL LIFE-SUPPORT DATA — NASA BVAD, NASA/TP-2015-218570/REV2, Feb 2022
// https://ntrs.nasa.gov/citations/20210024855
// ---------------------------------------------------------------------------
export const BVAD = {
  // Oxygen consumed per crewmember per day, nominal (inside a habitat).
  O2_KG_PER_DAY_NOMINAL: 0.895, // BVAD Table 3-31, p. 58 (footnote 77, p. 59)
  // Oxygen consumed per crewmember per hour during a spacewalk (EVA).
  O2_KG_PER_HOUR_EVA: 0.086, // BVAD Table 4-70, p. 135
  // Food consumed per crewmember per day, dry mass without packaging.
  FOOD_KG_PER_DAY_DRY: 0.8, // BVAD Table 3-31, p. 58 (derivation on p. 59)
  // Food energy consumed per crewmember per day.
  FOOD_MJ_PER_DAY: 12.778, // BVAD Table 3-31, p. 58
  // Food energy burned per crewmember per hour during a spacewalk.
  FOOD_MJ_PER_HOUR_EVA: 1.062, // BVAD Table 4-70, p. 135
};
// Derived: oxygen drains this many times faster outside than inside (≈ 2.31).
BVAD.EVA_TO_NOMINAL_O2_RATIO = BVAD.O2_KG_PER_HOUR_EVA / (BVAD.O2_KG_PER_DAY_NOMINAL / 24);
// Derived: food energy is used this many times faster outside (≈ 2.0).
BVAD.EVA_TO_NOMINAL_FOOD_RATIO = BVAD.FOOD_MJ_PER_HOUR_EVA / (BVAD.FOOD_MJ_PER_DAY / 24);

// ---------------------------------------------------------------------------
// ASTRONAUT GAUGES (0–100 %)
// ---------------------------------------------------------------------------
// OXYGEN = the base's whole shared oxygen supply (habitat + greenhouse + suit together).
// The suit is assumed to be kept topped up from this supply, so there is one gauge.
// It only goes DOWN in Demo 0: making oxygen (electrolysis) arrives with a later
// mini-game, which will call addOxygen() in systems/gauges.js and pay its own cost.
export const OXYGEN = {
  // Size of the full supply. Inside it lasts 0.35 / 0.0373 kg/h ≈ 9.4 game h ≈ 4.7 real min;
  // working outside 0.35 / 0.086 ≈ 4.1 game h ≈ 2 real min. A 12-hour shift needs more, so you
  // must make oxygen (Electrolysis: water + power) every day.
  CAPACITY_KG: 0.35, // GAME BALANCE (not real data)
  // Every day starts full (the overnight refill is a game rule, see DAYS).
  START_PERCENT: 100, // GAME BALANCE (not real data)
};

export const FOOD = {
  // A full food gauge holds one day of food (0.8 kg dry, NASA BVAD). Resting inside, a 12-hour
  // shift uses half of it; working outside about twice as fast. Hunger CARRIES OVER between days.
  CAPACITY_DAYS: 1, // GAME BALANCE (not real data)
  START_PERCENT: 100, // GAME BALANCE (not real data)
};
FOOD.CAPACITY_KG = FOOD.CAPACITY_DAYS * BVAD.FOOD_KG_PER_DAY_DRY;

export const WARNING_THRESHOLD_PERCENT = 25; // GAME BALANCE (not real data)

// ---------------------------------------------------------------------------
// BASE POWER (whole base, not the astronaut). Units: kW and kWh in GAME time.
// ---------------------------------------------------------------------------
export const POWER = {
  BATTERY_CAPACITY_KWH: 40, // GAME BALANCE (not real data) — a dark period can nearly empty it
  START_PERCENT: 100, // GAME BALANCE (not real data) — every day starts full (DAYS)
  // Loads (always on unless the battery is empty). The longest dark period in a shift is
  // ≈ 8 game h: grow lights ON need 5 kW × 8 h ≈ 42 kWh (more than the battery → blackout);
  // OFF 3 kW × 8 h ≈ 25 kWh fits. The grow-lights switch makes that a choice.
  HABITAT_LOAD_KW: 3, // GAME BALANCE (not real data)
  GREENHOUSE_LED_LOAD_KW: 2, // GAME BALANCE (not real data) — 0 while the grow lights are switched off
  // Solar array output when facing the Sun and fully lit.
  SOLAR_ARRAY_PEAK_KW: 9, // GAME BALANCE (not real data)
};

// ---------------------------------------------------------------------------
// SUN & SKY at the lunar south pole
// ---------------------------------------------------------------------------
export const SKY = {
  // The Sun stays within ~1.5° of the horizon at the lunar south pole.
  // Derived from NASA Moon Fact Sheet (6.68° − 5.145° ≈ 1.54°). See SCIENCE.md §2.
  SUN_ELEVATION_DEG: 1.5,
  // Real time for the Sun to circle the sky once = one synodic month.
  REAL_SUN_LOOP_DAYS: 29.53, // NASA Moon Fact Sheet (synodic period)
  // In the game the Sun circles once in this many REAL seconds (shown on screen).
  // = 4 game days (shifts + nights): the Sun goes round once during the 4-day mission.
  GAME_SUN_LOOP_REAL_SECONDS: 2880, // GAME BALANCE (not real data)
  SUN_START_AZIMUTH_DEG: 200, // GAME BALANCE (not real data) — where the Sun starts
  // Dark periods come from the REAL horizon around the base (NASA LOLA terrain, world/lola.js):
  // the low Sun hides behind real ridges and mountains (daycycle.sunVisibility).
  // Angular sizes as seen from the Moon.
  SUN_ANGULAR_DIAMETER_DEG: 0.53, // NASA Sun Fact Sheet (~1.39e6 km at ~1 AU)
  EARTH_ANGULAR_DIAMETER_DEG: 1.9, // derived: 12,742 km ÷ 384,400 km (NASA fact sheets)
  SKY_DISC_SCALE: 1.6, // GAME BALANCE (not real data) — drawn a bit bigger for small screens
  EARTH_AZIMUTH_DEG: 150, // GAME BALANCE (not real data) — Earth's fixed direction
  EARTH_ELEVATION_DEG: 4, // GAME BALANCE (not real data) — low on horizon (libration ±6.7°)
  // Real stars (src/systems/skyMath.js). The Moon spins the same way as Earth, so seen from the
  // south pole the whole sky turns COUNTER-clockwise when viewed from above (azimuth goes down).
  // The Sun's place among the stars on the first day: ecliptic longitude ≈ 48° is where the
  // Sun is around 8 May (the Stormy Sun replay date). It creeps ~1° per day (one lap a year).
  SUN_ECLIPTIC_LON_START_DEG: 48, // ≈ 8 May (from the vernal equinox, 20 March, + ~49 days)
  STAR_MAX_MAG: 5.5, // faintest stars drawn (about the naked-eye limit with no light pollution)
};

// ---------------------------------------------------------------------------
// TELESCOPE — Star Hunt mini-game (src/instances/telescope/)
// ---------------------------------------------------------------------------
export const TELESCOPE = {
  SUN_GLARE_DEG: 25, // GAME BALANCE (not real data) — the sun shutter closes this close to the Sun
  ZOOM_FOV_DEG: [70, 36, 16], // GAME BALANCE (not real data) — finder → normal → close
  LOCK_SECONDS: 1, // GAME BALANCE (not real data) — hold the target in the crosshair this long
  LOCK_RADIUS_DEG: 6, // GAME BALANCE (not real data) — "in the crosshair" (at normal zoom)
  ROUND_SECONDS: 90, // GAME BALANCE (not real data) — find + draw the constellation
  PAN_DEG_PER_S: 40, // GAME BALANCE (not real data) — keyboard panning speed at normal zoom
  STAR_SECONDS: 45, // GAME BALANCE (not real data) — finish under this for the 2nd star
};

// ---------------------------------------------------------------------------
// SOLAR ARRAY
// ---------------------------------------------------------------------------
export const SOLAR_ARRAY = {
  TRACK_SPEED_DEG_PER_SEC: 6, // GAME BALANCE (not real data) — how fast it turns
};

// ---------------------------------------------------------------------------
// PLAYER (Moon gravity is real; the rest is feel)
// ---------------------------------------------------------------------------
export const PLAYER = {
  GRAVITY: 1.62, // m/s² — NASA Moon Fact Sheet (Earth: 9.81)
  EYE_HEIGHT: 1.6, // GAME BALANCE (not real data)
  RADIUS: 0.35, // GAME BALANCE (not real data) — collision capsule radius
  HEAD_CLEARANCE: 0.25, // GAME BALANCE (not real data)
  WALK_SPEED: 2.4, // m/s — GAME BALANCE (not real data)
  RUN_SPEED: 3.8, // m/s (Shift, "loping") — GAME BALANCE (not real data)
  // Jump height = v² / (2g) = 2.0² / 3.24 ≈ 1.2 m, ~2.5 s in the air.
  JUMP_SPEED: 2.0, // m/s — GAME BALANCE (not real data)
  ACCEL: 10, // m/s² on the ground — GAME BALANCE (not real data)
  AIR_CONTROL: 0.25, // fraction of ground accel in the air — GAME BALANCE (not real data)
  MOUSE_SENSITIVITY: 1.0, // GAME BALANCE (not real data)
  INTERACT_DISTANCE: 2.4, // m — GAME BALANCE (not real data)
};

// ---------------------------------------------------------------------------
// GENTLE FAILURE
// ---------------------------------------------------------------------------
export const RECOVERY = {
  OXYGEN_RESTORE_PERCENT: 60, // GAME BALANCE (not real data)
  FOOD_RESTORE_PERCENT: 45, // GAME BALANCE (not real data)
  // Short on purpose: with a countdown to the end of the day, a long rest would HELP you.
  // A rescue is counted on the day card instead (the real cost).
  REST_GAME_HOURS: 1, // time lost resting — GAME BALANCE (not real data)
  FADE_SECONDS: 1.6, // GAME BALANCE (not real data)
};

// ---------------------------------------------------------------------------
// TRANSITIONS / UI
// ---------------------------------------------------------------------------
export const UI = {
  DOOR_FADE_SECONDS: 0.45, // GAME BALANCE (not real data)
  TOAST_SECONDS: 4, // GAME BALANCE (not real data)
};

// ---------------------------------------------------------------------------
// ELECTROLYSIS (Molecule Zapper mini-game) — 2 H₂O → 2 H₂ + O₂. See SCIENCE.md "Electrolysis".
// ---------------------------------------------------------------------------
export const ELECTROLYSIS = {
  // Water used per kg of oxygen made: 2 × 18 g of water gives 32 g of O₂ → 36 / 32.
  WATER_PER_KG_O2: 1.125, // stoichiometry of 2 H₂O → 2 H₂ + O₂ (molar masses H₂O 18, O₂ 32)
  // Energy to split the water: ΔfH°(H₂O, liquid) = −285.83 kJ/mol (NIST Chemistry WebBook).
  // 1 kg O₂ needs 62.5 mol of water → 62.5 × 285.83 kJ = 17.86 MJ = 4.96 kWh.
  // This is the physics MINIMUM; real electrolysers need more (shown that way in the game).
  KJ_PER_MOL_WATER: 285.83, // NIST WebBook, water (liquid) standard enthalpy of formation
  MOL_WATER_PER_KG_O2: 62.5, // 1000 g ÷ 32 g/mol × 2 (stoichiometry)
  // Real ISS Oxygen Generation Assembly, nominal rate (range 2.3–9.2 kg/day).
  ISS_O2_KG_PER_DAY_NOMINAL: 5.4, // NASA NTRS 20180006335 (range: NTRS 20080036243)
  // The station's own water tank (finite: ice mining / recycler come later).
  // 6 kg ≈ 5.3 kg of O₂: most of a first 20-min day. Filling the water walls for a storm
  // uses the same water, so then you must mine ice or order water.
  // Refilled to full every morning (DAYS); the water walls use the same tank.
  TANK_START_KG: 3, // GAME BALANCE (not real data)
  // Batches the player can choose (kg of oxygen made; the supply holds OXYGEN.CAPACITY_KG).
  BATCHES: [
    { id: 'small', label: 'Small', o2Kg: 0.1, zaps: 8 }, // GAME BALANCE (not real data)
    { id: 'medium', label: 'Medium', o2Kg: 0.2, zaps: 14 }, // GAME BALANCE (not real data)
    { id: 'big', label: 'Big', o2Kg: 0.3, zaps: 20 }, // GAME BALANCE (not real data)
  ],
  // Each missed zap wastes a little electricity (electrolysers lose some energy as heat).
  MISS_EXTRA_KWH: 0.05, // GAME BALANCE (not real data)
  // ...but never more than this share of the batch's power cost (button-mashing stays fair).
  MAX_HEAT_FRACTION: 0.25, // GAME BALANCE (not real data)
  // A batch is only allowed if the battery stays above this after paying for it.
  POWER_FLOOR_PERCENT: 5, // GAME BALANCE (not real data)
  // Arcade feel.
  MOLECULE_SPEED_PX: 70, // GAME BALANCE (not real data) — drift speed, px per second
  MAX_MOLECULES: 6, // GAME BALANCE (not real data)
  SPAWN_SECONDS: 0.9, // GAME BALANCE (not real data)
  COMBO_WINDOW_SECONDS: 1.5, // GAME BALANCE (not real data)
  // Stars from play (1–2); a right quiz answer adds 1 (max 3).
  STAR_ACCURACY: 0.75, // GAME BALANCE (not real data) — hits ÷ (hits + misses) for the 2nd star
};
ELECTROLYSIS.KWH_PER_KG_O2_MIN =
  (ELECTROLYSIS.KJ_PER_MOL_WATER * ELECTROLYSIS.MOL_WATER_PER_KG_O2) / 3600; // kJ → kWh (≈ 4.96)

// ---------------------------------------------------------------------------
// VOLT — the helper robot (behaviour and pacing only; all GAME BALANCE)
// ---------------------------------------------------------------------------
export const ASSISTANT = {
  FOLLOW_BEHIND_M: 1.6, // GAME BALANCE (not real data) — how far behind the player
  FOLLOW_SIDE_M: 0.8, // GAME BALANCE (not real data) — and to the right
  TALK_AHEAD_M: 2.8, // GAME BALANCE (not real data) — while talking: this far in front…
  TALK_SIDE_M: 1.4, // GAME BALANCE (not real data) — …and to the right, so you can see Volt
  TALK_REACH_M: 3.5, // GAME BALANCE (not real data) — "E to talk" works this close…
  TALK_AIM_DEG: 22, // GAME BALANCE (not real data) — …when Volt is this near the crosshair
  SPEED_M_S: 4.6, // GAME BALANCE (not real data) — top rolling speed (faster than a lope, so he can lead)
  RADIUS_M: 0.32, // GAME BALANCE (not real data) — collision circle
  CATCH_UP_M: 8, // GAME BALANCE (not real data) — farther than this → Volt hops to you
  COOLDOWN_S: 20, // GAME BALANCE (not real data) — quiet time between non-urgent lines
  TOUR_GAP_S: 2.5, // GAME BALANCE (not real data) — pause before the next tour step
  TOUR_REMIND_S: 30, // GAME BALANCE (not real data) — repeat a tour step if nothing happens
  FACT_EVERY_S: 180, // GAME BALANCE (not real data) — an idle science fact this often
  BUBBLE_BASE_S: 3.5, // GAME BALANCE (not real data) — bubble time = base + per word
  BUBBLE_PER_WORD_S: 0.3, // GAME BALANCE (not real data)
  STALE_S: 25, // GAME BALANCE (not real data) — drop queued news older than this
  TOUR_WALK_M: 3, // GAME BALANCE (not real data) — tour step 1: walk this far
  NEAR_ARRAY_M: 9, // GAME BALANCE (not real data) — tour step 6: this close to the array
  TANK_LOW_KG: 2.5, // GAME BALANCE (not real data) — Volt warns when the water tank is this low
  // Volt's voice — speech engine (eSpeak via meSpeak) + soft Web Audio "friendly robot" effects.
  // Goal: warm, cute, a little feminine, never scary (no harsh metallic buzz).
  VOICE_VARIANT: 'f3', // GAME BALANCE (not real data) — eSpeak female 3: the most melodic, friendly
  VOICE_ENGINE_PITCH: 55, // GAME BALANCE (not real data) — 0–99; measured ≈ 210 Hz before the lift
  // Heard speed = ENGINE_SPEED × PLAYBACK_RATE ≈ 150 words/min (calm for young listeners).
  VOICE_ENGINE_SPEED: 137, // GAME BALANCE (not real data) — words per minute before the lift
  VOICE_PLAYBACK_RATE: 1.1, // GAME BALANCE (not real data) — gentle lift: ≈ 230 Hz, childlike
  VOICE_VOLUME: 0.9, // GAME BALANCE (not real data)
  ROBOT_CHORUS_MS: 12, // GAME BALANCE (not real data) — soft "digital" shimmer (a chorus)…
  ROBOT_CHORUS_DEPTH_MS: 2.5, // GAME BALANCE (not real data)
  ROBOT_CHORUS_HZ: 0.9, // GAME BALANCE (not real data) — …that slowly sways
  ROBOT_CHORUS_MIX: 0.35, // GAME BALANCE (not real data) — 0 = clean voice
  ROBOT_COMB_MS: 3, // GAME BALANCE (not real data) — a faint robot tint, not a tin can
  ROBOT_COMB_FEEDBACK: 0.2, // GAME BALANCE (not real data)
  ROBOT_COMB_MIX: 0.12, // GAME BALANCE (not real data)
  ROBOT_HIGHPASS_HZ: 120, // GAME BALANCE (not real data) — trims rumble only
  ROBOT_WARMTH_DB: 2, // GAME BALANCE (not real data) — a little warmth around 350 Hz
  ROBOT_LOWPASS_HZ: 6500, // GAME BALANCE (not real data) — rounds off harsh highs
  ROBOT_CHIRP: true, // GAME BALANCE (not real data) — soft "bip-bip" before Volt talks
  ROBOT_CHIRP_GAIN: 0.07, // GAME BALANCE (not real data) — quiet, so it never startles
  // Fallback only (browser voice, if the robot engine cannot load). Pitch 0–2, rate 0.1–10.
  VOICE_PITCH: 1.6, // GAME BALANCE (not real data)
  VOICE_RATE: 0.95, // GAME BALANCE (not real data)
};

// ---------------------------------------------------------------------------
// RADIATION — solar particle storms (real DONKI + RadLab replays) and the storm shelter.
// See docs/SCIENCE.md "Radiation and shielding". Dose is shown as % of a per-storm safety
// limit (NASA plans shielding against a limit per big particle event); the PDA keeps the
// mission total, which never goes down (dose adds up — it does not "heal").
// ---------------------------------------------------------------------------
export const RADIATION = {
  // --- turning real data into storms
  SEP_GROUP_HOURS: 6, // GAME BALANCE (not real data) — SEP records this close = one storm
  RATIO_FOR_FULL_INTENSITY: 300, // GAME BALANCE (not real data) — CRaTER dose rate ×300 quiet = strongest
  MIN_INTENSITY: 0.25, // GAME BALANCE (not real data)
  DEFAULT_INTENSITY: 0.5, // GAME BALANCE (not real data) — when no RadLab measurement exists (Live)
  // --- warning and storm timing (game hours; 1 game hour = 30 real seconds)
  MIN_WARNING_GAME_HOURS: 2, // GAME BALANCE (not real data) — at least 60 s to reach the shelter
  MAX_WARNING_GAME_HOURS: 3, // GAME BALANCE (not real data)
  DEFAULT_LEAD_GAME_HOURS: 1, // particles "in less than an hour" (NASA Science, see SCIENCE.md)
  STORM_GAME_HOURS: 2, // GAME BALANCE (not real data) — real particle storms last hours to days
  // --- dose (all in % of the per-storm limit)
  STORM_DOSE_PER_GAME_HOUR: 175, // GAME BALANCE (not real data) — strongest storm, no shielding (2 h × 175 = the old 5 h × 70)
  // Where you are while particles arrive (fraction of the dose that gets through).
  LOCATION_FACTOR: {
    outside: 1.0, // GAME BALANCE (not real data) — a spacesuit gives little protection
    greenhouse: 0.7, // GAME BALANCE (not real data) — thin walls
    habitat: 0.5, // GAME BALANCE (not real data)
    // Artemis I: Orion's storm-shelter spot got much less dose than less-shielded spots (DLR /
    // Nature 2024, measured in Earth's radiation belts). The exact factor here is game balance.
    // 0.35: the shelter alone is enough for the weaker May-2024 storms but not for the two
    // strongest (11 + 14 May) — those need water in the walls (SCIENCE.md "Game balance").
    shelter: 0.35, // GAME BALANCE (not real data)
  },
  // Water walls: more water between you and the Sun = less dose (mass shielding).
  WALL_CAPACITY_KG: 6, // GAME BALANCE (not real data) — real shelters would need tonnes
  WALL_HALF_KG: 3, // GAME BALANCE (not real data) — this much water halves the shelter dose
  PUMP_KWH_PER_KG: 0.05, // GAME BALANCE (not real data) — moving water costs a little power
  RING_LINGER_S: 6, // GAME BALANCE (not real data) — dose ring stays visible after a storm
  // Storm look + sound (ui/stormFx.js), at the strongest unshielded dose rate:
  FX_SNOW_PER_SECOND: 170, // GAME BALANCE (not real data) — camera-"snow" speckles spawned per second
  FX_SNOW_MAX: 90, // GAME BALANCE (not real data) — most speckles on screen at once
  FX_CLICKS_PER_SECOND: 14, // GAME BALANCE (not real data) — dosimeter ticks per second
};

// ---------------------------------------------------------------------------
// FARMING — optional potato pots in the greenhouse (src/farming/)
// ---------------------------------------------------------------------------
export const FARMING = {
  START_SEED_POTATOES: 3, // GAME BALANCE (not real data)
  // Packaged space meals from Earth in the galley store at the start (the farm takes days to
  // give its first harvest: the first potatoes come on Day 3). NASA BVAD counts food per day;
  // one meal = a third of a day. 3 meals + Day 1's 60 % carry a careful player to Day 3.
  START_SPACE_MEALS: 3, // GAME BALANCE (not real data)
  POT_COUNT: 4, // pots in the greenhouse (2 stands × 2) — level layout
  // Days are shifts now (see DAYS): plants grow OVERNIGHT, one step per night, and only if the
  // grow lights were on for at least this share of the day (light is what plants grow with).
  LIGHT_SHARE_TO_GROW: 0.5, // GAME BALANCE (not real data)
  // Potato: planted on day N, ready on day N + 2 (owner's design). Real potatoes take months;
  // no real number is shown until SCIENCE.md has a verified source (Needs verification).
  GROW_NIGHTS: 2, // GAME BALANCE (not real data)
  // A potato pot is cut 2 times: one "potato" goes back into the soil as the next seed potato,
  // the other is eaten. One game potato = a whole plant's harvest, about half a day of food.
  CUTS_TO_HARVEST: 2, // GAME BALANCE (not real data)
  POTATOES_PER_STEM: 1, // GAME BALANCE (not real data)
  COVER_LOADS: 3, // handfuls of soil to cover the seed potato — GAME BALANCE (not real data)
  WATER_NEEDED: 120, // water drops that must land on the soil — GAME BALANCE (not real data)
  POUR_ANGLE_DEG: 35, // the can pours once tilted past this — GAME BALANCE (not real data)
};
FARMING.HARVEST_YIELD = FARMING.CUTS_TO_HARVEST * FARMING.POTATOES_PER_STEM; // "potatoes" per plant
// Food energy per 100 g, raw — USDA FoodData Central (SR Legacy):
FARMING.KCAL_PER_100G = {
  potato: 77, // "Potatoes, flesh and skin, raw", FDC 170026
  lettuce: 17, // "Lettuce, cos or romaine, raw", FDC 169247
  radish: 16, // "Radishes, raw", FDC 169276
};
// BVAD food: 12.778 MJ per 0.8 kg of dry food → the gauge counts food as "dry kg"; 1 kcal = 4184 J.
FARMING.FOOD_KG_PER_KCAL = (4184 / 1e6) * (BVAD.FOOD_KG_PER_DAY_DRY / BVAD.FOOD_MJ_PER_DAY);
// One game potato fills HALF the food gauge (owner's design, Nov 2026). The gauge holds one
// day of BVAD food (FOOD), so a game potato ≈ 0.4 kg dry ≈ 1,530 kcal ≈ 2 kg of real raw
// potatoes (USDA 77 kcal / 100 g): a whole plant's crop, not one potato. GAME BALANCE.
FARMING.POTATO_GAUGE_SHARE = 0.5; // GAME BALANCE (not real data)
FARMING.FOOD_KG_PER_POTATO = FARMING.POTATO_GAUGE_SHARE * FOOD.CAPACITY_KG;
FARMING.POTATO_FRESH_KG = FARMING.FOOD_KG_PER_POTATO / FARMING.FOOD_KG_PER_KCAL / (FARMING.KCAL_PER_100G.potato * 10);
// Real growth: radish ≈ 27 days (NASA PH-02, 2020), lettuce ≈ 33 days seed to salad (Veggie, 2015).
// In the game both are ready the next morning (1 night), potato after 2 nights. GAME BALANCE.
// itemKg = how much one harvested item weighs (a big romaine head; a handful of radishes):
// GAME BALANCE. Its food value then follows HONESTLY from USDA kcal — leafy greens and radishes
// are mostly water, so they give little energy (the owner asked for 25 % per lettuce; that would
// need ≈ 2 kg of lettuce, so it stays honest: SCIENCE.md "Food and plants").
FARMING.GREENS = {
  lettuce: { growNights: 1, coverLoads: 1, waterNeeded: 60, cuts: 1, perCut: 1, realDays: 33, itemKg: 0.6 },
  radish: { growNights: 1, coverLoads: 1, waterNeeded: 60, cuts: 3, perCut: 1, realDays: 27, itemKg: 0.1 },
};
FARMING.START_SEEDS = { lettuce: 4, radish: 4 }; // GAME BALANCE (not real data)
/** Food (gauge "dry kg") in ONE item: a potato (a plant's crop), a lettuce head, a handful of radishes, a space meal. */
FARMING.FOOD_KG_PER_ITEM = Object.fromEntries(
  Object.entries(FARMING.GREENS).map(([id, c]) => [id, c.itemKg * FARMING.KCAL_PER_100G[id] * 10 * FARMING.FOOD_KG_PER_KCAL]),
);
FARMING.FOOD_KG_PER_ITEM.potato = FARMING.FOOD_KG_PER_POTATO;
// A packaged space meal: a third of a day's BVAD food (breakfast, lunch or dinner).
FARMING.FOOD_KG_PER_ITEM['space-meal'] = BVAD.FOOD_KG_PER_DAY_DRY / 3; // BVAD daily food ÷ 3 meals

// ---------------------------------------------------------------------------
// SUPPLY REQUESTS — habitat supply terminal + cargo landing pad (src/supply/)
// ---------------------------------------------------------------------------
export const SUPPLY = {
  // Communication delay = distance ÷ speed of light. This is NOT sped up: the player
  // waits the real light-travel time, in real seconds.
  EARTH_MOON_DISTANCE_KM: 384400, // NASA Moon Fact Sheet (mean Earth–Moon distance; see SCIENCE.md)
  SPEED_OF_LIGHT_KM_S: 299792.458, // exact, by definition of the metre (SI)
  // What happens at the other end and on the way here (game clock, sped up like the rest).
  REVIEW_GAME_HOURS: 0.17, // Mission Control checks the request — GAME BALANCE (not real data)
  PREPARE_GAME_HOURS: 0.33, // packing the crate onto the lander — GAME BALANCE (not real data)
  // Flight time is shortened for the game; no real value is shown until SCIENCE.md has one.
  // Most a single delivery can carry. Less than everything at max (97 kg), so the
  // player has to choose — e.g. a battery pack leaves little room. GAME BALANCE (not real data)
  CARGO_CAPACITY_KG: 60,
  LANDING_SECONDS: 7, // the crate's powered descent, real seconds — GAME BALANCE (not real data)
  PAD_SLOTS: 6, // crates that fit on the landing pad at once — level layout
  WATER_TANK_MAX_KG: 40, // deliveries never fill the Electrolysis tank past this — GAME BALANCE (not real data)
  // Orderable supplies (names, icons and effects live in src/supply/catalog.js).
  ITEMS: {
    'solar-repair-kit': { massKg: 8, maxPerOrder: 2, deliveryGameHours: 2 }, // GAME BALANCE (not real data)
    water: { massKg: 10, maxPerOrder: 3, deliveryGameHours: 2.7, waterKg: 10 }, // 10 kg container — GAME BALANCE (not real data)
    'seed-potatoes': { massKg: 2, maxPerOrder: 3, deliveryGameHours: 1.3, potatoes: 3 }, // bag of 3 — GAME BALANCE (not real data)
    'battery-pack': { massKg: 45, maxPerOrder: 1, deliveryGameHours: 3.3, kwh: 8 }, // GAME BALANCE (not real data)
    // seeds are tiny and light — far cheaper to fly than food (GAME BALANCE amounts)
    'lettuce-seeds': { massKg: 0.1, maxPerOrder: 2, deliveryGameHours: 1.3, seeds: 6 }, // GAME BALANCE (not real data)
    'radish-seeds': { massKg: 0.1, maxPerOrder: 2, deliveryGameHours: 1.3, seeds: 6 }, // GAME BALANCE (not real data)
  },
};
// One-way light time Earth → Moon ≈ 1.28 s (SCIENCE.md: "about 1.3 seconds").
SUPPLY.ONE_WAY_DELAY_S = SUPPLY.EARTH_MOON_DISTANCE_KM / SUPPLY.SPEED_OF_LIGHT_KM_S;

// ---------------------------------------------------------------------------
// SOLAR ARRAY DAMAGE — micrometeorite hits (repaired with a Solar Panel Repair Kit)
// ---------------------------------------------------------------------------
// Real basis: micrometeoroids constantly strike the Moon (SCIENCE.md). How often one
// damages a panel, and how much power it costs, are game balance.
export const SOLAR_DAMAGE = {
  // (how often hits come is now MICROMETEOROIDS below: one scheduler for array + habitat)
  START_KITS: 1, // a spare kit in storage at the start — GAME BALANCE (not real data)
  DAMAGED_OUTPUT: 0.4, // a damaged array makes 40 % of its normal power — GAME BALANCE (not real data)
  KITS_PER_REPAIR: 1, // GAME BALANCE (not real data)
};

// ---------------------------------------------------------------------------
// MICROMETEOROID HITS — one scheduler for the solar array AND the habitat
// (src/systems/micrometeoroids.js). A hit lands on ONE of them, and no new hit comes
// while either is still broken, so the two never happen at the same time.
// Real basis: micrometeoroids strike the Moon all the time (SCIENCE.md). How often one
// breaks something, and which target it picks, are game balance.
// ---------------------------------------------------------------------------
export const MICROMETEOROIDS = {
  MEAN_GAME_DAYS_BETWEEN_HITS: 0.75, // average gap between hits (≈ 9 real min of play, ≈ 2–3 per mission) — GAME BALANCE (not real data)
  GRACE_GAME_HOURS: 2, // no hits in the first minute of play — GAME BALANCE (not real data)
  HABITAT_SHARE: 0.4, // 40 % of hits make a habitat leak, 60 % crack the array — GAME BALANCE (not real data)
  // TESTING ONLY: a hit every this many real seconds (alternating array / habitat), counted
  // while nothing is broken. Set to null for normal play.
  TEST_HIT_EVERY_REAL_SECONDS: null,
};

// ---------------------------------------------------------------------------
// HABITAT AIR LEAK — a micrometeoroid made a tiny hole in the habitat wall
// ---------------------------------------------------------------------------
// While the hole is open, cabin air rushes out. The base keeps the air topped up from
// the oxygen supply (on the ISS, controllers topped the air up with oxygen after the
// 2018 Soyuz hole: NASA ISS blog, 30 Aug 2018), so the OXYGEN gauge drains faster.
// Leak rate = choked (sonic) flow through a small hole — real physics (NASA Glenn,
// "Mass Flow Choking"): mdot = Cd · A · P · sqrt(γ / (R·T)) · (2/(γ+1))^((γ+1)/(2(γ−1)))
export const LEAK = {
  HOLE_DIAMETER_MM: 0.7, // GAME BALANCE (not real data): the 2018 Soyuz hole was 2 mm (NASA ISS blog)
  CABIN_PRESSURE_KPA: 101.3, // sea-level air pressure, as on the ISS (14.7 psi) — NASA ECLSS
  CABIN_TEMP_K: 293, // about 20 °C — GAME BALANCE (not real data), a comfortable cabin
  DISCHARGE_COEFF: 0.6, // typical for a sharp-edged hole (engineering textbooks) — simplification
  GAMMA_AIR: 1.4, // heat-capacity ratio of air (physical constant)
  R_AIR: 287.05, // J/(kg·K), specific gas constant of dry air (physical constant)
  O2_MASS_FRACTION: 0.232, // dry air is 23.2 % oxygen by mass (≈ 21 % by volume)
  REPAIR_GAME_HOURS: 1, // time that passes while you find + patch it — GAME BALANCE (not real data)
};
{
  const L = LEAK;
  const area = Math.PI * ((L.HOLE_DIAMETER_MM / 1000) / 2) ** 2; // m²
  const g = L.GAMMA_AIR;
  const choke = (2 / (g + 1)) ** ((g + 1) / (2 * (g - 1)));
  const airKgPerS = L.DISCHARGE_COEFF * area * L.CABIN_PRESSURE_KPA * 1000 * Math.sqrt(g / (L.R_AIR * L.CABIN_TEMP_K)) * choke;
  // Derived: ≈ 0.20 kg of air per hour ≈ 0.046 kg of oxygen per hour, about 1.2× what you
  // breathe inside (0.037 kg/h), so the oxygen supply drains ≈ 2.2× faster during a leak.
  L.AIR_KG_PER_HOUR = airKgPerS * 3600;
  L.O2_KG_PER_GAME_HOUR = L.AIR_KG_PER_HOUR * L.O2_MASS_FRACTION;
}

// ---------------------------------------------------------------------------
// ICE MINING — dig icy regolith in a cold trap, bake the water out (src/systems/iceMining.js)
// See docs/SCIENCE.md "Ice in cold traps". Making water here (ISRU) vs ordering it from Earth.
// ---------------------------------------------------------------------------
export const ICE = {
  // LCROSS (2009) hit Cabeus crater: the soil there held 5.6 ± 2.9 % water ice by mass
  // (Colaprete et al., Science 2010). Real ice content varies from place to place.
  ICE_MASS_FRACTION: 0.056,
  BAG_MAX_KG: 60, // GAME BALANCE (not real data) — one carry of icy soil
  SOIL_KG_PER_CHUNK: 4, // GAME BALANCE (not real data) — icy soil per chunk the drill grabs
  DRILL_ROUND_S: 45, // GAME BALANCE (not real data)
  STAR_CHUNKS: 10, // GAME BALANCE (not real data) — chunks for the 2nd star
  MEGA_CHUNKS: 3, // GAME BALANCE (not real data) — a rare big lump of icy soil counts as 3 chunks
  SCAN_CHARGES: 2, // GAME BALANCE (not real data) — scanner pulses per drill round
  SCAN_SECONDS: 3, // GAME BALANCE (not real data) — how long a scan shows the hidden ice
  // Ice Oven: heat the soil, the ice turns to vapour, a cold plate catches it as water.
  OVEN_KWH_PER_KG_SOIL: 0.05, // GAME BALANCE (not real data) — heating soil costs power
  OVEN_GAME_HOURS: 0.7, // GAME BALANCE (not real data) — one bag, start to finish (≈ 21 real s)
  // In the permanently shadowed crater the suit's heaters and helmet lamp run hard; their
  // batteries are recharged by the base, so the base battery pays while you are down there.
  COLD_TRAP_EXTRA_KW: 1.5, // GAME BALANCE (not real data)
  SPOT_COOLDOWN_GAME_HOURS: 24, // GAME BALANCE (not real data) — a dug spot rests a day
  FAIL_KEEP_FRACTION: 0.5, // GAME BALANCE (not real data) — gentle failure spills half the bag
};

// ---------------------------------------------------------------------------
// AIRLOCK — the cycle between a module and the vacuum outside (src/systems/airlock.js)
// Real airlocks pump most of the air back into the cabin, but some gas is lost every cycle
// (NASA NTRS 20080013418). A US ISS airlock loses about 1 lb ≈ 0.45 kg of air per cycle
// (University of Maryland spacecraft design course — see SCIENCE.md). Amounts here are game-sized.
// ---------------------------------------------------------------------------
export const AIRLOCK = {
  // the steps of one cycle, in real seconds (sped up: real cycles take much longer)
  CLOSE_S: 0.9, // GAME BALANCE (not real data) — the hatch behind you closes and seals
  PUMP_S: 3.2, // GAME BALANCE (not real data) — pumps move the air (out: back into the cabin)
  VENT_S: 0.6, // GAME BALANCE (not real data) — the last bit is vented to space / let in
  OPEN_S: 0.9, // GAME BALANCE (not real data) — lights go green, the far hatch opens
  PUMP_STOP_FRACTION: 0.12, // GAME BALANCE (not real data) — air left when the pumps stop
  SKIP_SPEED: 6, // GAME BALANCE (not real data) — E/Space fast-forwards after the first cycle
  O2_LOSS_KG: 0.0035, // GAME BALANCE (not real data) — oxygen lost with the vented air (1 % of the 0.35 kg supply)
  GAME_MINUTES: 15, // GAME BALANCE (not real data) — time the cycle takes on the base clock
  VOLT_LESSONS: 3, // Volt explains "sound needs air" the first 3 cycles
  // Volt's airlock fact cards (data/airlockFacts.js): the chance of one on a cycle, each fact
  // once per mission, and how long the card stays up.
  FACT_CHANCE: 0.5, // GAME BALANCE (not real data)
  FACT_SECONDS: 14, // GAME BALANCE (not real data)
};

// ---------------------------------------------------------------------------
// TRAINING DAY — Day 1 guided by Volt (src/data/trainingDay.js, src/training/)
// ---------------------------------------------------------------------------
export const TRAINING = {
  // While the training script runs, the base clock (gauges, Sun, plants, oven, deliveries)
  // runs at this fraction of its normal speed so there is time to learn, but the gauges still
  // visibly move (oxygen ≈ −3 %/min inside, −7 %/min outside). Movement is unchanged.
  // The HUD says so. After the tour, the day's 6-minute countdown starts.
  PACE: 0.15, // GAME BALANCE (not real data)
  // Steps can set their own pace (the storm drill runs at normal speed, 1).
  RUSH_SECONDS: 1.5, // the scripted delivery skips to landing within this many seconds — GAME BALANCE
};

// ---------------------------------------------------------------------------
// GUIDANCE — the glowing trail, the arrow + circle at the next machine, and Volt leading
// the way. All GAME BALANCE / presentation (not real data).
// ---------------------------------------------------------------------------
export const GUIDE = {
  // Walkable map (systems/navigation.js): paths stay this far from walls and machines.
  AGENT_R: 0.38, // GAME BALANCE (not real data) — player radius 0.35, Volt 0.32, plus a margin
  CELL_INDOOR_M: 0.15, // GAME BALANCE (not real data) — grid cell size inside the modules
  CELL_OUTDOOR_M: 0.5, // GAME BALANCE (not real data) — grid cell size on the surface
  // The surface grid covers the base, the solar array, the cargo pad and the ice crater.
  OUTDOOR_BOUNDS: { minX: -120, maxX: 100, minZ: -90, maxZ: 120 }, // GAME BALANCE (not real data)
  REPLAN_S: 0.25, // GAME BALANCE (not real data) — recompute the way this often
  // Trail of chevrons on the ground from you to the next spot.
  TRAIL_SPACING_M: 1.0, // GAME BALANCE (not real data)
  TRAIL_SPEED_M_S: 1.3, // GAME BALANCE (not real data) — chevrons flow toward the goal
  TRAIL_START_M: 1.0, // GAME BALANCE (not real data) — first chevron this far ahead of you
  TRAIL_MAX: 160, // GAME BALANCE (not real data) — at most this many chevrons
  // Volt stays ahead of you: along the trail when there is one, else in front of you.
  VOLT_LEAD_M: 3.4, // GAME BALANCE (not real data) — this far along the trail
  VOLT_AHEAD_M: 2.8, // GAME BALANCE (not real data) — no trail: this far in front…
  VOLT_AHEAD_SIDE_M: 1.1, // GAME BALANCE (not real data) — …and a little to the right
};

// Feature flags (later demos).
export const FEATURES = {
  ENABLE_WATER_GAUGE: false,
};
