import { test } from "bun:test";
import { Game } from "../game/Game.ts";
import { Team } from "../game/Team.ts";
import { Player } from "../game/Player.ts";
import type { FieldingPosition } from "../game/types.ts";

function generateRandomPlayer(): Player {
    const first = Math.floor(Math.random()*1000).toString();
    const last = Math.floor(Math.random()*1000).toString();
    const stats = {
        contact: Math.floor(Math.random() * 11),
        power: Math.floor(Math.random() * 11),
        running: Math.floor(Math.random() * 11),
        pitching: Math.floor(Math.random() * 11),
        fielding: Math.floor(Math.random() * 11),
        charisma: Math.floor(Math.random() * 11),
        growth: Math.floor(Math.random() * 11),
    };
    const player = new Player(first, last, stats);
    return player;
}

function generateSkilledPlayer(skill: number): Player {
    const first = Math.floor(Math.random()*1000).toString();
    const last = Math.floor(Math.random()*1000).toString();
    const stats = {
        contact: skill,
        power: skill,
        running: skill,
        pitching: skill,
        fielding: skill,
        charisma: skill,
        growth: skill,
    };
    const player = new Player(first, last, stats);
    return player;
}

function generateTeam(name: string): Team {
    const team = new Team(name);
    team.players = [];
    // Shuffle positions to assign exactly one of each
    let positions: FieldingPosition[] = ["Pitcher", "Catcher", "First Base", "Second Base", "Third Base", "Shortstop", "Left Field", "Center Field", "Right Field"];
    for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i]!, positions[j]!] = [positions[j]!, positions[i]!];
    }
    for (let i = 0; i < 9; i++) {
        const player = generateSkilledPlayer(1);
        player.activePosition = positions[i]!;
        team.players.push(player);
    }
    return team;
}

test("Simulate a full game with randomly generated players", () => {
    const testHomeTeam = generateTeam("Home Team");
    const testAwayTeam = generateTeam("Away Team");
    const game = new Game(testHomeTeam, testAwayTeam);
    game.simulate();
    // Assertions
    if (!game.isGameOver) {
        throw new Error("Game did not end");
    }
    if (!game.winner) {
        throw new Error("No winner determined");
    }
    console.log(`Game ended. Winner: ${game.winner.name}, Final Score: Home ${game.homeScore} - Away ${game.awayScore}`);
});
