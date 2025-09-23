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
};

// Possible fielding positions a player can occupy
export type Position =
  | "Pitcher"
  | "Catcher"
  | "First Base"
  | "Second Base"
  | "Third Base"
  | "Shortstop"
  | "Left Field"
  | "Center Field"
  | "Right Field"
  | "Designated Hitter"
  | "Utility"
  | "Bench";

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

export type AtBatResult = {
  batter: Player;
  result: AtBatOutcome;
  // optional score/quality for contact (e.g., used to determine hit distance)
  hitScore?: number;
  // when result is IN_PLAY, fielding may produce a FieldOutcome. This is optional
  // and populated by the fielding simulation.
  fieldOutcome?: FieldOutcome;
  // optional batted-ball descriptors
  hitLocation?: string;
  hardHit?: boolean;
  trajectory?: "LINE_DRIVE" | "FLY_BALL";
};

export type SwingResult = {
  contact: boolean;
  velo?: number; // exit velocity
  launch_angle?: number; // what angle a ball is hit, relative to the ground
  attack_angle?: number; // what angle a ball is hit, relative to center field (0°)
}

export type FieldOutcome =
  | "SINGLE"
  | "DOUBLE"
  | "TRIPLE"
  | "HOME_RUN"
  | "OUT"
  | "DOUBLE_PLAY"
  | "TRIPLE_PLAY";

export type FieldResponse = {
  fielders: Player[];
  error: boolean;
  hit: boolean;
  // use a union string type for clarity and type-safety
  result: FieldOutcome;
  // number of bases the batter takes on the play
  basesTaken?: number;
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
