import type { BattedBall } from "../types.ts";

/**
 * Classify ball type by launch angle
 */

export type BallType = "GROUND" | "LINE" | "FLY" | "POP";
 
export function classifyBall(ball: BattedBall): BallType {
	const a = ball.launch;
	if (a < 10) return "GROUND";
	if (a < 25) return "LINE";
	if (a < 60) return "FLY";
	return "POP";
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