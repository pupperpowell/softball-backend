
import type { PlayResult, RunnersState } from "../game/fielding.ts";
import type { FieldResponse, BattedBall } from "../game/types.ts";
import { Player } from "../game/Player.ts";

// Contains formulas that construct sentences using narrations.ts
// Based on events that happen in the game
export class NarrationEngine {

  // TODO: This is TERRIBLE!!! **DELETE IT AND START FROM SCRATCH!**

  narrateFielding(playResult: PlayResult, initialRunners: RunnersState, batter: Player): string {
    const { field, runnerAdvances, runnersOut, batterBases, runs } = playResult;
    const fielder = field.fielder;
    const pos = fielder.position.toLowerCase();
    const lines: string[] = [];

    lines.push(`The ball is hit toward ${fielder.fullName()}.`);

    if (field.result === "HOME_RUN") {
      lines.push(`${batter.fullName()} smashes a home run over the fence!`);
      if (runs > 1) {
        lines.push(`${runs - 1} runner${runs > 2 ? 's' : ''} score ahead of ${batter.fullName()}.`);
      }
      lines.push(`${batter.fullName()} trots around the bases and scores.`);
    } else if (!field.hit) {
      // Air out (fly/line/pop out)
      lines.push(`${fielder.fullName()} tracks the ball and makes the catch!`);
      lines.push(`${batter.fullName()} flies out.`);
      // Tag-up attempts
      if (initialRunners.third && runnerAdvances.third === 1) {
        const runner = initialRunners.third;
        if (runnersOut.includes("third")) {
          lines.push(`${runner.fullName()} tags up from third but is thrown out at home.`);
        } else {
          lines.push(`${runner.fullName()} tags up from third and scores.`);
        }
      }
      if (initialRunners.second && runnerAdvances.second === 1) {
        const runner = initialRunners.second;
        if (runnersOut.includes("second")) {
          lines.push(`${runner.fullName()} tags up from second but is gunned down at third.`);
        } else {
          lines.push(`${runner.fullName()} tags up from second to third.`);
        }
      }
      if (initialRunners.first && runnerAdvances.first === 1) {
        const runner = initialRunners.first;
        lines.push(`${runner.fullName()} tags up from first to second.`);
      }
    } else if (field.result === "OUT") {
      // Ground out (batter out on grounder)
      if (field.error) {
        lines.push(`${batter.fullName()} grounds to ${pos}, but ${fielder.fullName()} makes a clean play despite the pressure.`);
      } else {
        lines.push(`${batter.fullName()} grounds sharply to ${pos}.`);
        lines.push(`${fielder.fullName()} fields and fires to first base!`);
      }
      lines.push(`${batter.fullName()} is out at first.`);
      // Runners on ground out typically don't advance much, but per simulation
      if (initialRunners.third) {
        lines.push(`Runner at third holds.`);
      }
      // etc., but simulation has conservative for infield
    } else {
      // Base hit
      const hitType = field.result.toLowerCase();
      if (field.error) {
        lines.push(`${batter.fullName()} hits a ${hitType} that ${fielder.fullName()} misfields.`);
        lines.push(`Error allows ${batter.fullName()} to reach ${batterBases === 1 ? 'first' : batterBases === 2 ? 'second' : 'third'}.`);
      } else {
        lines.push(`${batter.fullName()} lines a ${hitType} to ${pos}.`);
        // lines.push(`${fielder.fullName()} gloves it cleanly.`);
        lines.push(`${batter.fullName()} hustles to ${batterBases === 1 ? 'first' : batterBases === 2 ? 'second' : 'third'}.`);
      }

      // Runner advances and potential throws/outs
      // Assume outfield if pos in OF, else infield
      const isOutfield = ["left field", "center field", "right field"].includes(pos);

      if (initialRunners.third) {
        const runner = initialRunners.third;
        if (runnerAdvances.third === 1) {
          lines.push(`${runner.fullName()} scores from third!`);
        } else {
          lines.push(`${runner.fullName()} holds at third.`);
        }
      }

      if (initialRunners.second) {
        const runner = initialRunners.second;
        const advance = runnerAdvances.second ?? 0;
        if (advance === 2) {
          lines.push(`${runner.fullName()} scores from second!`);
        } else if (advance === 1) {
          let nextBase = isOutfield ? "third" : "third";
          lines.push(`${runner.fullName()} advances to ${nextBase} from second.`);
        } else {
          lines.push(`${runner.fullName()} stays at second.`);
        }
        if (runnersOut.includes("second")) {
          lines.push(`${fielder.fullName()} throws to third, getting ${runner.fullName()}!`);
        }
      }

      if (initialRunners.first) {
        const runner = initialRunners.first;
        const advance = runnerAdvances.first ?? 0;
        let desc = "";
        if (advance === 3) {
          desc = "scores";
        } else if (advance === 2) {
          desc = "third";
        } else if (advance === 1) {
          desc = "second";
        } else {
          desc = "first";
        }
        lines.push(`${runner.fullName()} goes from first to ${desc}.`);
        if (runnersOut.includes("first")) {
          lines.push(`${fielder.fullName()} throws to second, nailing ${runner.fullName()} trying to advance!`);
        }
      }

      // General throw narration if out but not specific
      if (runnersOut.length > 0 && !lines.some(l => l.includes("getting") || l.includes("nailing"))) {
        const outBase = runnersOut[0];
        const target = outBase === "first" ? "second" : outBase === "second" ? "third" : "home";
        lines.push(`${fielder.fullName()} throws to ${target} for the out at ${target}.`);
      }
    }

    const fullNarration = lines.join('\n');
    console.log(fullNarration);
    return fullNarration;
  }
}
