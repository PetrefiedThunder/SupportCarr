const { createClient } = require('redis');
const logger = require('./logger');

let client;

/**
 * Create or return a singleton Redis client.
 * Falls back to an in-memory store if Redis is unavailable.
 */
async function getRedisClient() {
  if (client) {
    return client;
  }

  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  const redisClient = createClient({ url });

  redisClient.on('error', (err) => {
    logger.error('Redis error', { error: err.message });
  });

  try {
    await redisClient.connect();
    logger.info('Connected to Redis');
    client = redisClient;
  } catch (error) {
    logger.warn('Failed to connect to Redis, continuing with in-memory geostore', { error: error.message });
    try {
      await redisClient.quit();
    } catch (quitError) {
      logger.debug?.('Redis quit failure', { error: quitError.message });
    }
    client = createInMemoryClient();
  }

  return client;
}

function normalizeLocation(location) {
  if (Array.isArray(location)) {
    const [longitude, latitude, member] = location;
    return [Number(longitude), Number(latitude), member];
  }

  if (location && typeof location === 'object') {
    const { longitude, latitude, member } = location;
    return [Number(longitude), Number(latitude), member];
  }

  throw new TypeError('Unsupported geo location format for in-memory store');
}

function toKm(radius, unit = 'km') {
  if (!unit || unit === 'km') {
    return radius;
  }

  if (unit === 'm') {
    return radius / 1000;
  }

  if (unit === 'mi') {
    return radius * 1.60934;
  }

  return radius;
}

function createInMemoryClient() {
  const store = new Map();

  return {
    async geoAdd(key, locations) {
      const existing = store.get(key) || [];
      const normalized = locations.map(normalizeLocation);
      store.set(key, existing.concat(normalized));
      return normalized.length;
    },
    async geoRadius(key, longitudeOrOptions, latitudeArg, radiusArg, unitArg) {
      const entries = store.get(key) || [];

      let longitude = longitudeOrOptions;
      let latitude = latitudeArg;
      let radius = radiusArg;
      let unit = unitArg;

      if (typeof longitudeOrOptions === 'object' && longitudeOrOptions !== null) {
        ({ longitude, latitude, radius, unit } = longitudeOrOptions);
      }

      const centerLongitude = Number(longitude);
      const centerLatitude = Number(latitude);
      const normalizedRadius = Number(radius);
      const radiusInKm = toKm(Number.isNaN(normalizedRadius) ? 0 : normalizedRadius, unit);

      return entries
        .map((entry) => {
          const [lon, lat, member] = normalizeLocation(entry);
          const distance = Math.sqrt((lon - centerLongitude) ** 2 + (lat - centerLatitude) ** 2);
          return { member, distance };
        })
        .filter((entry) => entry.distance <= radiusInKm)
        .sort((a, b) => a.distance - b.distance)
        .map((entry) => entry.member);
    },
    async del(key) {
      store.delete(key);
    }
  };
}

module.exports = {
  getRedisClient,
  createInMemoryClient
};
