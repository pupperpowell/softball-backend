import type { Player } from "./Player.ts";
import type { Team } from "./Team.ts";

// Amount of skill a player has in each category. From 0 to 10.
export type Stats = {
  contact: number;
  power: number;
  running: number;
  pitching: number;
  fielding: number;   // i.e. catching and throwing
  charisma: number;
  growth: number;    // player attitude, or, how quickly their stats improve
  // strategy?
};

// Possible fielding positions a player can occupy
export type FieldingPosition =
  | "Pitcher"
  | "Catcher"
  | "First Base"
  | "Second Base"
  | "Third Base"
  | "Shortstop"
  | "Left Field"
  | "Center Field"
  | "Right Field"
  | "Bench";

/**
 * other positions/edge cases include
 * designnated hitter, pinch hitter, pinch runner, relief pitcher, etc.
 */

export type ThrownPitch = {
  pitcher: Player;
  isStrike: boolean;
  pitchQuality: number;
};

export type AtBatOutcome =
  | "IN_PLAY"
  | "WALK"
  | "STRIKEOUT"
  | "GROUNDOUT"
  | "FLYOUT";

export type BattedBall = {
  batter: Player;
  velo: number; // exit velocity
  foul: boolean;
  homer: boolean;
  attack: number; // attack angle
  launch: number; // launch angle
}

export type FieldOutcome =
  | "SINGLE"
  | "DOUBLE"
  | "TRIPLE"
  | "HOME_RUN"
  | "OUT"
  | "DOUBLE_PLAY"
  | "TRIPLE_PLAY";

export type FieldResponse = { // What does a fielder do when they attempt to field the ball?
  fielder: Player;
  hit: boolean; // If the ball is not caught
  error: boolean;
  result: FieldOutcome;
  // number of bases the batter takes on the play
  basesTaken?: number; // is this needed?
};

export interface GameState {
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  currentInning: number;
  isTopHalf: boolean; // true for top half (away team batting), false for bottom half (home team batting)
  homeBatterIndex: number;
  awayBatterIndex: number;
  outs: number;
  onBase: Player[];
  isGameOver: boolean;
}
