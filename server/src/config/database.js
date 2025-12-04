const mongoose = require('mongoose');
const logger = require('./logger');
const { getDatabase, destroyDatabase } = require('../db/knex');

/**
 * Connect to PostgreSQL and (optionally) legacy MongoDB while migrating.
 * Startup fails fast if PostgreSQL is unavailable.
 * @returns {Promise<void>}
 */
async function connectDatabase() {
  await getDatabase();

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (mongoUri && mongoose.connection.readyState !== 1) {
    mongoose.set('strictQuery', true);
    await mongoose.connect(mongoUri, { autoIndex: true });
    logger.info('Connected to MongoDB (legacy support)');
  }
}

/**
 * Disconnect from PostgreSQL and MongoDB.
 * @returns {Promise<void>}
 */
async function disconnectDatabase() {
  await destroyDatabase();
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

module.exports = {
  connectDatabase,
  disconnectDatabase
};
