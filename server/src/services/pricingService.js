const logger = require('../config/logger');
const { RIDE_PRICE_CENTS } = require('../config/constants');
const {
  countActiveDriversNear,
  countActiveRidesNear,
  DEFAULT_RADIUS_METERS,
  ensureGeoIndexes
} = require('./geoService');

// Surge pricing thresholds
const SURGE_THRESHOLD_RATIO = 1.5; // Demand/supply ratio to trigger surge
const MIN_SURGE_MULTIPLIER = 1.0;
const MAX_SURGE_MULTIPLIER = 2.5;

/**
 * Calculate dynamic pricing multiplier based on supply and demand
 * @param {Object} params - Pricing parameters
 * @param {number} params.lat - Pickup latitude
 * @param {number} params.lng - Pickup longitude
 * @param {number} params.radiusMeters - Area to check (default 10 miles in meters)
 * @returns {Promise<{multiplier: number, reason: string}>}
 */
async function calculateSurgeMultiplier({ lat, lng, radiusMeters = DEFAULT_RADIUS_METERS }) {
  try {
    const effectiveRadius = Number(radiusMeters);
    await ensureGeoIndexes();

    const [activeRides, activeDrivers] = await Promise.all([
      countActiveRidesNear({ lat, lng, radiusMeters: effectiveRadius }),
      countActiveDriversNear({ lat, lng, radiusMeters: effectiveRadius })
    ]);

    // Avoid division by zero
    if (activeDrivers === 0) {
      // High surge when no drivers available
      logger.info('Surge pricing: No drivers available', {
        lat,
        lng,
        activeRides,
        activeDrivers: 0
      });
      return {
        multiplier: MAX_SURGE_MULTIPLIER,
        reason: 'No drivers available in area'
      };
    }

    // Calculate demand/supply ratio
    const demandSupplyRatio = activeRides / activeDrivers;
    const geodesicPressure = Math.max(0, demandSupplyRatio - 1);

    // Calculate multiplier based on ratio
    const multiplier = Math.min(
      MIN_SURGE_MULTIPLIER + geodesicPressure * 0.85,
      MAX_SURGE_MULTIPLIER
    );
    const reason = demandSupplyRatio >= SURGE_THRESHOLD_RATIO
      ? `High demand (${activeRides} rides, ${activeDrivers} drivers)`
      : geodesicPressure > 0
        ? `Elevated demand (${activeRides} rides, ${activeDrivers} drivers)`
        : 'Normal pricing';

    logger.info('Dynamic pricing calculated', {
      lat,
      lng,
      activeRides,
      activeDrivers,
      demandSupplyRatio: demandSupplyRatio.toFixed(2),
      multiplier: multiplier.toFixed(2)
    });

    return { multiplier, reason };
  } catch (error) {
    logger.error('Failed to calculate surge pricing', { error: error.message });
    // Default to normal pricing on error
    return { multiplier: MIN_SURGE_MULTIPLIER, reason: 'Pricing calculation error' };
  }
}

/**
 * Calculate ride price with dynamic pricing
 * @param {Object} params - Pricing parameters
 * @param {number} params.lat - Pickup latitude
 * @param {number} params.lng - Pickup longitude
 * @param {number} params.distanceMiles - Trip distance
 * @returns {Promise<{priceCents: number, basePrice: number, multiplier: number, reason: string}>}
 */
async function calculateRidePrice({ lat, lng, distanceMiles }) {
  const { multiplier, reason } = await calculateSurgeMultiplier({ lat, lng });

  const basePrice = RIDE_PRICE_CENTS;
  const priceCents = Math.round(basePrice * multiplier);

  return {
    priceCents,
    basePrice,
    multiplier,
    reason
  };
}

module.exports = {
  calculateSurgeMultiplier,
  calculateRidePrice
};
