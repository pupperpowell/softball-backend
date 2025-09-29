import type { Player } from "./Player";

export class Team {
    name: String; // including "Team?" or what
    public players: Player[] = [];
    currentBatterIndex: number = 0;

    // TODO: Implement this

    constructor(name: string) {
        this.name = name;
    }

    // ensure there are not two players with the same fielding position
    checkUniqueFielding() {
        
    }
}