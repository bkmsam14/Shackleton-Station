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
  // 1 in-game day = 4 real minutes (team brief).
  REAL_SECONDS_PER_GAME_DAY: 240, // GAME BALANCE (not real data)
  GAME_SECONDS_PER_DAY: 86400, // 24 h × 3600 s (definition)
  START_HOUR: 7, // GAME BALANCE (not real data) — clock shown in HUD
};
// How many times faster than real life the life-support clock runs (= 360×).
TIME.SCALE = TIME.GAME_SECONDS_PER_DAY / TIME.REAL_SECONDS_PER_GAME_DAY;
// Game hours that pass per real second (= 0.1 h/s).
TIME.GAME_HOURS_PER_REAL_SECOND = TIME.SCALE / 3600;

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
  // Size of the full supply. Inside it lasts 3 / 0.0373 kg/h ≈ 80 game h ≈ 13 real min;
  // working outside it lasts 3 / 0.086 kg/h ≈ 35 game h ≈ 6 real min.
  CAPACITY_KG: 3, // GAME BALANCE (not real data)
  // 60 % so the first-day tour can make oxygen at the Electrolysis unit right away.
  START_PERCENT: 60, // GAME BALANCE (not real data)
};

export const FOOD = {
  // A full food gauge holds this many days of food: 3 days × 0.8 kg = 2.4 kg dry food.
  // Drains in 3 × 240 s = 12 real minutes.
  CAPACITY_DAYS: 3, // GAME BALANCE (not real data)
  START_PERCENT: 90, // GAME BALANCE (not real data)
};
FOOD.CAPACITY_KG = FOOD.CAPACITY_DAYS * BVAD.FOOD_KG_PER_DAY_DRY;

export const WARNING_THRESHOLD_PERCENT = 25; // GAME BALANCE (not real data)

// ---------------------------------------------------------------------------
// BASE POWER (whole base, not the astronaut). Units: kW and kWh in GAME time.
// ---------------------------------------------------------------------------
export const POWER = {
  BATTERY_CAPACITY_KWH: 80, // GAME BALANCE (not real data) — a dark period can nearly empty it
  START_PERCENT: 70, // GAME BALANCE (not real data)
  // Loads (always on unless the battery is empty).
  HABITAT_LOAD_KW: 3, // GAME BALANCE (not real data)
  GREENHOUSE_LED_LOAD_KW: 2, // GAME BALANCE (not real data)
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
  GAME_SUN_LOOP_REAL_SECONDS: 1200, // GAME BALANCE (not real data)
  SUN_START_AZIMUTH_DEG: 200, // GAME BALANCE (not real data) — where the Sun starts
  // Azimuth range where a distant ridge hides the low Sun (dark period).
  // Simplification of real terrain shadowing — "Needs verification" in SCIENCE.md.
  RIDGE_START_AZIMUTH_DEG: 300, // GAME BALANCE (not real data)
  RIDGE_END_AZIMUTH_DEG: 345, // GAME BALANCE (not real data)
  RIDGE_FADE_DEG: 3, // GAME BALANCE (not real data) — soft sunrise/sunset edge
  // Angular sizes as seen from the Moon.
  SUN_ANGULAR_DIAMETER_DEG: 0.53, // NASA Sun Fact Sheet (~1.39e6 km at ~1 AU)
  EARTH_ANGULAR_DIAMETER_DEG: 1.9, // derived: 12,742 km ÷ 384,400 km (NASA fact sheets)
  SKY_DISC_SCALE: 1.6, // GAME BALANCE (not real data) — drawn a bit bigger for small screens
  EARTH_AZIMUTH_DEG: 150, // GAME BALANCE (not real data) — Earth's fixed direction
  EARTH_ELEVATION_DEG: 4, // GAME BALANCE (not real data) — low on horizon (libration ±6.7°)
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
  REST_GAME_HOURS: 6, // time lost resting — GAME BALANCE (not real data)
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
  TANK_START_KG: 10, // GAME BALANCE (not real data) — about 3 full oxygen refills
  // Batches the player can choose (kg of oxygen made).
  BATCHES: [
    { id: 'small', label: 'Small', o2Kg: 0.5, zaps: 8 }, // GAME BALANCE (not real data)
    { id: 'medium', label: 'Medium', o2Kg: 1.0, zaps: 14 }, // GAME BALANCE (not real data)
    { id: 'big', label: 'Big', o2Kg: 1.5, zaps: 20 }, // GAME BALANCE (not real data)
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
  SPEED_M_S: 3.4, // GAME BALANCE (not real data) — top rolling speed
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
// FARMING — optional potato pots in the greenhouse (src/farming/)
// ---------------------------------------------------------------------------
export const FARMING = {
  START_SEED_POTATOES: 3, // GAME BALANCE (not real data)
  // Each leafy stem comes up with a potato on its roots; one per harvest is replanted,
  // so only YIELD − 1 can be eaten. (HARVEST_YIELD is set below: stems × per stem.)
  POTATOES_PER_STEM: 1, // GAME BALANCE (not real data)
  POT_COUNT: 4, // pots in the greenhouse (2 stands × 2) — level layout
  TENDING_REAL_SECONDS: 30, // time to plant, cover, water and harvest one pot — GAME BALANCE (not real data)
  // Share of the astronaut's food (resting inside) the greenhouse supplies when all pots
  // are kept busy. 1 = a full farm exactly feeds you; less = you must also ration.
  FARM_FOOD_COVERAGE: 1, // GAME BALANCE (not real data)
  // Real potato plants take far longer. No real number is shown until SCIENCE.md has a
  // verified source ("Real growth times for lettuce and potato" is in Needs verification).
  GROW_REAL_SECONDS: 150, // GAME BALANCE (not real data)
  COVER_LOADS: 3, // handfuls of soil to cover the seed potato — GAME BALANCE (not real data)
  WATER_NEEDED: 120, // water drops that must land on the soil — GAME BALANCE (not real data)
  POUR_ANGLE_DEG: 35, // the can pours once tilted past this — GAME BALANCE (not real data)
  CUTS_TO_HARVEST: 3, // leafy stems to cut (each one brings up its potato) — GAME BALANCE (not real data)
};
FARMING.HARVEST_YIELD = FARMING.CUTS_TO_HARVEST * FARMING.POTATOES_PER_STEM; // potatoes per plant
// Food value of one potato, DERIVED (not a free number). In one growing cycle the
// astronaut eats (cycle ÷ day length) × the BVAD daily food; the full farm's spare
// potatoes (pots × (yield − 1)) must cover FARM_FOOD_COVERAGE of that.
// Today: 180 s ÷ 240 s × 0.8 kg = 0.6 kg per cycle ÷ 8 spare potatoes = 0.075 kg dry
// ≈ 3 % of the food gauge ≈ 2 game hours of food per potato.
FARMING.CYCLE_REAL_SECONDS = FARMING.GROW_REAL_SECONDS + FARMING.TENDING_REAL_SECONDS;
FARMING.FOOD_KG_PER_POTATO =
  (FARMING.FARM_FOOD_COVERAGE * BVAD.FOOD_KG_PER_DAY_DRY * FARMING.CYCLE_REAL_SECONDS) /
  TIME.REAL_SECONDS_PER_GAME_DAY /
  (FARMING.POT_COUNT * (FARMING.HARVEST_YIELD - 1));

// Feature flags (later demos).
export const FEATURES = {
  ENABLE_WATER_GAUGE: false,
};
