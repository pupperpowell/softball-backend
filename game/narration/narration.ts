import type { GameEvent } from '../events/types';
import type {
  GameStartData,
  GameEndData,
  InningStartData,
  InningEndData,
  AtBatStartData,
  AtBatEndData,
  ContactMadeData,
  BallInPlayData,
  HitRecordedData,
  OutRecordedData,
  PitchThrownData,
  RunScoresData,
  FoulBallData,
  SwingMissData,
  StrikeCalledData,
  BallCalledData,
} from '../events/types';
import { NarrationEngine } from './narrationEngine';
import type { ThrownPitch } from '../types';

// Create a shared NarrationEngine instance with debug mode enabled
// to prevent console logging during event generation
const narrationEngine = new NarrationEngine();
narrationEngine.setDebug(true);

/**
 * Helper function to get narration from NarrationEngine and clear the log.
 * @param engine - The NarrationEngine instance
 * @returns The latest narration string, or empty string if none
 */
function getNarration(engine: NarrationEngine): string {
  const log = engine.getNarrationLog();
  engine.clearLog();
  // Join all narrations with a space
  return log.join(' ');
}

/**
 * Helper function to create a ThrownPitch object from event data.
 * Note: We create a mock Player object since event data doesn't include full Player objects.
 */
function createThrownPitchFromEvent(data: PitchThrownData): ThrownPitch {
  const mockPitcher = {
    firstname: 'Pitcher',
    lastname: formatPlayerId(data.pitcherId).split(' ').pop() || 'Unknown',
  } as any;
  
  return {
    pitcher: mockPitcher,
    isStrike: data.isStrike,
    pitchQuality: Math.round((data.speed / 100) * 10), // Estimate quality from speed
  };
}

/**
 * Generates human-readable narration for a game event.
 * Creates broadcast-quality descriptions for each event type.
 * Uses NarrationEngine for enhanced narration when applicable.
 *
 * @param event - The game event to generate narration for
 * @returns A narration string describing the event
 */
export function generateEventNarration(event: GameEvent): string {
  switch (event.type) {
    case 'gameStart': {
      const data = event.data as GameStartData;
      return `Welcome to ${data.awayTeam} at ${data.homeTeam}!`;
    }

    case 'gameEnd': {
      const data = event.data as GameEndData;
      const winner = data.winner === 'home' ? 'Home team' : data.winner === 'away' ? 'Away team' : 'Neither team';
      const scoreStr = `${data.awayScore}-${data.homeScore}`;
      if (data.winner === 'tie') {
        return `Game over! Final score: ${scoreStr}. It's a tie!`;
      }
      return `Game over! ${winner} wins ${scoreStr}!`;
    }

    case 'inningStart': {
      const data = event.data as InningStartData;
      const halfStr = data.half === 'top' ? 'Top' : 'Bottom';
      const inningOrdinal = getOrdinal(data.inning);
      return `${halfStr} of the ${inningOrdinal} inning. ${data.battingTeam} batting.`;
    }

    case 'inningEnd': {
      const data = event.data as InningEndData;
      const runsStr = data.runsScored === 1 ? '1 run' : `${data.runsScored} runs`;
      return `End of the half. ${runsStr} scored. Score: ${data.scoreUpdate.away}-${data.scoreUpdate.home}`;
    }

    case 'atBatStart': {
      const data = event.data as AtBatStartData;
      const batterName = formatPlayerId(data.batterId);
      const runnersDesc = data.runnersOnBase.length > 0
        ? ` Runners on ${data.runnersOnBase.map(formatBase).join(' and ')}.`
        : '';
      return `${batterName} steps up to the plate.${runnersDesc}`;
    }

    case 'atBatEnd': {
      const data = event.data as AtBatEndData;
      const batterName = formatPlayerId(data.batterId);
      const outcomeDesc = {
        'out': 'makes an out',
        'hit': 'gets a hit',
        'walk': 'walks',
        'strikeout': 'strikes out',
      }[data.outcome] || 'completes the at-bat';
      return `${batterName} ${outcomeDesc}.`;
    }

    case 'pitchThrown': {
      const data = event.data as PitchThrownData;
      const thrownPitch = createThrownPitchFromEvent(data);
      narrationEngine.narratePitch(thrownPitch);
      return getNarration(narrationEngine);
    }

    case 'contactMade': {
      const data = event.data as ContactMadeData;
      const batterName = formatPlayerId(data.batterId);
      // For contactMade, just indicate contact was made
      narrationEngine.narrateContact(batterName, true, false, 0, 0);
      return getNarration(narrationEngine);
    }

    case 'ballInPlay': {
      const data = event.data as BallInPlayData;
      const batterName = formatPlayerId(data.batterId);
      return `${batterName} puts the ball in play toward ${data.direction}.`;
    }

    case 'hitRecorded': {
      const data = event.data as HitRecordedData;
      const batterName = formatPlayerId(data.batterId);
      const playTypeMap: Record<string, string> = {
        'single': 'SINGLE',
        'double': 'DOUBLE',
        'triple': 'TRIPLE',
        'insideTheParkHomeRun': 'HOME_RUN',
      };
      const playType = playTypeMap[data.hitType] || 'SINGLE';
      narrationEngine.narratePlayResult(batterName, playType);
      
      // Add RBI narration if applicable
      if (data.rbi > 0) {
        narrationEngine.narrateRunsScored(data.rbi);
      }
      
      return getNarration(narrationEngine);
    }

    case 'outRecorded': {
      const data = event.data as OutRecordedData;
      const playerName = formatPlayerId(data.playerId);
      const fielderName = data.fielderId ? formatPlayerId(data.fielderId) : undefined;
      narrationEngine.narratePlayResult(playerName, 'OUT', fielderName);
      return getNarration(narrationEngine);
    }

    case 'runScores': {
      const data = event.data as RunScoresData;
      narrationEngine.narrateRunsScored(1);
      return getNarration(narrationEngine);
    }

    case 'walk': {
      const data = event.data;
      const batterName = formatPlayerId((data as any).batterId);
      narrationEngine.narrateAtBatResult(batterName, 'WALK');
      return getNarration(narrationEngine);
    }

    case 'strikeout': {
      const data = event.data;
      const batterName = formatPlayerId((data as any).batterId);
      narrationEngine.narrateAtBatResult(batterName, 'STRIKEOUT');
      return getNarration(narrationEngine);
    }

    case 'ballCalled': {
      const data = event.data as BallCalledData;
      // Simple narration for ball called - NarrationEngine doesn't have a specific method for this
      return 'Ball!';
    }

    case 'strikeCalled': {
      const data = event.data as StrikeCalledData;
      // Simple narration for strike called
      return data.type === 'looking' ? 'Strike called!' : 'Strike swinging!';
    }

    case 'foulBall': {
      const data = event.data as FoulBallData;
      // Use narrateContact with isFoul=true
      // We don't have batter name in foul ball data, so use simple narration
      return 'Foul ball!';
    }

    case 'swingMiss': {
      const data = event.data as SwingMissData;
      // Use narrateContact with madeContact=false
      // We don't have batter name in swing miss data, so use simple narration
      return 'Swing and a miss!';
    }

    case 'hitByPitch': {
      const data = event.data;
      const batterName = formatPlayerId((data as any).batterId);
      return `${batterName} is hit by the pitch!`;
    }

    case 'fielded': {
      const data = event.data;
      const fielderName = formatPlayerId((data as any).fielderId);
      return `${fielderName} fields the ball cleanly.`;
    }

    case 'caught': {
      const data = event.data;
      const fielderName = formatPlayerId((data as any).fielderId);
      const catchType = (data as any).catchType as 'routine' | 'diving' | 'over shoulder';
      const catchDesc = {
        'routine': 'makes the catch',
        'diving': 'makes a diving catch',
        'over shoulder': 'catches it over the shoulder',
      }[catchType] || 'makes the catch';
      return `${fielderName} ${catchDesc}!`;
    }

    case 'dropped': {
      const data = event.data;
      const fielderName = formatPlayerId((data as any).fielderId);
      return `${fielderName} drops the ball!`;
    }

    case 'error': {
      const data = event.data;
      const fielderName = formatPlayerId((data as any).fielderId);
      const errorType = (data as any).errorType as 'throwing' | 'fielding' | 'catching';
      const errorDesc = {
        'throwing': 'throwing error',
        'fielding': 'fielding error',
        'catching': 'catching error',
      }[errorType] || 'error';
      return `${errorDesc} by ${fielderName}!`;
    }

    case 'runnerAdvances': {
      const data = event.data;
      const runnerName = formatPlayerId((data as any).runnerId);
      const toBaseStr = formatBase((data as any).toBase);
      return `${runnerName} advances to ${toBaseStr}.`;
    }

    case 'runnerOut': {
      const data = event.data;
      const runnerName = formatPlayerId((data as any).runnerId);
      const baseStr = formatBase((data as any).base);
      return `${runnerName} is out at ${baseStr}!`;
    }

    case 'stolenBase': {
      const data = event.data;
      const runnerName = formatPlayerId((data as any).runnerId);
      const baseStr = formatBase((data as any).toBase);
      if ((data as any).success) {
        return `${runnerName} steals ${baseStr}!`;
      } else {
        return `${runnerName} is caught stealing ${baseStr}!`;
      }
    }

    case 'caughtStealing': {
      const data = event.data;
      const runnerName = formatPlayerId((data as any).runnerId);
      const baseStr = formatBase((data as any).base);
      return `${runnerName} is caught stealing ${baseStr}!`;
    }

    case 'homerun': {
      const data = event.data;
      const batterName = formatPlayerId((data as any).batterId);
      narrationEngine.narratePlayResult(batterName, 'HOME_RUN');
      // Add runs scored narration
      const rbi = (data as any).rbi;
      if (rbi > 0) {
        narrationEngine.narrateRunsScored(rbi);
      }
      return getNarration(narrationEngine);
    }

    case 'thrownToBase': {
      const data = event.data;
      const fielderName = formatPlayerId((data as any).fromFielderId);
      const baseStr = formatBase((data as any).toBase);
      return `${fielderName} throws to ${baseStr}.`;
    }

    default: {
      // Fallback for any unhandled event types
      const fallbackType = (event as GameEvent).type;
      return `${fallbackType} event occurred.`;
    }
  }
}

/**
 * Converts a player ID (lowercase firstname-lastname) to a display name.
 */
function formatPlayerId(playerId: string | number): string {
  if (typeof playerId === 'number') {
    return `Player ${playerId}`;
  }
  
  // Convert from "firstname-lastname" format to "Firstname Lastname"
  const parts = playerId.split('-');
  return parts
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Formats a base number as a readable string.
 */
function formatBase(base: number): string {
  switch (base) {
    case 1:
      return 'first';
    case 2:
      return 'second';
    case 3:
      return 'third';
    case 4:
      return 'home';
    default:
      return `base ${base}`;
  }
}

/**
 * Converts a number to its ordinal form (1st, 2nd, 3rd, etc.).
 */
function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0] || 'th');
}