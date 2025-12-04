const { createClient } = require('redis');
const logger = require('./logger');

let client;

/**
 * Create or return a singleton Redis client.
 * INFRASTRUCTURE: Fail fast if Redis is unavailable (no in-memory fallback).
 * This ensures stateless application tier and prevents state fragmentation.
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
    logger.error('FATAL: Failed to connect to Redis', { error: error.message, url });
    try {
      await redisClient.quit();
    } catch (quitError) {
      logger.debug?.('Redis quit failure', { error: quitError.message });
    }
    // INFRASTRUCTURE: Throw error to crash application (fail fast principle)
    throw new Error(`Redis connection failed: ${error.message}`);
  }

  return client;
}

module.exports = {
  getRedisClient
};
