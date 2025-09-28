
/**
 * A game event can be a:
 * - Pitch
 * - BatterResponse: a "look" (no swing), whiff, foul ball, or ball put in play
 * - Steal attempt
 * - Fielded ball
 * - OutAttempt
 * - Run
 * 
 * The reason we have a GameEvent class is to have something uniform to send to clients over the WebSocket.
 * Maybe we can also use it to 
 */