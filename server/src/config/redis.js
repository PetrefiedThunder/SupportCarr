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

function createInMemoryClient() {
  const store = new Map();

  return {
    async geoAdd(key, locations) {
      const existing = store.get(key) || [];
      store.set(key, existing.concat(locations));
      return locations.length;
    },
    async geoRadius(key, longitude, latitude, radius, unit) {
      const entries = store.get(key) || [];
      return entries
        .map((entry) => {
          const [lon, lat, member] = entry;
          const distance = Math.sqrt((lon - longitude) ** 2 + (lat - latitude) ** 2);
          return { member, distance };
        })
        .filter((entry) => entry.distance <= radius)
        .sort((a, b) => a.distance - b.distance)
        .map((entry) => entry.member);
    },
    async del(key) {
      store.delete(key);
    }
  };
}

module.exports = {
  getRedisClient
};
