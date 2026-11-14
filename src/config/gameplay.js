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
};
// Derived: oxygen drains this many times faster outside than inside (≈ 2.31).
BVAD.EVA_TO_NOMINAL_O2_RATIO = BVAD.O2_KG_PER_HOUR_EVA / (BVAD.O2_KG_PER_DAY_NOMINAL / 24);

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
  START_PERCENT: 100, // GAME BALANCE (not real data)
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

// Feature flags (later demos).
export const FEATURES = {
  ENABLE_WATER_GAUGE: false,
};
