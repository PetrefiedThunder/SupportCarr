const { getDatabase, destroyDatabase } = require('../db/knex');

/**
 * Connect to PostgreSQL. Startup fails fast if unavailable.
 * @returns {Promise<void>}
 */
async function connectDatabase() {
  await getDatabase();
}

/**
 * Disconnect from PostgreSQL.
 * @returns {Promise<void>}
 */
async function disconnectDatabase() {
  await destroyDatabase();
}

module.exports = {
  connectDatabase,
  disconnectDatabase
};
