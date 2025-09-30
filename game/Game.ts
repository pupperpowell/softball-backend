
import { NarrationEngine } from "../narrator/NarrationEngine.ts";
import { Player } from "./Player.ts";
import { simulateAtBat } from "./simulateAtBat.ts";
import type { Team } from "./Team";
import { BoxScore } from "./BoxScore.ts";
import { simulateFielding } from "./fielding.ts";
import type { GameState, RunnersState, PlayerBattingStats, PlayerPitchingStats, PlayerFieldingStats, FieldOutcome, AtBatResult } from "./types.ts";

// This class contains the state for each game.
export class Game implements GameState {
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
	boxScore = new BoxScore();
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

	getPlayerKey(player: Player): string {
		return `${player.firstname}-${player.lastname}`.toLowerCase();
	}

	updateBattingStat(player: Player, stat: keyof PlayerBattingStats, increment: number): void {
		const battingStats = this.isTopHalf ? this.boxScore.awayBattingStats : this.boxScore.homeBattingStats;
		const playerKey = this.getPlayerKey(player);
		if (!battingStats[playerKey]) {
			battingStats[playerKey] = {
				atBats: 0,
				hits: 0,
				walks: 0,
				strikeouts: 0,
				runs: 0,
				rbis: 0,
			};
		}
		battingStats[playerKey][stat] += increment;
	}

	updatePitchingStat(player: Player, stat: keyof PlayerPitchingStats, increment: number): void {
		const pitchingStats = this.isTopHalf ? this.boxScore.homePitchingStats : this.boxScore.awayPitchingStats;
		const playerKey = this.getPlayerKey(player);
		if (!pitchingStats[playerKey]) {
			pitchingStats[playerKey] = {
				pitchesThrown: 0,
				strikes: 0,
				balls: 0,
				strikeouts: 0,
				walks: 0,
			};
		}
		pitchingStats[playerKey][stat] += increment;
	}

	updateFieldingStat(player: Player, stat: keyof PlayerFieldingStats, increment: number, fielderTeam: Team): void {
		const fieldingStats = fielderTeam === this.homeTeam ? this.boxScore.homeFieldingStats : this.boxScore.awayFieldingStats;
		const playerKey = this.getPlayerKey(player);
		if (!fieldingStats[playerKey]) {
			fieldingStats[playerKey] = {
				putouts: 0,
				assists: 0,
				errors: 0,
			};
		}
		fieldingStats[playerKey][stat] += increment;
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

	getFieldingTeam(): Team {
		return this.isTopHalf ? this.homeTeam : this.awayTeam;
	}

	getBattingTeam(): Team {
		return this.isTopHalf ? this.awayTeam : this.homeTeam;
	}

	simulate() { // should eventually return a BoxScore
		const debug = false; // Enable/disable debug console.log statements

		if (debug) console.log('[GAME SIMULATE]: Starting game simulation');

		let runsAtStartOfHalf = 0;
		let startingAwayScore = this.awayScore;
		while (!this.isGameOver) {
			// Record the starting score at the beginning of each half-inning
			if (this.outs === 0) {
				runsAtStartOfHalf = this.isTopHalf ? this.awayScore : this.homeScore;
			}

			if (this.outs < 3) {

				if (debug) console.log(`[GAME SIMULATE]: Inning ${this.currentInning}, ${this.isTopHalf ? 'Top' : 'Bottom'}, Score: ${this.awayScore}-${this.homeScore}, Outs: ${this.outs}, Bases: ${(this.basesOccupied.first ? '1' : '-')}${(this.basesOccupied.second ? '2' : '-')}${(this.basesOccupied.third ? '3' : '-')}`);

				// get current hitter in the lineup
				// NOTE: getPlayers() is TODO in Team.ts; keeping call for now.
				const batterIndex = this.isTopHalf ? this.awayBatterIndex : this.homeBatterIndex;
				const hitter = this.getBattingTeam().players[batterIndex % 9];
				if (!hitter) {
					throw new Error(`No hitter available at position ${batterIndex % 9} for team ${this.getBattingTeam().name}`);
				}

				// Determine pitcher from fielding team roster if available; fallback to a new Player
				const fieldingTeam: Team = this.isTopHalf ? this.homeTeam : this.awayTeam;
				const pitcher = fieldingTeam.players.find((p: Player) => p.activePosition === "Pitcher");
				if (!pitcher) {
					throw new Error("No pitcher found!")
				}

				if (debug) console.log(`[GAME SIMULATE]: ${hitter.firstname} ${hitter.lastname} (${this.isTopHalf ? this.awayTeam.name : this.homeTeam.name}) vs ${pitcher.firstname} ${pitcher.lastname} (${fieldingTeam.name})`);

				// simulate the at-bat
				const result: AtBatResult = simulateAtBat(hitter, pitcher);

				// Update pitching stats for every pitch
				this.updatePitchingStat(pitcher, 'pitchesThrown', result.pitches.length);
				this.updatePitchingStat(pitcher, 'strikes', result.strikes);
				this.updatePitchingStat(pitcher, 'balls', result.balls);

				// Resolve outcome
				if (result.outcome === "WALK") {
					if (debug) console.log(`[GAME SIMULATE]: ${hitter.firstname} ${hitter.lastname} walked`);
					this.updateBattingStat(hitter, 'walks', 1);
					this.updatePitchingStat(pitcher, 'walks', 1);
					const runsBeforeWalk = this.isTopHalf ? this.awayScore : this.homeScore;
					this.handleWalk(hitter);
					const runsAfterWalk = this.isTopHalf ? this.awayScore : this.homeScore;
					const runsOnWalk = runsAfterWalk - runsBeforeWalk;
					if (runsOnWalk > 0) {
						this.updateBattingStat(hitter, 'rbis', runsOnWalk);
						if (this.basesOccupied.third) {
							this.updateBattingStat(this.basesOccupied.third!, 'runs', 1);
						}
					}
					if (this.isTopHalf) this.awayBatterIndex++;
					else this.homeBatterIndex++;
					continue;
				}

				if (result.outcome === "STRIKEOUT") {
					if (debug) console.log(`[GAME SIMULATE]: ${hitter.firstname} ${hitter.lastname} struck out`);
					this.updateBattingStat(hitter, 'atBats', 1);
					this.updateBattingStat(hitter, 'strikeouts', 1);
					this.updatePitchingStat(pitcher, 'strikeouts', 1);
					this.outs++;
					if (this.isTopHalf) this.awayBatterIndex++;
					else this.homeBatterIndex++;
					continue;
				}

				if (result.outcome === "IN_PLAY" && result.battedBall) {
					if (debug) console.log(`[GAME SIMULATE]: ${hitter.firstname} ${hitter.lastname} hit the ball into play`);
					this.updateBattingStat(hitter, 'atBats', 1);
					// Build runners state from current bases
					const initialRunners = {
						first: this.basesOccupied.first,
						second: this.basesOccupied.second,
						third: this.basesOccupied.third,
					};
					const scoreBeforePlay = this.isTopHalf ? this.awayScore : this.homeScore;

					// Field the ball with the defensive team
					const fieldingResult: FieldOutcome = simulateFielding(result.battedBall, this);

					const scoreAfterPlay = this.isTopHalf ? this.awayScore : this.homeScore;
					const runsScored = scoreAfterPlay - scoreBeforePlay;

					// Update based on play type
					const playType = fieldingResult.playType;
					if (['SINGLE', 'DOUBLE', 'TRIPLE'].includes(playType)) {
						this.updateBattingStat(hitter, 'hits', 1);
						if (runsScored > 0) {
							this.updateBattingStat(hitter, 'rbis', runsScored);
							// Attribute runs to runners who scored (simplified: assume third, or check bases)
							if (initialRunners.third) this.updateBattingStat(initialRunners.third, 'runs', 1);
						}
					} else if (playType === 'HOME_RUN') {
						this.updateBattingStat(hitter, 'hits', 1);
						const totalRunsOnHR = runsScored;
						this.updateBattingStat(hitter, 'runs', 1);
						this.updateBattingStat(hitter, 'rbis', totalRunsOnHR);
						// Attribute runs to previous runners
						if (initialRunners.third) this.updateBattingStat(initialRunners.third, 'runs', 1);
						if (initialRunners.second) this.updateBattingStat(initialRunners.second, 'runs', 1);
						if (initialRunners.first) this.updateBattingStat(initialRunners.first, 'runs', 1);
					} else if (playType === 'OUT') {
						// Single out, update fielding
						this.updateFieldingStat(fieldingResult.primary_fielder, 'putouts', 1, fieldingTeam);
					} else if (playType === 'DOUBLE_PLAY') {
						this.updateFieldingStat(fieldingResult.primary_fielder, 'putouts', 2, fieldingTeam);
						// Could add assist to another fielder, but simplified
					} else if (playType === 'TRIPLE_PLAY') {
						this.updateFieldingStat(fieldingResult.primary_fielder, 'putouts', 3, fieldingTeam);
					}

					// Next batter
					if (this.isTopHalf) this.awayBatterIndex++;
					else this.homeBatterIndex++;
				}

				// continue to next at-bat while the half-inning hasn't ended
				continue;
			}

			// Record inning scores at end of half
			const runsThisHalf = (this.isTopHalf ? this.awayScore : this.homeScore) - runsAtStartOfHalf;
			if (this.isTopHalf) {
				this.boxScore.awayInningScores[this.currentInning - 1] = runsThisHalf;
			} else {
				this.boxScore.homeInningScores[this.currentInning - 1] = runsThisHalf;
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
				console.log(`game finished in ${this.currentInning} innings`);
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
				console.log(`game finished in ${this.currentInning} innings`);
				break;
			}

			// Otherwise progress to the next half-inning (this also handles extra innings when tied)
			this.nextHalf();
		}

		// Set winner in box score
		this.boxScore.winner = this.winner;

		return this.boxScore;
	}
}
