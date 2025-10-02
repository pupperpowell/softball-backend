import type { RunnersState } from "../types.ts";
import { Player } from "../Player.ts";
import type { Game } from "../Game.ts";
import { debugLog } from "../../utils/debug.ts";

export interface TagUpResult {
  runsScored: number;
  outsRecorded: number;
  finalBases: RunnersState;
}

/**
 * Handle tag-up scenario after a caught fly ball
 */
export function handleTagUp(
  runners: RunnersState,
  catchingFielder: Player,
  game: Game
): TagUpResult {
  let runsScored = 0;
  let outsRecorded = 0;
  const finalBases: RunnersState = {};

  // Runners can attempt to tag up and advance
  // Priority: runner on third tries to score, then second to third, then first to second
  
  if (runners.third) {
    const runner = runners.third;
    const tagUpSuccess = attemptTagUpAdvance(runner, "third", "home", catchingFielder, game);
    
    if (tagUpSuccess === "SAFE") {
      runsScored++;
      debugLog(`${runner.fullName()} tagged up and scored!`);
    } else if (tagUpSuccess === "OUT") {
      outsRecorded++;
      debugLog(`${runner.fullName()} tagged up but was thrown out at home!`);
    } else {
      // Stayed at third
      finalBases.third = runner;
    }
  }

  if (runners.second) {
    const runner = runners.second;
    const tagUpSuccess = attemptTagUpAdvance(runner, "second", "third", catchingFielder, game);
    
  
    if (tagUpSuccess === "SAFE") {
      finalBases.third = runner;
      debugLog(`${runner.fullName()} tagged up and advanced to third!`);
    } else if (tagUpSuccess === "OUT") {
      outsRecorded++;
      debugLog(`${runner.fullName()} tagged up but was thrown out at third!`);
    } else {
      finalBases.second = runner;
    }
  }

  if (runners.first) {
    const runner = runners.first;
    // Runner on first rarely tags up unless it's a deep fly ball
    const shouldAttempt = Math.random() < 0.3; // 30% chance to try
    
    if (shouldAttempt) {
      const tagUpSuccess = attemptTagUpAdvance(runner, "first", "second", catchingFielder, game);
      
      if (tagUpSuccess === "SAFE") {
        finalBases.second = runner;
        debugLog(`${runner.fullName()} tagged up and advanced to second!`);
      } else if (tagUpSuccess === "OUT") {
        outsRecorded++;
        debugLog(`${runner.fullName()} tagged up but was thrown out at second!`);
      } else {
        finalBases.first = runner;
      }
    } else {
      finalBases.first = runner;
    }
  }

  return { runsScored, outsRecorded, finalBases };
}

/**
 * Attempt to advance on a tag-up
 */
export function attemptTagUpAdvance(
  runner: Player,
  fromBase: "first" | "second" | "third",
  toBase: "second" | "third" | "home",
  fielder: Player,
  game: Game
): "SAFE" | "OUT" | "STAYED" {
  // Calculate if runner can beat the throw
  const runnerSpeed = 27 + runner.stats.running * 1.5; // ft/s (27-42 ft/s range)
  const throwSpeed = 70 + fielder.stats.fielding * 1.5; // ft/s (70-85 ft/s range)
  
  // Distance runner needs to run
  const runnerDistance = 60; // 60 feet between bases
  
  // Distance fielder needs to throw (approximate)
  let throwDistance = 150; // Default outfield throw
  if (fielder.isInfielder()) {
    throwDistance = 90;
  }
  
  const runnerTime = runnerDistance / runnerSpeed;
  const throwTime = throwDistance / throwSpeed;
  
  // Add reaction time for fielder
  const reactionTime = 0.1 - (fielder.stats.fielding * 0.03);
  const totalFielderTime = throwTime + reactionTime;
  
  // Runner decides whether to go based on their aggression and the situation
  const timeMargin = runnerTime - totalFielderTime;
  const aggressionFactor = runner.stats.running * 0.1;
  
  if (timeMargin > 1.0 + aggressionFactor) {
    // Easy advance
    return "SAFE";
  } else if (timeMargin < -0.5) {
    // Too risky, stay
    return "STAYED";
  } else {
    // Close play - runner attempts
    const successProb = 0.1 + (timeMargin * 0.05) + (runner.stats.running * 0.02);
    return Math.random() < successProb ? "SAFE" : "OUT";
  }
}