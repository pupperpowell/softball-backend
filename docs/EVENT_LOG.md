# EventLog Documentation

## Overview

The **EventLog** system is a comprehensive event tracking and narration system for baseball game simulations. It captures every significant action that occurs during a game, from the first pitch to the final out, providing a detailed play-by-play record that can be queried, analyzed, and even narrated in real-time.

### Purpose and Use Cases

- **Game Replay**: Store complete game history for later playback and analysis
- **Statistics Tracking**: Derive advanced statistics from granular event data
- **Live Broadcasting**: Stream play-by-play events to clients via WebSocket
- **Narration**: Generate human-readable descriptions of game events
- **Debugging**: Trace game logic and simulation behavior
- **Analytics**: Query specific event patterns (e.g., all strikeouts in the 9th inning)

### Key Features

- **📊 Comprehensive Event Tracking**: Captures 30+ event types covering all game scenarios
- **🎙️ Auto-Generated Narration**: Optional broadcast-quality descriptions for every event
- **🔍 Flexible Querying**: Filter events by type, inning, or custom criteria
- **⚡ Streaming Ready**: Built-in event emitter for real-time broadcasting
- **💾 Serializable**: Export entire game logs as JSON for storage or replay
- **🎯 Type-Safe**: Full TypeScript support with discriminated unions

---

## Quick Start

### Basic Usage (No Narration)

```typescript
import { Game } from "./game/Game";
import { Team } from "./game/Team";

// Create teams and game
const homeTeam = new Team("Home Sox");
const awayTeam = new Team("Away Stars");
const game = new Game(homeTeam, awayTeam, false); // false = no narration

// Simulate the game
game.simulate();

// Access the event log
const eventLog = game.getEventLog();
const events = eventLog.getEvents();

console.log(`Total events captured: ${events.length}`);
console.log(`First event:`, events[0]);
```

### With Narration Enabled

```typescript
// Enable narration by passing true to Game constructor
const game = new Game(homeTeam, awayTeam, true);

game.simulate();

// Get play-by-play narration
const eventLog = game.getEventLog();
const playByPlay = eventLog.getPlayByPlay();

playByPlay.forEach((narration, index) => {
  console.log(`${index + 1}. ${narration}`);
});

// Output:
// 1. Welcome to Away Stars at Home Sox!
// 2. Top of the 1st inning. Away Stars batting.
// 3. Player 123 steps up to the plate.
// 4. Player 456 throws a fastball, 92 MPH.
// 5. Strike called!
// ...
```

---

## Event Types

The EventLog system tracks 30+ distinct event types, categorized as follows:

### Game Management Events

| Event Type    | Description            | When Triggered               |
| ------------- | ---------------------- | ---------------------------- |
| `gameStart`   | Game begins            | At the start of simulation   |
| `gameEnd`     | Game concludes         | After final out or walk-off  |
| `inningStart` | New inning/half begins | Start of each half-inning    |
| `inningEnd`   | Inning/half concludes  | After 3rd out of half-inning |

### At-Bat Events

| Event Type   | Description             | When Triggered                         |
| ------------ | ----------------------- | -------------------------------------- |
| `atBatStart` | Batter approaches plate | Before first pitch of at-bat           |
| `atBatEnd`   | At-bat concludes        | After walk, strikeout, or ball in play |

### Pitching Events

| Event Type     | Description              | When Triggered               |
| -------------- | ------------------------ | ---------------------------- |
| `pitchThrown`  | Pitcher releases ball    | On every pitch               |
| `ballCalled`   | Umpire calls ball        | Pitch outside strike zone    |
| `strikeCalled` | Umpire calls strike      | Strike looking or swinging   |
| `foulBall`     | Batter hits foul         | Ball lands in foul territory |
| `swingMiss`    | Batter swings and misses | Unsuccessful swing           |

### Contact & Hitting Events

| Event Type    | Description           | When Triggered                                |
| ------------- | --------------------- | --------------------------------------------- |
| `contactMade` | Bat contacts ball     | Successful contact                            |
| `ballInPlay`  | Ball is put in play   | After contact, before fielding                |
| `hitRecorded` | Official hit recorded | Single, double, triple, or inside-the-park HR |
| `homerun`     | Home run hit          | Ball clears fence or inside-the-park          |

### Outcome Events

| Event Type    | Description         | When Triggered    |
| ------------- | ------------------- | ----------------- |
| `walk`        | Batter walks        | 4 balls           |
| `strikeout`   | Batter strikes out  | 3 strikes         |
| `hitByPitch`  | Batter hit by pitch | Pitch hits batter |
| `outRecorded` | Out recorded        | Any type of out   |

### Fielding Events

| Event Type     | Description         | When Triggered             |
| -------------- | ------------------- | -------------------------- |
| `fielded`      | Fielder fields ball | Clean fielding             |
| `caught`       | Ball caught in air  | Fly ball/line drive caught |
| `dropped`      | Ball dropped        | Fielding error             |
| `error`        | Fielding error      | Throwing/catching error    |
| `thrownToBase` | Ball thrown to base | Fielder throws             |

### Base Running Events

| Event Type       | Description               | When Triggered              |
| ---------------- | ------------------------- | --------------------------- |
| `runnerAdvances` | Runner moves to next base | On hit, walk, steal, etc.   |
| `runnerOut`      | Runner tagged/forced out  | Runner caught between bases |
| `runScores`      | Runner crosses home plate | Run scored                  |
| `stolenBase`     | Successful stolen base    | Runner steals base          |
| `caughtStealing` | Runner caught stealing    | Failed steal attempt        |

---

## Event Structure

### BaseEvent Interface

All events extend the `BaseEvent` interface:

```typescript
interface BaseEvent {
  readonly id: number; // Unique sequential ID (starts at 0)
  readonly timestamp: number; // Unix timestamp in milliseconds
  readonly type: EventType; // Specific event type
  readonly inning: number; // Current inning (1-9+)
  readonly halfInning: HalfInning; // 'top' or 'bottom'
  readonly data: unknown; // Event-specific data
  readonly narration?: string; // Optional human-readable description
}
```

### Field Descriptions

- **`id`**: Unique, sequential identifier starting from 0. Guaranteed to be unique within a game.
- **`timestamp`**: Unix timestamp (milliseconds) when the event occurred. Non-decreasing.
- **`type`**: The specific event type (e.g., `'strikeout'`, `'homerun'`)
- **`inning`**: The current inning number (1-9 for regulation, 10+ for extras)
- **`halfInning`**: Either `HalfInning.Top` or `HalfInning.Bottom`
- **`data`**: Type-specific data payload (see Event Data Structures below)
- **`narration`**: Optional narration string (only present if narration is enabled)

### Example Event Objects

#### Game Start Event

```typescript
{
  id: 0,
  timestamp: 1696262400000,
  type: 'gameStart',
  inning: 1,
  halfInning: 'top',
  data: {
    homeTeam: 'Home Sox',
    awayTeam: 'Away Stars',
    date: '2023-10-02T19:00:00.000Z',
    location: 'Home Stadium'
  },
  narration: 'Welcome to Away Stars at Home Sox!'
}
```

#### Strikeout Event

```typescript
{
  id: 45,
  timestamp: 1696262455000,
  type: 'strikeout',
  inning: 2,
  halfInning: 'bottom',
  data: {
    batterId: 'john-doe',
    swinging: true,
    pitchNumber: 5
  },
  narration: 'John Doe strikes out swinging!'
}
```

#### Home Run Event

```typescript
{
  id: 127,
  timestamp: 1696262780000,
  type: 'homerun',
  inning: 5,
  halfInning: 'top',
  data: {
    batterId: 'mike-trout',
    rbi: 3,
    distance: 425,
    direction: 'center field'
  },
  narration: 'HOME RUN! Mike Trout crushes it 425 feet! 3 runs score!'
}
```

#### Contact Made Event

```typescript
{
  id: 89,
  timestamp: 1696262612000,
  type: 'contactMade',
  inning: 3,
  halfInning: 'bottom',
  data: {
    batterId: 'jane-smith',
    exitVelocity: 98.5,
    launchAngle: 23.4,
    azimuth: 15.2,
    projectedDistance: 0,
    hitType: 'lineDrive'
  },
  narration: 'Jane Smith hits a line drive! Exit velocity: 99 MPH.'
}
```

---

## Using the EventLog API

The [`EventLog`](game/EventLog.ts:11) class provides a rich API for managing and querying game events.

### Constructor

```typescript
const eventLog = new EventLog(enableNarration?: boolean);
```

**Parameters:**

- `enableNarration` (optional): If `true`, automatically generates narration for all events. Default: `false`

**Example:**

```typescript
// Without narration
const log1 = new EventLog();

// With narration
const log2 = new EventLog(true);
```

---

### `addEvent()`

Adds a new event to the log. Automatically assigns a sequential ID and timestamp.

```typescript
addEvent(
  type: EventType,
  inning: number,
  halfInning: HalfInning,
  data: unknown,
  narration?: string
): GameEvent
```

**Parameters:**

- `type`: The event type (e.g., `'strikeout'`)
- `inning`: Current inning number
- `halfInning`: `HalfInning.Top` or `HalfInning.Bottom`
- `data`: Event-specific data object
- `narration` (optional): Custom narration (overrides auto-generated)

**Returns:** The added event with assigned ID and timestamp

**Example:**

```typescript
import { HalfInning } from "./game/events/types";

const event = eventLog.addEvent("strikeout", 3, HalfInning.Bottom, {
  batterId: "player-1",
  swinging: true,
  pitchNumber: 6,
});

console.log(event.id); // 42
console.log(event.narration); // 'Player 1 strikes out swinging!' (if narration enabled)
```

---

### `getEvents()`

Retrieves all events in the log.

```typescript
getEvents(): readonly GameEvent[]
```

**Returns:** Read-only array of all events

**Example:**

```typescript
const allEvents = eventLog.getEvents();
console.log(`Total events: ${allEvents.length}`);

allEvents.forEach((event) => {
  console.log(`[${event.type}] Inning ${event.inning}`);
});
```

---

### `getEventsByInning()`

Filters events by a specific inning number.

```typescript
getEventsByInning(inning: number): readonly GameEvent[]
```

**Parameters:**

- `inning`: The inning number to filter by (1-9+)

**Returns:** Read-only array of events from the specified inning

**Example:**

```typescript
// Get all events from the 9th inning
const ninthInningEvents = eventLog.getEventsByInning(9);

console.log(`Events in 9th inning: ${ninthInningEvents.length}`);

// Separate top and bottom
const topOfNinth = ninthInningEvents.filter(
  (e) => e.halfInning === HalfInning.Top
);
const bottomOfNinth = ninthInningEvents.filter(
  (e) => e.halfInning === HalfInning.Bottom
);
```

---

### `getEventsByType()`

Filters events by event type.

```typescript
getEventsByType(type: EventType): readonly GameEvent[]
```

**Parameters:**

- `type`: The event type to filter by

**Returns:** Read-only array of events of the specified type

**Example:**

```typescript
// Find all strikeouts
const strikeouts = eventLog.getEventsByType("strikeout");
console.log(`Total strikeouts: ${strikeouts.length}`);

// Find all home runs
const homeruns = eventLog.getEventsByType("homerun");
console.log(`Total home runs: ${homeruns.length}`);

// Analyze strikeout data
strikeouts.forEach((event) => {
  const data = event.data as StrikeoutData;
  console.log(`Strikeout: ${data.swinging ? "swinging" : "looking"}`);
});
```

---

### `getPlayByPlay()`

Generates a play-by-play summary as an array of narration strings.

```typescript
getPlayByPlay(): string[]
```

**Returns:** Array of narration strings (only includes events with narration)

**Example:**

```typescript
const playByPlay = eventLog.getPlayByPlay();

console.log("=== GAME RECAP ===\n");
playByPlay.forEach((narration, index) => {
  console.log(`${index + 1}. ${narration}`);
});

// Output:
// === GAME RECAP ===
//
// 1. Welcome to Away Stars at Home Sox!
// 2. Top of the 1st inning. Away Stars batting.
// 3. Player 1 steps up to the plate.
// 4. Strike called!
// 5. Player 1 strikes out looking!
// ...
```

---

### `toJSON()`

Serializes the entire event log to a JSON string.

```typescript
toJSON(): string
```

**Returns:** Pretty-printed JSON string of all events

**Example:**

```typescript
// Export game to JSON
const jsonString = eventLog.toJSON();

// Save to file
import { writeFileSync } from "fs";
writeFileSync("game-log.json", jsonString);

// Parse back
const parsedEvents = JSON.parse(jsonString);
console.log(`Loaded ${parsedEvents.length} events`);
```

---

### `clear()`

Clears all events from the log and resets the ID counter.

```typescript
clear(): void
```

**Example:**

```typescript
console.log(`Events before clear: ${eventLog.getEventCount()}`);

eventLog.clear();

console.log(`Events after clear: ${eventLog.getEventCount()}`); // 0
```

---

### `getEventCount()`

Gets the total number of events in the log.

```typescript
getEventCount(): number
```

**Returns:** The count of events

**Example:**

```typescript
const count = eventLog.getEventCount();
console.log(`Total events logged: ${count}`);

// Efficient check without loading all events
if (eventLog.getEventCount() > 0) {
  console.log("Game has started");
}
```

---

## Enabling Narration

### How to Enable

Narration is enabled by passing `true` to the [`Game`](game/Game.ts:14) constructor:

```typescript
// Enable narration
const game = new Game(homeTeam, awayTeam, true);

// Disable narration (default)
const game = new Game(homeTeam, awayTeam, false);
// or
const game = new Game(homeTeam, awayTeam);
```

### What Narration Provides

When narration is enabled, the EventLog automatically generates human-readable descriptions for every event. These descriptions are:

- **Broadcast-quality**: Written in a professional sports commentary style
- **Context-aware**: Include player names, scores, and game situation
- **Complete**: Cover all 30+ event types
- **Formatted**: Ready for display in UI or console output

### Example Narrated Events

```typescript
// gameStart
"Welcome to Away Stars at Home Sox!";

// inningStart
"Top of the 3rd inning. Away Stars batting.";

// atBatStart
"John Doe steps up to the plate. Runners on first and third.";

// pitchThrown
"Jane Smith throws a fastball, 94 MPH.";

// contactMade
"Mike Trout hits a fly ball! Exit velocity: 103 MPH.";

// hitRecorded
"It's a double! Mike Trout reaches second. 2 runs score!";

// homerun
"HOME RUN! Aaron Judge crushes it 450 feet! 3 runs score!";

// strikeout
"Carlos Santana strikes out swinging!";

// outRecorded
"Mookie Betts flies out! Giancarlo Stanton makes the play.";

// gameEnd
"Game over! Home team wins 5-3!";
```

### Custom Narration

You can also provide custom narration when adding events:

```typescript
eventLog.addEvent(
  "strikeout",
  9,
  HalfInning.Bottom,
  { batterId: "player-1", swinging: true, pitchNumber: 7 },
  "WHAT A STRIKEOUT! The crowd goes wild!" // Custom narration
);
```

---

## WebSocket Streaming (Future)

The EventLog uses an event emitter pattern that enables real-time streaming of game events via WebSocket or other mechanisms.

### Event Emitter Pattern

```typescript
import { EventEmitter } from "events";

// Create event emitter
const emitter = new EventEmitter();

// Set up the emitter on EventLog
eventLog.setEventEmitter(emitter);

// Listen for events
emitter.on("gameEvent", (event: GameEvent) => {
  console.log(`New event: ${event.type}`);

  // Broadcast to connected clients
  if (event.narration) {
    webSocket.send(
      JSON.stringify({
        type: "gameEvent",
        narration: event.narration,
        data: event.data,
      })
    );
  }
});
```

### Setting Up Streaming

```typescript
import { EventEmitter } from "events";
import { WebSocket } from "ws";

// Initialize WebSocket server
const wss = new WebSocket.Server({ port: 8080 });
const gameEmitter = new EventEmitter();

// Connect event log to emitter
eventLog.setEventEmitter(gameEmitter);

// Broadcast events to all connected clients
gameEmitter.on("gameEvent", (event: GameEvent) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(event));
    }
  });
});

// Simulate game (events will stream in real-time)
game.simulate();
```

### Real-Time Event Broadcasting

```typescript
// Client-side example
const ws = new WebSocket("ws://localhost:8080");

ws.onmessage = (message) => {
  const event = JSON.parse(message.data);

  // Display play-by-play
  if (event.narration) {
    document.getElementById(
      "play-by-play"
    ).innerHTML += `<p>${event.narration}</p>`;
  }

  // Update live stats
  if (event.type === "runScores") {
    updateScoreboard(event.data);
  }
};
```

---

## Best Practices

### When to Enable/Disable Narration

**Enable narration when:**

- Building user-facing features (game recaps, live updates)
- Generating play-by-play text for broadcasts
- Creating human-readable game logs
- Debugging game flow with readable output

**Disable narration when:**

- Running large-scale simulations (performance optimization)
- Only need raw event data for analytics
- Minimizing memory usage
- Storing events in database (narration can be regenerated)

### Performance Considerations

```typescript
// ❌ Bad: Narration for 10,000 simulated games
for (let i = 0; i < 10000; i++) {
  const game = new Game(homeTeam, awayTeam, true); // Unnecessary overhead
  game.simulate();
}

// ✅ Good: Disable narration for bulk simulations
for (let i = 0; i < 10000; i++) {
  const game = new Game(homeTeam, awayTeam, false);
  game.simulate();
  // Analyze events without narration overhead
}
```

### Querying Events Efficiently

```typescript
// ✅ Good: Use specific query methods
const strikeouts = eventLog.getEventsByType("strikeout");
const inning9 = eventLog.getEventsByInning(9);

// ❌ Avoid: Filtering all events repeatedly
const events = eventLog.getEvents();
const strikeouts = events.filter((e) => e.type === "strikeout");
const inning9 = events.filter((e) => e.inning === 9);

// ✅ Good: Combine filters for complex queries
const inning9Strikeouts = eventLog
  .getEventsByInning(9)
  .filter((e) => e.type === "strikeout");
```

### Serializing for Storage/Replay

```typescript
// Serialize after game completion
game.simulate();
const eventLog = game.getEventLog();
const jsonData = eventLog.toJSON();

// Store in database
await db.games.create({
  id: gameId,
  homeTeam: homeTeam.name,
  awayTeam: awayTeam.name,
  events: jsonData,
  finalScore: `${game.homeScore}-${game.awayScore}`,
});

// Later: Load and replay
const savedGame = await db.games.findOne({ id: gameId });
const events = JSON.parse(savedGame.events);

// Generate new narration if needed
events.forEach((event) => {
  if (!event.narration) {
    event.narration = generateEventNarration(event);
  }
});
```

---

## Examples

### Example 1: Run Simulation and Print Play-by-Play

```typescript
import { Game } from "./game/Game";
import { Team } from "./game/Team";

// Create teams
const yankees = new Team("New York Yankees");
const redsox = new Team("Boston Red Sox");

// Enable narration for play-by-play
const game = new Game(yankees, redsox, true);

// Run simulation
game.simulate();

// Print play-by-play
const eventLog = game.getEventLog();
const playByPlay = eventLog.getPlayByPlay();

console.log("\n=== GAME RECAP ===\n");
playByPlay.forEach((narration, index) => {
  console.log(`${index + 1}. ${narration}`);
});

console.log(`\nFinal Score: ${game.awayScore}-${game.homeScore}`);
console.log(`Winner: ${game.winner?.name}`);
console.log(`Total Events: ${eventLog.getEventCount()}`);
```

### Example 2: Filter Events by Inning

```typescript
// Simulate game
const game = new Game(homeTeam, awayTeam, true);
game.simulate();

const eventLog = game.getEventLog();

// Analyze specific innings
for (let inning = 1; inning <= game.currentInning; inning++) {
  const inningEvents = eventLog.getEventsByInning(inning);

  // Count runs scored in this inning
  const runEvents = inningEvents.filter((e) => e.type === "runScores");

  console.log(`Inning ${inning}: ${runEvents.length} runs scored`);

  // Show key plays
  const keyPlays = inningEvents.filter((e) =>
    ["homerun", "strikeout", "hitRecorded"].includes(e.type)
  );

  if (keyPlays.length > 0) {
    console.log("  Key plays:");
    keyPlays.forEach((event) => {
      console.log(`    - ${event.narration}`);
    });
  }
}
```

### Example 3: Export Game to JSON

```typescript
import { writeFileSync } from "fs";

// Simulate game
const game = new Game(homeTeam, awayTeam, false);
game.simulate();

// Export full event log
const eventLog = game.getEventLog();
const jsonData = eventLog.toJSON();

// Save to file
const filename = `game-${Date.now()}.json`;
writeFileSync(filename, jsonData);

console.log(`Game exported to ${filename}`);
console.log(`Events: ${eventLog.getEventCount()}`);
console.log(`File size: ${Buffer.byteLength(jsonData)} bytes`);

// Later: Load and analyze
const loadedData = JSON.parse(readFileSync(filename, "utf-8"));
console.log(`Loaded ${loadedData.length} events`);
```

### Example 4: Count Specific Event Types

```typescript
// Simulate game
const game = new Game(homeTeam, awayTeam, false);
game.simulate();

const eventLog = game.getEventLog();

// Count all event types
const eventCounts = new Map<string, number>();

eventLog.getEvents().forEach((event) => {
  eventCounts.set(event.type, (eventCounts.get(event.type) || 0) + 1);
});

// Display statistics
console.log("\n=== EVENT STATISTICS ===\n");

// Sort by frequency
const sortedCounts = Array.from(eventCounts.entries()).sort(
  (a, b) => b[1] - a[1]
);

sortedCounts.forEach(([type, count]) => {
  console.log(`${type.padEnd(20)}: ${count}`);
});

// Specific statistics
console.log("\n=== GAME STATS ===\n");
console.log(`Strikeouts: ${eventCounts.get("strikeout") || 0}`);
console.log(`Walks: ${eventCounts.get("walk") || 0}`);
console.log(`Hits: ${eventCounts.get("hitRecorded") || 0}`);
console.log(`Home Runs: ${eventCounts.get("homerun") || 0}`);
console.log(`Runs Scored: ${eventCounts.get("runScores") || 0}`);
console.log(`Total Outs: ${eventCounts.get("outRecorded") || 0}`);
```

### Example 5: Generate Game Summary

```typescript
// Simulate game with narration
const game = new Game(homeTeam, awayTeam, true);
game.simulate();

const eventLog = game.getEventLog();
const events = eventLog.getEvents();

// Generate summary
console.log("\n=== GAME SUMMARY ===\n");
console.log(`${game.awayTeam.name} @ ${game.homeTeam.name}`);
console.log(`Final Score: ${game.awayScore}-${game.homeScore}`);
console.log(`Innings: ${game.currentInning}`);
console.log(`Winner: ${game.winner?.name || "Tie"}`);

// Scoring summary by inning
console.log("\n--- Scoring Summary ---");
for (let i = 1; i <= game.currentInning; i++) {
  const inningEvents = eventLog.getEventsByInning(i);
  const runs = inningEvents.filter((e) => e.type === "runScores").length;
  if (runs > 0) {
    console.log(`Inning ${i}: ${runs} run${runs !== 1 ? "s" : ""}`);
  }
}

// Highlight plays (home runs only)
console.log("\n--- Highlight Plays ---");
const homeruns = eventLog.getEventsByType("homerun");
homeruns.forEach((event) => {
  console.log(`• Inning ${event.inning}: ${event.narration}`);
});

// First and last 5 plays
console.log("\n--- Opening Plays ---");
eventLog
  .getPlayByPlay()
  .slice(0, 5)
  .forEach((narration) => {
    console.log(`  ${narration}`);
  });

console.log("\n--- Closing Plays ---");
const pbp = eventLog.getPlayByPlay();
pbp.slice(-5).forEach((narration) => {
  console.log(`  ${narration}`);
});

console.log(`\nTotal events: ${eventLog.getEventCount()}`);
```

---

## Additional Resources

- **Source Code**: [`game/EventLog.ts`](game/EventLog.ts:1)
- **Type Definitions**: [`game/events/types.ts`](game/events/types.ts:1)
- **Narration Engine**: [`game/events/narration.ts`](game/events/narration.ts:1)
- **Test Suite**: [`tests/event-log.test.ts`](tests/event-log.test.ts:1)
- **Usage in Game**: [`game/Game.ts`](game/Game.ts:1)

---

## Version History

- **v1.0.0** (Current): Initial release with full event tracking, narration, and query capabilities
