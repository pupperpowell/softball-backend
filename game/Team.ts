import type { Player } from "./Player";

export class Team {
    name: String; // including "Team?" or what
    players: Player[];
    currentBatterIndex: number = 0;

    // TODO: Implement this

    constructor(name: string) {
        this.name = name;
    }
}