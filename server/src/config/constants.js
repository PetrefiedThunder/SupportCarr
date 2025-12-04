/**
 * Application-wide constants
 * Centralizes magic numbers to improve maintainability
 */

// RIDE PRICING
const RIDE_PRICE_CENTS = 5000; // $50.00 per ride

// DISPATCH & GEOLOCATION
const DISPATCH_RADIUS_MILES = 15; // Maximum radius to search for drivers
const DEFAULT_DISPATCH_RADIUS_MILES = 10; // Default if not specified

// PILOT PROGRAM LIMITS
const MAX_RIDE_DISTANCE_MILES = 10.0; // 10-mile pilot program limit

// TIMEOUTS & RETRY
const LONG_POLL_TIMEOUT_MS = 25000; // 25 seconds for long-polling

module.exports = {
  RIDE_PRICE_CENTS,
  DISPATCH_RADIUS_MILES,
  DEFAULT_DISPATCH_RADIUS_MILES,
  MAX_RIDE_DISTANCE_MILES,
  LONG_POLL_TIMEOUT_MS
};
