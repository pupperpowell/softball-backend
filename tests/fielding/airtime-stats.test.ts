import { test } from "bun:test";
import { calculateAirTime } from "../../game/fielding.ts";
import { simulatePitch } from "../../game/pitching.ts";
import { calculateSwing, calculateHit } from "../../game/batting.ts";
import { Player } from "../../game/Player.ts";
import type { BattedBall } from "../../game/types.ts";

function makeBatter(contact: number, power: number): Player {
  return new Player(undefined, undefined, {
    contact,
    power,
    running: 0,
    pitching: 0,
    fielding: 0,
    charisma: 0,
    growth: 0,
  });
}

function makePitcher(pitching: number): Player {
  return new Player(undefined, undefined, {
    contact: 0,
    power: 0,
    running: 0,
    pitching,
    fielding: 0,
    charisma: 0,
    growth: 0,
  });
}

function collectFairBalls(contact: number, power: number, targetBalls: number): BattedBall[] {
  const batter = makeBatter(contact, power);
  const pitcher = makePitcher(5); // Fixed average pitcher skill
  const balls: BattedBall[] = [];

  let attempts = 0;
  const maxAttempts = targetBalls * 100; // Generous cap

  while (balls.length < targetBalls && attempts < maxAttempts) {
    attempts++;
    const pitch = simulatePitch(pitcher);
    const swung = calculateSwing(batter.stats.contact, pitch.isStrike);
    if (!swung) continue;
    const result = calculateHit(batter, pitch);
    if (result && !result.foul) {
      balls.push(result);
    }
  }

  return balls;
}

function computeAirtimeStats(balls: BattedBall[]): { min: number; avg: number; max: number } {
  if (balls.length === 0) {
    return { min: 0, avg: 0, max: 0 };
  }
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const ball of balls) {
    const t = calculateAirTime(ball);
    sum += t;
    min = Math.min(min, t);
    max = Math.max(max, t);
  }
  return {
    min,
    avg: sum / balls.length,
    max,
  };
}

test("min/avg/max airtime for fair hit balls varying contact (power fixed at 5)", () => {
  const targetBalls = 5000;
  const fixedPower = 5;

  console.log(`\nMin/Avg/Max airtime (seconds) for fair hit balls, varying contact 0-10 (power=${fixedPower} fixed)\n`);
  console.log(`(${targetBalls.toLocaleString()} fair balls per contact level)\n`);
  console.log("Using full simulation: pitch → swing → contact → airtime");

  const header = "Contact |  Min (s)  |  Avg (s)  |  Max (s)";
  console.log(header);
  console.log("-".repeat(header.length));

  for (let contact = 0; contact <= 10; contact++) {
    const balls = collectFairBalls(contact, fixedPower, targetBalls);
    const stats = computeAirtimeStats(balls);
    const contactStr = contact.toString().padStart(7, " ");
    const minStr = stats.min.toFixed(2).padStart(10, " ");
    const avgStr = stats.avg.toFixed(2).padStart(10, " ");
    const maxStr = stats.max.toFixed(2).padStart(10, " ");
    const ballCount = balls.length > 0 ? `(${balls.length} balls)` : "(0 balls)";
    console.log(`${contactStr} | ${minStr} | ${avgStr} | ${maxStr} | ${ballCount}`);
  }
  console.log("");
});

test("min/avg/max airtime for fair hit balls varying power (contact fixed at 5)", () => {
  const targetBalls = 5000;
  const fixedContact = 5;

  console.log(`\nMin/Avg/Max airtime (seconds) for fair hit balls, varying power 0-10 (contact=${fixedContact} fixed)\n`);
  console.log(`(${targetBalls.toLocaleString()} fair balls per power level)\n`);
  console.log("Using full simulation: pitch → swing → contact → airtime");

  const header = "Power   |  Min (s)  |  Avg (s)  |  Max (s)";
  console.log(header);
  console.log("-".repeat(header.length));

  for (let power = 0; power <= 10; power++) {
    const balls = collectFairBalls(fixedContact, power, targetBalls);
    const stats = computeAirtimeStats(balls);
    const powerStr = power.toString().padStart(7, " ");
    const minStr = stats.min.toFixed(2).padStart(10, " ");
    const avgStr = stats.avg.toFixed(2).padStart(10, " ");
    const maxStr = stats.max.toFixed(2).padStart(10, " ");
    const ballCount = balls.length > 0 ? `(${balls.length} balls)` : "(0 balls)";
    console.log(`${powerStr} | ${minStr} | ${avgStr} | ${maxStr} | ${ballCount}`);
  }
  console.log("");
});
