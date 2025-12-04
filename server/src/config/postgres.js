const { Pool } = require('pg');
const logger = require('./logger');

let pool;

function __setPostgresPool(mockPool) {
  pool = mockPool;
}

function getPostgresPool() {
  if (pool) {
    return pool;
  }

  const connectionString =
    process.env.POSTGRES_URL || process.env.DATABASE_URL || 'postgresql://localhost:5432/supportcarr';

  pool = new Pool({ connectionString });

  pool.on('error', (error) => {
    logger.error('Unexpected Postgres error', { error: error.message });
  });

  return pool;
}

async function initPostgres() {
  const pgPool = getPostgresPool();
  const client = await pgPool.connect();
  try {
    await client.query('SELECT 1');
    logger.info('Connected to Postgres');
  } finally {
    client.release();
  }
}

module.exports = {
  getPostgresPool,
  initPostgres,
  __setPostgresPool
};
