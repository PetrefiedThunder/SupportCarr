const logger = require('../config/logger');
const { getRedisClient } = require('../config/redis');
const { DEFAULT_DISPATCH_RADIUS_MILES } = require('../config/constants');

const DRIVER_GEO_KEY = 'drivers:geo';

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

async function triggerDriverNotification(driver, ride) {
  logger.info('Simulated Twilio SMS', {
    to: driver?.user?.phoneNumber,
    message: `New SupportCarr rescue request from ${ride.pickup.address} to ${ride.dropoff.address}`
  });
}

module.exports = {
  storeDriverLocation,
  findNearbyDrivers,
  triggerDriverNotification
};
