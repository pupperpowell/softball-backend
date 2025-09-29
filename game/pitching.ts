import { normal, randomNormal, clamp } from "./math";
import type { Player } from "./Player";
import type { ThrownPitch } from "./types";

export function simulatePitch(pitcher: Player): ThrownPitch {
    const skill = pitcher.stats.pitching;
    const u = clamp(skill / 10, 0, 1);

    // Strike probability curve (quadratic fit) with bell-curve noise:
    let pStrike = 0.20 + 0.435 * u + 0.05 * u * u;

    // Add normal noise so outcomes vary around the mean
    pStrike += randomNormal() * 0.05;
    pStrike = clamp(pStrike, 0, 1);

    const isStrike = Math.random() < pStrike;

    let quality = normal(skill, 0.65) + (skill);

    const pitch: ThrownPitch = {
        pitcher,
        isStrike,
        pitchQuality: quality,
    };

    return pitch;
}
