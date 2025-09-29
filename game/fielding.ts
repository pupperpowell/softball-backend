/*
 * Once a ball has been hit into play, the fielders must respond
 * and try to get as many runners out as possible.
 */

// The ball is hit into the air!
// A fielder must take action.

import type { Team } from "./Team.ts";
import type {
  BattedBall,
  FieldingPosition,
  FieldResponse,
  FieldOutcome,
} from "./types.ts";

import { NarrationEngine } from "../narrator/NarrationEngine.ts";
import { Player } from "./Player.ts";
import { clamp } from "./math.ts";

const DEBUG_FIELDING = false;

export function simulateFielding(
  ball: BattedBall,
  fieldingTeam: Team,
): FieldResponse {
  if (DEBUG_FIELDING) {
    console.log(`Fielding simulation started for ball: velo=${ball.velo.toFixed(3)}, launch=${ball.launch.toFixed(3)}, attack=${ball.attack.toFixed(3)}, foul=${ball.foul}`);
  }

  // 0) Immediate HR shortcut: if it's over the fence, no fielding play
  if (ball.homer && ball.launch > 0) {
    if (DEBUG_FIELDING) {
      console.log(`Immediate home run detected - no fielding action needed.`);
    }
    return {
      fielder: chooseFallbackFielder(fieldingTeam),
      hit: true,
      error: false,
      result: "HOME_RUN",
      basesTaken: 4,
    };
  }

  // 1) Who is attempting to field/catch the ball?
  const pos = estimateDropZone(ball);
  const fielder =
    lookupFielder(fieldingTeam, pos) ?? chooseFallbackFielder(fieldingTeam);
  const airTime = calculateAirTime(ball);
  const ballType = classifyBall(ball);
  if (DEBUG_FIELDING) {
    console.log(`Fielder selected: ${fielder.fullName()} at position ${pos} for drop zone. Ball type: ${ballType}, air time: ${airTime.toFixed(2)}s`);
  }

  // 2) Can it be caught?
  let caught = false;
  if (ballType !== "GROUND") {
    const pCatch = catchProbability(ball, fielder, pos, ballType, airTime);
    caught = Math.random() < pCatch;
    if (DEBUG_FIELDING) {
      console.log(`${fielder.fullName()} attempts to catch ${ballType.toLowerCase()} ball. Catch probability: ${(pCatch * 100).toFixed(1)}%, result: ${caught ? 'caught' : 'not caught'}`);
    }
  } else if (DEBUG_FIELDING) {
    console.log(`Ground ball - no catch attempt.`);
  }

  if (caught) {
    // High-level: caught = flyout/lineout/popout. Tag-up/runner logic needs Game context.
    if (DEBUG_FIELDING) {
      console.log(`${fielder.fullName()} catches the ball for an out.`);
    }
    return {
      fielder,
      hit: false,
      error: false,
      result: "OUT",
      basesTaken: 0,
    };
  }

  // 3) Not caught → field on bounce/ground. Determine clean fielding vs error and batter bases.
  //    We fold some "where to throw" logic into extra-base suppression based on OF skill
  //    since we do not have Game state or runner info here.
  const cleanP = fieldCleanlyProbability(ball, fielder, pos, ballType);
  const clean = Math.random() < cleanP;
  if (DEBUG_FIELDING) {
    console.log(`${fielder.fullName()} attempts to field cleanly. Clean probability: ${(cleanP * 100).toFixed(1)}%, result: ${clean ? 'clean' : 'error'}`);
  }
  const baseHitOutcome = chooseBaseHitOutcome(
    ball,
    fielder,
    pos,
    ballType,
    clean,
  );
  if (DEBUG_FIELDING) {
    console.log(`Base hit outcome: ${baseHitOutcome.fieldOutcome}, batter takes ${baseHitOutcome.bases} base(s), error: ${!clean && baseHitOutcome.bases > 0}`);
  }

  return {
    fielder,
    hit: true,
    error: !clean && baseHitOutcome.bases > 0, // if misfield leads to extra base(s)
    result: baseHitOutcome.fieldOutcome,
    basesTaken: baseHitOutcome.bases,
  };
}

export function calculateAirTime(ball: BattedBall): number {
  // Estimate air time using simple projectile motion from a contact height.
  // Units: velo is mph, convert to m/s; launch is degrees; return seconds.
  const MPH_TO_MPS = 0.44704;
  const g = 9.80665; // m/s^2
  const contactHeightM = 1.0; // approx height of contact above ground

  const v = Math.max(0, ball.velo) * MPH_TO_MPS;
  const theta = (ball.launch * Math.PI) / 180;

  const vVertical = v * Math.sin(theta);

  // Solve for time until ball returns to ground level (y=0) given initial height h0:
  // y(t) = h0 + v_y * t - 0.5 * g * t^2 = 0
  // t = (v_y + sqrt(v_y^2 + 2 * g * h0)) / g
  let t =
    (vVertical + Math.sqrt(vVertical * vVertical + 2 * g * contactHeightM)) / g;

  // Numerical safety and a light damping factor to approximate drag
  if (!isFinite(t) || t < 0) t = 0;
  const dragFactor = 1 / (1 + 0.08); // reduce ~8%
  t *= dragFactor;

  return t;
}

export function estimateDropZone(ball: BattedBall): FieldingPosition {
  // Map a batted ball to the most likely nearby fielder using simple kinematics and zones.
  const DEG_TO_RAD = Math.PI / 180;
  const MPH_TO_MPS = 0.44704;
  const M_TO_FT = 3.28084;

  // Field/heuristic constants (softball-scale)
  const R_SHORT = 35; // ft - home-plate ring (C/P territory)
  const R_INFIELD = 95; // ft - infield/outfield boundary
  const BOUNDARY_BUFFER = 10; // ft - tie-break region around R_INFIELD

  const GROUND_LAUNCH = 10; // deg - grounder threshold
  const HIGH_POP = 40; // deg - high pop near home plate

  // Foul-ball fieldable heuristics (rare)
  const FOUL_FIELDABLE_LAUNCH = 35; // deg - needs to be a high pop to be fieldable
  const FOUL_PLATE_RADIUS = 45; // ft - near plate => Catcher
  const FOUL_MAX_FIELDABLE = 90; // ft - beyond this, most fouls are unplayable

  // Catcher realistic fieldable window: only near straight-up pops
  const CATCHER_STRAIGHT_UP_MIN = 87; // deg
  const CATCHER_STRAIGHT_UP_MAX = 93; // deg

  // Pitcher fielding heuristics for grounders and near-plate plays
  const PITCHER_FIELDABLE_RADIUS_FT = 20; // only very short dribblers are true pitcher plays
  const PITCHER_ATTACK_CONE_DEG = 5; // central cone for pitcher comebackers
  const PITCHER_REACTION_TIME_S = 0.35; // min time to react at the pitcher plane
  const PITCHER_PLANE_FT = 43; // distance to pitcher from home
  const GROUND_LAUNCH_MAX = 8; // restrict pitcher to true grounders/choppers

  // Kinematics to estimate horizontal range
  const t = calculateAirTime(ball);
  const v = Math.max(0, ball.velo) * MPH_TO_MPS;
  const launchRad = ball.launch * DEG_TO_RAD;
  const vHoriz = v * Math.cos(launchRad);
  let rangeFt = Math.max(0, vHoriz * t * M_TO_FT);

  // Horizontal air distance and speed in ft/s
  const vHorizFtps = Math.max(0, vHoriz) * M_TO_FT;
  const xAirFt = Math.max(0, vHorizFtps * t);

  // Grounder bias: clamp distance to keep it largely in/near infield
  if (ball.launch < GROUND_LAUNCH) {
    rangeFt = Math.min(rangeFt, 120);
  }

  const attack = ball.attack;

  // Foul vs fair handling
  if (ball.foul) {
    // Only a very small fraction of fouls are fieldable; otherwise Bench.
    if (ball.launch >= FOUL_FIELDABLE_LAUNCH && rangeFt <= FOUL_MAX_FIELDABLE) {
      const straightUp =
        ball.launch >= CATCHER_STRAIGHT_UP_MIN &&
        ball.launch <= CATCHER_STRAIGHT_UP_MAX;

      if (rangeFt <= FOUL_PLATE_RADIUS && straightUp) {
        return "Catcher";
      } else if (attack >= 30) {
        return "First Base";
      } else if (attack <= -30) {
        return "Third Base";
      }
    }
    return "Bench";
  }

  // Grounders: decide pitcher vs infielder based on centrality, distance, and reaction time
  if (ball.launch < GROUND_LAUNCH) {
    // If the ball crosses the pitcher plane in the air, treat as a comebacker/liner.
    // Do not assign "Pitcher" here; in simulateFielding(), run a reaction/catch/deflection
    // check that scales with the pitcher's fielding skill. For drop-zone, prefer MI/CI.
    if (xAirFt >= PITCHER_PLANE_FT) {
      // fall through to sector routing below
    } else {
      const remainingFt = PITCHER_PLANE_FT - xAirFt;
      const vGroundFtps = vHorizFtps * 0.7; // crude post-bounce slowdown
      const timeToPlane = remainingFt / Math.max(1e-3, vGroundFtps);

      const central = Math.abs(attack) <= PITCHER_ATTACK_CONE_DEG;
      const trueGrounder = ball.launch <= GROUND_LAUNCH_MAX;
      const veryShort = xAirFt <= PITCHER_FIELDABLE_RADIUS_FT;

      if (
        central &&
        trueGrounder &&
        veryShort &&
        timeToPlane >= PITCHER_REACTION_TIME_S
      ) {
        return "Pitcher";
      }

      // Not a pitcher play: route to infield by attack angle
      if (attack <= -30) return "Third Base";
      if (attack >= 30) return "First Base";
      if (attack < -10) return "Shortstop";
      if (attack > 10) return "Second Base";
      return attack < 0 ? "Shortstop" : "Second Base";
    }
  }

  // Very short ring near home (non-grounders)
  if (rangeFt < R_SHORT) {
    const straightUp =
      ball.launch >= CATCHER_STRAIGHT_UP_MIN &&
      ball.launch <= CATCHER_STRAIGHT_UP_MAX;
    if (straightUp) return "Catcher";
    // otherwise, continue to infield/outfield sector routing
  }

  // Boundary bias near infield/outfield edge
  let infieldUpper = R_INFIELD;
  if (Math.abs(rangeFt - R_INFIELD) <= BOUNDARY_BUFFER) {
    // Lower launch favors infield; higher favors outfield
    if (ball.launch < 15) infieldUpper += BOUNDARY_BUFFER;
    else infieldUpper -= BOUNDARY_BUFFER;
  }

  // Angular sectors
  const isLeft = attack < -15;
  const isRight = attack > 15;
  // middle otherwise

  // Infield band
  if (rangeFt < infieldUpper) {
    if (isLeft) {
      return attack <= -30 ? "Third Base" : "Shortstop";
    } else if (isRight) {
      return attack >= 30 ? "First Base" : "Second Base";
    } else {
      // middle: break tie by slight sign
      return attack < 0 ? "Shortstop" : "Second Base";
    }
  }

  // Outfield by sector (home runs still map to nearest OF)
  if (isLeft) return "Left Field";
  if (isRight) return "Right Field";
  return "Center Field";
}

/**
 * Classify ball type by launch angle
 */
type BallType = "GROUND" | "LINE" | "FLY" | "POP";

function classifyBall(ball: BattedBall): BallType {
  const a = ball.launch;
  if (a < 10) return "GROUND";
  if (a < 25) return "LINE";
  if (a < 60) return "FLY";
  return "POP";
}

const OUTFIELD: FieldingPosition[] = [
  "Left Field",
  "Center Field",
  "Right Field",
];
const INFIELD: FieldingPosition[] = [
  "First Base",
  "Second Base",
  "Third Base",
  "Shortstop",
];
const BATTERY: FieldingPosition[] = ["Pitcher", "Catcher"];

function isOutfielder(pos: FieldingPosition) {
  return OUTFIELD.includes(pos);
}
function isInfielder(pos: FieldingPosition) {
  return INFIELD.includes(pos);
}
function isBattery(pos: FieldingPosition) {
  return BATTERY.includes(pos);
}

function lookupFielder(team: Team, pos: FieldingPosition): Player | undefined {
  // Prefer exact position match
  // @ts-ignore Team.players is expected to exist/populate externally
  const players: Player[] = (team as any).players ?? [];
  const exact = players.find((p) => p.position === pos);
  if (exact) return exact;

  // Fallback: nearest-line mate (e.g., if SS missing, try 2B/3B; if LF missing, try CF)
  if (isOutfielder(pos)) {
    const order: FieldingPosition[] = [
      "Center Field",
      "Left Field",
      "Right Field",
    ];
    for (const alt of order) {
      const p = players.find((pl) => pl.position === alt);
      if (p) return p;
    }
  } else if (isInfielder(pos)) {
    const order: FieldingPosition[] = [
      "Shortstop",
      "Second Base",
      "Third Base",
      "First Base",
    ];
    for (const alt of order) {
      const p = players.find((pl) => pl.position === alt);
      if (p) return p;
    }
  } else {
    const order: FieldingPosition[] = ["Catcher", "Pitcher"];
    for (const alt of order) {
      const p = players.find((pl) => pl.position === alt);
      if (p) return p;
    }
  }
  return undefined;
}

function chooseFallbackFielder(team: Team): Player {
  // @ts-ignore
  const players: Player[] = (team as any).players ?? [];
  return players[0] ?? new Player();
}

/**
 * Probability the ball is caught in the air
 * Scales with hang time, ball type, fielder skill, and liners' exit velo.
 */
function catchProbability(
  ball: BattedBall,
  fielder: Player,
  pos: FieldingPosition,
  ballType: BallType,
  airTime: number,
): number {
  // Baseline by type via a smooth logistic on hang time
  let base = 0;
  const logistic = (x: number) => 1 / (1 + Math.exp(-x));

  if (ballType === "POP") {
    base = logistic((airTime - 1.2) / 0.4); // easy if hang time is decent
  } else if (ballType === "FLY") {
    base = logistic((airTime - 1.8) / 0.5);
  } else if (ballType === "LINE") {
    base = 0.5 * logistic((airTime - 0.6) / 0.18); // liners are tough
  } else {
    base = 0; // grounders are not caught in the air
  }

  // Position emphasis
  if (isOutfielder(pos) && (ballType === "FLY" || ballType === "POP"))
    base *= 0.8;
  if (isInfielder(pos) && ballType === "LINE") base *= 0.5;

  // Skill factor
  const s = Math.pow((fielder.stats?.fielding ?? 0) / 10, 0.8);
  let p = base * (0.55 + 0.65 * s);

  // Hard liners penalized by velo
  if (ballType === "LINE") {
    const veloPenalty = clamp((ball.velo - 70) / 60, 0, 0.35);
    p *= 1 - veloPenalty;
  }

  // Over-the-fence balls cannot be caught
  if (ball.homer && ball.launch > 0) p = 0;

  return clamp(p, 0, 0.995);
}

/**
 * Chance the fielder cleanly fields a non-caught ball (no bobble/error).
 */
function fieldCleanlyProbability(
  ball: BattedBall,
  fielder: Player,
  pos: FieldingPosition,
  ballType: BallType,
): number {
  const skill = (fielder.stats?.fielding ?? 0) / 10;
  let base = 0.5;

  if (ballType === "GROUND") {
    if (isInfielder(pos) || isBattery(pos)) {
      base = 0.85;
      // Hard-hit grounders are trickier
      base -= clamp((ball.velo - 55) / 80, 0, 0.12);
      base += 0.1 * Math.pow(skill, 0.8);
    } else {
      // OF charging a grounder
      base = 0.88 + 0.08 * Math.pow(skill, 0.8);
      base -= clamp((ball.velo - 60) / 100, 0, 0.08);
    }
  } else {
    // Dropped/scooped after a bounce from a fly/line
    base = 0.9 + 0.06 * Math.pow(skill, 0.8);
    base -= clamp((ball.velo - 70) / 120, 0, 0.06);
  }

  return clamp(base, 0.5, 0.99);
}

/**
 * Pick a base hit result (and whether error-induced extra bases apply)
 * Returns batter bases and FieldOutcome.
 *
 * We also fold a simplified "where to throw" strategy from OUTFIELD_STRATEGY.md:
 * - With no runner context, OF will generally throw to 2B on base hits,
 *   and better fielders suppress extra bases more effectively.
 */
function chooseBaseHitOutcome(
  ball: BattedBall,
  fielder: Player,
  pos: FieldingPosition,
  ballType: BallType,
  clean: boolean,
): { bases: 1 | 2 | 3 | 4; fieldOutcome: FieldOutcome } {
  const running = (ball.batter.stats?.running ?? 0) / 10;
  const fielding = (fielder.stats?.fielding ?? 0) / 10;

  // Infield logic (grounders/liners that get through or are beaten out)
  if (!isOutfielder(pos)) {
    if (ballType === "GROUND") {
      // Attempt throw to 1B vs infield single
      // Routine out chance vs batter speed and ball pace
      let pOut = 0.68;
      pOut += 0.18 * Math.pow(fielding, 0.9);
      pOut -= 0.25 * Math.pow(running, 0.9);
      pOut -= clamp((ball.velo - 55) / 80, 0, 0.12); // harder grounders arrive faster
      pOut = clamp(pOut, 0.1, 0.95);

      if (Math.random() < pOut && clean) {
        return { bases: 0 as any, fieldOutcome: "OUT" };
      }

      // Beaten out or bobbled → Single; rare E advances the batter one extra base
      let bases: 1 | 2 = 1;
      if (!clean) {
        const takeExtra = 0.15 + 0.2 * running - 0.1 * fielding;
        if (Math.random() < clamp(takeExtra, 0, 0.5)) bases = 2;
      }
      return { bases, fieldOutcome: bases === 1 ? "SINGLE" : "DOUBLE" };
    } else {
      // Infield bloop/liner not caught → almost always a single; occasional hustle double on bobble
      let bases: 1 | 2 = 1;
      const hustleDouble =
        0.05 + 0.18 * running + (clean ? 0 : 0.12) - 0.1 * fielding;
      if (Math.random() < clamp(hustleDouble, 0, 0.35)) bases = 2;
      return { bases, fieldOutcome: bases === 1 ? "SINGLE" : "DOUBLE" };
    }
  }

  // Outfield logic: choose 1/2/3 via velo, angles, and OF skill. Clean fielding/throw to 2B suppresses XBH.
  // Baseline single
  let p2 = 0;
  let p3 = 0;

  // Gap/line bonuses
  const angle = Math.abs(ball.attack);
  const gapBonus = angle >= 20 && angle <= 45 ? 0.1 : 0;
  const lineBonus = angle >= 60 ? 0.18 : 0;

  // Velo-driven XBH
  const veloFactor = clamp((ball.velo - 55) / 35, 0, 1); // 0..1 over ~55-90 mph
  p2 = 0.1 + 0.45 * veloFactor + gapBonus + lineBonus;
  p3 = 0.02 + 0.12 * veloFactor;

  // Launch sweet spot for carry (liners/low flies favor doubles, high flies less)
  if (ballType === "LINE") p2 += 0.08;
  if (ballType === "FLY") p2 += 0.03;

  // Batter speed pushes for extra bases
  p2 += 0.12 * running;
  p3 += 0.08 * running;

  // OF clean fielding and sound throws to 2B (strategy) reduce extra bases
  const strategyHold = 0.1 + 0.2 * fielding + (clean ? 0.1 : 0);
  p2 = clamp(p2 - strategyHold, 0, 0.85);
  p3 = clamp(p3 - strategyHold * 0.6, 0, 0.35);

  // Normalize to choose outcome
  const p1 = clamp(1 - p2 - p3, 0.05, 0.95);
  const r = Math.random();
  let bases: 1 | 2 | 3 = 1;
  if (r < p3) bases = 3;
  else if (r < p3 + p2) bases = 2;

  let fieldOutcome: FieldOutcome =
    bases === 3 ? "TRIPLE" : bases === 2 ? "DOUBLE" : "SINGLE";
  return { bases, fieldOutcome };
}

/**
 * Lightweight runner-state type for resolving where to throw + outs/runs.
 * This keeps simulateFielding() pure for batter-only outcomes while allowing
 * a richer simulateFieldingWithRunners() that applies OUTFIELD_STRATEGY.md.
 */
export type BaseName = "first" | "second" | "third";
export type BaseTarget = 1 | 2 | 3 | 4;
export interface RunnersState {
  first?: Player;
  second?: Player;
  third?: Player;
  outs: number;
}

export interface PlayResult {
  field: FieldResponse; // fielder, hit/error, and high-level batter outcome
  outs: number;
  runs: number;
  batterBases: 0 | 1 | 2 | 3 | 4;
  runnerAdvances: Partial<Record<BaseName, number>>; // bases taken by existing runners
  runnersOut: BaseName[];
}

/**
 * Outfield throw target based on OUTFIELD_STRATEGY.md (two bases ahead of lead runner).
 * This function intentionally simplifies cut decisions by encoding them as target choices.
 */
function chooseOutfieldThrowTarget(runners: RunnersState): BaseTarget {
  if (runners.second && runners.first) return 4; // home
  if (runners.second && !runners.first) return 4; // home
  if (runners.first) return 3; // with only R1, throw to 3B
  return 2; // no runners → keep double play in order
}

function estimateThrowDistanceCategory(
  pos: FieldingPosition,
  target: BaseTarget,
): "SHORT" | "MEDIUM" | "LONG" {
  if (isOutfielder(pos)) {
    if (target === 4 || target === 3) return "LONG";
    if (target === 2) return "MEDIUM";
    return "LONG";
  }
  if (isInfielder(pos)) {
    if (target === 1 || target === 2) return "SHORT";
    if (target === 3) return "MEDIUM";
    return "MEDIUM"; // home
  }
  // Battery
  if (target === 4) return "MEDIUM";
  return "SHORT";
}

/**
 * Chance to throw a runner out at a base, based on distance, fielder skill,
 * runner speed, and ball type context.
 */
function throwOutProbability(
  distance: "SHORT" | "MEDIUM" | "LONG",
  fielderSkill: number,
  runnerSpeed: number,
  ballType: BallType,
): number {
  let base = distance === "SHORT" ? 0.8 : distance === "MEDIUM" ? 0.55 : 0.3;
  // Scale by skills
  base += 0.2 * (fielderSkill - 0.5);
  base -= 0.2 * (runnerSpeed - 0.5);

  // On deep flies (tag plays), throwing out is harder than on shallow flies/grounders
  if (ballType === "FLY" || ballType === "POP") base -= 0.05;
  if (ballType === "GROUND") base += 0.05; // force/tag plays on ground are easier

  return clamp(base, 0.05, 0.95);
}

/**
 * Probability that a runner successfully tags up and advances one base on a caught ball.
 * Scales with hang time and outfielder arm (approximated by fielding).
 */
function tagUpAdvanceProb(
  airTime: number,
  armSkill: number,
  fromBase: 1 | 2 | 3,
): number {
  // Baselines tuned by base and hang time
  const arm = clamp(armSkill, 0, 1);
  const logistic = (x: number) => 1 / (1 + Math.exp(-x));

  if (fromBase === 3) {
    // 3rd to home
    let p = logistic((airTime - 2.8) / 0.25); // more hang → easier tag
    p -= 0.2 * (arm - 0.5);
    return clamp(p, 0.2, 0.9);
  }
  if (fromBase === 2) {
    let p = logistic((airTime - 3.0) / 0.3);
    p -= 0.15 * (arm - 0.5);
    return clamp(p, 0.15, 0.75);
  }
  // from 1st
  let p = logistic((airTime - 3.2) / 0.35);
  p -= 0.12 * (arm - 0.5);
  return clamp(p, 0.1, 0.6);
}

/**
 * Full resolution with runner context and throw decisions.
 * - Uses simulateFielding() to determine batter/fielder, then applies strategy/running to compute outs/runs.
 * - Returns a compact, deterministic PlayResult the Game can apply.
 */
export function simulateFieldingWithRunners(
  runners: RunnersState,
  ball: BattedBall,
  fieldingTeam: Team,
): PlayResult {
  if (DEBUG_FIELDING) {
    console.log(`Fielding with runners simulation started. Runners: 1B=${runners.first?.fullName() ?? 'empty'}, 2B=${runners.second?.fullName() ?? 'empty'}, 3B=${runners.third?.fullName() ?? 'empty'}, outs=${runners.outs}`);
  }
  const field = simulateFielding(ball, fieldingTeam);
  const pos = estimateDropZone(ball);
  const fielder = field.fielder;
  const ballType = classifyBall(ball);
  const airTime = calculateAirTime(ball);
  if (DEBUG_FIELDING) {
    console.log(`Field response: ${field.result}, hit=${field.hit}, error=${field.error}, basesTaken=${field.basesTaken}`);
  }

  const runnerAdvances: Partial<Record<BaseName, number>> = {};
  const runnersOut: BaseName[] = [];
  let outs = 0;
  let runs = 0;
  let batterBases: 0 | 1 | 2 | 3 | 4 = 0;

  // Helper to get runner speed
  const speed = (p?: Player) => clamp((p?.stats?.running ?? 0) / 10, 0, 1);
  const arm = clamp((fielder.stats?.fielding ?? 0) / 10, 0, 1);

  if (DEBUG_FIELDING) {
    console.log(`Fielder arm strength: ${arm.toFixed(2)}, position: ${pos}`);
  }

  // 0) Home run: everyone advances fully
  if (field.result === "HOME_RUN" && field.basesTaken === 4) {
    if (DEBUG_FIELDING) {
      console.log(`Home run! All runners advance fully, batter scores.`);
    }
    batterBases = 4;
    if (runners.third) {
      runnerAdvances.third = 1;
      runs++;
    }
    if (runners.second) {
      runnerAdvances.second = 2;
      runs++;
    }
    if (runners.first) {
      runnerAdvances.first = 3;
      runs++;
    }
    // Batter scores too
    runs += 1;
    return { field, outs, runs, batterBases, runnerAdvances, runnersOut };
  }

  // 1) Caught in air → tag-up logic
  if (field.result === "OUT" && field.hit === false) {
    if (DEBUG_FIELDING) {
      console.log(`Ball caught for out. Tag-up attempts possible if outfield.`);
    }
    outs += 1;

    // Outfield tag-ups preferred; infield tag-ups are rare
    const allowTags = isOutfielder(pos);

    if (DEBUG_FIELDING) {
      console.log(`Tag-ups allowed: ${allowTags} (outfield: ${isOutfielder(pos)})`);
    }

    if (allowTags) {
      // Third → Home
      if (runners.third) {
        const pTag = tagUpAdvanceProb(airTime, arm, 3);
        if (DEBUG_FIELDING) {
          console.log(`R3 (${runners.third.fullName()}) tag-up attempt from 3B to home. Prob: ${(pTag * 100).toFixed(1)}%`);
        }
        if (Math.random() < pTag) {
          // OF will try to throw home in this situation
          const dist = estimateThrowDistanceCategory(pos, 4);
          const pOut = throwOutProbability(
            dist,
            arm,
            speed(runners.third),
            ballType,
          );
          if (DEBUG_FIELDING) {
            console.log(`Throw home to R3. Distance: ${dist}, out prob: ${(pOut * 100).toFixed(1)}%`);
          }
          if (Math.random() < pOut) {
            outs += 1;
            runnersOut.push("third");
            if (DEBUG_FIELDING) {
              console.log(`R3 thrown out at home.`);
            }
          } else {
            runnerAdvances.third = 1;
            runs += 1;
            if (DEBUG_FIELDING) {
              console.log(`R3 scores on tag-up.`);
            }
          }
        }
      }
      // Second → Third
      if (runners.second) {
        const pTag = tagUpAdvanceProb(airTime, arm, 2);
        if (DEBUG_FIELDING) {
          console.log(`R2 (${runners.second.fullName()}) tag-up attempt from 2B to 3B. Prob: ${(pTag * 100).toFixed(1)}%`);
        }
        if (Math.random() < pTag) {
          // Throw tends to go to 3rd if contested
          const dist = estimateThrowDistanceCategory(pos, 3);
          const pOut = throwOutProbability(
            dist,
            arm,
            speed(runners.second),
            ballType,
          );
          if (DEBUG_FIELDING) {
            console.log(`Throw to 3B for R2. Distance: ${dist}, out prob: ${(pOut * 100).toFixed(1)}%`);
          }
          if (Math.random() < pOut) {
            outs += 1;
            runnersOut.push("second");
            if (DEBUG_FIELDING) {
              console.log(`R2 thrown out at 3B.`);
            }
          } else {
            runnerAdvances.second = 1;
            if (DEBUG_FIELDING) {
              console.log(`R2 advances to 3B on tag-up.`);
            }
          }
        }
      }
      // First → Second
      if (runners.first) {
        const pTag = tagUpAdvanceProb(airTime, arm, 1);
        if (DEBUG_FIELDING) {
          console.log(`R1 (${runners.first.fullName()}) tag-up attempt from 1B to 2B. Prob: ${(pTag * 100).toFixed(1)}%`);
        }
        if (Math.random() < pTag) {
          // Most throws are kept low to 2B; seldom an out here
          runnerAdvances.first = 1;
          if (DEBUG_FIELDING) {
            console.log(`R1 advances to 2B on tag-up.`);
          }
        }
      }
    }
    batterBases = 0;
    if (DEBUG_FIELDING) {
      console.log(`Catch complete. Outs: ${outs}, runs: ${runs}, runner advances:`, runnerAdvances);
    }
    return { field, outs, runs, batterBases, runnerAdvances, runnersOut };
  }

  // 2) Not caught → apply base hit and OF/IF strategy for runner advances and potential throws
  const batterTakes = clamp(field.basesTaken ?? 1, 1, 3) as 1 | 2 | 3;
  batterBases = batterTakes;

  if (DEBUG_FIELDING) {
    console.log(`Base hit: batter takes ${batterTakes} base(s).`);
  }

  const angle = Math.abs(ball.attack);
  const gapFactor = angle >= 20 && angle <= 45 ? 0.2 : 0; // gap helps runner advance

  if (DEBUG_FIELDING) {
    console.log(`Hit angle: ${angle}°, gap factor: ${gapFactor}`);
  }

  if (isOutfielder(pos)) {
    if (DEBUG_FIELDING) {
      console.log(`Outfield hit - evaluating runner advances.`);
    }
    // Default advances on hits to OF
    if (runners.third) {
      // R3 generally scores on singles; almost always on XBH
      let pScore = batterTakes >= 2 ? 0.95 : 0.7;
      pScore += 0.15 * speed(runners.third) + gapFactor;
      if (DEBUG_FIELDING) {
        console.log(`R3 scoring attempt. Prob: ${(pScore * 100).toFixed(1)}%`);
      }
      if (Math.random() < clamp(pScore, 0, 0.99)) {
        runnerAdvances.third = 1;
        runs += 1;
        if (DEBUG_FIELDING) {
          console.log(`R3 scores.`);
        }
      }
    }
    if (runners.second) {
      let bases = 1; // aim to score on singles if hit well
      let pScore = batterTakes >= 2 ? 0.85 : 0.45;
      pScore += 0.2 * speed(runners.second) + gapFactor;
      if (DEBUG_FIELDING) {
        console.log(`R2 scoring attempt. Prob: ${(pScore * 100).toFixed(1)}%`);
      }
      if (Math.random() < clamp(pScore, 0, 0.99)) {
        runnerAdvances.second = 2;
        runs += 1;
        if (DEBUG_FIELDING) {
          console.log(`R2 scores.`);
        }
      } else {
        runnerAdvances.second = 1;
        if (DEBUG_FIELDING) {
          console.log(`R2 advances to 3B.`);
        }
      }
    }
    if (runners.first) {
      // R1 often goes first-to-third on singles to OF, more with speed and gaps
      let toThird = 0.45 + 0.35 * speed(runners.first) + gapFactor;
      if (batterTakes >= 2) toThird += 0.15; // ball to gap/corner
      toThird = clamp(toThird, 0.15, 0.9);
      if (DEBUG_FIELDING) {
        console.log(`R1 advance to 3B attempt. Prob: ${(toThird * 100).toFixed(1)}%`);
      }
      runnerAdvances.first = Math.random() < toThird ? 2 : 1;
      if (DEBUG_FIELDING) {
        console.log(`R1 advances ${runnerAdvances.first} base(s).`);
      }
    }

    // Throw target decisions per OUTFIELD_STRATEGY.md
    const target = chooseOutfieldThrowTarget(runners);
    if (DEBUG_FIELDING) {
      console.log(`${fielder.fullName()} throws to ${target}${target === 4 ? 'th' : 'nd'}-base.`);
    }
    const dist = estimateThrowDistanceCategory(pos, target);

    // Identify lead runner for the chosen target
    let contested: { base: BaseName; advanceNeeded: number } | undefined;
    if (target === 4) {
      if (runners.second && runnerAdvances.second === 2)
        contested = { base: "second", advanceNeeded: 2 };
      else if (runners.third && runnerAdvances.third === 1)
        contested = { base: "third", advanceNeeded: 1 };
    } else if (target === 3) {
      if (runners.first && (runnerAdvances.first ?? 0) >= 2)
        contested = { base: "first", advanceNeeded: 2 };
      else if (runners.second && (runnerAdvances.second ?? 0) >= 1)
        contested = { base: "second", advanceNeeded: 1 };
    } else if (target === 2) {
      if (runners.first && (runnerAdvances.first ?? 0) >= 1)
        contested = { base: "first", advanceNeeded: 1 };
    }

    if (DEBUG_FIELDING && contested) {
      console.log(`Contested runner at ${contested.base} attempting ${contested.advanceNeeded} base(s).`);
    }

    if (contested) {
      const runner =
        contested.base === "first"
          ? runners.first
          : contested.base === "second"
            ? runners.second
            : runners.third;
      if (runner) {
        const pOut = throwOutProbability(dist, arm, speed(runner), ballType);
        if (DEBUG_FIELDING) {
          console.log(`Throw out attempt on ${runner.fullName()} at ${contested.base}. Distance: ${dist}, prob: ${(pOut * 100).toFixed(1)}%`);
        }
        if (Math.random() < pOut) {
          // Cut down the runner at target base
          runnersOut.push(contested.base);
          outs += 1;
          // Revert their advance
          runnerAdvances[contested.base] = 0;
          // If they were attempting to score, erase the run
          if (
            target === 4 &&
            (contested.base === "third" || contested.base === "second")
          ) {
            runs = Math.max(0, runs - 1);
          }
          if (DEBUG_FIELDING) {
            console.log(`${runner.fullName()} thrown out at ${contested.base}.`);
          }
        } else if (DEBUG_FIELDING) {
          console.log(`${runner.fullName()} safe at ${contested.base}.`);
        }
      }
    }
  } else {
    if (DEBUG_FIELDING) {
      console.log(`Infield hit - conservative runner advances.`);
    }
    // Infield hits: conservative advances, little chance of throwing out existing runners
    if (runners.third) {
      const pScore = 0.2 + 0.35 * speed(runners.third);
      if (DEBUG_FIELDING) {
        console.log(`R3 scoring on infield hit. Prob: ${(pScore * 100).toFixed(1)}%`);
      }
      if (Math.random() < pScore) {
        runnerAdvances.third = 1;
        runs += 1;
        if (DEBUG_FIELDING) {
          console.log(`R3 scores.`);
        }
      }
    }
    if (runners.second) {
      const pAdvance = 0.3 + 0.3 * speed(runners.second);
      if (DEBUG_FIELDING) {
        console.log(`R2 advance to 3B on infield hit. Prob: ${(pAdvance * 100).toFixed(1)}%`);
      }
      runnerAdvances.second = Math.random() < pAdvance ? 1 : 0;
      if (DEBUG_FIELDING && runnerAdvances.second === 1) {
        console.log(`R2 advances to 3B.`);
      }
    }
    if (runners.first) {
      const pAdvance = 0.65 + 0.2 * speed(runners.first);
      if (DEBUG_FIELDING) {
        console.log(`R1 advance to 2B on infield hit. Prob: ${(pAdvance * 100).toFixed(1)}%`);
      }
      runnerAdvances.first = Math.random() < pAdvance ? 1 : 0;
      if (DEBUG_FIELDING && runnerAdvances.first === 1) {
        console.log(`R1 advances to 2B.`);
      }
    }
  }

  const playResult = {
    field,
    outs,
    runs,
    batterBases,
    runnerAdvances,
    runnersOut,
  };

  if (DEBUG_FIELDING) {
    console.log(`Fielding complete. Final: outs=${outs}, runs=${runs}, batter to ${batterBases}B, runners out: [${runnersOut.join(', ')}], advances:`, runnerAdvances);
  }

  // new NarrationEngine().narrateFielding(playResult, runners, ball.batter);

  return playResult;
}
