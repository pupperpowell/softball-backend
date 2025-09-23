import type { Stats } from "./types";

export class Player {
    firstname: String = "John";
    lastname: String = "Doe";
    stats: Stats = {
        contact: 0,
        power: 0,
        running: 0,
        pitching: 0,
        fielding: 0,
        charisma: 0,
        growth: 0
    };

    constructor(stats?: Stats, first?: string, last?: string) {
        first ? this.firstname = first : null;
        last ? this.lastname = last : null;
        stats ? this.stats = stats : null;
    }

    /**
     * toString
     */
    public toString() {
        console.log(`player ${this.firstname} ${this.lastname}, contact: ${this.stats.contact}`);
    }
}