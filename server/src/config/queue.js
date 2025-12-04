const { Queue } = require('bullmq');
const { getRedisClient } = require('./redis');
const logger = require('./logger');

let analyticsQueue = null;

/**
 * Get or create the analytics queue
 * Uses the existing Redis connection from the application
 */
async function getAnalyticsQueue() {
  if (analyticsQueue) {
    return analyticsQueue;
  }

  try {
    const redisClient = await getRedisClient();

    // BullMQ requires connection options, not a client instance
    // Extract connection info from the Redis URL
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const url = new URL(redisUrl);

    const connection = {
      host: url.hostname,
      port: parseInt(url.port || '6379', 10),
      password: url.password || undefined
    };

    analyticsQueue = new Queue('analytics', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000 // Start with 1 second, exponential backoff
        },
        removeOnComplete: {
          age: 3600 // Keep completed jobs for 1 hour
        },
        removeOnFail: {
          age: 86400 // Keep failed jobs for 24 hours
        }
      }
    });

    logger.info('Analytics queue initialized');
    return analyticsQueue;
  } catch (error) {
    logger.error('Failed to initialize analytics queue', { error: error.message });
    throw error;
  }
}

module.exports = {
  getAnalyticsQueue
};
