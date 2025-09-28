# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Run the application**: `bun run index.ts`
- **Install dependencies**: `bun install`
- **Run tests**: `bun test`
- **Run specific test**: `bun test tests/filename.test.ts`
- **Run with hot reload**: `bun --hot index.ts`

## Architecture

This is a softball game simulation engine that powers Ultimate Softball Simulator. The core architecture consists of:

### Game Engine (`game/`)
- **Game.ts**: Main game state class that manages innings, scoring, base runners, and game flow
- **simulateAtBat.ts**: Orchestrates complete plate appearances between batters and pitchers
- **Player.ts**: Player entity with stats (contact, power, running, pitching, fielding, charisma, growth)
- **Team.ts**: Team entity containing players and lineup management
- **types.ts**: Core type definitions for game entities and outcomes

### Simulation Modules
- **pitching.ts**: Pitch simulation (strike zones, pitch quality)
- **batting.ts**: Swing decisions and contact calculations  
- **fielding.ts**: Defensive play resolution after balls in play
- **math.ts**: Physics calculations for ball trajectory
- **GameClock.ts**: Time management for realistic game pacing
- **GameEvent.ts**: Event system for game state changes

### Key Concepts
- Games are deliberately slowed to realistic speeds to allow real-time interactivity
- All live games stored in memory for WebSocket streaming to clients
- Simulation pipeline: Pitch → Swing Decision → Contact → Fielding → Base Running → Scoring
- Stats range from 0-10 for each skill category
- Comprehensive outcome types: walks, strikeouts, various hit types, fielding plays

### Testing Strategy
Tests are located in `tests/` directory and focus on visualization of game mechanics:
- Physics calculations (airtime, trajectory)
- Statistical distributions (exit velocity, contact rates)  
- Outcome probabilities across different scenarios

Use `bun test` to run all tests or target specific test files.

## Runtime Environment

Default to using Bun instead of Node.js:
- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`  
- Use `bun build <file>` instead of `webpack` or `esbuild`
- Bun automatically loads .env, so don't use dotenv

## APIs

When building web features:
- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`
- `WebSocket` is built-in. Don't use `ws`
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile