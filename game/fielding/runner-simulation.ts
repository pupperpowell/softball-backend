import type { RunnersState } from "../types.ts";
import { Player } from "../Player.ts";
import type { Game } from "../Game.ts";
import type { BallType } from "./ball-classification.ts";
import { debugLog } from "../../utils/debug.ts";
import { getFielderAtBase } from "./fielder-assignment.ts";

/**
 * Represents a runner in motion during a play
 */
export type RunnerInMotion = {
	player: Player;
	startBase: "home" | "first" | "second" | "third";
	currentBase: "home" | "first" | "second" | "third";
	targetBase: "first" | "second" | "third" | "home";
	isForced: boolean; // force play vs tag play
	canTagUp: boolean; // can advance on caught fly ball
	hasTaggedUp: boolean; // has tagged up after catch
	advances: number; // number of bases advanced, to limit chaining
}

export interface RunnerAdvancementResult {
  outsRecorded: number;
  runsScored: number;
  finalBases: RunnersState;
}

/**
 * Initialize runners including the batter
 */
export function initializeRunners(bases: RunnersState, batter: Player): RunnerInMotion[] {
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
		advances: 0,
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
			advances: 0,
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
			advances: 0,
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
			advances: 0,
		});
	}
	
	return runners;
}

/**
 * Simulate runner advancement with fielders making plays
 */
export function simulateRunnerAdvancement(
	runners: RunnerInMotion[],
	primaryFielder: Player,
	game: Game,
	ballType: BallType,
	fieldedCleanly?: boolean
): RunnerAdvancementResult {
	let outsRecorded = 0;
	let runsScored = 0;
	const activeRunners = [...runners];
	
	// Calculate initial fielding time (time to get to ball and secure it)
	// For cleanly fielded ground balls, use significantly reduced time
	let fieldingTime = calculateFieldingTime(primaryFielder, ballType);
	if (fieldedCleanly && ballType === "GROUND") {
		// Cleanly fielded ground ball - fielder has ball quickly for force play
		fieldingTime = 0.3 + (10 - primaryFielder.stats.fielding) * 0.05; // 0.3-0.8 seconds
		debugLog(`[FIELDING DEBUG]: Ground ball fielded cleanly, reduced fielding time to ${fieldingTime.toFixed(2)}s`);
	}
	
	let currentFielder = primaryFielder;
	let throwCount = 0;
	const MAX_THROWS = 3; // Prevent infinite loops
	
	debugLog(`[FIELDING DEBUG]: Starting runner advancement simulation with ${activeRunners.length} runners`);
	
	while (throwCount < MAX_THROWS && activeRunners.length > 0 && outsRecorded < 3) {
		debugLog(`[FIELDING DEBUG]: Loop iteration ${throwCount + 1}/${MAX_THROWS}, ${activeRunners.length} active runners, ${outsRecorded} outs`);
		
		// Determine which runner to target (prioritize lead runner)
		const targetRunner = selectTargetRunner(activeRunners);
		
		if (!targetRunner) break;
		
		debugLog(`[FIELDING DEBUG]: Targeting ${targetRunner.player.fullName()} from ${targetRunner.currentBase} to ${targetRunner.targetBase} (forced: ${targetRunner.isForced})`);
		
		// Calculate if fielder can make the play
		const playResult = attemptPlay(
			targetRunner,
			currentFielder,
			game,
			fieldingTime + throwCount * 0.5 // Each throw adds delay
		);
		
		if (playResult === "OUT") {
			outsRecorded++;
			debugLog(`${targetRunner.player.fullName()} is out at ${targetRunner.targetBase}!`);
			// Remove runner from active runners
			const index = activeRunners.indexOf(targetRunner);
			activeRunners.splice(index, 1);
			debugLog(`[FIELDING DEBUG]: Removed out runner, ${activeRunners.length} left`);
			
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
						debugLog(`Double play! ${nextTarget.player.fullName()} is out at ${nextTarget.targetBase}!`);
						const dpIndex = activeRunners.indexOf(nextTarget);
						activeRunners.splice(dpIndex, 1);
						debugLog(`[FIELDING DEBUG]: Double play success, removed runner, ${activeRunners.length} left`);
					}
				}
			}
		} else if (playResult === "SAFE") {
			debugLog(`${targetRunner.player.fullName()} is safe at ${targetRunner.targetBase}!`);
			targetRunner.currentBase = targetRunner.targetBase;
			
			// Check if runner scored
			if (targetRunner.targetBase === "home") {
				debugLog(`${targetRunner.player} scored`);
				runsScored++;
				const index = activeRunners.indexOf(targetRunner);
				activeRunners.splice(index, 1);
				debugLog(`[FIELDING DEBUG]: Runner scored and removed, ${activeRunners.length} left`);
			} else {
				debugLog(`[FIELDING DEBUG]: Runner reached ${targetRunner.currentBase}, checking for extra advance`);
				// Determine if runner should try for next base (aggressive baserunning)
				const shouldAdvance = shouldRunnerAdvanceExtra(targetRunner, ballType, throwCount);
				if (shouldAdvance) {
					const oldTarget = targetRunner.targetBase;
					targetRunner.targetBase = getNextBase(targetRunner.currentBase);
					targetRunner.isForced = false;
					debugLog(`[FIELDING DEBUG]: Runner advancing extra from ${oldTarget} to ${targetRunner.targetBase}`);
				} else {
					// Reached target safely - keep in activeRunners so they're included in finalBases
					// Break out of the loop since this runner is done advancing
					debugLog(`[FIELDING DEBUG]: Runner safe at ${targetRunner.currentBase}, staying on base`);
					break;
				}
			}
		} else {
			debugLog(`[FIELDING DEBUG]: Unexpected playResult: ${playResult}`);
		}
		
		throwCount++;
		
		// Update current fielder to the one at the target base
		if (targetRunner.targetBase !== "home") {
			currentFielder = getFielderAtBase(targetRunner.targetBase, game);
		}
	}
	
	debugLog(`[FIELDING DEBUG]: Runner advancement complete: ${outsRecorded} outs, ${runsScored} runs, ${activeRunners.length} runners remaining`);
	
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
export function calculateFieldingTime(fielder: Player, ballType: BallType): number {
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
export function selectTargetRunner(runners: RunnerInMotion[]): RunnerInMotion | null {
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
export function attemptPlay(
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
 * Determine if runner should try for extra base
 */
export function shouldRunnerAdvanceExtra(runner: RunnerInMotion, ballType: BallType, throwCount: number): boolean {
	// Lower probabilities to reduce aggression
	// Batter gets no extra on initial hit unless LINE/FLY
	let baseChance: number;
	if (runner.startBase === "home") {
		baseChance = (ballType === "LINE" || ballType === "FLY") ? 0.05 : 0.0;
	} else {
		baseChance = ballType === "GROUND" ? 0.1 : 0.05;
	}
	const throwBonus = throwCount * 0.1; // Reduced
	const aggressionBonus = runner.player.stats.running * 0.01; // Reduced
	
	const totalChance = baseChance + throwBonus + aggressionBonus;
	return Math.random() < totalChance;
}

/**
 * Get next base in sequence
 */
export function getNextBase(current: "home" | "first" | "second" | "third"): "first" | "second" | "third" | "home" {
	const sequence = { home: "first", first: "second", second: "third", third: "home" } as const;
	return sequence[current];
}