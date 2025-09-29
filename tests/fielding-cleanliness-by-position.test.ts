import { test } from "bun:test";
import { estimateDropZone, calculateAirTime } from "../game/fielding.ts";
import { simulatePitch } from "../game/pitching.ts";
import { calculateSwing, calculateHit } from "../game/batting.ts";
import { clamp } from "../game/math.ts";
import type { BattedBall, FieldingPosition } from "../game/types.ts";

// Helpers to generate realistic batted balls via the full pipeline
function makeBatter(contact: number, power: number) {
  // Minimal player-like object compatible with batting.ts
  return {
    stats: {
      contact,
      power,
      running: 5,
      pitching: 0,
      fielding: 0,
      charisma: 0,
      growth: 0,
    },
  } as any;
}

function makePitcher(pitching: number) {
  return {
    stats: {
      contact: 0,
      power: 0,
      running: 0,
      pitching,
      fielding: 0,
      charisma: 0,
      growth: 0,
    },
  } as any;
}

function collectFairBalls(targetBalls: number, contact = 5, power = 5): BattedBall[] {
  const batter = makeBatter(contact, power);
  const pitcher = makePitcher(5);
  const balls: BattedBall[] = [];

  let attempts = 0;
  const maxAttempts = targetBalls * 100; // generous cap

  while (balls.length < targetBalls && attempts < maxAttempts) {
    attempts++;
    const pitch = simulatePitch(pitcher);
    const swung = calculateSwing(batter.stats.contact, pitch.isStrike);
    if (!swung) continue;

    const res = calculateHit(batter, pitch);
    if (res && !res.foul) {
      balls.push(res);
    }
  }
  return balls;
}

// Local reimplementations of small classification helpers used by fielding.ts
type BallType = "GROUND" | "LINE" | "FLY" | "POP";
function classifyBall(ball: BattedBall): BallType {
  const a = ball.launch;
  if (a < 10) return "GROUND";
  if (a < 25) return "LINE";
  if (a < 60) return "FLY";
  return "POP";
}

const OUTFIELD: FieldingPosition[] = ["Left Field", "Center Field", "Right Field"];
const INFIELD: FieldingPosition[] = ["First Base", "Second Base", "Third Base", "Shortstop"];
const BATTERY: FieldingPosition[] = ["Pitcher", "Catcher"];
function isOutfielder(pos: FieldingPosition) { return OUTFIELD.includes(pos); }
function isInfielder(pos: FieldingPosition) { return INFIELD.includes(pos); }
function isBattery(pos: FieldingPosition) { return BATTERY.includes(pos); }

// Reimplementation of catchProbability() using numeric fielder skill (0..10)
function catchProbabilityApprox(
  ball: BattedBall,
  pos: FieldingPosition,
  ballType: BallType,
  airTime: number,
  fielderFielding: number,
): number {
  const logistic = (x: number) => 1 / (1 + Math.exp(-x));
  let base = 0;

  if (ballType === "POP") {
    base = logistic((airTime - 1.2) / 0.4);
  } else if (ballType === "FLY") {
    base = logistic((airTime - 1.8) / 0.5);
  } else if (ballType === "LINE") {
    base = 0.5 * logistic((airTime - 0.6) / 0.18);
  } else {
    base = 0;
  }

  if (isOutfielder(pos) && (ballType === "FLY" || ballType === "POP")) base *= 0.8;
  if (isInfielder(pos) && ballType === "LINE") base *= 0.5;

  const s = Math.pow((fielderFielding ?? 0) / 10, 0.8);
  let p = base * (0.55 + 0.65 * s);

  if (ballType === "LINE") {
    const veloPenalty = clamp((ball.velo - 70) / 60, 0, 0.35);
    p *= 1 - veloPenalty;
  }

  if (ball.homer && ball.launch > 0) p = 0;

  return clamp(p, 0, 0.995);
}

// Reimplementation of fieldCleanlyProbability() using numeric fielder skill (0..10)
function fieldCleanlyProbabilityApprox(
  ball: BattedBall,
  pos: FieldingPosition,
  ballType: BallType,
  fielderFielding: number,
): number {
  const skill = (fielderFielding ?? 0) / 10;
  let base = 0.5;

  if (ballType === "GROUND") {
    if (isInfielder(pos) || isBattery(pos)) {
      base = 0.85;
      base -= clamp((ball.velo - 55) / 80, 0, 0.12);
      base += 0.1 * Math.pow(skill, 0.8);
    } else {
      base = 0.88 + 0.08 * Math.pow(skill, 0.8);
      base -= clamp((ball.velo - 60) / 100, 0, 0.08);
    }
  } else {
    base = 0.9 + 0.06 * Math.pow(skill, 0.8);
    base -= clamp((ball.velo - 70) / 120, 0, 0.06);
  }

  return clamp(base, 0.5, 0.99);
}

test("Caught or cleanly fielded rate by position (10,000 fair balls, avg fielding=5)", () => {
  const targetBalls = 10000;

  console.log(`\nPercent of random fair batted balls that are caught or fielded cleanly by position`);
  console.log(`Using ${targetBalls.toLocaleString()} fair batted balls generated via pitch → swing → contact (contact=5, power=5, pitcher=5)`);
  console.log(`Fielder skill assumed uniform: fielding=5 for all positions. Immediate HRs are not catchable and not counted as clean fielding.\n`);

  const positions: FieldingPosition[] = [
    "Pitcher",
    "Catcher",
    "First Base",
    "Second Base",
    "Third Base",
    "Shortstop",
    "Left Field",
    "Center Field",
    "Right Field",
  ];

  const totals: Record<FieldingPosition, number> = {
    Pitcher: 0, Catcher: 0, "First Base": 0, "Second Base": 0, "Third Base": 0, Shortstop: 0,
    "Left Field": 0, "Center Field": 0, "Right Field": 0, Bench: 0,
  };
  const caughtCounts: Record<FieldingPosition, number> = {
    Pitcher: 0, Catcher: 0, "First Base": 0, "Second Base": 0, "Third Base": 0, Shortstop: 0,
    "Left Field": 0, "Center Field": 0, "Right Field": 0, Bench: 0,
  };
  const cleanCounts: Record<FieldingPosition, number> = {
    Pitcher: 0, Catcher: 0, "First Base": 0, "Second Base": 0, "Third Base": 0, Shortstop: 0,
    "Left Field": 0, "Center Field": 0, "Right Field": 0, Bench: 0,
  };

  const balls = collectFairBalls(targetBalls, 5, 5);

  for (const ball of balls) {
    // Skip bench/unplayable (shouldn't occur for fair balls)
    const pos = estimateDropZone(ball);
    if (!positions.includes(pos)) continue;

    totals[pos]++;

    const airTime = calculateAirTime(ball);
    const type = classifyBall(ball);

    const fielderSkill = 5; // uniform average fielding

    const pCatch = catchProbabilityApprox(ball, pos, type, airTime, fielderSkill);
    const caught = Math.random() < pCatch;

    if (caught) {
      caughtCounts[pos]++;
      continue;
    }

    // Immediate HRs are not cleanly fieldable (over the fence)
    if (ball.homer && ball.launch > 0) {
      continue;
    }

    const pClean = fieldCleanlyProbabilityApprox(ball, pos, type, fielderSkill);
    const clean = Math.random() < pClean;
    if (clean) cleanCounts[pos]++;
  }

  const header = "Position    |  Balls  |  Caught% |  Clean%  | Caught+Clean%";
  console.log(header);
  console.log("-".repeat(header.length));

  for (const pos of positions) {
    const t = totals[pos] ?? 0;
    const caught = caughtCounts[pos] ?? 0;
    const clean = cleanCounts[pos] ?? 0;
    const caughtOrClean = caught + clean;

    const posStr = pos.padEnd(11, " ");
    const ballsStr = t.toString().padStart(7, " ");
    const caughtPct = (t > 0 ? (caught / t) * 100 : 0).toFixed(1).padStart(8, " ") + "%";
    const cleanPct = (t > 0 ? (clean / t) * 100 : 0).toFixed(1).padStart(8, " ") + "%";
    const totalPct = (t > 0 ? (caughtOrClean / t) * 100 : 0).toFixed(1).padStart(12, " ") + "%";
    console.log(`${posStr} | ${ballsStr} | ${caughtPct} | ${cleanPct} | ${totalPct}`);
  }

  const grandTotal = positions.reduce((s, p) => s + (totals[p] ?? 0), 0);
  console.log(`\nTotals across positions (fair balls considered): ${grandTotal.toLocaleString()}`);
  console.log("");
});
