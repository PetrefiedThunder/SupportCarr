const logger = require('../config/logger');
const { getRedisClient } = require('../config/redis');
const { getDatabase } = require('../db/knex');

async function checkInfrastructure() {
  try {
    const redis = await getRedisClient();
    await redis.ping();
  } catch (error) {
    logger.error('Infrastructure check failed: Redis unavailable', { error: error.message });
    throw new Error(`Redis health check failed: ${error.message}`);
  }

  try {
    const db = await getDatabase();
    await db.raw('SELECT postgis_version();');
  } catch (error) {
    logger.error('Infrastructure check failed: PostGIS unavailable', { error: error.message });
    throw new Error(`PostGIS health check failed: ${error.message}`);
  }

  logger.info('Infrastructure checks passed for Redis and PostGIS');
}

module.exports = { checkInfrastructure };
