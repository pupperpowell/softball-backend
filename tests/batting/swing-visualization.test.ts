import { test } from "bun:test";
import { calculateSwing } from "../game/batting.ts";

function simulateRate(contactScore: number, isStrike: boolean, trials = 50000): number {
  let swings = 0;
  for (let i = 0; i < trials; i++) {
    if (calculateSwing(contactScore, isStrike)) swings++;
  }
  return swings / trials;
}

test("visualize swing rates by contact score for strikes vs balls", () => {
  const trials = 50000;
  const MAX_CONTACT = 10;

  const header = "Contact | Strike% | Ball%";
  console.log(`\nSwing rates by contact score (${trials} trials per condition)\n`);
  console.log(header);
  console.log("-".repeat(header.length));

  for (let cs = 0; cs <= MAX_CONTACT; cs++) {
    const strikeRate = simulateRate(cs, true, trials);
    const ballRate = simulateRate(cs, false, trials);
    const csStr = cs.toString().padStart(7, " ");
    const strikeStr = (strikeRate * 100).toFixed(1).padStart(7, " ");
    const ballStr = (ballRate * 100).toFixed(1).padStart(6, " ");
    console.log(`${csStr} | ${strikeStr} | ${ballStr}`);
  }
  console.log("");
});
