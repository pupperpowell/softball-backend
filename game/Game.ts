
import { NarrationEngine } from "../narrator/NarrationEngine.ts";
import { Player } from "./Player.ts";
import { simulateAtBat } from "./simulateAtBat.ts";
import type { Team } from "./Team";
import {
	simulateFielding,
	type RunnersState,
	type PlayResult,
} from "./fielding.ts";

// This class contains the state for each game.
export class Game {
	homeTeam: Team;
	awayTeam: Team;
	homeScore = 0;
	awayScore = 0;
	currentInning = 1;
	isTopHalf = true; // top half: (away team batting), bottom half: (home team batting)
	homeBatterIndex = 0;
	awayBatterIndex = 0;
	outs = 0;
	basesOccupied: {
		first?: Player;
		second?: Player;
		third?: Player;
	};
	isGameOver = false;
	winner?: Team;

	constructor(homeTeam: Team, awayTeam: Team) {
		if (homeTeam === awayTeam) {
			throw new Error("A team cannot play against itself.");
		}
		this.homeTeam = homeTeam;
		this.awayTeam = awayTeam;
		this.basesOccupied = {};
	}

	// Progress the inning, or go to the next one
	nextHalf(): void {
		if (!this.isTopHalf) {
			this.currentInning++;
		}
		this.isTopHalf = !this.isTopHalf;
		this.outs = 0;
		this.clearBases();
	}

	// Add runs to the appropriate team's score
	addRuns(runs: number): void {
		if (this.isTopHalf) {
			this.awayScore += runs;
		} else {
			this.homeScore += runs;
		}
	}

	// Base running methods
	addRunner(player: Player, base: 1 | 2 | 3): void {
		console.log(
			`[BASE RUNNING]: Adding ${player.firstname} ${player.lastname} to base ${base}`,
		);
		if (base === 1) {
			this.basesOccupied.first = player;
		} else if (base === 2) {
			this.basesOccupied.second = player;
		} else if (base === 3) {
			this.basesOccupied.third = player;
		}
	}

	// Handle a walk - advance batter to first, force runners if needed
	handleWalk(batter: Player): number {
		let runsScored = 0;

		// Check if bases are loaded (force all runners)
		if (
			this.basesOccupied.first && this.basesOccupied.second &&
			this.basesOccupied.third
		) {
			this.basesOccupied.third = this.basesOccupied.second;
			this.basesOccupied.second = this.basesOccupied.first;
			this.basesOccupied.first = undefined;

			this.addRuns(1);
		} else if (this.basesOccupied.first && this.basesOccupied.second) {
			// Advance runners on 1st and 2nd
			const secondRunner = this.basesOccupied.second;
			this.basesOccupied.second = undefined;
			this.basesOccupied.third = secondRunner;

			const firstRunner = this.basesOccupied.first;
			this.basesOccupied.first = undefined;
			this.basesOccupied.second = firstRunner;

		} else if (this.basesOccupied.first) {
			// Force runner on 1st to 2nd. Runner on 3rd could exist, but doesn't matter.
			const firstRunner = this.basesOccupied.first;
			this.basesOccupied.first = undefined;
			this.basesOccupied.second = firstRunner;
		}

		// Add batter to first base
		this.basesOccupied.first = batter;
		return runsScored;
	}

	// Clear all bases (used at end of inning)
	clearBases(): void {
		this.basesOccupied = {};
	}

	// Apply a resolved play result (from fielding) to game state
	private applyPlay(play: PlayResult, batter: Player): void {
		// Add outs and runs from the play
		this.outs += play.outs;
		if (play.runs > 0) this.addRuns(play.runs);

		// Snapshot current runners
		const current = { ...this.basesOccupied };

		// Remove any runners who were retired
		const outSet = new Set(play.runnersOut ?? []);
		if (outSet.has("first")) current.first = undefined;
		if (outSet.has("second")) current.second = undefined;
		if (outSet.has("third")) current.third = undefined;

		// Helper to move a runner by N bases without re-adding runs (already counted in play.runs)
		const moveRunner = (runner: Player | undefined, fromBase: 1 | 2 | 3, advance: number) => {
			if (!runner) return;
			const dest = fromBase + (advance ?? 0);
			if (dest >= 4) {
				// Scored already accounted in play.runs
				return;
			}
			if (dest === 3) this.basesOccupied.third = runner;
			else if (dest === 2) this.basesOccupied.second = runner;
			else if (dest === 1) this.basesOccupied.first = runner;
		};

		// Reset bases; rebuild from runnerAdvances and batter
		this.basesOccupied = {};

		const adv = play.runnerAdvances ?? {};

		// Process in order: third, second, first to avoid collisions
		moveRunner(current.third, 3, adv.third ?? 0);
		moveRunner(current.second, 2, adv.second ?? 0);
		moveRunner(current.first, 1, adv.first ?? 0);

		// Place batter if he reached safely
		const batterBases = play.batterBases ?? 0;
		if (batterBases === 1) this.basesOccupied.first = batter;
		else if (batterBases === 2) this.basesOccupied.second = batter;
		else if (batterBases === 3) this.basesOccupied.third = batter;
		// batterBases === 0 → out; === 4 → HR (runs already counted)
	}

	simulate() { // should eventually return a BoxScore
		const debug = false; // Enable/disable debug console.log statements

		if (debug) console.log('[GAME SIMULATE]: Starting game simulation');

		let startingAwayScore = this.awayScore;
		while (!this.isGameOver) {
			// Record the starting away score whenever a new top half begins
			if (this.outs === 0 && this.isTopHalf) {
				startingAwayScore = this.awayScore;
			}

			if (this.outs < 3) {

				if (debug) console.log(`[GAME SIMULATE]: Inning ${this.currentInning}, ${this.isTopHalf ? 'Top' : 'Bottom'}, Score: ${this.awayScore}-${this.homeScore}, Outs: ${this.outs}, Bases: ${(this.basesOccupied.first ? '1' : '-')}${(this.basesOccupied.second ? '2' : '-')}${(this.basesOccupied.third ? '3' : '-')}`);

				// get current hitter in the lineup
				// NOTE: getPlayers() is TODO in Team.ts; keeping call for now.
				const hitter =
					((this.isTopHalf
						? (this.awayTeam as any).getPlayers?.(this.awayBatterIndex % 9)
						: (this.homeTeam as any).getPlayers?.(this.homeBatterIndex % 9)) as Player) ?? new Player();

				// Determine pitcher from fielding team roster if available; fallback to a new Player
				const fieldingTeam = this.isTopHalf ? this.homeTeam : this.awayTeam;
				const pitcher: Player =
					((fieldingTeam as any).players?.find((p: Player) => p.activePosition === "Pitcher")) ??
					new Player();

				if (debug) console.log(`[GAME SIMULATE]: ${hitter.firstname} ${hitter.lastname} (${this.isTopHalf ? this.awayTeam.name : this.homeTeam.name}) vs ${pitcher.firstname} ${pitcher.lastname} (${fieldingTeam.name})`);

				// simulate the at-bat
				const result = simulateAtBat(hitter, pitcher);

				// Resolve outcome
				if (result.outcome === "WALK") {
					if (debug) console.log(`[GAME SIMULATE]: ${hitter.firstname} ${hitter.lastname} walked`);
					this.handleWalk(hitter);
					if (this.isTopHalf) this.awayBatterIndex++;
					else this.homeBatterIndex++;
					continue;
				}

				if (result.outcome === "STRIKEOUT") {
					if (debug) console.log(`[GAME SIMULATE]: ${hitter.firstname} ${hitter.lastname} struck out`);
					this.outs++;
					if (this.isTopHalf) this.awayBatterIndex++;
					else this.homeBatterIndex++;
					continue;
				}

				if (result.outcome === "IN_PLAY" && result.battedBall) {
					if (debug) console.log(`[GAME SIMULATE]: ${hitter.firstname} ${hitter.lastname} hit the ball into play`);
					// Build runners state from current bases
					const runners: RunnersState = {
						first: this.basesOccupied.first,
						second: this.basesOccupied.second,
						third: this.basesOccupied.third,
						outs: this.outs,
					};

					// Field the ball with the defensive team
					const fieldingResult = simulateFielding(result.battedBall, fieldingTeam, runners);

					// Apply to game state (outs, runs, base advancements, batter placement)
					this.applyPlay(fieldingResult, hitter);

					// Next batter
					if (this.isTopHalf) this.awayBatterIndex++;
					else this.homeBatterIndex++;
				}

				// continue to next at-bat while the half-inning hasn't ended
				continue;
			}

			// End of half (outs >= 3)
			// If we've just completed the top of the 9th (or later) and the away team was trailing and failed to score, end the game early.
			if (
				this.currentInning >= 9 && this.isTopHalf === true &&
				this.awayScore < this.homeScore &&
				this.awayScore === startingAwayScore
			) {
				this.isGameOver = true;
				this.winner = this.homeTeam;
				const loser = this.homeScore > this.awayScore
					? this.awayTeam
					: this.homeTeam;
				const finalScoreString = (this.homeScore > this.awayScore)
					? `${this.homeScore}—${this.awayScore}`
					: `${this.awayScore}—${this.homeScore}`;
				break;
			}

			// If we've just completed the bottom of the 9th (or later) and the score is not tied, the game ends.
			if (
				this.currentInning >= 9 && this.isTopHalf === false &&
				this.homeScore !== this.awayScore
			) {
				this.isGameOver = true;
				this.winner = this.homeScore > this.awayScore
					? this.homeTeam
					: this.awayTeam;
				const loser = this.homeScore > this.awayScore
					? this.awayTeam
					: this.homeTeam;
				const finalScoreString = (this.homeScore > this.awayScore)
					? `${this.homeScore}—${this.awayScore}`
					: `${this.awayScore}—${this.homeScore}`;
				break;
			}

			// Otherwise progress to the next half-inning (this also handles extra innings when tied)
			this.nextHalf();
		}
	}
}
