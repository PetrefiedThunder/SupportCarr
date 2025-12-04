const logger = require('../config/logger');
const { getPostgresPool } = require('../config/postgres');

// Default radius for surge calculations (10 miles expressed in meters)
const DEFAULT_RADIUS_METERS = Number(process.env.SURGE_RADIUS_METERS || 16093.4);

async function ensureGeoIndexes() {
  const pool = getPostgresPool();
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS postgis');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_drivers_location_gist ON drivers USING GIST (location)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_rides_pickup_location_gist ON rides USING GIST (pickup_location)');
  } catch (error) {
    logger.error('Failed to ensure PostGIS indexes', { error: error.message });
    throw error;
  }
}

async function countActiveDriversNear({ lat, lng, radiusMeters = DEFAULT_RADIUS_METERS }) {
  const pool = getPostgresPool();
  const query = `
    SELECT COUNT(*)::int AS count
    FROM drivers d
    WHERE d.active = TRUE
      AND d.status = 'available'
      AND d.location IS NOT NULL
      AND ST_DWithin(
        d.location::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
  `;

  const { rows } = await pool.query(query, [lng, lat, radiusMeters]);
  return Number(rows?.[0]?.count) || 0;
}

async function countActiveRidesNear({ lat, lng, radiusMeters = DEFAULT_RADIUS_METERS }) {
  const pool = getPostgresPool();
  const query = `
    SELECT COUNT(*)::int AS count
    FROM rides r
    WHERE r.status IN ('requested', 'accepted', 'en_route', 'arrived', 'in_transit')
      AND r.pickup_location IS NOT NULL
      AND ST_DWithin(
        r.pickup_location::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
  `;

  const { rows } = await pool.query(query, [lng, lat, radiusMeters]);
  return Number(rows?.[0]?.count) || 0;
}

module.exports = {
  DEFAULT_RADIUS_METERS,
  ensureGeoIndexes,
  countActiveDriversNear,
  countActiveRidesNear,
};
