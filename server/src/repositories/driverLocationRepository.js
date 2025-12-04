const logger = require('../config/logger');
const { getPostgresPool } = require('../config/postgres');

const MILES_TO_METERS = 1609.34;
let schemaReady = false;

async function ensureSchema(client) {
  if (schemaReady) {
    return;
  }

  await client.query('CREATE EXTENSION IF NOT EXISTS postgis');
  await client.query(`
    CREATE TABLE IF NOT EXISTS driver_locations (
      driver_id TEXT PRIMARY KEY,
      location GEOGRAPHY(Point, 4326),
      active BOOLEAN NOT NULL DEFAULT false,
      available BOOLEAN NOT NULL DEFAULT false,
      last_ride_completed_at TIMESTAMPTZ NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  schemaReady = true;
}

async function upsertDriverLocation({ driverId, lat, lng, active }) {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    await ensureSchema(client);
    await client.query(
      `INSERT INTO driver_locations (driver_id, location, active, available, updated_at)
         VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography, $4, $4, NOW())
       ON CONFLICT (driver_id)
       DO UPDATE SET
         location = EXCLUDED.location,
         active = EXCLUDED.active,
         available = EXCLUDED.available,
         updated_at = NOW()`,
      [driverId, lng, lat, Boolean(active)]
    );
  } catch (error) {
    logger.error('Failed to upsert driver location in PostGIS', { error: error.message, driverId });
    throw error;
  } finally {
    client.release();
  }
}

async function findBestDrivers({ lat, lng, radiusMiles }) {
  const pool = getPostgresPool();
  const client = await pool.connect();
  const radiusMeters = radiusMiles * MILES_TO_METERS;

  try {
    await ensureSchema(client);
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT driver_id,
              ST_Distance(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS distance_meters,
              last_ride_completed_at
         FROM driver_locations
        WHERE active = TRUE
          AND available = TRUE
          AND location IS NOT NULL
          AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
        ORDER BY last_ride_completed_at NULLS FIRST, distance_meters ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1`,
      [lng, lat, radiusMeters]
    );

    if (!rows.length) {
      await client.query('ROLLBACK');
      return [];
    }

    const best = rows[0];
    await client.query('UPDATE driver_locations SET available = FALSE, updated_at = NOW() WHERE driver_id = $1', [best.driver_id]);
    await client.query('COMMIT');

    return [{
      driverId: best.driver_id,
      distanceMeters: Number(best.distance_meters),
      distanceMiles: Number(best.distance_meters) / MILES_TO_METERS,
      lastRideCompletedAt: best.last_ride_completed_at
    }];
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to lock best driver', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
}

async function markDriverAvailable(driverId, lastRideCompletedAt = null) {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    await ensureSchema(client);
    await client.query(
      `UPDATE driver_locations
          SET available = TRUE,
              active = TRUE,
              last_ride_completed_at = COALESCE($2, last_ride_completed_at),
              updated_at = NOW()
        WHERE driver_id = $1`,
      [driverId, lastRideCompletedAt]
    );
  } catch (error) {
    logger.error('Failed to mark driver available', { error: error.message, driverId });
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  upsertDriverLocation,
  findBestDrivers,
  markDriverAvailable
};
