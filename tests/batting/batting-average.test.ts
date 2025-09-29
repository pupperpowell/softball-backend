import { test } from "bun:test";
import { simulateAtBat } from "../game/simulateAtBat.ts";
import { simulateFieldingWithRunners, type RunnersState, type PlayResult } from "../game/fielding.ts";
import type { FieldingPosition } from "../game/types.ts";
import { Player } from "../game/Player.ts";
import { Team } from "../game/Team.ts";

function makeBatter(contact: number, power: number): Player {
  return new Player(undefined, undefined, {
    contact,
    power,
    running: 5, // average
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

function makeFieldingTeam(fielding: number): Team {
  const team = new Team("Fielders");
  team.players = [];
  const positions: FieldingPosition[] = ["Pitcher", "Catcher", "First Base", "Second Base", "Third Base", "Shortstop", "Left Field", "Center Field", "Right Field"];
  for (const pos of positions) {
    const player = new Player(undefined, undefined, {
      contact: 0,
      power: 0,
      running: fielding,
      pitching: 0,
      fielding: fielding, // average fielding
      charisma: 0,
      growth: 0,
    });
    player.position = pos;
    team.players.push(player);
  }
  return team;
}

function isHit(result: string): boolean {
  return ["SINGLE", "DOUBLE", "TRIPLE", "HOME_RUN"].includes(result);
}

function simulateBattingAverage(contact: number, power: number, trials: number): { hits: number; ab: number; walks: number; ba: number; obp: number } {
  const batter = makeBatter(contact, power);
  const pitcher = makePitcher(contact);
  const fieldingTeam = makeFieldingTeam(contact);
  const emptyRunners: RunnersState = { first: undefined, second: undefined, third: undefined, outs: 0 };

  let hits = 0;
  let ab = 0;
  let walks = 0;

  for (let i = 0; i < trials; i++) {
    const atBat = simulateAtBat(batter, pitcher);
    if (atBat.outcome === "WALK") {
      walks++;
      continue;
    }
    ab++; // STRIKEOUT and IN_PLAY count as AB

    if (atBat.outcome === "IN_PLAY" && atBat.battedBall) {
      const play: PlayResult = simulateFieldingWithRunners(emptyRunners, atBat.battedBall, fieldingTeam);
      if (isHit(play.field.result)) {
        hits++;
      }
    }
    // STRIKEOUT is not a hit
  }

  const ba = ab > 0 ? hits / ab : 0;
  const obp = (ab + walks) > 0 ? (hits + walks) / (ab + walks) : 0;
  return { hits, ab, walks, ba, obp };
}

test("Estimate batting average across contact and power levels (10,000 at-bats each)", () => {
  const trials = 10000;

  console.log(
    `\nBatting Average (BA) and On-Base Percentage (OBP) estimates per ${trials.toLocaleString()} plate appearances, varying batter contact (0..10) and power (same as contact).\n` +
    "BA = hits / AB (walks excluded). OBP = (hits + walks) / (AB + walks).\n" +
    "Hits from fielding: SINGLE, DOUBLE, TRIPLE, HOME_RUN.\n" +
    "Pitcher and fielders all have the same relevant statistics as the batter. So if batter is contact/power 1, so are fielders + pitcher"
  );
  const header = "Contact Power |   Hits   |    AB    | Walks   |    BA    |    OBP   ";
  console.log(header);
  console.log("-".repeat(header.length));

  const fmtNum = (n: number) => n.toLocaleString().padStart(8, " ");
  const fmtStat = (stat: number) => " (" + (stat).toFixed(3).padStart(3, " ") + ")";

  for (let contact = 0; contact <= 10; contact++) {
      const { hits, ab, walks, ba, obp } = simulateBattingAverage(contact, contact, trials);
      const cStr = contact.toString().padStart(13, " ");
      const hitsStr = fmtNum(hits);
      const abStr = fmtNum(ab);
      const walksStr = fmtNum(walks);
      const baStr = fmtStat(ba);
      const obpStr = fmtStat(obp);
      console.log(`${cStr} | ${hitsStr} | ${abStr} | ${walksStr} | ${baStr} | ${obpStr}`);
    }

  console.log("");
});
