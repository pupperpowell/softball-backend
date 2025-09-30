import { test } from "bun:test";
import { calculateSwing, calculateHit } from "../../game/batting.ts";
import { simulatePitch } from "../../game/pitching.ts";
import { Player } from "../../game/Player.ts";
import type { Stats } from "../../game/types.ts";

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

test("At-bat outcome rates across contact and power (10,000 pitches each)", () => {
  const trials = 10000;

  console.log(
    `\nAt-bat outcome rates per ${trials.toLocaleString()} pitches, varying batter contact (0..10) and power (0..10).\n` +
    "Each column is % of all pitches. HR is percentage of all pitches that become home runs."
  );
  const header = "Contact Power | TakenB | TakenS | Whiff |  Foul |   Hit |    HR";
  console.log(header);
  console.log("-".repeat(header.length));

  const fmt = (n: number) => ((n * 100) / trials).toFixed(1).padStart(6, " ");
  // const fmt = (n: number) => (`${n}`).padStart(6, " ");

  for (let contact = 0; contact <= 10; contact++) {
    for (let power = 0; power <= 10; power++) {
      const pitcher = makePitcher(contact);
      const batter = makeBatter(contact, power);

      let takenBalls = 0;
      let takenStrikes = 0;
      let whiffs = 0;
      let fouls = 0;
      let hits = 0;
      let hrs = 0;

      for (let i = 0; i < trials; i++) {
        const pitch = simulatePitch(pitcher);
        const swung = calculateSwing(batter.stats.contact, pitch.isStrike);

        if (!swung) {
          if (pitch.isStrike) takenStrikes++;
          else takenBalls++;
          continue;
        }

        const result = calculateHit(batter, pitch);
        if (!result) {
          whiffs++;
        } else if (result.foul) {
          fouls++;
        } else {
          hits++;
          if (result.homer) hrs++;
        }
      }

      const cStr = contact.toString().padStart(7, " ");
      const pStr = power.toString().padStart(5, " ");
      if (contact == power) {
        console.log(
          `${cStr} ${pStr} | ${fmt(takenBalls)} | ${fmt(takenStrikes)} | ${fmt(whiffs)} | ${fmt(fouls)} | ${fmt(hits)} | ${fmt(hrs)}`
        );
      }
    }
  }

  console.log("");
});
