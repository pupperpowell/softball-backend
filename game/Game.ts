
import { NarrationEngine } from "../narrator/NarrationEngine.ts";
import type { Player } from "./Player";
import type { Team } from "./Team";

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
    public outs = 0;
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
        console.log(
            `[GAME]: it's now the ${(this.isTopHalf
                ? "top"
                : "bottom")} of the ${this.currentInning}th inning`,
        );
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
            this.addRunner(batter, 1);
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
        this.addRunner(batter, 1);
        return runsScored;
    }

    // Clear all bases (used at end of inning)
    clearBases(): void {
        console.log(`[BASE RUNNING]: Clearing all bases`);
        this.basesOccupied = {};
    }
}

