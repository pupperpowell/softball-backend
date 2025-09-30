import type { PlayerBattingStats, PlayerPitchingStats, PlayerFieldingStats } from './types.ts';
import type { Team } from './Team.ts';

export class BoxScore {
	// BoxScore class to track game statistics
	homeInningScores: number[] = [];
	awayInningScores: number[] = [];
	homeBattingStats: Record<string, PlayerBattingStats> = {};
	awayBattingStats: Record<string, PlayerBattingStats> = {};
	homePitchingStats: Record<string, PlayerPitchingStats> = {};
	awayPitchingStats: Record<string, PlayerPitchingStats> = {};
	homeFieldingStats: Record<string, PlayerFieldingStats> = {};
	awayFieldingStats: Record<string, PlayerFieldingStats> = {};
	winner?: Team;
}
