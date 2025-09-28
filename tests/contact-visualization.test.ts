import { test } from "bun:test";
import { calculateHit } from "../game/batting.ts";
import { Player } from "../game/Player.ts";
import type { ThrownPitch, Stats } from "../game/types.ts";

function makePlayer(contact: number): Player {
  const stats: Stats = {
    contact,
    power: 0,
    running: 0,
    pitching: 0,
    fielding: 0,
    charisma: 0,
    growth: 0,
  };
  return new Player(undefined, undefined, stats);
}

// Use fixed players and construct pitches so that skillDiff = batter.contact - pitch.pitchQuality
// Setting batter.contact = 10 and pitch.pitchQuality = 10 - skillDiff yields skillDiff exactly.
const batter = makePlayer(10);
const pitcher = makePlayer(0);

function simulateContactProbability(skillDiff: number, isStrike: boolean, trials = 50000): number {
  const pitchQuality = 10 - skillDiff;
  let contactCount = 0;

  const pitch: ThrownPitch = {
    pitcher,
    isStrike,
    pitchQuality,
  };

  for (let i = 0; i < trials; i++) {
    const result = calculateHit(batter, pitch);
    if (result) contactCount++;
  }
  return contactCount / trials;
}

test("visualize contact probability by skillDiff (-10..10)", () => {
  const trials = 50000;

  const header = "skillDiff | Strike Contact% | Ball Contact%";
  console.log(`\nContact probability by skillDiff (${trials} trials per diff)\n`);
  console.log(header);
  console.log("-".repeat(header.length));

  for (let d = -10; d <= 10; d++) {
    const strikeProb = simulateContactProbability(d, true, trials);
    const ballProb = simulateContactProbability(d, false, trials);

    const dStr = d.toString().padStart(8, " ");
    const sStr = ((strikeProb * 100).toFixed(1) + "%").padStart(16, " ");
    const bStr = ((ballProb * 100).toFixed(1) + "%").padStart(15, " ");

    console.log(`${dStr} | ${sStr} | ${bStr}`);
  }
  console.log("");
});
