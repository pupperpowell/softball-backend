import { simulatePitch } from "./pitching";
import { calculateHit, calculateSwing } from "./batting";
import type { AtBatOutcome, BattedBall, ThrownPitch } from "./types";
import { Player } from "./Player";

/**
 * Simulate a complete plate appearance between a batter and pitcher.
 *
 * Rules implemented:
 * - 4 balls = WALK
 * - 3 strikes = STRIKEOUT
 * - Swinging strike is a strike regardless of pitch location
 * - Foul balls are strikes until 2 strikes (cannot strike out on a foul)
 * - Fair batted ball ends the at-bat with IN_PLAY (downstream fielding resolves outcome)
 */
export interface AtBatResult {
  outcome: AtBatOutcome;
  balls: number;
  strikes: number;
  pitches: ThrownPitch[];
  swings: boolean[];
  battedBall?: BattedBall; // present when outcome is IN_PLAY
}

export function simulateAtBat(batter: Player, pitcher: Player): AtBatResult {
  let balls = 0;
  let strikes = 0;
  const pitches: ThrownPitch[] = [];
  const swings: boolean[] = [];
  let battedBall: BattedBall | undefined;

  // Safety guard to avoid infinite loops in pathological RNG cases
  const MAX_PITCHES = 30;

  for (let i = 0; i < MAX_PITCHES; i++) {
    const pitch = simulatePitch(pitcher);
    pitches.push(pitch);

    const swung = calculateSwing(batter.stats.contact, pitch.isStrike);
    swings.push(swung);

    if (!swung) {
      // Taken pitch
      if (pitch.isStrike) {
        strikes++;
        if (strikes >= 3) {
          return { outcome: "STRIKEOUT", balls, strikes, pitches, swings };
        }
      } else {
        balls++;
        if (balls >= 4) {
          return { outcome: "WALK", balls, strikes, pitches, swings };
        }
      }
      continue;
    }

    // Batter swung
    const contact = calculateHit(batter, pitch);

    if (!contact) {
      // Whiff
      strikes++;
      if (strikes >= 3) {
        return { outcome: "STRIKEOUT", balls, strikes, pitches, swings };
      }
      continue;
    }

    // Made contact
    if (contact.foul) {
      // Foul balls count as strikes, but cannot strike out on a foul
      if (strikes < 2) {
        strikes++;
      }
      continue;
    }

    // Fair ball in play ends the at-bat here
    battedBall = contact;
    return {
      outcome: "IN_PLAY",
      balls,
      strikes,
      pitches,
      swings,
      battedBall,
    };
  }

  // Fallback (should be rare): bias toward the most likely unresolved result
  return {
    outcome: strikes >= 2 ? "STRIKEOUT" : "WALK",
    balls,
    strikes,
    pitches,
    swings,
    battedBall,
  };
}
