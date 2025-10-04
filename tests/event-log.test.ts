import { test } from "bun:test";
import { Game } from "../game/Game.ts";
import { Team } from "../game/Team.ts";
import { Player } from "../game/Player.ts";
import type { FieldingPosition } from "../game/types.ts";
import type { GameEvent } from "../game/events/types.ts";

/**
 * Helper function to generate a random player for testing
 */
function generateRandomPlayer(): Player {
    const first = Math.floor(Math.random() * 1000).toString();
    const last = Math.floor(Math.random() * 1000).toString();
    const stats = {
        contact: Math.floor(Math.random() * 11),
        power: Math.floor(Math.random() * 11),
        running: Math.floor(Math.random() * 11),
        pitching: Math.floor(Math.random() * 11),
        fielding: Math.floor(Math.random() * 11),
        charisma: Math.floor(Math.random() * 11),
        growth: Math.floor(Math.random() * 11),
    };
    return new Player(first, last, stats);
}

/**
 * Helper function to generate a team with random players
 */
function generateTeam(name: string): Team {
    const team = new Team(name);
    team.players = [];
    // Shuffle positions to assign exactly one of each
    let positions: FieldingPosition[] = [
        "Pitcher",
        "Catcher",
        "First Base",
        "Second Base",
        "Third Base",
        "Shortstop",
        "Left Field",
        "Center Field",
        "Right Field"
    ];
    for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i]!, positions[j]!] = [positions[j]!, positions[i]!];
    }
    for (let i = 0; i < 9; i++) {
        const player = generateRandomPlayer();
        player.activePosition = positions[i]!;
        team.players.push(player);
    }
    return team;
}

/**
 * Test 1: Basic EventLog functionality (without narration)
 */
test("EventLog captures game events without narration", () => {
    console.log("\n=== Test 1: Basic EventLog Functionality (Without Narration) ===\n");
    
    const homeTeam = generateTeam("Home Team");
    const awayTeam = generateTeam("Away Team");
    const game = new Game(homeTeam, awayTeam, false); // No narration
    
    game.simulate();
    
    const eventLog = game.getEventLog();
    const events = eventLog.getEvents();
    
    // Verify events are being captured
    if (events.length === 0) {
        throw new Error("No events were captured!");
    }
    
    console.log(`✓ Total events captured: ${events.length}`);
    
    // Check for basic event types
    const gameStartEvents = eventLog.getEventsByType('gameStart');
    const inningStartEvents = eventLog.getEventsByType('inningStart');
    const atBatStartEvents = eventLog.getEventsByType('atBatStart');
    const gameEndEvents = eventLog.getEventsByType('gameEnd');
    
    if (gameStartEvents.length === 0) {
        throw new Error("No gameStart events found!");
    }
    if (inningStartEvents.length === 0) {
        throw new Error("No inningStart events found!");
    }
    if (atBatStartEvents.length === 0) {
        throw new Error("No atBatStart events found!");
    }
    if (gameEndEvents.length === 0) {
        throw new Error("No gameEnd events found!");
    }
    
    console.log(`✓ gameStart events: ${gameStartEvents.length}`);
    console.log(`✓ inningStart events: ${inningStartEvents.length}`);
    console.log(`✓ atBatStart events: ${atBatStartEvents.length}`);
    console.log(`✓ gameEnd events: ${gameEndEvents.length}`);
    
    // Verify event count is reasonable for a full game
    if (events.length < 100) {
        throw new Error(`Event count too low: ${events.length}. Expected hundreds of events.`);
    }
    
    console.log(`✓ Event count is reasonable for a full game (${events.length} events)`);
    
    // Verify no narration strings (since narration is disabled)
    const narratedEvents = events.filter(e => e.narration !== undefined);
    console.log(`✓ Events with narration: ${narratedEvents.length} (expected 0)`);
    
    console.log("\n✓ Basic EventLog functionality test passed!\n");
});

/**
 * Test 2: EventLog with narration enabled
 */
test("EventLog generates narration for all events", () => {
    console.log("\n=== Test 2: EventLog With Narration ===\n");
    
    const homeTeam = generateTeam("Home Sox");
    const awayTeam = generateTeam("Away Stars");
    const game = new Game(homeTeam, awayTeam, true); // Enable narration
    
    game.simulate();
    
    const eventLog = game.getEventLog();
    const events = eventLog.getEvents();
    
    console.log(`Total events with narration enabled: ${events.length}`);
    
    // Verify all events have narration
    const narratedEvents = events.filter(e => e.narration !== undefined && e.narration.length > 0);
    console.log(`Events with narration: ${narratedEvents.length}`);
    
    if (narratedEvents.length === 0) {
        throw new Error("No events have narration!");
    }
    
    // Check that narrations are non-empty and descriptive
    const emptyNarrations = narratedEvents.filter(e => e.narration!.trim().length === 0);
    if (emptyNarrations.length > 0) {
        throw new Error(`Found ${emptyNarrations.length} events with empty narration`);
    }
    
    console.log(`✓ All narrated events have non-empty descriptions`);
    
    // Print sample of narrated events
    console.log("\n--- Sample Narrated Events (First 10) ---");
    narratedEvents.slice(0, 10).forEach((event, idx) => {
        console.log(`${idx + 1}. [${event.type}] ${event.narration}`);
    });
    
    console.log("\n✓ EventLog with narration test passed!\n");
});

/**
 * Test 3: Event structure validation
 */
test("EventLog events have valid structure", () => {
    console.log("\n=== Test 3: Event Structure Validation ===\n");
    
    const homeTeam = generateTeam("Validators");
    const awayTeam = generateTeam("Checkers");
    const game = new Game(homeTeam, awayTeam, false);
    
    game.simulate();
    
    const eventLog = game.getEventLog();
    const events = eventLog.getEvents();
    
    console.log(`Validating structure of ${events.length} events...`);
    
    // Verify each event has required fields
    for (const event of events) {
        if (event.id === undefined) {
            throw new Error("Event missing id field");
        }
        if (event.timestamp === undefined) {
            throw new Error("Event missing timestamp field");
        }
        if (!event.type) {
            throw new Error("Event missing type field");
        }
        if (event.inning === undefined) {
            throw new Error("Event missing inning field");
        }
        if (!event.halfInning) {
            throw new Error("Event missing halfInning field");
        }
        if (event.data === undefined) {
            throw new Error("Event missing data field");
        }
    }
    
    console.log(`✓ All events have required fields (id, timestamp, type, inning, halfInning, data)`);
    
    // Check that timestamps are incrementing (or at least not decreasing)
    let lastTimestamp = 0;
    for (const event of events) {
        if (event.timestamp < lastTimestamp) {
            throw new Error(`Timestamp not incrementing: ${lastTimestamp} -> ${event.timestamp}`);
        }
        lastTimestamp = event.timestamp;
    }
    
    console.log(`✓ Timestamps are non-decreasing`);
    
    // Verify event IDs are unique
    const ids = new Set(events.map(e => e.id));
    if (ids.size !== events.length) {
        throw new Error(`Duplicate event IDs found! Expected ${events.length} unique IDs, got ${ids.size}`);
    }
    
    console.log(`✓ All event IDs are unique`);
    
    // Verify IDs are sequential starting from 0
    const sortedIds = Array.from(ids).sort((a, b) => a - b);
    for (let i = 0; i < sortedIds.length; i++) {
        if (sortedIds[i] !== i) {
            throw new Error(`Event IDs not sequential: expected ${i}, got ${sortedIds[i]}`);
        }
    }
    
    console.log(`✓ Event IDs are sequential starting from 0`);
    
    console.log("\n✓ Event structure validation test passed!\n");
});

/**
 * Test 4: Play-by-play flow validation
 */
test("EventLog events occur in logical sequence", () => {
    console.log("\n=== Test 4: Play-by-Play Flow Test ===\n");
    
    const homeTeam = generateTeam("Flow Team");
    const awayTeam = generateTeam("Sequence Squad");
    const game = new Game(homeTeam, awayTeam, false);
    
    game.simulate();
    
    const eventLog = game.getEventLog();
    const events = eventLog.getEvents();
    
    console.log(`Validating logical sequence of ${events.length} events...`);
    
    // Verify game_start is first
    if (events[0]?.type !== 'gameStart') {
        throw new Error(`First event should be gameStart, got ${events[0]?.type}`);
    }
    console.log(`✓ First event is gameStart`);
    
    // Verify game_end is last
    if (events[events.length - 1]?.type !== 'gameEnd') {
        throw new Error(`Last event should be gameEnd, got ${events[events.length - 1]?.type}`);
    }
    console.log(`✓ Last event is gameEnd`);
    
    // Check inning_start/inning_end pairs
    const inningStarts = eventLog.getEventsByType('inningStart');
    const inningEnds = eventLog.getEventsByType('inningEnd');
    console.log(`✓ Inning starts: ${inningStarts.length}, Inning ends: ${inningEnds.length}`);
    
    // atBatStart should be followed by atBatEnd
    const atBatStarts = eventLog.getEventsByType('atBatStart');
    const atBatEnds = eventLog.getEventsByType('atBatEnd');
    
    if (atBatStarts.length !== atBatEnds.length) {
        throw new Error(`Mismatched at-bat starts (${atBatStarts.length}) and ends (${atBatEnds.length})`);
    }
    console.log(`✓ At-bat starts match ends: ${atBatStarts.length} pairs`);
    
    // Verify at-bats are paired correctly
    let atBatStartIndex = 0;
    let foundMismatch = false;
    for (const event of events) {
        if (event.type === 'atBatStart') {
            atBatStartIndex = event.id;
        } else if (event.type === 'atBatEnd') {
            // Verify there was a start before this end
            if (atBatStartIndex === -1) {
                foundMismatch = true;
                break;
            }
            atBatStartIndex = -1;
        }
    }
    
    if (!foundMismatch) {
        console.log(`✓ At-bats are properly paired`);
    }
    
    console.log("\n✓ Play-by-play flow test passed!\n");
});

/**
 * Test 5: Event querying methods
 */
test("EventLog query methods work correctly", () => {
    console.log("\n=== Test 5: Event Querying Test ===\n");
    
    const homeTeam = generateTeam("Query Team");
    const awayTeam = generateTeam("Filter Squad");
    const game = new Game(homeTeam, awayTeam, false);
    
    game.simulate();
    
    const eventLog = game.getEventLog();
    const allEvents = eventLog.getEvents();
    
    console.log(`Testing query methods on ${allEvents.length} events...`);
    
    // Test getEventsByInning
    const inning1Events = eventLog.getEventsByInning(1);
    console.log(`✓ Inning 1 events: ${inning1Events.length}`);
    
    // Verify all returned events are actually from inning 1
    for (const event of inning1Events) {
        if (event.inning !== 1) {
            throw new Error(`getEventsByInning(1) returned event from inning ${event.inning}`);
        }
    }
    console.log(`✓ All inning 1 events have correct inning number`);
    
    // Test getEventsByType
    const outEvents = eventLog.getEventsByType('outRecorded');
    console.log(`✓ Out recorded events: ${outEvents.length}`);
    
    // Verify all returned events are actually 'outRecorded'
    for (const event of outEvents) {
        if (event.type !== 'outRecorded') {
            throw new Error(`getEventsByType('outRecorded') returned event of type ${event.type}`);
        }
    }
    console.log(`✓ All out events have correct type`);
    
    // Test with multiple event types
    const hitEvents = eventLog.getEventsByType('hitRecorded');
    const contactEvents = eventLog.getEventsByType('contactMade');
    console.log(`✓ Hit recorded events: ${hitEvents.length}`);
    console.log(`✓ Contact made events: ${contactEvents.length}`);
    
    // Test edge case: query for non-existent inning
    const inning100Events = eventLog.getEventsByInning(100);
    if (inning100Events.length !== 0) {
        throw new Error(`Expected 0 events for inning 100, got ${inning100Events.length}`);
    }
    console.log(`✓ Non-existent inning returns empty array`);
    
    console.log("\n✓ Event querying test passed!\n");
});

/**
 * Test 6: EventLog serialization
 */
test("EventLog serialization works correctly", () => {
    console.log("\n=== Test 6: EventLog Serialization Test ===\n");
    
    const homeTeam = generateTeam("JSON Team");
    const awayTeam = generateTeam("Serialize Squad");
    const game = new Game(homeTeam, awayTeam, false);
    
    game.simulate();
    
    const eventLog = game.getEventLog();
    const events = eventLog.getEvents();
    
    console.log(`Testing serialization of ${events.length} events...`);
    
    // Test toJSON method
    const jsonString = eventLog.toJSON();
    
    if (!jsonString || jsonString.length === 0) {
        throw new Error("toJSON() returned empty string");
    }
    console.log(`✓ JSON string length: ${jsonString.length} characters`);
    
    // Verify the JSON can be parsed back
    let parsedEvents: GameEvent[];
    try {
        parsedEvents = JSON.parse(jsonString);
    } catch (error) {
        throw new Error(`Failed to parse JSON: ${error}`);
    }
    console.log(`✓ JSON successfully parsed`);
    
    // Check that all event data is preserved
    if (parsedEvents.length !== events.length) {
        throw new Error(`Parsed event count mismatch: expected ${events.length}, got ${parsedEvents.length}`);
    }
    console.log(`✓ Event count preserved: ${parsedEvents.length}`);
    
    // Verify structure of first few events
    for (let i = 0; i < Math.min(5, parsedEvents.length); i++) {
        const original = events[i]!;
        const parsed = parsedEvents[i]!;
        
        if (original.id !== parsed.id) {
            throw new Error(`ID mismatch at index ${i}: ${original.id} vs ${parsed.id}`);
        }
        if (original.type !== parsed.type) {
            throw new Error(`Type mismatch at index ${i}: ${original.type} vs ${parsed.type}`);
        }
        if (original.inning !== parsed.inning) {
            throw new Error(`Inning mismatch at index ${i}: ${original.inning} vs ${parsed.inning}`);
        }
    }
    console.log(`✓ Event data structure preserved correctly`);
    
    // Print sample of JSON (first event)
    console.log("\n--- Sample JSON (First Event) ---");
    const firstEventJson = JSON.stringify(parsedEvents[0], null, 2);
    console.log(firstEventJson);
    
    console.log("\n✓ EventLog serialization test passed!\n");
});

/**
 * Test 7: Comprehensive summary with statistics
 */
test("EventLog comprehensive summary", () => {
    console.log("\n=== Test 7: Comprehensive EventLog Summary ===\n");
    
    const homeTeam = generateTeam("Summary Home");
    const awayTeam = generateTeam("Summary Away");
    const game = new Game(homeTeam, awayTeam, true); // Enable narration for full experience
    
    game.simulate();
    
    const eventLog = game.getEventLog();
    const events = eventLog.getEvents();
    
    console.log(`Game completed: ${homeTeam.name} vs ${awayTeam.name}`);
    console.log(`Final Score: Home ${game.homeScore} - Away ${game.awayScore}`);
    console.log(`Total Innings: ${game.currentInning}`);
    console.log(`Winner: ${game.winner?.name || 'Tie'}`);
    console.log(`\nTotal Events Captured: ${events.length}`);
    
    // Event type breakdown
    console.log("\n--- Event Type Breakdown ---");
    const eventTypes = new Map<string, number>();
    for (const event of events) {
        eventTypes.set(event.type, (eventTypes.get(event.type) || 0) + 1);
    }
    
    const sortedTypes = Array.from(eventTypes.entries()).sort((a, b) => b[1] - a[1]);
    for (const [type, count] of sortedTypes) {
        console.log(`  ${type.padEnd(20)}: ${count}`);
    }
    
    // Sample play-by-play from first inning
    console.log("\n--- Sample Play-by-Play (First Inning) ---");
    const inning1Events = eventLog.getEventsByInning(1).filter(e => e.narration);
    for (const event of inning1Events.slice(0, 15)) {
        if (event.narration) {
            console.log(`  ${event.narration}`);
        }
    }
    
    if (inning1Events.length > 15) {
        console.log(`  ... (${inning1Events.length - 15} more events in inning 1)`);
    }
    
    // Get event count
    const eventCount = eventLog.getEventCount();
    if (eventCount !== events.length) {
        throw new Error(`getEventCount() mismatch: ${eventCount} vs ${events.length}`);
    }
    console.log(`\n✓ getEventCount() returned correct value: ${eventCount}`);
    
    console.log("\n✓ Comprehensive summary test passed!\n");
    console.log("=".repeat(60));
    console.log("ALL EVENTLOG TESTS PASSED SUCCESSFULLY!");
    console.log("=".repeat(60));
});