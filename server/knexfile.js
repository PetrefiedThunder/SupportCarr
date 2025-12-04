require('dotenv').config();

/** @type {import('knex').Knex.Config} */
const baseConfig = {
  client: 'pg',
  connection: process.env.DATABASE_URL || {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'supportcarr',
    password: process.env.PGPASSWORD || 'supportcarr',
    database: process.env.PGDATABASE || 'supportcarr'
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: './migrations'
  },
  pool: {
    min: 1,
    max: Number(process.env.PGPOOL_MAX || 10)
  }
};

module.exports = {
  development: baseConfig,
  test: { ...baseConfig, connection: process.env.TEST_DATABASE_URL || baseConfig.connection },
  production: baseConfig
};
