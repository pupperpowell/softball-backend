/*
 * Once a ball has been hit into play, the fielders must respond
 * and try to get as many runners out as possible.
 */

import type { Game } from "./Game.ts";
import { Player } from "./Player.ts";
import type { BattedBall, FieldOutcome, FieldingPosition, RunnersState } from "./types.ts"
import { debugLog } from "../utils/debug.ts";
import { classifyBall } from "./fielding/ball-classification.ts";
import { assignFielder } from "./fielding/fielder-assignment.ts";
import { attemptCatch } from "./fielding/catch-simulation.ts";
import { handleTagUp } from "./fielding/tag-up-logic.ts";
import { initializeRunners, simulateRunnerAdvancement } from "./fielding/runner-simulation.ts";
import { determinePlayType, handleHomeRun, isHit } from "./fielding/play-outcomes.ts";

export { estimateDropZone } from "./fielding/fielder-assignment.ts";
export { calculateAirTime } from "./fielding/ball-classification.ts";
export { isHit } from "./fielding/play-outcomes.ts";

export function simulateFielding(ball: BattedBall, game: Game): FieldOutcome {
  const ballType = classifyBall(ball);
  let outsRecorded = 0;
  let runsScored = 0;
  const initialRunners = game.basesOccupied;

  debugLog(`[FIELDING DEBUG]: Starting fielding simulation. Ball: homer=${ball.homer}, foul=${ball.foul}, launch=${ball.launch}, attack=${ball.attack}, velo=${ball.velo}. Initial runners: ${JSON.stringify(initialRunners)}. Ball type: ${ballType}`);

  // Phase 1: Assign fielder
  const fielderAssignment = assignFielder(ball, game);
  let primaryFielder = fielderAssignment.primaryFielder;

  // Phase 2: Attempt catch
  const catchResult = attemptCatch(ball, primaryFielder, ballType, game);
  debugLog(`ball ${catchResult.caught ? "was" : "could not be"} caught by ${catchResult.catchingFielder}`)

  // Handle reassignment if error (e.g., ground ball past infielder)
  if (catchResult.reassignedFielder) {
    primaryFielder = catchResult.reassignedFielder;
  }

  if (catchResult.caught) {
    outsRecorded += 1; // The catch is an out
  }

  // Handle cleanly fielded ground balls - these go through runner simulation for force plays
  if (catchResult.fieldedCleanly) {
    debugLog(`Ground ball fielded cleanly by ${catchResult.catchingFielder?.toString()}, attempting force play at first`);
    
  }

  // Phase 3: Handle home runs (only if not caught)
  if (ball.homer && !catchResult.caught) {
  	const hrOutcome = handleHomeRun(ball, initialRunners, game);
  	runsScored += hrOutcome.runsScored;
  	// Note: handleHomeRun already calls game.addRuns(), so we don't call it again here
  	// No additional out for home run
  	game.basesOccupied = hrOutcome.updatedBases;

    return {
      primary_fielder: primaryFielder,
      playType: "HOME_RUN",
      updatedBases: hrOutcome.updatedBases,
    };
  }

  // Phase 4: Handle caught ball with tag-ups
  if (catchResult.caught) {
    const tagUpResult = handleTagUp(initialRunners, catchResult.catchingFielder!, game);
    runsScored += tagUpResult.runsScored;
    outsRecorded += tagUpResult.outsRecorded;
    game.addRuns(tagUpResult.runsScored);
    game.basesOccupied = tagUpResult.finalBases;
    game.outs += outsRecorded;

    const totalOuts = outsRecorded; // Includes catch + tag-up outs
    const playType = totalOuts >= 2 ? "DOUBLE_PLAY" : "OUT";

    return {
      primary_fielder: primaryFielder,
      playType: playType,
      updatedBases: tagUpResult.finalBases,
    };
  }

  // Phase 5: Ball in play - simulate runner advancement
  // For cleanly fielded ground balls, use reduced fielding time for force play
  const runners = initializeRunners(initialRunners, ball.batter);
  const advancementResult = simulateRunnerAdvancement(runners, primaryFielder, game, ballType, catchResult.fieldedCleanly);

  runsScored += advancementResult.runsScored;
  outsRecorded += advancementResult.outsRecorded;
  game.addRuns(advancementResult.runsScored);
  game.outs += advancementResult.outsRecorded;
  game.basesOccupied = advancementResult.finalBases;

  // Phase 6: Determine play type
  const playType = determinePlayType(ball.batter, advancementResult.finalBases, advancementResult.outsRecorded);

  return {
    primary_fielder: primaryFielder,
    playType: playType,
    updatedBases: advancementResult.finalBases,
  };
}
