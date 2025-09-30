/*
 * Once a ball has been hit into play, the fielders must respond
 * and try to get as many runners out as possible.
 */

import type { Game } from "./Game.ts";
import { Player } from "./Player.ts";
import type {
	BattedBall,
	FieldingPosition,
	FieldOutcome,
	RunnersState,
} from "./types.ts"

const DEBUG = false;

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

/**
 * Represents a runner in motion during a play
 */
type RunnerInMotion = {
	player: Player;
	startBase: "home" | "first" | "second" | "third";
	currentBase: "home" | "first" | "second" | "third";
	targetBase: "first" | "second" | "third" | "home";
	isForced: boolean; // force play vs tag play
	canTagUp: boolean; // can advance on caught fly ball
	hasTaggedUp: boolean; // has tagged up after catch
}

/**
 * Main fielding simulation function
 */
export function simulateFielding(ball: BattedBall, game: Game): FieldOutcome {
	const ballType = classifyBall(ball);
	let outsRecorded = 0;
	let runsScored = 0;
	const initialRunners = { ...game.basesOccupied };

	// Phase 1: Determine primary fielder and attempt catch
	const primary_position: FieldingPosition = estimateDropZone(ball);
	let primary_fielder: Player = game.getFieldingTeam().getFielderByPosition(primary_position);
	
	let ballCaught = false;
	let catchingFielder: Player | null = null;

	// Only non-ground balls can be caught in the air
	if (ballType !== "GROUND") {
		const catchProb = calculateCatchProbability(ball, primary_fielder, ballType);
		ballCaught = Math.random() < catchProb;
		
		if (ballCaught) {
			catchingFielder = primary_fielder;
			outsRecorded++;
			if (DEBUG) console.log(`${primary_fielder.toString()} caught the ball! Out #${outsRecorded}`);
		}
	}

	// Handle home runs
	if (ball.homer && !ballCaught) {
		runsScored = getRunsFromHomer(initialRunners);
		game.addRuns(runsScored);
		game.basesOccupied = {};
		game.outs += outsRecorded;
		
		return {
			primary_fielder: primary_fielder,
			playType: "HOME_RUN",
			updatedBases: {},
		};
	}

	// If caught, handle tag-up scenario
	if (ballCaught) {
		const tagUpResult = handleTagUp(initialRunners, catchingFielder!, game);
		runsScored = tagUpResult.runsScored;
		outsRecorded += tagUpResult.outsRecorded;
		
		game.addRuns(runsScored);
		game.outs += outsRecorded;
		game.basesOccupied = tagUpResult.finalBases;
		
		const playType = outsRecorded >= 2 ? "DOUBLE_PLAY" : "OUT";
		return {
			primary_fielder: primary_fielder,
			playType: playType,
			updatedBases: tagUpResult.finalBases,
		};
	}

	// Phase 2: Ball not caught - handle ground ball or dropped fly ball
	
	// Check if infielder missed and ball rolls to outfield
	if (primary_fielder.isInfielder() && (ballType === "LINE" || ballType === "GROUND")) {
		const fieldingError = Math.random() > getFieldingSuccessRate(primary_fielder);
		
		if (fieldingError) {
			if (DEBUG) console.log(`${primary_fielder.toString()} missed the ball!`);
			// Ball rolls to outfield
			const attack = ball.attack;
			let outfieldPosition: FieldingPosition;
			if (attack < -20) {
				outfieldPosition = "Left Field";
			} else if (attack > 20) {
				outfieldPosition = "Right Field";
			} else {
				outfieldPosition = "Center Field";
			}
			primary_fielder = game.getFieldingTeam().getFielderByPosition(outfieldPosition);
		}
	}

	// Phase 3: Simulate runner advancement
	const runners = initializeRunners(initialRunners, ball.batter);
	const fieldingResult = simulateRunnerAdvancement(runners, primary_fielder, game, ballType);
	
	outsRecorded += fieldingResult.outsRecorded;
	runsScored += fieldingResult.runsScored;
	
	// Update game state
	game.addRuns(runsScored);
	game.outs += outsRecorded;
	game.basesOccupied = fieldingResult.finalBases;
	
	// Determine play type based on where batter ended up
	const playType = determinePlayType(ball.batter, fieldingResult.finalBases, outsRecorded);
	
	return {
		primary_fielder: primary_fielder,
		playType: playType,
		updatedBases: fieldingResult.finalBases,
	};
}

/**
 * Calculate probability of catching a ball
 */
function calculateCatchProbability(ball: BattedBall, fielder: Player, ballType: BallType): number {
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
				depthBonus = -0.15; // easier in shallow outfield
			} else if (rangeFt > 350) { // deep outfield
				depthBonus = -0.15; // harder in deep outfield
			} // mid-range (250-350 ft) gets no modifier
		}

		p += depthBonus;

		// Gap factor: balls hit into gaps are harder to catch
		const attack = ball.attack;
		const inGap = attack >= -10 && attack <= 10;
		if (inGap) {
			gapFactor = 0.7; // Reduce catch probability by 30% for balls hit into gaps
		}
	}

	p *= gapFactor;

	// Base probability by ball type
	if (ballType === "LINE") {
		p += fielder.stats.fielding * 0.005;
	} else if (ballType === "POP") {
		p += fielder.stats.fielding * 0.030 + fielder.stats.running * 0.020;
	} else if (ballType === "FLY") {
		p += fielder.stats.fielding * 0.015 + fielder.stats.running * 0.015;
	}

	return Math.min(p, 0.95); // Cap at 95%
}

/**
 * Calculate fielding success rate for ground balls
 */
function getFieldingSuccessRate(fielder: Player): number {
	const baseRate = 0.1;
	const skillBonus = fielder.stats.fielding * 0.03;
	return Math.min(baseRate + skillBonus, 0.90);
}

/**
 * Handle tag-up scenario after a caught fly ball
 */
function handleTagUp(
	runners: RunnersState,
	catchingFielder: Player,
	game: Game
): { runsScored: number; outsRecorded: number; finalBases: RunnersState } {
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
			if (DEBUG) console.log(`${runner.fullName()} tagged up and scored!`);
		} else if (tagUpSuccess === "OUT") {
			outsRecorded++;
			if (DEBUG) console.log(`${runner.fullName()} tagged up but was thrown out at home!`);
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
			if (DEBUG) console.log(`${runner.fullName()} tagged up and advanced to third!`);
		} else if (tagUpSuccess === "OUT") {
			outsRecorded++;
			if (DEBUG) console.log(`${runner.fullName()} tagged up but was thrown out at third!`);
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
				if (DEBUG) console.log(`${runner.fullName()} tagged up and advanced to second!`);
			} else if (tagUpSuccess === "OUT") {
				outsRecorded++;
				if (DEBUG) console.log(`${runner.fullName()} tagged up but was thrown out at second!`);
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
function attemptTagUpAdvance(
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

/**
 * Initialize runners including the batter
 */
function initializeRunners(bases: RunnersState, batter: Player): RunnerInMotion[] {
	const runners: RunnerInMotion[] = [];
	
	// Add batter running to first
	runners.push({
		player: batter,
		startBase: "home",
		currentBase: "home",
		targetBase: "first",
		isForced: true,
		canTagUp: false,
		hasTaggedUp: false,
	});
	
	// Add existing baserunners
	if (bases.first) {
		runners.push({
			player: bases.first,
			startBase: "first",
			currentBase: "first",
			targetBase: "second",
			isForced: true, // Forced by batter
			canTagUp: false,
			hasTaggedUp: false,
		});
	}
	
	if (bases.second) {
		runners.push({
			player: bases.second,
			startBase: "second",
			currentBase: "second",
			targetBase: "third",
			isForced: !!bases.first, // Only forced if runner on first
			canTagUp: false,
			hasTaggedUp: false,
		});
	}
	
	if (bases.third) {
		runners.push({
			player: bases.third,
			startBase: "third",
			currentBase: "third",
			targetBase: "home",
			isForced: !!bases.second && !!bases.first, // Only forced if bases loaded
			canTagUp: false,
			hasTaggedUp: false,
		});
	}
	
	return runners;
}

/**
 * Simulate runner advancement with fielders making plays
 */
function simulateRunnerAdvancement(
	runners: RunnerInMotion[],
	primaryFielder: Player,
	game: Game,
	ballType: BallType
): { outsRecorded: number; runsScored: number; finalBases: RunnersState } {
	let outsRecorded = 0;
	let runsScored = 0;
	const activeRunners = [...runners];
	
	// Calculate initial fielding time (time to get to ball and secure it)
	const fieldingTime = calculateFieldingTime(primaryFielder, ballType);
	
	let currentFielder = primaryFielder;
	let throwCount = 0;
	const MAX_THROWS = 3; // Prevent infinite loops
	
	while (throwCount < MAX_THROWS && activeRunners.length > 0 && outsRecorded < 3) {
		// Determine which runner to target (prioritize lead runner)
		const targetRunner = selectTargetRunner(activeRunners);
		
		if (!targetRunner) break;
		
		// Calculate if fielder can make the play
		const playResult = attemptPlay(
			targetRunner,
			currentFielder,
			game,
			fieldingTime + throwCount * 0.5 // Each throw adds delay
		);
		
		if (playResult === "OUT") {
			outsRecorded++;
			if (DEBUG) console.log(`${targetRunner.player.fullName()} is out at ${targetRunner.targetBase}!`);
			// Remove runner from active runners
			const index = activeRunners.indexOf(targetRunner);
			activeRunners.splice(index, 1);
			
			// Check for double play opportunity
			if (outsRecorded < 2 && activeRunners.length > 0 && throwCount === 0) {
				// Try for double play
				const nextTarget = selectTargetRunner(activeRunners);
				if (nextTarget && nextTarget.isForced) {
					// Get fielder at target base
					const nextFielder = getFielderAtBase(nextTarget.targetBase, game);
					const dpResult = attemptPlay(nextTarget, nextFielder, game, 0.3);
					
					if (dpResult === "OUT") {
						outsRecorded++;
						if (DEBUG) console.log(`Double play! ${nextTarget.player.fullName()} is out at ${nextTarget.targetBase}!`);
						const dpIndex = activeRunners.indexOf(nextTarget);
						activeRunners.splice(dpIndex, 1);
					}
				}
			}
		} else if (playResult === "SAFE") {
			if (DEBUG) console.log(`${targetRunner.player.fullName()} is safe at ${targetRunner.targetBase}!`);
			targetRunner.currentBase = targetRunner.targetBase;
			
			// Check if runner scored
			if (targetRunner.targetBase === "home") {
				if (DEBUG) console.log(`${targetRunner.player} scored`)
				runsScored++;
				const index = activeRunners.indexOf(targetRunner);
				activeRunners.splice(index, 1);
			} else {
				// Determine if runner should try for next base (aggressive baserunning)
				const shouldAdvance = shouldRunnerAdvanceExtra(targetRunner, ballType, throwCount);
				if (shouldAdvance) {
					targetRunner.targetBase = getNextBase(targetRunner.currentBase);
					targetRunner.isForced = false;
				}
			}
		}
		
		throwCount++;
		
		// Update current fielder to the one at the target base
		if (targetRunner.targetBase !== "home") {
			currentFielder = getFielderAtBase(targetRunner.targetBase, game);
		}
	}
	
	// Advance any remaining runners who are safe
	for (const runner of activeRunners) {
		if (runner.currentBase !== runner.targetBase) {
			runner.currentBase = runner.targetBase;
		}
	}
	
	// Build final bases state
	const finalBases: RunnersState = {};
	for (const runner of activeRunners) {
		if (runner.currentBase === "first") {
			finalBases.first = runner.player;
		} else if (runner.currentBase === "second") {
			finalBases.second = runner.player;
		} else if (runner.currentBase === "third") {
			finalBases.third = runner.player;
		}
	}
	
	return { outsRecorded, runsScored, finalBases };
}

/**
 * Calculate time for fielder to get to ball and secure it
 */
function calculateFieldingTime(fielder: Player, ballType: BallType): number {
	let baseTime = 1.0; // seconds
	
	if (ballType === "GROUND") {
		baseTime = 1.2; // Increased from 0.5 to give runners more time
	} else if (ballType === "LINE") {
		baseTime = 1.5; // Increased from 0.8
	} else if (ballType === "FLY") {
		baseTime = 2.0; // Increased from 1.5
	} else if (ballType === "POP") {
		baseTime = 1.8; // Increased from 1.2
	}
	
	// Fielding skill reduces time
	const skillReduction = fielder.stats.fielding * 0.05;
	return Math.max(baseTime - skillReduction, 0.5); // Increased minimum from 0.3 to 0.5
}

/**
 * Select which runner to target (prioritize lead runner)
 */
function selectTargetRunner(runners: RunnerInMotion[]): RunnerInMotion | null {
	if (runners.length === 0) return null;

	// Priority: home > third > second > first
	const priorities: Record<"home" | "first" | "second" | "third", number> = { home: 4, third: 3, second: 2, first: 1 };

	let bestRunner: RunnerInMotion = runners[0]!;
	let bestPriority = priorities[bestRunner.targetBase];

	for (const runner of runners) {
		const priority = priorities[runner.targetBase];
		if (priority > bestPriority) {
			bestRunner = runner;
			bestPriority = priority;
		}
	}

	return bestRunner;
}

/**
 * Attempt to make a play on a runner
 */
function attemptPlay(
	runner: RunnerInMotion,
	fielder: Player,
	game: Game,
	timeDelay: number
): "OUT" | "SAFE" {
	const runnerSpeed = 27 + runner.player.stats.running * 1.5; // ft/s (27-42 ft/s range)
	const throwSpeed = 70 + fielder.stats.fielding * 1.5; // ft/s (70-85 ft/s range)
	
	// Distance calculations
	const runnerDistance = 60; // feet between bases
	let throwDistance = 90; // approximate
	
	if (fielder.isOutfielder()) {
		throwDistance = 200; // longer throw from outfield
	}
	
	const runnerTime = runnerDistance / runnerSpeed;
	const throwTime = throwDistance / throwSpeed + timeDelay;
	
	// Force play vs tag play
	if (runner.isForced) {
		// Force play - just need ball to beat runner
		return runnerTime > throwTime ? "OUT" : "SAFE";
	} else {
		// Tag play - fielder needs extra time to apply tag
		const tagTime = 0.3 - (fielder.stats.fielding * 0.02);
		const totalFielderTime = throwTime + tagTime;
		
		// Add some randomness for close plays
		const margin = runnerTime - totalFielderTime;
		if (Math.abs(margin) < 0.2) {
			// Close play - 50/50 with slight advantage to runner
			return Math.random() < 0.45 ? "OUT" : "SAFE";
		}
		
		return runnerTime > totalFielderTime ? "OUT" : "SAFE";
	}
}

/**
 * Get fielder at a specific base
 */
function getFielderAtBase(base: "first" | "second" | "third" | "home", game: Game): Player {
	const positionMap = {
		first: "First Base" as FieldingPosition,
		second: "Second Base" as FieldingPosition,
		third: "Third Base" as FieldingPosition,
		home: "Catcher" as FieldingPosition,
	};
	
	return game.getFieldingTeam().getFielderByPosition(positionMap[base]);
}

/**
 * Determine if runner should try for extra base
 */
function shouldRunnerAdvanceExtra(runner: RunnerInMotion, ballType: BallType, throwCount: number): boolean {
	// More likely on ground balls and after multiple throws
	const baseChance = ballType === "GROUND" ? 0.3 : 0.1;
	const throwBonus = throwCount * 0.15;
	const aggressionBonus = runner.player.stats.running * 0.02;
	
	const totalChance = baseChance + throwBonus + aggressionBonus;
	return Math.random() < totalChance;
}

/**
 * Get next base in sequence
 */
function getNextBase(current: "home" | "first" | "second" | "third"): "first" | "second" | "third" | "home" {
	const sequence = { home: "first", first: "second", second: "third", third: "home" } as const;
	return sequence[current];
}

/**
 * Determine play type based on where batter ended up
 */
function determinePlayType(batter: Player, finalBases: RunnersState, outsRecorded: number): "SINGLE" | "DOUBLE" | "TRIPLE" | "HOME_RUN" | "OUT" | "DOUBLE_PLAY" | "TRIPLE_PLAY" {
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

export function isHit(result: string): boolean {
  return ["SINGLE", "DOUBLE", "TRIPLE", "HOME_RUN"].includes(result);
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
	const PITCHER_ATTACK_CONE_DEG = 3; // central cone for pitcher comebackers
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
		// Only a small fraction of fouls are fieldable; otherwise Bench.
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

function getRunsFromHomer(runners: RunnersState): number {
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
	return runs + 1;
}
