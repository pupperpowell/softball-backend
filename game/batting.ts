import { clamp, normal, randomNormal } from "./math";
import type { SwingResult, ThrownPitch } from "./types";
import type { Player } from "./Player";

// Tunable probability curve parameters for batted-ball angles

// Launch angle ranges and sweet spot
const LAUNCH_MIN = -135;
const LAUNCH_MAX = 135;
const LAUNCH_SWEET_MEAN = 20; // center of sweet spot (8–32°)
const LAUNCH_SWEET_STDEV_MIN = 8;   // tighter at high skill
const LAUNCH_SWEET_STDEV_MAX = 35;  // looser at low skill
const LAUNCH_SWEET_WEIGHT_MIN = 0.20; // weight of sweet-spot mode at skill=0
const LAUNCH_SWEET_WEIGHT_MAX = 0.70; // weight at skill=10
// Background randomness for low-skill contact
const LAUNCH_BACKGROUND_STDEV = 90;

// Attack/horizontal spray angle
const ATTACK_MIN = -90;
const ATTACK_MAX = 90;
const ATTACK_CENTER_MEAN = 0;
const ATTACK_CENTER_STDEV_MIN = 12; // tighter at high skill
const ATTACK_CENTER_STDEV_MAX = 35; // looser at low skill
const ATTACK_CENTER_WEIGHT_MIN = 0.45; // chance ball is fair (in [-45,45]) at skill=0
const ATTACK_CENTER_WEIGHT_MAX = 0.90; // at skill=10
const ATTACK_FOUL_MEAN = 75; // around the foul lines
const ATTACK_FOUL_STDEV = 12;


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

    // positive values favor batter, negative values favor pitcher
    const skillDiff = skill - difficulty; 

    let contact: boolean;
    if (pitch.isStrike) {
        const contactChance = normal(skillDiff + 1, 5);
        contactChance > Math.random() ? contact = true : contact = false;
    } else {
        const contactChance = normal(skillDiff - 2, 5);
        contactChance > Math.random() ? contact = true : contact = false;
    }

    /**
     * At contact score 0, the probability of any possible launch or attack angle is nearly random.
     * As contact scores rise, the probabilitiy of hitting the "sweet spot" rises.
     * As contact scores rise, the probability of putting the ball in play rises.
     */

    // Launch angle: mixture of sweet-spot mode and near-random background
    // Focus scales with batter contact (0..1)
    const focus = clamp(skill / 10, 0, 1);

    const sweetWeight = LAUNCH_SWEET_WEIGHT_MIN + (LAUNCH_SWEET_WEIGHT_MAX - LAUNCH_SWEET_WEIGHT_MIN) * focus;
    const sweetStdev =
        LAUNCH_SWEET_STDEV_MAX - (LAUNCH_SWEET_STDEV_MAX - LAUNCH_SWEET_STDEV_MIN) * focus;

    let launch: number;
    if (Math.random() < sweetWeight) {
        // Skilled hitters concentrate outcomes in the sweet spot with tighter variance
        launch = normal(LAUNCH_SWEET_MEAN, sweetStdev);
    } else {
        // Low skill produces near-random outcomes; blend uniform with a very broad normal
        const uniform = LAUNCH_MIN + Math.random() * (LAUNCH_MAX - LAUNCH_MIN);
        const broad = normal(LAUNCH_SWEET_MEAN, LAUNCH_BACKGROUND_STDEV);
        // Slightly bias toward broad normal with skill, but keep mostly uniform at low skill
        const t = focus * 0.5; // cap influence so randomness remains
        launch = uniform * (1 - t) + broad * t;
    }
    launch = clamp(launch, LAUNCH_MIN, LAUNCH_MAX);

    // Attack angle (spray): center field is 0°, LF negative, RF positive
    // Higher contact increases probability of staying fair (within ~±45°) and reduces spread
    const centerWeight =
        ATTACK_CENTER_WEIGHT_MIN + (ATTACK_CENTER_WEIGHT_MAX - ATTACK_CENTER_WEIGHT_MIN) * focus;
    const centerStdev =
        ATTACK_CENTER_STDEV_MAX - (ATTACK_CENTER_STDEV_MAX - ATTACK_CENTER_STDEV_MIN) * focus;

    let attack: number;
    if (Math.random() < centerWeight) {
        // Fair territory tendency with tighter cone at higher skill
        attack = normal(ATTACK_CENTER_MEAN, centerStdev);

        // Softly encourage in-play bounds [-45, 45] more as skill rises
        const inPlay = 45;
        if (attack < -inPlay) attack = -inPlay + (attack + inPlay) * (1 - focus * 0.5);
        if (attack > inPlay) attack = inPlay + (attack - inPlay) * (1 - focus * 0.5);
    } else {
        // Foul tendency: cluster near the lines with some spread, random side
        const sign = Math.random() < 0.5 ? -1 : 1;
        attack = sign * normal(ATTACK_FOUL_MEAN, ATTACK_FOUL_STDEV);
    }
    attack = clamp(attack, ATTACK_MIN, ATTACK_MAX);

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
