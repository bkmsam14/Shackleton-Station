// commDelay.js — how long a radio message takes between the habitat and Earth.
//   one-way delay    = distance ÷ speed of light
//   round-trip delay = 2 × one-way delay
// The distance is configurable (SUPPLY.EARTH_MOON_DISTANCE_KM), so a future relay
// satellite or a different supply station only changes the number, not the code.
import { SUPPLY } from '../config/gameplay.js';

export function oneWayDelaySeconds(distanceKm = SUPPLY.EARTH_MOON_DISTANCE_KM, speedKmS = SUPPLY.SPEED_OF_LIGHT_KM_S) {
  return distanceKm / speedKmS;
}

export function roundTripDelaySeconds(distanceKm, speedKmS) {
  return 2 * oneWayDelaySeconds(distanceKm, speedKmS);
}
