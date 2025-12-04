const knex = require('knex');
const logger = require('../config/logger');

let knexInstance;

function createConfig() {
  return {
    client: 'pg',
    connection: process.env.DATABASE_URL || {
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT || 5432),
      user: process.env.PGUSER || 'supportcarr',
      password: process.env.PGPASSWORD || 'supportcarr',
      database: process.env.PGDATABASE || 'supportcarr'
    },
    pool: {
      min: 1,
      max: Number(process.env.PGPOOL_MAX || 10)
    }
  };
}

async function ensurePostgis(db) {
  await db.raw('CREATE EXTENSION IF NOT EXISTS postgis');
  await db.raw('CREATE EXTENSION IF NOT EXISTS postgis_topology');
}

async function getDatabase() {
  if (!knexInstance) {
    knexInstance = knex(createConfig());
    try {
      await knexInstance.raw('SELECT 1');
      await ensurePostgis(knexInstance);
      logger.info('Connected to PostgreSQL and ensured PostGIS extension');
    } catch (error) {
      logger.error('Failed to connect to PostgreSQL', { error: error.message });
      throw error;
    }
  }
  return knexInstance;
}

async function destroyDatabase() {
  if (knexInstance) {
    await knexInstance.destroy();
    knexInstance = null;
  }
}

module.exports = {
  getDatabase,
  destroyDatabase
};
