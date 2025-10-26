const mongoose = require('mongoose');
const logger = require('./logger');

/**
 * Connect to MongoDB using the configured URI.
 * @returns {Promise<void>}
 */
async function connectDatabase() {
  const mongoUri =
    process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/supportcarr';

  if (mongoose.connection.readyState === 1) {
    return;
  }

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(mongoUri, {
      autoIndex: true
    });
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error: error.message });
    throw error;
  }
}

/**
 * Disconnect from MongoDB.
 * @returns {Promise<void>}
 */
async function disconnectDatabase() {
  await mongoose.disconnect();
}

module.exports = {
  connectDatabase,
  disconnectDatabase
};
