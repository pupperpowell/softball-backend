import { test } from "bun:test";
import { calculateAirTime } from "../game/fielding.ts";
import { Player } from "../game/Player.ts";
import type { BattedBall } from "../game/types.ts";

function makeBall(velo: number, launch: number, attack = 0): BattedBall {
  return {
    batter: new Player(),
    velo,
    foul: false,
    homer: false,
    attack,
    launch,
  };
}

test("visualize air time (seconds) by launch angle and exit velocity", () => {
  const launches = [-10, 0, 10, 20, 30, 40, 50, 60, 70, 80, 90];
  const velos = [40, 60, 80, 100];

  console.log("\nEstimated air time (s) by launch angle and exit velocity\n");
  const header =
    "Launch↓  |" +
    velos.map((v) => `${v} mph`.padStart(9, " ")).join(" | ");
  console.log(header);
  console.log("-".repeat(header.length));

  for (const la of launches) {
    const rowTimes = velos.map((v) => {
      const t = calculateAirTime(makeBall(v, la));
      return t.toFixed(2).padStart(9, " ");
    });
    console.log(`${la.toString().padStart(7, " ")} | ${rowTimes.join(" | ")}`);
  }
  console.log("");
});
