
/*
* Once a ball has been hit into play, the fielders must respond 
* and try to get as many runners out as possible.
*/

// The ball is hit into the air!
// A fielder must take action.

import type { BattedBall, FieldingPosition } from "./types";

export function simulateFielding(ball: BattedBall) {
    
}

function calculateAirTime(ball: BattedBall): number {
    // TODO: Calculate estimated air time based on BattedBall 
    throw new Error("implement me");
    return 0;
}

function estimateDropZone(ball: BattedBall): FieldingPosition {
    // TODO: Figure out which position the ball will land near
    // or, in the case of line drives, which positions the ball 
    // will pass within reach of
    throw new Error("implement me");
    return "Bench"
}