import type { Player } from "./Player.ts";
import type { Team } from "./Team.ts";
import type {
	BattedBall,
	FieldingPosition,
	FieldResponse,
	FieldOutcome,
} from "./types.ts"

/*
 * Once a ball has been hit into play, the fielders must respond
 * and try to get as many runners out as possible.
 */

/**
 * Classify ball type by launch angle
 */
type BallType = "GROUND" | "LINE" | "FLY" | "POP";

function classifyBall(ball: BattedBall): BallType {
	const a = ball.launch;
	if (a < 10) return "GROUND";
	if (a < 25) return "LINE";
	if (a < 60) return "FLY";
	return "POP";
}

const DEBUG_FIELDING = true;

export function simulateFielding(ball: BattedBall, team: Team) {
	// Who is attempting to catch the ball?
	//
	// Is the catch successful?
	//
	// If so, what should the fielder do next?
}


export function calculateAirTime(ball: BattedBall): number {
	// Estimate air time using simple projectile motion from a contact height.
	// Units: velo is mph, convert to m/s; launch is degrees; return seconds.
	const MPH_TO_MPS = 0.44704;
	const g = 9.80665; // m/s^2
	const contactHeightM = 1.0; // approx height of contact above ground

	const v = Math.max(0, ball.velo) * MPH_TO_MPS;
	const theta = (ball.launch * Math.PI) / 180;

	const vVertical = v * Math.sin(theta);

	// Solve for time until ball returns to ground level (y=0) given initial height h0:
	// y(t) = h0 + v_y * t - 0.5 * g * t^2 = 0
	// t = (v_y + sqrt(v_y^2 + 2 * g * h0)) / g
	let t =
		(vVertical + Math.sqrt(vVertical * vVertical + 2 * g * contactHeightM)) / g;

	// Numerical safety and a light damping factor to approximate drag
	if (!isFinite(t) || t < 0) t = 0;
	const dragFactor = 1 / (1 + 0.08); // reduce ~8%
	t *= dragFactor;

	return t;
}

export function estimateDropZone(ball: BattedBall): FieldingPosition {
	// Map a batted ball to the most likely nearby fielder using simple kinematics and zones.
	const DEG_TO_RAD = Math.PI / 180;
	const MPH_TO_MPS = 0.44704;
	const M_TO_FT = 3.28084;

	// Field/heuristic constants (softball-scale)
	const R_SHORT = 35; // ft - home-plate ring (C/P territory)
	const R_INFIELD = 95; // ft - infield/outfield boundary
	const BOUNDARY_BUFFER = 10; // ft - tie-break region around R_INFIELD

	const GROUND_LAUNCH = 10; // deg - grounder threshold
	const HIGH_POP = 40; // deg - high pop near home plate

	// Foul-ball fieldable heuristics (rare)
	const FOUL_FIELDABLE_LAUNCH = 35; // deg - needs to be a high pop to be fieldable
	const FOUL_PLATE_RADIUS = 45; // ft - near plate => Catcher
	const FOUL_MAX_FIELDABLE = 90; // ft - beyond this, most fouls are unplayable

	// Catcher realistic fieldable window: only near straight-up pops
	const CATCHER_STRAIGHT_UP_MIN = 87; // deg
	const CATCHER_STRAIGHT_UP_MAX = 93; // deg

	// Pitcher fielding heuristics for grounders and near-plate plays
	const PITCHER_FIELDABLE_RADIUS_FT = 20; // only very short dribblers are true pitcher plays
	const PITCHER_ATTACK_CONE_DEG = 5; // central cone for pitcher comebackers
	const PITCHER_REACTION_TIME_S = 0.35; // min time to react at the pitcher plane
	const PITCHER_PLANE_FT = 43; // distance to pitcher from home
	const GROUND_LAUNCH_MAX = 8; // restrict pitcher to true grounders/choppers

	// Kinematics to estimate horizontal range
	const t = calculateAirTime(ball);
	const v = Math.max(0, ball.velo) * MPH_TO_MPS;
	const launchRad = ball.launch * DEG_TO_RAD;
	const vHoriz = v * Math.cos(launchRad);
	let rangeFt = Math.max(0, vHoriz * t * M_TO_FT);

	// Horizontal air distance and speed in ft/s
	const vHorizFtps = Math.max(0, vHoriz) * M_TO_FT;
	const xAirFt = Math.max(0, vHorizFtps * t);

	// Grounder bias: clamp distance to keep it largely in/near infield
	if (ball.launch < GROUND_LAUNCH) {
		rangeFt = Math.min(rangeFt, 120);
	}

	const attack = ball.attack;

	// Foul vs fair handling
	if (ball.foul) {
		// Only a very small fraction of fouls are fieldable; otherwise Bench.
		if (ball.launch >= FOUL_FIELDABLE_LAUNCH && rangeFt <= FOUL_MAX_FIELDABLE) {
			const straightUp =
				ball.launch >= CATCHER_STRAIGHT_UP_MIN &&
				ball.launch <= CATCHER_STRAIGHT_UP_MAX;

			if (rangeFt <= FOUL_PLATE_RADIUS && straightUp) {
				return "Catcher";
			} else if (attack >= 30) {
				return "First Base";
			} else if (attack <= -30) {
				return "Third Base";
			}
		}
		return "Bench";
	}

	// Grounders: decide pitcher vs infielder based on centrality, distance, and reaction time
	if (ball.launch < GROUND_LAUNCH) {
		// If the ball crosses the pitcher plane in the air, treat as a comebacker/liner.
		// Do not assign "Pitcher" here; in simulateFielding(), run a reaction/catch/deflection
		// check that scales with the pitcher's fielding skill. For drop-zone, prefer MI/CI.
		if (xAirFt >= PITCHER_PLANE_FT) {
			// fall through to sector routing below
		} else {
			const remainingFt = PITCHER_PLANE_FT - xAirFt;
			const vGroundFtps = vHorizFtps * 0.7; // crude post-bounce slowdown
			const timeToPlane = remainingFt / Math.max(1e-3, vGroundFtps);

			const central = Math.abs(attack) <= PITCHER_ATTACK_CONE_DEG;
			const trueGrounder = ball.launch <= GROUND_LAUNCH_MAX;
			const veryShort = xAirFt <= PITCHER_FIELDABLE_RADIUS_FT;

			if (
				central &&
				trueGrounder &&
				veryShort &&
				timeToPlane >= PITCHER_REACTION_TIME_S
			) {
				return "Pitcher";
			}

			// Not a pitcher play: route to infield by attack angle
			if (attack <= -30) return "Third Base";
			if (attack >= 30) return "First Base";
			if (attack < -10) return "Shortstop";
			if (attack > 10) return "Second Base";
			return attack < 0 ? "Shortstop" : "Second Base";
		}
	}

	// Very short ring near home (non-grounders)
	if (rangeFt < R_SHORT) {
		const straightUp =
			ball.launch >= CATCHER_STRAIGHT_UP_MIN &&
			ball.launch <= CATCHER_STRAIGHT_UP_MAX;
		if (straightUp) return "Catcher";
		// otherwise, continue to infield/outfield sector routing
	}

	// Boundary bias near infield/outfield edge
	let infieldUpper = R_INFIELD;
	if (Math.abs(rangeFt - R_INFIELD) <= BOUNDARY_BUFFER) {
		// Lower launch favors infield; higher favors outfield
		if (ball.launch < 15) infieldUpper += BOUNDARY_BUFFER;
		else infieldUpper -= BOUNDARY_BUFFER;
	}

	// Angular sectors
	const isLeft = attack < -15;
	const isRight = attack > 15;
	// middle otherwise

	// Infield band
	if (rangeFt < infieldUpper) {
		if (isLeft) {
			return attack <= -30 ? "Third Base" : "Shortstop";
		} else if (isRight) {
			return attack >= 30 ? "First Base" : "Second Base";
		} else {
			// middle: break tie by slight sign
			return attack < 0 ? "Shortstop" : "Second Base";
		}
	}

	// Outfield by sector (home runs still map to nearest OF)
	if (isLeft) return "Left Field";
	if (isRight) return "Right Field";
	return "Center Field";
}

/**
 *
 * @param ball The ball in play
 * @param fielder The fielder attempting the catch
 * @returns A probability of catching the ball between 0 and 1
 */
function catchProbability(ball: BattedBall, fielder: Player): number {
	return 0;
}

// A ball needs to be fielded!
function fieldBall() {

}
