import type { BaseEvent, GameEvent, EventType } from './events/types';
import { HalfInning } from './events/types';
import { EventEmitter } from 'events';
import { generateEventNarration } from './narration/narration';

/**
 * The main EventLog class responsible for storing, managing, and querying game events.
 * Supports in-memory storage, event emission for real-time streaming, and various query methods.
 * Events are assigned sequential IDs starting from 0.
 */
export class EventLog {
  private events: readonly GameEvent[] = [];
  private nextId: number = 0;
  private eventEmitter?: EventEmitter;
  private enableNarration: boolean = false;

  /**
   * Creates a new EventLog instance.
   * @param enableNarration - Whether to automatically generate narration for events (default: false)
   */
  constructor(enableNarration?: boolean) {
    this.enableNarration = enableNarration ?? false;
  }

  /**
   * Sets the event emitter for broadcasting events via WebSocket or other streaming mechanisms.
   * @param emitter - The EventEmitter instance to use for emitting events.
   */
  public setEventEmitter(emitter: EventEmitter): void {
    this.eventEmitter = emitter;
  }

  /**
   * Adds a new event to the log.
   * Automatically assigns the next sequential ID and emits the event if an emitter is set.
   * @param event - The event to add, with type, inning, halfInning, data, and optional narration.
   * @returns The added event with assigned ID and timestamp.
   */
  public addEvent(
    type: EventType,
    inning: number,
    halfInning: HalfInning,
    data: unknown,
    narration?: string
  ): GameEvent {
    const timestamp = Date.now();
    
    // Auto-generate narration if enabled and not provided
    let finalNarration = narration;
    if (this.enableNarration && !narration) {
      // Create a temporary event to generate narration
      const tempEvent: BaseEvent = {
        id: this.nextId,
        timestamp,
        type,
        inning,
        halfInning,
        data,
      };
      finalNarration = generateEventNarration(tempEvent as GameEvent);
    }
    
    const event: BaseEvent = {
      id: this.nextId++,
      timestamp,
      type,
      inning,
      halfInning,
      data,
      narration: finalNarration,
    };

    // Cast to any to satisfy readonly, but since we're reassigning, it's fine
    (this.events as GameEvent[]).push(event as GameEvent);
    this.emitEvent(event as GameEvent);
    return event as GameEvent;
  }

  /**
   * Retrieves all events in the log.
   * @returns A readonly array of all GameEvent objects.
   */
  public getEvents(): readonly GameEvent[] {
    return this.events;
  }

  /**
   * Retrieves events filtered by a specific inning.
   * @param inning - The inning number to filter by.
   * @returns A readonly array of GameEvent objects for the specified inning.
   */
  public getEventsByInning(inning: number): readonly GameEvent[] {
    return this.events.filter(event => event.inning === inning);
  }

  /**
   * Retrieves events filtered by a specific event type.
   * @param type - The EventType to filter by.
   * @returns A readonly array of GameEvent objects of the specified type.
   */
  public getEventsByType(type: EventType): readonly GameEvent[] {
    return this.events.filter(event => event.type === type);
  }

  /**
   * Generates a play-by-play summary as an array of narration strings.
   * Only includes events with narration.
   * @returns An array of strings representing the play-by-play sequence.
   */
  public getPlayByPlay(): string[] {
    return this.events
      .filter(event => event.narration !== undefined)
      .map(event => event.narration!);
  }

  /**
   * Serializes the entire event log to JSON.
   * @returns A JSON string representation of all events.
   */
  public toJSON(): string {
    return JSON.stringify(this.events, null, 2);
  }

  /**
   * Clears all events from the log and resets the ID counter.
   */
  public clear(): void {
    this.events = [];
    this.nextId = 0;
  }

  /**
   * Gets the total number of events in the log.
   * @returns The count of events.
   */
  public getEventCount(): number {
    return this.events.length;
  }

  /**
   * Private method to emit the event using the configured EventEmitter.
   * @param event - The event to emit.
   */
  private emitEvent(event: GameEvent): void {
    if (this.eventEmitter) {
      this.eventEmitter.emit('gameEvent', event);
    }
  }
}