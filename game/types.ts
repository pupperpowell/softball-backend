import type { Player } from "./Player.ts";
import type { Team } from "./Team.ts";
import type { BoxScore } from "./BoxScore.ts";

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

export type RunnersState = {
  first?: Player;
  second?: Player;
  third?: Player;
}

export type PlayType =
  | "SINGLE"
  | "DOUBLE"
  | "TRIPLE"
  | "HOME_RUN"
  | "OUT"
  | "DOUBLE_PLAY"
  | "TRIPLE_PLAY";

export type FieldOutcome = { // What happens when fielding is said and done?
  primary_fielder: Player;
  playType: PlayType;
  updatedBases: RunnersState;
};

export interface AtBatResult {
  outcome: AtBatOutcome;
  balls: number;
  strikes: number;
  pitches: ThrownPitch[];
  swings: boolean[];
  battedBall?: BattedBall; // present when outcome is IN_PLAY
}

export type PlayerBattingStats = {
  atBats: number;
  hits: number;
  walks: number;
  strikeouts: number;
  runs: number;
  rbis: number;
};

export type PlayerPitchingStats = {
  pitchesThrown: number;
  strikes: number;
  balls: number;
  strikeouts: number;
  walks: number;
};

export type PlayerFieldingStats = {
  putouts: number;
  assists: number;
  errors: number;
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
  basesOccupied: RunnersState;
  isGameOver: boolean;
  boxScore: BoxScore;
}
