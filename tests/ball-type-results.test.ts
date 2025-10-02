import { test } from "bun:test";
import { simulateAtBat } from "../game/simulateAtBat.ts";
import { simulateFielding, isHit } from "../game/fielding.ts";
import { calculateAirTime } from "../game/fielding/ball-classification.ts";
import { assignFielder } from "../game/fielding/fielder-assignment.ts";
import type { BattedBall, FieldOutcome, RunnersState, FieldingPosition } from "../game/types.ts";
import { Player } from "../game/Player.ts";
import { Team } from "../game/Team.ts";
import { Game } from "../game/Game.ts";

function makeBatter(contact: number, power: number): Player {
  return new Player(undefined, undefined, {
    contact,
    power,
    running: Math.random() * 10, // average
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
    pitching: Math.random() * 10,
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
    const stat = Math.random() * 10;
    const player = new Player(undefined, undefined, {
      contact: 0,
      power: 0,
      running: stat,
      pitching: 0,
      fielding: stat, // average fielding
      charisma: 0,
      growth: 0,
    });
    player.activePosition = pos;
    team.players.push(player);
  }
  return team;
}

function classifyDetailed(ball: BattedBall): string {
  const launch = ball.launch;
  if (launch < 10) {
    return "ground";
  } else if (launch < 25) {
    return "line";
  }
  // Air ball
  const airTime = calculateAirTime(ball);
  const thetaRad = (launch * Math.PI) / 180;
  const vMps = ball.velo * 0.44704; // mph to m/s
  const horizontalSpeed = vMps * Math.cos(thetaRad);
  const distanceMeters = horizontalSpeed * airTime;
  const isInfield = distanceMeters < 30;
  const isPop = launch >= 60;
  if (isInfield) {
    return isPop ? "infield pop" : "infield fly";
  } else {
    return isPop ? "outfield pop" : "outfield fly";
  }
}

test("Ball hit type distribution and outcomes over 20,000 in-play balls", () => {
  const targetInPlay = 1000000;
  const contact = Math.random() * 11;
  const power = Math.random() * 11;
  const pitching = Math.random() * 11;
  const fielding = Math.random() * 11;

  const batter = makeBatter(contact, power);
  const pitcher = makePitcher(pitching);
  const fieldingTeam = makeFieldingTeam(fielding);
  const dummyAwayTeam = new Team("Away");
  const game = new Game(fieldingTeam, dummyAwayTeam);

  let inPlayCount = 0;
  const typeCounts: Record<string, number> = {};
  const typeHits: Record<string, number> = {};
  const typeOuts: Record<string, number> = {};
  const categoryCounts: Record<string, Record<string, number>> = {};

  console.log(
    `\nBall type distribution and outcomes for ${targetInPlay.toLocaleString()} in-play balls.\n` +
    `Batter contact/power: random, Pitcher pitching: random, Fielding: random\n`
  );

  while (inPlayCount < targetInPlay) {
    const atBat = simulateAtBat(batter, pitcher);
    if (atBat.outcome !== "IN_PLAY" || !atBat.battedBall) {
      continue;
    }

    const ball = atBat.battedBall;
    inPlayCount++;
    
    const ballType = classifyDetailed(ball);
    
    typeCounts[ballType] = (typeCounts[ballType] || 0) + 1;
    typeHits[ballType] = typeHits[ballType] || 0;
    typeOuts[ballType] = typeOuts[ballType] || 0;
    
    const fielderAssignment = assignFielder(ball, game);
    const initialIsInfield = fielderAssignment.isInfield;
    
    const play: FieldOutcome = simulateFielding(ball, game);
    
    const finalIsInfield = play.primary_fielder.isInfielder();
    let fieldingCategory: string;
    if (finalIsInfield) {
      fieldingCategory = "infield";
    } else if (initialIsInfield) {
      fieldingCategory = "infield_to_outfield";
    } else {
      fieldingCategory = "outfield";
    }
    
    if (!categoryCounts[ballType]) {
      categoryCounts[ballType] = {};
    }
    categoryCounts[ballType][fieldingCategory] = (categoryCounts[ballType][fieldingCategory] || 0) + 1;
    if (isHit(play.playType)) {
      typeHits[ballType]++;
    } else {
      typeOuts[ballType]++;
    }

    // Reset bases for isolated at-bat simulation
    game.basesOccupied = {};
  }

  console.log("Type          | Count    |   %   | Hits % | Outs % | Infield % | I->O % | Outfield %");
  console.log("--------------|----------|-------|--------|-------|-----------|--------|------------");

  let totalHits = 0;
  let totalOuts = 0;

  const sortedTypes = Object.keys(typeCounts).sort();
  for (const type of sortedTypes) {
    const count = typeCounts[type]!;
    const hits = typeHits[type]!;
    const outs = typeOuts[type]!;
    totalHits += hits;
    totalOuts += outs;
    const pct = ((count / targetInPlay) * 100).toFixed(1);
    const hitPct = count > 0 ? ((hits / count) * 100).toFixed(1) : "0.0";
    const outPct = count > 0 ? ((outs / count) * 100).toFixed(1) : "100.0";
    
    const infieldCount = categoryCounts[type]?.infield || 0;
    const iToOCount = categoryCounts[type]?.infield_to_outfield || 0;
    const outfieldCount = categoryCounts[type]?.outfield || 0;
    const infieldPct = count > 0 ? ((infieldCount / count) * 100).toFixed(1) : "0.0";
    const iToOPct = count > 0 ? ((iToOCount / count) * 100).toFixed(1) : "0.0";
    const outfieldPct = count > 0 ? ((outfieldCount / count) * 100).toFixed(1) : "0.0";
    
    console.log(`${type.padEnd(12)} | ${count.toLocaleString().padStart(8)} | ${pct.padStart(5)} | ${hitPct.padStart(6)} | ${outPct.padStart(6)} | ${infieldPct.padStart(9)} | ${iToOPct.padStart(6)} | ${outfieldPct.padStart(10)}`);
  }

  const overallHitPct = ((totalHits / targetInPlay) * 100).toFixed(1);
  const overallOutPct = ((totalOuts / targetInPlay) * 100).toFixed(1);
  console.log(`\nOverall: Hits ${totalHits.toLocaleString()} (${overallHitPct}%), Outs ${totalOuts.toLocaleString()} (${overallOutPct}%)`);
});