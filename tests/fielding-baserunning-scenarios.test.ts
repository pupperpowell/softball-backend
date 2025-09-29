import { test } from "bun:test";
import { simulateFieldingWithRunners } from "../game/fielding.ts";
import type { BattedBall, FieldingPosition } from "../game/types.ts";
import { Player } from "../game/Player.ts";
import { Team } from "../game/Team.ts";

// Helpers
function makePlayerWith(fielding = 5, running = 5, contact = 0, power = 0): Player {
  return new Player(undefined, undefined, {
    contact,
    power,
    running,
    pitching: 0,
    fielding,
    charisma: 0,
    growth: 0,
  });
}

function makeTeamWithPosition(pos: FieldingPosition, fielding = 5): Team {
  const t = new Team("Testers");
  (t as any).players = [];
  const p = makePlayerWith(fielding, 5);
  p.position = pos;
  (t as any).players.push(p);
  return t;
}

function makeBall(velo: number, launch: number, attack: number, overrides?: Partial<BattedBall>): BattedBall {
  return {
    batter: makePlayerWith(5, 5, 5, 5),
    velo,
    foul: false,
    homer: false,
    attack,
    launch,
    ...overrides,
  };
}

function pct(n: number, d: number): string {
  return ((n / Math.max(1, d)) * 100).toFixed(1) + "%";
}

// 1) Bases loaded HOME RUN: deterministic advancement
test("Bases-loaded home run advances all runners + batter (4 runs), no outs", () => {
  const team = makeTeamWithPosition("Center Field", 5);

  const r1 = makePlayerWith(5, 5);
  const r2 = makePlayerWith(5, 5);
  const r3 = makePlayerWith(5, 5);

  // Force HR path via homer=true and positive launch
  const hrBall = makeBall(95, 27, 0, { homer: true });

  const res = simulateFieldingWithRunners({ first: r1, second: r2, third: r3, outs: 0 }, hrBall, team);

  if (res.field.result !== "HOME_RUN") {
    throw new Error(`Expected HOME_RUN result, got ${res.field.result}`);
  }
  if (res.outs !== 0) {
    throw new Error(`Expected 0 outs, got ${res.outs}`);
  }
  if (res.batterBases !== 4) {
    throw new Error(`Expected batterBases=4, got ${res.batterBases}`);
  }
  if (res.runs !== 4) {
    throw new Error(`Expected 4 runs to score, got ${res.runs}`);
  }
  if ((res.runnerAdvances.third ?? 0) !== 1) {
    throw new Error(`Expected R3 to score (advance 1), got ${res.runnerAdvances.third}`);
  }
  if ((res.runnerAdvances.second ?? 0) !== 2) {
    throw new Error(`Expected R2 to advance 2 (score), got ${res.runnerAdvances.second}`);
  }
  if ((res.runnerAdvances.first ?? 0) !== 3) {
    throw new Error(`Expected R1 to advance 3 (score), got ${res.runnerAdvances.first}`);
  }
});

// 2) Infield pop with R3: no tag-ups allowed on infield catches; no runs on caught pop
test("Infield pop (caught) with R3: no tag-up advancement from third", () => {
  const trials = 6000;
  const team = makeTeamWithPosition("Catcher", 7);
  const r3 = makePlayerWith(5, 5);

  // Very high, almost straight-up pop near the plate
  const infieldPop = makeBall(60, 88, 0);

  let caughtPlays = 0;
  let runsOnCaught = 0;

  for (let i = 0; i < trials; i++) {
    const res = simulateFieldingWithRunners({ first: undefined, second: undefined, third: r3, outs: 0 }, infieldPop, team);
    if (res.field.result === "OUT" && res.field.hit === false) {
      caughtPlays++;
      runsOnCaught += res.runs;
    }
  }

  console.log("\nInfield pop with R3: caught plays and runs on caught");
  console.log(`Trials: ${trials.toLocaleString()}, Caught: ${caughtPlays}, Runs on caught: ${runsOnCaught}\n`);

  if (caughtPlays < 50) {
    throw new Error(`Insufficient caught samples (${caughtPlays}) to evaluate`);
  }
  if (runsOnCaught !== 0) {
    throw new Error(`Expected 0 runs on caught infield pop, observed ${runsOnCaught}`);
  }
});

// 3) Outfield caught fly with R3: high arm yields more tag-out rate and fewer runs on caught
test("OF fly caught with R3: high arm yields more tag outs and fewer runs per caught", () => {
  const trials = 15000;

  const lowArmTeam = makeTeamWithPosition("Center Field", 2);
  const highArmTeam = makeTeamWithPosition("Center Field", 9);

  const r3 = makePlayerWith(5, 5);

  // Deep fly ball → high caught probability and realistic tag-up situation
  const deepFly = makeBall(80, 38, 0);

  let lowCaught = 0, lowRuns = 0, lowTagOuts = 0;
  let highCaught = 0, highRuns = 0, highTagOuts = 0;

  for (let i = 0; i < trials; i++) {
    {
      const res = simulateFieldingWithRunners({ first: undefined, second: undefined, third: r3, outs: 0 }, deepFly, lowArmTeam);
      if (res.field.result === "OUT" && res.field.hit === false) {
        lowCaught++;
        lowRuns += res.runs;
        if (res.runnersOut.includes("third")) lowTagOuts++;
      }
    }
    {
      const res = simulateFieldingWithRunners({ first: undefined, second: undefined, third: r3, outs: 0 }, deepFly, highArmTeam);
      if (res.field.result === "OUT" && res.field.hit === false) {
        highCaught++;
        highRuns += res.runs;
        if (res.runnersOut.includes("third")) highTagOuts++;
      }
    }
  }

  const lowTagRate = lowTagOuts / Math.max(1, lowCaught);
  const highTagRate = highTagOuts / Math.max(1, highCaught);
  const lowRunsPerCaught = lowRuns / Math.max(1, lowCaught);
  const highRunsPerCaught = highRuns / Math.max(1, highCaught);

  console.log("\nTag-up from 3rd on deep OF fly (only caught plays considered)");
  console.log(`Trials per arm: ${trials.toLocaleString()}`);
  console.log(`Low arm: caught=${lowCaught}, tag-outs=${lowTagOuts} (${pct(lowTagOuts, lowCaught)}), runs=${lowRuns}, runs/caught=${lowRunsPerCaught.toFixed(3)}`);
  console.log(`High arm: caught=${highCaught}, tag-outs=${highTagOuts} (${pct(highTagOuts, highCaught)}), runs=${highRuns}, runs/caught=${highRunsPerCaught.toFixed(3)}\n`);

  if (highTagRate <= lowTagRate) {
    throw new Error(`Expected high-arm tag-out rate > low-arm. Got ${highTagRate.toFixed(4)} <= ${lowTagRate.toFixed(4)}`);
  }
  if (highRunsPerCaught >= lowRunsPerCaught) {
    throw new Error(`Expected high-arm runs/caught < low-arm. Got ${highRunsPerCaught.toFixed(4)} >= ${lowRunsPerCaught.toFixed(4)}`);
  }
});

// 4) OF single with only R1: throw target is 3B; high arm should produce more outs at 3B
test("OF single with R1 only: high arm produces more outs at 3B than low arm", () => {
  const trials = 20000;

  const slowR1 = makePlayerWith(5, 1);
  const lowArmTeam = makeTeamWithPosition("Right Field", 2);
  const highArmTeam = makeTeamWithPosition("Right Field", 9);

  // OF single-like ball: medium-hard liner/fly to RF/gap
  const ofSingle = makeBall(78, 28, 30);

  let lowHits = 0, lowOutsAt3B = 0;
  let highHits = 0, highOutsAt3B = 0;

  const maxAttempts = trials * 2;

  // Low arm sampling
  for (let i = 0; i < maxAttempts && lowHits < trials; i++) {
    const res = simulateFieldingWithRunners({ first: slowR1, second: undefined, third: undefined, outs: 0 }, ofSingle, lowArmTeam);
    if (res.field.hit) {
      lowHits++;
      if (res.runnersOut.includes("first")) lowOutsAt3B++;
    }
  }
  // High arm sampling
  for (let i = 0; i < maxAttempts && highHits < trials; i++) {
    const res = simulateFieldingWithRunners({ first: slowR1, second: undefined, third: undefined, outs: 0 }, ofSingle, highArmTeam);
    if (res.field.hit) {
      highHits++;
      if (res.runnersOut.includes("first")) highOutsAt3B++;
    }
  }

  const lowRate = lowOutsAt3B / Math.max(1, lowHits);
  const highRate = highOutsAt3B / Math.max(1, highHits);

  console.log("\nOF single with R1 only (target 3B): outs at 3B per hit");
  console.log(`Low arm: outs=${lowOutsAt3B}/${lowHits} (${pct(lowOutsAt3B, lowHits)})`);
  console.log(`High arm: outs=${highOutsAt3B}/${highHits} (${pct(highOutsAt3B, highHits)})\n`);

  if (highRate <= lowRate) {
    throw new Error(`Expected high-arm outs@3B rate > low-arm. Got ${highRate.toFixed(4)} <= ${lowRate.toFixed(4)}`);
  }
});

// 5) OF single with only R2: throw target is Home; high arm should produce more outs at Home
test("OF single with R2 only: high arm produces more outs at Home than low arm", () => {
  const trials = 20000;

  const slowR2 = makePlayerWith(5, 1);
  const lowArmTeam = makeTeamWithPosition("Center Field", 2);
  const highArmTeam = makeTeamWithPosition("Center Field", 9);

  const ofSingle = makeBall(80, 27, 0);

  let lowHits = 0, lowOutsHome = 0;
  let highHits = 0, highOutsHome = 0;

  const maxAttempts = trials * 2;

  for (let i = 0; i < maxAttempts && lowHits < trials; i++) {
    const res = simulateFieldingWithRunners({ first: undefined, second: slowR2, third: undefined, outs: 0 }, ofSingle, lowArmTeam);
    if (res.field.hit) {
      lowHits++;
      if (res.runnersOut.includes("second")) lowOutsHome++;
    }
  }
  for (let i = 0; i < maxAttempts && highHits < trials; i++) {
    const res = simulateFieldingWithRunners({ first: undefined, second: slowR2, third: undefined, outs: 0 }, ofSingle, highArmTeam);
    if (res.field.hit) {
      highHits++;
      if (res.runnersOut.includes("second")) highOutsHome++;
    }
  }

  const lowRate = lowOutsHome / Math.max(1, lowHits);
  const highRate = highOutsHome / Math.max(1, highHits);

  console.log("\nOF single with R2 only (target Home): outs at Home per hit");
  console.log(`Low arm: outs=${lowOutsHome}/${lowHits} (${pct(lowOutsHome, lowHits)})`);
  console.log(`High arm: outs=${highOutsHome}/${highHits} (${pct(highOutsHome, highHits)})\n`);

  if (highRate <= lowRate) {
    throw new Error(`Expected high-arm outs@Home rate > low-arm. Got ${highRate.toFixed(4)} <= ${lowRate.toFixed(4)}`);
  }
});

 // 6) OF single with only R3: strategy throws to 2B (no contest at Home); expect near-zero outs at Home and high scoring rate
test("OF single with R3 only: no home contest (target 2B), near-zero outs at Home, high runs per hit", () => {
  const trials = 15000;

  const slowR3 = makePlayerWith(5, 1);
  const lowArmTeam = makeTeamWithPosition("Left Field", 2);
  const highArmTeam = makeTeamWithPosition("Left Field", 9);

  const ofSingle = makeBall(77, 26, -25);

  let lowHits = 0, lowOutsHome = 0, lowRuns = 0;
  let highHits = 0, highOutsHome = 0, highRuns = 0;

  const maxAttempts = trials * 2;

  for (let i = 0; i < maxAttempts && lowHits < trials; i++) {
    const res = simulateFieldingWithRunners({ first: undefined, second: undefined, third: slowR3, outs: 0 }, ofSingle, lowArmTeam);
    if (res.field.hit) {
      lowHits++;
      lowRuns += res.runs;
      if (res.runnersOut.includes("third")) lowOutsHome++;
    }
  }
  for (let i = 0; i < maxAttempts && highHits < trials; i++) {
    const res = simulateFieldingWithRunners({ first: undefined, second: undefined, third: slowR3, outs: 0 }, ofSingle, highArmTeam);
    if (res.field.hit) {
      highHits++;
      highRuns += res.runs;
      if (res.runnersOut.includes("third")) highOutsHome++;
    }
  }

  const lowRunsPerHit = lowRuns / Math.max(1, lowHits);
  const highRunsPerHit = highRuns / Math.max(1, highHits);

  console.log("\nOF single with R3 only (target 2B): outs at Home and runs per hit");
  console.log(`Low arm: outs@Home=${lowOutsHome}/${lowHits} (${pct(lowOutsHome, lowHits)}), runs/hit=${lowRunsPerHit.toFixed(3)}`);
  console.log(`High arm: outs@Home=${highOutsHome}/${highHits} (${pct(highOutsHome, highHits)}), runs/hit=${highRunsPerHit.toFixed(3)}\n`);

  if (lowOutsHome !== 0 || highOutsHome !== 0) {
    throw new Error(`Expected no home outs with only R3 (target is 2B). Observed low=${lowOutsHome}, high=${highOutsHome}`);
  }
  if (lowHits < trials / 10 || highHits < trials / 100) {
    throw new Error(`Insufficient HIT samples: lowHits=${lowHits}, highHits=${highHits}`);
  }
  // R3 generally scores on OF singles per model. Require reasonable scoring rate.
  if (lowRunsPerHit < 0.5 || highRunsPerHit < 0.5) {
    throw new Error(`Expected runs/hit >= 0.5 for R3 only. Got low=${lowRunsPerHit.toFixed(3)}, high=${highRunsPerHit.toFixed(3)}`);
  }
});

// 7) OF hits with no runners: should never produce runnersOut (there are no runners)
test("OF hits with no runners: never any runnersOut", () => {
  const trials = 8000;

  const team = makeTeamWithPosition("Center Field", 6);

  const balls = [
    makeBall(75, 25, 0),   // single-ish
    makeBall(85, 30, 35),  // XBH-leaning
    makeBall(88, 22, -28), // liner to LF
  ];

  let hits = 0;
  let bad = 0;

  const maxAttempts = trials * balls.length * 2;

  for (let i = 0; i < maxAttempts && hits < trials; i++) {
    const ball = balls[i % balls.length]!;
    const res = simulateFieldingWithRunners({ first: undefined, second: undefined, third: undefined, outs: 0 }, ball, team);
    if (res.field.hit) {
      hits++;
      if ((res.runnersOut ?? []).length > 0) bad++;
    }
  }

  console.log(`\nOF hits w/ no runners: hits=${hits}, runnersOut incidents=${bad}\n`);

  if (bad !== 0) {
    throw new Error(`Expected 0 runnersOut incidents with no runners, observed ${bad}`);
  }
});

// 8) Infield singles with runners on: conservative advances; no attempts to throw runners out
test("Infield singles with runners on: no runnersOut produced", () => {
  const targetHits = 1200;

  const team = makeTeamWithPosition("Shortstop", 7);

  const r1 = makePlayerWith(5, 6);
  const r2 = makePlayerWith(5, 5);
  const r3 = makePlayerWith(5, 7);

  // Grounder to SS; will often be an out, but collect only HIT plays
  const ifGrounder = makeBall(65, 5, -15);

  let hits = 0;
  let bad = 0;

  const maxAttempts = targetHits * 30;

  for (let i = 0; i < maxAttempts && hits < targetHits; i++) {
    const res = simulateFieldingWithRunners({ first: r1, second: r2, third: r3, outs: 0 }, ifGrounder, team);
    if (res.field.hit) {
      hits++;
      if ((res.runnersOut ?? []).length > 0) bad++;
    }
  }

  console.log(`\nInfield singles with runners on: hits=${hits}, runnersOut incidents=${bad}\n`);

  if (hits < targetHits / 2) {
    throw new Error(`Insufficient infield HIT samples (${hits}) to evaluate`);
  }
  if (bad !== 0) {
    throw new Error(`Expected no runnersOut on infield singles, observed ${bad}`);
  }
});

// 9) Mixed baserunner states on OF hit: target selection sanity and outcomes logged
test("OF hits: target selection scenarios summary (R1 only, R2 only, R1+R2)", () => {
  const trials = 8000;

  const team = makeTeamWithPosition("Right Field", 7);

  const ofBall = makeBall(82, 27, 20);

  type Counters = { hits: number; outsAt3B: number; outsAtHome: number; runs: number; r1To3rd: number; r2Score: number; };
  const r1Only: Counters = { hits: 0, outsAt3B: 0, outsAtHome: 0, runs: 0, r1To3rd: 0, r2Score: 0 };
  const r2Only: Counters = { hits: 0, outsAt3B: 0, outsAtHome: 0, runs: 0, r1To3rd: 0, r2Score: 0 };
  const r12: Counters =     { hits: 0, outsAt3B: 0, outsAtHome: 0, runs: 0, r1To3rd: 0, r2Score: 0 };

  const slow = makePlayerWith(5, 3);
  const avg  = makePlayerWith(5, 5);

  const maxAttempts = trials * 4;

  // R1 only
  for (let i = 0; i < maxAttempts && r1Only.hits < trials; i++) {
    const res = simulateFieldingWithRunners({ first: avg, second: undefined, third: undefined, outs: 0 }, ofBall, team);
    if (res.field.hit) {
      r1Only.hits++;
      r1Only.runs += res.runs;
      if ((res.runnerAdvances.first ?? 0) >= 2) r1Only.r1To3rd++;
      if (res.runnersOut.includes("first")) r1Only.outsAt3B++;
      if (res.runnersOut.includes("second") || res.runnersOut.includes("third")) r1Only.outsAtHome++;
    }
  }
  // R2 only
  for (let i = 0; i < maxAttempts && r2Only.hits < trials; i++) {
    const res = simulateFieldingWithRunners({ first: undefined, second: slow, third: undefined, outs: 0 }, ofBall, team);
    if (res.field.hit) {
      r2Only.hits++;
      r2Only.runs += res.runs;
      if ((res.runnerAdvances.second ?? 0) === 2) r2Only.r2Score++;
      if (res.runnersOut.includes("second")) r2Only.outsAtHome++;
    }
  }
  // R1 + R2
  for (let i = 0; i < maxAttempts && r12.hits < trials; i++) {
    const res = simulateFieldingWithRunners({ first: avg, second: slow, third: undefined, outs: 0 }, ofBall, team);
    if (res.field.hit) {
      r12.hits++;
      r12.runs += res.runs;
      if ((res.runnerAdvances.first ?? 0) >= 2) r12.r1To3rd++;
      if ((res.runnerAdvances.second ?? 0) === 2) r12.r2Score++;
      if (res.runnersOut.includes("first")) r12.outsAt3B++;
      if (res.runnersOut.includes("second")) r12.outsAtHome++;
    }
  }

  console.log("\nOF hits target scenarios summary (per HIT):");
  console.log(`R1 only: hits=${r1Only.hits}, R1->3B=${pct(r1Only.r1To3rd, r1Only.hits)}, outs@3B=${pct(r1Only.outsAt3B, r1Only.hits)}, outs@Home=${pct(r1Only.outsAtHome, r1Only.hits)}, runs/hit=${(r1Only.runs/Math.max(1,r1Only.hits)).toFixed(3)}`);
  console.log(`R2 only: hits=${r2Only.hits}, R2 score=${pct(r2Only.r2Score, r2Only.hits)}, outs@Home=${pct(r2Only.outsAtHome, r2Only.hits)}, runs/hit=${(r2Only.runs/Math.max(1,r2Only.hits)).toFixed(3)}`);
  console.log(`R1+R2  : hits=${r12.hits}, R1->3B=${pct(r12.r1To3rd, r12.hits)}, R2 score=${pct(r12.r2Score, r12.hits)}, outs@3B=${pct(r12.outsAt3B, r12.hits)}, outs@Home=${pct(r12.outsAtHome, r12.hits)}, runs/hit=${(r12.runs/Math.max(1,r12.hits)).toFixed(3)}\n`);

  // Sanity: with both R1 and R2, expect some outs at Home and at 3B in aggregate
  if (r12.outsAtHome === 0 && r12.outsAt3B === 0) {
    throw new Error("Expected at least some outs at Home/3B when both R1 and R2 are present on OF hits");
  }
});
