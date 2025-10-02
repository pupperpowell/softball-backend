import type { RunnersState, BattedBall } from "../types.ts";
import { Player } from "../Player.ts";
import type { Game } from "../Game.ts";
import { debugLog } from "../../utils/debug.ts";

export interface HomeRunOutcome {
  runsScored: number;
  playType: "HOME_RUN";
  updatedBases: RunnersState; // always empty
}

export function getRunsFromHomer(runners: RunnersState): number {
  let runs = 0;
  if (runners.third) {
    runs++;
  }
  if (runners.second) {
    runs++;
  }
  if (runners.first) {
    runs++;
  }
  const total = runs + 1;
  debugLog(`[FIELDING DEBUG]: getRunsFromHomer: runners on ${Object.keys(runners).filter(k => runners[k as keyof RunnersState]).join(', ')}, total runs: ${total}`);
  return total;
}

export function isHit(result: string): boolean {
  return ["SINGLE", "DOUBLE", "TRIPLE", "HOME_RUN"].includes(result);
}

/**
 * Determine play type based on where batter ended up
 */
export function determinePlayType(batter: Player, finalBases: RunnersState, outsRecorded: number): "SINGLE" | "DOUBLE" | "TRIPLE" | "HOME_RUN" | "OUT" | "DOUBLE_PLAY" | "TRIPLE_PLAY" {
  if (outsRecorded >= 3) {
    return "TRIPLE_PLAY";
  }
  if (outsRecorded >= 2) {
    return "DOUBLE_PLAY";
  }
  
  // Check if batter is out
  let batterOnBase = false;
  if (finalBases.first?.firstname === batter.firstname && finalBases.first?.lastname === batter.lastname) {
    batterOnBase = true;
    return "SINGLE";
  }
  if (finalBases.second?.firstname === batter.firstname && finalBases.second?.lastname === batter.lastname) {
    batterOnBase = true;
    return "DOUBLE";
  }
  if (finalBases.third?.firstname === batter.firstname && finalBases.third?.lastname === batter.lastname) {
    batterOnBase = true;
    return "TRIPLE";
  }
  
  // If batter not on base and outs were recorded, batter is out
  if (!batterOnBase && outsRecorded > 0) {
    return "OUT";
  }
  
  // Default to single if batter somehow not tracked
  return "SINGLE";
}

export function handleHomeRun(ball: BattedBall, initialRunners: RunnersState, game: Game): HomeRunOutcome {
  const runsScored = getRunsFromHomer(initialRunners);
  debugLog(`[FIELDING DEBUG]: Home run! Scoring ${runsScored} runs. Clearing bases.`);
  game.addRuns(runsScored);
  game.basesOccupied = {};
  // No out recorded for home run (batter scores)
  return {
    runsScored,
    playType: "HOME_RUN",
    updatedBases: {},
  };
}