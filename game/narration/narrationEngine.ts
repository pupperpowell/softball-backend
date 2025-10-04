import {
  hitNarrations as importedHitNarrations,
  pitchNarrations as importedPitchNarrations,
} from "./narrations";
import type { ThrownPitch } from "../types.ts";

type HitQualityBucket =
  | "silly"
  | "bad"
  | "poor"
  | "good"
  | "great"
  | "excellent";
type HitNarrationAssets = {
  lineDrive: Record<HitQualityBucket, string[]>;
  flyBall: Record<HitQualityBucket, string[]>;
  groundBall: Record<HitQualityBucket, string[]>;
  modifiers: { hard: string[]; soft: string[] };
  prepositions: { outfield: string[]; infield: string[] };
};

export class NarrationEngine {
  private narrationLog: string[] = [];

  private debug = false;

  private pitchNarrations: {
    [key: string]: { strike: string[]; ball: string[] };
  } = importedPitchNarrations;
  private hitNarrations: HitNarrationAssets =
    importedHitNarrations as HitNarrationAssets;

  // Narrate a pitch being thrown
  narratePitch(thrownPitch: ThrownPitch): void {
    const pitchType = thrownPitch.isStrike ? "strike" : "ball";
    let quality: string;
    if (thrownPitch.pitchQuality <= 1) {
      quality = "silly";
    } else if (thrownPitch.pitchQuality <= 3) {
      quality = "bad";
    } else if (thrownPitch.pitchQuality <= 5) {
      quality = "poor";
    } else if (thrownPitch.pitchQuality <= 7) {
      quality = "good";
    } else if (thrownPitch.pitchQuality <= 9) {
      quality = "great";
    } else {
      quality = "excellent";
    }
    const narrations = this.pitchNarrations[quality][pitchType];
    const narration = `${thrownPitch.pitcher.lastname} ` +
      narrations[Math.floor(Math.random() * narrations.length)];
    this.addNarration(narration);
  }

  // Narrate batter's decision
  narrateBatterDecision(
    batterName: string,
    swung: boolean,
    pitchIsStrike: boolean,
    balls: number,
    strikes: number,
  ): void {
    let narration = "";
    if (swung) {
      narration = `${batterName} swings at the ${
        pitchIsStrike ? "strike" : "ball"
      }.`;
    } else {
      narration = `${batterName} takes the ${
        pitchIsStrike ? "strike" : "ball"
      }.`;
      narration += ` ${balls}-${strikes}.`;
    }
    this.addNarration(narration);
  }

  // Narrate contact result
  narrateContact(
    batterName: string,
    madeContact: boolean,
    isFoul: boolean = false,
    balls: number,
    strikes: number,
  ): void {
    let narration = "";
    if (!madeContact) {
      narration = `${batterName} swings and misses.`;
    } else if (isFoul) {
      narration = `${batterName} hits a foul ball.`;
    } else {
      narration = `${batterName} makes contact!`;
    }
    if (!madeContact || isFoul) {
      narration += ` ${balls}-${strikes}.`;
    }
    this.addNarration(narration);
  }

  // Narrate at-bat result
  // TODO: Remove this in favor of narrateFielding.
  narrateAtBatResult(batterName: string, result: string): void {
    let narration = "";
    switch (result) {
      case "STRIKEOUT":
        narration = `${batterName} strikes out!`;
        break;
      case "WALK":
        narration = `${batterName} draws a walk.`;
        break;
      case "SINGLE":
        narration = `${batterName} hits a single!`;
        break;
      case "DOUBLE":
        narration = `${batterName} hits a double!`;
        break;
      case "TRIPLE":
        narration = `${batterName} hits a triple!`;
        break;
      case "HOME_RUN":
        narration = `${batterName} hits a home run!`;
        break;
      case "OUT":
        narration = `${batterName} flies out.`;
        break;
      default:
        narration = `${batterName} gets an out.`;
    }
    this.addNarration(narration);
  }

  // Narrate play result
  narratePlayResult(
    batterName: string,
    playType: string,
    fielderName?: string,
  ): void {
    let narration = "";
    switch (playType) {
      case "OUT":
        narration = fielderName
          ? `${fielderName} catches the ball for an out!`
          : `${batterName} grounds out.`;
        break;
      case "SINGLE":
        narration = `${batterName} reaches first base safely.`;
        break;
      case "DOUBLE":
        narration = `${batterName} rounds second for a double.`;
        break;
      case "TRIPLE":
        narration = `${batterName} makes it to third for a triple.`;
        break;
      case "HOME_RUN":
        narration = `${batterName} hits it out of the park! Home run!`;
        break;
      default:
        narration = `${batterName} is able to advance on the play.`;
    }
    this.addNarration(narration);
  }

  narrateHit(
    batterName: string,
    params: {
      hitScore: number;
      hardHit: boolean;
      trajectory: "LINE_DRIVE" | "FLY_BALL";
      hitLocation: string;
    },
  ): void {
    const { hitScore, hardHit, trajectory, hitLocation } = params;

    // Determine quality bucket based on hitScore, adjusted by hardHit
    const clamp = (n: number, min: number, max: number) =>
      Math.max(min, Math.min(max, n));
    const boost = hardHit ? 1 : 0;
    const base = hitScore <= 1.5
      ? 0
      : hitScore <= 3
      ? 1
      : hitScore <= 5
      ? 2
      : hitScore <= 7
      ? 3
      : hitScore <= 9
      ? 4
      : 5;
    const idx = clamp(base + boost, 0, 5);
    const buckets = [
      "silly",
      "bad",
      "poor",
      "good",
      "great",
      "excellent",
    ] as const;
    const bucket = buckets[idx];

    // Determine type key from trajectory and location (infer grounders by infield location)
    const infieldSpots = new Set([
      "third base",
      "shortstop",
      "second base",
      "first base",
      "pitcher",
      "catcher",
    ]);
    let typeKey: "flyBall" | "lineDrive" | "groundBall";
    if (trajectory === "FLY_BALL") {
      typeKey = "flyBall";
    } else if (infieldSpots.has(hitLocation)) {
      typeKey = "groundBall";
    } else {
      typeKey = "lineDrive";
    }

    const actionList = this.hitNarrations[typeKey][bucket] as string[];
    const action = actionList[Math.floor(Math.random() * actionList.length)];

    // Optional modifier (more likely if hardHit)
    const useMod = Math.random() < (hardHit ? 0.7 : 0.35);
    const modList = hardHit
      ? this.hitNarrations.modifiers.hard
      : this.hitNarrations.modifiers.soft;
    const modifier = useMod
      ? modList[Math.floor(Math.random() * modList.length)]
      : "";

    // Preposition based on location group
    const isOutfield = hitLocation.includes("field"); // left/center/right field
    const prepList = isOutfield
      ? this.hitNarrations.prepositions.outfield
      : this.hitNarrations.prepositions.infield;
    const prep = prepList[Math.floor(Math.random() * prepList.length)];

    const parts = [
      `${batterName} ${action}`,
      modifier ? `${modifier}` : "",
      `${prep} ${hitLocation}.`,
    ].filter(Boolean);

    this.addNarration(parts.join(" "));
  }

  // Narrate runs scored
  narrateRunsScored(runs: number): void {
    if (runs > 0) {
      const narration = `${runs} run${runs > 1 ? "s" : ""} score${
        runs > 1 ? "" : "s"
      }.`;
      this.addNarration(narration);
    }
  }

  private addNarration(text: string): void {
    this.narrationLog.push(text);
    if (!this.debug) console.log(text); // For now, just log to console
  }

  // Get all narration
  getNarrationLog(): string[] {
    return [...this.narrationLog];
  }

  // Clear narration log
  clearLog(): void {
    this.narrationLog = [];
  }

  public setDebug(debug: boolean): void {
    this.debug = debug;
  }
}
