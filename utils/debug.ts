/**
 * Debug utility for conditional logging
 */

// Read DEBUG flag from environment variable (Bun automatically loads .env)
// const DEBUG = Bun.env.DEBUG === 'true';
const DEBUG = false;

/**
 * Outputs a message to console.log when DEBUG is true
 * @param message - The message to log
 * @param optionalParams - Additional parameters to log
 */
export function debugLog(message?: any, ...optionalParams: any[]): void {
  if (DEBUG) {
    console.log(message, ...optionalParams);
  }
}