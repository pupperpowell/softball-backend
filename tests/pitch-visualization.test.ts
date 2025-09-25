import { test } from "bun:test";
import { simulatePitch } from "../game/pitching.ts";
import { Player } from "../game/Player.ts";
import type { Stats } from "../game/types.ts";

function makePitcher(pitching: number): Player {
  const stats: Stats = {
    contact: 0,
    power: 0,
    running: 0,
    pitching,
    fielding: 0,
    charisma: 0,
    growth: 0,
  };
  return new Player(stats);
}

type Metrics = {
  strikeRate: number;
  ballRate: number;
  avgStrikeQ: number; // NaN if no strikes
  minStrikeQ: number; // NaN if no strikes
  maxStrikeQ: number; // NaN if no strikes
};

function simulatePitchingMetrics(pitching: number, trials = 50000): Metrics {
  const pitcher = makePitcher(pitching);

  let strikes = 0;
  let strikeQualitySum = 0;
  let strikeQualityMin = Infinity;
  let strikeQualityMax = -Infinity;

  for (let i = 0; i < trials; i++) {
    const pitch = simulatePitch(pitcher);
    if (pitch.isStrike) {
      strikes++;
      const q = pitch.pitchQuality;
      strikeQualitySum += q;
      if (q < strikeQualityMin) strikeQualityMin = q;
      if (q > strikeQualityMax) strikeQualityMax = q;
    }
  }

  const strikeRate = strikes / trials;
  const ballRate = 1 - strikeRate;
  const avgStrikeQ = strikes > 0 ? strikeQualitySum / strikes : NaN;

  return {
    strikeRate,
    ballRate,
    avgStrikeQ,
    minStrikeQ: strikes > 0 ? strikeQualityMin : NaN,
    maxStrikeQ: strikes > 0 ? strikeQualityMax : NaN,
  };
}

test("visualize strike/ball rates and strike quality by pitcher skill", () => {
  const trials = 50000;
  const MAX_PITCHING = 10;

  console.log(`\nPitch outcomes and strike quality by pitcher skill (${trials} trials per skill)\n`);
  const header = "Pitching | Strike% | Ball% | Avg StrikeQ | Min Quality | Max Quality";
  console.log(header);
  console.log("-".repeat(header.length));

  for (let ps = 0; ps <= MAX_PITCHING; ps++) {
    const { strikeRate, ballRate, avgStrikeQ, minStrikeQ, maxStrikeQ } =
      simulatePitchingMetrics(ps, trials);

    const psStr = ps.toString().padStart(8, " ");
    const strikeStr = (strikeRate * 100).toFixed(2).padStart(7, " ");
    const ballStr = (ballRate * 100).toFixed(2).padStart(6, " ");
    const avgQStr = isNaN(avgStrikeQ) ? "   N/A   " : avgStrikeQ.toFixed(2).padStart(11, " ");
    const minQStr = isNaN(minStrikeQ) ? "   N/A   " : minStrikeQ.toFixed(2).padStart(11, " ");
    const maxQStr = isNaN(maxStrikeQ) ? "   N/A   " : maxStrikeQ.toFixed(2).padStart(11, " ");

    console.log(`${psStr} | ${strikeStr} | ${ballStr} | ${avgQStr} | ${minQStr} | ${maxQStr}`);
  }

  console.log("");
});
