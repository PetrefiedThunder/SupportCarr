const { Pool } = require('pg');

let pool;

/**
 * Lazily initialize and return a singleton Postgres pool.
 * The URI should point to a Postgres instance with PostGIS installed.
 */
function getPostgresPool() {
  if (pool) {
    return pool;
  }

  const connectionString = process.env.POSTGRES_URI || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('POSTGRES_URI or DATABASE_URL must be set for PostGIS queries');
  }

  pool = new Pool({
    connectionString,
  });

  return pool;
}

/**
 * Override the pool for testing purposes.
 * @param {Object} mockPool - A mock with a `query` method.
 */
function __setPostgresPool(mockPool) {
  pool = mockPool;
}

module.exports = {
  getPostgresPool,
  __setPostgresPool,
};
