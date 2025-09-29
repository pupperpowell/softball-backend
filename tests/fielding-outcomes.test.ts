import { test } from "bun:test";
import { simulateFielding, simulateFieldingWithRunners } from "../game/fielding.ts";
import type { BattedBall, FieldingPosition } from "../game/types.ts";
import { Player } from "../game/Player.ts";
import { Team } from "../game/Team.ts";

// Helpers
function makePlayerWith(fielding = 5, running = 5, contact = 0, power = 0): Player {
  const first = (Math.random()*100).toFixed(0).toString();
  const last = (Math.random()*100).toFixed(0).toString();
  return new Player(first, last, {
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
  const t = new Team("Testers") as any as Team & { players: Player[] };
  const p = makePlayerWith(fielding, 5);
  p.position = pos;
  // Fill a minimal roster with the chosen fielder at the target pos;
  // simulateFielding will fallback if needed, but we prefer explicit.
  (t as any).players = [p];
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

// 1) Outfield catch rate vs fielder skill (Center Field)
test("Outfield catch rate scales with fielder skill (CF)", () => {
  const trials = 20000;

  // Fly ball to straight CF: launch in fly band, decent velo to the OF
  const cfBall = makeBall(78, 35, 0);

  const lowTeam = makeTeamWithPosition("Center Field", 1);
  const highTeam = makeTeamWithPosition("Center Field", 9);

  let lowCaught = 0;
  let highCaught = 0;

  for (let i = 0; i < trials; i++) {
    const rLow = simulateFielding(cfBall, lowTeam);
    if (rLow.result === "OUT" && rLow.hit === false) lowCaught++;

    const rHigh = simulateFielding(cfBall, highTeam);
    if (rHigh.result === "OUT" && rHigh.hit === false) highCaught++;
  }

  console.log("\nOutfield (CF) catch rates on a representative fly ball");
  console.log(`Trials: ${trials.toLocaleString()}`);
  console.log(`Low skill CF (fielding=1):  ${pct(lowCaught, trials)} caught`);
  console.log(`High skill CF (fielding=9): ${pct(highCaught, trials)} caught\n`);
});

// 2) Infield grounder out rate vs SS skill
test("Infield grounder out rate scales with infielder skill (SS)", () => {
  const trials = 20000;

  // Grounder to SS: small negative attack, low launch
  const ssBall = makeBall(65, 5, -15);

  const lowTeam = makeTeamWithPosition("Shortstop", 1);
  const highTeam = makeTeamWithPosition("Shortstop", 9);

  let lowOut = 0;
  let highOut = 0;

  for (let i = 0; i < trials; i++) {
    const rLow = simulateFielding(ssBall, lowTeam);
    if (rLow.result === "OUT") lowOut++;

    const rHigh = simulateFielding(ssBall, highTeam);
    if (rHigh.result === "OUT") highOut++;
  }

  console.log("\nInfield (SS) grounder routine-out probability");
  console.log(`Trials: ${trials.toLocaleString()}`);
  console.log(`Low skill SS (fielding=1):  ${pct(lowOut, trials)} outs`);
  console.log(`High skill SS (fielding=9): ${pct(highOut, trials)} outs\n`);
});

// 3) Outfield extra-base suppression vs OF skill (doubles/triples lower for high skill)
test("Outfield extra-base hit suppression by OF skill", () => {
  const trials = 20000;

  // Ball to a corner/gap tendency (higher XBH chance): attack ~ 35 (right-center-ish), decent velo/launch
  const ofBall = makeBall(82, 28, 35);

  const lowTeam = makeTeamWithPosition("Right Field", 1);
  const highTeam = makeTeamWithPosition("Right Field", 9);

  let lowXBH = 0; // doubles + triples
  let highXBH = 0;

  for (let i = 0; i < trials; i++) {
    const rLow = simulateFielding(ofBall, lowTeam);
    if (rLow.result === "DOUBLE" || rLow.result === "TRIPLE") lowXBH++;

    const rHigh = simulateFielding(ofBall, highTeam);
    if (rHigh.result === "DOUBLE" || rHigh.result === "TRIPLE") highXBH++;
  }

  console.log("\nOutfield XBH suppression (doubles+triples) by RF skill on a corner/gap ball");
  console.log(`Trials: ${trials.toLocaleString()}`);
  console.log(`Low skill RF (fielding=1):  ${pct(lowXBH, trials)} XBH`);
  console.log(`High skill RF (fielding=9): ${pct(highXBH, trials)} XBH\n`);
});

// 4) Home run: immediate outcome regardless of fielder
test("Home run shortcut yields HOME_RUN outcome", () => {
  const trials = 5000;

  const hrBall = makeBall(90, 27, 0, { homer: true }); // classic HR profile
  const team = makeTeamWithPosition("Center Field", 5);

  let hrs = 0;

  for (let i = 0; i < trials; i++) {
    const r = simulateFielding(hrBall, team);
    if (r.result === "HOME_RUN") hrs++;
  }

  console.log("\nHome run immediate outcome");
  console.log(`Trials: ${trials.toLocaleString()}`);
  console.log(`HOME_RUN rate: ${pct(hrs, trials)} (should be ~100%)\n`);
});

// 5) Tag-up at third vs outfielder arm (uses simulateFieldingWithRunners)
test("Tag-up at third: runs vs outs vary with OF arm (fielding)", () => {
  const trials = 15000;

  // Deep fly ball to CF to get a high caught probability and realistic tag scenario
  const deepFly = makeBall(80, 38, 0);

  // Runner at third with average speed
  const r3 = makePlayerWith(5, 5);

  const lowArmTeam = makeTeamWithPosition("Center Field", 2);
  const highArmTeam = makeTeamWithPosition("Center Field", 9);

  let lowArmRuns = 0;
  let lowArmTagOuts = 0;
  let lowArmCaught = 0;

  let highArmRuns = 0;
  let highArmTagOuts = 0;
  let highArmCaught = 0;

  for (let i = 0; i < trials; i++) {
    // Low arm CF
    {
      const res = simulateFieldingWithRunners({ first: undefined, second: undefined, third: r3, outs: 0 }, deepFly, lowArmTeam);
      if (res.field.result === "OUT" && res.field.hit === false) {
        lowArmCaught++;
        if (res.runnersOut.includes("third")) lowArmTagOuts++;
        lowArmRuns += res.runs;
      }
    }
    // High arm CF
    {
      const res = simulateFieldingWithRunners({ first: undefined, second: undefined, third: r3, outs: 0 }, deepFly, highArmTeam);
      if (res.field.result === "OUT" && res.field.hit === false) {
        highArmCaught++;
        if (res.runnersOut.includes("third")) highArmTagOuts++;
        highArmRuns += res.runs;
      }
    }
  }

  console.log("\nTag-up from 3rd on deep CF fly ball (only counting plays where the ball was caught)");
  console.log(`Trials: ${trials.toLocaleString()} (per arm setting)`);
  console.log(`Low arm CF (fielding=2): caught=${lowArmCaught}, tag-outs=${lowArmTagOuts}, runs=${lowArmRuns}`);
  console.log(`High arm CF (fielding=9): caught=${highArmCaught}, tag-outs=${highArmTagOuts}, runs=${highArmRuns}\n`);
});
