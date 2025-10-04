import { int, sqliteTable, text, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const usersTable = sqliteTable("users", {
  id: int("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
});

export const teamsTable = sqliteTable("teams", {
  id: int("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  userId: int("user_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("teams_user_id_idx").on(table.userId),
]);

export const playersTable = sqliteTable("players", {
  id: int("id").primaryKey({ autoIncrement: true }),
  firstname: text("firstname").notNull(),
  lastname: text("lastname").notNull(),
  contact: real("contact").default(0),
  power: real("power").default(0),
  running: real("running").default(0),
  pitching: real("pitching").default(0),
  fielding: real("fielding").default(0),
  charisma: real("charisma").default(0),
  growth: real("growth").default(0),
  activePosition: text("active_position").notNull(),
  primaryPosition: text("primary_position").notNull(),
  teamId: int("team_id").references(() => teamsTable.id, { onDelete: "cascade" }),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("players_team_id_unique").on(table.teamId),
  index("players_name_idx").on(table.firstname, table.lastname),
]);

export const gamesTable = sqliteTable("games", {
  id: int("id").primaryKey({ autoIncrement: true }),
  homeTeamId: int("home_team_id").notNull().references(() => teamsTable.id, { onDelete: "restrict" }),
  awayTeamId: int("away_team_id").notNull().references(() => teamsTable.id, { onDelete: "restrict" }),
  homeScore: int("home_score").default(0),
  awayScore: int("away_score").default(0),
  currentInning: int("current_inning").default(1),
  isTopHalf: int("is_top_half").default(1),
  homeBatterIndex: int("home_batter_index").default(0),
  awayBatterIndex: int("away_batter_index").default(0),
  outs: int("outs").default(0),
  isGameOver: int("is_game_over").default(0),
  winnerTeamId: int("winner_team_id").references(() => teamsTable.id, { onDelete: "set null" }),
  homeInningScores: text("home_inning_scores"),
  awayInningScores: text("away_inning_scores"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
  leagueId: int("league_id").references(() => leaguesTable.id, { onDelete: "set null" }),
  seasonId: int("season_id").references(() => seasonsTable.id, { onDelete: "set null" }),
}, (table) => [
  uniqueIndex("games_teams_unique").on(table.homeTeamId, table.awayTeamId),
]);

export const boxScoresTable = sqliteTable("box_scores", {
  id: int("id").primaryKey({ autoIncrement: true }),
  gameId: int("game_id").notNull().references(() => gamesTable.id, { onDelete: "cascade" }),
  playerId: int("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  atBats: int("at_bats").default(0),
  hits: int("hits").default(0),
  walks: int("walks").default(0),
  strikeouts: int("strikeouts").default(0),
  runs: int("runs").default(0),
  rbis: int("rbis").default(0),
  pitchesThrown: int("pitches_thrown").default(0),
  strikes: int("strikes").default(0),
  balls: int("balls").default(0),
  strikeoutsPitch: int("strikeouts_pitch").default(0),
  walksPitch: int("walks_pitch").default(0),
  putouts: int("putouts").default(0),
  assists: int("assists").default(0),
  errors: int("errors").default(0),
}, (table) => [
  uniqueIndex("box_scores_game_player_unique").on(table.gameId, table.playerId),
  index("box_scores_game_player_idx").on(table.gameId, table.playerId),
]);

export const leaguesTable = sqliteTable("leagues", {
  id: int("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
});

export const seasonsTable = sqliteTable("seasons", {
  id: int("id").primaryKey({ autoIncrement: true }),
  leagueId: int("league_id").notNull().references(() => leaguesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  startDate: text("start_date"),
  endDate: text("end_date"),
  isActive: int("is_active").default(1),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("seasons_league_name_unique").on(table.leagueId, table.name),
]);

export const leagueTeamsTable = sqliteTable("league_teams", {
  id: int("id").primaryKey({ autoIncrement: true }),
  seasonId: int("season_id").notNull().references(() => seasonsTable.id, { onDelete: "cascade" }),
  teamId: int("team_id").notNull().references(() => teamsTable.id, { onDelete: "cascade" }),
  joinDate: text("join_date").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("league_teams_season_team_unique").on(table.seasonId, table.teamId),
]);
