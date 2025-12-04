const logger = require('../config/logger');
const { DEFAULT_DISPATCH_RADIUS_MILES } = require('../config/constants');
const driverRepository = require('../db/driverRepository');
const {
  upsertDriverLocation,
  findBestDrivers: findBestDriversFromPostgis,
  markDriverAvailable
} = require('../repositories/driverLocationRepository');

// Scoring weights for smart dispatch
const WEIGHT_DISTANCE = 0.5;
const WEIGHT_LAST_RIDE_TIME = 0.3;
const WEIGHT_RATING = 0.2;

async function storeDriverLocation(driverId, { lat, lng }, active = true) {
  await upsertDriverLocation({ driverId, lat, lng, active });
}

/**
 * Calculate smart dispatch score for a driver
 * Lower score = better match (prioritize closer, recently active, highly rated)
 *
 * @param {Object} driver - Driver document
 * @param {number} distanceMiles - Distance from pickup location
 * @returns {number} Weighted score
 */
function calculateDispatchScore(driver, distanceMiles) {
  // Distance component (0-15 miles normalized to 0-1, lower is better)
  const distanceScore = Math.min(distanceMiles / 15, 1.0);

  // Last ride time component (normalize to 0-1, lower is better)
  // If never completed a ride or > 24 hours ago, score = 1.0
  // If completed within last hour, score = 0.0
  let lastRideScore = 1.0;
  if (driver.lastRideCompletedAt) {
    const hoursSinceLastRide = (Date.now() - driver.lastRideCompletedAt.getTime()) / (1000 * 60 * 60);
    lastRideScore = Math.min(hoursSinceLastRide / 24, 1.0);
  }

  // Rating component (5.0 = perfect, 0 = worst, inverted so lower is better)
  // Normalize: 5.0 rating → 0.0 score, 0.0 rating → 1.0 score
  const ratingScore = 1.0 - (driver.rating / 5.0);

  // Weighted sum
  const totalScore =
    (distanceScore * WEIGHT_DISTANCE) +
    (lastRideScore * WEIGHT_LAST_RIDE_TIME) +
    (ratingScore * WEIGHT_RATING);

  return totalScore;
}

/**
 * Find and rank drivers using smart dispatch heuristics
 * @param {Object} params - Search parameters
 * @param {number} params.lat - Pickup latitude
 * @param {number} params.lng - Pickup longitude
 * @param {number} params.radiusMiles - Search radius
 * @returns {Promise<Array>} Sorted array of {driverId, score, distance}
 */
async function findBestDrivers({ lat, lng, radiusMiles = DEFAULT_DISPATCH_RADIUS_MILES }) {
  const best = await findBestDriversFromPostgis({ lat, lng, radiusMiles });

  if (!best.length) {
    return [];
  }

  const candidate = best[0];
  const driver = await Driver.findOne({ _id: candidate.driverId, active: true }).populate('user');

  if (!driver) {
    await markDriverAvailable(candidate.driverId);
    return [];
  }

  const distance = candidate.distanceMiles ?? estimateDistance(
    lat,
    lng,
    driver.location?.lat,
    driver.location?.lng
  );

  const score = calculateDispatchScore(driver, distance);

  logger.info('Smart dispatch selected driver via PostGIS', {
    pickup: { lat, lng },
    driverId: driver.id,
    distance,
    lastRideCompletedAt: candidate.lastRideCompletedAt
  });

  return [{
    driver,
    driverId: driver._id.toString(),
    score,
    distance,
    lastRideCompletedAt: candidate.lastRideCompletedAt
  }];
}

/**
 * Estimate distance between two points (Haversine formula)
 */
function estimateDistance(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) {
    return 999; // Return high distance if location is missing
  }

  const R = 3959; // Earth's radius in miles
  const toRadians = (degrees) => degrees * (Math.PI / 180);

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function triggerDriverNotification(driver, ride) {
  logger.info('Simulated Twilio SMS', {
    to: driver?.user?.phoneNumber,
    message: `New SupportCarr rescue request from ${ride.pickup.address} to ${ride.dropoff.address}`
  });
}

module.exports = {
  storeDriverLocation,
  findBestDrivers,
  triggerDriverNotification
};
