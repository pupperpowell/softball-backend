import type { Platform } from "bun";
import { normal, randomNormal } from "./normalDistribution";
import type { SwingResult, ThrownPitch } from "./types";
import type { Player } from "./Player";

/**
 * @param contactScore A measure of the batter's skill between 0 and 10
 * @param isStrike 
 * @returns If the batter swings or not
 */
export function calculateSwing(contactScore: number, isStrike: boolean): boolean {
    const startingSwingProbability = 0.60; // bad players swing at 60% of all pitches
    const strikeSwingDelta = 0.01;
    const ballSwingDelta = 0.035;

    // Base swing probability differs for strikes vs balls.
    let p: number;
    if (isStrike) {
        // Better hitters swing more at strikes.
        // every point in contact increases strike swing %chance by strikeSwingDelta
        p = startingSwingProbability + strikeSwingDelta * contactScore;
    } else {
        // Better hitters chase fewer balls.
        // every point in contact reduces ball swing %chance by ballSwingDelta
        p = startingSwingProbability - ballSwingDelta * contactScore;
    }

    // Add a touch of randomness to reflect game variability.
    // Use normal noise so most outcomes are near the mean.
    p += randomNormal() * 0.05;

    // Clamp to [0, 1].
    p = Math.max(0, Math.min(1, p));

    return Math.random() < p;
}

/**
 * Called after a batter swings at a pitch.
 * @param contactScore The contact skill of the batter (between 0 and 10)
 * @param pitchQuality How difficult the pitch is to hit (between 0 and 10)
 * @returns an object of type ThrownPitch
 */
export function calculateHit(player: Player, pitch: ThrownPitch): SwingResult {

    const difficulty = pitch.pitchQuality;
    const skill = player.stats.contact;

    const skillDiff = skill - difficulty; // positive values favor batter, negative values favor pitcher

    // TODO: calculate contact
    let contact: boolean;
    if (pitch.isStrike) {
        const contactChance = normal(skillDiff + 1, 5);
        contactChance > Math.random() ? contact = true : contact = false;
    } else {
        const contactChance = normal(skillDiff - 2, 5);
        contactChance > Math.random() ? contact = true : contact = false;
    }

  // TODO: calculate launch angle

  // TODO: calculate attack angle (-45 to 45)

  let launch: number = 0; // between 135 and -135, but targeting between 8 and 32 (sweet spot)
  let attack: number = 0; // beween -90 and 90, but targeting 0 (degrees)

  const result: SwingResult = {
    contact: contact,
    velo: 0,
    launch_angle: launch,
    attack_angle: attack,
  }

  return result;
}


/**
 * @param power The strength of a player's swing
 * @returns An off-the-bat exit velocity
 */
export function calculateExitVelo(power: number): number {
  const baseVelo = 40 * Math.cbrt(2 * power + 1) - 20;
  // Weighted randomness: values near 0 are more likely, extremes are rarer.
  // Use a normal(0, 0.1) and clamp to [-0.3, 0.3] to preserve original bounds.
  const min = -0.35;
  const max = 0.35;
  const stdev = 0.1;
  let mult = randomNormal() * stdev;
  if (mult < min) mult = min;
  if (mult > max) mult = max;
  return baseVelo * (1 + mult);
}

