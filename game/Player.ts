import type { Stats } from "./types";

export class Player {
    stats: Stats;

    constructor(stats: Stats) {
        this.stats = stats;
    }
}