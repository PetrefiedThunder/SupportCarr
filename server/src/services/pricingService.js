const Ride = require('../models/Ride');
const Driver = require('../models/Driver');
const logger = require('../config/logger');
const { RIDE_PRICE_CENTS } = require('../config/constants');

// Surge pricing thresholds
const SURGE_THRESHOLD_RATIO = 1.5; // Demand/supply ratio to trigger surge
const MIN_SURGE_MULTIPLIER = 1.0;
const MAX_SURGE_MULTIPLIER = 2.5;

/**
 * Calculate dynamic pricing multiplier based on supply and demand
 * @param {Object} params - Pricing parameters
 * @param {number} params.lat - Pickup latitude
 * @param {number} params.lng - Pickup longitude
 * @param {number} params.radiusMiles - Area to check (default 10 miles)
 * @returns {Promise<{multiplier: number, reason: string}>}
 */
async function calculateSurgeMultiplier({ lat, lng, radiusMiles = 10 }) {
  try {
    // Count active rides (requested or in-progress)
    const activeRides = await Ride.countDocuments({
      status: { $in: ['requested', 'accepted', 'en_route', 'arrived', 'in_transit'] },
      'pickup.lat': { $gte: lat - 0.15, $lte: lat + 0.15 }, // ~10 mile radius
      'pickup.lng': { $gte: lng - 0.15, $lte: lng + 0.15 }
    });

    // Count active drivers (currently available)
    const activeDrivers = await Driver.countDocuments({
      active: true,
      'currentLocation.lat': { $gte: lat - 0.15, $lte: lat + 0.15 },
      'currentLocation.lng': { $gte: lng - 0.15, $lte: lng + 0.15 }
    });

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

    // Calculate multiplier based on ratio
    let multiplier = MIN_SURGE_MULTIPLIER;
    let reason = 'Normal pricing';

    if (demandSupplyRatio >= SURGE_THRESHOLD_RATIO) {
      // Linear scaling: 1.5x ratio = 1.5x price, 3.0x ratio = 2.5x price
      multiplier = Math.min(
        MIN_SURGE_MULTIPLIER + (demandSupplyRatio - 1.0) * 0.5,
        MAX_SURGE_MULTIPLIER
      );
      reason = `High demand (${activeRides} rides, ${activeDrivers} drivers)`;
    }

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
