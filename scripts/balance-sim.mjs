// balance-sim.mjs — print the game balance: how each bot does over one 20-min lunar day
// (200 runs with random micrometeorite hits), the crops, the night power budget, and the
// dose of every archived storm. Run: npm run balance
import { readFileSync } from 'node:fs';
import { BOTS, simulate, simulateMany, stormTable, nightBudget, cropTable } from '../src/systems/balanceSim.js';
import { buildStorms } from '../src/systems/spaceWeather.js';

const min = (s) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : 'never');
const pct = (v) => `${Math.round(v)}%`;

console.log('\n=== Bots over one lunar day (20 real min), 200 runs each (random micrometeoroid hits: array or habitat) ===');
for (const [name, bot] of Object.entries(BOTS)) {
  const m = simulateMany(bot, 200);
  const r = simulate(bot, { seed: 1 });
  console.log(`\n${name.toUpperCase()}`);
  console.log(`  runs with a failure: ${m.failedRuns}/${m.runs}   earliest failure: ${min(m.earliestFailure)}`);
  const leaks = m.results.reduce((a, r) => a + r.leakHits, 0) / m.runs;
  console.log(`  micrometeoroid hits: ${m.meanHits.toFixed(1)} avg (${(m.meanHits - leaks).toFixed(1)} array, ${leaks.toFixed(1)} habitat leak), ${m.maxHits} max   worst blackout: ${m.worstBlackout} s`);
  console.log(`  run #1: failures ${r.failures.map((f) => `${f.cause} @ ${min(f.t)}`).join(', ') || 'none'}; hits ${r.hits}; O₂ batches ${r.o2Made}; ice bags ${r.iceBags}`);
  console.log(`          ate ${r.eaten.potato} potatoes, ${r.eaten.lettuce} lettuce, ${r.eaten.radish} radishes`);
  console.log(`          lowest O₂ ${pct(r.lowest.oxygen)} food ${pct(r.lowest.food)} power ${pct(r.lowest.power)} tank ${r.lowest.tankKg.toFixed(1)} kg`);
  console.log(`          end    O₂ ${pct(r.end.oxygen)} food ${pct(r.end.food)} power ${pct(r.end.power)} tank ${r.end.tankKg.toFixed(1)} kg`);
}

console.log('\n=== Crops (food per pot) ===');
for (const c of cropTable()) {
  console.log(`  ${c.id.padEnd(8)} grows ${String(c.growSeconds).padStart(3)} s   ${c.perItemPct.toFixed(2)}% each   ${c.perHarvestPct.toFixed(1)}% per harvest   ${c.pctPerMinute.toFixed(2)}%/min`);
}

const n = nightBudget();
console.log('\n=== The long night ===');
console.log(`  ${n.nightRealSeconds} real s = ${n.nightGameHours.toFixed(1)} game h`);
console.log(`  grow lights ON:  ${n.kwhLightsOn.toFixed(0)} kWh needed (battery ${n.batteryKwh})`);
console.log(`  grow lights OFF: ${n.kwhLightsOff.toFixed(0)} kWh needed`);

const data = JSON.parse(readFileSync(new URL('../public/data/space-weather-2024-05.json', import.meta.url)));
console.log('\n=== Storm dose, % of the per-storm limit (>100% = gentle failure) ===');
console.log('  day         strength  outside  habitat  shelter(0/2/4/6 kg water)');
for (const s of stormTable(buildStorms(data))) {
  const sh = Object.values(s.shelter).map((v) => pct(v).padStart(4)).join(' ');
  console.log(`  ${s.day}  ${s.intensity.toFixed(2).padStart(8)}  ${pct(s.outside).padStart(7)}  ${pct(s.habitat).padStart(7)}  ${sh}`);
}
console.log('');
