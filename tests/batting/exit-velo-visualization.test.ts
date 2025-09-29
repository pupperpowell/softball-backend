import { test } from "bun:test";
import { calculateExitVelo } from "../game/batting.ts";

function simulateExitVeloStats(power: number, trials = 50000): { avg: number; min: number; max: number } {
  let total = 0;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < trials; i++) {
    const ev = calculateExitVelo(power);
    total += ev;
    if (ev < min) min = ev;
    if (ev > max) max = ev;
  }
  return { avg: total / trials, min, max };
}

test("visualize average, min, and max exit velocities by power score", () => {
  const trials = 50000;
  const MAX_POWER = 10;

  const header = "Power   | Avg EV (mph) | Min EV | Max EV";
  console.log(`\nAverage exit velocity by power score (${trials} trials per power)\n`);
  console.log(header);
  console.log("-".repeat(header.length));

  for (let p = 0; p <= MAX_POWER; p++) {
    const stats = simulateExitVeloStats(p, trials);
    const pStr = p.toString().padStart(7, " ");
    const avgStr = stats.avg.toFixed(1).padStart(12, " ");
    const minStr = stats.min.toFixed(1).padStart(7, " ");
    const maxStr = stats.max.toFixed(1).padStart(7, " ");
    console.log(`${pStr} | ${avgStr} | ${minStr} | ${maxStr}`);
  }
  console.log("");
});
