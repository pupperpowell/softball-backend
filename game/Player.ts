import type { FieldingPosition, Stats } from "./types";

export class Player {
    firstname: String = Math.floor(Math.random()*1000).toString();
    lastname: String = Math.floor(Math.random()*1000).toString();
    
    stats: Stats = {
        contact: 0,
        power: 0,
        running: 0,
        pitching: 0,
        fielding: 0,
        charisma: 0,
        growth: 0
    };

    public activePosition: FieldingPosition = "Bench";
    public primaryPosition: FieldingPosition = "Bench";

    constructor(first?: string, last?: string, stats?: Stats, position?: FieldingPosition) {
        if (first) this.firstname = first;
        if (last) this.lastname = last;
        if (stats) this.stats = stats;
        if (position) this.activePosition = position;
    }

    /**
     * toString
     */
    public toString(): string {
        return `${this.firstname[0]}. ${this.lastname} (${this.activePosition})`;
    }

    public fullName(): string {
        return `${this.firstname} ${this.lastname}`;
    }

    isOutfielder() {
        return [
            "Left Field",
            "Center Field",
            "Right Field",
        ].includes(this.activePosition);
    }
    isInfielder() {
        return [
            "First Base",
            "Second Base",
            "Third Base",
            "Shortstop",
            "Pitcher",
            "Catcher"
        ].includes(this.activePosition);
    }
}