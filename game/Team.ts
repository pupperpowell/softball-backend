import type { Player } from "./Player";
import type { FieldingPosition } from "./types";

export class Team {
    name: String; // including "Team?" or what
    public players: Player[] = [];
    currentBatterIndex: number = 0;

    // TODO: Implement this

    constructor(name: string) {
        this.name = name;
    }

    // ensure there are not two players with the same fielding position
    // there can be multiple bench players though.
    checkUniqueFielding(): boolean {
        const positions = new Map<FieldingPosition, number>();
        for (const player of this.players) {
            if (player.activePosition !== "Bench") {
                const count = positions.get(player.activePosition) || 0;
                if (count > 0) {
                    return false; // Duplicate non-bench position
                }
                positions.set(player.activePosition, count + 1);
            }
        }
        return true;
    }

    getFielderByPosition(position: FieldingPosition): Player {
        const player = this.players.find(player => player.activePosition === position);
        if (!player) {
            throw new Error(`No player found at position ${position}`)
        } else {
            return player;
        }
    }
}
