
import { NarrationEngine } from "../narrator/NarrationEngine.ts";
import type { Player } from "./Player";
import type { Team } from "./Team";
import type { GameState } from "./types";

// This class contains the state for each game.
export class Game {
    homeTeam: Team;
    awayTeam: Team;
    homeScore = 1;
    awayScore = 0;
    currentInning = 1;
    isTopHalf = true; // true for top half (away team batting), false for bottom half (home team batting)
    homeBatterIndex = 0;
    awayBatterIndex = 0;
    outs = 0;
    onBase: Player[];
    basesOccupied: {
        first?: Player;
        second?: Player;
        third?: Player;
    };
    isGameOver = false;
    winner?: Team;
    narrator = new NarrationEngine();

    constructor(homeTeam: Team, awayTeam: Team) {
        if (homeTeam === awayTeam) {
            throw new Error("A team cannot play against itself.");
        }
        this.homeTeam = homeTeam;
        this.awayTeam = awayTeam;
        this.onBase = [];
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
        console.log(
            `[GAME]: nextHalf() called. Current inning: ${(this.isTopHalf
                ? "Top"
                : "Bottom")} ${this.currentInning}`,
        );
    }

    // Record an out
    recordOut(): void {
        this.outs++;
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
        this.updateOnBaseArray();
    }

    // Move all runners forward by specified number of bases
    advanceRunners(bases: number): number {
        let runsScored = 0;
        console.log(`[BASE RUNNING]: Advancing all runners ${bases} base(s)`);

        // Handle runners in reverse order (3rd -> 2nd -> 1st) to avoid conflicts
        if (this.basesOccupied.third) {
            const runner = this.basesOccupied.third;
            this.basesOccupied.third = undefined;
            if (bases >= 1) {
                console.log(
                    `[BASE RUNNING]: ${runner.firstname} ${runner.lastname} scores from third base!`,
                );
                runsScored++;
            } else {
                // Runner stays on third (shouldn't happen with current logic)
                this.basesOccupied.third = runner;
            }
        }

        if (this.basesOccupied.second) {
            const runner = this.basesOccupied.second;
            this.basesOccupied.second = undefined;
            if (bases >= 2) {
                console.log(
                    `[BASE RUNNING]: ${runner.firstname} ${runner.lastname} scores from second base!`,
                );
                runsScored++;
            } else if (bases === 1) {
                console.log(
                    `[BASE RUNNING]: ${runner.firstname} ${runner.lastname} advances from second to third`,
                );
                this.basesOccupied.third = runner;
            } else {
                // Runner stays on second
                this.basesOccupied.second = runner;
            }
        }

        if (this.basesOccupied.first) {
            const runner = this.basesOccupied.first;
            this.basesOccupied.first = undefined;
            if (bases >= 3) {
                console.log(
                    `[BASE RUNNING]: ${runner.firstname} ${runner.lastname} scores from first base!`,
                );
                runsScored++;
            } else if (bases === 2) {
                console.log(
                    `[BASE RUNNING]: ${runner.firstname} ${runner.lastname} advances from first to third`,
                );
                this.basesOccupied.third = runner;
            } else if (bases === 1) {
                console.log(
                    `[BASE RUNNING]: ${runner.firstname} ${runner.lastname} advances from first to second`,
                );
                this.basesOccupied.second = runner;
            } else {
                // Runner stays on first
                this.basesOccupied.first = runner;
            }
        }

        this.updateOnBaseArray();
        return runsScored;
    }

    // Handle a walk - advance batter to first, force runners if needed
    handleWalk(batter: Player): number {
        console.log(
            `[BASE RUNNING]: Handling walk for ${batter.firstname} ${batter.lastname}`,
        );
        let runsScored = 0;

        // Check if bases are loaded (force all runners)
        if (
            this.basesOccupied.first && this.basesOccupied.second &&
            this.basesOccupied.third
        ) {
            console.log(
                `[BASE RUNNING]: Bases loaded - forcing all runners to advance`,
            );
            runsScored = this.advanceRunners(1);
        } else if (this.basesOccupied.first && this.basesOccupied.second) {
            // Force runners on 1st and 2nd
            console.log(
                `[BASE RUNNING]: Runners on 1st and 2nd - forcing advancement`,
            );
            if (this.basesOccupied.second) {
                const secondRunner = this.basesOccupied.second;
                this.basesOccupied.second = undefined;
                this.basesOccupied.third = secondRunner;
                console.log(
                    `[BASE RUNNING]: ${secondRunner.firstname} ${secondRunner.lastname} forced to third`,
                );
            }
            if (this.basesOccupied.first) {
                const firstRunner = this.basesOccupied.first;
                this.basesOccupied.first = undefined;
                this.basesOccupied.second = firstRunner;
                console.log(
                    `[BASE RUNNING]: ${firstRunner.firstname} ${firstRunner.lastname} forced to second`,
                );
            }
        } else if (this.basesOccupied.first) {
            // Force runner on 1st to 2nd
            console.log(`[BASE RUNNING]: Runner on 1st - forcing to second`);
            const firstRunner = this.basesOccupied.first;
            this.basesOccupied.first = undefined;
            this.basesOccupied.second = firstRunner;
            console.log(
                `[BASE RUNNING]: ${firstRunner.firstname} ${firstRunner.lastname} forced to second`,
            );
        }

        // Add batter to first base
        this.addRunner(batter, 1);
        this.updateOnBaseArray();
        return runsScored;
    }

    // Clear all bases (used at end of inning)
    clearBases(): void {
        console.log(`[BASE RUNNING]: Clearing all bases`);
        this.basesOccupied = {};
        this.onBase = [];
    }

    // Update the legacy onBase array for compatibility
    updateOnBaseArray(): void {
        this.onBase = [];
        if (this.basesOccupied.first) {
            this.onBase.push(this.basesOccupied.first);
        }
        if (this.basesOccupied.second) {
            this.onBase.push(this.basesOccupied.second);
        }
        if (this.basesOccupied.third) {
            this.onBase.push(this.basesOccupied.third);
        }
    }

    // Add runs to the appropriate team's score
    addRuns(runs: number): void {
        if (runs > 0) {
            if (this.isTopHalf) {
                this.awayScore += runs;
                console.log(
                    `[SCORING]: Away team scores ${runs} run(s). Score: ${this.awayTeam.name} ${this.awayScore} - ${this.homeTeam.name} ${this.homeScore}`,
                );
            } else {
                this.homeScore += runs;
                console.log(
                    `[SCORING]: Home team scores ${runs} run(s). Score: ${this.awayTeam.name} ${this.awayScore} - ${this.homeTeam.name} ${this.homeScore}`,
                );
            }
        }
    }
}
