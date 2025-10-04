/**
 * Index file for event-related exports.
 * Re-exports all types from types.ts, the EventLog class, and narration utilities for clean imports.
 */

export * from './types';
export { EventLog } from '../EventLog';
export { generateEventNarration } from '../narration/narration';