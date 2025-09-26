import { expect, test } from "bun:test";
import type { FieldingPosition, Stats } from "./types";

export class Player {
    firstname: String = Math.random() > 0.5 ? "John" : "Jane";
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

    public position: FieldingPosition = "Bench";

    constructor(first?: string, last?: string, stats?: Stats, position?: FieldingPosition) {
        if (first) this.firstname = first;
        if (last) this.lastname = last;
        if (stats) this.stats = stats;
        if (position) this.position = position;
    }

    /**
     * toString
     */
    public toString(): string {
        return `${this.firstname[0]}. ${this.lastname}`;
    }

    public fullName(): string {
        return `${this.firstname} ${this.lastname}`;
    }
}

test("Player toString()", () => {
    expect(new Player().toString()).toBe("J. Doe")
    expect(new Player("Johnny", "Carson").fullName()).toBe("Johnny Carson")
});