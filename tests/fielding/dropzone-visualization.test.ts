import { test } from "bun:test";
import { estimateDropZone } from "../../game/fielding.ts";
import { simulatePitch } from "../../game/pitching.ts";
import { calculateSwing, calculateHit } from "../../game/batting.ts";
import { Player } from "../../game/Player.ts";
import type { BattedBall, FieldingPosition } from "../../game/types.ts";

const TRACK_BENCH_HITS = false; // bench hits are counted as foul balls

function makeBatter(contact: number, power: number): Player {
	return new Player(undefined, undefined, {
		contact,
		power,
		running: 0,
		pitching: 0,
		fielding: 0,
		charisma: 0,
		growth: 0,
	});
}

function makePitcher(pitching: number): Player {
	return new Player(undefined, undefined, {
		contact: 0,
		power: 0,
		running: 0,
		pitching,
		fielding: 0,
		charisma: 0,
		growth: 0,
	});
}

// Collect batted balls using the full simulation pipeline
function collectBattedBalls(
	contactPower: number,
	targetBalls: number,
): BattedBall[] {
	const batter = makeBatter(contactPower, contactPower);
	const pitcher = makePitcher(contactPower); // Average pitcher
	const balls: BattedBall[] = [];

	let attempts = 0;
	const maxAttempts = targetBalls * 50; // Safety cap to prevent infinite loops

	while (balls.length < targetBalls && attempts < maxAttempts) {
		attempts++;

		const pitch = simulatePitch(pitcher);
		const swung = calculateSwing(batter.stats.contact, pitch.isStrike);

		if (!swung) continue; // Skip taken pitches

		const contact = calculateHit(batter, pitch);
		if (!contact) continue; // Skip whiffs

		balls.push(contact);
	}

	return balls;
}

function simulateDropZones(
	contactPower: number,
	targetBalls: number,
): Record<FieldingPosition, number> {
	const counts: Record<FieldingPosition, number> = {
		Pitcher: 0,
		Catcher: 0,
		"First Base": 0,
		"Second Base": 0,
		"Third Base": 0,
		Shortstop: 0,
		"Left Field": 0,
		"Center Field": 0,
		"Right Field": 0,
		Bench: 0,
	};

	const balls = collectBattedBalls(contactPower, targetBalls);

	for (const ball of balls) {
		const position = estimateDropZone(ball);
		if (!TRACK_BENCH_HITS && position === "Bench") continue;
		counts[position]++;
	}

	return counts;
}

test("visualize hit distribution by fielding position across contact/power levels", () => {
	const targetBalls = 50000; // Number of actual batted balls per level

	console.log(
		`\nHit distribution by fielding position (${targetBalls.toLocaleString()} batted balls per contact/power level)\n`,
	);
	console.log(
		"Each value shows percentage of batted balls going to that position",
	);
	console.log("Using full simulation: pitch → swing → contact → drop zone");

	const ALL_POSITIONS: FieldingPosition[] = [
		"Pitcher",
		"Catcher",
		"First Base",
		"Second Base",
		"Third Base",
		"Shortstop",
		"Left Field",
		"Center Field",
		"Right Field",
		"Bench",
	];
	const positions: FieldingPosition[] = TRACK_BENCH_HITS
		? ALL_POSITIONS
		: (ALL_POSITIONS.filter((p) => p !== "Bench") as FieldingPosition[]);

	const header =
		"C/P Score | " +
		positions.map((p) => p.substring(0, 8).padStart(8, " ")).join(" | ");
	console.log(header);
	console.log("-".repeat(header.length));

	for (let contactPower = 0; contactPower <= 10; contactPower++) {
		const counts = simulateDropZones(contactPower, targetBalls);
		const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

		if (total === 0) {
			console.log(
				`${contactPower.toString().padStart(9, " ")} | ${"N/A".padStart(8, " ").repeat(positions.length).split("").join(" | ")}`,
			);
			continue;
		}

		const percentages = positions.map((pos) => {
			const pct = ((counts[pos] / total) * 100).toFixed(1);
			return pct.padStart(8, " ");
		});

		const cpStr = contactPower.toString().padStart(9, " ");
		console.log(`${cpStr} | ${percentages.join(" | ")} | Total: ${total}`);
	}

	console.log("");
});

test("visualize hit distribution by attack angle ranges using full pipeline", () => {
	const targetBalls = 8000;
	const contactPowers = [2, 4, 6] as const;

	console.log(
		`\nHit distribution by attack angle ranges (${targetBalls.toLocaleString()} batted balls per contact/power level)\n`,
	);
	console.log("Using full simulation: pitch → swing → contact → drop zone");

	const attackRanges = [
		{ label: "Pull (-90,-22)", min: -90, max: -22 },
		{ label: "Center (-22,22)", min: -22, max: 22 },
		{ label: "Oppo (22,90)", min: 22, max: 90 },
	];

	const positions: FieldingPosition[] = [
		"Third Base",
		"Shortstop",
		"Second Base",
		"First Base",
		"Left Field",
		"Center Field",
		"Right Field",
	];

	for (const contactPower of contactPowers) {
		console.log(`\nContact/Power = ${contactPower}\n`);

		const rangeResults: Record<string, Record<FieldingPosition, number>> = {};

		// Initialize counters
		for (const range of attackRanges) {
			rangeResults[range.label] = {
				Pitcher: 0,
				Catcher: 0,
				"First Base": 0,
				"Second Base": 0,
				"Third Base": 0,
				Shortstop: 0,
				"Left Field": 0,
				"Center Field": 0,
				"Right Field": 0,
				Bench: 0,
			};
		}

		const balls = collectBattedBalls(contactPower, targetBalls);

		for (const ball of balls) {
			if (ball.foul) continue; // Only fair balls for field position analysis

			const position = estimateDropZone(ball);
			if (!TRACK_BENCH_HITS && position === "Bench") continue;

			for (const range of attackRanges) {
				if (ball.attack >= range.min && ball.attack < range.max) {
					rangeResults[range.label]![position]++;
					break;
				}
			}
		}

		const dirColWidth = Math.max(
			"Direction".length,
			...attackRanges.map((r) => r.label.length),
		);
		const header =
			"Direction".padStart(dirColWidth, " ") +
			" | " +
			positions.map((p) => p.substring(0, 7).padStart(7, " ")).join(" | ");
		console.log(header);
		console.log("-".repeat(header.length));

		for (const range of attackRanges) {
			const total = Object.values(rangeResults[range.label]!).reduce(
				(sum, count) => sum + count,
				0,
			);
			if (total === 0) continue;

			const percentages = positions.map((pos) => {
				const pct = ((rangeResults[range.label]![pos] / total) * 100).toFixed(1);
				return pct.padStart(7, " ");
			});

			console.log(
				`${range.label.padStart(dirColWidth, " ")} | ${percentages.join(" | ")} | Total: ${total}`,
			);
		}

		console.log("");
	}
});

test("visualize hit distribution by launch angle ranges using full pipeline", () => {
	const targetBalls = 8000;
	const contactPowers = [2, 4, 6] as const;

	console.log(
		`\nHit distribution by launch angle ranges (${targetBalls.toLocaleString()} batted balls per contact/power level)\n`,
	);
	console.log("Using full simulation: pitch → swing → contact → drop zone");

	const launchRanges = [
		{ label: "Grounder (-20,10)", min: -20, max: 10 },
		{ label: "Line Drive (10,25)", min: 10, max: 25 },
		{ label: "Fly Ball (25,45)", min: 25, max: 45 },
		{ label: "Pop Up (45,90)", min: 45, max: 90 },
	];

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

	for (const contactPower of contactPowers) {
		console.log(`\nContact/Power = ${contactPower}\n`);

		const rangeResults: Record<string, Record<FieldingPosition, number>> = {};

		// Initialize counters
		for (const range of launchRanges) {
			rangeResults[range.label] = {
				Pitcher: 0,
				Catcher: 0,
				"First Base": 0,
				"Second Base": 0,
				"Third Base": 0,
				Shortstop: 0,
				"Left Field": 0,
				"Center Field": 0,
				"Right Field": 0,
				Bench: 0,
			};
		}

		const balls = collectBattedBalls(contactPower, targetBalls);

		for (const ball of balls) {
			if (ball.foul) continue; // Only fair balls

			const position = estimateDropZone(ball);
			if (!TRACK_BENCH_HITS && position === "Bench") continue;

			for (const range of launchRanges) {
				if (ball.launch >= range.min && ball.launch < range.max) {
					rangeResults[range.label]![position]++;
					break;
				}
			}
		}

		const launchColWidth = Math.max(
			"Launch Type".length,
			...launchRanges.map((r) => r.label.length),
		);
		const header =
			"Launch Type".padStart(launchColWidth, " ") +
			" | " +
			positions.map((p) => p.substring(0, 6).padStart(6, " ")).join(" | ");
		console.log(header);
		console.log("-".repeat(header.length));

		for (const range of launchRanges) {
			const total = Object.values(rangeResults[range.label]!).reduce(
				(sum, count) => sum + count,
				0,
			);
			if (total === 0) continue;

			const percentages = positions.map((pos) => {
				const pct = ((rangeResults[range.label]![pos] / total) * 100).toFixed(1);
				return pct.padStart(6, " ");
			});

			console.log(
				`${range.label.padStart(launchColWidth, " ")} | ${percentages.join(" | ")} | Total: ${total}`,
			);
		}

		console.log("");
	}
});

test("visualize fair vs foul ball distribution using full pipeline", () => {
	const targetBalls = 10000;

	console.log(
		`\nFair vs Foul ball distribution across contact/power levels (${targetBalls.toLocaleString()} batted balls per level)\n`,
	);
	console.log("Using full simulation: pitch → swing → contact");

	const header =
		"C/P Score | Fair Balls | Foul Balls | Fair% | Foul% | Home Runs";
	console.log(header);
	console.log("-".repeat(header.length));

	for (let contactPower = 0; contactPower <= 10; contactPower++) {
		const balls = collectBattedBalls(contactPower, targetBalls);

		let fairBalls = 0;
		let foulBalls = 0;
		let homeRuns = 0;

		for (const ball of balls) {
			if (ball.foul) {
				foulBalls++;
			} else {
				fairBalls++;
				if (ball.homer) homeRuns++;
			}
		}

		const total = balls.length;
		if (total === 0) continue;

		const fairPct = ((fairBalls / total) * 100).toFixed(1);
		const foulPct = ((foulBalls / total) * 100).toFixed(1);

		const cpStr = contactPower.toString().padStart(9, " ");
		const fairStr = fairBalls.toString().padStart(10, " ");
		const foulStr = foulBalls.toString().padStart(10, " ");
		const fairPctStr = (fairPct + "%").padStart(6, " ");
		const foulPctStr = (foulPct + "%").padStart(6, " ");
		const hrStr = homeRuns.toString().padStart(9, " ");

		console.log(
			`${cpStr} | ${fairStr} | ${foulStr} | ${fairPctStr} | ${foulPctStr} | ${hrStr}`,
		);
	}

	console.log("");
});
