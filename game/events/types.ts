/**
 * Core types for the EventLog system.
 * Defines the base event structure, event types, specific data interfaces,
 * and the discriminated union for game events.
 */

export enum HalfInning {
  Top = 'top',
  Bottom = 'bottom',
}

/**
 * Union type representing all possible event categories in the game.
 */
export type EventType =
  // Game management
  | 'gameStart'
  | 'gameEnd'
  | 'inningStart'
  | 'inningEnd'
  // At-bat
  | 'atBatStart'
  | 'atBatEnd'
  // Pitching
  | 'pitchThrown'
  // Outcomes
  | 'ballCalled'
  | 'strikeCalled'
  | 'foulBall'
  | 'swingMiss'
  | 'contactMade'
  | 'hitByPitch'
  | 'walk'
  | 'strikeout'
  // Fielding
  | 'ballInPlay'
  | 'fielded'
  | 'thrownToBase'
  | 'caught'
  | 'dropped'
  | 'error'
  // Base running
  | 'runnerAdvances'
  | 'runnerOut'
  | 'runScores'
  | 'stolenBase'
  | 'caughtStealing'
  // Misc outcomes
  | 'hitRecorded'
  | 'outRecorded'
  | 'homerun';

/**
 * Base interface for all events. Provides common fields.
 * @property id - Unique sequential ID starting from 0
 * @property timestamp - Unix timestamp in milliseconds
 * @property type - The specific type of event
 * @property inning - Current inning number (1-9 or more for extras)
 * @property halfInning - Top or bottom of the inning
 * @property data - Event-specific data
 * @property narration - Optional descriptive narration string
 */
export interface BaseEvent {
  readonly id: number;
  readonly timestamp: number;
  readonly type: EventType;
  readonly inning: number;
  readonly halfInning: HalfInning;
  readonly data: unknown;
  readonly narration?: string;
}

// Specific data interfaces for each event type

/**
 * Data for gameStart event.
 */
export interface GameStartData {
  homeTeam: string;
  awayTeam: string;
  date: string;
  location?: string;
}

/**
 * Data for gameEnd event.
 */
export interface GameEndData {
  homeScore: number;
  awayScore: number;
  winner: 'home' | 'away' | 'tie';
  duration: number; // in minutes
}

/**
 * Data for inningStart event.
 */
export interface InningStartData {
  inning: number;
  half: HalfInning;
  battingTeam: string;
  pitchingTeam: string;
}

/**
 * Data for inningEnd event.
 */
export interface InningEndData {
  runsScored: number;
  scoreUpdate: { home: number; away: number };
}

/**
 * Data for atBatStart event.
 */
export interface AtBatStartData {
  batterId: number;
  pitcherId: number;
  count: { balls: number; strikes: number };
  runnersOnBase: number[];
}

/**
 * Data for atBatEnd event.
 */
export interface AtBatEndData {
  outcome: 'out' | 'hit' | 'walk' | 'strikeout';
  batterId: number;
}

/**
 * Data for pitchThrown event.
 */
export interface PitchThrownData {
  pitcherId: number;
  batterId: number;
  pitchNumber: number;
  pitchType: string; // e.g., 'fastball', 'curveball'
  speed: number; // mph
  location: { x: number; y: number; z: number }; // coordinates in strike zone
  isStrike: boolean;
}

/**
 * Data for ballCalled event.
 */
export interface BallCalledData {
  pitchNumber: number;
  reason: 'outside' | 'low' | 'high';
}

/**
 * Data for strikeCalled event.
 */
export interface StrikeCalledData {
  pitchNumber: number;
  type: 'looking' | 'swinging';
}

/**
 * Data for foulBall event.
 */
export interface FoulBallData {
  pitchNumber: number;
  location: 'fair territory' | 'foul territory';
  caught?: boolean;
}

/**
 * Data for swingMiss event.
 */
export interface SwingMissData {
  pitchNumber: number;
  pitchType: string;
}

/**
 * Data for contactMade event.
 */
export interface ContactMadeData {
  batterId: number;
  exitVelocity: number; // mph
  launchAngle: number; // degrees
  azimuth: number; // direction in degrees
  projectedDistance: number; // feet
  hitType: 'grounder' | 'lineDrive' | 'flyBall' | 'popup';
}

/**
 * Data for hitByPitch event.
 */
export interface HitByPitchData {
  batterId: number;
  pitchType: string;
  location: string; // e.g., 'arm', 'leg'
}

/**
 * Data for walk event.
 */
export interface WalkData {
  batterId: number;
  fullCount: boolean;
}

/**
 * Data for strikeout event.
 */
export interface StrikeoutData {
  batterId: number;
  swinging: boolean;
  pitchNumber: number;
}

/**
 * Data for ballInPlay event.
 */
export interface BallInPlayData {
  batterId: number;
  speed: number;
  angle: number;
  direction: string; // e.g., 'left field'
}

/**
 * Data for fielded event.
 */
export interface FieldedData {
  fielderId: number;
  ballLocation: string;
  timeToField: number; // seconds
}

/**
 * Data for thrownToBase event.
 */
export interface ThrownToBaseData {
  fromFielderId: number;
  toBase: number;
  throwSpeed: number;
  accuracy: number; // 0-1
}

/**
 * Data for caught event.
 */
export interface CaughtData {
  fielderId: number;
  catchType: 'routine' | 'diving' | 'over shoulder';
  outRecorded: boolean;
}

/**
 * Data for dropped event.
 */
export interface DroppedData {
  fielderId: number;
  errorType: 'bobble' | 'missed' | 'passed ball';
}

/**
 * Data for error event.
 */
export interface ErrorData {
  fielderId: number;
  errorType: 'throwing' | 'fielding' | 'catching';
  basesAdvancedDueToError: number;
}

/**
 * Data for runnerAdvances event.
 */
export interface RunnerAdvancesData {
  runnerId: number;
  fromBase: number;
  toBase: number;
  reason: 'hit' | 'walk' | 'error' | 'stolen';
}

/**
 * Data for runnerOut event.
 */
export interface RunnerOutData {
  runnerId: number;
  base: number;
  outType: 'tag' | 'force' | 'appeal';
}

/**
 * Data for runScores event.
 */
export interface RunScoresData {
  runnerId: number;
  scoringTeam: string;
  rbiBatterId?: number;
}

/**
 * Data for stolenBase event.
 */
export interface StolenBaseData {
  runnerId: number;
  fromBase: number;
  toBase: number;
  success: boolean;
}

/**
 * Data for caughtStealing event.
 */
export interface CaughtStealingData {
  runnerId: number;
  base: number;
  catcherId: number;
}

/**
 * Data for hitRecorded event.
 */
export interface HitRecordedData {
  batterId: number;
  hitType: 'single' | 'double' | 'triple' | 'insideTheParkHomeRun';
  rbi: number;
  runnersAdvanced: number[];
}

/**
 * Data for outRecorded event.
 */
export interface OutRecordedData {
  playerId: number; // batter or runner
  outType: 'flyout' | 'groundout' | 'lineout' | 'popup' | 'strikeout' | 'tagout';
  fielderId?: number;
  assistFielders?: number[];
  base?: number;
}

/**
 * Data for homerun event.
 */
export interface HomerunData {
  batterId: number;
  rbi: number;
  distance: number; // feet
  direction: string;
}

/**
 * Discriminated union type for all game events.
 * Uses the 'type' field to narrow the specific data type.
 */
export type GameEvent = BaseEvent &
  (
    | { type: 'gameStart'; data: GameStartData }
    | { type: 'gameEnd'; data: GameEndData }
    | { type: 'inningStart'; data: InningStartData }
    | { type: 'inningEnd'; data: InningEndData }
    | { type: 'atBatStart'; data: AtBatStartData }
    | { type: 'atBatEnd'; data: AtBatEndData }
    | { type: 'pitchThrown'; data: PitchThrownData }
    | { type: 'ballCalled'; data: BallCalledData }
    | { type: 'strikeCalled'; data: StrikeCalledData }
    | { type: 'foulBall'; data: FoulBallData }
    | { type: 'swingMiss'; data: SwingMissData }
    | { type: 'contactMade'; data: ContactMadeData }
    | { type: 'hitByPitch'; data: HitByPitchData }
    | { type: 'walk'; data: WalkData }
    | { type: 'strikeout'; data: StrikeoutData }
    | { type: 'ballInPlay'; data: BallInPlayData }
    | { type: 'fielded'; data: FieldedData }
    | { type: 'thrownToBase'; data: ThrownToBaseData }
    | { type: 'caught'; data: CaughtData }
    | { type: 'dropped'; data: DroppedData }
    | { type: 'error'; data: ErrorData }
    | { type: 'runnerAdvances'; data: RunnerAdvancesData }
    | { type: 'runnerOut'; data: RunnerOutData }
    | { type: 'runScores'; data: RunScoresData }
    | { type: 'stolenBase'; data: StolenBaseData }
    | { type: 'caughtStealing'; data: CaughtStealingData }
    | { type: 'hitRecorded'; data: HitRecordedData }
    | { type: 'outRecorded'; data: OutRecordedData }
    | { type: 'homerun'; data: HomerunData }
  );