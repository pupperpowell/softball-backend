/**
 * Generate a random number using the Box-Muller transform
 * to approximate a standard normal distribution (mean = 0, stdev = 1).
 */
export function randomNormal(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random(); // avoid 0
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Generate a normally distributed random number
 * with a given mean and standard deviation.
 */
export function normal(mean: number, stdev: number): number {
  return mean + randomNormal() * stdev;
}

export function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}