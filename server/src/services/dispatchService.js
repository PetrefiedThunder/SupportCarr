const logger = require('../config/logger');
const { getRedisClient } = require('../config/redis');
const { DEFAULT_DISPATCH_RADIUS_MILES } = require('../config/constants');
const Driver = require('../models/Driver');

const DRIVER_GEO_KEY = 'drivers:geo';

// Scoring weights for smart dispatch
const WEIGHT_DISTANCE = 0.5;
const WEIGHT_LAST_RIDE_TIME = 0.3;
const WEIGHT_RATING = 0.2;

async function storeDriverLocation(driverId, { lat, lng }) {
  const client = await getRedisClient();
  if (client.geoAdd.length === 2) {
    await client.geoAdd(DRIVER_GEO_KEY, [{ longitude: lng, latitude: lat, member: driverId }]);
  } else {
    await client.geoAdd(DRIVER_GEO_KEY, [[lng, lat, driverId]]);
  }
}

async function findNearbyDrivers({ lat, lng, radiusMiles = DEFAULT_DISPATCH_RADIUS_MILES }) {
  const client = await getRedisClient();
  const radiusInKm = radiusMiles * 1.60934;
  let results;
  if (client.geoRadius.length === 2) {
    results = await client.geoRadius(DRIVER_GEO_KEY, {
      longitude: lng,
      latitude: lat,
      radius: radiusInKm,
      unit: 'km'
    });
  } else {
    results = await client.geoRadius(DRIVER_GEO_KEY, lng, lat, radiusInKm, 'km');
  }
  return Array.isArray(results) ? results : [];
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
  // Get nearby driver IDs from Redis geospatial index
  const driverIds = await findNearbyDrivers({ lat, lng, radiusMiles });

  if (!driverIds.length) {
    return [];
  }

  // Fetch driver details from MongoDB
  const drivers = await Driver.find({
    _id: { $in: driverIds },
    active: true
  }).populate('user');

  if (!drivers.length) {
    return [];
  }

  // Calculate scores for each driver
  const scoredDrivers = drivers.map((driver) => {
    // Calculate actual distance (simplified - in production use geospatial query)
    const distance = estimateDistance(
      lat,
      lng,
      driver.currentLocation?.lat,
      driver.currentLocation?.lng
    );

    const score = calculateDispatchScore(driver, distance);

    return {
      driver,
      driverId: driver._id.toString(),
      score,
      distance
    };
  });

  // Sort by score (lower is better)
  scoredDrivers.sort((a, b) => a.score - b.score);

  logger.info('Smart dispatch scored drivers', {
    pickup: { lat, lng },
    candidateCount: scoredDrivers.length,
    topScore: scoredDrivers[0]?.score,
    topDistance: scoredDrivers[0]?.distance
  });

  return scoredDrivers;
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
  findNearbyDrivers,
  findBestDrivers,
  triggerDriverNotification
};
