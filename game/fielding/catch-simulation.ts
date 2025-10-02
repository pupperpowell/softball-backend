import type { BattedBall, FieldingPosition } from "../types.ts";
import { Player } from "../Player.ts";
import type { Game } from "../Game.ts";
import type { BallType } from "./ball-classification.ts";
import { calculateAirTime } from "./ball-classification.ts";
import { debugLog } from "../../utils/debug.ts";

export interface CatchAttemptResult {
  caught: boolean;
  catchingFielder: Player | null;
  wasError: boolean;
  reassignedFielder?: Player;
  fieldedCleanly?: boolean; // For ground balls fielded successfully
}

export function calculateCatchProbability(ball: BattedBall, fielder: Player, ballType: BallType): number {
  let p = 0.1;

  // Home run catches are extremely rare
  if (ball.homer) {
    p = fielder.stats.fielding * 0.0025 + fielder.stats.running * 0.0025;
    return Math.min(p, 0.05); // Max 5% chance
  }

  // Calculate gap factor for outfielders
  let gapFactor = 1.0;
  if (fielder.isOutfielder()) {
    const DEG_TO_RAD = Math.PI / 180;
    const MPH_TO_MPS = 0.44704;
    const M_TO_FT = 3.28084;

    // Use same kinematics as estimateDropZone to get range
    const t = calculateAirTime(ball);
    const v = Math.max(0, ball.velo) * MPH_TO_MPS;
    const launchRad = ball.launch * DEG_TO_RAD;
    const vHoriz = v * Math.cos(launchRad);
    let rangeFt = Math.max(0, vHoriz * t * M_TO_FT);

    // Grounder bias: clamp distance to keep it largely in/near infield
    if (ball.launch < 10) {
      rangeFt = Math.min(rangeFt, 120);
    }

    // Determine shallow/mid/deep position for outfielders
    let depthBonus = 0;
    if (ballType === "FLY" || ballType === "LINE") {
      if (rangeFt < 250) { // shallow outfield
        depthBonus = -0.15; // harder in shallow outfield
      } else if (rangeFt > 350) { // deep outfield
        depthBonus = -0.15; // harder in deep outfield
      } else {
        depthBonus = 0.15
      }
    }

    p += depthBonus;

    // Gap factor: balls hit into gaps are harder to catch
    const attack = ball.attack;
    const inGap = attack >= -10 && attack <= 10;
    if (inGap) {
      gapFactor = 0.3; // Reduce catch probability by 30% for balls hit into gaps
    }
  }

  p *= gapFactor;

  // Base probability by ball type
  if (ballType === "LINE") {
    p += fielder.stats.fielding * 0.005;
  } else if (ballType === "POP") {
    p += fielder.stats.fielding * 0.10 + fielder.stats.running * 0.050;
  } else if (ballType === "FLY") {
    p += fielder.stats.fielding * 0.07 + fielder.stats.running * 0.010;
  }

  debugLog(`Catch probability: ${p.toFixed(3)}`)

  return Math.min(p, 0.95); // Cap at 95%
}

export function getFieldingSuccessRate(fielder: Player): number {
  const baseRate = 0.1;
  const skillBonus = fielder.stats.fielding * 0.05;
  return Math.min(baseRate + skillBonus, 0.90);
}

export function attemptCatch(ball: BattedBall, fielder: Player, ballType: BallType, game: Game): CatchAttemptResult {
  let caught = false;
  let catchingFielder: Player | null = null;
  let wasError = false;
  let reassignedFielder: Player | undefined = undefined;
  let fieldedCleanly: boolean | undefined = undefined;

  if (ballType !== "GROUND") {
    const catchProb = calculateCatchProbability(ball, fielder, ballType);
    caught = Math.random() < catchProb;
    if (caught) {
      catchingFielder = fielder;
      debugLog(`${fielder.toString()} caught the ball!`);
    }
  }

  // Ground balls and line drives can result in fielding errors
  if (!caught && fielder.isInfielder() && (ballType === "LINE" || ballType === "GROUND")) {
    // Calculate fielding success probability for ground balls
    let fieldingSuccessRate: number;
    
    if (ballType === "GROUND") {
      // Ground ball fielding probability
      // Base success rate: 75%
      fieldingSuccessRate = 0.75;
      
      // Fielding skill bonus: up to +0.20 at skill 10
      fieldingSuccessRate += fielder.stats.fielding * 0.02;
      
      // Running skill bonus: up to +0.10 at skill 10 (for reaction time)
      fieldingSuccessRate += fielder.stats.running * 0.01;
      
      // Ball velocity penalty: harder to field fast ground balls
      // Subtract for balls hit harder than 60 mph
      const velocityPenalty = Math.max(0, ball.velo - 60) * 0.002;
      fieldingSuccessRate -= velocityPenalty;
      
      // Clamp between 50% and 95%
      fieldingSuccessRate = Math.max(0.0, Math.min(fieldingSuccessRate, 0.95));
      
      debugLog(`Ground ball fielding success rate: ${fieldingSuccessRate.toFixed(3)}`);
    } else {
      // Line drive fielding (existing logic)
      fieldingSuccessRate = getFieldingSuccessRate(fielder);
    }
    
    const fieldingError = Math.random() > fieldingSuccessRate;
    if (!fieldingError && ballType === "GROUND") {
      // Ground ball fielded cleanly - will result in force play at first
      fieldedCleanly = true;
      catchingFielder = fielder;
      debugLog(`${fielder.toString()} fields the ground ball cleanly!`);
    } else if (fieldingError) {
      // Ball gets past the infielder
      // Determine if it's an actual error or just a well-hit ball
      // Errors are less common - only ~20% of balls that get past are true errors
      const isActualError = Math.random() < (0.20 - fielder.stats.fielding * 0.02);
      wasError = isActualError;
      
      const attack = ball.attack;
      let outfieldPosition: FieldingPosition;
      if (attack < -20) {
        outfieldPosition = "Left Field";
      } else if (attack > 20) {
        outfieldPosition = "Right Field";
      } else {
        outfieldPosition = "Center Field";
      }
      const newFielder = game.getFieldingTeam().getFielderByPosition(outfieldPosition);
      reassignedFielder = newFielder;
      
      if (isActualError) {
        debugLog(`Fielding error! The ball gets past ${fielder.toString()} and rolls into the outfield!`);
      } else {
        debugLog(`The ball gets past ${fielder.toString()} into the outfield for a base hit!`);
      }
    }
  }

  return {
    caught,
    catchingFielder,
    wasError,
    reassignedFielder,
    fieldedCleanly
  };
}