import type { Player } from "./Player";
import type { ThrownPitch } from "./types";

export default function simulatePitch(pitcher: Player): ThrownPitch {

    // TODO: Implement this
    

    const pitch: ThrownPitch = {
        pitcher: pitcher,
        isStrike: true,
        pitchQuality: 0,
    }

    return pitch;
}